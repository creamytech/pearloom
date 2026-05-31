// ─────────────────────────────────────────────────────────────
// generate-from-story.ts — keyword-driven "describe your event in
// a sentence, get a coherent look back" matcher. Port of the
// design prototype's generateFromStory() from
// shared/site-config.jsx, adapted to Pearloom's axes.
//
// Prototype axes → Pearloom axes:
//   eventId  → occasion        (SiteOccasion union)
//   themeId  → edition          (Pearloom Edition)
//   voice    → voiceOverride    (classic | playful | poetic)
//   density  → density          (1:1)
//   intensity→ textureIntensity (1:1)
//   themeId  → texture          (derived — Pearloom Edition doesn't
//                                pin a material, but the prototype's
//                                theme tokens do, so we map back to
//                                a sensible default texture)
//
// Deterministic: no LLM call, no async. Mirrors the prototype's
// heuristic exactly so the result is repeatable + the keyword set
// is auditable. An /api/look/from-story Claude route can wrap this
// later as a quality upgrade with this implementation as the
// fallback (per the brief's watch-outs).
// ─────────────────────────────────────────────────────────────

import type { StoryManifest } from '@/types';

type Occasion = NonNullable<StoryManifest['occasion']>;
type Edition = NonNullable<StoryManifest['edition']>;
type Texture = NonNullable<StoryManifest['texture']>;
type Density = NonNullable<StoryManifest['density']>;
type VoiceOverride = NonNullable<StoryManifest['voiceOverride']>;

/** What the matcher returns — fields the host applies to their site. */
export interface SuggestedLook {
  occasion: Occasion;
  edition: Edition;
  texture: Texture;
  voiceOverride: VoiceOverride;
  density: Density;
  textureIntensity: number;
  /** Short human-readable explanation of why this look was picked. */
  rationale: string;
}

/* ---------- Occasion keyword map ----------
   Order matters: more specific phrases first. The matcher iterates
   top-down and takes the first hit. */
const OCCASION_HINTS: Array<[Occasion, readonly string[]]> = [
  ['memorial', ['celebration of life', 'in memory', 'in loving memory', 'mourning']],
  ['funeral', ['funeral', 'passing']],
  ['bachelorette-party', ['bachelorette', 'hen party', 'hen do']],
  ['bachelor-party', ['bachelor party', 'stag']],
  ['engagement', ['engagement', 'engaged', 'proposal', 'she said yes', 'he said yes']],
  ['vow-renewal', ['vow renewal', 'renew our vows']],
  ['baby-shower', ['baby shower', 'baby is on the way', 'expecting']],
  ['gender-reveal', ['gender reveal']],
  ['bridal-shower', ['bridal shower']],
  ['milestone-birthday', ['30th', '40th', '50th', '60th', '70th', 'milestone birthday', 'turning 30', 'turning 40', 'turning 50']],
  ['sweet-sixteen', ['sweet sixteen', 'sweet 16']],
  ['quinceanera', ['quince', 'quinceañera', 'quinceanera']],
  ['bar-mitzvah', ['mitzvah']],
  ['birthday', ['birthday', 'bday', 'turning']],
  ['graduation', ['graduation', 'grad party', 'commencement', 'class of']],
  ['retirement', ['retirement', 'retiring', 'retire']],
  ['anniversary', ['anniversary']],
  ['reunion', ['reunion']],
  ['housewarming', ['housewarming', 'new place', 'new home', 'moved in']],
  ['rehearsal-dinner', ['rehearsal']],
  ['welcome-party', ['welcome party']],
  ['brunch', ['brunch']],
  ['sip-and-see', ['sip and see', 'sip-and-see']],
  ['first-birthday', ['first birthday', '1st birthday']],
  ['bridal-luncheon', ['bridal luncheon']],
  ['bat-mitzvah', ['bat mitzvah']],
  ['baptism', ['baptism', 'christening']],
  ['first-communion', ['first communion']],
  ['confirmation', ['confirmation']],
  ['wedding', ['wedding', 'getting married', 'marry', 'our big day', 'nuptials']],
];

