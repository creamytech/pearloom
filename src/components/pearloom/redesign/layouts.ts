 
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
    { id: 'cover',       label: 'Cover',        sub: 'A sealed cover parts on arrival' },
    { id: 'split',       label: 'Split',        sub: 'Type left · photo right' },
    { id: 'spread',      label: 'Editorial',    sub: 'Names off-axis · photo to the edge' },
    { id: 'minimal',     label: 'Minimal',      sub: 'Left-aligned, no photos' },
    { id: 'fullbleed',   label: 'Full photo',   sub: 'Your photo, edge to edge' },
    { id: 'typographic', label: 'Big type',     sub: 'Names stacked, huge type' },
    { id: 'plate',       label: 'Poster',       sub: 'Just their names, enormous' },
    { id: 'postcard',    label: 'Postcard',     sub: 'Card on a tinted mat' },
    { id: 'crest',       label: 'Crest',        sub: 'Monogram · no photo' },
  ],
  story: [
    { id: 'sidebyside', label: 'Side by side', sub: 'Photo + body in 2 cols' },
    { id: 'stacked',    label: 'Stacked',      sub: 'Photo above body' },
    { id: 'quote',      label: 'Quote',        sub: 'Body as a centered pull' },
    { id: 'timeline',   label: 'Timeline',     sub: 'Chapters down a rail' },
    { id: 'zigzag',     label: 'Zigzag',       sub: 'Alternating photo rows' },
    { id: 'letter',     label: 'Letter',       sub: 'A handwritten note' },
  ],
  details: [
    { id: 'tiles',     label: 'Tiles',     sub: 'Card grid' },
    { id: 'iconrow',   label: 'Icon row',  sub: 'Centered glyph row' },
    { id: 'accordion', label: 'Accordion', sub: 'Tap a row to open' },
    { id: 'bento',     label: 'Bento',     sub: 'Hero + tiles' },
    { id: 'ledger',    label: 'Ledger',    sub: 'Quiet ruled rows, no icons' },
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
    { id: 'progress', label: 'Fund', sub: 'Fund card front and center' },
    /* 'storecards' replaced 'logowall' (2026-07-02) — the old grid
       showed the same gift glyph for every store ("a logo wall with
       no logos"). Storecards are typographic plates: the store's
       initials in display type on a hairline plate, never a fake
       logo. Legacy manifests with layouts.registry='logowall' fall
       through to the same renderer (RegistryBlock aliases the id). */
    { id: 'storecards', label: 'Store cards', sub: 'A plate per store' },
  ],
  gallery: [
    { id: 'grid',      label: 'Grid',      sub: '6-col mosaic' },
    { id: 'masonry',   label: 'Masonry',   sub: 'Varied row heights' },
    { id: 'slideshow', label: 'Slideshow', sub: 'Single hero + thumbs' },
    { id: 'polaroid',  label: 'Polaroid',  sub: 'Tilted scrapbook' },
    { id: 'frames',    label: 'Frames',    sub: 'Hairline-framed editorial' },
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
  /* Optional sections (added via the Add Section picker). Each
     has a Layout tab in the PropertyRail; ThemedSite reads
     manifest.layouts.<section> via readVariant and dispatches. */
  countdown: [
    { id: 'cards',   label: 'Cards',     sub: 'Four big stat tiles' },
    { id: 'stripe',  label: 'Stripe',    sub: 'Compact inline bar' },
    { id: 'minimal', label: 'Minimal',   sub: '"N days to go" in display' },
    { id: 'hero',    label: 'Statement', sub: 'Editorial wall-of-numbers' },
    { id: 'ribbon',  label: 'Ribbon',    sub: 'Diagonal sash banner' },
    { id: 'flip',    label: 'Flip clock', sub: 'Split-flap digit cards' },
  ],
  /* 'static' was cut 2026-07-02 — it was the live iframe with
     clicks disabled masquerading as a static image. Old manifests
     with layouts.map='static' fall through to the embed default. */
  map: [
    { id: 'embed',    label: 'Live embed',   sub: 'Pannable Google Maps iframe' },
    { id: 'pin',      label: 'Pin only',     sub: 'Card with pin + Open in Maps' },
    { id: 'split',    label: 'Split',        sub: 'Map left · venue info right' },
    { id: 'postcard', label: 'Postcard',     sub: 'Tilted frame + faux stamp' },
  ],
  music: [
    { id: 'card',      label: 'Card',       sub: 'Title + player in a card' },
    { id: 'minimal',   label: 'Minimal',    sub: 'No card frame' },
    { id: 'fullbleed', label: 'Full-bleed', sub: 'Edge-to-edge embed' },
    { id: 'sidebar',   label: 'Sidebar',    sub: 'Player + description column' },
    { id: 'jukebox',   label: 'Jukebox',    sub: 'Dark plate + gold neon' },
  ],
  /* ── Event-OS blocks (occasion-gated via isBlockApplicable).
     Every variant id below is IMPLEMENTED — the renderers in
     section-variants/blocks/ dispatch on the `variant` prop that
     ThemedSite.blockProps reads from manifest.layouts[section],
     and the Layout tab lists these same entries. (An earlier
     version of this comment called the non-first ids "reserved";
     that was true pre-2026-06-09 and misled an audit since.) */
  itinerary: [
    { id: 'days',    label: 'Days',    sub: 'One card per day, hour rows' },
    /* 'flow' evolved into the thread treatment (2026-07-02): the
       spine is the brand's two-strand weave (accent + gold), not a
       single faded accent line. Id unchanged so existing manifests
       keep resolving; only the label/rendering moved. */
    { id: 'flow',    label: 'Thread',  sub: 'Two strands down the plan' },
    { id: 'tickets', label: 'Tickets', sub: 'Perforated stub per slot' },
  ],
  costSplitter: [
    { id: 'ledger', label: 'Ledger', sub: 'Ruled rows + running total' },
    { id: 'cards',  label: 'Cards',  sub: 'One card per line item' },
  ],
  activityVote: [
    { id: 'pills', label: 'Pills', sub: 'Options as a pill cluster' },
    { id: 'bars',  label: 'Bars',  sub: 'Horizontal tally bars' },
  ],
  toastSignup: [
    { id: 'slots', label: 'Slots', sub: 'Numbered claimable cards' },
    { id: 'list',  label: 'List',  sub: 'Compact single-column list' },
  ],
  adviceWall: [
    { id: 'wall',    label: 'Wall',    sub: 'Masonry of note cards' },
    { id: 'cards',   label: 'Cards',   sub: 'Even card grid' },
    { id: 'letters', label: 'Letters', sub: 'Stacked letter sheets' },
  ],
  program: [
    { id: 'classic',    label: 'Classic',    sub: 'Centered order of service' },
    { id: 'numbered',   label: 'Numbered',   sub: 'Index-style list' },
    { id: 'centerline', label: 'Centerline', sub: 'Moments down a center rail' },
  ],
  livestream: [
    { id: 'card',    label: 'Card',    sub: 'Framed player + join button' },
    { id: 'cinema',  label: 'Cinema',  sub: 'Letterboxed full-width' },
    { id: 'marquee', label: 'Marquee', sub: 'Countdown as a wall of numbers' },
  ],
  obituary: [
    { id: 'letter',  label: 'Letter',  sub: 'Single centered column' },
    { id: 'columns', label: 'Columns', sub: 'Newspaper two-column' },
    { id: 'card',    label: 'Memorial card', sub: 'Portrait medallion + remembrance' },
  ],
  packingList: [
    { id: 'checklist', label: 'Checklist', sub: 'Single ticked column' },
    { id: 'grid',      label: 'Grid',      sub: 'Two-column item grid' },
  ],
  honorList: [
    { id: 'cards',  label: 'Cards',  sub: 'Portrait card per person' },
    { id: 'circle', label: 'Circle', sub: 'Round portraits in a row' },
    { id: 'rows',   label: 'Rows',   sub: 'Compact name + role rows' },
    /* The whosWho block from the EVENT_TYPES registry — reunion-
       voiced: faces + how you know them lead, roles step back. */
    { id: 'relationships', label: 'Who’s who', sub: 'Faces + how you know them' },
  ],
  tributeWall: [
    { id: 'columns', label: 'Columns', sub: 'Masonry of framed tributes' },
    { id: 'rows',    label: 'Rows',    sub: 'A single quiet column' },
  ],
  menu: [
    { id: 'card',   label: 'Card',    sub: 'One centered menu card' },
    { id: 'twocol', label: 'Columns', sub: 'A card per course' },
    { id: 'bill-of-fare', label: 'Bill of fare', sub: 'One tall prix-fixe sheet' },
  ],
  dressCode: [
    { id: 'centered', label: 'Centered', sub: 'Code, tones, example chips' },
    { id: 'wardrobe', label: 'Wardrobe', sub: '"Wear this" photo plates' },
  ],
  nameVote: [
    { id: 'ballot', label: 'Ballot', sub: 'Names in display type, tap to vote' },
    { id: 'tiles',  label: 'Tiles',  sub: 'Name plates in a card grid' },
  ],
  rooms: [
    { id: 'assignments', label: 'Rooms', sub: 'Room cards + guest chips' },
    { id: 'board',       label: 'Board', sub: 'One ruled room / guests list' },
  ],
  thenAndNow: [
    { id: 'pairs', label: 'Pairs', sub: 'Then / now, side by side' },
    { id: 'stack', label: 'Stacked', sub: 'Then above, now below, on a thread' },
  ],
  /* Link-out only — the thread lives where the group already talks
     (WhatsApp / Signal / GroupMe…). Never an embed (livestream is
     the template for the link-never-embed rationale). */
  groupChat: [
    { id: 'card',  label: 'Card',  sub: 'Link out to the app' },
    { id: 'panel', label: 'Thread panel', sub: 'A chat-window frame + join bar' },
  ],
};

