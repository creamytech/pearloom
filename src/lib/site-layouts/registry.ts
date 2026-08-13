// ─────────────────────────────────────────────────────────────
// Site layout variants — the canonical 48-variant catalog ported
// from the design prototype (ClaudeDesign/shared/site-config.jsx
// LAYOUTS map).
//
// What this is:
//   The single declaration of which layout variants each section
//   supports + their human-readable labels + one-liners + miniature
//   diagram refs. The editor's Layout tab reads from this; the
//   block-styles registry mirrors the entries at module-load time
//   so getBlockStyle(section, id) resolves to a renderer.
//
// What it isn't:
//   The renderer. Section renderers in ThemedSiteRenderer dispatch
//   on the variant id; missing variants gracefully fall back to
//   the section's default layout. New variants ship by:
//     1. Adding an entry here (with id + label + one-liner)
//     2. Registering it via registerSectionVariant() OR by hand
//        in section-variants.ts so the picker discovers it.
//     3. Wiring the variant's actual JSX into the renderer.
//
// Source: ClaudeDesign/shared/site-config.jsx lines 73-84 + the
// prototype's themed-site.jsx dispatch logic.
// ─────────────────────────────────────────────────────────────

/** Canonical sections that take layout variants. Mirrors the
 *  prototype's LAYOUTS object keys. */
export type SectionKey =
  | 'hero'
  | 'story'
  | 'details'
  | 'schedule'
  | 'travel'
  | 'registry'
  | 'gallery'
  | 'rsvp'
  | 'faq';

/** One variant declaration. Same shape as the prototype's entries
 *  plus a one-liner description (BRAND.md microcopy — "what it
 *  feels like") and an optional miniaturePath the picker uses for
 *  inline SVG previews. */
export interface LayoutVariant {
  /** Stable identifier — stored in manifest.blockVariants[section].style. */
  id: string;
  /** Human label shown in the picker tile. */
  label: string;
  /** Short "what it feels like" line for the picker hover/tooltip. */
  oneLiner: string;
  /** Optional path to a separate SVG sketch. When unset, the picker
   *  falls back to a registered MiniDiagram component for the section. */
  miniaturePath?: string;
  /** Renderer status. 'shipped' = wired in ThemedSiteRenderer.
   *  'registered' = picker can show it but renderer falls back to
   *  the default layout. 'planned' = the prototype declared it but
   *  no renderer + no registry entry yet. */
  status: 'shipped' | 'registered' | 'planned';
}

/** The canonical map — port of the prototype's LAYOUTS object.
 *  Order matches the prototype so picker order matches the design
 *  reference. First entry in each list is the prototype's default. */
