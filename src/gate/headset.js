// NorthStar Studioz — intro gate headset.
// A procedural VR headset (no model download) rendered with three.js.
// Bundled by `npm run build` into website/assets/js/gate-3d.js.

import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, Color,
  MeshPhysicalMaterial, MeshStandardMaterial, CylinderGeometry, SphereGeometry,
  TubeGeometry, CatmullRomCurve3, Vector3, DirectionalLight, PointLight,
  PMREMGenerator, ACESFilmicToneMapping, SRGBColorSpace, CapsuleGeometry,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const easeOutBack = (t) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2;
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const easeOutCubic = (t) => 1 - (1 - t) ** 3;
const easeInCubic = (t) => t * t * t;
const clamp01 = (t) => Math.min(1, Math.max(0, t));

function buildHeadset() {
  const shell = new MeshPhysicalMaterial({ color: 0xe8ecf4, roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.18 });
  const glass = new MeshPhysicalMaterial({
    color: 0x04060c, roughness: 0.06, metalness: 0.4, clearcoat: 1, clearcoatRoughness: 0.04,
    emissive: new Color(0x2f7bff), emissiveIntensity: 0,
  });
  const fabric = new MeshStandardMaterial({ color: 0x1c2130, roughness: 0.95 });
  const strap = new MeshPhysicalMaterial({ color: 0x232838, roughness: 0.55, clearcoat: 0.3 });
  const cyan = new MeshStandardMaterial({ color: 0x0b1a22, emissive: 0x3be3ff, emissiveIntensity: 2.4 });
  const violet = new MeshStandardMaterial({ color: 0x140d22, emissive: 0x8b6cff, emissiveIntensity: 2.2 });
  const lensRing = new MeshPhysicalMaterial({ color: 0x0c0f16, roughness: 0.25, metalness: 0.8 });
  const lens = new MeshPhysicalMaterial({ color: 0x0a1030, roughness: 0, metalness: 0.2, clearcoat: 1, iridescence: 1, iridescenceIOR: 1.6 });

  const g = new Group();
  const add = (geo, mat, x = 0, y = 0, z = 0) => { const m = new Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };
  // A horizontal "pill": capsule laid on its side, flattened front-to-back.
  const pill = (r, len, depth, mat, z) => {
    const m = add(new CapsuleGeometry(r, len, 16, 48), mat, 0, 0, z);
    m.rotation.z = Math.PI / 2;
    m.scale.set(1, 1, depth);
    return m;
  };

  // Visor shell, curved front glass and facial interface
  pill(0.5, 1.02, 0.62, shell, 0);
  pill(0.47, 1.0, 0.66, glass, 0.02);
  pill(0.44, 0.92, 0.5, fabric, -0.3);

  // Light bar + side status pills, sitting on the curved glass
  add(new CapsuleGeometry(0.018, 0.36, 4, 12), cyan, 0, -0.3, 0.262).rotation.z = Math.PI / 2;
  for (const s of [-1, 1]) add(new CapsuleGeometry(0.026, 0.13, 4, 10), violet, s * 0.8, 0, 0.255);

  // Passthrough cameras paired with depth sensors near each edge
  for (const s of [-1, 1]) {
    add(new CylinderGeometry(0.085, 0.085, 0.04, 40), lensRing, s * 0.6, -0.1, 0.31).rotation.x = Math.PI / 2;
    add(new SphereGeometry(0.06, 32, 16), lens, s * 0.6, -0.1, 0.33).scale.z = 0.45;
    add(new CylinderGeometry(0.028, 0.028, 0.03, 20), lensRing, s * 0.6, 0.1, 0.312).rotation.x = Math.PI / 2;
  }

  // Hinges where the strap meets the visor
  for (const s of [-1, 1]) add(new CylinderGeometry(0.1, 0.1, 0.09, 32), shell, s * 0.98, 0, -0.2).rotation.z = Math.PI / 2;

  // Side strap loop (flattened tube) with a thin cyan edge light
  const loop = new CatmullRomCurve3([
    new Vector3(0.98, 0, -0.2), new Vector3(1.06, 0.02, -0.7), new Vector3(0.94, 0.04, -1.32),
    new Vector3(0.52, 0.05, -1.76), new Vector3(0, 0.06, -1.9), new Vector3(-0.52, 0.05, -1.76),
    new Vector3(-0.94, 0.04, -1.32), new Vector3(-1.06, 0.02, -0.7), new Vector3(-0.98, 0, -0.2),
  ]);
  add(new TubeGeometry(loop, 120, 0.05, 12, false), strap).scale.y = 1.9;
  add(new TubeGeometry(loop, 120, 0.009, 6, false), cyan, 0, -0.09, 0).scale.set(1.04, 1, 1.03);

  // Top strap and rear cradle
  const top = new CatmullRomCurve3([
    new Vector3(0, 0.42, -0.3), new Vector3(0, 0.78, -0.8), new Vector3(0, 0.74, -1.45), new Vector3(0, 0.3, -1.88),
  ]);
  add(new TubeGeometry(top, 64, 0.042, 12, false), strap).scale.x = 2.0;
  const cradle = add(new CapsuleGeometry(0.2, 0.42, 8, 24), strap, 0, 0.08, -1.92);
  cradle.rotation.z = Math.PI / 2;
  cradle.scale.z = 0.5;

  // Rotate around a point just behind the visor so the front stays the hero.
  g.children.forEach((c) => { c.position.z += 0.45; });
  return { group: g, glass };
}