export const DEFAULT_VARIANT: Partial<Record<Exclude<SectionId, null>, string>> = {
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
  countdown: 'cards',
  map: 'embed',
  music: 'card',
  /* Event-OS blocks — first variant of each registry above. */
  itinerary: 'days',
  costSplitter: 'ledger',
  activityVote: 'pills',
  toastSignup: 'slots',
  adviceWall: 'wall',
  program: 'classic',
  livestream: 'card',
  obituary: 'letter',
  packingList: 'checklist',
  honorList: 'cards',
  tributeWall: 'columns',
  menu: 'card',
  dressCode: 'centered',
  nameVote: 'ballot',
  rooms: 'assignments',
  thenAndNow: 'pairs',
  groupChat: 'card',
  /* Tool panels (guests, savetheDate, share, dayof, memorial,
     bachelor) have no layout variants — they're host workspaces.
     Partial<> lets the type compile without forcing stub entries
     for every tool. readVariant returns '' on miss. */
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
  return DEFAULT_VARIANT[section] ?? '';
}

/* ── Occasion recommendations ─────────────────────────────────
   A variant can be RECOMMENDED for a set of occasions — surfaced
   as a gold mark in the on-canvas Layout bar AND pre-selected as
   the wizard Sections chooser's default (never auto-applied
   otherwise; Editions + explicit picks stay the resolution chain).
   Keyed `${section}` → an ORDERED list of { id, occasions } rules;
   the first rule whose `occasions` include the site's occasion
   wins, so a section can recommend DIFFERENT variants for
   different occasions (a memorial's story reads as a timeline, an
   anniversary's as a letter). Occasion sets within a section must
   stay disjoint — first-match order is the only tie-break. */
