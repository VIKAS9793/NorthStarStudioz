// NorthStar Studioz — site behaviour: HUD clock, dock, head-look parallax,
// pointer reticle, reveal fallback and the intro gate.

const root = document.documentElement;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

/* ---------- HUD clock (local time, like a headset's system bar) ---------- */
const clock = document.querySelector('[data-clock]');
if (clock) {
  const fmt = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });
  const tick = () => { clock.textContent = fmt.format(new Date()); };
  tick();
  setInterval(tick, 15000);
}

/* ---------- Dock: highlight the section in view ---------- */
const dockLinks = [...document.querySelectorAll('.dock a[href^="#"]')];
const targets = dockLinks.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
if (targets.length) {
  const spy = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      dockLinks.forEach((a) => {
        if (a.getAttribute('href') === `#${e.target.id}`) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    }
  }, { rootMargin: '-45% 0px -50% 0px' });
  targets.forEach((t) => spy.observe(t));
}

/* ---------- Head-look parallax: the environment shifts as the pointer moves ---------- */
const env = document.querySelector('.env');
if (env && finePointer && !reduceMotion) {
  let tx = 0, ty = 0, x = 0, y = 0, raf = 0;
  const step = () => {
    x += (tx - x) * 0.07;
    y += (ty - y) * 0.07;
    env.style.setProperty('--lx', x.toFixed(3));
    env.style.setProperty('--ly', y.toFixed(3));
    raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.002 ? requestAnimationFrame(step) : 0;
  };
  addEventListener('pointermove', (e) => {
    tx = (e.clientX / innerWidth - 0.5) * 2;
    ty = (e.clientY / innerHeight - 0.5) * 2;
    if (!raf) raf = requestAnimationFrame(step);
  }, { passive: true });
}

/* ---------- Terrain: a wireframe mountain range on the horizon ----------
   A heightfield seen in perspective, drawn once per resize on a 2D canvas
   (no per-frame work): faceted quads painted far to near so nearer ridges
   hide farther ones, lit from the setting sun behind them, fading into haze
   with distance. The skyline gets an ember rim and a few beacons on the
   highest peaks. Without JS the flat SVG ridge stays as the fallback. */
