// ─────────────────────────────────────────────────────────────
// Site Editions — pre-composed layout personas for generated sites.
//
// An Edition is a named, coherent set of layout defaults that the
// renderer reads at read-time to pick a hero variant, section
// opener style, divider rhythm, block ordering, type scale,
// atmosphere intensity, and CTA shape. One click = a finished
// editorial object, not a starting point.
//
// CRITICAL CONTRACT: Editions are READ-TIME defaults only. The
// resolver never writes back into the manifest. Hosts who set
// explicit per-block overrides (heroVariant, atmosphere, etc.)
// keep them. This protects existing published sites from any
// visual regression when Editions ship.
//
// Plan source: see workflow synthesis dated 2026-05-30 (the
// "sites-layout-overhaul-plan" workflow). 5 Editions:
//   - almanac        — bound book / chapter-marked / serif drop cap
//   - cinema         — letterboxed film magazine / full-bleed photo
//   - postcard-box   — stacked tilted cards / handwritten / stamps
//   - linen-folder   — hotel stationery formal / two-column / gold hairline
//   - quiet          — whitespace and restraint / minimal / no chrome
// ─────────────────────────────────────────────────────────────

import type { SiteBlockKey } from '@/lib/site-mode';
import type { SiteOccasion } from '@/lib/site-urls';

/** Canonical Edition identifiers. */
export type EditionId =
  | 'almanac'
  | 'cinema'
  | 'postcard-box'
  | 'linen-folder'
  | 'quiet'
  | 'coastal';

/** Which hero variant to render when the host hasn't set one
 *  explicitly. Maps to the existing hero-variants registry ids. */
export type HeroVariantHint =
  | 'postcard'
  | 'photo-first'
  | 'split'
  | 'carousel'
  | 'minimal';

/** Which story layout variant the Edition prescribes. Maps to
 *  StoryLayoutType in src/components/blocks/StoryLayouts.tsx. */
export type StoryLayoutHint =
  | 'parallax'
  | 'filmstrip'
  | 'magazine'
  | 'timeline'
  | 'kenburns'
  | 'bento';

/** Section-opener style — picks which edition-openers component
 *  renders above each section title. */
export type SectionOpenerStyle =
  | 'chapter-mark'   // Almanac: roman numeral + serif drop cap
  | 'slug-line'      // Cinema: black-bar SCENE 02 — THE TRAVEL
  | 'stamp'          // Postcard Box: postage stamp + handwritten kicker
  | 'mono-label'     // Linen Folder: . PROGRAMME (gold dot, mono uppercase)
  | 'overline';      // Quiet: tiny mono overline, 10px 0.28em tracking

/** Divider rhythm between sections — picks which edition-dividers
 *  component renders in <SectionDivider>. */
export type DividerStyle =
  | 'thread'         // Almanac: single hairline thread
  | 'sprocket'       // Cinema: film-sprocket row
  | 'stitch'         // Postcard Box: thread-stitch dashed
  | 'gold-hairline'  // Linen Folder: centered gold 80px hairline
  | 'whitespace';    // Quiet: 24px of nothing

/** Atmosphere intensity preset — overrides manifest.atmosphere.intensity
 *  only when the host hasn't set an explicit value. */
export type AtmospherePreset =
  | { kind?: string; intensity: 'off' | 'low' | 'standard' | 'high' };

/** Type scale preset — relative scale multiplier applied to display
 *  + body sizes. Lets Editions feel tighter or more generous without
 *  per-section overrides. */
export type TypeScale = 'compact' | 'standard' | 'generous';

/** Primary CTA shape — what the RSVP button looks like. Maps to
 *  the existing manifest.rsvpButton.shape vocabulary. */
export type CtaShape = 'pearl' | 'pill' | 'hairline' | 'tag';

/** One Edition definition — the canonical record the renderer reads. */
export interface EditionDefinition {
  /** URL-safe + manifest-stored identifier. */
  id: EditionId;

  /** Human label for the picker. */
  label: string;

  /** One-line tagline shown under the label in the picker. */
  tagline: string;

  /** 2-3 sentence vision — used in tooltips + the wizard
   *  "why this fits" line. */
  description: string;

  /** Hero variant to fall back on when the host hasn't picked one. */
  heroVariantId: HeroVariantHint;

  /** Story layout variant this Edition prescribes. Stamped into
   *  manifest on Edition pick so the Story section visibly reshapes
   *  per Edition (Almanac → timeline, Cinema → filmstrip, etc.). */
  storyLayoutId: StoryLayoutHint;

  /** Per-section blockStyles overrides this Edition stamps in.
   *  Lets each Edition prescribe (e.g.) a hairline card for
   *  Linen Folder vs a pillow card for Postcard Box on the same
   *  section. Keys are SiteBlockKey; values are partial
   *  BlockStyleOverride shapes the renderer's BlockStyleWrapper
   *  consumes. */
  blockStyles?: Partial<Record<SiteBlockKey, {
    cardRadius?: 'sharp' | 'soft' | 'rounded' | 'pillow';
    cardShadow?: 'none' | 'soft' | 'lifted' | 'floating';
    cardBorder?: 'none' | 'hairline' | 'heavy';
    cardPadding?: 'compact' | 'default' | 'generous';
    cardShape?: 'pillow' | 'sharp' | 'scallop' | 'arch';
    spacing?: string;
    textAlign?: 'left' | 'center' | 'right';
    background?: string;
  }>>;

  /** Section opener component to render above each section title. */
  sectionOpener: SectionOpenerStyle;

  /** Divider style between sections. */
  divider: DividerStyle;

  /** Atmosphere preset — overrides manifest.atmosphere when unset. */
  atmospherePreset: AtmospherePreset;