const VARIANT_RECOMMENDATIONS: Partial<Record<Exclude<SectionId, null>, ReadonlyArray<{ id: string; occasions: readonly string[] }>>> = {
  /* Monogram crest — the solemn/formal opening (no photo, no
     scale). Recommended where a photograph-led hero reads wrong. */
  hero: [{ id: 'crest', occasions: ['memorial', 'funeral', 'baptism', 'first-communion', 'confirmation'] }],
  /* Story — the how/who told in the shape the occasion wants: a
     handwritten letter for the couple/renewal register; a chapter
     rail (timeline) for a life or career remembered (memorial,
     milestone, retirement, graduation). */
  story: [
    { id: 'letter', occasions: ['anniversary', 'vow-renewal'] },
    { id: 'timeline', occasions: ['memorial', 'milestone-birthday', 'retirement', 'graduation'] },
  ],
  /* Schedule — a vertical rail with dots reads as an order of the
     day (memorial/funeral) or a multi-day arc (reunion), where the
     four-card default flattens a longer program. */
  schedule: [
    { id: 'timeline', occasions: ['reunion', 'memorial', 'funeral'] },
  ],
  /* Itinerary — the two-strand thread spine (the `flow` id) is the
     signature for the trip occasions where the plan IS the site. */
  itinerary: [
    { id: 'flow', occasions: ['bachelor-party', 'bachelorette-party'] },
  ],
  /* Travel — a stylised map leads for the trips where guests are
     scattered across hotels and need to see the geography, not a
     two-row list. */
  travel: [
    { id: 'map', occasions: ['reunion', 'welcome-party', 'bachelor-party', 'bachelorette-party'] },
  ],
  /* Hairline frames — BRAND §10 bans unframed symmetric
     photography; the frames variant is the on-brand gallery for
     the formal occasions. */
  gallery: [{ id: 'frames', occasions: ['wedding', 'vow-renewal', 'anniversary', 'rehearsal-dinner'] }],
  /* Prix-fixe sheet for the seated-dinner occasions. */
  menu: [{ id: 'bill-of-fare', occasions: ['rehearsal-dinner', 'wedding', 'retirement', 'bar-mitzvah', 'bat-mitzvah', 'quinceanera'] }],
  /* Wardrobe plates where dress guidance is the point. */
  dressCode: [{ id: 'wardrobe', occasions: ['wedding', 'quinceanera', 'sweet-sixteen', 'bar-mitzvah', 'bat-mitzvah'] }],
  /* Portrait-led memorial card — the photograph honoring the
     person leads the remembrance on solemn occasions. */
  obituary: [{ id: 'card', occasions: ['memorial', 'funeral'] }],
  /* Name tiles read best as a short slate to weigh side by side —
     the gender-reveal's handful of options. */
  nameVote: [{ id: 'tiles', occasions: ['gender-reveal'] }],
};

/** The variant id recommended for this section + occasion, or
 *  undefined. Pure lookup — never writes, never wins over an
 *  explicit pick or an Edition default. First matching rule wins. */
export function recommendedVariantFor(
  section: Exclude<SectionId, null>,
  occasion?: string,
): string | undefined {
  const rules = VARIANT_RECOMMENDATIONS[section];
  if (!rules || !occasion) return undefined;
  for (const rule of rules) {
    if (rule.occasions.includes(occasion)) return rule.id;
  }
  return undefined;
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
