// NorthStar Studioz — ambient building blocks.
// Small isometric cubes assemble into little structures on the floor of the
// environment, hold for a moment, then break apart and fade. Purely
// decorative: low contrast, behind all content, ~30 fps, paused when the tab
// is hidden, never started for reduced-motion users.

const SHAPES = [
  // [x, y, z] cells, in build order (bottom up)
  [[0, 0, 0], [0, 0, 1], [0, 0, 2], [0, 0, 3]],                                   // tower
  [[0, 0, 0], [1, 0, 0], [2, 0, 0], [1, 0, 1], [2, 0, 1], [2, 0, 2]],             // stairs
  [[0, 0, 0], [0, 0, 1], [2, 0, 0], [2, 0, 1], [0, 0, 2], [1, 0, 2], [2, 0, 2]],  // arch
  [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 1, 1], [1, 0, 1], [0, 1, 1], [0, 0, 2]], // block + cap
  [[0, 0, 0], [1, 0, 0], [2, 0, 0], [0, 1, 0], [0, 2, 0], [0, 0, 1]],             // corner wall
];

const FRAME_MS = 1000 / 30;
const ease = (t) => 1 - (1 - t) ** 3;
const rand = (a, b) => a + Math.random() * (b - a);

export function startBlocks(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const small = matchMedia('(max-width: 820px)').matches;
  const MAX_ALIVE = small ? 2 : 3;
  let w = 0, h = 0, dpr = 1, unit = 14;
  const structures = [];
  let lastSpawn = 0, last = 0, raf = 0;

  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    w = r.width; h = r.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    unit = Math.max(9, Math.min(18, w * 0.011));
  }

  function spawn(now) {
    const shape = SHAPES[(Math.random() * SHAPES.length) | 0];
    // Lower outer thirds of the screen, clear of the centred copy.
    const left = Math.random() < 0.5;
    const x = left ? rand(0.06, 0.28) : rand(0.72, 0.94);
    const y = rand(0.74, 0.95);
    const depth = 0.55 + (y - 0.74) * 2; // nearer the horizon = smaller
    structures.push({
      ox: x * w, oy: y * h, s: unit * depth, born: now,
      cubes: shape.map((c, i) => ({ c, t: now + i * 260, vx: 0, vy: 0, dx: 0, dy: 0, a: 0 })),
      breakAt: now + shape.length * 260 + rand(1800, 3200),
      broken: false,
    });
  }

  function iso(s, x, y, z) {
    return [(x - y) * s * 0.87, (x + y) * s * 0.5 - z * s];
  }

  // (px, py) is the cube's bottom-front corner.
  function drawCube(px, py, s, alpha) {
    const hw = s * 0.87, hh = s * 0.5;
    const L = [px - hw, py - hh], R = [px + hw, py - hh], B = [px, py];
    const TF = [px, py - s], TL = [px - hw, py - hh - s], TR = [px + hw, py - hh - s], TB = [px, py - 2 * hh - s];
    const face = (pts, fill) => {
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath();
      ctx.fillStyle = fill; ctx.fill(); ctx.stroke();
    };
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = 'rgba(255, 181, 71, 0.55)';
    face([TB, TR, TF, TL], 'rgba(243, 239, 231, 0.32)'); // top
    face([TL, TF, B, L], 'rgba(255, 107, 53, 0.2)');     // left
    face([TR, TF, B, R], 'rgba(127, 178, 255, 0.16)');   // right
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (now - last < FRAME_MS) return;
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;

    if (structures.length < MAX_ALIVE && now - lastSpawn > (small ? 4200 : 2800)) { spawn(now); lastSpawn = now; }

    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 1;
    for (let i = structures.length - 1; i >= 0; i--) {
      const st = structures[i];
      if (!st.broken && now > st.breakAt) {
        st.broken = true;
        for (const cube of st.cubes) { cube.vx = rand(-40, 40); cube.vy = rand(-90, -30); }
      }
      // Painter's order: back to front, bottom to top.
      const order = [...st.cubes].sort((a, b) => (a.c[0] + a.c[1]) - (b.c[0] + b.c[1]) || a.c[2] - b.c[2]);
      let alive = false;
      for (const cube of order) {
        if (now < cube.t) continue;
        const [bx, by] = iso(st.s, cube.c[0], cube.c[1], cube.c[2]);
        let lift = 0;
        if (!st.broken) {
          const k = Math.min(1, (now - cube.t) / 420);
          lift = (1 - ease(k)) * st.s * 3;     // drops into place
          cube.a = Math.min(1, cube.a + dt * 3);
        } else {
          cube.vy += 220 * dt;                  // gravity
          cube.dx += cube.vx * dt;
          cube.dy += cube.vy * dt;
          cube.a = Math.max(0, cube.a - dt * 0.9);
        }
        if (cube.a > 0.01) alive = true;
        drawCube(st.ox + bx + cube.dx, st.oy + by - lift + cube.dy, st.s, cube.a * 0.85);
      }
      if (st.broken && !alive) structures.splice(i, 1);
    }
    ctx.globalAlpha = 1;
  }

  resize();
  new ResizeObserver(resize).observe(canvas);
  const run = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : run()));
  run();
}

// A small rocket launches from behind the far ridge at random intervals, from a
// random spot either side of the centred copy, with its own drift and height.
export function startRocket(el) {
  let timer = 0;
  const launch = () => {
    if (document.hidden) return schedule(5000);
    const leftSide = Math.random() < 0.5;
    const x = leftSide ? rand(6, 30) : rand(70, 92);
    const drift = rand(5, 12) * (leftSide ? 1 : -1); // arc away from the centre
    el.style.setProperty('--x', `${x.toFixed(1)}%`);
    el.style.setProperty('--dx', `${drift.toFixed(1)}vw`);
    el.style.setProperty('--dy', `${-rand(38, 55).toFixed(1)}vh`);
    el.style.setProperty('--tilt', `${(drift > 0 ? 1 : -1) * rand(14, 30).toFixed(1)}deg`);
    el.style.setProperty('--dur', `${rand(4.8, 6.6).toFixed(2)}s`);
    el.classList.remove('is-flying');
    void el.offsetWidth; // restart the animation
    el.classList.add('is-flying');
    schedule(rand(25000, 55000));
  };
  const schedule = (ms) => { clearTimeout(timer); timer = setTimeout(launch, ms); };
  el.addEventListener('animationend', (e) => { if (e.animationName === 'rocket-fly') el.classList.remove('is-flying'); });
  schedule(rand(5000, 12000));
}
