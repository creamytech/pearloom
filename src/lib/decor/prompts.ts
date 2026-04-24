/* ========================================================================
   Decor library prompt templates — one function per slot. Every prompt
   takes the same context (occasion + palette + venue + vibe) and returns
   a GPT Image 2 prompt tuned for that slot's specific size and purpose.

   Style rails are shared across slots so the whole library reads as
   one cohesive set of assets rather than six independent images.
   ======================================================================== */

export interface DecorContext {
  occasion: string;
  /** Palette hex values (4-5 items). The model is told to use ONLY these. */
  paletteHex: string[];
  venue?: string;
  vibe?: string;
}

// Style rails — used at the top of every prompt so the library reads cohesive.
const STYLE_RAILS = [
  'Flat ink + gouache illustration. Editorial, hand-drawn, no photorealism.',
  'No gradients, no 3D rendering, no generic stock-illustration look, no AI-glossy finish.',
  'No typography, no text, no logos, no watermarks.',
  'Visible paper grain background in the palette\'s warmest cream tone.',
  'Composition breathes — negative space is respected.',
];

function paletteLine(paletteHex: string[]): string {
  if (!paletteHex?.length) return 'Palette: warm cream + soft sage + muted gold. Editorial, never saturated.';
  return `Use ONLY these hex values, no rainbow, no extra colours: ${paletteHex.slice(0, 5).join(', ')}.`;
}

function venueLine(venue?: string): string {
  if (!venue) return '';
  return `The event takes place at ${venue}. You may reference the venue's geography or feeling subtly — don't name it in the image.`;
}

function vibeLine(vibe?: string): string {
  if (!vibe) return '';
  return `Vibe: ${vibe}.`;
}

/** Occasion-specific motif vocabularies the model should draw from. */
function motifVocabulary(occasion: string): string {
  const occ = (occasion ?? '').toLowerCase();
  switch (occ) {
    case 'wedding':
    case 'engagement':
    case 'anniversary':
    case 'vow-renewal':
    case 'rehearsal-dinner':
    case 'welcome-party':
    case 'brunch':
    case 'bridal-luncheon':
      return 'Motif vocabulary: olive branches, rings, ribbons, wild herbs, a sprig of rosemary, a single small dove, trailing ivy, pressed wildflowers.';
    case 'bachelor-party':
    case 'bachelorette-party':
    case 'bridal-shower':
      return 'Motif vocabulary: confetti scatter, cocktail glasses, palm fronds, a matchbook, a disposable camera, a paper umbrella, a neon shape, a tiny boombox.';
    case 'baby-shower':
    case 'gender-reveal':
    case 'sip-and-see':
    case 'first-birthday':
      return 'Motif vocabulary: balloons on strings, rattles, tiny shoes, a crib silhouette, moons and stars, soft clouds, a storybook page, pressed daisies.';
    case 'birthday':
    case 'milestone-birthday':
    case 'sweet-sixteen':
      return 'Motif vocabulary: candles, streamers, a disco ball, glitter stars, retro party horns, a cassette tape, cake slice, confetti.';
    case 'retirement':
      return 'Motif vocabulary: a palm in the sun, a ship\'s wheel, pocket watch, a cup of coffee, a hammock between two palms, a fishing lure, reading glasses.';
    case 'graduation':
      return 'Motif vocabulary: mortarboard, laurel branch, a folded diploma scroll, a pencil, a single quill, stacked books, an apple, ink pot.';
    case 'memorial':
    case 'funeral':
    case 'celebration-life':
      return 'Motif vocabulary: three tall candles, pressed botanicals, a single dove, a folded letter, a small urn silhouette, a crescent moon, still water. Restrained, reverent, never cute.';
    case 'reunion':
      return 'Motif vocabulary: pennant bunting, a scrapbook corner, class pin, stacked yearbooks, a cassette tape, name tags, a polaroid, wilted daisies.';
    case 'bar-mitzvah':
    case 'bat-mitzvah':
      return 'Motif vocabulary: Torah scroll silhouette, Star of David, filigree border, candles, a kiddush cup, olive branch, parchment corner.';
    case 'quinceanera':
      return 'Motif vocabulary: tiara, cascading magnolia, feathers, a satin ribbon, a pair of heels, filigree, roses in a single palette.';
    case 'baptism':
    case 'first-communion':
    case 'confirmation':
      return 'Motif vocabulary: a single dove, baptismal shell, olive branch, filigree border, candle, water drops, a tiny cross outlined in a hairline.';
    case 'housewarming':
      return 'Motif vocabulary: a key on a ribbon, a tiny house silhouette, a potted olive tree, a thrown-open window, fresh bread, curtains moving.';
    case 'story':
    default:
      return 'Motif vocabulary: a quill, open book corner, pressed leaf, sealing wax seal, ribbon bookmark, a candle stub, a key.';
  }
}

// ── Slot prompts ────────────────────────────────────────────────────────