/* ---------- Edition keyword map ----------
   Maps the prototype's theme keyword groups to Pearloom Editions
   (which are the closest analogue — both are persona-level "whole
   look" picks). Order matters; first hit wins.

   Each entry returns the Edition + a sensible default texture
   because the prototype's themes pinned a material (santorini =
   linen, tuscan = watercolor, etc.) and Pearloom's Editions
   don't. */
interface EditionHint {
  edition: Edition;
  texture: Texture;
  keywords: readonly string[];
  why: string;
}
const EDITION_HINTS: EditionHint[] = [
  {
    edition: 'linen-folder',
    texture: 'linen',
    keywords: ['santorini', 'greece', 'greek', 'aegean', 'cyclad', 'mykonos', 'linen', 'olive', 'mediterran'],
    why: 'Greece + linen → Linen Folder + Linen texture',
  },
  {
    edition: 'almanac',
    texture: 'watercolor',
    keywords: ['tuscan', 'tuscany', 'italy', 'italian', 'vineyard', 'lemon', 'watercolor', 'watercolour', 'terracotta'],
    why: 'Italy + watercolor → Almanac + Watercolor texture',
  },
  {
    edition: 'postcard-box',
    texture: 'vellum',
    keywords: ['coast', 'beach', 'ocean', 'sea', 'nautical', 'cape', 'sail', 'harbor', 'harbour', 'maine', 'newport'],
    why: 'seaside → Postcard Box + Vellum',
  },
  {
    edition: 'cinema',
    texture: 'velvet',
    keywords: ['evening', 'night', 'black tie', 'candle', 'velvet', 'glamour', 'glam'],
    why: 'evening + formal → Cinema + Velvet',
  },
  {
    edition: 'quiet',
    texture: 'smooth',
    keywords: ['modern', 'minimal', 'editorial', 'city', 'urban', 'industrial', 'loft', 'clean'],
    why: 'modern + city → Quiet + Smooth',
  },
  {
    edition: 'almanac',
    texture: 'vellum',
    keywords: ['garden', 'wildflower', 'meadow', 'barn', 'rustic', 'spring', 'field', 'farm'],
    why: 'garden + wildflowers → Almanac + Vellum',
  },
];

/* ---------- Fallback Edition per occasion ----------
   When the sentence doesn't carry an explicit place / material
   hint, the occasion's emotional register drives the Edition.
   Mirrors the prototype's recommendedThemes(event)[0] fallback. */
const OCCASION_FALLBACK_EDITION: Partial<Record<Occasion, { edition: Edition; texture: Texture }>> = {
  memorial: { edition: 'quiet', texture: 'vellum' },
  funeral: { edition: 'quiet', texture: 'vellum' },
  'bachelor-party': { edition: 'postcard-box', texture: 'newsprint' },
  'bachelorette-party': { edition: 'postcard-box', texture: 'newsprint' },
  'bridal-shower': { edition: 'postcard-box', texture: 'watercolor' },
  'baby-shower': { edition: 'postcard-box', texture: 'watercolor' },
  'sip-and-see': { edition: 'postcard-box', texture: 'watercolor' },
  'rehearsal-dinner': { edition: 'linen-folder', texture: 'linen' },
  'bar-mitzvah': { edition: 'linen-folder', texture: 'linen' },
  'bat-mitzvah': { edition: 'linen-folder', texture: 'linen' },
  quinceanera: { edition: 'linen-folder', texture: 'linen' },
  baptism: { edition: 'linen-folder', texture: 'linen' },
  retirement: { edition: 'linen-folder', texture: 'letterpress' },
  reunion: { edition: 'postcard-box', texture: 'newsprint' },
  graduation: { edition: 'almanac', texture: 'letterpress' },
  anniversary: { edition: 'almanac', texture: 'letterpress' },
  'vow-renewal': { edition: 'almanac', texture: 'letterpress' },
  wedding: { edition: 'almanac', texture: 'linen' },
  engagement: { edition: 'almanac', texture: 'watercolor' },
  birthday: { edition: 'postcard-box', texture: 'watercolor' },
  'milestone-birthday': { edition: 'cinema', texture: 'letterpress' },
  'first-birthday': { edition: 'postcard-box', texture: 'watercolor' },
  'sweet-sixteen': { edition: 'cinema', texture: 'newsprint' },
  housewarming: { edition: 'almanac', texture: 'linen' },
  'welcome-party': { edition: 'almanac', texture: 'linen' },
  brunch: { edition: 'postcard-box', texture: 'watercolor' },
  'bridal-luncheon': { edition: 'postcard-box', texture: 'watercolor' },
  'first-communion': { edition: 'linen-folder', texture: 'linen' },
  confirmation: { edition: 'linen-folder', texture: 'linen' },
  story: { edition: 'almanac', texture: 'letterpress' },
};

