// ─────────────────────────────────────────────────────────────
// Pearloom / studio/studio-constants.ts
//
// Palettes, layouts, motifs, copy tones, font pairs, and the
// asset palette for the stationery Studio. Shared between the
// canvas, the rails, the send overlay, and the AI draft endpoint.
//
// Keep the IDs stable — the manifest persists them under
// manifest.studio.{type}.{palette,layout,fontPair,motif,tone}.
// ─────────────────────────────────────────────────────────────

export type StationeryType = 'std' | 'invite' | 'thanks';
export type CardView = 'front' | 'back' | 'envelope';

export interface StudioPalette {
  id: string;
  name: string;
  /** Card paper background. */
  paper: string;
  /** Body text color. */
  ink: string;
  /** Primary accent — rules, headlines secondary, stamps. */
  accent: string;
  /** Wash / chip background — paired with accent. */
  accent2: string;
  sub: string;
}

export interface StudioFontPair {
  id: string;
  name: string;
  display: string;
  ui: string;
  weight: number;
  italic: boolean;
  sub: string;
}

export interface StudioLayout {
  id: string;
  name: string;
  sub: string;
}

export interface StudioMotif {
  id: string;
  name: string;
}

export interface StudioCopyTone {
  id: string;
  label: string;
  sub: string;
}

export interface StudioDraft {
  id: string;
  name: string;
  tone: string;
  /** A palette id from PALETTES below. */
  accent: string;
  /** A layout id from LAYOUTS below. */
  layout: string;
  /** A motif id from MOTIFS below. */
  motif: string;
}

export interface StudioContent {
  eyebrow: string;
  headline: string;
  line2: string;
  line3: string;
  line4: string;
  cta: string;
  stamp: string;
  drafts: StudioDraft[];
  pearNudges: string[];
}

export interface AssetEntry {
  id: string;
  kind: 'stamp' | 'wax' | 'leaf' | 'leaf2' | 'doodle' | 'mono' | 'tape';
  /** Stamps: tone preset (lavender/peach/sage). */
  tone?: string;
  /** Stamps: text inside the postage rounded rect. */
  text?: string;
  /** Stamps: small icon. */
  icon?: string;
  /** Wax + tape: solid color override. */
  color?: string;
  /** Doodles: 'squiggle' | 'sun'. */
  shape?: 'squiggle' | 'sun';
  /** Monogram: letters to render. */
  letters?: string;
  /** AI-generated assets: a public URL replacing the SVG glyph. */
  url?: string;
}

export const PALETTES: StudioPalette[] = [
  { id: 'lavender', name: 'Dusk',         paper: '#FDFAF0', ink: '#3D4A1F', accent: '#C4B5D9', accent2: '#E8E0F0', sub: 'lavender · olive' },
  { id: 'sage',     name: 'Garden',       paper: '#FDFAF0', ink: '#3D4A1F', accent: '#8B9C5A', accent2: '#E3E6C8', sub: 'olive · sage' },
  { id: 'peach',    name: 'Apricot',      paper: '#FDFAF0', ink: '#C6703D', accent: '#F0C9A8', accent2: '#FBE8D6', sub: 'peach · ink' },
  { id: 'cream',    name: 'Letterpress',  paper: '#F8F1E4', ink: '#3D4A1F', accent: '#3D4A1F', accent2: '#EDE0C5', sub: 'cream · olive' },
  { id: 'twilight', name: 'Twilight',     paper: '#1F2236', ink: '#F8F1E4', accent: '#C4B5D9', accent2: '#3D3856', sub: 'navy · cream' },
  { id: 'rose',     name: 'Rose',         paper: '#FBEEEC', ink: '#3D4A1F', accent: '#C97A6E', accent2: '#F4D5CD', sub: 'rose · olive' },
];

export const FONT_PAIRS: StudioFontPair[] = [
  { id: 'editorial', name: 'Editorial',   display: "'Fraunces', Georgia, serif",      ui: "'Inter', system-ui, sans-serif", weight: 600, italic: false, sub: 'Fraunces · Inter' },
  { id: 'garden',    name: 'Garden',      display: "'Fraunces', Georgia, serif",      ui: "'Inter', system-ui, sans-serif", weight: 500, italic: true,  sub: 'Fraunces italic' },
  { id: 'modern',    name: 'Modern',      display: "'Inter', system-ui, sans-serif",  ui: "'Inter', system-ui, sans-serif", weight: 700, italic: false, sub: 'Inter · Inter' },
  { id: 'script',    name: 'Handwritten', display: "'Caveat', cursive",               ui: "'Inter', system-ui, sans-serif", weight: 600, italic: false, sub: 'Caveat · Inter' },
];

export const LAYOUTS: StudioLayout[] = [
  { id: 'classic', name: 'Classic',    sub: 'centered · airy' },
  { id: 'asym',    name: 'Asymmetric', sub: 'off-center · stamp' },
  { id: 'photo',   name: 'Photo-led',  sub: 'big image · caption' },
  { id: 'script',  name: 'Letter',     sub: 'handwritten note' },
  { id: 'minimal', name: 'Minimal',    sub: 'two lines + rule' },
];

export const MOTIFS: StudioMotif[] = [
  { id: 'none',     name: 'Clean' },
  { id: 'stamp',    name: 'Stamp' },
  { id: 'leaves',   name: 'Leaves' },
  { id: 'tape',     name: 'Tape' },
  { id: 'monogram', name: 'Monogram' },
  { id: 'wax',      name: 'Wax seal' },
  { id: 'doodle',   name: 'Doodle' },
];

