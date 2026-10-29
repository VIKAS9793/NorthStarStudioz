// NorthStar Studioz — pieces that land on the table.
//
// Short accent phrases in the headlines are made of letters that arrive like small wooden pieces set
// down on a table: they drop, touch down with a little squash, bounce once and settle, left to right.
// The words themselves stay ordinary text (each letter is a span holding its own character), the
// heading carries one label with the full sentence, and every turn is a Web Animation that runs on
// the compositor. Loaded on idle, after the page, and never in Quiet mode or with reduced motion.

const STAGGER = 30;   // ms between neighbouring letters
const DURATION = 560; // ms for one letter

/** The heading's full sentence, with line breaks read as spaces, so assistive technology reads it whole. */
function sentence(heading) {
  let out = '';
  const walk = (node) => {
    for (const child of node.childNodes) {
      if (child.nodeType === 3) out += child.nodeValue;
      else if (child.nodeName === 'BR') out += ' ';
      else walk(child);
    }
  };
  walk(heading);
  return out.replace(/\s+/g, ' ').trim();
}

/** Replaces the phrase's text with word groups of letter spans. Spaces stay plain text so lines still break between words. */
function split(el) {
  const heading = el.closest('h1, h2');
  if (heading && !heading.hasAttribute('aria-label')) heading.setAttribute('aria-label', sentence(heading));
  const text = el.textContent;
  el.textContent = '';
  let index = 0;
  for (const part of text.split(/(\s+)/)) {
    if (!part) continue;
    if (/^\s+$/.test(part)) { el.append(part); continue; }
    const word = document.createElement('span');
    word.className = 'land__word';
    for (const ch of part) {
      const piece = document.createElement('span');
      piece.className = 'land__ch';
      piece.textContent = ch;
      word.append(piece);
      index += 1;
    }
    el.append(word);
  }
  return [...el.querySelectorAll('.land__ch')];
}

/**
 * Tells every letter where it sits in its heading, so a gradient painted through the heading's text can be
 * continued letter by letter (see .hero__title .land__ch). Layout offsets are used, not on-screen rectangles,
 * so a letter that is mid-hop is measured where it rests.
 */
function align(heading) {
  heading.style.setProperty('--title-h', `${heading.offsetHeight}px`);
  for (const ch of heading.querySelectorAll('.land__ch')) {
    // When the heading is the letter's offset parent (a filter makes it one) offsetTop is already relative to it.
    const top = ch.offsetParent === heading ? ch.offsetTop : ch.offsetTop - heading.offsetTop;
    ch.style.setProperty('--top', `${top}px`);
  }
}

/** A fixed, scattered tilt for each piece, so every load lands the same way. */
const tiltFor = (i) => ((i * 53) % 17 - 8) * 1.4;

/**
 * Plays the landing for a list of letters. `drop` pieces fall in from above (for phrases that were held
 * out of sight); otherwise each piece hops up from where it already rests and sets itself down again,
 * so a phrase that is already on screen never flashes away first.
 */
function play(pieces, { drop, onDone }) {
  const animations = pieces.map((piece, i) => {
    const tilt = tiltFor(i);
    const rest = 'translateY(0) rotate(0deg) scale(1, 1)';
    const frames = drop
      ? [
          { offset: 0, opacity: 0, transform: `translateY(-0.2em) rotate(${tilt * 0.5}deg)`, easing: 'cubic-bezier(0.5, 0, 0.9, 0.5)' },
          { offset: 0.35, opacity: 1, easing: 'linear' },
          { offset: 0.52, opacity: 1, transform: `translateY(0) rotate(${tilt * 0.18}deg)`, easing: 'ease-out' },
          { offset: 0.6, opacity: 1, transform: 'translateY(0) rotate(0deg) scale(1.07, 0.88)', easing: 'ease-out' },
          { offset: 0.78, opacity: 1, transform: `translateY(-0.025em) rotate(${-tilt * 0.06}deg) scale(1, 1)`, easing: 'cubic-bezier(0.5, 0, 0.9, 0.5)' },
          { offset: 0.92, opacity: 1, transform: 'translateY(0) rotate(0deg) scale(1.03, 0.96)', easing: 'ease-out' },
          { offset: 1, opacity: 1, transform: rest },
        ]
      : [
          { offset: 0, opacity: 1, transform: rest, easing: 'ease-out' },
          { offset: 0.3, opacity: 1, transform: `translateY(-0.1em) rotate(${tilt * 0.4}deg)`, easing: 'cubic-bezier(0.5, 0, 0.9, 0.5)' },
          { offset: 0.6, opacity: 1, transform: `translateY(0) rotate(${tilt * 0.12}deg)`, easing: 'ease-out' },
          { offset: 0.68, opacity: 1, transform: 'translateY(0) rotate(0deg) scale(1.07, 0.88)', easing: 'ease-out' },
          { offset: 0.84, opacity: 1, transform: `translateY(-0.02em) scale(1, 1)`, easing: 'cubic-bezier(0.5, 0, 0.9, 0.5)' },
          { offset: 1, opacity: 1, transform: rest },
        ];
    // A dropping letter keeps its landed state when it ends, so it stays visible while the rest of the phrase
    // is still falling; the waiting style is only lifted once the last letter is down.
    return piece.animate(frames, { duration: DURATION, delay: i * STAGGER, fill: drop ? 'both' : 'backwards' });
  });
  const last = animations[animations.length - 1];
  const finish = () => {
    onDone();
    // The held style is gone, so the held animations can go too: the letters rest as plain text again.
    if (drop) for (const animation of animations) animation.cancel();
  };
  if (last) last.finished.then(finish, finish);
  else finish();
}

const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 200));
const inView = (el) => {
  const r = el.getBoundingClientRect();
  return r.bottom > 0 && r.top < innerHeight * 0.92;
};

/**
 * Splits every [data-land] phrase. A phrase already on screen (the hero, once the intro has gone) hops
 * and settles; one further down is held out of sight, then dropped in the first time it is mostly in view.
 * `afterGate` runs a function once the intro overlay has left; `calm` says whether motion should stay off.
 */
export function initLand(afterGate, calm) {
  const phrases = [...document.querySelectorAll('[data-land]')];
  const watcher = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      watcher.unobserve(entry.target);
      const el = entry.target;
      if (calm()) { el.removeAttribute('data-land-state'); continue; }
      play([...el.querySelectorAll('.land__ch')], { drop: true, onDone: () => el.removeAttribute('data-land-state') });
    }
  }, { threshold: 0.6 });

  for (const el of phrases) {
    split(el);
    const heading = el.closest('h1, h2');
    if (heading) {
      align(heading);
      // A new line break (a narrower window, a rotated phone) moves the letters: measure again once things settle.
      let settle;
      new ResizeObserver(() => {
        clearTimeout(settle);
        settle = setTimeout(() => align(heading), 150);
      }).observe(heading);
    }
    if (el.closest('.hero')) {
      afterGate(() => {
        if (calm()) return;
        play([...el.querySelectorAll('.land__ch')], { drop: false, onDone() {} });
      });
    } else if (!inView(el) && el.getBoundingClientRect().top > 0) {
      el.setAttribute('data-land-state', 'held');
      watcher.observe(el);
    }
  }
}

export { idle };
