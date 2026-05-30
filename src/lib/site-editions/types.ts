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
  | 'quiet';

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
}
