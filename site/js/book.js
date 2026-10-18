// The book: a flip-through portfolio. On wide screens it opens as two-page spreads, each sheet turning on the
// spine; on phones it shows one page at a time and each page turns away to the left.
// Turn pages by clicking/tapping a page, swiping, the arrow keys, the buttons, or the thumbnail strip
// (which riffles through the pages in between instead of jumping).
import { PROFILE, STATS, SHOOTS, BOOK, CAPTIONS, AVAILABLE_FOR } from './content.js';

const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const TURN_MS = calm ? 0 : 900;      // keep in step with --turn in book.css
const RIFFLE_MS = calm ? 0 : 140;    // gap between pages when jumping several at once

const el = (tag, cls, ...kids) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  n.append(...kids.flat().filter(k => k != null));
  return n;
};
const two = n => String(n).padStart(2, '0');

export function caption(id) {
  return CAPTIONS[id] || SHOOTS.find(s => s.media.includes(id))?.title || '';
}

/* ---------- Pages ---------- */

function pageList(media) {
  const pieces = BOOK.map(id => media.get(id)).filter(Boolean);
  // n = the printed page number (the cover is page 0), shared by the page footers, the contents and the counter
  const pages = [{ kind: 'cover' }, { kind: 'intro', pieces }];
  pieces.forEach(m => pages.push({ kind: 'media', m, n: pages.length }));
  pages.push({ kind: 'card' });
  if (pages.length % 2 === 0) pages.push({ kind: 'notes' });   // so the back cover lands on the back of the last sheet
  pages.push({ kind: 'back' });
  return pages;
}

function frameFor(m, eager) {
  if (m.type === 'video') {
    const v = document.createElement('video');
    Object.assign(v, { muted: true, loop: true, playsInline: true, preload: 'metadata', poster: m.poster });
    v.setAttribute('playsinline', '');
    v.setAttribute('aria-label', `${caption(m.id) || 'Motion'} (video)`);
    v.append(Object.assign(document.createElement('source'), { src: m.src, type: 'video/mp4' }));
    return v;
  }
  const pic = document.createElement('picture');
  pic.append(Object.assign(document.createElement('source'), { srcset: m.small || m.src, type: 'image/webp' }),
    Object.assign(document.createElement('img'), { src: m.fallback, alt: caption(m.id) || 'Portfolio photo', loading: eager ? 'eager' : 'lazy', decoding: 'async' }));
  return pic;
}

function renderPage(p, index) {
  const page = el('div', `page page-${p.kind}`);
  if (p.kind === 'cover') {
    page.append(
      el('span', 'pg-ribbon'),
      el('p', 'pg-eyebrow', `Book · ${new Date().getFullYear()}`),
      el('h3', 'pg-cover-name', el('span', '', PROFILE.first), el('span', 'accent', PROFILE.last)),
      el('div', 'pg-cover-foot', el('p', 'pg-eyebrow', `${PROFILE.role} · @${PROFILE.handle}`), el('span', 'pg-hint', 'Open', el('i', '', '→'))));
  } else if (p.kind === 'intro') {
    page.append(
      el('p', 'pg-eyebrow', 'Inside'),
      el('h3', 'pg-title', PROFILE.name),
      el('p', 'pg-copy', PROFILE.bio[0].replace(/\*/g, '')),
      el('ol', 'pg-index', p.pieces.map((m, i) => el('li', '',
        el('span', 'num', two(i + 2)),
        el('span', 'cap', caption(m.id) || 'Untitled'),
        m.type === 'video' ? el('span', 'tag', 'Motion') : null))));
  } else if (p.kind === 'media') {
    const { m } = p;
    page.append(
      el('div', 'pg-frame', frameFor(m, index < 6), m.type === 'video' ? el('span', 'pg-live', el('i', ''), 'Motion') : null),
      el('div', 'pg-foot', el('span', 'num', two(p.n)), el('span', 'cap', caption(m.id)), el('span', 'who', PROFILE.name)));
  } else if (p.kind === 'card') {
    const stats = STATS.filter(([, v]) => v);
    page.append(
      el('p', 'pg-eyebrow', 'Comp card'),
      el('h3', 'pg-title', PROFILE.name),
      el('dl', 'pg-stats', stats.map(([k, v]) => el('div', '', el('dt', '', k), el('dd', '', v))),
        el('div', '', el('dt', '', 'Based'), el('dd', '', PROFILE.base))),
      el('p', 'pg-copy', PROFILE.available),
      el('ul', 'pg-tags', AVAILABLE_FOR.map(t => el('li', '', t))),
      el('div', 'pg-contact',
        PROFILE.email ? Object.assign(el('a', '', PROFILE.email), { href: `mailto:${PROFILE.email}` }) : null,
        Object.assign(el('a', '', `@${PROFILE.handle} ↗`), { href: PROFILE.instagram, target: '_blank', rel: 'noopener' })));
  } else if (p.kind === 'notes') {
    page.append(el('p', 'pg-eyebrow', 'Notes'), el('p', 'pg-copy pg-muted', 'More pages are in the edit.'));
  } else if (p.kind === 'back') {
    page.append(el('span', 'pg-dot'),
      el('p', 'pg-eyebrow', PROFILE.name),
      el('p', 'pg-eyebrow pg-muted', `@${PROFILE.handle}`));
  }
  return page;
}