/** Hero accent — big flourish behind names. 1536x1024. */
export function heroAccentPrompt(ctx: DecorContext): string {
  return [
    `Editorial hero-accent illustration for a ${ctx.occasion.replace(/-/g, ' ')} site.`,
    ...STYLE_RAILS,
    motifVocabulary(ctx.occasion),
    'Compose around the edges so the centre stays clear — decoration, NOT a focal image.',
    paletteLine(ctx.paletteHex),
    venueLine(ctx.venue),
    vibeLine(ctx.vibe),
  ]
    .filter(Boolean)
    .join('\n');
}

/** Divider between every section — wide, short, repeatable feel. */
export function dividerPrompt(ctx: DecorContext): string {
  return [
    `A long horizontal editorial divider ornament for a ${ctx.occasion.replace(/-/g, ' ')} website.`,
    ...STYLE_RAILS,
    motifVocabulary(ctx.occasion),
    'Compose as a single continuous band — a hand-drawn ornament that reads left-to-right.',
    'Examples of the shape we want: a sprig of olive stretched out, a garland of bunting, a line of three small candles with flourishes between them, a chain of connected stars, a trailing vine.',
    'Centre vertically; leave ~15% empty margin above and below the ornament so it composites cleanly over paper.',
    paletteLine(ctx.paletteHex),
    vibeLine(ctx.vibe),
    'The ornament should feel like something an editorial book designer would draw between chapters.',
  ]
    .filter(Boolean)
    .join('\n');
}

/** Section stamps — 2x3 grid of 6 small circular "stamps" (wax-seal feel).
 *  The calling code slices this into individual stamps. */
export function sectionStampsPrompt(ctx: DecorContext): string {
  return [
    `A 3-column 2-row grid of six small circular stamps for a ${ctx.occasion.replace(/-/g, ' ')} site. The stamps are for the sections: story, schedule, travel, registry, gallery, rsvp.`,
    ...STYLE_RAILS,
    motifVocabulary(ctx.occasion),
    'Each stamp is a small icon inside a single thin hairline circle ~260px wide, evenly spaced on a cream paper background.',
    '- Stamp 1 (story): a quill or open book corner.',
    '- Stamp 2 (schedule): a clock face or sun-over-horizon.',
    '- Stamp 3 (travel): a small compass or map pin.',
    '- Stamp 4 (registry): a small gift or envelope.',
    '- Stamp 5 (gallery): a vintage camera silhouette.',
    '- Stamp 6 (rsvp): a sealed envelope with a ribbon.',
    'Each stamp uses ONE ink colour from the palette accent. All six share the same paper background.',
    paletteLine(ctx.paletteHex),
    'Arrange as a clean 3-columns × 2-rows grid with visible gaps. Leave plenty of breathing room between stamps. This sheet will be sliced into six images.',
  ]
    .filter(Boolean)
    .join('\n');
}

/** RSVP confetti — single burst, transparent-ish paper.*/
export function confettiPrompt(ctx: DecorContext): string {
  return [
    `Hand-drawn confetti burst for a ${ctx.occasion.replace(/-/g, ' ')} RSVP success moment.`,
    ...STYLE_RAILS,
    motifVocabulary(ctx.occasion),
    'Compose as a single radial burst outward from the centre — triangles, small circles, hearts, stars, streamers. About 40-60 loose pieces scattered.',
    'Centre should be empty so the RSVP card shows through. Everything radiates outward.',
    paletteLine(ctx.paletteHex),
    'Pieces should feel like torn paper, not vector shapes.',
  ]
    .filter(Boolean)
    .join('\n');
}

/** Footer bouquet — editorial closer above the site footer. */
export function footerBouquetPrompt(ctx: DecorContext): string {
  return [
    `Hand-drawn closing flourish / bouquet for the footer of a ${ctx.occasion.replace(/-/g, ' ')} site.`,
    ...STYLE_RAILS,
    motifVocabulary(ctx.occasion),
    'Compose as a small-to-medium centred ornament that would sit above a "made on Pearloom" footer line.',
    'Examples: a gathered sprig of wildflowers tied with a ribbon, a trio of candles with a ribbon, a laurel wreath with crossed stems, a pair of trailing olive branches.',
    paletteLine(ctx.paletteHex),
    vibeLine(ctx.vibe),
    'Vertical composition — taller than wide. Leaves ~20% margin on sides.',
  ]
    .filter(Boolean)
    .join('\n');
}

/** User-requested sticker — takes an optional free-text hint from the user. */
export function stickerPrompt(ctx: DecorContext & { hint?: string }): string {
  return [
    `A single small hand-drawn sticker for a ${ctx.occasion.replace(/-/g, ' ')} site.`,
    ...STYLE_RAILS,
    motifVocabulary(ctx.occasion),
    ctx.hint ? `User request: "${ctx.hint}"` : 'Pick one iconic motif from the vocabulary above and render it as a single sticker.',
    'The sticker should be a single compact shape centred on the canvas with a soft drop-shadow hinting at a peel-back corner.',
    'Transparent paper-grain background around the sticker so it composites cleanly onto any block.',
    paletteLine(ctx.paletteHex),
    'Square format. The sticker occupies about 70% of the frame with empty margin around it.',
  ]
    .filter(Boolean)
    .join('\n');
}
