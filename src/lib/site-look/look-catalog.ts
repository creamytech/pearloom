// ─────────────────────────────────────────────────────────────
// Pearloom / lib/site-look/look-catalog.ts — the ONE list of
// wearable kits + papers.
//
// The editor's Design tab (ThemePickerBody) and the wizard's
// fitting room each carried their own hand-typed subset — the
// fitting room had drifted to 7 of 24 kits and 9 of 12 papers,
// so a host trying looks on their pressing simply never saw most
// of the wardrobe. Both surfaces import from here now; the CSS
// (pearloom.css [data-pl-kit] / [data-pl-texture]) is the render
// authority these ids must match.
//
// Leaf module: pure data, no imports.
// ─────────────────────────────────────────────────────────────

export interface KitEntry { id: string; label: string; blurb: string }

export const KIT_CATALOG: readonly KitEntry[] = [
  { id: 'classic',   label: 'Classic',   blurb: 'Theme-native cards & rules' },
  { id: 'ticket',    label: 'Ticket',    blurb: 'Perforated stubs · monospace' },
  { id: 'plate',     label: 'Plate',     blurb: 'Engraved frames · Roman' },
  { id: 'scrapbook', label: 'Scrapbook', blurb: 'Taped, tilted, handwritten' },
  { id: 'index',     label: 'Index',     blurb: 'Ruled cards · red margin' },
  { id: 'minimal',   label: 'Minimal',   blurb: 'Hairlines · big numerals' },
  { id: 'arch',      label: 'Arch',      blurb: 'Arched cards · soft domes' },
  { id: 'stamp',     label: 'Stamp',     blurb: 'Postage frames · postmarks' },
  { id: 'deco',      label: 'Deco',      blurb: 'Gold frames · geometric' },
  { id: 'gallery',   label: 'Gallery',   blurb: 'Museum mats · exhibit numbers' },
  { id: 'menu',      label: 'Tasting Menu', blurb: 'Gold rules · dotted leaders' },
  { id: 'glass',     label: 'Glass',     blurb: 'Liquid panes · aurora light' },
  { id: 'boarding-pass', label: 'Boarding pass', blurb: 'Accent band · dashed tear line' },
  { id: 'marquee',   label: 'Marquee',   blurb: 'Dotted gold bulbs · glow' },
  { id: 'chalkboard', label: 'Chalkboard', blurb: 'Slate board · chalk ink' },
  { id: 'nursery',   label: 'Nursery',   blurb: 'Soft pillow · pastel wash' },
  { id: 'kraft',     label: 'Kraft',     blurb: 'Field-notes · stitched edge' },
  { id: 'memoriam',  label: 'Memoriam',  blurb: 'Mourning keyline · ink edge' },
  { id: 'certificate', label: 'Certificate', blurb: 'Gold frame · wax seal' },
  { id: 'luggage-tag', label: 'Luggage tag', blurb: 'Manila tag · punched hole' },
  { id: 'linen-press', label: 'Linen press', blurb: 'Woven inset · rustic press' },
  { id: 'wax-seal',  label: 'Wax seal',  blurb: 'Stamped seal · formal invites' },
  { id: 'pennant',   label: 'Pennant',   blurb: 'Notched banner foot' },
  { id: 'embossed',  label: 'Embossed',  blurb: 'Raised relief · borderless' },
] as const;

export interface TextureEntry { id: string; label: string }

export const TEXTURE_CATALOG: readonly TextureEntry[] = [
  { id: 'none', label: 'None' },
  { id: 'linen', label: 'Linen' },
  { id: 'paper', label: 'Paper' },
  { id: 'cotton', label: 'Cotton' },
  { id: 'watercolor', label: 'Watercolor' },
  { id: 'velvet', label: 'Velvet' },
  { id: 'canvas', label: 'Canvas' },
  { id: 'kraft', label: 'Kraft' },
  { id: 'vellum', label: 'Vellum' },
  { id: 'letterpress', label: 'Letterpress' },
  { id: 'newsprint', label: 'Newsprint' },
  { id: 'marble', label: 'Marble' },
] as const;
