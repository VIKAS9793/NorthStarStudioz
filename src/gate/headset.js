// NorthStar Studioz — intro gate headset.
// A procedural VR headset (no model download) rendered with three.js.
// Bundled by `npm run build` into website/assets/js/gate-3d.js.

import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, Color,
  MeshPhysicalMaterial, MeshStandardMaterial, CylinderGeometry, SphereGeometry,
  TubeGeometry, CatmullRomCurve3, Vector3, DirectionalLight, PointLight,
  PMREMGenerator, ACESFilmicToneMapping, SRGBColorSpace,
  Raycaster, Vector2, Plane, Quaternion, Euler,
  BufferGeometry, Float32BufferAttribute, MeshBasicMaterial, Shape, ShapeGeometry,
  TorusGeometry, AdditiveBlending, DoubleSide, PlaneGeometry,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const easeOutBack = (t) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2;
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const easeOutCubic = (t) => 1 - (1 - t) ** 3;
const easeInCubic = (t) => t * t * t;
const clamp01 = (t) => Math.min(1, Math.max(0, t));

// ---- Geometry helpers -------------------------------------------------

// Point and outward normal on an ellipsoid (radii a, b, c) for an azimuth
// (from +z toward +x) and elevation. Front of the headset is +z.
function ellipsoidAt(a, b, c, az, el, out, nOut) {
  const dx = Math.sin(az) * Math.cos(el), dy = Math.sin(el), dz = Math.cos(az) * Math.cos(el);
  out.set(a * dx, b * dy, c * dz);
  if (nOut) nOut.set(dx / a, dy / b, dz / c).normalize();
  return out;
}

// Rounded-rectangle outline in (azimuth, elevation) space: a superellipse.
const visorEdge = (s, A, E, n = 5) => {
  const cs = Math.cos(s), sn = Math.sin(s);
  return [A * Math.sign(cs) * Math.abs(cs) ** (2 / n), E * Math.sign(sn) * Math.abs(sn) ** (2 / n)];
};

