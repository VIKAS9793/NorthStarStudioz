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

  let scene = null;
  let leaving = false;

  import('./gate-3d.js')
    .then(({ createGate }) => {
      if (leaving) return;
      scene = createGate(canvas);
      if (!scene) gate.classList.add('gate--no3d');
    })
    .catch(() => gate.classList.add('gate--no3d'));

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
    if (scene) await scene.exit();
    else await wait(1000);
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
