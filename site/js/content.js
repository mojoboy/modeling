// Everything the site says lives here, so updating the portfolio means editing this file, not the page code.
// Photos and videos come from media.json (made by scripts/prepare_media.py); SHOOTS says which ones go where.
// Anything left as null is hidden on the page instead of showing a blank.

// Words wrapped in *asterisks* are set in the italic serif accent, like fitcode's headlines.
export const PROFILE = {
  name: 'David Babafemi',
  first: 'David',
  last: 'Babafemi',
  handle: 'mb.dayy',
  instagram: 'https://www.instagram.com/mb.dayy/',
  role: 'Model',
  base: 'Washington, DC area',          // shown in the header and footer
  available: 'Available in DC, Baltimore & New York · open to travel',
  timeZone: 'America/New_York',
  email: 'mojobabafemi@gmail.com',      // public booking email (null hides the button)
  agency: null,                         // e.g. 'Represented by …'
  heroPhoto: 'duo_bags',                // the photo beside the name in the hero; any photo id from media.json
  tagline: 'Editorial, menswear and *motion*. New work lands here as it’s finished.',
  bio: [
    'David Babafemi is a model working between DC and New York, at home in *editorial*, menswear and moving image.',
    'This page collects his latest work. New shoots are still in the edit and will land here as they finish.',
  ],
};

// Measurements: fill these in and they appear in the stats block. null = hidden.
export const STATS = [
  ['Height', '6′3″'],
  ['Weight', '160 lb'],
  ['Chest', null],
  ['Waist', '30 in'],
  ['Inseam', null],
  ['Shoe', '9.5 US'],
  ['Hair', 'Dark brown'],
  ['Eyes', 'Brown'],
];

// Each shoot lists media ids (the file name without the extension, e.g. img_1781), in the order they show.
// color: that shoot's accent (title, hover ring). Pick one from its photos; every shoot can differ.
// Newest shoot first.
export const SHOOTS = [
  {
    id: 'morocco',
    title: 'Morocco',
    year: 2026,
    tags: ['Editorial', 'Accessories'],
    note: 'Shot in Marrakesh: a riad courtyard, mirrors on the wall, and leather bags on a worn day bed.',
    cover: 'duo_bags',
    media: ['duo_bags', 'morocco_walk', 'morocco_door', 'morocco_desert', 'morocco_pair'],
    color: '#B8A58A',
  },
  {
    id: 'selects',
    title: 'Selects',
    year: 2026,
    tags: ['Runway', 'Street', 'Editorial'],
    note: 'A hand-painted look on the runway, a black suit in the library, a No. 10 jersey in late sun.',
    cover: 'runway_yellow',
    media: ['runway_yellow', 'library_suit', 'jersey_10'],
    color: '#C9B79C',
  },
  {
    id: 'courtyard',
    title: 'Courtyard',
    year: 2026,
    tags: ['Editorial', 'Menswear'],
    note: 'Tiled pool, banana leaves, a burnt-orange knit and a tan leather duffle.',
    cover: 'img_1785',
    media: ['img_1785', 'img_1782', 'img_1781', 'img_1786', 'img_1783'],
    color: '#9C9488',
  },
];

// The book: the flip-through portfolio. Pages turn in this order, after the cover and an intro page;
// a stats card and the back cover close it. Add or reorder media ids here; any photo or clip works.
export const BOOK = [
  'duo_bags',
  'morocco_walk',
  'morocco_door',
  'morocco_desert',
  'morocco_pair',
  'runway_yellow',
  'img_1785',
  'library_suit',
  'img_1782',
  'img_1781',
  'jersey_10',
  'img_1783',
  'img_1786',
];

// Optional per-piece captions in the book and viewer (otherwise the shoot's title is used).
export const CAPTIONS = {
  duo_bags: 'Morocco · Marrakesh',
  runway_yellow: 'Runway · the DO',
  library_suit: 'Library walk',
  jersey_10: 'No. 10',
};

// Shoots still being edited: shown as "developing" cards so the page doesn't look finished-but-thin.
export const IN_EDIT = [
  { title: 'Next shoot', note: 'In the edit' },
  { title: 'Coming soon', note: 'In the edit' },
];

export const AVAILABLE_FOR = ['Editorial', 'Lookbook', 'Campaign', 'Runway', 'Brand content', 'Video'];
