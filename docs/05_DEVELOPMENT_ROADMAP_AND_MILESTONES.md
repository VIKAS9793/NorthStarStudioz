# 05 - Development Roadmap & Solo Milestones

**Project:** NorthStar MR  
**Sprint Structure:** 4 Two-Week Sprints (8 Weeks Total to Early Access Release)  
**Target Submission Window:** Early Access on Meta Horizon Store  
**Solo Velocity Target:** 15–20 focused hours per week

---

## Sprint Schedule Overview

```
Week 1 - 2 ──► Milestone 1: The Core Kinetic Toy (Hands + Rails in Passthrough)
Week 3 - 4 ──► Milestone 2: Snap Mechanics & First 10 Campaign Puzzles
Week 5 - 6 ──► Milestone 3: ASMR Audio, Haptics & Polish (The "Juice")
Week 7 - 8 ──► Milestone 4: VRC QA, Store Listing & Early Access Submission
Week 9 - 10 ─► Milestone 5: Launch Monitoring & Meta Horizon Start Application
```

---

## Detailed Milestone Breakdown

### Milestone 1: The Core Kinetic Toy (Weeks 1–2)
* **Goal:** Prove the foundational physical interaction in Passthrough using bare hands.
* **Deliverables:**
  * Clean Unity URP project initialized with Meta OpenXR + Meta XR All-In-One SDK.
  * Passthrough camera enabled; user sees their physical room.
  * `OVRCameraRig` + `Interaction SDK` hand-tracking configured.
  * Prototype 3 basic kinetic components: Straight Rail, Curve Rail, and Metal Sphere with standard gravity.
  * Working "Core Toy" test: Pick up a rail with bare hands, place it on the physical desk, drop the marble, and watch it roll along the track.

### Milestone 2: Snap Mechanics & Campaign Levels (Weeks 3–4)
* **Goal:** Turn the toy into a game with rules, snapping, and progression.
* **Deliverables:**
  * Magnetic grid/rail snapping: Approaching rails auto-align their endpoints with a smooth snap sound.
  * Objective system: Start Dispenser Node (spawns marble) and Goal Bell Node (chimes on contact).
  * Build Chapter 1: 10 structured tabletop levels ranging from basic slopes to splitters and ramps.
  * In-game wrist-palette menu (Restart level, Next level, Level Select).

### Milestone 3: ASMR Audio, Visual Juice & Sandbox (Weeks 5–6)
* **Goal:** Elevate tactile sensation from functional to irresistible.
* **Deliverables:**
  * Spatial audio integration: High-fidelity micro-samples for wood impacts, metallic rings, and rolling sounds spatialized via Meta Audio.
  * Visual feedback: Subtle particle sparks, brass shimmer on completion, and soft drop shadows on physical surfaces.
  * Freeform Sandbox Mode: Endless tray of rails, spring boosters, and chimes for user-driven creative building.
  * Local save/load state via JSON serialization.

### Milestone 4: VRC Compliance & Store Submission (Weeks 7–8)
* **Goal:** Pass technical QA and launch on Meta Horizon Store (Early Access).
* **Deliverables:**
  * Entitlement check integrated with the assigned **App ID** from the developer dashboard.
  * Meta Cloud Storage enabled for player progress.
  * OVR Metrics Tool audit: Confirm locked 90 FPS on Quest 3 and 72 FPS on Quest 2.
  * Store assets package:
    * 1x Hero Banner (3000 x 900 px)
    * 1x Square Icon (1440 x 1440 px)
    * 5x High-res 4K Passthrough screenshots (captured via MQDH)
    * 1x 45-second trailer video showing hands manipulating pieces in real living rooms.
  * Upload `.aab` build to **Beta / Early Access** track on developer dashboard.

### Milestone 5: Post-Launch & Horizon Start Accelerator (Weeks 9–10)
* **Goal:** Leverage early player feedback and submit for hardware grants.
* **Deliverables:**
  * Monitor crash reports and player ratings via Developer Dashboard.
  * Package the live Early Access build and submit application to **Meta Horizon Start** to unlock free test hardware and direct partner engineering support.
