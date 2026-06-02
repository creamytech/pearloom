// ─────────────────────────────────────────────────────────────
// Pearloom / lib/theme-store/packs.ts
// Theme-Store pack catalog — typed port of the prototype's
// ClaudeDesign/shared/store-packs.jsx factory output.
//
// Each pack is a full theme (same --t-* var shape as the
// shared/themes.jsx vocabulary) plus store metadata
// (collection, price, tier, rating, badges, tags) and the
// recommended component kit. The previews on top of this
// catalog use the live procedural texture/motif/type engine
// — real art, not mockups.
// ─────────────────────────────────────────────────────────────

// ─── Font tokens (matches prototype F / S maps) ──────────────

const F = {
  cormorant: "'Cormorant Garamond', Georgia, serif",
  fraunces: "'Fraunces', Georgia, serif",
  playfair: "'Playfair Display', Georgia, serif",
  dmserif: "'DM Serif Display', Georgia, serif",
  marcellus: "'Marcellus', Georgia, serif",
  cinzel: "'Cinzel', Georgia, serif",
  italiana: "'Italiana', Georgia, serif",
  ebgar: "'EB Garamond', Georgia, serif",
  space: "'Space Grotesk', sans-serif",
  tenor: "'Tenor Sans', sans-serif",
  inter: "'Inter', sans-serif",
  dmsans: "'DM Sans', sans-serif",
} as const;

const S = {
  caveat: "'Caveat', cursive",
  dancing: "'Dancing Script', cursive",
  pinyon: "'Pinyon Script', cursive",
} as const;

// color-mix helper used by the factory
function cm(a: string, pct: number, b: string): string {
  return `color-mix(in oklab, ${a} ${pct}%, ${b})`;
}

// ─── Public types ─────────────────────────────────────────────

export type Tier = 'free' | 'premium' | 'signature';

export type Texture =
  | 'linen'
  | 'watercolor'
  | 'velvet'
  | 'kraft'
  | 'canvas'
  | 'paper'
  | 'marble'
  | 'gilded'
  | 'cotton'
  | 'none';

export type Pattern =
  | 'gingham'
  | 'stripe'
  | 'cabana'
  | 'dots'
  | 'deco'
  | 'celestial'
  | 'confetti'
  | 'grid'
  | 'diagonal'
  | 'terrazzo'
  | 'scallop'
  | 'none';

export type Motif =
  | 'olive'
  | 'bloom'
  | 'pressed'
  | 'laurel'
  | 'deco'
  | 'fern'
  | 'wheat'
  | 'citrus'
  | 'palm'
  | 'shell'
  | 'sun'
  | 'none';

export type Kit =
  | 'classic'
  | 'plate'
  | 'scrapbook'
  | 'minimal'
  | 'ticket'
  | 'arch'
  | 'stamp'
  | 'deco';

export type CollectionId =
  | 'med'
  | 'garden'
  | 'watercolor'
  | 'modern'
  | 'evening'
  | 'coastal'
  | 'heritage'
  | 'prints'
  | 'celestial'
  | 'whimsy'
  | 'seasonal';

/**
 * One of the 11 named pack collections. Mirrors the prototype's
 * STORE_COLLECTIONS array; the editor groups the pack grid by
 * collection so the store reads as a curated shelf set.
 */
export interface Collection {
  /** Stable id — used as URL slug + foreign key on Pack.collection. */
  id: CollectionId;
  /** Display name shown in the store header. */
  name: string;
  /** Short editorial tagline below the collection name. */
  blurb: string;
}

/** Reference to a theme — full --t-* var shape from the prototype factory. */
export type ThemeRef = Readonly<Record<string, string>>;

/**
 * Optional editorial badges on a pack card. Mirrors the
 * prototype's loose `{ best, new }` shape so card chrome can
 * render the right ribbon without remapping.
 */
export interface PackBadges {
  best?: boolean;
  new?: boolean;
}

/**
 * "What's included" line items shown in the QuickLook modal.
 * Pure presentation — the actual rendering primitives are
 * referenced by themeRef + kit + texture + motif on the pack.
 */
export type Includes =
  | 'palette'
  | 'texture'
  | 'type'
  | 'kit'
  | 'motifs'
  | 'pattern';

/**
 * One purchasable theme in the store. A pack is "a full,
 * real theme + store metadata" — applying a pack writes its
 * themeRef vars into the editor's theme and switches the
 * site's component kit to pack.kit.
 */
export interface Pack {
  /** Stable id — used as primary key in theme_pack_purchases + the localStorage key the editor reads. */
  id: string;
  /** Display name on the pack card + QuickLook hero. */
  name: string;
  /** Foreign key to a Collection.id. */
  collection: CollectionId;
  /** One-sentence editorial blurb shown under the name. */
  blurb: string;
  /** Longer description — alias of blurb for consumers that prefer the longer name. */
  description: string;
  /** The full theme var bag (--t-paper, --t-ink, …). */
  themeRef: ThemeRef;
  texture: Texture;
  pattern: Pattern;
  motif: Motif;
  /** Recommended component kit — drives KSchedule + card chrome. */
  kit: Kit;
  /** Dark vs light overall mode (drives editor chrome inversion hints). */
  dark: boolean;
  /** Foil accents — gold-leaf treatment on heading rules. */
  foil: boolean;
  /** Four-color swatch row shown on the pack card. */
  swatches: readonly [string, string, string, string];
  /** Storefront price in **cents** (0 for free). */
  priceCents: number;
  /** Derived ownership tier — drives badge color + plan-tier free unlocks. */
  tier: Tier;
  /** Editorial star rating shown on the card (e.g. 4.9). */
  rating: number;
  /** Display string for sales volume (e.g. '3.2k', '980'). */
  sales: string;
  /** Optional ribbon badges. */
  badges: PackBadges;
  /** Search tags. */
  tags: readonly string[];
  /** What's-included row keys — drives QuickLook bulleted list. */
  includes: readonly Includes[];
  /** Custom render hints — kit/motif/etc. overrides the live preview can opt into. */
  look: Record<string, unknown>;
}

// ─── Factory ──────────────────────────────────────────────────

