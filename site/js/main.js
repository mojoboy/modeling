// Builds the portfolio from content.js (the words) and media.json (the photos and videos),
// then wires up the motion: scroll reveals, the "View" cursor and the viewer.
import { PROFILE, STATS, SHOOTS, IN_EDIT, AVAILABLE_FOR, CAPTIONS } from './content.js';
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
  const photo = media.get(PROFILE.heroPhoto);
  const fig = $('[data-hero-photo]');
  if (!photo) { fig.remove(); return; }
  fig.append(photoEl(photo, { small: false, alt: `${PROFILE.name}, latest shoot` }));
  $('[data-hero-caption]').textContent = CAPTIONS[photo.id] || '';
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
    wrap.append(el('article', { class: 'shoot reveal', style: `--shoot-color:${shoot.color || 'var(--accent)'}` },
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

/* ---------- Start ---------- */

(async () => {
  fillText();
  clocks();
  const media = await loadMedia();
  buildHero(media);
  initBook(media);
  buildShoots(media);
  buildReels(media);
  buildAbout(media);
  reveals();
  videoPlayback();
  viewCursor();
  activeNav();
  viewer();
  requestAnimationFrame(() => document.body.classList.add('is-ready'));
})();