/* Somber occasions get the classic voice regardless of tone words —
   you don't pick "playful" for a funeral. */
const SOMBER: ReadonlySet<Occasion> = new Set<Occasion>(['memorial', 'funeral']);

/* ---------- Main matcher ---------- */

export function generateLookFromStory(text: string): SuggestedLook {
  const t = (text ?? '').toLowerCase();
  const has = (...words: string[]) => words.some((w) => t.includes(w));

  /* OCCASION — first hit from the top wins. Falls back to
     'wedding' if nothing matches. */
  let occasion: Occasion = 'wedding';
  for (const [id, words] of OCCASION_HINTS) {
    if (has(...words)) {
      occasion = id;
      break;
    }
  }

  /* EDITION + TEXTURE — explicit place/material hints win. */
  let edition: Edition = 'almanac';
  let texture: Texture = 'linen';
  let why = '';
  let editionStrong = false;
  for (const hint of EDITION_HINTS) {
    if (has(...hint.keywords)) {
      edition = hint.edition;
      texture = hint.texture;
      why = hint.why;
      editionStrong = true;
      break;
    }
  }
  /* No explicit hint → fall through to occasion default. */
  if (!editionStrong) {
    const fallback = OCCASION_FALLBACK_EDITION[occasion];
    if (fallback) {
      edition = fallback.edition;
      texture = fallback.texture;
      why = `${occasion.replace(/-/g, ' ')} → ${edition.replace(/-/g, ' ')}`;
    }
  }

  const somber = SOMBER.has(occasion);

  /* VOICE — tone words drive playful / poetic; somber occasions
     stay 'classic'. */
  let voiceOverride: VoiceOverride = 'classic';
  if (!somber && has('fun', 'playful', 'casual', 'party', 'laid-back', 'laid back', 'relaxed', 'lively', 'silly')) {
    voiceOverride = 'playful';
  } else if (!somber && has('romantic', 'poetic', 'dreamy', 'intimate', 'soulful', 'lyrical', 'tender')) {
    voiceOverride = 'poetic';
  }

  /* DENSITY */
  let density: Density = 'comfortable';
  if (has('minimal', 'airy', 'spacious', 'clean', 'modern')) density = 'spacious';
  else if (has('cozy', 'cosy', 'intimate', 'small', 'tight')) density = 'cozy';

  /* TEXTURE INTENSITY */
  let textureIntensity = 1;
  if (has('subtle', 'understated', 'restrained', 'minimal')) textureIntensity = 0.5;
  else if (has('rich', 'textured', 'tactile', 'bold', 'lush')) textureIntensity = 1.4;

  /* Pretty rationale — capitalize the first word of the occasion. */
  const occLabel = occasion
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  const rationale = why
    ? `${occLabel} · ${why}.`
    : `${occLabel} · matched on event default.`;

  return {
    occasion,
    edition,
    texture,
    voiceOverride,
    density,
    textureIntensity,
    rationale,
  };
}
