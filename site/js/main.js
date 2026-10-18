// Builds the portfolio from content.js (the words) and media.json (the photos and videos),
// then wires up the motion: the dot field in the hero, scroll reveals, the "View" cursor and the viewer.
import { PROFILE, STATS, SHOOTS, IN_EDIT, AVAILABLE_FOR, FEATURE, CAPTIONS } from './content.js';
import { initBook } from './book.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const el = (tag, attrs = {}, ...kids) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'style') node.style.cssText = v;
    else if (k in node && typeof v !== 'string') node[k] = v;
    else node.setAttribute(k, v === true ? '' : v);
  }
  node.append(...kids.flat().filter(k => k != null));
  return node;
};
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const touch = matchMedia('(hover: none)').matches;

async function loadMedia() {
  try {
    const res = await fetch('media.json', { cache: 'no-cache' });   // always check for a newer list (cheap: the server answers "unchanged")
    const list = await res.json();
    return new Map(list.map(m => [m.id, m]));
  } catch {
    return new Map();
  }
}

/* ---------- Pieces ---------- */

function videoEl(m, { autoplay = false } = {}) {
  const v = el('video', { muted: true, loop: true, playsinline: true, preload: autoplay ? 'auto' : 'metadata', poster: m.poster, 'aria-hidden': 'true' });
  v.muted = true;   // has to be set as a property too, or some browsers refuse to autoplay
  v.append(el('source', { src: m.src, type: 'video/mp4' }));
  if (autoplay && !calm) v.autoplay = true;
  return v;
}

function photoEl(m, { small = true, alt = '' } = {}) {
  return el('picture', {},
    el('source', { srcset: small ? (m.small || m.src) : m.src, type: 'image/webp' }),
    el('img', { src: m.fallback, alt, loading: small ? 'lazy' : 'eager', decoding: 'async', width: m.w, height: m.h }));
}

// width / height, so the layout can give every piece its own shape
const ratio = m => (m.w && m.h ? (m.w / m.h).toFixed(4) : (m.type === 'video' ? .5625 : .75));

// "*word*" -> the italic serif accent
function accent(text) {
  return text.split(/\*([^*]+)\*/).map((part, i) => (i % 2 ? el('span', { class: 'serif' }, part) : part));
}

function tile(m, index, label) {
  const isVideo = m.type === 'video';
  const t = el('button', { type: 'button', class: `tile ${isVideo ? 'video' : 'photo'}`, 'data-index': index, style: `--r:${ratio(m)}`,
    'aria-label': isVideo ? `Play ${label}` : `View ${label} full size` },
    isVideo ? videoEl(m) : photoEl(m, { alt: label }),
    isVideo ? el('span', { class: 'tile-label' }, el('span', { class: 'rec' }), 'Motion') : null);
  return t;
}

/* ---------- Build the page ---------- */

function fillText() {
  $$('[data-first]').forEach(n => (n.textContent = PROFILE.first));
  $$('[data-last]').forEach(n => (n.textContent = PROFILE.last));
  $$('[data-base]').forEach(n => (n.textContent = PROFILE.base));
  $$('[data-handle]').forEach(n => (n.textContent = '@' + PROFILE.handle));
  $$('[data-name]').forEach(n => (n.textContent = PROFILE.name));
  $$('[data-year]').forEach(n => (n.textContent = new Date().getFullYear()));
  $$('[data-instagram]').forEach(a => (a.href = PROFILE.instagram));
  $$('[data-available-line]').forEach(n => (n.textContent = PROFILE.available));
  $$('[data-tagline]').forEach(n => n.replaceChildren(...accent(PROFILE.tagline)));
  const mail = $('[data-email]');
  if (PROFILE.email) { mail.href = `mailto:${PROFILE.email}`; mail.hidden = false; }
}

function buildHero(media) {
  const reelMedia = media.get(PROFILE.heroClip) || [...media.values()].find(m => m.type === 'video');
  const fig = $('[data-hero-reel]');
  if (!reelMedia) { fig.remove(); return; }
  fig.style.aspectRatio = `${reelMedia.w} / ${reelMedia.h}`;
  const v = videoEl(reelMedia, { autoplay: true });
  fig.prepend(v);
  if (!calm) v.play().catch(() => {});
}