export const LAYOUTS: Record<SectionKey, LayoutVariant[]> = {
  // ── HERO ────────────────────────────────────────────────────
  hero: [
    { id: 'centered',     label: 'Centered',     oneLiner: 'Names centered, hairline rule above + below, photo cluster underneath.', status: 'planned' },
    { id: 'split',        label: 'Split',        oneLiner: '4:5 portrait left, names + meta right.',                                   status: 'shipped' },
    { id: 'minimal', label: 'Minimal', oneLiner: 'Type only, no photos, no atmosphere.', status: 'shipped' },
    { id: 'fullbleed',    label: 'Full-bleed',   oneLiner: 'Edge-to-edge cover photo with overlaid names.',                            status: 'planned' },
    { id: 'typographic', label: 'Typographic', oneLiner: 'Oversized stacked names, display type as the hero.', status: 'planned' },
    { id: 'postcard',     label: 'Postcard',     oneLiner: 'Editorial centered card on a mat with polaroid strip below.',              status: 'shipped' },
    // Production-only variants that don't map to the prototype but
    // are part of the v8 hero family. Kept in the registry so the
    // picker shows them; not in the prototype's LAYOUTS.
    { id: 'photo-first',  label: 'Photo-first',  oneLiner: 'Cinematic full-viewport cover with slow Ken Burns.',                       status: 'shipped' },
    { id: 'carousel',     label: 'Carousel',     oneLiner: 'Scrolling photo reel above the names.',                                     status: 'shipped' },
  ],

  // ── STORY ───────────────────────────────────────────────────
  story: [
    { id: 'sidebyside', label: 'Side by side', oneLiner: 'Photo left, narrative right, the editorial default.', status: 'registered' },
    { id: 'stacked',    label: 'Stacked',      oneLiner: 'Photo on top, narrative below, centered column.',                        status: 'registered' },
    { id: 'quote',      label: 'Quote-led',    oneLiner: 'Pull-quote first, with the body as supporting text underneath.',         status: 'registered' },
    { id: 'timeline', label: 'Timeline', oneLiner: 'Chronological vine, events beaded down a centre line.', status: 'shipped' },
    { id: 'zigzag',     label: 'Zigzag',       oneLiner: 'Alternating left-right photo / text rows.',                              status: 'registered' },
    { id: 'letter',     label: 'Letter',       oneLiner: 'A handwritten note on cream paper, signed at the bottom.',               status: 'registered' },
    // Production extras (Phase 4 of layout overhaul):
    { id: 'parallax', label: 'Parallax', oneLiner: 'Full-bleed photos with scroll depth, cinematic.', status: 'shipped' },
    { id: 'filmstrip',  label: 'Film strip',   oneLiner: 'Cinematic horizontal-scroll photo strip per chapter.',                   status: 'shipped' },
    { id: 'magazine',   label: 'Magazine',     oneLiner: 'Editorial photo + text pairing, like a spread.',                         status: 'shipped' },
    { id: 'kenburns',   label: 'Ken Burns',    oneLiner: 'Slow-zoom photo crops with text overlays.',                              status: 'shipped' },
    { id: 'bento',      label: 'Bento',        oneLiner: 'Mosaic grid of photos and text per chapter.',                            status: 'shipped' },
  ],

  // ── DETAILS ─────────────────────────────────────────────────
  details: [
    { id: 'tiles', label: 'Tiles', oneLiner: 'Equal cards in a row, date / venue / dress code / parking.', status: 'registered' },
    { id: 'iconrow',   label: 'Icon row',    oneLiner: 'Circular icons centered, label + value stacked beneath.',         status: 'registered' },
    { id: 'list',      label: 'Leader list', oneLiner: 'Two columns joined by a dotted leader line.',                     status: 'registered' },
    { id: 'accordion', label: 'Accordion', oneLiner: 'Tappable rows with a chevron, each card expands inline.', status: 'registered' },
    { id: 'bento', label: 'Bento', oneLiner: 'Asymmetric grid, the headline card spans two columns.', status: 'registered' },
  ],

  // ── SCHEDULE ────────────────────────────────────────────────
  schedule: [
    { id: 'cards', label: 'Cards', oneLiner: 'Grid of event cards, time, title, blurb per tile.', status: 'registered' },
    { id: 'list',     label: 'List',     oneLiner: 'Rows of time / title / detail with a hairline between each.',         status: 'registered' },
    { id: 'timeline', label: 'Timeline', oneLiner: 'Vertical rail with a dot per event.',                                  status: 'shipped' },
    { id: 'stepper', label: 'Stepper', oneLiner: 'Horizontal numbered dots, like a recipe or progress bar.', status: 'registered' },
    { id: 'numbered', label: 'Numbered', oneLiner: 'Oversized 01, 02, 03 down the left column.',                          status: 'registered' },
    // Production:
    { id: 'run-of-show', label: 'Run of show', oneLiner: 'Vertical timeline rail with a dot per event, the classic flow.', status: 'shipped' },
  ],

  // ── TRAVEL ──────────────────────────────────────────────────
  travel: [
    { id: 'map',      label: 'Map + cards', oneLiner: 'Illustrated map strip with hotel cards underneath.',         status: 'shipped' },
    { id: 'rows', label: 'Rows', oneLiner: 'Wide single-column rows, photo left, info right per hotel.', status: 'shipped' },
    { id: 'table', label: 'Comparison', oneLiner: 'Compact table, name, rating, price, distance per row.', status: 'shipped' },
    { id: 'carousel', label: 'Carousel', oneLiner: 'Horizontal swipe of hotel cards, fixed 300px per slide.', status: 'shipped' },
  ],

  // ── REGISTRY ────────────────────────────────────────────────
  registry: [
    { id: 'cards',    label: 'Cards',     oneLiner: 'Per-store cards with icon, name, status, and a Contribute pill.', status: 'shipped' },
    { id: 'chips',    label: 'Chips',     oneLiner: 'Pill-shaped link chips, centered, with an arrow glyph.',           status: 'registered' },
    { id: 'progress', label: 'Fund hero', oneLiner: 'Honeymoon-fund headline card with a progress bar + chips beneath.', status: 'registered' },
    { id: 'logowall', label: 'Logo wall', oneLiner: 'Grid of branded store tiles, gift icon + name per tile.', status: 'registered' },
  ],

  // ── GALLERY ─────────────────────────────────────────────────
  gallery: [
    { id: 'grid', label: 'Grid', oneLiner: '6-up uniform 1:1 tiles, the editorial default.', status: 'registered' },
    { id: 'mosaic', label: 'Mosaic', oneLiner: 'Bento-style, mixed-size tiles arranged like a story spread.', status: 'shipped' },
    { id: 'strip',     label: 'Filmstrip',    oneLiner: 'Horizontal snap-scroll row at a fixed height.',                    status: 'shipped' },
    { id: 'masonry', label: 'Masonry', oneLiner: '4-column waterfall, each tile takes its own aspect.', status: 'registered' },
    { id: 'slideshow', label: 'Slideshow',    oneLiner: 'Hero photo on top, thumbnail strip beneath.',                      status: 'registered' },
    { id: 'polaroid', label: 'Polaroid wall', oneLiner: 'Scattered tilted polaroids, handwritten, casual.', status: 'registered' },
    // Production:
    { id: 'wall', label: 'Photo wall', oneLiner: 'Uniform 4-up grid, every tile the same aspect ratio.', status: 'shipped' },
  ],

  // ── RSVP ────────────────────────────────────────────────────
  rsvp: [
    { id: 'centered', label: 'Centered', oneLiner: 'Headline + CTA centered on a dark ground.',                          status: 'shipped' },
    { id: 'split',    label: 'Split',    oneLiner: 'Photo left, CTA panel right.',                                       status: 'registered' },
    { id: 'banner', label: 'Banner', oneLiner: 'Thin band across the page, eyebrow + title left, CTA right.', status: 'registered' },
    { id: 'minimal', label: 'Minimal', oneLiner: 'Centered headline + hairline CTA on cream, no chrome.', status: 'registered' },
  ],

  // ── FAQ ─────────────────────────────────────────────────────
  faq: [
    { id: 'accordion', label: 'Accordion',   oneLiner: 'Tappable Q&A rows that expand inline.',                          status: 'shipped' },
    { id: 'twocol',    label: 'Two column',  oneLiner: 'Side-by-side Q&A pairs in two columns.',                         status: 'shipped' },
    { id: 'numbered', label: 'Numbered', oneLiner: 'Numbered list, 01 / 02 / 03 down the left.', status: 'shipped' },
    { id: 'cards',     label: 'Cards',       oneLiner: 'Each Q&A as its own padded card in a 2-column grid.',            status: 'shipped' },
  ],
};

