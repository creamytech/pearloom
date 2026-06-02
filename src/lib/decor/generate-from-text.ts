// ─────────────────────────────────────────────────────────────
// generate-from-text.ts — deterministic keyword matcher that maps
// a free-text sentence ("July wedding in Santorini, olive groves,
// relaxed") to a coherent **decor preset**:
//
//   {
//     motifId,       — manifest.motifs slot key
//     dividerId,     — manifest.decorLibrary.dividerStrength
//     patternId,     — manifest.pattern (gingham, stripe, …)
//     accentColor,   — hex string ready for manifest.theme.colors.accent
//     rationale,     — short human-readable sentence
//   }
//
// This is the **fallback path** for /api/decor/generate-from-text.
// Claude Haiku is the primary path (server-side, structured tool_use);
// when no API key is present, or Claude fails, this module returns a
// repeatable preset so the host never sees an "AI unavailable" error.
//
// Mirrors the prototype's `generateFromStory()` shape (themes.jsx
// §GenerateCard) but adapted to Pearloom's decor axes — the prototype
// returned a *whole-site theme* config; this version returns a
// *decor* preset because the canonical look-generation surface
// already exists at /api/look/from-story.
// ─────────────────────────────────────────────────────────────

/** Pattern ids the Pearloom renderer ships (see types.ts §pattern + DecorLibraryPanel §PATTERN_TILES). */
export type DecorPatternId =
  | 'none'
  | 'gingham'
  | 'stripe'
  | 'cabana'
  | 'diagonal'
  | 'dots'
  | 'grid'
  | 'deco'
  | 'scallop'
  | 'wave'
  | 'confetti'
  | 'terrazzo'
  | 'celestial';

/** Motif slot keys — match manifest.motifs.{blob,stamp,squiggle,sparkle,heart,postIt,polaroid}. */
export type DecorMotifId =
  | 'blob'
  | 'stamp'
  | 'squiggle'
  | 'sparkle'
  | 'heart'
  | 'postIt'
  | 'polaroid';

/** Divider strength values — match manifest.decorLibrary.dividerStrength. */
export type DecorDividerId = 'subtle' | 'standard' | 'tall';

export interface DecorPreset {
  motifId: DecorMotifId;
  dividerId: DecorDividerId;
  patternId: DecorPatternId;
  /** 6-digit hex, leading '#'. */
  accentColor: string;
  /** One short sentence: which words drove which picks. */
  rationale: string;
}

/* ----------------------------------------------------------------
   Keyword tables — order matters. The first hit wins.
---------------------------------------------------------------- */

/** Each row: [patternId, keywords]. */
const PATTERN_HINTS: ReadonlyArray<readonly [DecorPatternId, readonly string[]]> = [
  ['celestial', ['starry', 'celestial', 'midnight', 'under the stars', 'evening', 'night sky']],
  // gingham before confetti: 'garden party' should beat 'party'
  ['gingham', ['picnic', 'garden party', 'farmhouse', 'rustic', 'gingham', 'country']],
  ['confetti', ['confetti', 'birthday', 'party', 'playful', 'sweet sixteen', 'quince']],
  ['scallop', ['scallop', 'art deco', 'gatsby', 'classy', 'formal']],
  ['cabana', ['beach', 'coastal', 'cabana', 'seaside', 'shore', 'ocean']],
  ['wave', ['wave', 'sea', 'maritime', 'sailing', 'nautical']],
  ['stripe', ['linen', 'awning', 'mediterranean', 'cape', 'hamptons', 'preppy']],
  ['diagonal', ['modern', 'editorial', 'bold', 'energetic', 'dynamic']],
  ['dots', ['polka', 'whimsical', 'cute', 'pastel', 'baby']],
  ['terrazzo', ['terrazzo', 'tuscany', 'tile', 'mosaic', 'mediterranean']],
  ['deco', ['art deco', 'gold', 'glamour', 'glamorous', 'twenties', 'roaring']],
  ['grid', ['minimal', 'minimalist', 'clean', 'architectural', 'urban']],
];

