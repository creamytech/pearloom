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
  /** User-provided custom prompt. When set, REPLACES the auto-picked
   *  motif vocabulary entry — the user gets to dictate exactly what
   *  Pear draws. Style rails + palette + negative prompt still apply. */
  customPrompt?: string;
}

// Style rails — used at the top of every prompt so the library reads cohesive.
// Updated 2026-04-26 (v9): pure white background is mandatory because
// gpt-image-2 doesn't honour `background: 'transparent'`. Our
// post-processor (removeWhiteBackground) flood-fills white from the
// canvas edges, so the prompt has to GUARANTEE the model gives us
// a clean #FFFFFF backdrop with no paper grain, gradients, or
// off-white tones.
const STYLE_RAILS = [
  'Editorial book-ornament illustration in the style of a Penguin Classics chapter break.',
  'Hand-drawn with a single fine-point pen line — no fills except for solid leaf or petal shapes.',
  'ONE motif only. No multi-subject compositions. Most of the canvas is empty.',
  'No gradients, no 3D, no glossy AI finish, no generic stock-illustration look, no modern flat-design icons.',
  'No typography, no text, no logos, no watermarks, no decorative borders around the image edge.',
  'Negative space is the subject. The motif sits in the centre with at least 40% of the frame empty.',
  // ── BACKGROUND CONTRACT — MUST be honoured. ──
  'BACKGROUND: pure flat #FFFFFF white only. NO paper texture, NO grain, NO cream tone, NO off-white, NO subtle wash, NO drop shadow, NO gradient. The post-processor will flood-fill the white to transparent — any non-white pixel survives.',
];

const NEGATIVE_PROMPT =
  'Avoid: rainbow colours, multiple competing subjects, busy compositions, overlapping elements, cute cartoon style, glossy AI finish, photo-realistic textures, oversaturated colours, modern flat-design icons, generic clipart, vector-perfect symmetry, paper texture in the background, cream-coloured background, off-white background, drop shadows that bleed into the background.';

/** Pick ONE motif at random from a vocabulary list — gpt-image-1
 *  composes far more cleanly when given a single subject than when
 *  given a buffet of options. */
function pickOne(vocab: string): string {
  const items = vocab.split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
  if (items.length === 0) return vocab;
  return items[Math.floor(Math.random() * items.length)] ?? items[0]!;
}

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
      return 'Motif vocabulary: an olive sprig, a sprig of rosemary, a single trailing ivy vine, a pressed wildflower, a single laurel branch, a fern frond, a single field daisy stem.';
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
  const motif = (ctx.customPrompt && ctx.customPrompt.trim())
    || pickOne(motifVocabulary(ctx.occasion).replace(/^Motif vocabulary:\s*/i, ''));
  return [
    `Editorial hero-accent illustration for a ${ctx.occasion.replace(/-/g, ' ')} site.`,
    ...STYLE_RAILS,
    `DRAW EXACTLY ONE motif: ${motif}. Nothing else. No additional decorative elements.`,
    'Compose around the edges so the centre stays clear — decoration, NOT a focal image.',
    paletteLine(ctx.paletteHex),
    venueLine(ctx.venue),
    vibeLine(ctx.vibe),
    NEGATIVE_PROMPT,
  ]
    .filter(Boolean)
    .join('\n');
}

/** Divider between every section — wide, short, repeatable feel. */
export function dividerPrompt(ctx: DecorContext): string {
  const motif = (ctx.customPrompt && ctx.customPrompt.trim())
    || pickOne(motifVocabulary(ctx.occasion).replace(/^Motif vocabulary:\s*/i, ''));
  return [
    `A long horizontal editorial divider ornament for a ${ctx.occasion.replace(/-/g, ' ')} website.`,
    ...STYLE_RAILS,
    `DRAW EXACTLY ONE motif stretched horizontally: ${motif}. No additional motifs or decorative elements.`,
    'Compose as a single continuous band — a hand-drawn ornament that reads left-to-right.',
    'Centre vertically; leave ~15% empty margin above and below the ornament so it composites cleanly over paper.',
    paletteLine(ctx.paletteHex),
    vibeLine(ctx.vibe),
    'The ornament should feel like something an editorial book designer would draw between chapters.',
    NEGATIVE_PROMPT,
  ]
    .filter(Boolean)
    .join('\n');
}

/** Section stamps — 2x3 grid of 6 small circular "stamps" (wax-seal feel).
 *  The calling code slices this into individual stamps. */