/** Convenience — total variant count for the registry. Useful in
 *  tests + docs. */
export const TOTAL_LAYOUT_VARIANTS = Object.values(LAYOUTS).reduce(
  (acc, list) => acc + list.length,
  0,
);

/** Look up a specific variant by section + id. Returns undefined
 *  when the id isn't registered for the section. */
export function getLayoutVariant(section: SectionKey, id: string): LayoutVariant | undefined {
  return LAYOUTS[section]?.find((v) => v.id === id);
}

/** The prototype's default variant per section (first entry in
 *  each list). Mirrors the L('section', 'default') fallback in
 *  themed-site.jsx. */
export const LAYOUT_DEFAULTS: Record<SectionKey, string> = {
  hero: 'centered',
  story: 'sidebyside',
  details: 'tiles',
  schedule: 'cards',
  travel: 'map',
  registry: 'cards',
  gallery: 'grid',
  rsvp: 'centered',
  faq: 'accordion',
};

/** Resolve the active variant id for a section, given an optional
 *  host pick + an optional Edition default. Mirrors the L() helper
 *  in the prototype with one extra layer (the Edition layoutDefaults).
 *
 *  Order:
 *    1. host's explicit pick (manifest.blockVariants[section].style)
 *    2. Edition prescription (activeEdition.layoutDefaults?.[section])
 *    3. prototype default (LAYOUT_DEFAULTS[section]) */
export function resolveLayout(
  section: SectionKey,
  hostPick: string | undefined,
  editionDefault: string | undefined,
): string {
  return hostPick ?? editionDefault ?? LAYOUT_DEFAULTS[section];
}
