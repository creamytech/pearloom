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

import { getEventType } from '@/lib/event-os/event-types';
import { occasionCopyFor } from '@/components/pearloom/redesign/occasion-copy';

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

/** Paper textures the card can wear — the same [data-pl-texture]
 *  grain system the published site uses, so Studio stationery and
 *  the site share one material vocabulary. */
export const STUDIO_TEXTURES: ReadonlyArray<{ id: string; name: string }> = [
  { id: 'linen',  name: 'Linen' },
  { id: 'paper',  name: 'Paper' },
  { id: 'kraft',  name: 'Kraft' },
  { id: 'canvas', name: 'Canvas' },
  { id: 'marble', name: 'Marble' },
  { id: 'gilded', name: 'Gilded' },
];

/** Physical paper stocks (STUDIO-PLAN SV.2) — the sheet the card
 *  is pressed on, decoupled from the palette. A stock overrides
 *  the palette's paper (and, for the tinted/dark sheets, the ink,
 *  so type never vanishes). Custom colors still win on top. */
export interface PaperStock {
  id: string;
  name: string;
  paper: string;
  /** Ink override for sheets the palette's ink can't sit on. */
  ink?: string;
  /** Dark sheet — suppresses the light-paper noise overlay. */
  dark?: boolean;
}

export const PAPER_STOCKS: ReadonlyArray<PaperStock> = [
  { id: 'bright', name: 'Bright white', paper: '#FFFFFF' },
  { id: 'cream',  name: 'Cream',        paper: '#FDFAF0' },
  { id: 'ecru',   name: 'Ecru',         paper: '#F2E9D8' },
  { id: 'blush',  name: 'Blush',        paper: '#FBEEEC' },
  { id: 'kraft',  name: 'Kraft',        paper: '#D9C09A', ink: '#3A2E1C' },
  { id: 'navy',   name: 'Navy',         paper: '#1F2236', ink: '#F8F1E4', dark: true },
];

/** Edge treatments (STUDIO-PLAN SV.2) — the card's frame. null =
 *  default (the kit frame when the card wears the site; bare paper
 *  otherwise). 'plain' explicitly suppresses every frame. */
export const EDGE_TREATMENTS: ReadonlyArray<{ id: string; name: string }> = [
  { id: 'plain',    name: 'Plain' },
  { id: 'hairline', name: 'Hairline' },
  { id: 'double',   name: 'Double rule' },
  { id: 'gilded',   name: 'Gilded' },
];

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
  /** Letter body for the handwritten ('script') layout — a full
   *  sentence in the occasion's voice, not the short line2. */
  scriptBody: string;
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

// crest / split / frame / fullphoto / ticket joined 2026-07-09
// (STUDIO-PLAN SV.5) — the registry pattern mirrors the site's
// section-variant registries.
export const LAYOUTS: StudioLayout[] = [
  { id: 'classic',   name: 'Classic',    sub: 'centered · airy' },
  { id: 'asym',      name: 'Asymmetric', sub: 'off-center · stamp' },
  { id: 'photo',     name: 'Photo-led',  sub: 'big image · caption' },
  { id: 'fullphoto', name: 'Full photo', sub: 'photo · overlay' },
  { id: 'script',    name: 'Letter',     sub: 'handwritten note' },
  { id: 'minimal',   name: 'Minimal',    sub: 'two lines + rule' },
  { id: 'crest',     name: 'Crest',      sub: 'monogram ring · quiet' },
  { id: 'split',     name: 'Split',      sub: 'two columns' },
  { id: 'frame',     name: 'Border',     sub: 'full hairline frame' },
  { id: 'ticket',    name: 'Ticket',     sub: 'stub · perforation' },
];

// 'doodle' (the squiggle) is retired — owner call, 2026-07-09.
// Persisted motif='doodle' rows render clean (MotifOverlay falls
// through to null, same as 'none').
// 'postmark' + 'seal' (STUDIO-PLAN SV.3): the dated ink postmark
// (the same mark the envelope + Sealed Arrival wear) and the
// monogram seal (the site's crest hero, miniaturized).
export const MOTIFS: StudioMotif[] = [
  { id: 'none',     name: 'Clean' },
  { id: 'stamp',    name: 'Stamp' },
  { id: 'postmark', name: 'Postmark' },
  { id: 'seal',     name: 'Seal' },
  { id: 'leaves',   name: 'Leaves' },
  { id: 'tape',     name: 'Tape' },
  { id: 'monogram', name: 'Monogram' },
  { id: 'wax',      name: 'Wax seal' },
];