interface MkInput {
  id: string;
  name: string;
  collection: CollectionId;
  blurb: string;
  paper: string;
  ink: string;
  accent: string;
  gold: string;
  section?: string;
  card?: string;
  inkSoft?: string;
  inkMuted?: string;
  accent2?: string;
  accentBg?: string;
  accentInk?: string;
  line?: string;
  rsvp?: string;
  rsvpInk?: string;
  display?: string;
  body?: string;
  script?: string;
  radius?: number;
  wght?: string;
  heroScale?: number;
  ls?: string;
  shadow?: string;
  dark?: boolean;
  foil?: boolean;
  texture?: Texture;
  pattern?: Pattern;
  motif?: Motif;
  kit?: Kit;
  swatches?: readonly [string, string, string, string];
  price?: number;
  r?: number;
  s?: string;
  badges?: PackBadges;
  tags?: readonly string[];
  look?: Record<string, unknown>;
}

/**
 * Build a Pack. Mirrors the prototype's `mk()` factory line-for-line
 * so any future drift between the typed catalog and the prototype's
 * jsx is a 1-line diff.
 */
function mk(o: MkInput): Pack {
  const dark = !!o.dark;
  const { paper, ink, accent, gold } = o;
  const section = o.section || cm(paper, dark ? 86 : 93, dark ? '#ffffff' : ink);
  const card = o.card || (dark ? cm(paper, 84, '#ffffff') : cm('#ffffff', 70, paper));
  const themeRef: ThemeRef = {
    '--t-paper': paper,
    '--t-section': section,
    '--t-card': card,
    '--t-ink': ink,
    '--t-ink-soft': o.inkSoft || cm(ink, 74, paper),
    '--t-ink-muted': o.inkMuted || cm(ink, 48, paper),
    '--t-accent': accent,
    '--t-accent-2': o.accent2 || cm(accent, 62, paper),
    '--t-accent-bg': o.accentBg || cm(accent, dark ? 28 : 16, paper),
    '--t-accent-ink': o.accentInk || (dark ? cm(accent, 78, '#ffffff') : cm(accent, 84, ink)),
    '--t-gold': gold,
    '--t-line': o.line || cm(ink, dark ? 22 : 16, 'transparent'),
    '--t-line-soft': cm(ink, dark ? 12 : 8, 'transparent'),
    '--t-rsvp': o.rsvp || (dark ? gold : ink),
    '--t-rsvp-ink': o.rsvpInk || (dark ? '#1a1a1a' : paper),
    '--t-display': o.display || F.fraunces,
    '--t-body': o.body || F.inter,
    '--t-script': o.script || S.caveat,
    '--t-radius': (o.radius != null ? o.radius : 8) + 'px',
    '--t-radius-lg': ((o.radius != null ? o.radius : 8) + 8) + 'px',
    '--t-display-wght': o.wght || '600',
    '--t-hero-scale': String(o.heroScale || 1),
    '--t-eyebrow-ls': o.ls || '0.18em',
    '--t-shadow':
      o.shadow || (dark ? '0 16px 40px rgba(0,0,0,0.42)' : '0 10px 26px rgba(40,40,30,0.08)'),
  };
  const priceDollars = o.price || 0;
  const priceCents = priceDollars * 100;
  const tier: Tier = priceDollars === 0 ? 'free' : priceDollars >= 20 ? 'signature' : 'premium';
  const texture: Texture = o.texture || 'none';
  const pattern: Pattern = o.pattern || 'none';
  const motif: Motif = o.motif || 'none';
  const kit: Kit = o.kit || 'classic';

  // "What's included" row keys — derived from the pack so the
  // QuickLook bulleted list stays in sync with what the pack
  // actually delivers (vs. a hard-coded 5-row list per the
  // prototype's right-rail).
  const includes: Includes[] = ['palette', 'type', 'kit'];
  if (texture !== 'none') includes.push('texture');
  if (pattern !== 'none') includes.push('pattern');
  if (motif !== 'none') includes.push('motifs');

  const swatches: readonly [string, string, string, string] = o.swatches || [
    accent,
    dark ? o.accent2 || gold : ink,
    gold,
    section,
  ];

  return {
    id: o.id,
    name: o.name,
    collection: o.collection,
    blurb: o.blurb,
    description: o.blurb,
    themeRef,
    texture,
    pattern,
    motif,
    kit,
    dark,
    foil: !!o.foil,
    swatches,
    priceCents,
    tier,
    rating: o.r || 4.8,
    sales: o.s || '1.0k',
    badges: o.badges || {},
    tags: o.tags || [],
    includes,
    look: o.look || {},
  };
}

// ─── Collections (11) ─────────────────────────────────────────

export const COLLECTIONS: readonly Collection[] = [
  { id: 'med', name: 'Mediterranean', blurb: 'Sun, salt, linen & olive.' },
  { id: 'garden', name: 'Garden & Botanical', blurb: 'Pressed blooms & green calm.' },
  { id: 'watercolor', name: 'Watercolor & Painterly', blurb: 'Soft washes and pigment.' },
  { id: 'modern', name: 'Modern & Editorial', blurb: 'Flat, confident, type-led.' },
  { id: 'evening', name: 'Evening & Luxe', blurb: 'Velvet, candlelight, gold.' },
  { id: 'coastal', name: 'Coastal & Nautical', blurb: 'Deckled paper & sea air.' },
  { id: 'heritage', name: 'Heritage & Vintage', blurb: 'Deco, antique & old-world.' },
  { id: 'prints', name: 'Patterns & Prints', blurb: 'Gingham, stripes, terrazzo.' },
  { id: 'celestial', name: 'Celestial & Night', blurb: 'Stars, gold & midnight.' },
  { id: 'whimsy', name: 'Whimsy & Fun', blurb: 'Confetti, citrus, marquee.' },
  { id: 'seasonal', name: 'Seasonal & Fête', blurb: 'Holidays & celebration.' },
] as const;

// ─── Packs (67) — full port of STORE_PACKS ────────────────────