// A tiny version of a page for the thumbnail strip
function miniPage(p) {
  const mini = el('span', `mini mini-${p ? p.kind : 'none'}`);
  if (p?.kind === 'media') {
    mini.append(Object.assign(document.createElement('img'), { src: p.m.type === 'video' ? p.m.poster : (p.m.small || p.m.src), alt: '', loading: 'lazy' }));
  }
  return mini;
}

/* ---------- The book ---------- */

export function initBook(media) {
  const section = document.getElementById('book');
  const stage = section.querySelector('[data-book-stage]');
  const book = section.querySelector('[data-book]');
  const count = section.querySelector('[data-book-count]');
  const prevBtn = section.querySelector('[data-book-prev]');
  const nextBtn = section.querySelector('[data-book-next]');
  const fullBtn = section.querySelector('[data-book-full]');
  const rail = section.querySelector('[data-book-rail]');
  const bar = section.querySelector('[data-book-progress]');
  const pages = pageList(media);
  if (pages.length <= 4) { section.remove(); return; }

  let mode = '', sheets = [], at = 0, inView = false, zSeq = 0, riffle = null;
  const turning = new Map();   // sheet index -> { z, timer } while it is mid-turn

  const isSpread = () => stage.clientWidth >= 720;
  const lastPos = () => (mode === 'spread' ? sheets.length : sheets.length - 1);

  function size() {
    const full = section.classList.contains('book-full');
    const spread = isSpread();
    const availW = stage.clientWidth - (spread ? 48 : 24);
    const availH = full ? innerHeight - 190 : Math.min(innerHeight - 220, 720);
    const ratio = 0.7;   // page width / height
    let ph = Math.max(380, availH), pw = ph * ratio;
    const across = spread ? 2 : 1;
    if (pw * across > availW) { pw = availW / across; ph = pw / ratio; }
    book.style.setProperty('--pw', `${Math.floor(pw)}px`);
    book.style.setProperty('--ph', `${Math.floor(ph)}px`);
  }

  function build() {
    const spread = isSpread();
    const keep = mode ? currentPage() : 0;
    turning.forEach(t => clearTimeout(t.timer));
    turning.clear();
    mode = spread ? 'spread' : 'single';
    book.dataset.mode = mode;
    book.replaceChildren(el('span', 'edge edge-l'), el('span', 'edge edge-r'));   // page edges stacked on each side
    sheets = [];
    if (spread) {
      for (let i = 0; i < pages.length; i += 2) {
        sheets.push(el('div', 'sheet',
          el('div', 'face front', renderPage(pages[i], i), el('span', 'shade')),
          el('div', 'face back', pages[i + 1] ? renderPage(pages[i + 1], i + 1) : null, el('span', 'shade'))));
      }
      at = Math.min(sheets.length, Math.ceil(keep / 2));
    } else {
      pages.forEach((p, i) => sheets.push(el('div', 'sheet', el('div', 'face front', renderPage(p, i), el('span', 'shade')))));
      at = Math.min(sheets.length - 1, keep);
    }
    sheets.forEach((s, i) => {
      s.addEventListener('click', e => {
        if (e.target.closest('a')) return;
        if (mode === 'spread') (i >= at ? next : prev)();
        else (e.clientX - s.getBoundingClientRect().left > s.clientWidth * .3 ? next : prev)();
      });
      if (finePointer) {   // lift the corner of the page under the pointer, as a hint it can be turned
        s.addEventListener('pointerenter', () => s.classList.add('peek'));
        s.addEventListener('pointerleave', () => s.classList.remove('peek'));
      }
      book.append(s);
    });
    buildRail();
    size();
    paint(false);
  }

  // which page the reader is on, so switching between spread and single view keeps their place
  function currentPage() { return mode === 'spread' ? Math.max(0, at * 2 - 1) : at; }

  function applyZ() {
    const S = sheets.length;
    sheets.forEach((s, i) => {
      const t = turning.get(i);
      s.style.zIndex = t ? 200 + t.z : i < at ? i + 1 : S - i;
    });
  }

  function startTurn(i, dir) {
    const s = sheets[i];
    const old = turning.get(i);
    if (old) clearTimeout(old.timer);
    s.classList.remove('turn-fwd', 'turn-back');
    void s.offsetWidth;   // restart the shading animation
    s.classList.add(dir === 'fwd' ? 'turn-fwd' : 'turn-back');
    turning.set(i, { z: ++zSeq, timer: setTimeout(() => {
      s.classList.remove('turn-fwd', 'turn-back');
      turning.delete(i);
      applyZ();
    }, TURN_MS + 40) });
  }

  function paint(animate = true) {
    sheets.forEach((s, i) => {
      s.classList.toggle('flipped', i < at);
      s.classList.toggle('is-top', mode === 'spread' ? (i === at || i === at - 1) : i === at);
    });
    if (!animate) {
      book.classList.add('no-anim');
      void book.offsetWidth;
      requestAnimationFrame(() => book.classList.remove('no-anim'));
    }
    applyZ();

    const S = sheets.length;
    // a closed book sits centered: shift it so the cover (or the back cover) is in the middle
    book.classList.toggle('closed-front', mode === 'spread' && at === 0);
    book.classList.toggle('closed-back', mode === 'spread' && at === S);
    // how many sheets are stacked on each side, for the page-edge thickness
    book.style.setProperty('--left-stack', Math.min(6, mode === 'spread' ? at : 0));
    book.style.setProperty('--right-stack', Math.min(6, lastPos() - at));

    prevBtn.disabled = at === 0;
    nextBtn.disabled = at >= lastPos();
    const total = two(pages.length - 2);
    if (mode === 'spread') count.textContent = at === 0 ? 'Cover' : at === S ? 'Back cover' : `Pages ${two(at * 2 - 1)}–${two(at * 2)} / ${total}`;
    else count.textContent = at === 0 ? 'Cover' : at === S - 1 ? 'Back cover' : `Page ${two(at)} / ${total}`;
    bar.style.transform = `scaleX(${lastPos() ? at / lastPos() : 0})`;

    rail.querySelectorAll('button').forEach((b, i) => {
      const on = i === at;
      b.classList.toggle('on', on);
      b.setAttribute('aria-current', on ? 'true' : 'false');
      if (on && animate) rail.scrollTo({ left: b.offsetLeft - rail.clientWidth / 2 + b.clientWidth / 2, behavior: calm ? 'auto' : 'smooth' });
    });
    playVisible();
  }

  function playVisible() {
    const faces = mode === 'spread' ? [sheets[at - 1]?.querySelector('.back'), sheets[at]?.querySelector('.front')] : [sheets[at]?.querySelector('.front')];
    const showing = new Set(faces.filter(Boolean).flatMap(f => [...f.querySelectorAll('video')]));
    book.querySelectorAll('video').forEach(v => (inView && !calm && showing.has(v) ? v.play().catch(() => {}) : v.pause()));
  }

  function next() {
    if (at >= lastPos()) return false;
    at += 1;
    startTurn(at - 1, 'fwd');
    paint();
    return true;
  }
  function prev() {
    if (at <= 0) return false;
    at -= 1;
    startTurn(at, 'back');
    paint();
    return true;
  }
  // jump to a position by riffling through the pages in between
  function goTo(target) {
    clearTimeout(riffle);
    const step = () => {
      if (target === at) return;
      (target > at ? next : prev)();
      riffle = setTimeout(step, RIFFLE_MS);
    };
    step();
  }
  const user = fn => () => { clearTimeout(riffle); fn(); };

  function buildRail() {
    rail.replaceChildren();
    const positions = mode === 'spread'
      ? Array.from({ length: sheets.length + 1 }, (_, k) => [pages[k * 2 - 1], pages[k * 2]])
      : pages.map(p => [p]);
    positions.forEach((pair, k) => {
      const label = k === 0 ? 'Cover' : k === positions.length - 1 ? 'Back cover' : mode === 'spread' ? `Pages ${k * 2 - 1} and ${k * 2}` : `Page ${k}`;
      const b = el('button', `thumb${pair.length === 2 ? ' pair' : ''}`, pair.map(p => (p || pair.length === 2 ? miniPage(p) : null)));
      b.type = 'button';
      b.setAttribute('aria-label', `Go to ${label.toLowerCase()}`);
      b.title = label;
      b.addEventListener('click', () => goTo(k));
      rail.append(b);
    });
  }

  prevBtn.addEventListener('click', user(prev));
  nextBtn.addEventListener('click', user(next));
  book.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); user(next)(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); user(prev)(); }
    if (e.key === 'Home') { e.preventDefault(); goTo(0); }
    if (e.key === 'End') { e.preventDefault(); goTo(lastPos()); }
  });
  // Arrow keys also work while the book is on screen, unless the photo viewer is open
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && section.classList.contains('book-full')) { toggleFull(); return; }
    if (!inView || e.target.closest?.('[data-book], input, textarea')) return;
    if (document.querySelector('[data-lightbox]')?.hidden === false) return;
    if (e.key === 'ArrowRight') user(next)();
    if (e.key === 'ArrowLeft') user(prev)();
  });
  let x0 = null, y0 = null;
  stage.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  stage.addEventListener('touchend', e => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) user(dx < 0 ? next : prev)();
    x0 = y0 = null;
  });

  function toggleFull() {
    const on = section.classList.toggle('book-full');
    document.body.style.overflow = on ? 'hidden' : '';
    fullBtn.textContent = on ? 'Close' : 'Full screen';
    fullBtn.setAttribute('aria-pressed', on);
    if (isSpread() !== (mode === 'spread')) build(); else size();
    book.focus({ preventScroll: true });
  }
  fullBtn.addEventListener('click', toggleFull);

  new IntersectionObserver(([e]) => { inView = e.isIntersecting; playVisible(); }, { threshold: .25 }).observe(stage);
  let raf = 0;
  addEventListener('resize', () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => (isSpread() !== (mode === 'spread') ? build() : size()));
  });

  build();
}
