# Security Policy

## Supported Versions

NorthStar Studioz applications and the official web portal receive active security updates.

| Project / Software | Supported          |
| ----------------- | ------------------ |
| Studio Applications | :white_check_mark: |
| Studio Web Portal | :white_check_mark: |

## Reporting a Vulnerability

At NorthStar Studioz, user privacy and application security are top priorities. If you discover a potential security vulnerability, please report it responsibly:

1. **Do NOT report security vulnerabilities through public GitHub issues.**
2. Email your findings directly to **[studioznorthstar@gmail.com](mailto:studioznorthstar@gmail.com)** with the subject line: `[Security Vulnerability] NorthStar Studioz`.
3. Please include:
   * A description of the issue and potential impact.
   * Steps or a proof-of-concept to reproduce the behavior.
   * Affected device models or OS versions (e.g., Quest 3, Quest 3S, Horizon OS v69+).

We will acknowledge receipt within 48 hours and work with you to remediate the issue promptly before public disclosure.

---

## Website security model

The studio website is a static site with **no backend, no accounts, no forms and no cookies**. That leaves three realistic threats: script injection, a tampered build, and a compromised dependency or CI step. The guardrails below cover each.

| Threat | Guardrail | Where |
| --- | --- | --- |
| Script injection (XSS) | Strict Content Security Policy on every page: `default-src 'self'`, no `unsafe-inline`/`unsafe-eval`, inline scripts allowed only by SHA-256 hash, `object-src 'none'`, `base-uri 'self'`, `form-action 'none'` | `<meta http-equiv="Content-Security-Policy">` in each page |
| DOM injection | Trusted Types enforced (`require-trusted-types-for 'script'`, `trusted-types 'none'`): any `innerHTML`-style sink throws. Our own code is also checked for string-to-code sinks in CI | CSP + `scripts/verify.mjs` |
| Third-party compromise / tracking | Zero third-party requests: fonts, scripts and images are self-hosted. CI fails if a page loads anything cross-origin | `scripts/verify.mjs` |
| Tampered build output | CI rebuilds `gate-3d.js` from `src/` and fails if it differs from the committed file. Editing an inline script without updating its CSP hash also fails | `.github/workflows/deploy.yml` |
| Supply chain (npm) | Lockfile-only installs with `npm ci --ignore-scripts`; `npm audit` gate; Dependabot updates | workflow + `.github/dependabot.yml` |
| Supply chain (CI) | All GitHub Actions pinned to full commit SHAs; `permissions: {}` by default with per-job least privilege; checkout without persisted credentials; deploy runs only from `main` after verification | `.github/workflows/deploy.yml` |
| Referrer leakage | `strict-origin-when-cross-origin` on every page | `<meta name="referrer">` |
| Reporting | RFC 9116 `security.txt` | `website/.well-known/security.txt` |

**HTTP headers:** Cloudflare Pages serves the site and applies `website/_headers`: clickjacking protection (`frame-ancestors`, `X-Frame-Options`), `X-Content-Type-Options`, `Permissions-Policy`, `Cross-Origin-Opener-Policy` and HSTS (two years, including subdomains). The per-page `<meta>` Content Security Policy remains the source of truth for everything else.

**Repository settings to turn on** (they can't be set from code): branch protection on `main` requiring the *Verify build & security guardrails* check, secret scanning with push protection, CodeQL default setup, "Enforce HTTPS" for GitHub Pages, and "Always Use HTTPS" in Cloudflare.

### When the site starts handling users

The day the site collects anything (a playtest sign-up, a newsletter, a contact form), keep the pages static and put user handling behind a small, separate service:

1. **Don't build auth or store passwords.** Use a managed identity provider, or no accounts at all; most studio needs are email-only.
2. **One narrow endpoint per purpose** (for example, a serverless function such as Cloudflare Workers): validate every field against a strict schema on the server, apply rate limits plus a bot challenge (e.g. Turnstile), and return generic errors.
3. **Store the minimum,** encrypted at rest, with a written retention period, and update the Privacy Policy *before* collection starts.
4. **Widen the CSP deliberately:** add only that endpoint to `connect-src` and `form-action`. Never add `'unsafe-inline'`.
5. **Keep secrets out of the repository and the client:** use the host's secret store, and never use a client-side key that grants write access.