// The featured photos, each shown whole at full width (no crop, so the whole picture is what people see)
function buildFeature(media) {
  const band = $('[data-feature]');
  const pieces = FEATURE.map(id => media.get(id)).filter(Boolean);
  if (!pieces.length) { band.remove(); return; }
  band.append(...pieces.map(m => el('figure', { class: 'feature-shot reveal' },
    photoEl(m, { small: false, alt: CAPTIONS[m.id] || 'New work' }),
    el('figcaption', {}, el('span', { class: 'eyebrow' }, 'New work'), el('span', { class: 'eyebrow' }, CAPTIONS[m.id] || '')))));
}

function buildStrip(media) {
  const track = $('[data-strip]');
  const items = [...media.values()];
  const words = [
    el('span', { class: 'strip-word' }, PROFILE.first),
    el('span', { class: 'strip-word' }, el('span', { class: 'serif' }, 'portfolio')),
    el('span', { class: 'strip-word' }, '@' + PROFILE.handle),
  ];
  const once = [];
  items.forEach((m, i) => {
    once.push(el('div', { class: 'strip-item', style: `--r:${ratio(m)}` }, el('img', { src: m.type === 'video' ? m.poster : (m.small || m.src), alt: '', loading: 'lazy' })));
    if (i % 2 === 1) once.push(words[(i >> 1) % words.length].cloneNode(true));
  });
  // Two copies side by side, so sliding left by half the width loops without a seam
  track.append(...once, ...once.map(n => n.cloneNode(true)));
}

const viewerList = [];   // every piece in page order, for the full-screen viewer

function buildShoots(media) {
  const wrap = $('[data-shoots]');
  let pieces = 0;
  for (const shoot of SHOOTS) {
    const ms = shoot.media.map(id => media.get(id)).filter(Boolean);
    if (!ms.length) continue;
    pieces += ms.length;
    const grid = el('div', { class: 'grid' });
    ms.forEach((m, i) => {
      const index = viewerList.push(m) - 1;
      grid.append(tile(m, index, `${shoot.title}, ${i + 1} of ${ms.length}`));
    });
    const [lead, ...rest] = shoot.title.split(' ');
    wrap.append(el('article', { class: 'shoot reveal', style: `--shoot-color:${shoot.color || 'var(--orange)'}` },
      el('header', { class: 'shoot-meta' },
        el('h3', { class: 'shoot-title' }, rest.length ? [lead + ' ', el('span', { class: 'serif' }, rest.join(' '))] : el('span', { class: 'serif' }, lead)),
        el('p', { class: 'eyebrow' }, `${shoot.year} · ${ms.filter(m => m.type === 'photo').length} photos · ${ms.filter(m => m.type === 'video').length} clips`),
        el('p', { class: 'shoot-note' }, shoot.note),
        el('ul', { class: 'tags' }, shoot.tags.map(t => el('li', {}, t)))),
      grid));
  }
  $('[data-work-count]').textContent = `${SHOOTS.length} shoot${SHOOTS.length === 1 ? '' : 's'} live, ${IN_EDIT.length} more in the edit.`;

  const edit = $('[data-in-edit]');
  IN_EDIT.forEach(s => edit.append(el('div', { class: 'developing reveal' },
    el('p', { class: 'eyebrow' }, 'Developing'),
    el('h3', {}, s.title),
    el('p', { class: 'eyebrow' }, s.note))));
  return pieces;
}

function buildReels(media) {
  const wrap = $('[data-reels]');
  const clips = viewerList.map((m, i) => [m, i]).filter(([m]) => m.type === 'video');
  clips.forEach(([m, index], n) => wrap.append(el('figure', { class: 'reel reveal', style: `--r:${ratio(m)}` },
    tile(m, index, `clip ${n + 1}`),
    el('figcaption', {}, el('span', { class: 'eyebrow' }, `Clip ${String(n + 1).padStart(2, '0')}`), el('span', { class: 'eyebrow' }, SHOOTS[0]?.title || '')))));
  if (!clips.length) $('#motion').remove();
}

