# NorthStar MR (by NorthStar Studioz)

> **Tactile Mixed Reality Physics Sandbox & Kinetic Puzzles for Meta Horizon OS**

---

## 📌 Project Overview
* **Developer/Studio:** NorthStar Studioz
* **Founder & Lead:** Vikas Sahani ([@VIKAS9793](https://github.com/VIKAS9793))
* **Email:** studioznorthstar@gmail.com
* **Remote Repository:** [https://github.com/VIKAS9793/NorthStarStudioz.git](https://github.com/VIKAS9793/NorthStarStudioz.git)
* **Live Studio Portal:** [https://vikas9793.github.io/NorthStarStudioz/](https://vikas9793.github.io/NorthStarStudioz/)
* **Privacy Policy URL (for Meta):** [https://vikas9793.github.io/NorthStarStudioz/privacy.html](https://vikas9793.github.io/NorthStarStudioz/privacy.html)
* **Dashboard App Name:** `NorthStar MR`
* **Target Ecosystem:** Meta Horizon Store (Standalone Meta Quest 3, Quest 3S, Quest 2, Quest Pro)
* **Target Release Track:** Early Access
* **Engine & Pipeline:** Unity 6 LTS / 2022.3 LTS (Universal Render Pipeline) + Meta OpenXR

---

## 📚 Project Documentation Repository (`docs/`)

All market research, platform intelligence, technical architecture, and design specifications have been documented with verified sources:

1. [docs/01_META_PLATFORM_INTELLIGENCE.md](docs/01_META_PLATFORM_INTELLIGENCE.md) &nbsp;•&nbsp; [View on GitHub](https://github.com/VIKAS9793/NorthStarStudioz/blob/main/docs/01_META_PLATFORM_INTELLIGENCE.md)
   * Official Meta market data, $2.5B+ store spend, 300+ $1M titles, Quest 3 retention metrics, and why Standalone beats PC VR.
2. [docs/02_MARKET_NICHE_AND_VALUE_PROPOSITION.md](docs/02_MARKET_NICHE_AND_VALUE_PROPOSITION.md) &nbsp;•&nbsp; [View on GitHub](https://github.com/VIKAS9793/NorthStarStudioz/blob/main/docs/02_MARKET_NICHE_AND_VALUE_PROPOSITION.md)
   * Competitive teardown (Cubism, Track Craft, Puzzling Places), Unique Value Proposition (UVP), and target player profiles.
3. [docs/03_GAME_DESIGN_DOCUMENT_GDD.md](docs/03_GAME_DESIGN_DOCUMENT_GDD.md) &nbsp;•&nbsp; [View on GitHub](https://github.com/VIKAS9793/NorthStarStudioz/blob/main/docs/03_GAME_DESIGN_DOCUMENT_GDD.md)
   * Comprehensive Game Design Document covering the core loop, modular kinetic components, hand-tracking mechanics, and level campaign structure.
4. [docs/04_TECHNICAL_ARCHITECTURE_AND_VRCS.md](docs/04_TECHNICAL_ARCHITECTURE_AND_VRCS.md) &nbsp;•&nbsp; [View on GitHub](https://github.com/VIKAS9793/NorthStarStudioz/blob/main/docs/04_TECHNICAL_ARCHITECTURE_AND_VRCS.md)
   * Complete technical stack, URP performance budgets (90 FPS, <120 draw calls), and the step-by-step Virtual Reality Check (VRC) QA submission checklist.
5. [docs/05_DEVELOPMENT_ROADMAP_AND_MILESTONES.md](docs/05_DEVELOPMENT_ROADMAP_AND_MILESTONES.md) &nbsp;•&nbsp; [View on GitHub](https://github.com/VIKAS9793/NorthStarStudioz/blob/main/docs/05_DEVELOPMENT_ROADMAP_AND_MILESTONES.md)
   * 8-week solo developer sprint schedule from prototype to live Early Access store launch and Meta Horizon Start application.

---

## ⚙️ Quick Start Checklist

1. **Dashboard Configuration:** In the [Meta VR Developer Dashboard](https://developer.oculus.com/manage/), find your App ID under **Development > API**.
2. **Device Hub:** Launch **Meta Quest Developer Hub (MQDH)** on your PC to enable wireless ADB casting and live framerate debugging.
3. **Engine Initialization:** Initialize a Unity project with Android Build Support and add the `com.meta.xr.sdk.all` package via UPM.
