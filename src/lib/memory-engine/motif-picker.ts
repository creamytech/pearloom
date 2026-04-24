// ─────────────────────────────────────────────────────────────
// Pearloom / lib/memory-engine/motif-picker.ts
//
// Picks a motif pack (blob + stamp + squiggle + sparkle + heart
// + postIt + polaroid) for a site that wasn't built from a
// template. Templates ship their own curated motifs; user-
// generated sites previously had none, leaving them visually
// plain next to template-based ones. This module closes that
// gap using occasion + voice rules.
//
// Deterministic — same occasion + vibeString → same motifs.
// ─────────────────────────────────────────────────────────────

import type { StoryManifest } from '@/types';
import type { SiteOccasion } from '@/lib/site-urls';
import { getEventType } from '@/lib/event-os/event-types';

type Motifs = NonNullable<StoryManifest['motifs']>;

interface MotifRecipe {
  blob: Motifs['blob'];
  squiggle: Motifs['squiggle'];
  sparkle: boolean;
  heart: boolean;
  polaroid: boolean;
  stampText: string;
  stampIcon: string;
  stampTone: string;
  postItText?: string;
}

const RECIPES_BY_VOICE: Record<string, MotifRecipe> = {
  solemn: {
    blob: 'lavender',
    squiggle: 3,
    sparkle: false,
    heart: false,
    polaroid: false,
    stampText: 'IN · MEMORY',
    stampIcon: 'none',
    stampTone: 'lavender',
  },
  ceremonial: {
    blob: 'cream',
    squiggle: 3,
    sparkle: true,
    heart: false,
    polaroid: false,
    stampText: 'ONE · DAY',
    stampIcon: 'ring',
    stampTone: 'gold',
  },
  intimate: {
    blob: 'peach',
    squiggle: 1,
    sparkle: false,
    heart: true,
    polaroid: false,
    stampText: 'WITH · LOVE',
    stampIcon: 'heart',
    stampTone: 'peach',
    postItText: 'Come close.',
  },
  playful: {
    blob: 'peach',
    squiggle: 2,
    sparkle: true,
    heart: true,
    polaroid: true,
    stampText: 'SAVE · THE · WEEKEND',
    stampIcon: 'sparkles',
    stampTone: 'peach',
    postItText: 'More soon.',
  },
  celebratory: {
    blob: 'sage',
    squiggle: 1,
    sparkle: false,
    heart: true,
    polaroid: false,
    stampText: 'BETTER · TOGETHER',
    stampIcon: 'heart',
    stampTone: 'sage',
  },
};

// Occasion-specific stamp text trumps the voice default when set.
const STAMP_OVERRIDES: Partial<Record<SiteOccasion, string>> = {
  'bachelor-party': 'LAST · WEEKEND · IN',
  'bachelorette-party': 'ONE · LAST · DANCE',
  'baby-shower': 'TINY · NEW · ARRIVAL',
  'gender-reveal': 'BLUE · PINK · OR · SURPRISE',
  'sip-and-see': 'COME · MEET · THEM',
  'bridal-shower': 'A · GENTLE · GATHERING',
  'rehearsal-dinner': 'THE · NIGHT · BEFORE',
  'welcome-party': 'THE · WARM · WELCOME',
  anniversary: 'STILL · CHOOSING · YOU',
  retirement: 'A · NEW · CHAPTER',
  graduation: 'WELL · EARNED',
  'bar-mitzvah': 'SONS · OF · THE · COMMANDMENT',
  'bat-mitzvah': 'DAUGHTERS · OF · THE · COMMANDMENT',
  quinceanera: 'FIFTEEN · AND',
  memorial: 'IN · LOVING · MEMORY',
  funeral: 'IN · LOVING · MEMORY',
  reunion: 'EVERYONE · TOGETHER',
  'milestone-birthday': 'SPECTACULAR · YEARS',
  'first-birthday': 'ONE · WHOLE · YEAR',
  'sweet-sixteen': 'SWEET · SIXTEEN',
  housewarming: 'NEW · KEYS',
  'vow-renewal': 'SAYING · IT · AGAIN',
};

/** Deterministic seed from vibeString for subtle variation
 *  across couples sharing the same occasion. */
function seedFromVibe(vibe?: string): number {
  const s = vibe ?? '';
  return Math.abs(s.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7));
}

export function pickMotifs(occasion: string, vibeString?: string): Motifs {
  const voice = getEventType(occasion as SiteOccasion)?.voice ?? 'celebratory';
  const recipe = RECIPES_BY_VOICE[voice] ?? RECIPES_BY_VOICE.celebratory;
  const seed = seedFromVibe(vibeString);

  const stampText = STAMP_OVERRIDES[occasion as SiteOccasion] ?? recipe.stampText;
  // Small rotation variation keyed on seed so not every site is perfectly straight.
  const rotation = ((seed % 11) - 5); // −5° to +5°

  const motifs: Motifs = {
    blob: recipe.blob,
    squiggle: recipe.squiggle,
    sparkle: recipe.sparkle,
    heart: recipe.heart,
    polaroid: recipe.polaroid,
    stamp: {
      text: stampText,
      icon: recipe.stampIcon,
      tone: recipe.stampTone,
      rotation,
    },
  };

  if (recipe.postItText) {
    motifs.postIt = {
      text: recipe.postItText,
      tone: 'cream',
      rotation: -((seed % 7) - 3),
    };
  }

  return motifs;
}
