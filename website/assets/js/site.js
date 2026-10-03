// NorthStar Studioz — site behaviour (header, menu, reveals, intro gate).

const root = document.documentElement;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Header state ---------- */
const header = document.querySelector('.site-header');
if (header) {
  const sentinel = document.createElement('div');
  sentinel.style.cssText = 'position:absolute;top:0;height:1px;width:1px;';
  document.body.prepend(sentinel);
  new IntersectionObserver(([e]) => header.classList.toggle('is-scrolled', !e.isIntersecting)).observe(sentinel);
}

/* ---------- Mobile menu ---------- */
const toggle = document.querySelector('.nav__toggle');
const list = document.getElementById('nav-list');
if (toggle && list) {
  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    list.classList.toggle('is-open', open);
  };
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  list.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
}

/* ---------- Active section in nav ---------- */
const navLinks = [...document.querySelectorAll('.nav__list a[href^="#"]')];
const sections = navLinks.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
if (sections.length) {
  const spy = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      navLinks.forEach((a) => {
        if (a.getAttribute('href') === `#${e.target.id}`) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    }
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach((s) => spy.observe(s));
}

/* ---------- Reveal fallback (no scroll-driven animations) ---------- */
if (!reduceMotion && !CSS.supports('animation-timeline: view()')) {
  root.classList.add('io');
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }
  }, { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
}

/* ---------- Intro gate ---------- */
const gate = document.getElementById('gate');
if (gate && root.classList.contains('gate-on')) runGate(gate);
else gate?.remove();

function runGate(gate) {
  const main = document.getElementById('main');
  const enterBtn = gate.querySelector('[data-gate-enter]');
  const skipBtn = gate.querySelector('[data-gate-skip]');
  const canvas = gate.querySelector('.gate__canvas');
  const outside = [main, header, document.querySelector('.site-footer')].filter(Boolean);
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
    outside.forEach((el) => { el.inert = false; });
    gate.classList.add('gate--done');
    setTimeout(() => {
      scene?.dispose();
      gate.remove();
      root.classList.remove('gate-on');
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