/** Mark ink choices (SV.3) — which ink the mark is stamped in.
 *  null/auto keeps each mark's own default. */
export const MARK_INKS: ReadonlyArray<{ id: string; name: string }> = [
  { id: 'ink',    name: 'Ink' },
  { id: 'accent', name: 'Accent' },
  { id: 'gold',   name: 'Gold' },
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
  { id: 's3', kind: 'stamp', tone: 'sage',     text: 'WITH LOVE',     icon: 'pear' },
  { id: 'w1', kind: 'wax',   color: '#C97A6E' },
  { id: 'w2', kind: 'wax',   color: '#3D4A1F' },
  { id: 'l1', kind: 'leaf' },
  { id: 'l2', kind: 'leaf2' },
  { id: 'd2', kind: 'doodle', shape: 'sun' },
  { id: 'm1', kind: 'mono', letters: 'S&S' },
  { id: 't1', kind: 'tape', color: '#F0C9A8' },
  { id: 't2', kind: 'tape', color: '#C4B5D9' },
];

/** Display join for the honoree names — solo occasions carry one
 *  name (nameB is empty), pairs join with the ampersand. */
export function joinStudioNames(nameA: string, nameB: string): string {
  return nameB ? `${nameA} & ${nameB}` : nameA;
}

/** Short prose noun for an occasion ("wedding", "memorial",
 *  "bachelorette party") — the registry label's first segment,
 *  lowercased for mid-sentence use. */
export function occasionNoun(occasion?: string | null): string {
  const label = (occasion && getEventType(occasion)?.label) || 'celebration';
  return label.split(' / ')[0].toLowerCase();
}

/** Build the per-type content from manifest data. The Studio
 *  binds these to real fields so editing the date in the hero
 *  flows through to every card automatically. Copy routes by
 *  occasion: couple lines ("are getting married") fire only for
 *  the couple-led wedding arc; solemn occasions (memorial /
 *  funeral) get gathered-not-celebrated wording; everything else
 *  reads its occasion pack's tagline. */
