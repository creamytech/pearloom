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
  /* 2026-06-09 premium faces — loaded by <StoreFonts /> in
     lib/theme-store/fonts.tsx alongside the rest of the catalog. */
  bodoni: "'Bodoni Moda', Georgia, serif",
  prata: "'Prata', Georgia, serif",
  gilda: "'Gilda Display', Georgia, serif",
  jost: "'Jost', sans-serif",
} as const;

const S = {
  caveat: "'Caveat', cursive",
  dancing: "'Dancing Script', cursive",
  pinyon: "'Pinyon Script', cursive",
  greatvibes: "'Great Vibes', cursive",
  parisienne: "'Parisienne', cursive",
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
  | 'none'
  /* ── PACK-EXCLUSIVE materials (2026-06-13) — absent from the
     editor's and fitting room's texture pickers. */
  | 'silk'     // moiré silk sheen
  | 'flecked'  // gold-leaf flecks on bond
  | 'washi'    // fibrous rice paper
  | 'slate'    // honed dark stone wash
  | 'tweed';   // woven flecked wool

/** Exclusive material set — store UI badges these. */
export const EXCLUSIVE_TEXTURES: ReadonlySet<Texture> = new Set(['silk', 'flecked', 'washi', 'slate', 'tweed'] as Texture[]);

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
  | 'none'
  /* ── PACK-EXCLUSIVE patterns (2026-06-13). */
  | 'trellis'     // garden lattice diamonds
  | 'swiss-dot'   // tiny embroidered dotted swiss
  | 'herringbone' // woven chevron weave
  | 'sunray';     // radiating deco sunrise

/** Exclusive pattern set — store UI badges these. */
export const EXCLUSIVE_PATTERNS: ReadonlySet<Pattern> = new Set(['trellis', 'swiss-dot', 'herringbone', 'sunray'] as Pattern[]);

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
  /* PACK-EXCLUSIVE glyphs — see MotifScatter PACK_MOTIF_KINDS. */
  | 'chandelier'
  | 'bow'
  | 'sparkler'
  /* 2026-06-09 collection — ids match MotifKind in
     src/components/pearloom/site/MotifScatter.tsx verbatim, so
     MOTIF_CANVAS_MAP needs no entry for them. */
  | 'magnolia'
  | 'gingko'
  | 'champagne'
  | 'lantern'
  | 'compass'
  | 'peony'
  | 'vine'
  | 'starburst'
  | 'ribbon'
  | 'hummingbird'
  /* Collection II (2026-06-09). */
  | 'orchid'
  | 'monstera'
  | 'holly'
  | 'cherry-blossom'
  | 'anchor'
  | 'disco'
  /* Canvas kinds the catalog can now reference (2026-06-13). */
  | 'wave-curl'
  | 'crescent'
  | 'none';

export type Kit =
  | 'classic'
  | 'plate'
  | 'scrapbook'
  | 'minimal'
  | 'ticket'
  | 'arch'
  | 'stamp'
  | 'deco'
  | 'gallery'
  | 'menu'
  | 'glass'
  /* ── PACK-EXCLUSIVE kits (2026-06-13) — never listed by the
     editor's or fitting room's kit pickers; the only way to wear
     one is to apply (and own) a pack that carries it. That's the
     store's value: looks the free settings can't reproduce. */
  | 'gilt'
  | 'atelier'
  | 'cabinet'
  | 'scallop'
  | 'noir';

/** The exclusive set — store UI badges these "only with this pack". */
export const EXCLUSIVE_KITS: ReadonlySet<Kit> = new Set(['gilt', 'atelier', 'cabinet', 'scallop', 'noir'] as Kit[]);

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
  /** Explicit divider look — pack-exclusive looks ('gilt-chain',
   *  'stitch-seam', 'marquee-bulbs', 'crystal-drops') override the
   *  motif-derived divider. Optional; most packs derive. */
  divider?: string;
  /** Pack-set monogram frame — exclusive frames ('gilt',
   *  'bow-crest', 'marquee') only arrive this way. */
  monogramFrame?: string;
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
  divider?: string;
  monogramFrame?: string;
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
    divider: o.divider,
    monogramFrame: o.monogramFrame,
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

// ─── Packs (70) — STORE_PACKS port + the 2026-06-09 collections ─

export const PACKS: readonly Pack[] = [
  // ===== The Glasshouse — liquid glass, signature =====
  mk({ id: 'glasshouse', name: 'The Glasshouse', collection: 'celestial', blurb: 'Liquid-glass panes floating on aurora light, midnight paper, moonstone ink, your palette glowing through every card.', paper: '#15131C', ink: '#F2EEF8', accent: '#8FA8E8', gold: '#D4B373', section: '#1B1826', card: '#211D2E', inkSoft: '#C9C2DC', inkMuted: '#8E86A6', accent2: '#C490C8', accentBg: '#2A2540', accentInk: '#0E0C14', line: 'rgba(242,238,248,0.16)', display: F.italiana, body: F.inter, radius: 16, wght: '400', ls: '0.10em', heroScale: 1.12, texture: 'none', pattern: 'none', motif: 'none', kit: 'glass', swatches: ['#15131C', '#8FA8E8', '#C490C8', '#D4B373'], price: 24, r: 5.0, s: 'New', tags: ['glass', 'liquid', 'aurora', 'midnight', 'luminous', 'signature'] }),

  // ===== Editorial Cream & Quiet =====
  mk({ id: 'modern-editorial', name: 'Modern Editorial', collection: 'modern', blurb: 'Magazine-clean cream, crisp Inter labels, charcoal ink, the masthead of a slow weekend read.', paper: '#F4F3EF', ink: '#1A1A17', accent: '#1A1A17', gold: '#A89578', inkSoft: '#3A3A36', inkMuted: '#6C6B65', accent2: '#5A5A55', line: '#D9D6CE', display: F.inter, body: F.inter, radius: 2, wght: '600', ls: '0.04em', texture: 'paper', pattern: 'none', motif: 'none', kit: 'minimal', swatches: ['#F4F3EF', '#1A1A17', '#A89578', '#5A5A55'], price: 0, r: 4.8, s: '2.4k', tags: ['editorial', 'modern', 'minimal', 'magazine'] }),
  mk({ id: 'noir-matte', name: 'Noir Matte', collection: 'modern', blurb: 'A whisper of warmth under matte black ink, confident, geometric, set in Space Grotesk.', paper: '#F2F1EC', ink: '#141414', accent: '#141414', gold: '#8C8780', inkSoft: '#2E2E2C', inkMuted: '#5E5E59', accent2: '#3D3D3A', line: '#D2CFC7', display: F.space, body: F.dmsans, radius: 0, wght: '500', ls: '0.26em', texture: 'none', pattern: 'none', motif: 'none', kit: 'noir', swatches: ['#F2F1EC', '#141414', '#8C8780', '#3D3D3A'], divider: 'marquee-bulbs', price: 16, r: 4.9, s: '1.8k', tags: ['modern', 'noir', 'minimal', 'geometric'] }),
  mk({ id: 'mono-press', name: 'Mono Press', collection: 'modern', blurb: 'Warm-grey ink on a press-sheet paper, Tenor Sans, hand-set rules, nothing extra.', paper: '#F1F1EF', ink: '#1F1F1C', accent: '#5A5A55', gold: '#9A8E7A', inkSoft: '#3C3C39', inkMuted: '#6E6E69', accent2: '#7D7B73', line: '#D5D2CA', display: F.tenor, body: F.dmsans, radius: 1, wght: '400', ls: '0.12em', texture: 'paper', pattern: 'grid', motif: 'none', kit: 'plate', swatches: ['#F1F1EF', '#1F1F1C', '#5A5A55', '#7D7B73'], price: 0, r: 4.7, s: '1.2k', tags: ['editorial', 'modern', 'monochrome', 'press'] }),
  mk({ id: 'ivory-minimal', name: 'Ivory Minimal', collection: 'modern', blurb: 'Soft ivory with a sun-warmed taupe, Italiana stretched tall, paper bare and quiet.', paper: '#F8F6F0', ink: '#1C1A15', accent: '#A89578', gold: '#C9B68F', inkSoft: '#3B3830', inkMuted: '#6D6A60', accent2: '#8D7B5F', accentBg: '#EAE2D2', line: '#E0DACC', display: F.italiana, body: F.inter, radius: 3, wght: '400', ls: '0.08em', heroScale: 1.08, texture: 'paper', pattern: 'none', motif: 'none', kit: 'atelier', swatches: ['#F8F6F0', '#1C1A15', '#A89578', '#8D7B5F'], price: 18, r: 4.9, s: '2.1k', tags: ['minimal', 'ivory', 'elegant', 'modern'] }),
  mk({ id: 'aegean-whitewash', name: 'Aegean Whitewash', collection: 'med', blurb: 'Whitewashed plaster paper with a cool slate-blue accent, a Cycladic afternoon, distilled.', paper: '#F7F5F0', ink: '#16213A', accent: '#2E5BA8', gold: '#B8A87E', inkSoft: '#2B3852', inkMuted: '#5E6A82', accent2: '#4A75BC', accentBg: '#DCE5F3', accentInk: '#FFFFFF', line: '#DAD5C8', display: F.marcellus, body: F.inter, radius: 2, wght: '400', ls: '0.06em', texture: 'washi', pattern: 'none', motif: 'none', kit: 'minimal', swatches: ['#F7F5F0', '#16213A', '#2E5BA8', '#B8A87E'], price: 18, r: 4.8, s: '1.6k', tags: ['mediterranean', 'aegean', 'coastal', 'minimal'] }),

  // ===== Garden & Botanical =====
  mk({ id: 'pressed-garden', name: 'Pressed Garden', collection: 'garden', blurb: 'Sage leaves pressed between linen pages, quiet, herbarium-soft.', paper: '#F7F8F2', ink: '#2A3328', accent: '#6E8A6A', gold: '#B8935A', section: '#FDFAF0', card: '#FFFFFF', inkSoft: '#4A5444', inkMuted: '#7A8474', accentBg: '#E0DDC9', line: '#D4D8C6', display: F.fraunces, body: F.inter, radius: 10, texture: 'paper', motif: 'pressed', kit: 'classic', price: 0, r: 4.9, s: '3.4k', tags: ['garden', 'sage', 'pressed', 'herbarium', 'botanical'] }),
  mk({ id: 'english-rose', name: 'English Rose', collection: 'garden', blurb: 'Soft pink blooms on cream, a cottage garden in full bloom.', paper: '#FDFAF0', ink: '#3A2832', accent: '#C66B7C', gold: '#C9A769', section: '#F8EFE8', card: '#FFFFFF', inkSoft: '#5A4450', inkMuted: '#8A7480', accentBg: '#F3D8DE', line: '#E8D4D0', display: F.cormorant, body: F.inter, script: S.dancing, radius: 12, texture: 'paper', motif: 'bow', kit: 'classic', monogramFrame: 'bow-crest', price: 18, r: 4.8, s: '2.1k', tags: ['garden', 'rose', 'pink', 'cottage', 'bloom'] }),
  mk({ id: 'eucalyptus-press', name: 'Eucalyptus Press', collection: 'garden', blurb: 'Silvered sage stems on soft paper, a cool, dusty bouquet.', paper: '#F7F8F2', ink: '#2C342E', accent: '#7A9078', gold: '#B8935A', section: '#EFF1EA', card: '#FDFAF0', inkSoft: '#4C544E', inkMuted: '#7C847E', accent2: '#9CB09A', accentBg: '#E0DDC9', line: '#D2D8CE', display: F.fraunces, body: F.inter, radius: 10, texture: 'washi', motif: 'pressed', kit: 'classic', price: 16, r: 4.9, s: '1.8k', tags: ['garden', 'eucalyptus', 'silver-sage', 'stems', 'dusty'] }),
  mk({ id: 'wildflower-meadow', name: 'Wildflower Meadow', collection: 'garden', blurb: 'Scattered blooms in mauve and rose, an unkempt, joyful field.', paper: '#FDFAF0', ink: '#3A2C38', accent: '#C98AA8', gold: '#C9A769', section: '#F6ECEF', card: '#FFFFFF', inkSoft: '#5C4858', inkMuted: '#8C7888', accent2: '#D9A4BC', accentBg: '#F0DCE5', line: '#E6D8DE', display: F.fraunces, body: F.inter, script: S.caveat, radius: 12, texture: 'cotton', motif: 'bloom', kit: 'scrapbook', pattern: 'swiss-dot', price: 18, r: 4.8, s: '1.5k', tags: ['garden', 'wildflower', 'meadow', 'mauve', 'scattered'] }),
  mk({ id: 'herb-garden', name: 'Herb Garden', collection: 'garden', blurb: 'Olive, thyme, rosemary, the kitchen garden at quiet noon.', paper: '#F7F8F2', ink: '#2A3024', accent: '#6B7A4E', gold: '#B8935A', section: '#EEF0E6', card: '#FDFAF0', inkSoft: '#4A5040', inkMuted: '#7A806E', accent2: '#8C9A6E', accentBg: '#DDE0CA', line: '#D0D4C2', display: F.marcellus, body: F.inter, radius: 8, texture: 'cotton', motif: 'olive', kit: 'minimal', pattern: 'trellis', price: 16, r: 4.8, s: '1.6k', tags: ['garden', 'herb', 'olive', 'thyme', 'kitchen'] }),
  mk({ id: 'botanical-ink', name: 'Botanical Ink', collection: 'garden', blurb: 'Deep forest ferns inked on cotton, the herbarium plate edition.', paper: '#F7F8F2', ink: '#1F2A22', accent: '#2F5A3E', gold: '#B8935A', section: '#E8ECE2', card: '#FDFAF0', inkSoft: '#3E4A40', inkMuted: '#6A746C', accent2: '#4A7A5C', accentBg: '#D4DCCE', line: '#C8D0C0', display: F.cormorant, body: F.inter, radius: 8, wght: '500', texture: 'paper', motif: 'fern', kit: 'plate', price: 18, r: 4.9, s: '1.2k', badges: { best: true }, tags: ['garden', 'botanical', 'ink', 'forest', 'herbarium'] }),
  mk({ id: 'fern-press', name: 'Fern Press', collection: 'garden', blurb: 'Cyanotype fronds in blue-green, Anna Atkins\' garden, reprinted.', paper: '#F7F8F2', ink: '#1F3028', accent: '#3A5A4E', gold: '#B8935A', section: '#E6EEE8', card: '#FDFAF0', inkSoft: '#3C4E46', inkMuted: '#6A786E', accent2: '#5C7A6E', accentBg: '#D4E0D8', line: '#C8D4CC', display: F.fraunces, body: F.inter, radius: 10, texture: 'paper', motif: 'fern', kit: 'classic', price: 16, r: 4.8, s: '1.4k', tags: ['garden', 'fern', 'cyanotype', 'blue-green', 'press'] }),

  // ===== Coastal & Nautical =====
  mk({ id: 'santorini-linen', name: 'Santorini Linen', collection: 'med', blurb: 'Whitewashed walls and Aegean blue, olive sprigs against sea-bleached linen.', paper: '#F5F1E8', ink: '#1F2A35', accent: '#3F6E92', gold: '#C9A765', motif: 'olive', kit: 'plate', texture: 'linen', display: F.cormorant, wght: '500', ls: '0.22em', price: 18, tags: ['mediterranean', 'aegean', 'olive', 'linen', 'coastal'] }),
  mk({ id: 'coastal-ink', name: 'Coastal Ink', collection: 'coastal', blurb: 'Harbor navy on bone paper, pared-back stationery for the seaside formal.', paper: '#EAE5D7', ink: '#15212C', accent: '#1F3A4D', gold: '#B89968', motif: 'wave-curl', kit: 'minimal', texture: 'cotton', display: F.fraunces, wght: '500', ls: '0.2em', price: 16, tags: ['coastal', 'navy', 'minimal', 'harbor', 'formal'] }),
  mk({ id: 'sea-glass', name: 'Sea Glass', collection: 'coastal', blurb: 'Soft seafoam wash and weathered shells, arched cards like beach-worn glass.', paper: '#EFEBDD', ink: '#1F3936', accent: '#5F9A95', gold: '#C2A56E', motif: 'shell', kit: 'arch', texture: 'cotton', display: F.fraunces, wght: '500', radius: 14, price: 16, tags: ['coastal', 'seafoam', 'shell', 'arch', 'beach'] }),
  mk({ id: 'dune-driftwood', name: 'Dune & Driftwood', collection: 'coastal', blurb: 'Sun-bleached driftwood tones with palm shadows, quiet shoreline elegance.', paper: '#EDE6D4', ink: '#2A2218', accent: '#9C8463', gold: '#B89968', motif: 'palm', kit: 'plate', texture: 'cotton', display: F.cormorant, wght: '500', ls: '0.22em', price: 16, tags: ['coastal', 'driftwood', 'palm', 'neutral', 'dune'] }),
  mk({ id: 'harbor-navy', name: 'Harbor Navy', collection: 'coastal', blurb: 'Deep harbor navy on cotton paper, yacht-club formal with gold-rule hairlines.', paper: '#EAE5D7', ink: '#101B28', accent: '#26456A', gold: '#CDAA6A', motif: 'none', kit: 'plate', texture: 'linen', display: F.cinzel, wght: '500', ls: '0.26em', pattern: 'stripe', price: 18, tags: ['coastal', 'navy', 'harbor', 'formal', 'yacht'] }),
  mk({ id: 'shell-blush', name: 'Shell Blush', collection: 'coastal', blurb: 'Seafoam wash on sand paper with scallop-shell motifs, arches like tidepools.', paper: '#F2EDDF', ink: '#1F3833', accent: '#6FA8A0', gold: '#C7A971', motif: 'shell', kit: 'classic', texture: 'cotton', display: F.fraunces, wght: '500', radius: 16, price: 0, tags: ['coastal', 'shell', 'seafoam', 'scallop', 'beach'] }),
  mk({ id: 'palm-springs', name: 'Palm Springs', collection: 'coastal', blurb: 'Retro pink on cabana stripes, palm shadows, ticket cards, poolside ease.', paper: '#F6F1E7', ink: '#2A1820', accent: '#D06A8E', gold: '#D4A85E', motif: 'palm', kit: 'ticket', texture: 'cotton', pattern: 'cabana', display: F.dmserif, wght: '500', radius: 10, price: 18, tags: ['coastal', 'palm', 'retro', 'cabana', 'pink'] }),

  // ===== Mediterranean =====
  mk({ id: 'amalfi-lemon', name: 'Amalfi Lemon', collection: 'med', blurb: 'Lemon groves spilling over a sun-warmed coast.', paper: '#FBF7EC', ink: '#2C5E72', accent: '#E0A92E', gold: '#C2A165', accent2: '#F1D27A', accentBg: '#F8EBC3', display: F.playfair, body: F.inter, script: S.caveat, radius: 14, wght: '600', heroScale: 1.1, ls: '0.18em', texture: 'watercolor', pattern: 'scallop', motif: 'citrus', kit: 'scallop', price: 18, r: 4.8, s: '2.1k', tags: ['lemon', 'italy', 'yellow', 'citrus', 'amalfi', 'mediterranean'] }),
  mk({ id: 'mallorca-terracotta', name: 'Mallorca Terracotta', collection: 'med', blurb: 'Sun-baked clay, olive shade, low afternoon light.', paper: '#FBF7EC', ink: '#3A2A20', accent: '#C26A41', gold: '#C2A165', accent2: '#E3A480', accentBg: '#F1D6C2', section: '#F2EAD8', display: F.cormorant, body: F.inter, script: S.caveat, radius: 10, wght: '600', heroScale: 1.14, ls: '0.2em', texture: 'cotton', pattern: 'terrazzo', motif: 'olive', kit: 'plate', price: 18, r: 4.8, s: '1.8k', tags: ['terracotta', 'clay', 'olive', 'spain', 'mallorca', 'mediterranean'] }),
  mk({ id: 'cinque-terre', name: 'Cinque Terre', collection: 'med', blurb: 'Coral villages stacked above a quiet harbor.', paper: '#FBF7EC', ink: '#2E4A52', accent: '#D96A4A', gold: '#C2A165', accent2: '#EFA68A', accentBg: '#F5D5C5', display: F.marcellus, body: F.inter, script: S.caveat, radius: 12, wght: '600', heroScale: 1.12, ls: '0.2em', texture: 'watercolor', pattern: 'stripe', motif: 'bloom', kit: 'ticket', price: 0, r: 4.7, s: '1.3k', tags: ['coral', 'italy', 'harbor', 'village', 'cinque-terre', 'mediterranean'] }),
  mk({ id: 'sicilian-marble', name: 'Sicilian Marble', collection: 'med', blurb: 'Veined stone, old laurel, and slow afternoons.', paper: '#FBF7EC', ink: '#2D2D28', accent: '#5A5A52', gold: '#C2A165', accent2: '#9C9C92', accentBg: '#DCDBD2', section: '#F0ECDF', card: '#FFFFFF', display: F.cinzel, body: F.inter, script: S.caveat, radius: 8, wght: '600', heroScale: 1.16, ls: '0.24em', foil: true, texture: 'marble', pattern: 'none', motif: 'laurel', kit: 'deco', price: 22, r: 4.9, s: '1.6k', badges: { best: true }, tags: ['marble', 'stone', 'laurel', 'sicily', 'italy', 'mediterranean', 'classical'] }),

  // ===== Watercolor & Painterly =====
  mk({ id: 'tuscan-watercolor', name: 'Tuscan Watercolor', collection: 'watercolor', blurb: 'Sun-warmed terracotta washes, a sunlit afternoon in Montepulciano.', paper: '#FBF1E4', ink: '#3A1F12', accent: '#C2693E', gold: '#B8893E', inkSoft: '#5C3A26', accent2: '#D89576', display: F.cormorant, body: F.inter, texture: 'watercolor', pattern: 'none', motif: 'bloom', kit: 'scrapbook', radius: 16, wght: '500', ls: '0.14em', price: 18, r: 4.9, s: '2.4k', tags: ['watercolor', 'terracotta', 'tuscan', 'warm', 'rustic'] }),
  mk({ id: 'indigo-wash', name: 'Indigo Wash', collection: 'watercolor', blurb: 'Bleeding indigo on cool rag paper, quiet ink, considered margin.', paper: '#F4F2EC', ink: '#1A2240', accent: '#3A4E8C', gold: '#A89466', inkSoft: '#3A4566', accent2: '#7588B8', display: F.fraunces, body: F.inter, texture: 'watercolor', pattern: 'none', motif: 'wave-curl', kit: 'minimal', radius: 14, wght: '500', ls: '0.20em', price: 16, r: 4.8, s: '1.6k', tags: ['watercolor', 'indigo', 'blue', 'minimal', 'modern'], badges: { new: true } }),
  mk({ id: 'peony-dusk', name: 'Peony Dusk', collection: 'watercolor', blurb: 'Plum peonies bleeding at the edges, gentle, romantic, classical.', paper: '#F8F0EC', ink: '#3C1F33', accent: '#9C5E84', gold: '#BFA15E', inkSoft: '#5E3850', accent2: '#C892B0', accentBg: '#EFD9E4', display: F.cormorant, body: F.inter, texture: 'watercolor', pattern: 'none', motif: 'peony', kit: 'classic', radius: 18, wght: '500', ls: '0.16em', price: 18, r: 4.9, s: '3.1k', tags: ['watercolor', 'peony', 'plum', 'romantic', 'classic'], badges: { best: true } }),
  mk({ id: 'sage-watercolor', name: 'Sage Watercolor', collection: 'watercolor', blurb: 'Soft sage leaves washed across cream, calm, garden-fresh, free to weave.', paper: '#F5F2E8', ink: '#2A3324', accent: '#7E8F6E', gold: '#B8935A', inkSoft: '#4A5640', accent2: '#A8B59A', display: F.fraunces, body: F.inter, texture: 'watercolor', pattern: 'none', motif: 'fern', kit: 'classic', radius: 16, wght: '500', ls: '0.16em', price: 0, r: 4.8, s: '5.4k', tags: ['watercolor', 'sage', 'green', 'garden', 'free'] }),
  mk({ id: 'golden-hour', name: 'Golden Hour', collection: 'watercolor', blurb: 'Honey-gold washes at sundown, burnished, festive, just before dusk.', paper: '#FBF4E2', ink: '#3A2A12', accent: '#D49A4A', gold: '#C68A3A', inkSoft: '#5E4626', accent2: '#E8C078', accentBg: '#F4E2B8', display: F.fraunces, body: F.inter, texture: 'silk', pattern: 'none', motif: 'sun', kit: 'classic', radius: 16, wght: '600', ls: '0.18em', price: 18, r: 4.9, s: '2.8k', foil: true, tags: ['watercolor', 'gold', 'amber', 'warm', 'sunset', 'foil'] }),
  mk({ id: 'blush-bloom', name: 'Blush Bloom', collection: 'watercolor', blurb: 'Petals of blush on rice paper, the lightest hand, the softest edge.', paper: '#FBF2EE', ink: '#3E1F26', accent: '#D08A92', gold: '#B89868', inkSoft: '#603040', accent2: '#E8B5BA', accentBg: '#F5DCDF', display: F.cormorant, body: F.inter, script: S.pinyon, texture: 'watercolor', pattern: 'none', motif: 'bow', kit: 'scrapbook', radius: 18, wght: '500', ls: '0.14em', price: 16, r: 4.8, s: '3.6k', tags: ['watercolor', 'blush', 'pink', 'soft', 'romantic'] }),

  // ===== Midnight / Velvet / Evening =====
  mk({ id: 'midnight-velvet', name: 'Midnight Velvet', collection: 'evening', blurb: 'Mauve champagne on inky velvet, a midnight ballroom pressed flat.', paper: '#1A1B2E', section: '#20223A', card: '#262842', ink: '#F1ECDC', inkSoft: '#C9C2B2', inkMuted: '#8E8978', accent: '#B9A6E0', accent2: '#C9A24B', accentBg: '#2C2A48', accentInk: '#F4ECFF', gold: '#D4B373', line: 'rgba(241,236,220,0.18)', display: F.fraunces, body: F.inter, script: S.caveat, radius: 6, wght: '500', ls: '0.22em', dark: true, foil: true, texture: 'velvet', pattern: 'none', motif: 'chandelier', kit: 'plate', swatches: ['#1A1B2E', '#B9A6E0', '#C9A24B', '#F1ECDC'], divider: 'crystal-drops', price: 24, r: 4.9, s: '1.4k', tags: ['midnight', 'velvet', 'mauve', 'champagne', 'foil', 'ballroom'] }),
  mk({ id: 'emerald-noir', name: 'Emerald Noir', collection: 'evening', blurb: 'Emerald cut into velvet black, a tuxedoed garden after midnight.', paper: '#1A1B2E', section: '#20223A', card: '#262842', ink: '#F1ECDC', inkSoft: '#C9C2B2', inkMuted: '#8E8978', accent: '#3FA37A', accent2: '#7BC4A2', accentBg: '#1F3A30', accentInk: '#E8F6EE', gold: '#CDA349', line: 'rgba(241,236,220,0.18)', display: F.cinzel, body: F.inter, script: S.caveat, radius: 4, wght: '500', ls: '0.26em', dark: true, foil: true, texture: 'velvet', pattern: 'none', motif: 'deco', kit: 'noir', swatches: ['#1A1B2E', '#3FA37A', '#CDA349', '#F1ECDC'], price: 24, r: 4.9, s: '1.2k', tags: ['emerald', 'noir', 'velvet', 'tuxedo', 'foil', 'deco'] }),
  mk({ id: 'bordeaux-velvet', name: 'Bordeaux Velvet', collection: 'evening', blurb: 'Wine rose against velvet midnight, a candlelit cellar in bloom.', paper: '#1A1B2E', section: '#20223A', card: '#262842', ink: '#F1ECDC', inkSoft: '#C9C2B2', inkMuted: '#8E8978', accent: '#B45A72', accent2: '#D8A06A', accentBg: '#3A2030', accentInk: '#F8E6EC', gold: '#D8A06A', line: 'rgba(241,236,220,0.18)', display: F.fraunces, body: F.inter, script: S.pinyon, radius: 8, wght: '500', ls: '0.20em', dark: true, foil: true, texture: 'silk', pattern: 'none', motif: 'none', kit: 'plate', swatches: ['#1A1B2E', '#B45A72', '#D8A06A', '#F1ECDC'], divider: 'gilt-chain', price: 24, r: 4.8, s: '1.0k', tags: ['bordeaux', 'wine', 'rose', 'velvet', 'rose-gold', 'foil'] }),
  mk({ id: 'obsidian-gold', name: 'Obsidian Gold', collection: 'evening', blurb: 'Pure leaf gold pressed onto obsidian, restraint with one bright glint.', paper: '#1A1B2E', section: '#20223A', card: '#262842', ink: '#F1ECDC', inkSoft: '#C9C2B2', inkMuted: '#8E8978', accent: '#CDA349', accent2: '#E5C77E', accentBg: '#2E2818', accentInk: '#F9E9C0', gold: '#CDA349', line: 'rgba(241,236,220,0.20)', display: F.italiana, body: F.inter, script: S.caveat, radius: 2, wght: '400', ls: '0.28em', dark: true, foil: true, texture: 'velvet', pattern: 'none', motif: 'chandelier', kit: 'gilt', swatches: ['#1A1B2E', '#CDA349', '#E5C77E', '#F1ECDC'], divider: 'crystal-drops', monogramFrame: 'gilt', price: 24, r: 5, s: '2.1k', tags: ['obsidian', 'gold', 'leaf', 'minimal', 'foil', 'restrained'] }),
  mk({ id: 'sapphire-evening', name: 'Sapphire Evening', collection: 'evening', blurb: 'Dusty sapphire on velvet night, finished in cool silver.', paper: '#1A1B2E', section: '#20223A', card: '#262842', ink: '#F1ECDC', inkSoft: '#C9C2B2', inkMuted: '#8E8978', accent: '#6E8CCB', accent2: '#B9C2D6', accentBg: '#22304A', accentInk: '#E6EEFB', gold: '#B9C2D6', line: 'rgba(241,236,220,0.16)', display: F.marcellus, body: F.inter, script: S.caveat, radius: 2, wght: '400', ls: '0.24em', dark: true, foil: false, texture: 'slate', pattern: 'none', motif: 'crescent', kit: 'minimal', swatches: ['#1A1B2E', '#6E8CCB', '#B9C2D6', '#F1ECDC'], price: 20, r: 4.8, s: '880', tags: ['sapphire', 'blue', 'silver', 'evening', 'velvet', 'minimal'] }),
  mk({ id: 'plum-champagne', name: 'Plum & Champagne', collection: 'evening', blurb: 'Soft plum coupled with champagne, a quiet toast in low light.', paper: '#1A1B2E', section: '#20223A', card: '#262842', ink: '#F1ECDC', inkSoft: '#C9C2B2', inkMuted: '#8E8978', accent: '#A483C0', accent2: '#D9C29A', accentBg: '#2D2440', accentInk: '#EFE6F6', gold: '#D9C29A', line: 'rgba(241,236,220,0.18)', display: F.playfair, body: F.inter, script: S.dancing, radius: 8, wght: '500', ls: '0.20em', dark: true, foil: true, texture: 'velvet', pattern: 'none', motif: 'deco', kit: 'gilt', swatches: ['#1A1B2E', '#A483C0', '#D9C29A', '#F1ECDC'], divider: 'gilt-chain', price: 22, r: 4.9, s: '1.3k', tags: ['plum', 'champagne', 'toast', 'velvet', 'foil', 'evening'] }),

  // ===== Heritage / Deco / Letterpress =====
  mk({ id: 'art-deco-gatsby', name: 'Art Deco Gatsby', collection: 'heritage', blurb: 'Onyx and gilt, fan-rays, foil rules, a roaring twenties press.', paper: '#15161A', ink: '#F4EAD2', accent: '#CBA14A', gold: '#CBA14A', accent2: '#E6C879', accentBg: '#2A2316', accentInk: '#15161A', line: '#3A2F18', display: F.cinzel, body: F.tenor, ls: '0.14em', wght: '600', radius: 2, dark: true, foil: true, texture: 'gilded', pattern: 'sunray', motif: 'deco', kit: 'deco', swatches: ['#15161A', '#CBA14A', '#E6C879', '#2A2316'], price: 24, r: 4.9, s: '2.4k', tags: ['deco', 'gatsby', 'foil', 'noir', 'twenties'] }),
  mk({ id: 'gilded-noir', name: 'Gilded Noir', collection: 'heritage', blurb: 'Midnight paper under hand-laid gilt, quiet evening formality.', paper: '#15161A', ink: '#EFE6D0', accent: '#CDA349', gold: '#CDA349', accent2: '#B58A38', accentBg: '#241D11', accentInk: '#15161A', line: '#33291A', display: F.italiana, body: F.tenor, ls: '0.10em', wght: '500', radius: 4, dark: true, foil: true, texture: 'gilded', pattern: 'none', motif: 'deco', kit: 'gilt', swatches: ['#15161A', '#CDA349', '#B58A38', '#EFE6D0'], divider: 'gilt-chain', monogramFrame: 'gilt', price: 22, r: 4.8, s: '1.8k', tags: ['noir', 'gilt', 'evening', 'formal', 'foil'] }),
  mk({ id: 'victorian-press', name: 'Victorian Press', collection: 'heritage', blurb: 'Sepia stock and burgundy ink, a parlour invitation pressed yesterday.', paper: '#F3EAD8', ink: '#2A1414', accent: '#7C3B3B', gold: '#B8935A', accent2: '#A86060', accentBg: '#EFDCDC', accentInk: '#FFFFFF', line: '#D9C7AE', display: F.playfair, body: F.ebgar, script: S.pinyon, ls: '0.04em', wght: '500', radius: 3, foil: true, texture: 'paper', pattern: 'swiss-dot', motif: 'pressed', kit: 'cabinet', swatches: ['#F3EAD8', '#7C3B3B', '#B8935A', '#2A1414'], monogramFrame: 'gilt', price: 20, r: 4.8, s: '1.5k', tags: ['victorian', 'letterpress', 'burgundy', 'sepia', 'parlour'] }),
  mk({ id: 'laurel-ivory', name: 'Laurel Ivory', collection: 'heritage', blurb: 'Marble-cream stock crowned by warm taupe laurels, quiet ceremony.', paper: '#F6F3EC', ink: '#2B2418', accent: '#8A7A52', gold: '#CBA14A', accent2: '#A89570', accentBg: '#EFE8D6', accentInk: '#FFFFFF', line: '#DED5BE', display: F.cinzel, body: F.marcellus, ls: '0.12em', wght: '500', radius: 3, foil: true, texture: 'silk', pattern: 'none', motif: 'laurel', kit: 'deco', swatches: ['#F6F3EC', '#8A7A52', '#CBA14A', '#2B2418'], price: 20, r: 4.9, s: '1.9k', tags: ['laurel', 'marble', 'ceremony', 'ivory', 'taupe'] }),
  mk({ id: 'old-world-map', name: 'Old World Map', collection: 'heritage', blurb: 'Parchment, saddle ink, and a hand-drawn laurel, an explorer\'s invitation.', paper: '#F1E7D2', ink: '#2E2113', accent: '#8A5A33', gold: '#B8935A', accent2: '#A97A4F', accentBg: '#EBD9BD', accentInk: '#FFFFFF', line: '#D9C6A4', display: F.marcellus, body: F.ebgar, script: S.caveat, ls: '0.06em', wght: '500', radius: 4, texture: 'washi', pattern: 'none', motif: 'laurel', kit: 'cabinet', swatches: ['#F1E7D2', '#8A5A33', '#B8935A', '#2E2113'], price: 18, r: 4.7, s: '1.2k', tags: ['parchment', 'map', 'explorer', 'saddle', 'cotton'] }),

  // ===== Pastel / Whimsy =====
  mk({ id: 'provence-lavender', name: 'Provence Lavender', collection: 'whimsy', blurb: 'Dried lavender bundles in a sun-bleached farmhouse, soft mauve over warm chalk, with herbarium pressings tucked between the pages.', paper: '#FAF6F0', ink: '#4A3F5C', accent: '#8B7BB0', gold: '#C9A961', accent2: '#B8A8D4', accentBg: '#EDE6F3', accentInk: '#3A3148', motif: 'bloom', kit: 'scrapbook', texture: 'washi', pattern: 'none', tags: ['lavender', 'provence', 'mauve', 'scrapbook'], price: 18, swatches: ['#8B7BB0', '#4A3F5C', '#C9A961', '#FAF6F0'] }),
  mk({ id: 'confetti-fete', name: 'Confetti Fête', collection: 'whimsy', blurb: 'Two-color confetti pours across cream cardstock, party blue trading the spotlight with bright magenta, stamped onto a ticket-stub kit.', paper: '#FCF8F0', ink: '#1F2540', accent: '#5A6ED0', gold: '#D4A93E', accent2: '#E0709A', accentBg: '#E4E8F8', accentInk: '#2A3470', motif: 'sparkler', kit: 'ticket', texture: 'none', pattern: 'confetti', tags: ['confetti', 'fete', 'party', 'two-color', 'ticket'], divider: 'marquee-bulbs', price: 16, swatches: ['#5A6ED0', '#E0709A', '#D4A93E', '#FCF8F0'] }),
  mk({ id: 'sunshine-day', name: 'Sunshine Day', collection: 'whimsy', blurb: 'A grade-school summer, sunshine yellow on butter paper, kraft-grain undertow, polka-dot trim and a hand-stamped sun rising over every header.', paper: '#FDF6E0', ink: '#3A2F1E', accent: '#E8A02E', gold: '#B8862E', accent2: '#F4C75A', accentBg: '#FBEAC0', accentInk: '#5C4218', motif: 'sun', kit: 'scrapbook', texture: 'kraft', pattern: 'dots', tags: ['sun', 'yellow', 'summer', 'scrapbook', 'kraft', 'dots'], price: 16, swatches: ['#E8A02E', '#3A2F1E', '#B8862E', '#FDF6E0'] }),
  mk({ id: 'citrus-pop', name: 'Citrus Pop', collection: 'whimsy', blurb: 'Sliced orange on a juice-stained ticket, punchy citrus motif over warm cream, dotted with peel-fleck confetti and a sharp ticket-stub edge.', paper: '#FFF6EC', ink: '#3D1F12', accent: '#F0682E', gold: '#D49A3A', accent2: '#F4A155', accentBg: '#FCDCC4', accentInk: '#6A2E14', motif: 'citrus', kit: 'ticket', texture: 'none', pattern: 'dots', tags: ['citrus', 'orange', 'pop', 'ticket', 'dots'], price: 16, swatches: ['#F0682E', '#3D1F12', '#D49A3A', '#FFF6EC'] }),
  mk({ id: 'polka-fete', name: 'Polka Fête', collection: 'whimsy', blurb: 'Crepe-paper streamers and pink polka dots, a backyard birthday in scrapbook form, with pressed blooms tucked between the photo corners.', paper: '#FCF6F1', ink: '#3F2030', accent: '#D06A8E', gold: '#C9A95A', accent2: '#E89DB4', accentBg: '#F6DCE5', accentInk: '#5C2A40', motif: 'bloom', kit: 'scrapbook', texture: 'paper', pattern: 'dots', tags: ['polka', 'pink', 'fete', 'scrapbook', 'bloom', 'dots'], price: 16, swatches: ['#D06A8E', '#3F2030', '#C9A95A', '#FCF6F1'] }),

  // ===== Pattern & Prints =====
  mk({ id: 'gingham-picnic', name: 'Gingham Picnic', collection: 'prints', blurb: 'Red-check picnic gingham on kraft, a backyard supper turned wedding morning.', paper: '#FBF3E6', ink: '#2A1A12', accent: '#C7493B', gold: '#C9A55E', accent2: '#8A6A3C', texture: 'kraft', pattern: 'gingham', motif: 'none', kit: 'arch', display: F.fraunces, body: F.dmsans, wght: '600', tags: ['gingham', 'picnic', 'red', 'kraft', 'checked', 'country'], price: 16 }),
  mk({ id: 'cabana-stripe', name: 'Cabana Stripe', collection: 'prints', blurb: 'Wide ocean-and-cream cabana stripes, a beach club awning at the seam of the day.', paper: '#F4EFE2', ink: '#0F1E2E', accent: '#2E6BA0', gold: '#C9A55E', accent2: '#9CC3DC', texture: 'canvas', pattern: 'cabana', motif: 'none', kit: 'scallop', display: F.tenor, body: F.inter, wght: '500', tags: ['cabana', 'stripe', 'beach', 'ocean', 'canvas', 'summer'], price: 16 }),
  mk({ id: 'riviera-stripe', name: 'Riviera Stripe', collection: 'prints', blurb: 'Narrow riviera-blue stripes scattered with sliced citrus, the south of France in two colours.', paper: '#F7F2E4', ink: '#13283A', accent: '#2F7EA6', gold: '#D6A24E', accent2: '#E6A338', texture: 'linen', pattern: 'stripe', motif: 'citrus', kit: 'scallop', display: F.cormorant, body: F.inter, wght: '500', tags: ['riviera', 'stripe', 'citrus', 'linen', 'blue', 'mediterranean'], price: 18 }),
  mk({ id: 'marigold-block', name: 'Marigold Block Print', collection: 'prints', blurb: 'Marigold suns hand-blocked on kraft, teal counterstamps in the margin.', paper: '#FAF1DD', ink: '#2E1A0E', accent: '#E0922E', gold: '#C9A55E', accent2: '#2E8A82', texture: 'kraft', pattern: 'sunray', motif: 'sun', kit: 'stamp', display: F.fraunces, body: F.dmsans, wght: '600', tags: ['marigold', 'block-print', 'sun', 'teal', 'kraft'], price: 18 }),
  mk({ id: 'graph-modern', name: 'Graph Modern', collection: 'modern', blurb: 'Blueprint grid on bone, architectural restraint, every line accounted for.', paper: '#F2F1ED', ink: '#15202C', accent: '#3A5A8C', gold: '#9AA3AE', accent2: '#7A8FB0', texture: 'none', pattern: 'grid', motif: 'none', kit: 'minimal', display: F.space, body: F.inter, wght: '500', ls: '0.02em', tags: ['grid', 'blueprint', 'modern', 'architectural', 'minimal', 'geometric'], price: 16 }),
  mk({ id: 'terrazzo-deco', name: 'Terrazzo Deco', collection: 'prints', blurb: 'Speckled terrazzo in teal and coral, a hotel lobby floor at lunchtime.', paper: '#F5EFE3', ink: '#1C2A2A', accent: '#3E8A82', gold: '#C9A55E', accent2: '#D98E6A', texture: 'canvas', pattern: 'terrazzo', motif: 'none', kit: 'arch', display: F.dmserif, body: F.dmsans, wght: '500', tags: ['terrazzo', 'deco', 'teal', 'coral', 'lobby', 'modernist'], price: 16 }),
  mk({ id: 'retro-marquee', name: 'Retro Marquee', collection: 'prints', blurb: 'Diner-red diagonals on canvas, neon marquee energy, lowered into print.', paper: '#F8EFDE', ink: '#1A0E0E', accent: '#C73A3A', gold: '#D8A24E', accent2: '#5A2A2A', texture: 'canvas', pattern: 'diagonal', motif: 'sparkler', kit: 'noir', display: F.playfair, body: F.dmsans, wght: '600', tags: ['retro', 'marquee', 'diner', 'red', 'diagonal', 'midcentury'], divider: 'marquee-bulbs', monogramFrame: 'marquee', price: 16 }),
  mk({ id: 'bauhaus-primary', name: 'Bauhaus Primary', collection: 'modern', blurb: 'Blue, yellow, and a thin black rule, Dessau\'s primary palette, set for paper.', paper: '#F2EFE6', ink: '#0E0E12', accent: '#2E5BC0', gold: '#E0A82E', accent2: '#C73A3A', texture: 'none', pattern: 'deco', motif: 'none', kit: 'minimal', display: F.space, body: F.inter, wght: '600', ls: '0.04em', tags: ['bauhaus', 'primary', 'modernist', 'geometric', 'dessau', 'design'], price: 18 }),

  // ===== Celestial / Seasonal =====
  mk({ id: 'celestial-night', name: 'Celestial Night', collection: 'celestial', blurb: 'Midnight indigo with gilded constellations and deco lettering pressed in gold foil.', paper: '#111634', ink: '#EFEAD8', accent: '#C7A24B', accent2: '#9AA6E0', gold: '#C7A24B', dark: true, foil: true, motif: 'sun', kit: 'deco', pattern: 'celestial', texture: 'velvet', section: '#171D40', card: '#1D2450', display: F.cinzel, body: F.inter, radius: 6, wght: '600', ls: '0.22em', price: 22, r: 4.9, s: '2.0k', swatches: ['#111634', '#C7A24B', '#9AA6E0', '#EFEAD8'], tags: ['celestial', 'deco', 'foil', 'midnight', 'starlit', 'formal'] }),
  mk({ id: 'midnight-stars', name: 'Midnight Stars', collection: 'celestial', blurb: 'Quiet navy velvet scattered with dusty silver, restrained, observatory cool.', paper: '#0F1830', ink: '#ECEFF6', accent: '#7E8FC8', accent2: '#C2CADC', gold: '#C2CADC', dark: true, motif: 'none', kit: 'minimal', pattern: 'celestial', texture: 'slate', section: '#15203E', card: '#1A2748', display: F.italiana, body: F.inter, radius: 2, ls: '0.24em', price: 20, r: 4.8, s: '1.6k', swatches: ['#0F1830', '#7E8FC8', '#C2CADC', '#ECEFF6'], tags: ['celestial', 'minimal', 'navy', 'silver', 'modern', 'quiet'] }),
  mk({ id: 'luna-rose', name: 'Luna Rose', collection: 'celestial', blurb: 'Plum-dusk velvet warmed with rose gold, a moonlit deco evening.', paper: '#241A33', ink: '#F1EAE2', accent: '#A98BC8', accent2: '#D8A06A', gold: '#D8A06A', dark: true, foil: true, motif: 'bow', kit: 'deco', pattern: 'celestial', texture: 'velvet', section: '#2E2340', card: '#352A4A', display: F.cormorant, body: F.inter, radius: 6, wght: '500', ls: '0.20em', price: 20, r: 4.8, s: '1.4k', swatches: ['#241A33', '#A98BC8', '#D8A06A', '#F1EAE2'], tags: ['celestial', 'deco', 'rose-gold', 'mauve', 'romantic', 'foil'] }),
  mk({ id: 'winter-frost', name: 'Winter Frost', collection: 'seasonal', blurb: 'Pale ice and brushed silver, a clear-sky January morning on paper.', paper: '#F2F5F7', ink: '#1F2A35', accent: '#6E8FA6', accent2: '#B9C2D6', gold: '#A4B8C8', motif: 'none', kit: 'minimal', pattern: 'celestial', texture: 'silk', section: '#E8EEF2', card: '#FFFFFF', display: F.italiana, body: F.inter, radius: 4, ls: '0.18em', price: 14, r: 4.7, s: '1.2k', swatches: ['#F2F5F7', '#6E8FA6', '#A4B8C8', '#B9C2D6'], tags: ['seasonal', 'winter', 'minimal', 'ice', 'crisp', 'cool'] }),
  mk({ id: 'autumn-harvest', name: 'Autumn Harvest', collection: 'seasonal', blurb: 'Kraft paper, wheat stamps, and rust ink, the warmth of a late-October table.', paper: '#FAF2E4', ink: '#2A1A0E', accent: '#B5552B', accent2: '#D87A48', gold: '#C9A55E', motif: 'wheat', kit: 'cabinet', texture: 'tweed', section: '#F0E5D0', card: '#FFFCEE', display: F.fraunces, body: F.inter, radius: 12, wght: '500', price: 14, r: 4.8, s: '1.8k', swatches: ['#FAF2E4', '#B5552B', '#C9A55E', '#D87A48'], tags: ['seasonal', 'autumn', 'harvest', 'rust', 'wheat', 'warm'] }),

  // ===== 2026-06-09 collection — drawn around the new motif set =====
  mk({ id: 'first-thread', name: 'First Thread', collection: 'modern', blurb: 'The house colors, cream paper, olive ink, one gold thread. The loom, unadorned. On us.', paper: '#F5EFE2', ink: '#0E0D0B', accent: '#5C6B3F', accent2: '#A4B57A', gold: '#B8935A', motif: 'vine', kit: 'classic', texture: 'paper', section: '#EBE3D2', card: '#FBF7EE', display: F.fraunces, body: F.inter, radius: 12, price: 0, r: 4.9, s: '2.4k', swatches: ['#F5EFE2', '#5C6B3F', '#B8935A', '#A4B57A'], tags: ['editorial', 'olive', 'classic', 'letterpress', 'understated', 'vine'] }),
  mk({ id: 'magnolia-porch', name: 'Magnolia Porch', collection: 'garden', blurb: 'Dusty rose magnolias on warm linen, a southern veranda in late May.', paper: '#F8F3EA', ink: '#2C2218', accent: '#A86B76', accent2: '#D9B8A6', gold: '#C9A55E', motif: 'magnolia', kit: 'plate', texture: 'linen', section: '#F0E7D8', card: '#FFFDF4', display: F.playfair, body: F.inter, radius: 14, pattern: 'trellis', price: 16, r: 4.8, s: '1.1k', swatches: ['#F8F3EA', '#A86B76', '#C9A55E', '#D9B8A6'], tags: ['garden', 'magnolia', 'rose', 'southern', 'romantic', 'linen'] }),
  mk({ id: 'gilded-coupe', name: 'Gilded Coupe', collection: 'evening', blurb: 'Champagne bubbles rising through candlelit velvet, pour, toast, repeat.', paper: '#1C1712', ink: '#F1EBDC', accent: '#D4B373', accent2: '#E8C77A', gold: '#D8A06A', dark: true, foil: true, motif: 'champagne', kit: 'deco', pattern: 'deco', texture: 'velvet', section: '#251E16', card: '#2C241A', display: F.italiana, body: F.inter, radius: 6, wght: '500', ls: '0.20em', divider: 'gilt-chain', price: 20, r: 4.9, s: '1.6k', swatches: ['#1C1712', '#D4B373', '#D8A06A', '#E8C77A'], tags: ['evening', 'champagne', 'deco', 'gold', 'toast', 'foil', 'nye'] }),
  // ===== 2026-06-09 II — the premium/signature shelf expansion =====
  mk({ id: 'opera-house', name: 'Opera House', collection: 'evening', blurb: 'Aubergine velvet, orchids on the rail, and Bodoni at full voice, opening night.', paper: '#221420', ink: '#F2EAE4', accent: '#B687A8', accent2: '#D9B3C9', gold: '#D4AF6A', dark: true, foil: true, motif: 'orchid', kit: 'deco', texture: 'silk', section: '#2B1A28', card: '#322030', display: F.bodoni, body: F.jost, radius: 4, wght: '500', ls: '0.16em', divider: 'crystal-drops', monogramFrame: 'gilt', price: 24, r: 4.9, s: '860', badges: { new: true }, tags: ['evening', 'opera', 'orchid', 'velvet', 'bodoni', 'foil', 'formal'] }),
  mk({ id: 'the-gallery', name: 'The Gallery', collection: 'modern', blurb: 'Museum mats, exhibit numbers, and Prata under glass, your day, on the wall.', paper: '#F7F5F1', ink: '#1A1916', accent: '#44403A', accent2: '#8A8378', gold: '#B8935A', motif: 'none', kit: 'gallery', texture: 'marble', section: '#EFECE6', card: '#FFFFFF', display: F.prata, body: F.jost, radius: 0, ls: '0.12em', price: 22, r: 4.8, s: '720', badges: { new: true }, tags: ['modern', 'gallery', 'museum', 'minimal', 'marble', 'editorial'] }),
  mk({ id: 'tasting-menu', name: 'Tasting Menu', collection: 'heritage', blurb: 'Gold rules, dotted leaders, and Gilda in small caps, seven courses of a day.', paper: '#FBF6EA', ink: '#2B2118', accent: '#7A4A2E', accent2: '#B08254', gold: '#C9A55E', motif: 'champagne', kit: 'menu', texture: 'paper', section: '#F3EBD9', card: '#FFFDF4', display: F.gilda, body: F.ebgar, radius: 2, price: 20, r: 4.9, s: '1.0k', badges: { new: true }, tags: ['heritage', 'menu', 'bistro', 'dinner', 'champagne', 'formal'] }),
  mk({ id: 'sakura-drift', name: 'Sakura Drift', collection: 'garden', blurb: 'Notched petals on watercolor wash, the week the cherry trees let go.', paper: '#FBF3F1', ink: '#3A2530', accent: '#C9798A', accent2: '#E8B7C2', gold: '#C9A55E', motif: 'cherry-blossom', kit: 'minimal', texture: 'washi', section: '#F5E7E5', card: '#FFFBFA', display: F.cormorant, body: F.inter, script: S.parisienne, radius: 14, price: 16, r: 4.8, s: '1.3k', badges: { new: true }, tags: ['garden', 'sakura', 'spring', 'blush', 'watercolor', 'romantic'] }),
  mk({ id: 'mirrorball', name: 'Mirrorball', collection: 'whimsy', blurb: 'Facets, confetti, and Space Grotesk, the last song played twice.', paper: '#181620', ink: '#F2EFF8', accent: '#A8B4C8', accent2: '#D8C8E8', gold: '#D4B373', dark: true, motif: 'disco', kit: 'ticket', pattern: 'confetti', texture: 'velvet', section: '#201D2B', card: '#272335', display: F.space, body: F.inter, radius: 10, divider: 'marquee-bulbs', monogramFrame: 'marquee', price: 18, r: 4.7, s: '1.5k', badges: { new: true }, tags: ['party', 'disco', 'nye', 'bachelorette', 'dance', 'dark'] }),
  mk({ id: 'conservatory', name: 'Conservatory', collection: 'garden', blurb: 'Monstera shadows on linen, a glasshouse afternoon, doors propped open.', paper: '#F2F4EC', ink: '#1F2A1C', accent: '#3F6B4A', accent2: '#7AA86B', gold: '#C9A55E', motif: 'monstera', kit: 'arch', texture: 'linen', section: '#E8EDDD', card: '#FCFEF6', display: F.marcellus, body: F.jost, radius: 16, price: 14, r: 4.8, s: '1.1k', badges: { new: true }, tags: ['garden', 'tropical', 'monstera', 'green', 'linen', 'modern'] }),
  mk({ id: 'noel-press', name: 'Noël Press', collection: 'seasonal', blurb: 'Holly, kraft, and berry-red ink, a letterpress card you can walk into.', paper: '#F8F1E4', ink: '#2A1F14', accent: '#4A6B4F', accent2: '#A84A42', gold: '#C9A55E', motif: 'holly', kit: 'stamp', texture: 'kraft', section: '#F0E6D2', card: '#FFFBEE', display: F.fraunces, body: F.inter, script: S.greatvibes, radius: 12, wght: '500', pattern: 'swiss-dot', price: 14, r: 4.8, s: '980', badges: { new: true }, tags: ['seasonal', 'winter', 'holly', 'christmas', 'kraft', 'letterpress'] }),
  mk({ id: 'safe-harbor', name: 'Safe Harbor', collection: 'coastal', blurb: 'Navy ink, rope and brass, an anchorage worth rowing home to.', paper: '#F6F3EC', ink: '#1E2A38', accent: '#2E4A66', accent2: '#7A93AC', gold: '#C0A068', motif: 'anchor', kit: 'ticket', pattern: 'stripe', texture: 'canvas', section: '#ECE8DD', card: '#FEFCF4', display: F.playfair, body: F.tenor, radius: 8, price: 12, r: 4.7, s: '1.2k', badges: { new: true }, tags: ['coastal', 'nautical', 'anchor', 'navy', 'harbor', 'stripe'] }),
  mk({ id: 'paper-lanterns', name: 'Paper Lanterns', collection: 'whimsy', blurb: 'Warm lanterns strung against a kraft dusk, festival light you can fold.', paper: '#FAF1E2', ink: '#33231A', accent: '#C25E3C', accent2: '#E0935F', gold: '#D8A06A', motif: 'lantern', kit: 'stamp', pattern: 'celestial', texture: 'washi', section: '#F2E5CE', card: '#FFF9EC', display: F.fraunces, body: F.dmsans, radius: 14, price: 14, r: 4.7, s: '940', swatches: ['#FAF1E2', '#C25E3C', '#D8A06A', '#E0935F'], tags: ['festival', 'lantern', 'warm', 'celebration', 'kraft', 'glow'] }),

  /* ── Design-system v2 themes (2026-06) — the four reconciled
     packs from themes.ts, now sold in the store. Each bundles its
     palette + motif + divider + monogram frame + component kit +
     the full per-component look, so "what's included" shows the
     whole hand, not just a palette. ── */
  mk({ id: 'amalfi-citrus', name: 'Amalfi Citrus', collection: 'med', blurb: 'Sun-bleached blue, lemon and terracotta, a coastal supper.', paper: '#FBF6EA', section: '#F1E7D4', card: '#FFFCF4', ink: '#1A2A33', inkSoft: '#3C5560', inkMuted: '#7E8E96', accent: '#2E6B8A', accent2: '#5E94AD', accentBg: '#E2EAEF', accentInk: '#235874', gold: '#D9B44A', rsvp: '#C6703D', rsvpInk: '#FBF6EA', display: "'Fraunces', Georgia, serif", body: "'Inter', sans-serif", radius: 14, wght: '500', heroScale: 1.06, ls: '0.16em', texture: 'linen', motif: 'bloom', divider: 'sprig', monogramFrame: 'arch', kit: 'classic', look: { card: 'frame', button: 'pill', divider: 'sprig', photo: 'arch', heroAlign: 'center', motifDensity: 'generous' }, price: 0, r: 4.9, s: 'New', badges: { new: true }, swatches: ['#2E6B8A', '#C6703D', '#D9B44A', '#FBF6EA'], tags: ['mediterranean', 'amalfi', 'citrus', 'blue', 'coastal', 'lemon'] }),
  mk({ id: 'first-light', name: 'First Light', collection: 'garden', blurb: 'Dawn rose and gold, the morning after, every year after.', paper: '#FCF4EE', section: '#F6E4DA', card: '#FFFBF7', ink: '#3A2A2A', inkSoft: '#5E4742', inkMuted: '#9C8780', accent: '#C6563D', accent2: '#D9897A', accentBg: '#F6DDD4', accentInk: '#A63F2A', gold: '#C19A4B', rsvp: '#C6563D', rsvpInk: '#FCF4EE', display: "'Fraunces', Georgia, serif", body: "'Inter', sans-serif", radius: 14, wght: '600', heroScale: 1, ls: '0.14em', texture: 'paper', motif: 'pressed', divider: 'dot', monogramFrame: 'sprig', kit: 'scrapbook', look: { card: 'soft', button: 'pill', divider: 'dot', photo: 'polaroid', heroAlign: 'center', motifDensity: 'sparse' }, price: 18, r: 4.8, s: 'New', badges: { new: true }, swatches: ['#C6563D', '#C19A4B', '#D9A89E', '#FCF4EE'], tags: ['rose', 'dawn', 'gold', 'garden', 'anniversary', 'soft'] }),
  mk({ id: 'deco-gilt', name: 'Deco Gilt', collection: 'heritage', dark: true, foil: true, blurb: 'Jazz-age geometry, ink, gilt and a hard-edged fan.', paper: '#14110C', section: '#1C1810', card: '#211C13', ink: '#F3ECD9', inkSoft: '#C9C0A8', inkMuted: '#8A8266', accent: '#C9A24B', accent2: '#7C8A6A', accentBg: '#2A2416', accentInk: '#E6C977', gold: '#C9A24B', rsvp: '#C9A24B', rsvpInk: '#14110C', display: "'Fraunces', Georgia, serif", body: "'Geist Mono', ui-monospace, monospace", radius: 1, wght: '700', heroScale: 1.1, ls: '0.3em', texture: 'velvet', motif: 'none', divider: 'rule', monogramFrame: 'fan', kit: 'deco', look: { card: 'flat', button: 'sharp', divider: 'rule', photo: 'clean', heroAlign: 'left', motifDensity: 'none' }, price: 24, r: 4.9, s: 'New', badges: { new: true }, swatches: ['#14110C', '#C9A24B', '#7C8A6A', '#F3ECD9'], tags: ['deco', 'gold', 'gilt', 'jazz', 'geometric', 'midnight', 'signature'] }),
  mk({ id: 'tide-coast', name: 'Tide & Coast', collection: 'coastal', blurb: 'Fog, driftwood and rope, an unhurried seaside vow.', paper: '#F2F1EC', section: '#E6E5DD', card: '#FAFAF6', ink: '#2C353A', inkSoft: '#4E5A60', inkMuted: '#8B969B', accent: '#5E7A82', accent2: '#9DB0B2', accentBg: '#DEE5E5', accentInk: '#46626A', gold: '#B8A580', rsvp: '#2C353A', rsvpInk: '#F2F1EC', display: "'Cormorant Garamond', Georgia, serif", body: "'Inter', sans-serif", radius: 3, wght: '600', heroScale: 1.12, ls: '0.2em', texture: 'cotton', motif: 'none', divider: 'deckle', monogramFrame: 'oval', kit: 'minimal', look: { card: 'frame', button: 'square', divider: 'deckle', photo: 'deckle', heroAlign: 'center', motifDensity: 'sparse' }, price: 16, r: 4.8, s: 'New', badges: { new: true }, swatches: ['#5E7A82', '#C8BFA5', '#9DB0B2', '#F2F1EC'], tags: ['coastal', 'fog', 'driftwood', 'seaside', 'rope', 'calm'] }),
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
export function dividerForMotif(motif: Motif): 'sprig' | 'brush' | 'dot' | 'rule' | 'deckle' {
  switch (motif) {
    case 'olive':
    case 'fern':
    case 'laurel':
    case 'wheat':
    case 'vine':
    case 'gingko':
    case 'hummingbird':
    case 'monstera':
    case 'holly':
      /* Leafy / stem / garden motifs — sprig divider matches. */
      return 'sprig';
    case 'bloom':
    case 'sun':
    case 'citrus':
    case 'magnolia':
    case 'peony':
    case 'orchid':
    case 'cherry-blossom':
      /* Floral / radial — the brush stroke divider reads warmer. */
      return 'brush';
    case 'pressed':
    case 'palm':
    case 'champagne':
    case 'starburst':
    case 'lantern':
    case 'disco':
      /* Imprinted / scattered / sparked marks — the dot rhythm matches. */
      return 'dot';
    case 'shell':
      /* Shell / scallop edges — the deckled divider matches the
         coastal scallop arc. */
      return 'deckle';
    case 'chandelier':
      return 'rule';
    case 'bow':
      return 'brush';
    case 'sparkler':
      return 'dot';
    case 'deco':
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