function buildAbout(media) {
  const bio = $('[data-bio]');
  PROFILE.bio.forEach(p => bio.append(el('p', {}, accent(p))));

  const all = [...media.values()];
  const counters = [
    ['Looks', all.filter(m => m.type === 'photo').length],
    ['Clips', all.filter(m => m.type === 'video').length],
    ['In the edit', IN_EDIT.length],
  ];
  $('[data-counters]').append(...counters.map(([label, n]) => el('div', {}, el('dd', { 'data-count': n }, '0'), el('dt', {}, label))));

  const stats = STATS.filter(([, v]) => v);
  const dl = $('[data-stats]');
  if (stats.length) dl.append(...stats.map(([k, v]) => el('div', {}, el('dt', {}, k), el('dd', {}, v))));
  else dl.remove();

  $('[data-available]').append(...AVAILABLE_FOR.map(t => el('li', {}, t)));
}

/* ---------- Motion ---------- */

function clocks() {
  const short = new Intl.DateTimeFormat('en-US', { timeZone: PROFILE.timeZone, hour: 'numeric', minute: '2-digit' });
  const long = new Intl.DateTimeFormat('en-US', { timeZone: PROFILE.timeZone, hour: 'numeric', minute: '2-digit', second: '2-digit', timeZoneName: 'short' });
  const tick = () => {
    const now = new Date();
    $$('[data-clock]').forEach(n => (n.textContent = `DC ${short.format(now)}`));
    $$('[data-clock-long]').forEach(n => (n.textContent = `Local time ${long.format(now)}`));
  };
  tick();
  setInterval(tick, 1000);
}

function reveals() {
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    $$('[data-count]', e.target).forEach(countUp);
    io.unobserve(e.target);
  }), { rootMargin: '0px 0px -8% 0px' });
  $$('.reveal').forEach(n => io.observe(n));
}