export const PACKS: readonly Pack[] = [
  // ===== Mediterranean =====
  mk({ id: 'santorini-linen', name: 'Santorini Linen', collection: 'med', blurb: 'Sun-bleached linen, Aegean blue & olive.', paper: '#F5F1E8', ink: '#283D4E', accent: '#3F6E92', gold: '#C2A165', display: F.cormorant, radius: 5, wght: '600', heroScale: 1.16, ls: '0.2em', texture: 'linen', motif: 'olive', kit: 'plate', price: 18, r: 4.9, s: '3.2k', badges: { best: true }, tags: ['linen', 'blue', 'greece', 'olive'] }),
  mk({ id: 'amalfi-lemon', name: 'Amalfi Lemon', collection: 'med', blurb: 'Lemon groves over an azure coast.', paper: '#FBF7EC', ink: '#2C5E72', accent: '#E0A92E', gold: '#D8932F', display: F.playfair, radius: 14, texture: 'watercolor', motif: 'bloom', kit: 'scrapbook', price: 18, r: 4.8, s: '2.1k', badges: { new: true }, tags: ['lemon', 'italy', 'yellow'] }),
  mk({ id: 'aegean-whitewash', name: 'Aegean Whitewash', collection: 'med', blurb: 'Whitewashed walls, deep cobalt doors.', paper: '#F7F5F0', ink: '#1F3A66', accent: '#2E5BA8', gold: '#B7B0A2', display: F.marcellus, radius: 3, ls: '0.24em', texture: 'linen', motif: 'olive', kit: 'minimal', price: 16, r: 4.7, s: '1.4k', tags: ['cobalt', 'minimal', 'white'] }),
  mk({ id: 'provence-lavender', name: 'Provence Lavender', collection: 'med', blurb: 'Lavender rows and warm stone.', paper: '#FAF6F0', ink: '#4A3F5C', accent: '#8B7BB0', gold: '#C0A45E', display: F.ebgar, radius: 12, texture: 'paper', motif: 'pressed', kit: 'classic', price: 18, r: 4.8, s: '1.9k', tags: ['lavender', 'purple', 'france'] }),
  mk({ id: 'mallorca-terracotta', name: 'Mallorca Terracotta', collection: 'med', blurb: 'Clay rooftops and warm siena light.', paper: '#FBF3E9', ink: '#5A3422', accent: '#C26A41', gold: '#C99A4E', display: F.fraunces, radius: 10, texture: 'cotton', motif: 'none', kit: 'plate', price: 16, r: 4.7, s: '980', tags: ['terracotta', 'clay', 'warm'] }),
  mk({ id: 'cinque-terre', name: 'Cinque Terre', collection: 'med', blurb: 'Painted villages over the sea.', paper: '#FBF6EF', ink: '#1E5E5A', accent: '#D96A4A', gold: '#E2A33C', display: F.fraunces, radius: 16, texture: 'watercolor', motif: 'bloom', kit: 'ticket', price: 0, r: 4.6, s: '5.8k', tags: ['coral', 'teal', 'free'] }),

  // ===== Garden & Botanical =====
  mk({ id: 'pressed-garden', name: 'Pressed Garden', collection: 'garden', blurb: 'Cotton paper & pressed wildflowers.', paper: '#FDFAF0', ink: '#3D4A1F', accent: '#B7A4D0', gold: '#B89244', display: F.fraunces, radius: 14, texture: 'paper', motif: 'pressed', kit: 'scrapbook', price: 0, r: 4.8, s: '6.1k', badges: { best: true }, tags: ['pressed', 'flowers', 'free'] }),
  mk({ id: 'english-rose', name: 'English Rose', collection: 'garden', blurb: 'Blush roses in a walled garden.', paper: '#FCF3F1', ink: '#6A3140', accent: '#C66B7C', gold: '#C79A5C', display: F.playfair, radius: 18, texture: 'watercolor', motif: 'bloom', kit: 'classic', price: 18, r: 4.9, s: '2.7k', badges: { best: true }, tags: ['rose', 'blush', 'romantic'] }),
  mk({ id: 'eucalyptus-press', name: 'Eucalyptus Press', collection: 'garden', blurb: 'Silver-green sprigs on cream.', paper: '#F7F8F2', ink: '#3A4A3E', accent: '#6E8A6A', gold: '#B6A468', display: F.ebgar, radius: 12, texture: 'paper', motif: 'pressed', kit: 'classic', price: 16, r: 4.8, s: '2.0k', tags: ['sage', 'green', 'botanical'] }),
  mk({ id: 'wildflower-meadow', name: 'Wildflower Meadow', collection: 'garden', blurb: 'A scattered field in full bloom.', paper: '#FBF8EF', ink: '#4B4A2A', accent: '#C98AA8', gold: '#D8A53E', display: F.fraunces, radius: 14, texture: 'paper', motif: 'pressed', kit: 'scrapbook', price: 18, r: 4.7, s: '1.3k', badges: { new: true }, tags: ['meadow', 'pastel', 'multi'] }),
  mk({ id: 'herb-garden', name: 'Herb Garden', collection: 'garden', blurb: 'Rosemary, thyme & quiet charcoal.', paper: '#F6F4EC', ink: '#2E3328', accent: '#6B7A4E', gold: '#A88C4C', display: F.marcellus, radius: 6, ls: '0.2em', texture: 'linen', motif: 'olive', kit: 'minimal', price: 16, r: 4.7, s: '870', tags: ['herb', 'olive', 'calm'] }),
  mk({ id: 'botanical-ink', name: 'Botanical Ink', collection: 'garden', blurb: 'Pen-and-ink leaves on warm paper.', paper: '#F8F5EC', ink: '#27402F', accent: '#2F5A3E', gold: '#A98B4F', display: F.cormorant, radius: 4, texture: 'paper', motif: 'pressed', kit: 'plate', price: 18, r: 4.8, s: '1.1k', tags: ['ink', 'green', 'line-art'] }),

  // ===== Watercolor & Painterly =====
  mk({ id: 'tuscan-watercolor', name: 'Tuscan Watercolor', collection: 'watercolor', blurb: 'Soft washes, terracotta & sage.', paper: '#FBF6EC', ink: '#4B3D2A', accent: '#C2693E', gold: '#C99A4E', display: F.fraunces, radius: 16, heroScale: 1, texture: 'watercolor', motif: 'bloom', kit: 'scrapbook', price: 18, r: 4.9, s: '3.0k', badges: { best: true }, tags: ['watercolor', 'terracotta', 'sage'] }),
  mk({ id: 'blush-bloom', name: 'Blush Bloom', collection: 'watercolor', blurb: 'Petal-soft pinks and warm cream.', paper: '#FDF5F2', ink: '#6E4248', accent: '#D08A92', gold: '#CBA15E', display: F.playfair, radius: 18, texture: 'watercolor', motif: 'bloom', kit: 'classic', price: 18, r: 4.8, s: '2.3k', tags: ['blush', 'pink', 'soft'] }),
  mk({ id: 'indigo-wash', name: 'Indigo Wash', collection: 'watercolor', blurb: 'Inky indigo bleeding into cream.', paper: '#F6F5F0', ink: '#27324F', accent: '#3A4E8C', gold: '#B49A5E', display: F.italiana, radius: 10, ls: '0.22em', texture: 'watercolor', motif: 'none', kit: 'minimal', price: 16, r: 4.7, s: '1.2k', badges: { new: true }, tags: ['indigo', 'blue', 'wash'] }),
  mk({ id: 'peony-dusk', name: 'Peony Dusk', collection: 'watercolor', blurb: 'Plum peonies at last light.', paper: '#FAF4F2', ink: '#4E3450', accent: '#9C5E84', gold: '#C39A5C', display: F.playfair, radius: 16, texture: 'watercolor', motif: 'bloom', kit: 'classic', price: 18, r: 4.8, s: '1.6k', tags: ['peony', 'plum', 'mauve'] }),
  mk({ id: 'sunset-wash', name: 'Sunset Wash', collection: 'watercolor', blurb: 'Coral and gold melting to dusk.', paper: '#FDF6EC', ink: '#6B3A2E', accent: '#E07A4E', gold: '#E2A33C', display: F.fraunces, radius: 18, texture: 'watercolor', motif: 'bloom', kit: 'scrapbook', price: 16, r: 4.7, s: '1.0k', tags: ['coral', 'gold', 'sunset'] }),
  mk({ id: 'sage-watercolor', name: 'Sage Watercolor', collection: 'watercolor', blurb: 'Muted sage on stone-washed paper.', paper: '#F7F7F1', ink: '#3F4A3C', accent: '#7E8F6E', gold: '#AE9A60', display: F.ebgar, radius: 14, texture: 'watercolor', motif: 'pressed', kit: 'classic', price: 0, r: 4.7, s: '4.4k', tags: ['sage', 'green', 'free'] }),

  // ===== Modern & Editorial =====
  mk({ id: 'modern-editorial', name: 'Modern Editorial', collection: 'modern', blurb: 'Flat matte, high-contrast type.', paper: '#F4F3EF', ink: '#1A1A17', accent: '#1A1A17', accent2: '#B08940', gold: '#B08940', display: F.inter, body: F.inter, script: F.inter, radius: 2, wght: '800', ls: '0.24em', texture: 'none', motif: 'none', kit: 'minimal', price: 0, r: 4.8, s: '5.2k', tags: ['modern', 'matte', 'free'] }),
  mk({ id: 'noir-matte', name: 'Noir Matte', collection: 'modern', blurb: 'Pure black on bone, nothing else.', paper: '#F2F1EC', ink: '#141414', accent: '#141414', accent2: '#8A8A82', gold: '#9A9A90', display: F.space, body: F.dmsans, script: F.dmsans, radius: 1, wght: '700', ls: '0.26em', texture: 'none', motif: 'none', kit: 'minimal', price: 16, r: 4.8, s: '1.7k', tags: ['black', 'mono', 'bold'] }),
  mk({ id: 'swiss-grid', name: 'Swiss Grid', collection: 'modern', blurb: 'Helvetican order with a red tick.', paper: '#F6F5F2', ink: '#1B1B1B', accent: '#D23A2E', accent2: '#1B1B1B', gold: '#C0392B', display: F.space, body: F.dmsans, script: F.dmsans, radius: 0, wght: '700', ls: '0.18em', texture: 'none', motif: 'none', kit: 'minimal', price: 18, r: 4.7, s: '1.1k', badges: { new: true }, tags: ['swiss', 'red', 'grid'] }),
  mk({ id: 'mono-press', name: 'Mono Press', collection: 'modern', blurb: 'Greyscale gallery for the type-led.', paper: '#F1F1EF', ink: '#2A2A28', accent: '#5A5A55', accent2: '#9A9A92', gold: '#8C8C84', display: F.tenor, body: F.dmsans, script: F.dmsans, radius: 2, ls: '0.22em', texture: 'none', motif: 'none', kit: 'minimal', price: 16, r: 4.6, s: '760', tags: ['grey', 'minimal', 'calm'] }),
  mk({ id: 'brut-concrete', name: 'Brut Concrete', collection: 'modern', blurb: 'Raw concrete with a warm ember.', paper: '#EDEBE6', ink: '#2B2A27', accent: '#B5612F', accent2: '#6E6A63', gold: '#A8702F', display: F.space, body: F.dmsans, script: F.dmsans, radius: 1, wght: '700', ls: '0.16em', texture: 'cotton', motif: 'none', kit: 'ticket', price: 18, r: 4.7, s: '930', tags: ['concrete', 'industrial', 'amber'] }),
  // NOTE: prototype writes `script: F.dancing` here, which is a bug — `dancing`
  // lives on S, not F. At runtime that becomes `undefined` and the factory falls
  // back to S.caveat. We preserve the visible result by writing S.dancing explicitly
  // (i.e. honour the intent, not the typo) so the script font actually renders.
  mk({ id: 'ivory-minimal', name: 'Ivory Minimal', collection: 'modern', blurb: 'Barely-there ivory & soft taupe.', paper: '#F8F6F0', ink: '#3A352C', accent: '#A89578', accent2: '#C8BBA2', gold: '#B79E72', display: F.italiana, body: F.dmsans, script: S.dancing, radius: 3, ls: '0.24em', texture: 'none', motif: 'none', kit: 'minimal', price: 16, r: 4.9, s: '2.2k', badges: { best: true }, tags: ['ivory', 'taupe', 'quiet'] }),

  // ===== Evening & Luxe =====
  mk({ id: 'midnight-velvet', name: 'Midnight Velvet', collection: 'evening', blurb: 'Inky velvet & candlelight gold.', dark: true, paper: '#1A1B2E', section: '#20223A', card: '#262842', ink: '#F1EBDD', accent: '#B9A6E0', accent2: '#C9A24B', gold: '#C9A24B', display: F.cormorant, radius: 12, foil: true, rsvp: '#C9A24B', rsvpInk: '#1A1B2E', texture: 'velvet', motif: 'none', kit: 'plate', price: 24, r: 4.9, s: '2.8k', badges: { best: true }, tags: ['dark', 'velvet', 'gold'] }),
  mk({ id: 'emerald-noir', name: 'Emerald Noir', collection: 'evening', blurb: 'Deep emerald lit by warm brass.', dark: true, paper: '#10241C', section: '#163026', card: '#1B3A2D', ink: '#EFEAD8', accent: '#3FA37A', accent2: '#C9A24B', gold: '#C9A24B', display: F.cinzel, wght: '600', ls: '0.2em', foil: true, rsvp: '#C9A24B', rsvpInk: '#10241C', texture: 'velvet', motif: 'none', kit: 'plate', price: 24, r: 4.9, s: '1.5k', tags: ['emerald', 'green', 'luxe'] }),
  mk({ id: 'bordeaux-velvet', name: 'Bordeaux Velvet', collection: 'evening', blurb: 'Wine-dark velvet & rose gold.', dark: true, paper: '#2A1320', section: '#371826', card: '#3F1E2D', ink: '#F2E6DD', accent: '#B45A72', accent2: '#D8A06A', gold: '#D8A06A', display: F.playfair, foil: true, rsvp: '#D8A06A', rsvpInk: '#2A1320', texture: 'velvet', motif: 'none', kit: 'plate', price: 24, r: 4.8, s: '1.2k', badges: { new: true }, tags: ['wine', 'burgundy', 'rose-gold'] }),
  mk({ id: 'obsidian-gold', name: 'Obsidian Gold', collection: 'evening', blurb: 'Black glass & a thread of gold.', dark: true, paper: '#161616', section: '#1F1F1F', card: '#262626', ink: '#F0EDE4', accent: '#CDA349', accent2: '#CDA349', gold: '#CDA349', display: F.cinzel, wght: '600', ls: '0.22em', foil: true, rsvp: '#CDA349', rsvpInk: '#161616', texture: 'velvet', motif: 'none', kit: 'minimal', price: 24, r: 4.9, s: '1.9k', tags: ['black', 'gold', 'deco'] }),
  mk({ id: 'sapphire-evening', name: 'Sapphire Evening', collection: 'evening', blurb: 'Midnight navy & cool silver.', dark: true, paper: '#101A2E', section: '#16233D', card: '#1B2A48', ink: '#ECEFF6', accent: '#6E8CCB', accent2: '#B9C2D6', gold: '#B9C2D6', display: F.italiana, ls: '0.2em', rsvp: '#B9C2D6', rsvpInk: '#101A2E', texture: 'velvet', motif: 'none', kit: 'minimal', price: 20, r: 4.7, s: '880', tags: ['navy', 'silver', 'cool'] }),
  mk({ id: 'plum-champagne', name: 'Plum & Champagne', collection: 'evening', blurb: 'Soft plum lifted by champagne.', dark: true, paper: '#241A2E', section: '#2E233A', card: '#352A44', ink: '#F1EAE2', accent: '#A483C0', accent2: '#D9C29A', gold: '#D9C29A', display: F.cormorant, foil: true, rsvp: '#D9C29A', rsvpInk: '#241A2E', texture: 'velvet', motif: 'none', kit: 'plate', price: 20, r: 4.7, s: '740', tags: ['plum', 'champagne', 'soft'] }),

  // ===== Coastal & Nautical =====
  mk({ id: 'coastal-ink', name: 'Coastal Ink', collection: 'coastal', blurb: 'Deckled paper & navy ink line-work.', paper: '#EAE5D7', section: '#E0DAC8', ink: '#1F3A4D', accent: '#2C5E7A', gold: '#B89A5E', display: F.cormorant, radius: 2, ls: '0.22em', texture: 'cotton', motif: 'none', kit: 'minimal', price: 16, r: 4.8, s: '1.8k', tags: ['navy', 'deckle', 'nautical'] }),
  mk({ id: 'sea-glass', name: 'Sea Glass', collection: 'coastal', blurb: 'Frosted aqua & warm sand.', paper: '#F2F4EF', ink: '#264A48', accent: '#5F9A95', gold: '#C2A877', display: F.tenor, radius: 8, ls: '0.2em', texture: 'cotton', motif: 'none', kit: 'classic', price: 16, r: 4.7, s: '1.3k', badges: { new: true }, tags: ['aqua', 'seafoam', 'sand'] }),
  mk({ id: 'dune-driftwood', name: 'Dune & Driftwood', collection: 'coastal', blurb: 'Pale dunes and weathered wood.', paper: '#F6F1E7', ink: '#4A4034', accent: '#9C8463', gold: '#BFA06A', display: F.marcellus, radius: 5, ls: '0.18em', texture: 'linen', motif: 'none', kit: 'plate', price: 16, r: 4.7, s: '900', tags: ['sand', 'neutral', 'driftwood'] }),
  mk({ id: 'harbor-navy', name: 'Harbor Navy', collection: 'coastal', blurb: 'Rope, brass and deep harbor blue.', paper: '#EEE9DC', section: '#E5DFCE', ink: '#1B2E44', accent: '#26456A', gold: '#C49A52', display: F.cormorant, radius: 4, ls: '0.2em', texture: 'cotton', motif: 'none', kit: 'plate', price: 18, r: 4.8, s: '1.1k', tags: ['navy', 'rope', 'brass'] }),
  mk({ id: 'shell-blush', name: 'Shell Blush', collection: 'coastal', blurb: 'Seafoam and the inside of a shell.', paper: '#FBF4F0', ink: '#5A4248', accent: '#CE8E8E', gold: '#CDB07A', display: F.playfair, radius: 16, texture: 'watercolor', motif: 'bloom', kit: 'scrapbook', price: 0, r: 4.6, s: '3.6k', tags: ['blush', 'seafoam', 'free'] }),

  // ===== Heritage & Vintage =====
  mk({ id: 'art-deco-gatsby', name: 'Art Deco Gatsby', collection: 'heritage', blurb: 'Jazz-age black, gold & geometry.', dark: true, paper: '#15161A', section: '#1D1F25', card: '#23262E', ink: '#F0E9D6', accent: '#CBA14A', accent2: '#CBA14A', gold: '#CBA14A', display: F.cinzel, wght: '600', ls: '0.28em', foil: true, rsvp: '#CBA14A', rsvpInk: '#15161A', texture: 'gilded', pattern: 'deco', motif: 'deco', kit: 'deco', price: 24, r: 4.9, s: '2.0k', badges: { new: true }, tags: ['deco', 'gatsby', 'gold'] }),
  mk({ id: 'victorian-press', name: 'Victorian Press', collection: 'heritage', blurb: 'Sepia letterpress & burgundy seal.', paper: '#F3EAD8', section: '#EBE0CB', ink: '#3A2A24', accent: '#7C3B3B', gold: '#A8854A', display: F.ebgar, radius: 3, texture: 'paper', motif: 'pressed', kit: 'plate', price: 18, r: 4.8, s: '1.2k', tags: ['sepia', 'burgundy', 'press'] }),
  mk({ id: 'terrazzo-deco', name: 'Terrazzo Deco', collection: 'heritage', blurb: 'Speckled stone in playful pastels.', paper: '#F7F2E9', ink: '#36322B', accent: '#3E8A82', accent2: '#D98E6A', gold: '#D9A24E', display: F.dmserif, radius: 10, texture: 'none', pattern: 'terrazzo', motif: 'none', kit: 'arch', price: 16, r: 4.6, s: '680', tags: ['terrazzo', 'pastel', 'stone'] }),
  mk({ id: 'antique-rosegold', name: 'Antique Rose Gold', collection: 'heritage', blurb: 'Faded blush with rose-gold leaf.', paper: '#F8EFE9', section: '#F0E3DB', ink: '#5C3F40', accent: '#C58B82', gold: '#C9966B', display: F.italiana, radius: 6, ls: '0.2em', texture: 'paper', motif: 'pressed', kit: 'classic', price: 18, r: 4.9, s: '2.4k', badges: { best: true }, tags: ['rose-gold', 'blush', 'antique'] }),
  mk({ id: 'old-world-map', name: 'Old World Map', collection: 'heritage', blurb: 'Parchment, compass & faded ink.', paper: '#F1E7D2', section: '#E8DBC0', ink: '#3F3322', accent: '#8A5A33', gold: '#B0813F', display: F.cormorant, radius: 3, ls: '0.2em', texture: 'cotton', motif: 'none', kit: 'plate', price: 16, r: 4.7, s: '1.0k', tags: ['parchment', 'travel', 'sepia'] }),

  // ===== Seasonal & Fête =====
  mk({ id: 'autumn-harvest', name: 'Autumn Harvest', collection: 'seasonal', blurb: 'Rust, amber and gathered wheat.', paper: '#FAF2E4', ink: '#4A2E1E', accent: '#B5552B', gold: '#C68A36', display: F.fraunces, radius: 12, texture: 'watercolor', motif: 'bloom', kit: 'scrapbook', price: 16, r: 4.7, s: '1.1k', tags: ['autumn', 'rust', 'amber'] }),
  mk({ id: 'winter-frost', name: 'Winter Frost', collection: 'seasonal', blurb: 'Icy blue, silver and bare branches.', paper: '#F2F5F7', ink: '#2E3B47', accent: '#6E8FA6', gold: '#A9B4BE', display: F.italiana, radius: 8, ls: '0.22em', texture: 'paper', motif: 'pressed', kit: 'minimal', price: 18, r: 4.8, s: '900', badges: { new: true }, tags: ['winter', 'ice-blue', 'silver'] }),
  mk({ id: 'spring-blossom', name: 'Spring Blossom', collection: 'seasonal', blurb: 'Cherry blossom over fresh green.', paper: '#FBF5F4', ink: '#4F4138', accent: '#E298A8', gold: '#CBB05E', display: F.playfair, radius: 18, texture: 'watercolor', motif: 'bloom', kit: 'scrapbook', price: 0, r: 4.7, s: '4.0k', tags: ['spring', 'pink', 'free'] }),
  mk({ id: 'citrus-pop', name: 'Citrus Pop', collection: 'seasonal', blurb: 'Loud orange & punchy pink fun.', paper: '#FFF6EC', ink: '#5A2A1E', accent: '#F0682E', accent2: '#E0508A', gold: '#F0A02E', display: F.dmserif, radius: 14, texture: 'none', motif: 'none', kit: 'ticket', price: 16, r: 4.6, s: '1.4k', tags: ['orange', 'pink', 'bold'] }),
  mk({ id: 'confetti-fete', name: 'Confetti Fête', collection: 'seasonal', blurb: 'A cream canvas thrown with confetti.', paper: '#FCF8F0', ink: '#33324A', accent: '#5A6ED0', accent2: '#E0709A', gold: '#E0A93C', display: F.dmserif, radius: 16, texture: 'none', motif: 'none', kit: 'scrapbook', price: 16, r: 4.8, s: '2.6k', badges: { best: true }, tags: ['confetti', 'party', 'multi'] }),
  mk({ id: 'golden-hour', name: 'Golden Hour', collection: 'seasonal', blurb: 'Warm gold light and soft blush.', paper: '#FBF4E9', ink: '#5A4326', accent: '#D49A4A', gold: '#D8A23C', display: F.fraunces, radius: 16, texture: 'watercolor', motif: 'bloom', kit: 'classic', price: 18, r: 4.8, s: '1.7k', tags: ['gold', 'blush', 'warm'] }),

  // ===== Patterns & Prints =====
  mk({ id: 'gingham-picnic', name: 'Gingham Picnic', collection: 'prints', blurb: 'Red gingham & a sunny picnic mood.', paper: '#FBF5EC', ink: '#5A2A24', accent: '#C7493B', gold: '#D89A3E', display: F.fraunces, radius: 14, texture: 'kraft', pattern: 'gingham', motif: 'none', kit: 'arch', price: 16, r: 4.7, s: '1.2k', badges: { new: true }, tags: ['gingham', 'red', 'picnic'] }),
  mk({ id: 'cabana-stripe', name: 'Cabana Stripe', collection: 'prints', blurb: 'Crisp awning stripes by the pool.', paper: '#F4F6F4', ink: '#1E3A52', accent: '#2E6BA0', gold: '#C7A35A', display: F.tenor, radius: 6, ls: '0.2em', texture: 'canvas', pattern: 'cabana', motif: 'none', kit: 'ticket', price: 16, r: 4.7, s: '980', tags: ['stripe', 'blue', 'cabana'] }),
  mk({ id: 'riviera-stripe', name: 'Riviera Stripe', collection: 'prints', blurb: 'Sun-lounger stripes & lemon trim.', paper: '#F6F7F2', ink: '#1F4E6B', accent: '#2F7EA6', gold: '#E0A82E', display: F.playfair, radius: 8, texture: 'linen', pattern: 'stripe', motif: 'citrus', kit: 'plate', price: 18, r: 4.8, s: '2.1k', badges: { best: true }, tags: ['stripe', 'riviera', 'citrus'] }),
  mk({ id: 'polka-fete', name: 'Polka Fête', collection: 'prints', blurb: 'Playful dots on warm cream.', paper: '#FCF6F1', ink: '#5A2E45', accent: '#D06A8E', gold: '#D8A24E', display: F.dmserif, radius: 16, texture: 'paper', pattern: 'dots', motif: 'none', kit: 'scrapbook', price: 16, r: 4.6, s: '760', tags: ['dots', 'pink', 'playful'] }),
  mk({ id: 'marigold-block', name: 'Marigold Block Print', collection: 'prints', blurb: 'Hand-blocked marigold & teal.', paper: '#FBF3E4', ink: '#3E4A33', accent: '#E0922E', accent2: '#2E8A82', gold: '#E0A82E', display: F.fraunces, radius: 10, texture: 'kraft', pattern: 'dots', motif: 'sun', kit: 'stamp', price: 18, r: 4.8, s: '1.1k', badges: { new: true }, tags: ['block-print', 'marigold', 'teal'] }),
  mk({ id: 'graph-modern', name: 'Graph Modern', collection: 'prints', blurb: 'Architect grid, ink-blue precision.', paper: '#F4F5F2', ink: '#222A33', accent: '#3A5A8C', accent2: '#8A98A8', gold: '#9AA4B0', display: F.space, body: F.dmsans, script: F.dmsans, radius: 2, wght: '700', ls: '0.18em', texture: 'none', pattern: 'grid', motif: 'none', kit: 'minimal', price: 16, r: 4.7, s: '900', tags: ['grid', 'blueprint', 'modern'] }),

  // ===== Celestial & Night =====
  mk({ id: 'celestial-night', name: 'Celestial Night', collection: 'celestial', blurb: 'A starlit sky strung with gold.', dark: true, paper: '#111634', section: '#171D40', card: '#1D2450', ink: '#EFEAD8', accent: '#C7A24B', accent2: '#9AA6E0', gold: '#C7A24B', display: F.cinzel, wght: '600', ls: '0.22em', foil: true, rsvp: '#C7A24B', rsvpInk: '#111634', texture: 'velvet', pattern: 'celestial', motif: 'sun', kit: 'deco', price: 24, r: 4.9, s: '2.6k', badges: { best: true }, tags: ['stars', 'celestial', 'gold'] }),
  mk({ id: 'midnight-stars', name: 'Midnight Stars', collection: 'celestial', blurb: 'Ink-blue night & quiet silver.', dark: true, paper: '#0F1830', section: '#15203E', card: '#1A2748', ink: '#ECEFF6', accent: '#7E8FC8', accent2: '#C2CADC', gold: '#C2CADC', display: F.italiana, ls: '0.2em', rsvp: '#C2CADC', rsvpInk: '#0F1830', texture: 'velvet', pattern: 'celestial', motif: 'none', kit: 'minimal', price: 20, r: 4.7, s: '1.0k', tags: ['night', 'silver', 'stars'] }),
  mk({ id: 'luna-rose', name: 'Luna Rose', collection: 'celestial', blurb: 'Moonlit mauve & rose-gold stars.', dark: true, paper: '#241A33', section: '#2E2340', card: '#352A4A', ink: '#F1EAE2', accent: '#A98BC8', accent2: '#D8A06A', gold: '#D8A06A', display: F.cormorant, foil: true, rsvp: '#D8A06A', rsvpInk: '#241A33', texture: 'velvet', pattern: 'celestial', motif: 'none', kit: 'deco', price: 20, r: 4.8, s: '1.3k', badges: { new: true }, tags: ['moon', 'mauve', 'rose-gold'] }),

  // ===== Whimsy & Fun =====
  mk({ id: 'confetti-pop', name: 'Confetti Pop', collection: 'whimsy', blurb: 'A burst of confetti, party-ready.', paper: '#FCF8F0', ink: '#33324A', accent: '#5A6ED0', accent2: '#E0709A', gold: '#E0A93C', display: F.dmserif, radius: 16, texture: 'none', pattern: 'confetti', motif: 'none', kit: 'ticket', price: 16, r: 4.8, s: '2.6k', badges: { best: true }, tags: ['confetti', 'party', 'multi'] }),
  mk({ id: 'sunshine-day', name: 'Sunshine Day', collection: 'whimsy', blurb: 'Big sun energy on butter yellow.', paper: '#FDF6E0', ink: '#5A3E1E', accent: '#E8A02E', accent2: '#E0708A', gold: '#E8A02E', display: F.fraunces, radius: 18, texture: 'kraft', pattern: 'dots', motif: 'sun', kit: 'scrapbook', price: 16, r: 4.7, s: '1.4k', tags: ['sun', 'yellow', 'happy'] }),
  mk({ id: 'retro-marquee', name: 'Retro Marquee', collection: 'whimsy', blurb: 'Diner-sign red with a marquee wink.', paper: '#FBF4EC', ink: '#5A1F22', accent: '#C73A3A', accent2: '#2E6BA0', gold: '#E0A82E', display: F.dmserif, radius: 8, texture: 'canvas', pattern: 'diagonal', motif: 'none', kit: 'ticket', price: 16, r: 4.6, s: '880', tags: ['retro', 'red', 'marquee'] }),
  mk({ id: 'citrus-grove', name: 'Citrus Grove', collection: 'whimsy', blurb: 'Orange slices & leafy green fun.', paper: '#FBF6E8', ink: '#3E4A2A', accent: '#E07A2E', accent2: '#5A8A3E', gold: '#E0A82E', display: F.fraunces, radius: 16, texture: 'watercolor', pattern: 'dots', motif: 'citrus', kit: 'scrapbook', price: 16, r: 4.7, s: '1.0k', badges: { new: true }, tags: ['citrus', 'orange', 'green'] }),

  // ===== New materials in classic collections =====
  mk({ id: 'sicilian-marble', name: 'Sicilian Marble', collection: 'med', blurb: 'Veined marble, charcoal & laurel.', paper: '#F4F2ED', ink: '#2C2C2A', accent: '#5A5A52', accent2: '#9A8A5A', gold: '#A8884E', display: F.cinzel, wght: '500', ls: '0.22em', texture: 'marble', motif: 'laurel', kit: 'deco', price: 20, r: 4.9, s: '1.8k', badges: { best: true }, tags: ['marble', 'laurel', 'classical'] }),
  mk({ id: 'palm-springs', name: 'Palm Springs', collection: 'coastal', blurb: 'Mid-century palms, pink & green.', paper: '#FBF4F2', ink: '#3E4A3A', accent: '#D06A8E', accent2: '#5A9A6E', gold: '#E0A24E', display: F.dmserif, radius: 12, texture: 'canvas', pattern: 'stripe', motif: 'palm', kit: 'ticket', price: 18, r: 4.8, s: '2.0k', badges: { best: true }, tags: ['palm', 'pink', 'retro'] }),
  mk({ id: 'riviera-shell', name: 'Riviera Shell', collection: 'coastal', blurb: 'Scalloped shells & soft aqua.', paper: '#F4F6F1', ink: '#2A4A48', accent: '#5F9A95', gold: '#C2A877', display: F.italiana, radius: 10, ls: '0.18em', texture: 'cotton', pattern: 'scallop', motif: 'shell', kit: 'arch', price: 18, r: 4.7, s: '1.1k', badges: { new: true }, tags: ['shell', 'aqua', 'scallop'] }),
  mk({ id: 'fern-press', name: 'Fern Press', collection: 'garden', blurb: 'Cyanotype ferns on cool paper.', paper: '#F2F4F0', ink: '#26342E', accent: '#3A5A4E', gold: '#9A9A60', display: F.ebgar, radius: 8, texture: 'paper', motif: 'fern', kit: 'classic', price: 16, r: 4.7, s: '940', tags: ['fern', 'green', 'botanical'] }),
  mk({ id: 'wheat-field', name: 'Wheat Field', collection: 'garden', blurb: 'Golden wheat on warm kraft.', paper: '#F7EFDF', ink: '#4A3A22', accent: '#B5823A', gold: '#D8A23C', display: F.fraunces, radius: 10, texture: 'kraft', pattern: 'dots', motif: 'wheat', kit: 'stamp', price: 16, r: 4.7, s: '820', badges: { new: true }, tags: ['wheat', 'gold', 'rustic'] }),
  mk({ id: 'laurel-ivory', name: 'Laurel & Ivory', collection: 'heritage', blurb: 'Marble, laurel & soft gold leaf.', paper: '#F6F3EC', ink: '#3A352C', accent: '#8A7A52', accent2: '#B5A06A', gold: '#B59A5E', display: F.cinzel, wght: '500', ls: '0.22em', texture: 'marble', motif: 'laurel', kit: 'deco', price: 20, r: 4.8, s: '1.2k', tags: ['laurel', 'marble', 'ivory'] }),
  mk({ id: 'bauhaus-primary', name: 'Bauhaus Primary', collection: 'modern', blurb: 'Primary blocks & confident geometry.', paper: '#F4F2EC', ink: '#1A1A1A', accent: '#2E5BC0', accent2: '#E0A82E', gold: '#D23A2E', display: F.space, body: F.dmsans, script: F.dmsans, radius: 0, wght: '700', ls: '0.14em', texture: 'none', pattern: 'deco', motif: 'none', kit: 'minimal', price: 18, r: 4.7, s: '1.0k', badges: { new: true }, tags: ['bauhaus', 'primary', 'geometric'] }),
  mk({ id: 'gilded-noir', name: 'Gilded Noir', collection: 'evening', blurb: 'Brushed gold leaf on deep black.', dark: true, paper: '#141414', section: '#1C1C1C', card: '#242424', ink: '#F0EDE2', accent: '#CDA349', accent2: '#CDA349', gold: '#CDA349', display: F.italiana, ls: '0.24em', foil: true, texture: 'gilded', motif: 'deco', kit: 'deco', rsvp: '#CDA349', rsvpInk: '#141414', price: 24, r: 4.9, s: '1.6k', tags: ['gold', 'black', 'gilded'] }),
] as const;