// A smooth patch of an ellipsoid bounded by the superellipse outline,
// with exact analytic normals (no shading seams).
function visorPatch(a, b, c, A, E, segS = 160, segR = 28) {
  const pos = [], nor = [], idx = [];
  const p = new Vector3(), n = new Vector3();
  for (let i = 0; i <= segS; i++) {
    const [az1, el1] = visorEdge((i / segS) * Math.PI * 2, A, E);
    for (let j = 0; j <= segR; j++) {
      const r = j / segR;
      ellipsoidAt(a, b, c, az1 * r, el1 * r, p, n);
      pos.push(p.x, p.y, p.z); nor.push(n.x, n.y, n.z);
    }
  }
  for (let i = 0; i < segS; i++) {
    for (let j = 0; j < segR; j++) {
      const k = i * (segR + 1) + j, k2 = k + segR + 1;
      idx.push(k, k2, k + 1, k + 1, k2, k2 + 1);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}

// Paint a neon gradient along a mesh, left (cyan) to right (violet).
function neonGradient(geo, from, to) {
  const p = geo.attributes.position, cols = [];
  const c = new Color();
  for (let i = 0; i < p.count; i++) {
    const t = Math.min(1, Math.max(0, (p.getX(i) + 1.1) / 2.2));
    c.copy(from).lerp(to, t);
    cols.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new Float32BufferAttribute(cols, 3));
  return geo;
}

function buildHeadset() {
  const CYAN = new Color(0x3be3ff), VIOLET = new Color(0x9b7bff);

  // Pearl shell, deep iridescent visor glass, graphite strap, unlit neon.
  const shell = new MeshPhysicalMaterial({ color: 0xeef1f7, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.12, sheen: 0.4, sheenColor: new Color(0xbfd4ff) });
  const glass = new MeshPhysicalMaterial({
    // Dark smoked dielectric glass: near-black at face-on angles, bright
    // reflections and an oil-slick film toward the edges.
    color: 0x060914, roughness: 0.03, metalness: 0, ior: 1.6, clearcoat: 1, clearcoatRoughness: 0.02,
    iridescence: 1, iridescenceIOR: 1.35, iridescenceThicknessRange: [260, 720],
    emissive: new Color(0x2f7bff), emissiveIntensity: 0, side: DoubleSide,
  });
  const strapMat = new MeshPhysicalMaterial({ color: 0x1d2130, roughness: 0.5, clearcoat: 0.4 });
  const neon = new MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  const halo = new MeshBasicMaterial({ vertexColors: true, toneMapped: false, transparent: true, opacity: 0.22, blending: AdditiveBlending, depthWrite: false });
  const starMat = new MeshBasicMaterial({ color: 0xfff4dd, toneMapped: false });

  const g = new Group();
  const add = (geo, mat, x = 0, y = 0, z = 0) => { const m = new Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };

  // Body: one smooth, flattened pebble.
  add(new SphereGeometry(1, 128, 64), shell).scale.set(1.05, 0.46, 0.42);

  // Wraparound visor sitting just proud of the shell.
  const VA = 1.058, VB = 0.472, VC = 0.446, AZ = 0.86, EL = 0.7;
  add(visorPatch(VA, VB, VC, AZ, EL), glass);

  // Neon edge tracing the visor outline, plus a soft additive glow around it.
  const rimPts = [];
  for (let i = 0; i < 96; i++) {
    const [az, el] = visorEdge((i / 96) * Math.PI * 2, AZ, EL);
    rimPts.push(ellipsoidAt(VA * 1.004, VB * 1.004, VC * 1.004, az, el, new Vector3()));
  }
  const rim = new CatmullRomCurve3(rimPts, true, 'centripetal');
  add(neonGradient(new TubeGeometry(rim, 320, 0.014, 10, true), CYAN, VIOLET), neon);
  add(neonGradient(new TubeGeometry(rim, 320, 0.05, 10, true), CYAN, VIOLET), halo);

  // The studio's four-point star, etched into the glass.
  const star = new Shape();
  const R = 0.07, r = 0.016;
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2 + Math.PI / 2, rad = i % 2 ? r : R;
    const x = Math.cos(ang) * rad, y = Math.sin(ang) * rad;
    i ? star.lineTo(x, y) : star.moveTo(x, y);
  }
  const starPos = ellipsoidAt(VA * 1.006, VB * 1.006, VC * 1.006, 0, 0.42, new Vector3());
  const starNor = new Vector3();
  ellipsoidAt(VA, VB, VC, 0, 0.42, new Vector3(), starNor);
  const starMesh = add(new ShapeGeometry(star), starMat, starPos.x, starPos.y, starPos.z);
  starMesh.lookAt(starPos.clone().add(starNor));

  // Temple pods where the strap meets the shell, each with a neon ring.
  for (const sx of [-1, 1]) {
    const pod = add(new CylinderGeometry(0.13, 0.13, 0.1, 48), shell, sx * 0.99, 0, -0.14);
    pod.rotation.z = Math.PI / 2;
    const ring = add(neonGradient(new TorusGeometry(0.115, 0.009, 8, 64), CYAN, VIOLET), neon, sx * 1.045, 0, -0.14);
    ring.rotation.y = Math.PI / 2;
  }

  // Slim strap loop with a neon pinstripe, a top strap and a soft rear cradle.
  const loop = new CatmullRomCurve3([
    new Vector3(1.0, 0, -0.16), new Vector3(1.08, 0.02, -0.66), new Vector3(0.96, 0.04, -1.26),
    new Vector3(0.52, 0.05, -1.68), new Vector3(0, 0.06, -1.8), new Vector3(-0.52, 0.05, -1.68),
    new Vector3(-0.96, 0.04, -1.26), new Vector3(-1.08, 0.02, -0.66), new Vector3(-1.0, 0, -0.16),
  ]);
  add(new TubeGeometry(loop, 160, 0.045, 14, false), strapMat).scale.y = 1.7;
  add(neonGradient(new TubeGeometry(loop, 160, 0.008, 6, false), CYAN, VIOLET), neon, 0, -0.072, 0).scale.set(1.035, 1, 1.025);
  const top = new CatmullRomCurve3([
    new Vector3(0, 0.4, -0.2), new Vector3(0, 0.72, -0.72), new Vector3(0, 0.68, -1.38), new Vector3(0, 0.26, -1.78),
  ]);
  add(new TubeGeometry(top, 80, 0.036, 12, false), strapMat).scale.x = 1.9;
  add(new SphereGeometry(1, 48, 24), strapMat, 0, 0.06, -1.82).scale.set(0.34, 0.24, 0.12);

  // Rotate around a point just behind the visor so the front stays the hero.
  g.children.forEach((child) => { child.position.z += 0.36; });
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
  // The visor reflects its own environment: a black room lit only by a few
  // neon strips, so it reads as dark glass with coloured streaks rather than
  // mirroring the grey studio used to light the shell.
  const glassRoom = new Scene();
  glassRoom.background = new Color(0x03040a);
  const strip = (w, h, r, g, b, x, y, z) => {
    const m = new Mesh(new PlaneGeometry(w, h), new MeshBasicMaterial({ color: new Color(r, g, b), side: DoubleSide }));
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    glassRoom.add(m);
  };
  strip(5, 0.7, 2.4, 2.4, 2.6, 0, 4.2, 2.5);        // soft white key above
  strip(0.45, 5, 0.7, 2.6, 3.0, -4.2, 0.8, 2.8);    // cyan, left
  strip(0.45, 5, 1.8, 1.4, 3.0, 4.2, 0.4, 2.8);     // violet, right
  strip(6, 0.35, 2.2, 0.8, 0.35, 0, -3.4, 3.2);     // ember line, low
  const glassEnv = pmrem.fromScene(glassRoom, 0.03).texture;
  glassRoom.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
  // Since three r163, envMapIntensity only scales a material's own envMap.
  glass.envMap = glassEnv;
  glass.envMapIntensity = 1;
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

  // Gaze tracking: the headset turns to look exactly at the cursor.
  // The pointer is cast as a ray from the camera onto a plane between the
  // headset and the viewer; the headset's forward axis is aimed at the hit
  // point, so on screen its line of sight passes through the cursor.
  const LOOK_PLANE = new Plane(new Vector3(0, 0, 1), -3.4); // z = 3.4
  const MAX_YAW = 1.05;   // ~60°, keeps the front of the visor in view
  const MAX_PITCH = 0.7;  // ~40°
  const raycaster = new Raycaster();
  const ndc = new Vector2(0, 0);
  const hit = new Vector3();
  const lookEuler = new Euler(0, 0, 0, 'YXZ');
  const lookTarget = new Quaternion();
  const facing = new Quaternion(); // identity: looking at the viewer
  let hasPointer = false;

  const onMove = (e) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    hasPointer = true;
  };
  const onLeave = () => { hasPointer = false; };
  addEventListener('pointermove', onMove, { passive: true });
  addEventListener('pointerdown', onMove, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);

  function aim() {
    if (!hasPointer) return facing;
    raycaster.setFromCamera(ndc, camera);
    if (!raycaster.ray.intersectPlane(LOOK_PLANE, hit)) return facing;
    const dx = hit.x - rig.position.x, dy = hit.y - rig.position.y, dz = hit.z - rig.position.z;
    const yaw = Math.max(-MAX_YAW, Math.min(MAX_YAW, Math.atan2(dx, dz)));
    const pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, Math.atan2(dy, Math.hypot(dx, dz))));
    return lookTarget.setFromEuler(lookEuler.set(-pitch, yaw, 0));
  }

  let t0 = performance.now();
  let last = t0;
  let exit = null; // { start, from, to, resolve }

  function frame(now) {
    const t = (now - t0) / 1000;
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    // Frame-rate independent smoothing: responsive, but never jittery.
    const follow = 1 - Math.exp(-dt * 9);

    if (!exit) {
      // Entrance: spin in two full turns and settle, then track the cursor.
      const k = clamp01((t - 0.2) / 1.6);
      rig.scale.setScalar(Math.max(easeOutBack(clamp01((t - 0.2) / 1.1)), 0.0001));
      headset.rotation.y = -Math.PI * 4 * (1 - easeOutCubic(k));
      rig.position.y = Math.sin(t * 1.3) * 0.05;
      rig.quaternion.slerp(aim(), follow);
    } else {
      const e = (now - exit.start) / 1000;
      const spin = easeInOutCubic(clamp01(e / 0.9));
      headset.rotation.y = exit.from + (exit.to - exit.from) * spin;
      rig.quaternion.slerp(facing, follow);
      const dolly = easeInCubic(clamp01((e - 0.65) / 0.65));
      camera.position.z = CAM_Z - dolly * (CAM_Z - 1.15);
      camera.position.y = 0.25 * (1 - dolly);
      camera.lookAt(0, 0, 0);
      glass.emissiveIntensity = dolly * 3.2;
      if (e >= 1.3 && exit.resolve) { exit.resolve(); exit.resolve = null; }
    }
    renderer.render(scene, camera);
  }
  // Compile every shader before the first frame. With KHR_parallel_shader_compile
  // this happens off the main thread, so the page stays responsive; the headset
  // starts its entrance only once it can render without a hitch.
  let started = false;
  let disposed = false;
  const ready = (renderer.compileAsync ? renderer.compileAsync(scene, camera) : Promise.resolve())
    .catch(() => {})
    .then(() => {
      if (disposed) return false;
      t0 = last = performance.now();
      renderer.setAnimationLoop(frame);
      started = true;
      return true;
    });

  return {
    /** Spin the headset to face the viewer, then fly through its lens. */
    ready,
    exit() {
      if (!started) return Promise.resolve(); // not on screen yet: nothing to animate
      return new Promise((resolve) => {
        const from = headset.rotation.y;
        const to = Math.ceil((from + Math.PI * 2.5) / (Math.PI * 2)) * Math.PI * 2;
        exit = { start: performance.now(), from, to, resolve };
        // Resolve even if frames stall (background tab, slow GPU).
        setTimeout(() => { if (exit.resolve) { exit.resolve(); exit.resolve = null; } }, 1600);
      });
    },
    dispose() {
      disposed = true;
      renderer.setAnimationLoop(null);
      ro.disconnect();
      removeEventListener('pointermove', onMove);
      removeEventListener('pointerdown', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      scene.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
      scene.environment?.dispose();
      glassEnv.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
