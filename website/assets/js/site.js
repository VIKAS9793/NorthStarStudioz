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