export const COPY_TONES: StudioCopyTone[] = [
  { id: 'formal',  label: 'Formal',  sub: '"request the pleasure"' },
  { id: 'warm',    label: 'Warm',    sub: '"come celebrate with us"' },
  { id: 'playful', label: 'Playful', sub: "\"we’re doing the thing!\"" },
  { id: 'spare',   label: 'Spare',   sub: 'two lines, no more' },
];

export const DEFAULT_ASSET_PALETTE: AssetEntry[] = [
  { id: 's1', kind: 'stamp', tone: 'lavender', text: 'SAVE THE DATE', icon: 'heart' },
  { id: 's2', kind: 'stamp', tone: 'peach',    text: 'BY AIR MAIL',   icon: 'sparkle' },
  { id: 's3', kind: 'stamp', tone: 'sage',     text: 'PARTY OF TWO',  icon: 'pear' },
  { id: 'w1', kind: 'wax',   color: '#C97A6E' },
  { id: 'w2', kind: 'wax',   color: '#3D4A1F' },
  { id: 'l1', kind: 'leaf' },
  { id: 'l2', kind: 'leaf2' },
  { id: 'd1', kind: 'doodle', shape: 'squiggle' },
  { id: 'd2', kind: 'doodle', shape: 'sun' },
  { id: 'm1', kind: 'mono', letters: 'S&S' },
  { id: 't1', kind: 'tape', color: '#F0C9A8' },
  { id: 't2', kind: 'tape', color: '#C4B5D9' },
];

export const STATIONERY_LABELS: Record<StationeryType, string> = {
  std: 'Save the date',
  invite: 'Invitation',
  thanks: 'Thank-you',
};

/** Build the per-type content from manifest data. The Studio
 *  binds these to real fields so editing the date in the hero
 *  flows through to every card automatically. */
export function buildTypeContent(args: {
  type: StationeryType;
  nameA: string;
  nameB: string;
  dateShort: string;       // 'Apr 26, 2027'
  dateLong: string;        // 'Monday, April 26, 2027'
  venue: string;
  place: string;
  siteUrl: string;         // 'pearloom.com/<slug>'
}): StudioContent {
  const { type, nameA, nameB, dateLong, venue, place, siteUrl } = args;
  if (type === 'std') {
    return {
      eyebrow: 'Save the date',
      headline: `${nameA} & ${nameB}`,
      line2: 'are getting married',
      line3: dateLong,
      line4: place,
      cta: 'Formal invitation to follow',
      stamp: 'SAVE THE DATE',
      drafts: [
        { id: 'editorial', name: 'Editorial', tone: 'serif · centered · stamp', accent: 'lavender', layout: 'classic', motif: 'stamp' },
        { id: 'garden',    name: 'Garden',    tone: 'olive · vines · soft',     accent: 'sage',     layout: 'asym',    motif: 'leaves' },
        { id: 'polaroid',  name: 'Polaroid',  tone: 'photo-led · warm',         accent: 'peach',    layout: 'photo',   motif: 'tape' },
      ],
      pearNudges: [
        'Try a serif headline — it lands warmer for save-the-dates.',
        "Most couples send 6–9 months out. You're at 12 — perfect.",
        'Add a stamp with the date. Guests glance at one detail; make it that.',
      ],
    };
  }
  if (type === 'invite') {
    return {
      eyebrow: 'You are invited to celebrate',
      headline: `${nameA} & ${nameB}`,
      line2: 'request the pleasure of your company',
      line3: dateLong,
      line4: `${venue} · ${place}`,
      cta: 'Kindly respond by the date on your card',
      stamp: "YOU’RE INVITED",
      drafts: [
        { id: 'editorial', name: 'Letterpress',  tone: 'classic · centered',      accent: 'cream',    layout: 'classic', motif: 'monogram' },
        { id: 'garden',    name: 'En plein air', tone: 'natural · pressed leaves', accent: 'sage',     layout: 'asym',    motif: 'leaves' },
        { id: 'modern',    name: 'Modern',       tone: 'sans · asymmetric',        accent: 'lavender', layout: 'asym',    motif: 'stamp' },
      ],
      pearNudges: [
        'Switch the date to spelled-out form — it reads more formal.',
        'Add a meal preference question to the RSVP card on the back.',
        'I can rewrite the body in three tones — formal, warm, playful.',
      ],
    };
  }
  return {
    eyebrow: 'Thank you',
    headline: 'with all our love',
    line2: 'for celebrating with us',
    line3: dateLong,
    line4: `love, ${nameA} & ${nameB}`,
    cta: `Photos at ${siteUrl}`,
    stamp: 'WITH GRATITUDE',
    drafts: [
      { id: 'photo',   name: 'Photo card',  tone: 'big photo · short note', accent: 'peach',    layout: 'photo',   motif: 'tape' },
      { id: 'script',  name: 'Handwritten', tone: 'script · personal',       accent: 'cream',    layout: 'script',  motif: 'wax' },
      { id: 'minimal', name: 'Minimal',     tone: 'sans · two lines',         accent: 'lavender', layout: 'minimal', motif: 'monogram' },
    ],
    pearNudges: [
      "Write each one slightly different — guests notice when it's personal.",
      "I'll auto-fill 'thank you for the [gift]' from your registry log.",
      'Schedule for the day after the wedding — they arrive while it’s still fresh.',
    ],
  };
}
