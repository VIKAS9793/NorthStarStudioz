#!/usr/bin/env node
// Lighthouse budget: locks in the site's scores so a change can't quietly break them.
//
// Serves website/ the way Cloudflare Pages does (extensionless pages, 404.html
// for anything missing, Brotli-compressed text) and runs Lighthouse on every
// page as a first-time visitor (the intro plays), with the mobile and desktop
// presets. The median of several runs is checked, so one noisy CI run can't
// fail the build but a real regression always does.
//
// Usage: node scripts/lighthouse-budget.mjs   (Chrome from CHROME_PATH or the system)

import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { brotliCompressSync } from 'node:zlib';
import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';
import * as chromeLauncher from 'chrome-launcher';

const SITE = resolve(import.meta.dirname, '..', 'website');
const PAGES = ['/', '/about', '/press', '/privacy', '/terms'];

// Category scores are 0-100. Accessibility, Best Practices, SEO and agentic
// browsing are pass/fail checklists, so they are locked at 100. Performance
// varies from run to run, so it has a floor with headroom; LCP and CLS use
// Google's "good" lines, and TBT stands in for INP, which a lab run can't measure.
const CHECKLISTS = { accessibility: 100, 'best-practices': 100, seo: 100, 'agentic-browsing': 100 };
const PRESETS = [
  { name: 'mobile', config: undefined, runs: 5, performance: 95, lcp: 2500, cls: 0.1, tbt: 200 },
  { name: 'desktop', config: desktopConfig, runs: 3, performance: 95, lcp: 2500, cls: 0.1, tbt: 200 },
];

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2',
  '.xml': 'application/xml', '.txt': 'text/plain', '.webmanifest': 'application/manifest+json',
};

// Text is compressed as Cloudflare does; fonts and images are already compressed.
const COMPRESS = new Set(['.html', '.css', '.js', '.xml', '.txt', '.webmanifest']);
function send(req, res, status, file) {
  const type = TYPES[extname(file)] || 'application/octet-stream';
  let body = readFileSync(file);
  const headers = { 'content-type': type };
  if (COMPRESS.has(extname(file)) && /\bbr\b/.test(req.headers['accept-encoding'] || '')) {
    body = brotliCompressSync(body);
    headers['content-encoding'] = 'br';
  }
  res.writeHead(status, headers);
  res.end(body);
}

const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  for (const candidate of [path, `${path}.html`, join(path, 'index.html')]) {
    const file = join(SITE, candidate);
    if (file.startsWith(SITE) && existsSync(file) && statSync(file).isFile()) return send(req, res, 200, file);
  }
  send(req, res, 404, join(SITE, '404.html'));
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const origin = `http://127.0.0.1:${server.address().port}`;

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const score = (lhr, id) => (lhr.categories[id] ? Math.round(lhr.categories[id].score * 100) : null);
const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new', '--no-sandbox'] });
let failed = false;

try {
  for (const preset of PRESETS) {
    console.log(`\n${preset.name}: performance ≥ ${preset.performance}, ${Object.keys(CHECKLISTS).join(', ')} = 100, LCP ≤ ${preset.lcp / 1000} s, CLS ≤ ${preset.cls}, TBT ≤ ${preset.tbt} ms (median of ${preset.runs})`);
    for (const page of PAGES) {
      const runs = [];
      for (let i = 0; i < preset.runs; i++) {
        const { lhr } = await lighthouse(`${origin}${page}`, {
          port: chrome.port, output: 'json', logLevel: 'error',
          onlyCategories: ['performance', ...Object.keys(CHECKLISTS)],
        }, preset.config);
        if (lhr.runtimeError) throw new Error(`${preset.name} ${page}: ${lhr.runtimeError.message}`);
        const run = {
          performance: score(lhr, 'performance'),
          lcp: lhr.audits['largest-contentful-paint'].numericValue,
          tbt: lhr.audits['total-blocking-time'].numericValue,
          cls: lhr.audits['cumulative-layout-shift'].numericValue,
        };
        for (const id of Object.keys(CHECKLISTS)) run[id] = score(lhr, id);
        runs.push(run);
      }
      const m = Object.fromEntries(Object.keys(runs[0]).map((k) => [k, median(runs.map((r) => r[k]))]));
      const problems = [];
      if (m.performance < preset.performance) problems.push(`performance ${m.performance} < ${preset.performance}`);
      if (m.lcp > preset.lcp) problems.push(`LCP ${(m.lcp / 1000).toFixed(2)} s > ${preset.lcp / 1000} s`);
      if (m.cls > preset.cls) problems.push(`CLS ${m.cls.toFixed(3)} > ${preset.cls}`);
      if (m.tbt > preset.tbt) problems.push(`TBT ${Math.round(m.tbt)} ms > ${preset.tbt} ms`);
      for (const [id, min] of Object.entries(CHECKLISTS)) {
        if (m[id] === null) problems.push(`${id} was not measured`);
        else if (m[id] < min) problems.push(`${id} ${m[id]} < ${min}`);
      }
      failed ||= problems.length > 0;
      console.log(`${problems.length ? '✗' : '✓'} ${page.padEnd(9)} perf ${m.performance}  LCP ${(m.lcp / 1000).toFixed(1)} s  TBT ${Math.round(m.tbt)} ms  CLS ${m.cls.toFixed(3)}  ·  a11y ${m.accessibility}  best practices ${m['best-practices']}  SEO ${m.seo}  agentic ${m['agentic-browsing']}  (perf runs: ${runs.map((r) => r.performance).join(', ')})`);
      for (const p of problems) console.log(`    over budget: ${p}`);
    }
  }
} finally {
  await chrome.kill();
  server.close();
}

if (failed) {
  console.error('\nLighthouse budget failed. Fix the regression above, or change the budget in scripts/lighthouse-budget.mjs on purpose.');
  process.exit(1);
}
console.log('\n✓ Every page is within the Lighthouse budget on mobile and desktop.');
