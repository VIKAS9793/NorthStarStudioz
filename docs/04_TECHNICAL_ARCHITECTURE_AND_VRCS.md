# 04 - Technical Architecture & Virtual Reality Check (VRC) Compliance

**Project:** NorthStar MR  
**Engine:** Unity 6 LTS / 2022.3 LTS  
**Render Pipeline:** Universal Render Pipeline (URP)  
**Target Hardware:** Meta Quest 3, Meta Quest 3S, Meta Quest 2, Meta Quest Pro  
**API Standard:** Khronos OpenXR + Meta XR SDK

---

## 1. Core Technical Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                       NorthStar MR Game Layer                   │
│   (Kinetic Rail Physics, Puzzle Solver, Audio Synth, Save Data) │
├─────────────────────────────────────────────────────────────────┤
│                   Meta Interaction SDK (Hands & Touch)          │
├─────────────────────────────────────────────────────────────────┤
│    Meta Horizon Integration SDK (Platform, Cloud Saves, IAP)    │
├─────────────────────────────────────────────────────────────────┤
│         Meta XR Core SDK (Passthrough, Anchors, Scene Mesh)     │
├─────────────────────────────────────────────────────────────────┤
│                 Unity OpenXR Plugin & URP Mobile               │
├─────────────────────────────────────────────────────────────────┤
│            Meta Horizon OS (Android 12/14 AOSP Kernel)          │
└─────────────────────────────────────────────────────────────────┘
```

### Essential Package Dependencies (`manifest.json`)
```json
{
  "dependencies": {
    "com.unity.xr.openxr": "1.10.0",
    "com.unity.render-pipelines.universal": "14.0.11",
    "com.meta.xr.sdk.core": "69.0.0",
    "com.meta.xr.sdk.interaction": "69.0.0",
    "com.meta.xr.sdk.interaction.ovr": "69.0.0",
    "com.meta.xr.sdk.platform": "69.0.0"
  }
}
```

---

## 2. Rendering Pipeline & Performance Budget

To run at a locked **90 Hz on Quest 3/3S** and **72 Hz on Quest 2** without dropping frames:

| Metric | Target Budget | Enforcement Technique |
| :--- | :--- | :--- |
| **Frame Rate** | **Locked 90 FPS** (Quest 3/3S) / **72 FPS** (Quest 2) | Fixed framerate locking, avoid physics spikes via Fixed Timestep = 0.0111s (90Hz). |
| **Draw Calls** | **< 100 - 120 calls per frame** | GPU Instancing on modular rails, texture atlasing, SRP Batcher enabled. |
| **Triangle Count** | **< 150,000 visible triangles** | Low-poly stylized assets with LOD groups. |
| **Graphics API** | **Vulkan** | Multithreaded rendering enabled in Player Settings. |
| **Stereo Rendering** | **Multiview (Single-Pass Instanced)** | Renders both eyes in a single pass to slash CPU overhead by 40%. |
| **Texture Format** | **ASTC 4x4 / 6x6** | Native hardware decompression on Adreno GPUs. |
| **Anti-Aliasing** | **MSAA 4x** | Required for clean edges in VR against passthrough background. |

---

## 3. Mixed Reality Architecture: Passthrough & Spatial Anchors

### Passthrough Setup (URP Camera)
* Background clear flags set to **Solid Color with Alpha = 0**.
* `OVRPassthroughLayer` attached to the center camera with `overlayType = Overlay` and `compositionDepth = 0`.
* This allows the real-world color video feed to render behind all virtual kinetic objects with zero latency.

### Spatial Anchors & Persistence
* Uses `OVRSpatialAnchor` to pin the player's primary tabletop workbench to their real room.
* Anchor UUIDs are saved locally and synced to **Meta Cloud Storage** so the workbench reappears in the exact physical location upon next launch.

---

## 4. Virtual Reality Check (VRC) Store Compliance Checklist

Before Meta approves NorthStar MR for the Horizon Store, it must satisfy every item below:

### A. Performance & Stability (VRC.Quest.Performance)
- [x] **Zero Frame Freezes:** App never hangs during level loading; uses asynchronous scene loading (`Addressables` or `AsyncOperation`).
- [x] **No Thermal Throttling:** Sustained play under 45 minutes must not trip the Snapdragon processor into level 3/4 thermal throttling (verified via OVR Metrics Tool).

### B. User Comfort (VRC.Quest.Comfort)
- [x] **Zero Vestibular Mismatch:** Stationary tabletop experience ensures 100% comfort rating.
- [x] **Tracking Loss Handling:** If headset tracking is lost, app must immediately pause and display a static fade/passthrough frame instead of translating the camera erratically.

### C. System Integration (VRC.Quest.Functional)
- [x] **Meta/Oculus Button Preservation:** Right controller Meta button cannot be overridden. Pressing it must immediately open the Horizon OS universal system overlay.
- [x] **Entitlement Verification:** At app launch, execute `Entitlements.IsUserEntitledToApplication()` via the Horizon Integration SDK to verify valid purchase.
- [x] **Cloud Save Synchronization:** Game progress (unlocked chapters, custom sandbox creations) automatically syncs via Meta Cloud Storage.
- [x] **Boundary / Passthrough Compliance:** App gracefully reacts when the user walks outside their guardian boundary.
