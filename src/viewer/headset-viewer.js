// NorthStar Studioz: interactive headset model for the "Under the hood" section.
// Loaded on demand (the visitor taps "Explore in 3D"); never part of first paint.
// Bundled by `npm run build` into website/assets/js/viewer-3d.js.

import {
  WebGLRenderer, Scene, PerspectiveCamera, Box3, Vector3, DirectionalLight,
  PMREMGenerator, ACESFilmicToneMapping, SRGBColorSpace,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const MODEL_URL = 'assets/models/headset.gltf';

// Resolves with a controller once the model is on screen, rejects if WebGL or
// the model is unavailable (the caller then keeps the still image).
export async function createViewer(canvas, { reducedMotion = false } = {}) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envTarget.texture;
  scene.environmentIntensity = 0.6;
  const key = new DirectionalLight(0xffe2cf, 1.1);
  key.position.set(2, 3, 4);
  scene.add(key);

  const gltf = await new GLTFLoader().loadAsync(MODEL_URL);
  const model = gltf.scene;
  scene.add(model);

  // Centre the model and frame it from a three-quarter view.
  const box = new Box3().setFromObject(model);
  const size = box.getSize(new Vector3());
  model.position.sub(box.getCenter(new Vector3()));
  const radius = Math.max(size.x, size.y, size.z) / 2;

  const camera = new PerspectiveCamera(30, 1, radius * 0.1, radius * 20);
  const distance = (radius / Math.sin((camera.fov * Math.PI) / 360)) * 1.12;
  camera.position.set(distance * 0.62, distance * 0.28, distance * 0.74);

  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = distance * 0.6;
  controls.maxDistance = distance * 1.6;
  controls.autoRotate = !reducedMotion;
  controls.autoRotateSpeed = 1.2;
  controls.listenToKeyEvents(canvas);
  controls.keyRotateSpeed = 6;
  // One finger drags sideways to turn the model; a vertical swipe still scrolls the page.
  canvas.style.touchAction = 'pan-y';
  controls.addEventListener('start', () => { controls.autoRotate = false; });

  let visible = true;
  let frame = 0;
  const draw = () => {
    frame = 0;
    // update() reports whether the camera moved, so the loop idles once the model settles.
    const moving = controls.update();
    renderer.render(scene, camera);
    if (visible && (controls.autoRotate || moving)) frame = requestAnimationFrame(draw);
  };
  const kick = () => { if (!frame) frame = requestAnimationFrame(draw); };
  controls.addEventListener('change', kick);

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (!w || !h) return;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    kick();
  };
  const resizeObs = new ResizeObserver(resize);
  resizeObs.observe(canvas);
  // Stop drawing while the viewer is scrolled away or the tab is hidden.
  const visObs = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting && !document.hidden; kick(); });
  visObs.observe(canvas);
  const onVisibility = () => { visible = !document.hidden; kick(); };
  document.addEventListener('visibilitychange', onVisibility);
  resize();

  return {
    setAutoRotate(on) { controls.autoRotate = on && !reducedMotion; kick(); },
    dispose() {
      cancelAnimationFrame(frame);
      resizeObs.disconnect();
      visObs.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      controls.dispose();
      scene.traverse((o) => {
        if (!o.isMesh) return;
        o.geometry.dispose();
        for (const m of [].concat(o.material)) {
          for (const v of Object.values(m)) if (v && v.isTexture) v.dispose();
          m.dispose();
        }
      });
      envTarget.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
}
