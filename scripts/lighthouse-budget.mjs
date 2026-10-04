#!/usr/bin/env node
// Lighthouse budget: fails when a page gets slower or starts shifting.
//
// Serves website/ the way Cloudflare Pages does (extensionless pages, 404.html
// for anything missing, Brotli-compressed text), runs Lighthouse's mobile preset on each page as a
// first-time visitor (the intro plays), and checks the median of several runs
// against the budget. The median smooths out noisy CI machines.
//
// Usage: node scripts/lighthouse-budget.mjs [runs]   (default 3; Chrome from CHROME_PATH or the system)

import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { brotliCompressSync } from 'node:zlib';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

const SITE = resolve(import.meta.dirname, '..', 'website');
const PAGES = ['/', '/about', '/press', '/privacy', '/terms'];
const RUNS = Number(process.argv[2]) || 3;
// Performance score ≥ 90 plus Google's "good" Core Web Vitals lines (LCP ≤ 2.5 s, CLS ≤ 0.1);
// TBT stands in for INP, which a lab run can't measure.
const BUDGET = { performance: 90, lcp: 2500, cls: 0.1, tbt: 200 };

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
const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new', '--no-sandbox'] });
let failed = false;

try {
  console.log(`Lighthouse mobile budget: performance ≥ ${BUDGET.performance}, LCP ≤ ${BUDGET.lcp / 1000} s, CLS ≤ ${BUDGET.cls}, TBT ≤ ${BUDGET.tbt} ms (median of ${RUNS})\n`);
  for (const page of PAGES) {
    const runs = [];
    for (let i = 0; i < RUNS; i++) {
      const { lhr } = await lighthouse(`${origin}${page}`, {
        port: chrome.port, output: 'json', logLevel: 'error',
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      });
      if (lhr.runtimeError) throw new Error(`${page}: ${lhr.runtimeError.message}`);
      runs.push({
        performance: Math.round(lhr.categories.performance.score * 100),
        accessibility: Math.round(lhr.categories.accessibility.score * 100),
        bestPractices: Math.round(lhr.categories['best-practices'].score * 100),
        seo: Math.round(lhr.categories.seo.score * 100),
        lcp: lhr.audits['largest-contentful-paint'].numericValue,
        tbt: lhr.audits['total-blocking-time'].numericValue,
        cls: lhr.audits['cumulative-layout-shift'].numericValue,
      });
    }
    const m = Object.fromEntries(Object.keys(runs[0]).map((k) => [k, median(runs.map((r) => r[k]))]));
    const problems = [];
    if (m.performance < BUDGET.performance) problems.push(`performance ${m.performance} < ${BUDGET.performance}`);
    if (m.lcp > BUDGET.lcp) problems.push(`LCP ${(m.lcp / 1000).toFixed(2)} s > ${BUDGET.lcp / 1000} s`);
    if (m.cls > BUDGET.cls) problems.push(`CLS ${m.cls.toFixed(3)} > ${BUDGET.cls}`);
    if (m.tbt > BUDGET.tbt) problems.push(`TBT ${Math.round(m.tbt)} ms > ${BUDGET.tbt} ms`);
    failed ||= problems.length > 0;
    console.log(`${problems.length ? '✗' : '✓'} ${page.padEnd(9)} perf ${m.performance}  LCP ${(m.lcp / 1000).toFixed(1)} s  TBT ${Math.round(m.tbt)} ms  CLS ${m.cls.toFixed(3)}  ·  a11y ${m.accessibility}  best practices ${m.bestPractices}  SEO ${m.seo}  (perf runs: ${runs.map((r) => r.performance).join(', ')})`);
    for (const p of problems) console.log(`    over budget: ${p}`);
  }
} finally {
  await chrome.kill();
  server.close();
}

if (failed) {
  console.error('\nLighthouse budget failed.');
  process.exit(1);
}
console.log('\n✓ Every page is within the Lighthouse budget.');
