/* eslint-disable no-restricted-syntax */
/* LITERAL PORT of handoff/shared/site-config.jsx LAYOUTS map.

   Each section has a fixed registry of variant ids; PropertyRail's
   Layout tab renders the registry as a tile grid + ThemedSite reads
   manifest.layouts[sectionId] and dispatches the active variant to
   the section's render function.

   Variant labels are also exported so the picker can render
   "Centered · default scroll" style copy without re-deriving. */

import type { SectionId } from './EditorRedesign';

export interface LayoutVariant {
  id: string;
  label: string;
  sub?: string;
}

export const LAYOUTS: Partial<Record<Exclude<SectionId, null>, LayoutVariant[]>> = {
  hero: [
    { id: 'centered',    label: 'Centered',     sub: 'Default scroll' },
    { id: 'split',       label: 'Split',        sub: 'Type left · photo right' },
    { id: 'minimal',     label: 'Minimal',      sub: 'Left-aligned, no photos' },
    { id: 'fullbleed',   label: 'Full-bleed',   sub: 'Photo behind dark scrim' },
    { id: 'typographic', label: 'Typographic',  sub: 'Names stacked, huge type' },
    { id: 'postcard',    label: 'Postcard',     sub: 'Card on a tinted mat' },
  ],
  story: [
    { id: 'sidebyside', label: 'Side by side', sub: 'Photo + body in 2 cols' },
    { id: 'stacked',    label: 'Stacked',      sub: 'Hero photo above body' },
    { id: 'quote',      label: 'Quote',        sub: 'Body as a centered pull' },
    { id: 'timeline',   label: 'Timeline',     sub: 'Chapters down a rail' },
    { id: 'zigzag',     label: 'Zigzag',       sub: 'Alternating photo rows' },
    { id: 'letter',     label: 'Letter',       sub: 'A handwritten note' },
  ],
  details: [
    { id: 'tiles',     label: 'Tiles',     sub: '3 card grid' },
    { id: 'iconrow',   label: 'Icon row',  sub: 'Centered glyph row' },
    { id: 'accordion', label: 'Accordion', sub: 'Stacked rows' },
    { id: 'bento',     label: 'Bento',     sub: 'Hero + tiles' },
  ],
  schedule: [
    { id: 'cards',    label: 'Cards',    sub: '4 time cards in a row' },
    { id: 'timeline', label: 'Timeline', sub: 'Vertical rail with dots' },
    { id: 'stepper',  label: 'Stepper',  sub: 'Numbered circles in a line' },
    { id: 'numbered', label: 'Numbered', sub: 'Index-style list' },
  ],
  travel: [
    { id: 'map',      label: 'Map',      sub: 'Stylised map + 2 hotel cards' },
    { id: 'rows',     label: 'Rows',     sub: '2-col hotel rows' },
    { id: 'table',    label: 'Table',    sub: 'Compact comparison row' },
    { id: 'carousel', label: 'Carousel', sub: 'Horizontal scroller' },
  ],
  registry: [
    { id: 'cards',    label: 'Cards',    sub: 'Pill row beneath blurb' },
    { id: 'chips',    label: 'Chips',    sub: 'Tight pill cluster' },
    { id: 'progress', label: 'Progress', sub: 'Highlighted fund bar' },
    { id: 'logowall', label: 'Logo wall', sub: 'Logo grid' },
  ],
  gallery: [
    { id: 'grid',      label: 'Grid',      sub: '6-col mosaic' },
    { id: 'masonry',   label: 'Masonry',   sub: 'Varied row heights' },
    { id: 'slideshow', label: 'Slideshow', sub: 'Single hero + thumbs' },
    { id: 'polaroid',  label: 'Polaroid',  sub: 'Tilted scrapbook' },
  ],
  faq: [
    { id: 'accordion', label: 'Accordion', sub: 'Stacked rows' },
    { id: 'twocol',    label: '2-column',  sub: 'Side-by-side answers' },
    { id: 'numbered',  label: 'Numbered',  sub: 'Index-style list' },
    { id: 'cards',     label: 'Cards',     sub: 'Each Q in its own card' },
  ],
  rsvp: [
    { id: 'centered', label: 'Centered', sub: 'Dark inverse panel' },
    { id: 'split',    label: 'Split',    sub: 'Photo + form' },
    { id: 'banner',   label: 'Banner',   sub: 'Thin top-of-page bar' },
    { id: 'minimal',  label: 'Minimal',  sub: 'Tiny pill' },
  ],
  nav: [
    { id: 'centered',     label: 'Centered',     sub: 'Logo center · links flank' },
    { id: 'split',        label: 'Split',        sub: 'Logo left · links right · CTA right' },
    { id: 'serif-block',  label: 'Serif block',  sub: 'Display headline · subdued links' },
    { id: 'minimal-text', label: 'Minimal text', sub: 'Links only · no logo · no CTA' },
    { id: 'iconic',       label: 'Iconic',       sub: 'Pear glyph + thin link rail' },
  ],
  navMobile: [
    { id: 'overlay',      label: 'Full-screen overlay', sub: 'Fade in over canvas' },
    { id: 'slide-in',     label: 'Slide-in',            sub: 'Right-edge drawer' },
    { id: 'bottom-sheet', label: 'Bottom sheet',        sub: 'Drag-up modal' },
    { id: 'pill',         label: 'Compact pill',        sub: 'Floating pill with collapsed menu' },
  ],
};

export const DEFAULT_VARIANT: Record<Exclude<SectionId, null>, string> = {
  hero: 'centered',
  story: 'sidebyside',
  details: 'tiles',
  schedule: 'cards',
  travel: 'rows',
  registry: 'cards',
  gallery: 'grid',
  faq: 'accordion',
  rsvp: 'centered',
  nav: 'split',
  navMobile: 'slide-in',
};

export function readVariant(
  manifest: { layouts?: Record<string, string>; edition?: string } | unknown,
  section: Exclude<SectionId, null>,
): string {
  const m = manifest as { layouts?: Record<string, string>; edition?: string };
  const layouts = m?.layouts ?? {};
  /* 1. Explicit host pick → 2. Edition's layoutDefaults[section]
     → 3. per-section hardcoded default. */
  if (layouts[section]) return layouts[section];
  const editionFallback = EDITION_LAYOUT_DEFAULTS[m?.edition ?? ''];
  if (editionFallback && editionFallback[section]) return editionFallback[section] ?? '';
  return DEFAULT_VARIANT[section];
}

/* Read-time mirror of EditionDefinition.layoutDefaults from
   src/lib/site-editions/editions.ts so ThemedSite doesn't need to
   import the full Edition module. Sync if Editions get new defaults. */
const EDITION_LAYOUT_DEFAULTS: Record<string, Partial<Record<Exclude<SectionId, null>, string>>> = {
  almanac:       { hero: 'postcard', story: 'sidebyside' },
  cinema:        { hero: 'fullbleed', story: 'quote' },
  'postcard-box':{ hero: 'postcard', story: 'letter' },
  'linen-folder':{ hero: 'split', story: 'sidebyside' },
  quiet:         { hero: 'minimal', story: 'stacked' },
  bloom:         { hero: 'typographic', story: 'timeline' },
};