function countUp(node) {
  const target = Number(node.dataset.count);
  if (calm) { node.textContent = target; return; }
  const start = performance.now();
  const step = t => {
    const p = Math.min(1, (t - start) / 1200);
    node.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// Videos in the grid play while hovered (mouse) or while on screen (phones); paused otherwise to save battery
function videoPlayback() {
  const vids = $$('.tile video');
  if (touch) {
    const io = new IntersectionObserver(es => es.forEach(e => (e.isIntersecting && !calm ? e.target.play().catch(() => {}) : e.target.pause())), { threshold: .5 });
    vids.forEach(v => io.observe(v));
  } else {
    vids.forEach(v => {
      const t = v.closest('.tile');
      t.addEventListener('pointerenter', () => v.play().catch(() => {}));
      t.addEventListener('pointerleave', () => v.pause());
    });
    // The motion section's clips play whenever they're on screen, hover or not
    const io = new IntersectionObserver(es => es.forEach(e => (e.isIntersecting && !calm ? e.target.play().catch(() => {}) : e.target.pause())), { threshold: .4 });
    $$('.reel video').forEach(v => io.observe(v));
  }
}

function viewCursor() {
  if (touch) return;
  const c = $('.cursor');
  const label = $('span', c);
  addEventListener('pointermove', e => {
    c.style.setProperty('--x', e.clientX + 'px');
    c.style.setProperty('--y', e.clientY + 'px');
    const t = e.target.closest?.('.tile');
    c.classList.toggle('on', !!t);
    c.classList.toggle('play', !!t && t.classList.contains('video'));
    if (t) label.textContent = t.classList.contains('video') ? 'Play' : 'View';
  }, { passive: true });
  document.addEventListener('pointerleave', () => c.classList.remove('on'));
}

function activeNav() {
  const chips = $$('.top-nav .chip');
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    chips.forEach(c => c.classList.toggle('on', c.getAttribute('href') === '#' + e.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  // 'top' (the hero) matches no chip, so scrolling back up clears the highlight
  ['top', 'book', 'work', 'motion', 'about', 'contact'].forEach(id => { const s = document.getElementById(id); if (s) io.observe(s); });
}

/* ---------- Full-screen viewer ---------- */

function viewer() {
  const box = $('[data-lightbox]');
  const stage = $('[data-lb-stage]');
  const count = $('[data-lb-count]');
  let at = 0, lastFocus = null;

  const show = i => {
    at = (i + viewerList.length) % viewerList.length;
    const m = viewerList[at];
    stage.replaceChildren(m.type === 'video'
      ? Object.assign(videoEl(m, { autoplay: true }), { controls: true })
      : photoEl(m, { small: false, alt: `Photo ${at + 1} of ${viewerList.length}` }));
    const v = $('video', stage);
    if (v) { v.removeAttribute('aria-hidden'); v.play().catch(() => {}); }
    count.textContent = `${String(at + 1).padStart(2, '0')} / ${String(viewerList.length).padStart(2, '0')}`;
  };
  const open = i => { lastFocus = document.activeElement; box.hidden = false; document.body.style.overflow = 'hidden'; show(i); $('[data-lb-close]').focus(); };
  const close = () => { box.hidden = true; stage.replaceChildren(); document.body.style.overflow = ''; lastFocus?.focus(); };

  document.addEventListener('click', e => {
    const t = e.target.closest('.tile');
    if (t) open(Number(t.dataset.index));
  });
  $('[data-lb-close]').addEventListener('click', close);
  $('[data-lb-prev]').addEventListener('click', () => show(at - 1));
  $('[data-lb-next]').addEventListener('click', () => show(at + 1));
  box.addEventListener('click', e => { if (e.target === box || e.target === stage) close(); });
  document.addEventListener('keydown', e => {
    if (box.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(at - 1);
    if (e.key === 'ArrowRight') show(at + 1);
    if (e.key === 'Tab') {   // keep keyboard focus inside the viewer
      const f = $$('button', box);
      const i = f.indexOf(document.activeElement);
      e.preventDefault();
      f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  });
  let x0 = null;   // swipe left/right on phones
  box.addEventListener('touchstart', e => (x0 = e.touches[0].clientX), { passive: true });
  box.addEventListener('touchend', e => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) show(at + (dx < 0 ? 1 : -1));
    x0 = null;
  });
}

/* ---------- Hero dot field: a halftone grid that swells into color around the pointer ---------- */

function dotField() {
  const canvas = $('.dots');
  const ctx = canvas.getContext('2d');
  const hero = $('.hero');
  const GAP = 22;
  let w = 0, h = 0, dpr = 1, running = true, px = -9999, py = -9999, tx = -9999, ty = -9999;

  const size = () => {
    dpr = Math.min(2, devicePixelRatio || 1);
    w = hero.clientWidth; h = hero.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const draw = time => {
    ctx.clearRect(0, 0, w, h);
    px += (tx - px) * .12; py += (ty - py) * .12;
    const t = time / 1000;
    for (let y = GAP / 2; y < h; y += GAP) {
      for (let x = GAP / 2; x < w; x += GAP) {
        const wave = Math.sin(x * .012 + t * .7) * Math.cos(y * .016 - t * .5);     // slow drifting swell
        const d = Math.hypot(x - px, y - py);
        const near = Math.max(0, 1 - d / 180);
        const r = .7 + (wave + 1) * .55 + near * 4.2;
        if (near > .02) ctx.fillStyle = near > .45 ? `rgba(255,91,31,${.35 + near * .6})` : `rgba(56,211,200,${.18 + near})`;
        else ctx.fillStyle = `rgba(245,241,232,${.07 + (wave + 1) * .05})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (running && !calm) requestAnimationFrame(draw);
  };

  size();
  addEventListener('resize', size);
  hero.addEventListener('pointermove', e => { const b = hero.getBoundingClientRect(); tx = e.clientX - b.left; ty = e.clientY - b.top; });
  hero.addEventListener('pointerleave', () => { tx = ty = -9999; });
  new IntersectionObserver(([e]) => {
    const was = running;
    running = e.isIntersecting;
    if (running && !was && !calm) requestAnimationFrame(draw);
  }).observe(hero);
  requestAnimationFrame(draw);
}

/* ---------- Start ---------- */

(async () => {
  fillText();
  clocks();
  const media = await loadMedia();
  buildHero(media);
  buildFeature(media);
  buildStrip(media);
  initBook(media);
  buildShoots(media);
  buildReels(media);
  buildAbout(media);
  reveals();
  videoPlayback();
  viewCursor();
  activeNav();
  viewer();
  dotField();
  requestAnimationFrame(() => document.body.classList.add('is-ready'));
})();