export function buildTypeContent(args: {
  type: StationeryType;
  nameA: string;
  /** Empty string on solo occasions — the card renders one name. */
  nameB: string;
  dateShort: string;       // 'Apr 26, 2027'
  dateLong: string;        // 'Monday, April 26, 2027'
  venue: string;
  place: string;
  siteUrl: string;         // 'pearloom.com/<slug>'
  /** Site occasion id — defaults to 'wedding' (legacy rows). */
  occasion?: string;
}): StudioContent {
  const { type, nameA, nameB, dateLong, venue, place, siteUrl } = args;
  const occasion = args.occasion ?? 'wedding';
  const voice = getEventType(occasion)?.voice ?? 'celebratory';
  const solemn = voice === 'solemn';
  const pack = occasionCopyFor(occasion);
  const noun = occasionNoun(occasion);
  /* Couple-led wedding arc — the only occasions where classic
     couple copy ("are getting married") is true. */
  const coupleArc = occasion === 'wedding' || occasion === 'engagement' || occasion === 'vow-renewal';
  const headline = joinStudioNames(nameA, nameB);
  // Venue + place, de-duplicated: `place` falls back to `venue` when
  // there's no separate address, which doubled the line ("Madison
  // Square Garden · NY · Madison Square Garden · NY"). Collapse when
  // they're equal or one contains the other.
  const locationLine = (() => {
    const a = (venue || '').trim();
    const b = (place || '').trim();
    if (!a) return b;
    if (!b) return a;
    if (a === b || a.includes(b) || b.includes(a)) return a.length >= b.length ? a : b;
    return `${a} · ${b}`;
  })();
  if (type === 'std') {
    return {
      eyebrow: pack.lead,
      headline,
      line2: occasion === 'wedding' ? 'are getting married'
        : occasion === 'engagement' ? 'are engaged'
        : occasion === 'vow-renewal' ? 'are renewing their vows'
        : pack.tagline,
      line3: dateLong,
      line4: place,
      cta: solemn ? 'Details will follow gently' : 'Formal invitation to follow',
      stamp: solemn ? 'IN MEMORY' : 'SAVE THE DATE',
      scriptBody: solemn
        ? "We're setting aside a day to gather and remember together, and we'd be honored to have you with us."
        : coupleArc
          ? "Save the date, we're getting married, and we'd love nothing more than to have you there."
          : `Save the date, a ${noun} is coming, and we'd love nothing more than to have you there.`,
      drafts: [
        { id: 'editorial', name: 'Editorial', tone: 'serif · centered · stamp', accent: 'lavender', layout: 'classic', motif: 'stamp' },
        { id: 'garden',    name: 'Garden',    tone: 'olive · vines · soft',     accent: 'sage',     layout: 'asym',    motif: 'leaves' },
        { id: 'polaroid',  name: 'Polaroid',  tone: 'photo-led · warm',         accent: 'peach',    layout: 'photo',   motif: 'tape' },
      ],
      pearNudges: [
        'Try a serif headline, it lands warmer for save-the-dates.',
        'Most hosts send 6–9 months out, earlier for a travel weekend.',
        'Add a stamp with the date. Guests glance at one detail; make it that.',
      ],
    };
  }
  if (type === 'invite') {
    return {
      eyebrow: solemn ? 'Join us in remembering' : 'You are invited to celebrate',
      headline,
      line2: solemn ? 'a gathering to honor a beautiful life'
        : coupleArc ? 'request the pleasure of your company'
        : pack.tagline,
      line3: dateLong,
      line4: locationLine,
      cta: 'Kindly respond by the date on your card',
      stamp: solemn ? 'IN MEMORY' : "YOU’RE INVITED",
      scriptBody: solemn
        ? "We're gathering to remember a beautiful life, and we'd be honored to have you with us."
        : coupleArc
          ? "We're getting married, and we'd love nothing more than to have you with us."
          : `We're gathering for a ${noun}, and we'd love nothing more than to have you with us.`,
      drafts: [
        { id: 'editorial', name: 'Letterpress',  tone: 'classic · centered',      accent: 'cream',    layout: 'classic', motif: 'monogram' },
        { id: 'garden',    name: 'En plein air', tone: 'natural · pressed leaves', accent: 'sage',     layout: 'asym',    motif: 'leaves' },
        { id: 'modern',    name: 'Modern',       tone: 'sans · asymmetric',        accent: 'lavender', layout: 'asym',    motif: 'stamp' },
      ],
      pearNudges: [
        'Switch the date to spelled-out form, it reads more formal.',
        'Add a meal preference question to the RSVP card on the back.',
        solemn
          ? 'I can soften any line, gentle, formal, or spare.'
          : 'I can rewrite the body in three tones, formal, warm, playful.',
      ],
    };
  }
  return {
    eyebrow: solemn ? 'With gratitude' : 'Thank you',
    headline: solemn ? 'with heartfelt thanks' : 'with all our love',
    line2: solemn ? 'for standing with us' : 'for celebrating with us',
    line3: dateLong,
    line4: solemn ? `the family of ${nameA}` : `love, ${headline}`,
    cta: `Photos at ${siteUrl}`,
    stamp: 'WITH GRATITUDE',
    scriptBody: solemn
      ? 'Thank you for standing with us, and for every kind word. It meant more than we can say.'
      : "We can't believe it really happened, and we can't believe you were there. Thank you, with all our love, for celebrating with us.",
    drafts: [
      { id: 'photo',   name: 'Photo card',  tone: 'big photo · short note', accent: 'peach',    layout: 'photo',   motif: 'tape' },
      { id: 'script',  name: 'Handwritten', tone: 'script · personal',       accent: 'cream',    layout: 'script',  motif: 'wax' },
      { id: 'minimal', name: 'Minimal',     tone: 'sans · two lines',         accent: 'lavender', layout: 'minimal', motif: 'monogram' },
    ],
    pearNudges: [
      "Write each one slightly different, guests notice when it's personal.",
      "I'll auto-fill 'thank you for the [gift]' from your registry log.",
      solemn
        ? 'Send within a few weeks, a short note means a great deal.'
        : `Schedule for the day after the ${noun}, they arrive while it’s still fresh.`,
    ],
  };
}
