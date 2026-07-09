// ─────────────────────────────────────────────────────────────
// Pearloom / marketing/design/landing-data.ts
//
// Shared data for the v4 landing surfaces (Hero occasion switcher,
// Studio playground, occasion gallery). Ported from the design
// handoff (Landing v4). One source of truth so the hero tabs, the
// studio preview and the occasion gallery never drift.
//
// On-brand rule (BRAND.md §10): NO stock photography. Every "image"
// slot on the landing is a warm occasion-tinted gradient + a motif,
// or the WebGL mesh (GradientMesh). The `mesh` array per occasion
// drives the painterly hero backdrop.
// ─────────────────────────────────────────────────────────────

export type OccasionKey = 'wedding' | 'milestone' | 'memorial' | 'baby' | 'reunion';

/** Unsplash placeholder URL (matches the design handoff). Swap the ids
 *  for licensed assets before launch — the README calls these
 *  placeholders, but the v4 design IS photographic. */
export const U = (id: string, w = 1280): string =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=70&auto=format&fit=crop`;

/** Per-occasion hero photograph (crossfades behind the hero). */
export const OCC_IMG: Record<OccasionKey, string> = {
  wedding: '1519741497674-611481863552',
  milestone: '1464349153735-7db50ed83c84',
  memorial: '1490750967868-88aa4486c946',
  baby: '1519689680058-324335c77eba',
  reunion: '1529156069898-49953e39b3ac',
};

/** The day-of photo wall + memory album + finale imagery. */
export const WALL_IMGS = [
  '1519741497674-611481863552', '1519671482749-fd09be7ccebf', '1511795409834-ef04bbd61622',
  '1414235077428-338989a2e8c0', '1470337458703-46ad1756a187', '1529156069898-49953e39b3ac',
];
export const ALBUM_IMGS = [
  '1519741497674-611481863552', '1519671482749-fd09be7ccebf', '1470337458703-46ad1756a187',
  '1414235077428-338989a2e8c0', '1529156069898-49953e39b3ac',
];
export const FINALE_IMG = '1511285560929-80b456fea0bc';

export interface LandingOccasion {
  chip: string;
  mono: string;
  eyebrow: string;
  pre: string;
  post: string;
  meta: [string, string];
  accent: string;
  accent2: string;
  ph: string;
  /** Fraunces headline, split around the italic accent word. */
  h1a: string;
  em: string;
  h1b: string;
  sub: string;
  /** WebGL mesh colors for the painterly hero backdrop (warm, on-brand). */
  mesh: [string, string, string, string];
}

export const OCC: Record<OccasionKey, LandingOccasion> = {
  wedding: {
    chip: 'Wedding', mono: 'M&J', eyebrow: 'Save the date', pre: 'The marriage of', post: '',
    meta: ['Saturday · 14 September', 'Point Reyes, California'],
    accent: '#C6703D', accent2: '#C19A4B', ph: 'Mira & Jun',
    h1a: 'The days that ', em: 'matter', h1b: ', woven in an afternoon.',
    sub: 'Type two names. Pear drafts the whole site in your voice (cover, story, RSVP, registry) and stays till the thank-you notes.',
    mesh: ['#3A4A28', '#5C6B3F', '#C6703D', '#C19A4B'],
  },
  milestone: {
    chip: 'Milestone', mono: 'M', eyebrow: "You're invited", pre: 'In celebration of', post: 'turning thirty',
    meta: ['The fourth of May', 'The garden at home'],
    accent: '#C19A4B', accent2: '#5C6B3F', ph: 'Maya',
    h1a: 'Thirty looks ', em: 'good', h1b: ' on you.',
    sub: 'Citrus, rosé, no speeches over ninety seconds. One site for the invite, the RSVPs, and the playlist your friends fill.',
    mesh: ['#5C6B3F', '#C19A4B', '#D9A89E', '#E8C77A'],
  },
  memorial: {
    chip: 'Memorial', mono: 'A', eyebrow: 'In loving memory', pre: 'A gathering for', post: '',
    meta: ['1946 · 2026', 'Tea, her records, her people'],
    accent: '#5C6B3F', accent2: '#C19A4B', ph: 'Amara Osei',
    h1a: 'Tea, her records, ', em: 'her people', h1b: '.',
    sub: 'Come as you are. A quiet gathering page, drafted gently in her voice: the stories, the schedule, a place to remember. Always free.',
    mesh: ['#1E2513', '#2C5E7A', '#5C6B3F', '#C19A4B'],
  },
  baby: {
    chip: 'Baby shower', mono: 'V', eyebrow: 'A little one is near', pre: 'A shower for', post: '',
    meta: ['Sunday afternoon', 'The sunroom'],
    accent: '#D9A89E', accent2: '#C19A4B', ph: 'Baby Vale',
    h1a: 'A soft landing, ', em: 'warmly', h1b: ' planned.',
    sub: 'An advice wall, a meal train, a registry that splits itself. Everything a shower needs, already drafted and gathered in one place.',
    mesh: ['#5C6B3F', '#D9A89E', '#E8C77A', '#C19A4B'],
  },
  reunion: {
    chip: 'Reunion', mono: 'O', eyebrow: 'Everyone, together', pre: 'The gathering of', post: '',
    meta: ['Labor Day weekend', 'Lake Tahoe'],
    accent: '#6B5A8C', accent2: '#C19A4B', ph: 'The Oseis',
    h1a: 'Get everyone ', em: 'in one place', h1b: '.',
    sub: 'Cost-splitting, carpools, a shared album, the group thread that never loses the details. The reunion that runs itself.',
    mesh: ['#2C353A', '#5E7A82', '#6B5A8C', '#C19A4B'],
  },
};

export const OCC_KEYS = Object.keys(OCC) as OccasionKey[];

export const THREADING = [
  'reading your photos',
  'pressing a palette',
  'writing your story',
  'weaving the RSVP',
  'setting the type',
];

export function parseNames(s: string): { two: boolean; a: string; b: string } {
  const parts = (s || '')
    .split(/\s*(?:&|\band\b|\+)\s*/i)
    .map((x) => x.trim())
    .filter(Boolean);
  if (parts.length >= 2) return { two: true, a: parts[0], b: parts.slice(1).join(' & ') };
  return { two: false, a: (s || '').trim(), b: '' };
}

export function slugifyNames(s: string): string {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ── Studio playground themes (palette · type) ──────────────────
export interface StudioTheme {
  key: string;
  name: string;
  bg: string;
  ink: string;
  accent: string;
  line: string;
  muted: string;
  display: string;
}
export const STUDIO_THEMES: StudioTheme[] = [
  { key: 'garden', name: 'Pressed Garden', bg: '#FDFAF0', ink: '#3D4A1F', accent: '#B7A4D0', line: 'rgba(61,74,31,0.14)', muted: '#8A8671', display: '"Fraunces", Georgia, serif' },
  { key: 'santorini', name: 'Santorini Linen', bg: '#F5F1E8', ink: '#283D4E', accent: '#3F6E92', line: 'rgba(40,61,78,0.16)', muted: '#8A9AA6', display: 'Georgia, serif' },
  { key: 'tuscan', name: 'Tuscan Watercolor', bg: '#FBF6EC', ink: '#4B3D2A', accent: '#C2693E', line: 'rgba(75,61,42,0.15)', muted: '#A0907A', display: '"Fraunces", Georgia, serif' },
  { key: 'editorial', name: 'Modern Editorial', bg: '#F4F3EF', ink: '#1A1A17', accent: '#B08940', line: 'rgba(26,26,23,0.16)', muted: '#8A8980', display: 'system-ui, sans-serif' },
  { key: 'midnight', name: 'Midnight Velvet', bg: '#1A1B2E', ink: '#F1EBDD', accent: '#B9A6E0', line: 'rgba(241,235,221,0.16)', muted: '#8B86A0', display: 'Georgia, serif' },
  { key: 'coastal', name: 'Coastal Ink', bg: '#EAE5D7', ink: '#1F3A4D', accent: '#2C5E7A', line: 'rgba(31,58,77,0.18)', muted: '#82929E', display: 'Georgia, serif' },
];

export const STUDIO_SANS = '"Geist", system-ui, sans-serif';

// ── Studio playground: component kits + paper textures ─────────
// Ported verbatim from the design handoff (Landing v4 · STUDIO_KITS /
// STUDIO_PAPERS). The studio preview re-frames its cards per kit
// (`data-kit`) and re-grains its paper per texture (`sk-mat-*`).
export interface StudioKit {
  id: string;
  name: string;
  blurb: string;
}
export const STUDIO_KITS: StudioKit[] = [
  { id: 'classic', name: 'Classic', blurb: 'Theme-native cards & rules' },
  { id: 'minimal', name: 'Minimal', blurb: 'Hairlines · big numerals' },
  { id: 'ticket', name: 'Ticket', blurb: 'Perforated stubs · monospace' },
  { id: 'plate', name: 'Plate', blurb: 'Engraved frames · Roman' },
  { id: 'scrapbook', name: 'Scrapbook', blurb: 'Taped, tilted, handwritten' },
  { id: 'index', name: 'Index', blurb: 'Ruled cards · red margin' },
  { id: 'arch', name: 'Arch', blurb: 'Arched cards · soft domes' },
  { id: 'stamp', name: 'Stamp', blurb: 'Postage frames · postmarks' },
  { id: 'deco', name: 'Deco', blurb: 'Gold frames · geometric' },
  { id: 'gallery', name: 'Gallery', blurb: 'Museum mats · exhibit numbers' },
  { id: 'tasting', name: 'Tasting Menu', blurb: 'Gold rules · dotted leaders' },
  { id: 'glass', name: 'Glass', blurb: 'Liquid panes · aurora light' },
  { id: 'boarding', name: 'Boarding pass', blurb: 'Accent band · dashed tear line' },
  { id: 'marquee', name: 'Marquee', blurb: 'Dotted gold bulbs · glow' },
  { id: 'chalkboard', name: 'Chalkboard', blurb: 'Slate board · chalk ink' },
  { id: 'nursery', name: 'Nursery', blurb: 'Soft pillow · pastel wash' },
  { id: 'kraft', name: 'Kraft', blurb: 'Field-notes · stitched edge' },
  { id: 'memoriam', name: 'Memoriam', blurb: 'Mourning keyline · ink edge' },
  { id: 'certificate', name: 'Certificate', blurb: 'Gold frame · wax seal' },
  { id: 'luggage', name: 'Luggage tag', blurb: 'Manila tag · punched hole' },
  { id: 'linenpress', name: 'Linen press', blurb: 'Woven inset · rustic press' },
  { id: 'waxseal', name: 'Wax seal', blurb: 'Stamped seal · formal invites' },
  { id: 'pennant', name: 'Pennant', blurb: 'Scalloped banner edge' },
  { id: 'embossed', name: 'Embossed', blurb: 'Blind-pressed, no ink' },
];

export interface StudioPaper {
  id: string;
  name: string;
}
export const STUDIO_PAPERS: StudioPaper[] = [
  { id: 'none', name: 'None' },
  { id: 'linen', name: 'Linen' },
  { id: 'paper', name: 'Paper' },
  { id: 'cotton', name: 'Cotton' },
  { id: 'watercolor', name: 'Watercolor' },
  { id: 'velvet', name: 'Velvet' },
  { id: 'canvas', name: 'Canvas' },
  { id: 'kraft', name: 'Kraft' },
  { id: 'vellum', name: 'Vellum' },
  { id: 'letterpress', name: 'Letterpress' },
  { id: 'newsprint', name: 'Newsprint' },
  { id: 'marble', name: 'Marble' },
];

// Blocks each occasion gets (core in ink, specialty in accent).
export const CORE_BLOCKS = ['Story', 'Schedule', 'Travel', 'RSVP', 'Registry', 'Gallery', 'FAQ', 'Details'];
export const BLOCKS_BY_OCC: Record<OccasionKey, string[]> = {
  wedding: ['Story', 'Schedule', 'Travel', 'RSVP', 'Registry', 'Gallery', 'Honor list', 'Menu', 'Program', 'Dress code', 'Toasts'],
  milestone: ['Story', 'Schedule', 'RSVP', 'Gallery', 'Toasts', 'Activity vote', 'Group chat'],
  memorial: ['Story', 'Schedule', 'Gallery', 'Obituary', 'Tribute wall', 'Program', 'Livestream'],
  baby: ['Story', 'Schedule', 'RSVP', 'Registry', 'Gallery', 'Name vote', 'Advice wall', 'Menu'],
  reunion: ['Schedule', 'Travel', 'Gallery', 'Cost splitter', 'Group chat', 'Activity vote', 'Packing list', 'Rooms'],
};

// ── The occasion gallery ("Each day has its own language") ─────
export interface GalleryTile {
  nm: string;
  tone: string;
  blk: number;
  img: string;
  key?: OccasionKey;
}
export const GALLERY_TILES: GalleryTile[] = [
  { nm: 'Weddings', tone: 'Ceremonial', blk: 14, img: '1511795409834-ef04bbd61622', key: 'wedding' },
  { nm: 'Milestone birthdays', tone: 'Playful', blk: 10, img: '1530103862676-de8c9debad1d', key: 'milestone' },
  { nm: 'Anniversaries', tone: 'Intimate', blk: 9, img: '1414235077428-338989a2e8c0' },
  { nm: 'Baby showers', tone: 'Tender', blk: 9, img: '1519689680058-324335c77eba', key: 'baby' },
  { nm: 'Memorials', tone: 'Solemn', blk: 11, img: '1518895312237-a9e23508077d', key: 'memorial' },
  { nm: 'Engagement parties', tone: 'Romantic', blk: 8, img: '1583939003579-730e3918a45a' },
  { nm: 'Reunions', tone: 'Warm', blk: 11, img: '1529156069898-49953e39b3ac', key: 'reunion' },
  { nm: 'Retirements & galas', tone: 'Grateful', blk: 9, img: '1470337458703-46ad1756a187' },
];