  /** Type scale — affects display + body size ratios. */
  typeScale: TypeScale;

  /** Primary CTA shape — affects RSVP button. */
  ctaShape: CtaShape;

  /** Preferred block order. Renderer respects this when the manifest
   *  doesn't have a host-curated chapter order. Matches SiteBlockKey
   *  (story, details, schedule, travel, registry, gallery, faq, rsvp). */
  blockOrder: SiteBlockKey[];

  /** Motifs allowed in this Edition. When set, the renderer filters
   *  decor by this allowlist; when omitted, all motifs are allowed. */
  allowedMotifs?: string[];

  /** Motifs forbidden in this Edition. Takes precedence over
   *  allowedMotifs if both set. */
  forbiddenMotifs?: string[];

  /** Occasions where this Edition is the recommended default. The
   *  resolver's recommendEdition() function picks from this list. */
  recommendedFor: SiteOccasion[];

  /** Desktop nav layout this Edition recommends. NavPanel reads this
   *  to badge the matching tile "★ Recommended" when the host hasn't
   *  picked one explicitly. Maps to the StoryManifest['nav']['style']
   *  union. */
  recommendedNavStyle?:
    | 'classic'
    | 'centered'
    | 'stacked'
    | 'minimal'
    | 'hairline-horizontal'
    | 'centered-lockup'
    | 'stacked-editorial'
    | 'folio-page-number'
    | 'floating-pill';

  /** Mobile nav layout this Edition recommends. Same purpose as
   *  recommendedNavStyle, for the < 720px viewport picker. */
  recommendedNavMobileStyle?:
    | 'drawer-hamburger'
    | 'sticky-bottom-pill'
    | 'hairline-collapsing'
    | 'folded-expand';

  /** Site Layout this Edition recommends. SiteLayoutPicker reads
   *  this to badge the matching tile "★ Recommended" when the host
   *  hasn't picked one explicitly. Maps to StoryManifest['siteLayout']:
   *    Almanac      → boxed   (invitation card matches "bound book")
   *    Cinema       → stacked (full-bleed letterbox needs the scroll)
   *    Postcard Box → stacked (tilted cards scatter down the page)
   *    Linen Folder → split   (sidebar matches hotel-stationery)
   *    Quiet        → stacked (whitespace + restraint, no chrome)
   *    Coastal Ink  → boxed   (postcard-card frame echoes the seaside) */
  recommendedLayout?: 'stacked' | 'boxed' | 'split';

  /** Full visual identity each Edition recommends — palette, fonts,
   *  card-radius scale. Ported from the design prototype's THEMES
   *  registry where each theme replaced the WHOLE site look (paper
   *  + ink + accent + display font + body font + radii), not just
   *  layout chrome.
   *
   *  Consumed two ways:
   *  1. EditionPicker.pick() stamps these onto manifest.theme.* so
   *     picking an Edition VISIBLY transforms the site (paper goes
   *     dark for Cinema, italics arrive for Linen Folder, etc.).
   *     Host-subsequent palette / font picks still win — the stamp
   *     just seeds defaults.
   *  2. Renderer fallback: if manifest.theme.colors is unset, the
   *     active Edition's recommendedTheme.colors is used as the
   *     ground for the CSS-var emission.
   *
   *  Keys mirror Pearloom's StoryManifest.theme shape so the stamp
   *  doesn't need a translation layer. */
  recommendedTheme?: {
    colors?: {
      background?: string;   // paper
      foreground?: string;   // ink
      accent?: string;       // primary accent
      accentLight?: string;  // accent wash / line color
      muted?: string;        // ink-muted
      cardBg?: string;       // card surface
    };
    fonts?: {
      heading?: string;      // display family
      body?: string;         // ui family
      script?: string;       // script accent family
    };
    cardRadius?: 'sharp' | 'soft' | 'rounded' | 'pillow';
    /** Display-text weight. Cinema's slim italic (500) reads
     *  very differently from Quiet's editorial bold (800) on the
     *  same Inter face — this captures the personality the prototype's
     *  themes encoded via --t-display-wght. */
    displayWeight?: number;
    /** Hero text scale multiplier. >1 = bigger hero (Linen Folder's
     *  1.18 = formal grand). =1 = standard. Drives --pl-hero-scale
     *  on the site root; existing hero CSS opt-in by reading the var. */
    heroScale?: number;
    /** Eyebrow letter-spacing override. The prototype's themes ranged
     *  from 0.14em (warm) to 0.24em (editorial-tight). Drives the
     *  --pl-eyebrow-ls var consumed by .eyebrow + .pl-overline. */
    eyebrowSpacing?: string;
    /** Theme-level card shadow. The prototype's --t-shadow varied
     *  dramatically per theme — Cinema's 40px black drama vs Quiet's
     *  none vs Linen Folder's near-flat 1px hairline. Drives the
     *  --pl-card-shadow var; cards opt in via box-shadow: var(--pl-card-shadow). */
    cardShadow?: string;
  };

  /** Texture this Edition naturally wears. The prototype binds
   *  textures to themes — picking Tuscan Watercolor automatically
   *  switches to watercolor texture; picking Santorini Linen
   *  switches to linen weave. EditionPicker.pick() stamps this
   *  onto manifest.texture so the texture follows the theme.
   *  Hosts can still override via the fine-tune slider. */
  naturalTexture?: 'none' | 'linen' | 'watercolor' | 'paper' | 'cotton' | 'velvet';

  /** Human-readable slider label for the texture intensity dial.
   *  Reads as a property of the theme rather than the texture —
   *  "Watercolor washes" for Tuscan, "Linen weave" for Santorini.
   *  Falls back to a generic "Texture" when unset. */
  textureSliderLabel?: string;
}
