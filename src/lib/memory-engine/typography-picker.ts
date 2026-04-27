// ─────────────────────────────────────────────────────────────
// Pearloom / lib/memory-engine/typography-picker.ts
//
// Picks a heading + body font pair from the voice + occasion.
// Runs only when no template was applied (templates ship their
// own pairs). Rules are static — no extra AI call — but the
// pairings are hand-picked by typeface personality to match
// each voice. Keeps the pipeline fast and deterministic.
// ─────────────────────────────────────────────────────────────

import type { SiteOccasion } from '@/lib/site-urls';
import { getEventType } from '@/lib/event-os/event-types';

export interface FontPair {
  heading: string;
  body: string;
  /** Explanation for logging / UI preview. */
  note: string;
}

/** Voice-driven pairs. Heading carries the personality, body is
 *  neutral enough to read in long paragraphs. */
const PAIRS_BY_VOICE: Record<string, FontPair[]> = {
  solemn: [
    { heading: 'Cormorant Garamond', body: 'Inter', note: 'reverent, classical serif + quiet sans' },
    { heading: 'Libre Baskerville', body: 'Lato', note: 'funereal stillness, editorial weight' },
    { heading: 'EB Garamond', body: 'Source Sans 3', note: 'ink-on-paper serenity' },
  ],
  ceremonial: [
    { heading: 'Cinzel', body: 'Raleway', note: 'engraved grandeur, modern sans complement' },
    { heading: 'Playfair Display', body: 'Lora', note: 'traditional elegance, readable serif body' },
    { heading: 'Cormorant Garamond', body: 'DM Sans', note: 'church-on-a-hilltop calm' },
  ],
  intimate: [
    { heading: 'Fraunces', body: 'Inter', note: 'handwritten-feeling serif, close-range voice' },
    { heading: 'Crimson Text', body: 'Nunito', note: 'letter on the kitchen table' },
    { heading: 'DM Serif Display', body: 'Quicksand', note: 'warm, lamplit' },
  ],
  playful: [
    { heading: 'Syne', body: 'Quicksand', note: 'loud, young, funny' },
    { heading: 'Dancing Script', body: 'Poppins', note: 'handwritten chaos, party-invite energy' },
    { heading: 'Josefin Sans', body: 'Nunito', note: 'rounded + friendly' },
    { heading: 'Abril Fatface', body: 'Lato', note: 'bold display + clean sans' },
  ],
  celebratory: [
    { heading: 'Fraunces', body: 'Inter', note: 'editorial Pearloom default — warm but premium' },
    { heading: 'Playfair Display', body: 'Inter', note: 'classic celebratory pair' },
    { heading: 'DM Serif Display', body: 'DM Sans', note: 'modern celebratory, clean' },
  ],
};

/** Occasion hints layered on top when voice alone is ambiguous. */
const OCCASION_OVERRIDES: Partial<Record<SiteOccasion, FontPair>> = {
  'bachelor-party': { heading: 'Syne', body: 'Quicksand', note: 'bachelor weekend — loud + fun' },
  'bachelorette-party': { heading: 'Dancing Script', body: 'Poppins', note: 'bachelorette — glitter + motion' },
  memorial: { heading: 'Cormorant Garamond', body: 'Inter', note: 'quiet reverence' },
  funeral: { heading: 'Libre Baskerville', body: 'Lato', note: 'traditional mourning' },
  'bar-mitzvah': { heading: 'Cinzel', body: 'Source Sans 3', note: 'classical Hebrew-adjacent grandeur' },
  'bat-mitzvah': { heading: 'Cinzel', body: 'Source Sans 3', note: 'classical Hebrew-adjacent grandeur' },
  quinceanera: { heading: 'Playfair Display', body: 'Poppins', note: 'court-of-honor warmth + modern body' },
  anniversary: { heading: 'Cormorant Garamond', body: 'Lora', note: 'time passed, still in love' },
  retirement: { heading: 'Libre Baskerville', body: 'Lato', note: 'honored, stately' },
  graduation: { heading: 'DM Serif Display', body: 'Inter', note: 'achievement, momentum' },
  reunion: { heading: 'Josefin Sans', body: 'Nunito', note: 'warm family gathering' },
};

/** Pick a font pair from voice (primary) with occasion-specific
 *  overrides. Deterministic — same inputs always return the same pair
 *  for the same vibeString hash, so the site doesn't silently change
 *  fonts between generations. */
export function pickFontPair(occasion: string, vibeString?: string): FontPair {
  const override = OCCASION_OVERRIDES[occasion as SiteOccasion];
  if (override) return override;

  const voice = getEventType(occasion as SiteOccasion)?.voice ?? 'celebratory';
  const pool = PAIRS_BY_VOICE[voice] ?? PAIRS_BY_VOICE.celebratory;

  // Hash the vibeString so the choice is stable per couple.
  const seed = (vibeString ?? occasion).split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7);
  const idx = Math.abs(seed) % pool.length;
  return pool[idx];
}
