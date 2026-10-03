# 03 - Game Design Document (GDD)

**Title:** NorthStar MR (Working Title: *KineticRoom MR*)  
**Developer:** NorthStar Studioz  
**Target Platform:** Meta Horizon OS (Quest 3, Quest 3S, Quest 2, Quest Pro)  
**Genre:** Tactile Mixed Reality Physics Puzzle & Micro-Sandbox  
**Comfort Rating:** Comfortable (0% artificial locomotion)  
**Target Price:** $9.99 USD (Initial Early Access Launch)

---

## 1. Core Concept & Loop

### One-Sentence Hook
Build, solve, and trigger intricate kinetic chain reactions and physical marble contraptions that seamlessly merge with your real-world furniture, tables, and walls.

### The Core Loop
```
                ┌───────────────────────────────────┐
                │        1. SURVEY THE ROOM         │
                │ Real table surface detected;      │
                │ start/finish objectives placed.   │
                └─────────────────┬─────────────────┘
                                  │
                                  ▼
                ┌───────────────────────────────────┐
                │      2. TACTILE CONSTRUCTION      │
                │ Hand-grab modular ramps, funnels, │
                │ magnets, and kinetic splitters.   │
                └─────────────────┬─────────────────┘
                                  │
                                  ▼
                ┌───────────────────────────────────┐
                │        3. TEST & CALIBRATE        │
                │ Release kinetic pulse/sphere;     │
                │ observe physical trajectories.    │
                └─────────────────┬─────────────────┘
                                  │
                                  ▼
                ┌───────────────────────────────────┐
                │       4. RESONANT VICTORY         │
                │ Chain reaction strikes final bell;│
                │ unlocks new modules & levels.     │
                └───────────────────────────────────┘
```

---

## 2. Interactive Mechanics & Control Scheme

### Primary: Bare-Hand Tracking (Meta Interaction SDK)
* **Pinch & Drag:** Index finger + thumb pinch to pick up modular tracks and kinetic blocks.
* **Rotation Snapping:** Twisting wrist rotates the piece by 45° increments with haptic visual snapping.
* **Magnetic Snapping:** Pieces within 5cm of an existing rail automatically snap and lock together with an audible click.
* **Palm Tap (Menu):** Looking at the left palm reveals a clean floating radial tool palette (Play, Reset, Delete, Level Select).

### Secondary: Touch Controllers
* Complete 1:1 parity with standard Meta Quest Touch Plus / Pro controllers:
  * Grip button = Grab piece
  * Trigger = Test pulse / Drop sphere
  * Thumbstick = Push/pull piece distance
  * Menu button = System menu (strictly preserved for VRC compliance)

---

## 3. Modular Kinetic Components (The Building Blocks)

| Component | Function | Visual & Audio Profile |
| :--- | :--- | :--- |
| **Gravity Track** | Straight, curved, and banked tracks that guide spheres. | Smooth walnut wood with polished brass guide rails. |
| **Magnetic Deflector** | Reverses or turns spheres 90° using magnetic repulsors. | Matte ceramic housing with subtle blue glow pulses. |
| **Kinetic Spring Piston** | Launches incoming spheres upward into free-fall. | Brass coil with satisfying mechanical click sound. |
| **Resonant Chime Bell** | Tuned bells that trigger pitch-perfect musical notes upon impact. | Brushed copper bells tuned to pentatonic scale (A minor). |
| **Wall Conduit Anchor** | Suction/magnetic clamp that attaches tracks to real physical walls. | Industrial minimalist suction bracket. |
| **Portal Node** | Transports spheres from one side of the room to another. | Elegant glass rings with gentle spatial particle distortion. |

---

## 4. Campaign Structure & Progression

### Chapter 1: The Desktop Workshop (10 Levels)
* Focuses purely on the player's primary tabletop (coffee table, desk).
* Teaches fundamental momentum, banking angles, and splitters.
* 100% accessible to seated or standing players in any sized room.

### Chapter 2: Kinetic Architecture (10 Levels)
* Introduces height variations, ramps dropping from table to floor, and rebound cushions bouncing off real walls.
* Utilizes Meta Quest Scene Mesh understanding (detects floor and vertical planes).

### Chapter 3: The Symphony Circuit (10 Levels)
* Musical kinetic levels where solving the puzzle requires striking chimes in an exact rhythmic order to play a harmonic tune.
* High sensory reward and viral shareability on social media.

### Sandbox Mode (Freeplay)
* An infinite toy box where the player has access to unlimited pieces to build massive Rube Goldberg machines throughout their entire room.
* Save/Load contraptions via Meta Cloud Storage.

---

## 5. Visual Art Direction & Audio Design

### Visual Philosophy
* **Stylized Scandinavian Minimalist:** Clean natural materials (warm birch, deep walnut, brushed brass, matte porcelain).
* **High Contrast in Passthrough:** Shaded with crisp ambient occlusion and clean specular highlights so virtual pieces stand out clearly against varied physical room colors.
* **Lightweight Performance:** Custom unlit/simple vertex-lit shaders optimized for mobile Snapdragon XR2 Gen 2 / Gen 1 GPU.

### Audio & Haptics Philosophy
* **Micro-Sampling:** Over 150 real-world recorded audio clips (wood clacks, marble rolls, spring releases, bell chimes).
* **Positional 3D Audio:** Meta Audio SDK spatializes every sound accurately in the player's physical room.

---

## 6. Commercial & Monetization Strategy

* **Base Game:** **$9.99 USD** (Includes 30 Campaign levels + Unlimited Sandbox Mode).
* **Post-Launch DLC Packs:**
  * *Pack 1: "Acoustic Wonders" ($3.99)* — 15 new musical puzzles + tuned marimba/xylophone modules.
  * *Pack 2: "Gravity Inversion" ($3.99)* — Antigravity tubes and portal tracks.
* **Horizon Store Launch Track:** Begin on **Early Access** channel to build reviews, optimize based on telemetry, and transition to Full Store Featured Status.