const terrainLayer = document.querySelector('.env__layer--near');
if (terrainLayer && typeof HTMLCanvasElement !== 'undefined') {
  const canvas = document.createElement('canvas');
  canvas.className = 'env__terrain';
  const ctx = canvas.getContext('2d');
  if (ctx) {
    terrainLayer.append(canvas);
    const beacons = document.createElement('div');
    beacons.className = 'env__beacons';
    terrainLayer.append(beacons);

    // Deterministic value noise, so the range is the same on every visit.
    const hash = (x, z) => {
      const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
      return s - Math.floor(s);
    };
    const smooth = (t) => t * t * (3 - 2 * t);
    const noise = (x, z) => {
      const xi = Math.floor(x), zi = Math.floor(z);
      const xf = smooth(x - xi), zf = smooth(z - zi);
      const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
      return a + (b - a) * xf + (c - a) * zf + (a - b - c + d) * xf * zf;
    };
    // Ridged fractal noise: sharp crests, soft valleys.
    const ridged = (x, z) => {
      let sum = 0, amp = 0.55, freq = 1, norm = 0;
      for (let o = 0; o < 4; o++) {
        const n = 1 - Math.abs(noise(x * freq, z * freq) * 2 - 1);
        sum += n * n * amp; norm += amp;
        amp *= 0.5; freq *= 2.03;
      }
      return sum / norm;
    };
    const step01 = (a, b, v) => smooth(Math.min(1, Math.max(0, (v - a) / (b - a))));

    function draw() {
      const box = terrainLayer.getBoundingClientRect();
      const W = Math.round(box.width), H = Math.round(box.height);
      if (!W || !H) return;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      // The layer overhangs the viewport by 40px each side (see .env__layer).
      const viewH = H - 80;
      const horizon = 40 + viewH * 0.69;
      const small = W < 720;
      const cols = small ? 44 : 72;
      const rows = small ? 13 : 18;
      const zNear = 6, zFar = 34, camH = 1;
      // Scale from the shorter of height and (wide) width, so portrait phones
      // get a wide, low range instead of a few towering spikes.
      const scale = Math.min(viewH, W * 0.7);
      const f = scale * 0.3;
      const xHalf = (W / 2 + 60) * zFar / f;
      const peak = scale * 0.24 * 20 / f;

      // Project the grid.
      const pts = [];
      for (let r = 0; r < rows; r++) {
        const d = r / (rows - 1);
        const z = zNear + (zFar - zNear) * d;
        const row = [];
        for (let c = 0; c <= cols; c++) {
          const x = -xHalf + (2 * xHalf * c) / cols;
          const u = Math.abs((x * f) / z / (W / 2)); // 0 at screen centre, 1 at the edge
          // Low in the middle so the headline keeps a clear sky behind it.
          const valley = 0.3 + 0.7 * step01(0.12, 0.8, u);
          const rise = step01(0.04, 0.55, d) * (1 - 0.25 * d);
          const y = ridged(x * 0.09 + 3.1, z * 0.16 + 7.4) * peak * valley * rise;
          row.push({ x: W / 2 + (x * f) / z, y: horizon + ((camH - y) * f) / z, h: y });
        }
        pts.push(row);
      }

      // Paint far to near. Each quad is shaded by how much its face turns
      // toward the sun (behind the range, at screen centre) and hazed by depth.
      const sunX = W / 2;
      ctx.lineJoin = 'round';
      for (let r = rows - 2; r >= 0; r--) {
        const d = r / (rows - 1);
        const near = pts[r], far = pts[r + 1];
        const haze = d * 0.85;
        const lineA = 0.08 + 0.32 * (1 - d);
        for (let c = 0; c < cols; c++) {
          const a = far[c], b = far[c + 1], p = near[c + 1], q = near[c];
          if (Math.max(a.x, q.x) < -20 || Math.min(b.x, p.x) > W + 20) continue;
          // Side slope: positive when the face leans toward the sun.
          const mid = (a.x + b.x + p.x + q.x) / 4;
          const side = ((b.h + p.h) - (a.h + q.h)) * Math.sign(sunX - mid);
          const lit = Math.max(0, Math.min(1, 0.5 + side * 0.6));
          const tall = Math.min(1, (a.h + b.h) / (2 * peak));
          // Base colour: night blue, warmed on sun-facing high faces, lifted toward the haze far away.
          const R = 12 + 22 * haze + 26 * lit * tall;
          const G = 15 + 22 * haze + 12 * lit * tall;
          const B = 26 + 34 * haze + 6 * lit * tall;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(p.x, p.y); ctx.lineTo(q.x, q.y);
          ctx.closePath();
          ctx.fillStyle = `rgb(${R | 0},${G | 0},${B | 0})`;
          ctx.fill();
          // The net: the far edge and left edge of every quad.
          ctx.beginPath();
          ctx.moveTo(q.x, q.y); ctx.lineTo(a.x, a.y); ctx.lineTo(b.x, b.y);
          if (c === cols - 1) ctx.lineTo(p.x, p.y);
          ctx.strokeStyle = `rgba(150, 188, 255, ${(lineA * (0.75 + 0.5 * lit)).toFixed(3)})`;
          ctx.lineWidth = 0.6 + 0.6 * (1 - d);
          ctx.stroke();
        }
      }

      // Skyline: the highest point of the range in every few pixels of screen.
      const bucket = 3;
      const sky = new Float32Array(Math.ceil(W / bucket) + 1).fill(Infinity);
      for (const row of pts) {
        for (let c = 0; c < cols; c++) {
          const a = row[c], b = row[c + 1];
          const i0 = Math.max(0, Math.floor(a.x / bucket)), i1 = Math.min(sky.length - 1, Math.ceil(b.x / bucket));
          for (let i = i0; i <= i1; i++) {
            const t = Math.min(1, Math.max(0, (i * bucket - a.x) / (b.x - a.x || 1)));
            const y = a.y + (b.y - a.y) * t;
            if (y < sky[i]) sky[i] = y;
          }
        }
      }
      // Ember rim light along the skyline, brightest near the sun.
      const rim = ctx.createLinearGradient(0, 0, W, 0);
      rim.addColorStop(0, 'rgba(255, 107, 53, 0.25)');
      rim.addColorStop(0.25, 'rgba(255, 150, 80, 0.7)');
      rim.addColorStop(0.5, 'rgba(255, 206, 140, 1)');
      rim.addColorStop(0.75, 'rgba(255, 150, 80, 0.7)');
      rim.addColorStop(1, 'rgba(255, 107, 53, 0.25)');
      const skyline = () => {
        ctx.beginPath();
        for (let i = 0; i < sky.length; i++) ctx[i ? 'lineTo' : 'moveTo'](i * bucket, sky[i]);
      };
      ctx.strokeStyle = rim;
      ctx.globalAlpha = 0.16; ctx.lineWidth = 6; skyline(); ctx.stroke();
      ctx.globalAlpha = 0.9; ctx.lineWidth = 1.2; skyline(); ctx.stroke();
      ctx.globalAlpha = 1;

      // Sunset spill: warm light pooling on the valley floor below the sun.
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.translate(W / 2, horizon);
      ctx.scale(1, 0.32);
      const spill = ctx.createRadialGradient(0, 0, 0, 0, 0, W * 0.5);
      spill.addColorStop(0, 'rgba(255, 140, 70, 0.22)');
      spill.addColorStop(0.5, 'rgba(255, 107, 53, 0.08)');
      spill.addColorStop(1, 'rgba(255, 107, 53, 0)');
      ctx.fillStyle = spill;
      ctx.fillRect(-W / 2, -W * 0.5, W, W);
      ctx.restore();

      // Beacons on the highest peaks, kept apart and off the centre column.
      const peaks = [];
      for (let i = 2; i < sky.length - 2; i++) {
        const x = i * bucket;
        if (x < W * 0.06 || x > W * 0.94 || Math.abs(x - W / 2) < W * 0.12) continue;
        if (sky[i] <= sky[i - 1] && sky[i] <= sky[i + 1] && sky[i] <= sky[i - 2] && sky[i] <= sky[i + 2]) peaks.push({ x, y: sky[i] });
      }
      peaks.sort((a, b) => a.y - b.y);
      const picked = [];
      for (const p of peaks) {
        if (picked.every((q) => Math.abs(q.x - p.x) > W * 0.16)) picked.push(p);
        if (picked.length === (small ? 2 : 4)) break;
      }
      beacons.replaceChildren(...picked.map((p, i) => {
        const el = document.createElement('i');
        el.style.left = `${p.x}px`;
        el.style.top = `${p.y}px`;
        el.style.animationDelay = `${(-i * 1.7).toFixed(1)}s`;
        return el;
      }));
      terrainLayer.closest('.env')?.classList.add('env--mesh');
    }

    let pending = 0, lastW = 0, lastH = 0;
    const schedule = () => {
      if (pending) return;
      pending = requestAnimationFrame(() => {
        pending = 0;
        const { width, height } = terrainLayer.getBoundingClientRect();
        // Ignore the small height jitter of mobile browser toolbars.
        if (Math.abs(width - lastW) < 1 && Math.abs(height - lastH) < 60) return;
        lastW = width; lastH = height;
        draw();
      });
    };
    new ResizeObserver(schedule).observe(terrainLayer);
  }
}

