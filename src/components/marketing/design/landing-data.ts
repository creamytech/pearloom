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
    sub: 'Type two names. Pear drafts the whole site in your voice — cover, story, RSVP, registry — and stays till the thank-you notes.',
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
    sub: 'Come as you are. A quiet gathering page, drafted gently in her voice — the stories, the schedule, a place to remember. Always free.',
    mesh: ['#1E2513', '#2C5E7A', '#5C6B3F', '#C19A4B'],
  },
  baby: {
    chip: 'Baby shower', mono: 'V', eyebrow: 'A little one is near', pre: 'A shower for', post: '',
    meta: ['Sunday afternoon', 'The sunroom'],
    accent: '#D9A89E', accent2: '#C19A4B', ph: 'Baby Vale',
    h1a: 'A soft landing, ', em: 'warmly', h1b: ' planned.',
    sub: 'An advice wall, a meal train, a registry that splits itself. Everything a shower needs — already drafted and gathered in one place.',
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
  tint: string;
  ink: string;
  key?: OccasionKey;
}
export const GALLERY_TILES: GalleryTile[] = [
  { nm: 'Weddings', tone: 'Ceremonial', blk: 14, tint: '#C6703D', ink: '#7A3E1F', key: 'wedding' },
  { nm: 'Milestone birthdays', tone: 'Playful', blk: 10, tint: '#C19A4B', ink: '#7A5E24', key: 'milestone' },
  { nm: 'Anniversaries', tone: 'Intimate', blk: 9, tint: '#D9A89E', ink: '#8A4E42' },
  { nm: 'Baby showers', tone: 'Tender', blk: 9, tint: '#B7A4D0', ink: '#4E3F6E', key: 'baby' },
  { nm: 'Memorials', tone: 'Solemn', blk: 11, tint: '#5C6B3F', ink: '#363F22', key: 'memorial' },
  { nm: 'Engagement parties', tone: 'Romantic', blk: 8, tint: '#C2693E', ink: '#7A3E1F' },
  { nm: 'Reunions', tone: 'Warm', blk: 11, tint: '#6B5A8C', ink: '#3E3159', key: 'reunion' },
  { nm: 'Retirements & galas', tone: 'Grateful', blk: 9, tint: '#2C5E7A', ink: '#1F3A4D' },
];
