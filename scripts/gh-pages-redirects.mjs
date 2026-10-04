#!/usr/bin/env node
// Builds the GitHub Pages copy of the site: redirect stubs only.
//
// The real site lives on Cloudflare Pages at https://northstarstudioz.space.
// Old links to https://vikas9793.github.io/NorthStarStudioz/... (store
// listings, search results, bookmarks) keep working by sending visitors to the
// same page on the new domain. GitHub Pages can't send HTTP redirects, so each
// page uses an instant meta refresh plus a canonical link, which search engines
// treat as a permanent move. A small script on every page, including the 404
// page for unknown paths, keeps the exact path, query and fragment.
//
// Usage: node scripts/gh-pages-redirects.mjs [outDir]   (default: gh-pages-redirects)

import { createHash } from 'node:crypto';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ORIGIN = 'https://northstarstudioz.space';
const OLD_BASE = '/NorthStarStudioz';
const out = process.argv[2] || 'gh-pages-redirects';

// Old file → new URL path
const PAGES = {
  'index.html': '/',
  'privacy.html': '/privacy',
  'terms.html': '/terms',
};

const escape = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function page(target, { script = '' } = {}) {
  const href = escape(target);
  const scriptSrc = script
    ? ` 'sha256-${createHash('sha256').update(script).digest('base64')}'`
    : '';
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src${scriptSrc || " 'none'"}; base-uri 'none'; form-action 'none'">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <title>NorthStar Studioz has moved</title>
  <link rel="canonical" href="${href}">
${script ? `  <script>${script}</script>\n` : ''}  <meta http-equiv="refresh" content="0; url=${href}">
</head>
<body>
  <p>NorthStar Studioz has moved to <a href="${href}">${escape(ORIGIN.replace('https://', ''))}</a>.</p>
</body>
</html>
`;
}

// Keeps the path (minus the old base and any .html), query and fragment. The
// meta refresh is the fallback when scripts are off; it can't keep the fragment.
const moved = `(function () {
  var p = location.pathname;
  if (p.indexOf(${JSON.stringify(OLD_BASE)}) === 0) p = p.slice(${OLD_BASE.length});
  p = p.replace(/\\/index\\.html$/, '/').replace(/\\.html$/, '');
  location.replace(${JSON.stringify(ORIGIN)} + (p || '/') + location.search + location.hash);
})();`;

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const [file, path] of Object.entries(PAGES)) {
  writeFileSync(join(out, file), page(ORIGIN + path, { script: moved }));
}
writeFileSync(join(out, '404.html'), page(ORIGIN + '/', { script: moved }));
console.log(`✓ Wrote ${Object.keys(PAGES).length + 1} redirect pages to ${out}/ → ${ORIGIN}`);
