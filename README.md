<p align="center">
  <img src="website/assets/logo.png" alt="NorthStar Studioz" width="200">
</p>

<h1 align="center">NorthStar Studioz</h1>

<p align="center">
  <strong>Independent mixed reality game studio</strong><br>
  <em>Tactile, hands-first experiences for Meta Quest, designed for the room you already live in.</em>
</p>

<p align="center">
  <a href="https://vikas9793.github.io/NorthStarStudioz/">Website</a> ·
  <a href="https://vikas9793.github.io/NorthStarStudioz/privacy.html">Privacy</a> ·
  <a href="https://vikas9793.github.io/NorthStarStudioz/terms.html">Terms</a>
</p>

---

## Studio
* **Founder & developer:** Vikas Sahani ([@VIKAS9793](https://github.com/VIKAS9793))
* **Location:** India
* **Contact:** [studioznorthstar@gmail.com](mailto:studioznorthstar@gmail.com)
* **Status:** prototyping our first title

## Focus
* **Hands first:** pinch, grab, turn and snap with natural hand tracking; controllers are a fallback.
* **Your room is the level:** passthrough and scene understanding turn real tables, floors and walls into play surfaces.
* **Sound you can feel:** sampled real materials and spatial audio.
* **Comfort by design:** stationary play with no artificial locomotion.

**Platform:** Meta Horizon OS (Meta Quest 3, Quest 3S) · OpenXR + Meta XR SDK · Unity URP.

---

## Website

The site in [`website/`](website/) is static HTML and CSS with no framework and no third-party requests. It deploys to GitHub Pages from `main` through [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

| Path | What it is |
| --- | --- |
| `website/index.html` | Home page, including the intro gate |
| `website/styles.css` | All styles (self-hosted fonts, design tokens, animations) |
| `website/assets/js/site.js` | Header, menu, scroll reveals, intro gate controller |
| `website/assets/js/gate-3d.js` | **Generated.** The 3D headset bundle; do not edit by hand |
| `src/gate/headset.js` | Source for the 3D headset (three.js) |
| `scripts/verify.mjs` | Security guardrails run in CI |

### Working on it
```bash
npm ci                  # build tooling only (esbuild, three)
npm run build           # rebuild website/assets/js/gate-3d.js from src/
npm run verify          # CSP hashes, no third-party loads, no unsafe DOM sinks
npx serve website       # or any static server, then open http://localhost:3000
```

If you change an inline `<script>` in a page, run `npm run verify -- --fix-hashes` so the page's Content Security Policy allows it. CI fails if the committed bundle doesn't match a fresh build, or if any guardrail fails.

---

## Governance
* [LICENSE.md](LICENSE.md): proprietary licence
* [SECURITY.md](SECURITY.md): vulnerability disclosure and the website security model
* [SUPPORT.md](SUPPORT.md) · [CONTRIBUTING.md](CONTRIBUTING.md) · [CODEOWNERS](.github/CODEOWNERS)

<sub>Meta, Meta Quest and Meta Horizon OS are trademarks of Meta Platforms, Inc. NorthStar Studioz is an independent developer and is not affiliated with or endorsed by Meta.</sub>
