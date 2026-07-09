// ─────────────────────────────────────────────────────────────
// Pearloom / lib/first-pressing/schema.ts
//
// THE FIRST PRESSING — draft-pass schema, result type, voice table.
//
// One lean batched Claude call runs during the wizard's generate
// moment and drafts real per-section copy (story, hero line, voiced
// FAQ answers, schedule blurbs, details sublines, registry intro)
// from the seeded manifest + fact-sheet + occasion voice.
//
// DRAFT_SCHEMA is FLAT and every slot is OPTIONAL — the model
// DECLINES (omits) any slot it can't honestly ground in real facts.
// That "omit rather than fabricate" is the honesty guard expressed
// as schema, not just prompt. See docs/FIRST-PRESSING-PLAN.md §2/§5.
//
// Text-only. No vision, no multi-pass, no image gen. See §7 (the
// deleted memory-engine pipeline caution) — do NOT resurrect it.
// ─────────────────────────────────────────────────────────────

import type { EventVoice } from '@/lib/event-os/event-types';

/** The draft pass's structured output. Every field optional so the
 *  model can decline any slot it can't ground in the host's facts.
 *  The merge (merge.ts) writes each slot fill-only to its manifest
 *  target and records the field-path in `manifest.draftedByPear`. */
export interface DraftResult {
  /** storySection.headline — a short Fraunces-worthy title. Only if
   *  the host gave a real story (factSheet.story / howWeMet). */
  storyHeadline?: string;
  /** storySection.body — 2–4 sentences that SPEND the host's anchors
   *  (the dog, the bar in Lisbon). Never invents new facts. Only if
   *  the host gave a real story. */
  storyBody?: string;
  /** storySection.chips — exactly 3 short timeline eyebrows. Occasion
   *  correct (never "We met" on a memorial). */
  storyChips?: string[];
  /** poetry.heroTagline — a 5–8 word tone line. Always safe (it's a
   *  register, not a factual claim). */
  heroTagline?: string;
  /** faqs[].answer — voiced rewrites of facts the host already gave,
   *  matched back to the seeded question by its text. Never answers a
   *  question the facts don't cover (omit it). */
  faqAnswers?: Array<{ question: string; answer: string }>;
  /** events[].description — one short descriptive line per moment
   *  ("raise a glass"). Matched to the host's moment by its name.
   *  Never invents a time or place. */
  scheduleBlurbs?: Array<{ name: string; blurb: string }>;
  /** detailsCards[i][2] — expand the host's own card value into a
   *  warm second line. Matched by the card label. No new facts. */
  detailsSublines?: Array<{ label: string; subline: string }>;
  /** registryIntro — a tone line only. Solemn occasions register
   *  "in lieu of flowers" when a donation fund is present. */
  registryIntro?: string;
}

/** JSON-schema for generateJson's forced tool. Flat, all-optional. */
export const DRAFT_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    storyHeadline: {
      type: 'string',
      description:
        'A short, warm title for the story section (Fraunces display). Omit entirely if the host gave no real story.',
    },
    storyBody: {
      type: 'string',
      description:
        '2–4 sentences drawn ONLY from the host\'s own facts and anchors. Never invent people, places, dates, or events. Omit if no real story was provided.',
    },
    storyChips: {
      type: 'array',
      items: { type: 'string' },
      minItems: 3,
      maxItems: 3,
      description:
        'Exactly 3 short timeline eyebrows (2–4 words each), occasion-correct.',
    },
    heroTagline: {
      type: 'string',
      description: 'A 5–8 word tone line for the hero. No fabricated facts.',
    },
    faqAnswers: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          question: { type: 'string', description: 'The exact question text you are answering, copied verbatim.' },
          answer: { type: 'string', description: 'A warm, voiced answer built ONLY from the provided facts.' },
        },
        required: ['question', 'answer'],
      },
      description: 'Answer only the listed blank questions the facts actually cover. Omit any you cannot ground.',
    },
    scheduleBlurbs: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'The exact moment name, copied verbatim.' },
          blurb: { type: 'string', description: 'One short descriptive line. Never a new time or place.' },
        },
        required: ['name', 'blurb'],
      },
      description: 'One short line per listed moment.',
    },
    detailsSublines: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string', description: 'The exact card label, copied verbatim.' },
          subline: { type: 'string', description: 'A warm second line expanding the host\'s own value. No new facts.' },
        },
        required: ['label', 'subline'],
      },
      description: 'A quieter second line for the listed detail cards.',
    },
    registryIntro: {
      type: 'string',
      description: 'A short tone line introducing the registry/fund. No amounts, no policy the host did not give.',
    },
  },
  // Deliberately NO `required` — every slot is optional so the model
  // omits what it cannot honestly fill.
};

/** Occasion voice → drafting directive. Mirrors the register axis
 *  occasion-copy.ts and vibesForOccasion already route on (and the
 *  VOICE_GUIDANCE the deleted pipeline used — rewritten fresh, not
 *  imported). Fed into the USER turn so the cached system prompt
 *  stays static. */
export const VOICE_DIRECTIVE: Record<EventVoice, string> = {
  celebratory: 'warm, celebratory, present-tense; no exclamation marks',
  intimate: 'close, tender, unhurried',
  ceremonial: 'formal, dignified, a traditional register',
  playful: 'loose, funny, a little irreverent; still tasteful',
  solemn: "gentle, spare, reflective; never cheerful; 'gathered' not 'celebrated'",
};
