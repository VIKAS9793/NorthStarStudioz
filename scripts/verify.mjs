// Security guardrails for the static site. Run with `npm run verify` (also runs in CI).
//
// Fails when:
//  - a page is missing its Content-Security-Policy or referrer policy
//  - an inline <script> is not allow-listed by hash in that page's CSP
//    (so any injected or edited inline script breaks the build)
//  - the CSP allows unsafe-inline / unsafe-eval / wildcards
//  - a page loads a script, stylesheet, font, image or frame from another origin
//  - our own JavaScript uses DOM APIs that turn strings into code or markup
//
// Pass --fix-hashes to rewrite the CSP hashes after you intentionally edit an inline script.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const SITE = 'website';
const fix = process.argv.includes('--fix-hashes');
const errors = [];
const fail = (file, msg) => errors.push(`${file}: ${msg}`);

const pages = readdirSync(SITE).filter((f) => f.endsWith('.html'));

for (const page of pages) {
  const path = join(SITE, page);
  let html = readFileSync(path, 'utf8');

  const cspMatch = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/);
  if (!cspMatch) { fail(page, 'missing Content-Security-Policy meta tag'); continue; }
  if (!/<meta name="referrer" content="strict-origin-when-cross-origin">/.test(html)) fail(page, 'missing referrer policy meta tag');
  // The CSP must come before anything it is meant to protect.
  if (html.indexOf(cspMatch[0]) > html.search(/<script|<link rel="stylesheet"/)) fail(page, 'CSP meta must appear before the first <script> or stylesheet');

  const csp = cspMatch[1];
  for (const bad of ["'unsafe-inline'", "'unsafe-eval'", "'unsafe-hashes'", 'data: blob:', ' * ', ' *;', 'http:']) {
    if (csp.includes(bad)) fail(page, `CSP contains ${bad.trim()}`);
  }
  for (const required of ["default-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'none'", "require-trusted-types-for 'script'"]) {
    if (!csp.includes(required)) fail(page, `CSP must include ${required}`);
  }

  // Inline executable scripts must be hash-allow-listed.
  const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)];
  const wanted = [];
  for (const [, attrs, body] of inline) {
    if (/type="application\/ld\+json"/.test(attrs)) continue; // data block, never executed
    wanted.push(`'sha256-${createHash('sha256').update(body).digest('base64')}'`);
  }
  const present = csp.match(/'sha256-[^']+'/g) || [];
  const missing = wanted.filter((h) => !present.includes(h));
  const stale = present.filter((h) => !wanted.includes(h));
  if (missing.length || stale.length) {
    if (fix) {
      const nextCsp = csp.replace(/ ?'sha256-[^']+'/g, '').replace(/script-src 'self'/, `script-src 'self'${wanted.map((h) => ` ${h}`).join('')}`);
      html = html.replace(csp, nextCsp);
      writeFileSync(path, html);
      console.log(`${page}: CSP hashes updated`);
    } else {
      if (missing.length) fail(page, `inline script not allow-listed by CSP hash: ${missing.join(' ')} (run: npm run verify -- --fix-hashes)`);
      if (stale.length) fail(page, `CSP lists hashes for scripts that no longer exist: ${stale.join(' ')}`);
    }
  }

  // No third-party subresources: everything the page loads must be same-origin.
  const loads = [
    ...html.matchAll(/<(?:script|img|iframe|source|audio|video)\b[^>]*\bsrc="([^"]+)"/g),
    ...html.matchAll(/<link\b(?=[^>]*\brel="(?:stylesheet|preload|modulepreload|icon|apple-touch-icon|manifest)")[^>]*\bhref="([^"]+)"/g),
  ].map((m) => m[1]);
  for (const url of loads) {
    if (/^(?:[a-z]+:)?\/\//i.test(url)) fail(page, `loads a third-party resource: ${url}`);
  }

  // Links that open new browsing contexts must not leak window.opener.
  for (const [tag] of html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) {
    if (!/rel="[^"]*noopener/.test(tag)) fail(page, `target=_blank without rel=noopener: ${tag}`);
  }
}

// Our own scripts must not turn strings into code or HTML.
const ownScripts = [join(SITE, 'assets/js/site.js'), join(SITE, 'assets/js/ambient.js'), 'src/gate/headset.js'];
const sinks = /\binnerHTML\b|\bouterHTML\b|insertAdjacentHTML|document\.write|\beval\s*\(|new Function\s*\(|setTimeout\s*\(\s*['"`]|setInterval\s*\(\s*['"`]/;
for (const file of ownScripts) {
  readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    if (sinks.test(line)) fail(file, `line ${i + 1} uses an unsafe DOM/code sink: ${line.trim()}`);
  });
}

if (errors.length) {
  console.error(`✗ ${errors.length} security check(s) failed:\n  - ${errors.join('\n  - ')}`);
  process.exit(1);
}
console.log(`✓ Security checks passed for ${pages.length} pages.`);
