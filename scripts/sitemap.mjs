#!/usr/bin/env node
// Builds website/sitemap.xml from the pages in website/.
//
// Each page's <lastmod> is the date of the last commit that changed it, or
// today if it has uncommitted changes, so search engines only see a new date
// when a page really changed. Run `npm run sitemap` after editing a page; CI
// runs `--check` and fails when the committed sitemap is out of date.
//
// Usage: node scripts/sitemap.mjs [--check]

import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const SITE = join(ROOT, 'website');
const ORIGIN = 'https://northstarstudioz.space';
const SKIP = new Set(['404.html']);
const FIRST = ['index.html', 'about.html', 'press.html']; // listed first; the rest follow alphabetically

const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function lastmod(file) {
  const rel = `website/${file}`;
  if (git('status', '--porcelain', '--', rel)) return today(); // new or edited, not committed yet
  const date = git('log', '-1', '--format=%cs', '--', rel);
  if (!date) throw new Error(`${rel} has no commits; a shallow clone needs fetch-depth: 0`);
  return date;
}

const pages = readdirSync(SITE)
  .filter((f) => f.endsWith('.html') && !SKIP.has(f))
  .sort((a, b) => (FIRST.includes(a) ? FIRST.indexOf(a) : 99) - (FIRST.includes(b) ? FIRST.indexOf(b) : 99) || a.localeCompare(b));

const urls = pages.map((f) => {
  const path = f === 'index.html' ? '/' : `/${f.replace(/\.html$/, '')}`;
  return `  <url><loc>${ORIGIN}${path}</loc><lastmod>${lastmod(f)}</lastmod></url>`;
});
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;

const target = join(SITE, 'sitemap.xml');
if (process.argv.includes('--check')) {
  if (readFileSync(target, 'utf8') !== xml) {
    console.error('website/sitemap.xml is out of date. Run `npm run sitemap` and commit the result. Expected:\n');
    console.error(xml);
    process.exit(1);
  }
  console.log(`✓ Sitemap lists ${pages.length} pages with current dates.`);
} else {
  writeFileSync(target, xml);
  console.log(`✓ Wrote website/sitemap.xml (${pages.length} pages).`);
}