// ─── Lookup helpers ──────────────────────────────────────────

const PACK_INDEX: Map<string, Pack> = new Map(PACKS.map((p) => [p.id, p]));

/**
 * Find one pack by id. Returns undefined when missing — callers
 * decide whether to fall back to a default; the prototype's
 * `getPack()` silently returned the first pack instead, which
 * is a foot-gun in a typed world.
 */
export function getPackById(id: string): Pack | undefined {
  return PACK_INDEX.get(id);
}

/**
 * Return all packs in a collection in their catalog order.
 */
export function packsByCollection(slug: CollectionId): readonly Pack[] {
  return PACKS.filter((p) => p.collection === slug);
}

/**
 * Mirrors the prototype's `dividerForMotif` helper — chooses a
 * divider visual (sprig/brush/dot/rule) for a given motif so
 * the QuickLook + section dividers stay in lockstep.
 */
export function dividerForMotif(motif: Motif): 'sprig' | 'brush' | 'dot' | 'rule' {
  switch (motif) {
    case 'olive':
      return 'sprig';
    case 'bloom':
      return 'brush';
    case 'pressed':
      return 'dot';
    default:
      return 'rule';
  }
}

/**
 * Convenience predicate — used by entitlements to mark free
 * packs as owned without writing a row.
 */
export function isPackFree(id: string): boolean {
  const pack = PACK_INDEX.get(id);
  return pack ? pack.tier === 'free' : false;
}

/** All free pack ids (used by getUserEntitlements implicit-ownership pass). */
export const FREE_PACK_IDS: readonly string[] = PACKS.filter((p) => p.tier === 'free').map(
  (p) => p.id,
);