export function sectionStampsPrompt(ctx: DecorContext): string {
  // For section stamps the customPrompt is treated as a STYLE direction
  // (e.g. "more botanical, less letterpress") that steers the whole sheet.
  // The 6 motifs themselves are fixed by section meaning.
  const styleDirective = ctx.customPrompt && ctx.customPrompt.trim()
    ? `Style direction from the user: ${ctx.customPrompt.trim()}.`
    : '';
  return [
    `A 3-column 2-row grid of six small circular stamps for a ${ctx.occasion.replace(/-/g, ' ')} site. The stamps are for the sections: story, schedule, travel, registry, gallery, rsvp.`,
    styleDirective,
    ...STYLE_RAILS,
    'Each stamp is a single small editorial icon centred inside a thin hairline circle, evenly spaced on a flat #FFFFFF white background. ONE motif per stamp — never compound subjects.',
    '- Stamp 1 (story): a single quill OR a single open book corner.',
    '- Stamp 2 (schedule): a single clock face OR a single sun-over-horizon.',
    '- Stamp 3 (travel): a single compass OR a single map pin.',
    '- Stamp 4 (registry): a single small gift OR a single envelope.',
    '- Stamp 5 (gallery): a single vintage camera silhouette.',
    '- Stamp 6 (rsvp): a single sealed envelope with a ribbon.',
    'Each stamp uses ONE ink colour from the palette accent. All six sit on the SAME flat #FFFFFF background.',
    paletteLine(ctx.paletteHex),
    'Arrange as a clean 3-columns × 2-rows grid with visible gaps. Leave plenty of breathing room between stamps. This sheet will be sliced into six images.',
    NEGATIVE_PROMPT,
  ]
    .filter(Boolean)
    .join('\n');
}

/** RSVP confetti — single burst, transparent-ish paper.*/
export function confettiPrompt(ctx: DecorContext): string {
  const customLine = ctx.customPrompt && ctx.customPrompt.trim()
    ? `User direction (override the default scatter description): ${ctx.customPrompt.trim()}.`
    : '';
  return [
    `Hand-drawn confetti scatter for a ${ctx.occasion.replace(/-/g, ' ')} RSVP success moment.`,
    ...STYLE_RAILS,
    customLine || 'Six to ten torn-paper pieces scattered loosely around an empty centre — small triangles, single petals, single seeds, soft semi-circles. NO 40-piece chaos. NO hearts. NO stars overlapping each other.',
    'Centre should be visibly empty so the RSVP card shows through. Pieces feel quiet, like a single handful of paper tossed at slow shutter.',
    paletteLine(ctx.paletteHex),
    'Pieces should feel like torn paper, not vector shapes.',
    NEGATIVE_PROMPT,
  ]
    .filter(Boolean)
    .join('\n');
}

/** Footer bouquet — editorial closer above the site footer. */
export function footerBouquetPrompt(ctx: DecorContext): string {
  const motif = (ctx.customPrompt && ctx.customPrompt.trim())
    || pickOne(motifVocabulary(ctx.occasion).replace(/^Motif vocabulary:\s*/i, ''));
  return [
    `Hand-drawn closing flourish for the footer of a ${ctx.occasion.replace(/-/g, ' ')} site.`,
    ...STYLE_RAILS,
    `DRAW EXACTLY ONE motif: ${motif}. Vertical composition, taller than wide. No additional ornament.`,
    'Sits above a "made on Pearloom" footer line — keep the ornament humble and centred.',
    paletteLine(ctx.paletteHex),
    vibeLine(ctx.vibe),
    'Leaves ~20% margin on sides.',
    NEGATIVE_PROMPT,
  ]
    .filter(Boolean)
    .join('\n');
}

/** User-requested sticker — takes an optional free-text hint from the user. */
export function stickerPrompt(ctx: DecorContext & { hint?: string }): string {
  const motif = pickOne(motifVocabulary(ctx.occasion).replace(/^Motif vocabulary:\s*/i, ''));
  return [
    `A single small hand-drawn sticker for a ${ctx.occasion.replace(/-/g, ' ')} site.`,
    ...STYLE_RAILS,
    ctx.hint ? `User request: "${ctx.hint}". Render ONLY this — one shape, no embellishments.` : `DRAW EXACTLY ONE motif: ${motif}. Render as a single sticker shape — no scene, no background detail.`,
    'The sticker should be a single compact shape centred on the canvas. NO drop shadow — drop shadows confuse the white-flood post-processor.',
    'Pure flat #FFFFFF background around the sticker — every non-sticker pixel must be exactly white so the post-processor can isolate the shape cleanly.',
    paletteLine(ctx.paletteHex),
    'Square format. The sticker occupies about 70% of the frame with empty margin around it.',
    NEGATIVE_PROMPT,
  ]
    .filter(Boolean)
    .join('\n');
}