export function createGate(canvas) {
  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = SRGBColorSpace;

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  const camera = new PerspectiveCamera(32, 1, 0.1, 100);
  const CAM_Z = 7.4;
  camera.position.set(0, 0.25, CAM_Z);
  camera.lookAt(0, 0, 0);

  const key = new DirectionalLight(0xffffff, 1.6); key.position.set(3, 4, 5); scene.add(key);
  const rimC = new PointLight(0x3be3ff, 26, 12); rimC.position.set(-3.2, 1.2, -2.5); scene.add(rimC);
  const rimV = new PointLight(0x8b6cff, 22, 12); rimV.position.set(3.4, -0.8, -2.2); scene.add(rimV);

  const { group: headset, glass } = buildHeadset();
  const rig = new Group();
  rig.add(headset);
  scene.add(rig);

  let w = 0, h = 0;
  function resize() {
    const r = canvas.getBoundingClientRect();
    if (r.width === w && r.height === h) return;
    w = r.width; h = r.height;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(h, 1);
    // Keep the headset a sensible size on tall/narrow screens.
    camera.fov = camera.aspect < 0.8 ? 46 : 27;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const onMove = (e) => { pointer.tx = (e.clientX / innerWidth - 0.5) * 2; pointer.ty = (e.clientY / innerHeight - 0.5) * 2; };
  addEventListener('pointermove', onMove, { passive: true });

  const t0 = performance.now();
    let exit = null; // { start, from, to, resolve }

  function frame(now) {
    const t = (now - t0) / 1000;
    pointer.x += (pointer.tx - pointer.x) * 0.06;
    pointer.y += (pointer.ty - pointer.y) * 0.06;

    if (!exit) {
      // Entrance: spin in two full turns and settle facing the viewer, then sway.
      const k = clamp01((t - 0.2) / 1.6);
      rig.scale.setScalar(Math.max(easeOutBack(clamp01((t - 0.2) / 1.1)), 0.0001));
      const sway = Math.sin(Math.max(t - 1.8, 0) * 0.55) * 0.62;
      headset.rotation.y = -Math.PI * 4 * (1 - easeOutCubic(k)) + sway + pointer.x * 0.25;
      rig.rotation.x = 0.12 + pointer.y * 0.1;
      rig.rotation.z = -pointer.x * 0.05;
      rig.position.y = Math.sin(t * 1.3) * 0.05;
    } else {
      const e = (now - exit.start) / 1000;
      const spin = easeInOutCubic(clamp01(e / 0.9));
      headset.rotation.y = exit.from + (exit.to - exit.from) * spin;
      rig.rotation.x *= 0.9;
      rig.rotation.z *= 0.9;
      const dolly = easeInCubic(clamp01((e - 0.65) / 0.65));
      camera.position.z = CAM_Z - dolly * (CAM_Z - 1.15);
      camera.position.y = 0.25 * (1 - dolly);
      camera.lookAt(0, 0, 0);
      glass.emissiveIntensity = dolly * 3.2;
      if (e >= 1.3 && exit.resolve) { exit.resolve(); exit.resolve = null; }
    }
    renderer.render(scene, camera);
  }
  renderer.setAnimationLoop(frame);

  return {
    /** Spin the headset to face the viewer, then fly through its lens. */
    exit() {
      return new Promise((resolve) => {
        const from = headset.rotation.y;
        const to = Math.ceil((from + Math.PI * 2.5) / (Math.PI * 2)) * Math.PI * 2;
        exit = { start: performance.now(), from, to, resolve };
        // Resolve even if frames stall (background tab, slow GPU).
        setTimeout(() => { if (exit.resolve) { exit.resolve(); exit.resolve = null; } }, 1600);
      });
    },
    dispose() {
      renderer.setAnimationLoop(null);
      ro.disconnect();
      removeEventListener('pointermove', onMove);
      scene.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
      scene.environment?.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