/* ---------- Reticle: a soft gaze ring that follows the pointer ---------- */
const reticle = document.querySelector('.reticle');
if (reticle && finePointer && !reduceMotion) {
  let tx = -100, ty = -100, x = -100, y = -100, raf = 0;
  const step = () => {
    x += (tx - x) * 0.25;
    y += (ty - y) * 0.25;
    reticle.style.translate = `${x}px ${y}px`;
    raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.3 ? requestAnimationFrame(step) : 0;
  };
  addEventListener('pointermove', (e) => {
    tx = e.clientX; ty = e.clientY;
    reticle.classList.add('is-on');
    reticle.classList.toggle('is-hot', !!e.target.closest('a, button'));
    if (!raf) raf = requestAnimationFrame(step);
  }, { passive: true });
  document.addEventListener('pointerleave', () => reticle.classList.remove('is-on'));
  addEventListener('pointerdown', () => reticle.classList.add('is-pinch'));
  addEventListener('pointerup', () => reticle.classList.remove('is-pinch'));
} else {
  reticle?.remove();
}

/* ---------- Curved monitor: side-scrolling panes shaped like a curved screen ---------- */
const monitor = document.querySelector('.monitor');
if (monitor) initMonitor(monitor);

function initMonitor(monitor) {
  const screen = monitor.querySelector('.monitor__screen');
  const panes = [...monitor.querySelectorAll('.prompt')];
  const bar = monitor.querySelector('.monitor__progress span');
  const prevBtn = monitor.querySelector('[data-monitor="prev"]');
  const nextBtn = monitor.querySelector('[data-monitor="next"]');
  const SAMPLES = 16;
  let raf = 0;

  // Inset of the screen's top/bottom edge at horizontal position u (0..1 across
  // the visible screen): zero at the edges, deepest in the middle.
  const inset = (u, depth) => depth * (1 - (2 * u - 1) ** 2);

  function outline(rect, view, depth, extra) {
    const top = [], bottom = [];
    for (let j = 0; j <= SAMPLES; j++) {
      const f = j / SAMPLES;
      const u = Math.min(1, Math.max(0, (rect.left + f * rect.width - view.left) / view.width));
      const y = (inset(u, depth) + extra).toFixed(1);
      const x = (f * 100).toFixed(2);
      top.push(`${x}% ${y}px`);
      bottom.unshift(`${x}% calc(100% - ${y}px)`);
    }
    return `polygon(${top.join(',')},${bottom.join(',')})`;
  }

  function render() {
    raf = 0;
    const view = screen.getBoundingClientRect();
    const depth = Math.round(Math.min(48, Math.max(10, view.width * 0.04)));
    monitor.style.setProperty('--d', `${depth}px`);
    for (const pane of panes) {
      const r = pane.getBoundingClientRect();
      if (r.right < view.left - r.width || r.left > view.right + r.width) continue; // far off-screen
      pane.style.setProperty('--curve', outline(r, view, depth, 0));
      pane.style.setProperty('--curve-in', outline(r, view, depth, 1));
    }
    monitor.classList.add('is-curved');

    const max = screen.scrollWidth - screen.clientWidth;
    const shown = screen.clientWidth / screen.scrollWidth;
    bar.style.width = `${shown * 100}%`;
    bar.style.translate = `${max > 0 ? (screen.scrollLeft / max) * ((1 - shown) / shown) * 100 : 0}% 0`;
    prevBtn.disabled = screen.scrollLeft <= 1;
    nextBtn.disabled = screen.scrollLeft >= max - 1;
  }
  const schedule = () => { if (!raf) raf = requestAnimationFrame(render); };
  screen.addEventListener('scroll', schedule, { passive: true });
  new ResizeObserver(schedule).observe(screen);
  document.fonts?.ready.then(schedule);
  schedule();

  // One pane per click, landing on a snap point so no pane is left cut off.
  const step = () => panes[1].parentElement.offsetLeft - panes[0].parentElement.offsetLeft;
  const behavior = reduceMotion ? 'auto' : 'smooth';
  prevBtn.addEventListener('click', () => screen.scrollBy({ left: -step(), behavior }));
  nextBtn.addEventListener('click', () => screen.scrollBy({ left: step(), behavior }));

  // Mouse drag to scroll ("grab the screen"); touch and trackpads scroll natively.
  let drag = null;
  screen.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    drag = { x: e.clientX, left: screen.scrollLeft, moved: false, id: e.pointerId };
  });
  screen.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > 4) {
      drag.moved = true;
      screen.setPointerCapture(drag.id);
      screen.classList.add('is-dragging');
    }
    if (drag.moved) screen.scrollLeft = drag.left - dx;
  });
  const endDrag = () => {
    if (!drag) return;
    const moved = drag.moved;
    drag = null;
    if (!moved) return;
    screen.classList.remove('is-dragging');
    // Settle on the nearest whole pane.
    const s = step();
    screen.scrollTo({ left: Math.round(screen.scrollLeft / s) * s, behavior });
  };
  screen.addEventListener('pointerup', endDrag);
  screen.addEventListener('pointercancel', endDrag);
}