/** Each row: [motifId, keywords]. */
const MOTIF_HINTS: ReadonlyArray<readonly [DecorMotifId, readonly string[]]> = [
  ['polaroid', ['polaroid', 'instant', 'photo wall', 'scrapbook', 'snapshots']],
  ['postIt', ['post-it', 'sticky note', 'kitchen', 'casual', 'note']],
  ['heart', ['love', 'romantic', 'romance', 'tender', 'sweet', 'hearts']],
  ['sparkle', ['sparkle', 'glitter', 'shimmer', 'starlit', 'magical', 'celestial']],
  ['squiggle', ['playful', 'fun', 'kid', 'kids', 'birthday', 'lively']],
  ['stamp', ['stamp', 'postcard', 'travel', 'destination', 'passport', 'crest']],
  ['blob', ['organic', 'soft', 'fluid', 'watercolor', 'modern', 'painterly']],
];

/** Each row: [dividerId, keywords]. */
const DIVIDER_HINTS: ReadonlyArray<readonly [DecorDividerId, readonly string[]]> = [
  ['tall', ['grand', 'cinematic', 'editorial', 'magazine', 'bold']],
  ['subtle', ['minimal', 'quiet', 'restraint', 'understated', 'memorial', 'funeral']],
  ['standard', []], // default
];

/** Each row: [hex, keywords]. */
const ACCENT_HINTS: ReadonlyArray<readonly [string, readonly string[]]> = [
  ['#5C6B3F', ['olive', 'sage', 'garden', 'tuscan', 'vineyard', 'forest', 'green']],
  ['#C6703D', ['peach', 'terracotta', 'sunset', 'desert', 'warm', 'amber']],
  ['#7A2D2D', ['plum', 'merlot', 'wine', 'burgundy', 'crimson']],
  ['#1E3A5F', ['navy', 'midnight', 'evening', 'black-tie', 'gala']],
  ['#B89244', ['gold', 'champagne', 'deco', 'glamour']],
  ['#9C7B6E', ['mauve', 'dusty', 'blush', 'rose']],
  ['#4A6B8F', ['coastal', 'seaside', 'ocean', 'beach', 'maritime']],
];

/* Helper — case-insensitive keyword scan over a normalized string. */
function pickFromHints<T extends string>(
  text: string,
  hints: ReadonlyArray<readonly [T, readonly string[]]>,
  fallback: T,
): { id: T; matchedKeyword: string | null } {
  for (const [id, keywords] of hints) {
    for (const kw of keywords) {
      if (text.includes(kw)) {
        return { id, matchedKeyword: kw };
      }
    }
  }
  return { id: fallback, matchedKeyword: null };
}

/**
 * Map a free-text description to a coherent decor preset.
 *
 * Deterministic — no LLM, no async, no network. Repeatable.
 *
 * @example
 *   generateDecorFromText('July wedding in Santorini, olive groves, relaxed')
 *   // → { motifId: 'stamp', dividerId: 'standard', patternId: 'stripe',
 *   //     accentColor: '#5C6B3F', rationale: '"olive" suggests sage, …' }
 */
export function generateDecorFromText(input: string): DecorPreset {
  const text = (input ?? '').toLowerCase();

  const pattern = pickFromHints(text, PATTERN_HINTS, 'none');
  const motif = pickFromHints(text, MOTIF_HINTS, 'sparkle');
  const divider = pickFromHints(text, DIVIDER_HINTS, 'standard');
  const accent = pickFromHints(text, ACCENT_HINTS, '#5C6B3F');

  const parts: string[] = [];
  if (accent.matchedKeyword) {
    parts.push(`"${accent.matchedKeyword}" → ${accent.id}`);
  }
  if (pattern.matchedKeyword) {
    parts.push(`${pattern.id} pattern`);
  }
  if (motif.matchedKeyword) {
    parts.push(`${motif.id} motif`);
  }
  const rationale = parts.length
    ? `Picked from your description: ${parts.join(', ')}.`
    : 'A calm default — describe the venue or vibe for sharper picks.';

  return {
    motifId: motif.id,
    dividerId: divider.id,
    patternId: pattern.id,
    accentColor: accent.id,
    rationale,
  };
}