/* ---------- Reveal fallback (browsers without scroll-driven animations) ---------- */
if (!reduceMotion && !CSS.supports('animation-timeline: view()')) {
  root.classList.add('io');
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }
  }, { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.window, .zone__head, .zone--contact > *').forEach((el) => io.observe(el));
}

/* ---------- Analytics: Google Analytics 4, opt-in only ---------- */
// Paste the GA4 Measurement ID (looks like "G-XXXXXXXXXX") to turn analytics on.
// Empty = off: no prompt, no request to Google, no cookies.
const GA4_ID = '';
const CONSENT_KEY = 'ns-analytics';
if (GA4_ID) initAnalytics();

function initAnalytics() {
  let choice = null;
  try { choice = localStorage.getItem(CONSENT_KEY); } catch {}
  if (choice === 'granted') loadGA4();
  else if (choice !== 'denied') afterGate(showConsent);
  document.querySelectorAll('[data-analytics-reset]').forEach((btn) => {
    btn.hidden = false;
    btn.addEventListener('click', showConsent);
  });
}

function saveChoice(value) { try { localStorage.setItem(CONSENT_KEY, value); } catch {} }

function loadGA4() {
  if (window.gtag) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); }; // GA expects the Arguments object
  window.gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'granted' });
  window.gtag('js', new Date());
  window.gtag('config', GA4_ID, { allow_google_signals: false, allow_ad_personalization_signals: false });
  const url = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA4_ID)}`;
  // Trusted Types is enforced: this policy admits exactly one script URL.
  const policy = window.trustedTypes?.createPolicy('ns-ga', {
    createScriptURL: (u) => { if (u === url) return u; throw new TypeError('Script URL not allowed'); },
  });
  const script = document.createElement('script');
  script.async = true;
  script.src = policy ? policy.createScriptURL(url) : url;
  document.head.append(script);
}

function revokeGA4() {
  window.gtag?.('consent', 'update', { analytics_storage: 'denied' });
  // Remove GA's first-party cookies for this site.
  for (const c of document.cookie.split(';')) {
    const name = c.split('=')[0].trim();
    if (/^_ga/.test(name)) document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
  }
}

function showConsent() {
  if (document.querySelector('.consent')) return;
  const box = document.createElement('div');
  box.className = 'consent';
  box.setAttribute('role', 'region');
  box.setAttribute('aria-label', 'Analytics choice');
  const text = document.createElement('p');
  text.append('Help improve this site with anonymous analytics (Google Analytics)? ');
  const more = document.createElement('a');
  more.href = 'privacy.html#analytics';
  more.textContent = 'Details';
  text.append(more);
  const actions = document.createElement('div');
  actions.className = 'consent__actions';
  const choose = (value) => {
    saveChoice(value);
    if (value === 'granted') loadGA4(); else revokeGA4();
    box.remove();
  };
  for (const [label, value, cls] of [['Allow', 'granted', 'btn'], ['No thanks', 'denied', 'btn btn--ghost']]) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `${cls} consent__btn`;
    b.textContent = label;
    b.addEventListener('click', () => choose(value));
    actions.append(b);
  }
  box.append(text, actions);
  document.body.append(box);
}

// Run fn once the intro gate is gone (or straight away when there is none).
function afterGate(fn) {
  if (!root.classList.contains('gate-on')) return fn();
  const mo = new MutationObserver(() => {
    if (!root.classList.contains('gate-on')) { mo.disconnect(); fn(); }
  });
  mo.observe(root, { attributes: true, attributeFilter: ['class'] });
}

/* ---------- Intro gate backdrop: faint data columns at the screen edges ----------
   Drawn once on a 2D canvas (seeded, so it is the same every visit), away
   from the wordmark. */
function drawGateData(canvas) {
  const ctx = canvas?.getContext('2d');
  if (!ctx) return;
  const W = innerWidth, H = innerHeight;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  let seed = 7;
  const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  // Data columns: rows of digits fading out toward the middle and the edges.
  const cell = 12;
  ctx.font = `500 10px ${getComputedStyle(root).getPropertyValue('--font-mono') || 'monospace'}`;
  ctx.textBaseline = 'top';
  for (let x = 8; x < W; x += cell * 1.3) {
    const u = x / W;
    const edge = Math.max(0, 1 - Math.min(u, 1 - u) / 0.28); // 1 at the screen edges, 0 past 28%
    if (edge <= 0 || rand() < 0.45) continue;
    const top = rand() * H * 0.6, len = H * (0.15 + rand() * 0.35);
    for (let y = top; y < top + len && y < H; y += cell) {
      if (rand() < 0.25) continue;
      const fade = Math.sin(((y - top) / len) * Math.PI);
      ctx.fillStyle = `rgba(150, 175, 230, ${((0.05 + 0.13 * edge * fade) * (W < 640 ? 0.55 : 1)).toFixed(3)})`;
      ctx.fillText(String((rand() * 10) | 0), x, y);
    }
  }
}

/* ---------- Intro gate ---------- */
const gate = document.getElementById('gate');
if (gate && root.classList.contains('gate-on')) runGate(gate);
else gate?.remove();

function runGate(gate) {
  const enterBtn = gate.querySelector('[data-gate-enter]');
  const skipBtn = gate.querySelector('[data-gate-skip]');
  const canvas = gate.querySelector('.gate__canvas');
  const outside = [...document.body.children].filter((el) => el !== gate && el.tagName !== 'SCRIPT');
  outside.forEach((el) => { el.inert = true; });
  enterBtn.focus({ preventScroll: true });
  drawGateData(gate.querySelector('.gate__data'));

  let scene = null;
  let leaving = false;
  const lite = root.classList.contains('gate-lite');

  // Large screens: the words and the headset still paint instantly; the live 3D
  // headset loads on the first pointer movement (when head-tracking starts to
  // matter) and crossfades in once its shaders are compiled. Until then, and for
  // keyboard-only visitors, the still carries the intro. Phones and small tablets
  // keep the still and never download the 3D bundle.
  if (!lite) {
    const load = () => import('./gate-3d.js')
      .then(({ createGate }) => {
        if (leaving) return;
        scene = createGate(canvas);
        scene?.ready.then((ok) => { if (ok && !leaving) gate.classList.add('gate--3d'); });
      })
      .catch(() => {});
    const wake = () => {
      removeEventListener('pointermove', wake);
      removeEventListener('pointerdown', wake);
      load();
    };
    addEventListener('pointermove', wake, { passive: true });
    addEventListener('pointerdown', wake, { passive: true });
  }

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  function finish() {
    try { sessionStorage.setItem('ns-gate', '1'); } catch {}
    root.classList.add('gate-leaving'); // start the hero entrance as the gate fades
    outside.forEach((el) => { el.inert = false; });
    gate.classList.add('gate--done');
    setTimeout(() => {
      scene?.dispose();
      gate.remove();
      root.classList.remove('gate-on', 'gate-leaving');
      document.getElementById('hero-title')?.focus?.({ preventScroll: true });
    }, 520);
  }

  async function enter() {
    if (leaving) return;
    leaving = true;
    gate.classList.add('gate--exit');
    if (gate.classList.contains('gate--3d')) await scene.exit();
    else await wait(1000); // the still's own fly-through (CSS)
    gate.classList.add('gate--flash');
    await wait(260);
    finish();
  }

  function skip() {
    if (leaving) return;
    leaving = true;
    finish();
  }

  enterBtn.addEventListener('click', enter);
  skipBtn.addEventListener('click', skip);
  gate.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') skip();
    if (e.key === 'Tab') { // keep focus inside the dialog
      e.preventDefault();
      (document.activeElement === enterBtn ? skipBtn : enterBtn).focus();
    }
  });
}
