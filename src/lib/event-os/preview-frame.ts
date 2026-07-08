// ─────────────────────────────────────────────────────────────
// Pearloom / lib/event-os/preview-frame.ts — the wizard preview's
// occasion frame (PERSONA-PLAN S1, law 1: a solo occasion is not
// a degraded couple).
//
// The live save-the-date preview used to hardcode the celebration
// frame — eyebrow "Save the date", verb "are celebrating", story
// band "Our story / Two people, a shared beginning…" — which put
// a party frame (with broken grammar) on memorials, birthdays,
// and every solo occasion: "Eleanor Whitfield are celebrating" on
// a memorial was the walkthrough's worst finding. This module
// resolves the frame from the same occasion copy packs the
// renderer reads (occasion-copy.ts), plus the one line the packs
// don't carry: the italic verb line under the names, grammatically
// routed by name mode. The rules:
//
//   couple → conjugated plural verbs are safe ("are getting married")
//   solo   → singular only ("is graduating") — never "are"
//   group  → the name field is optional and may hold one name or
//            many, so NO conjugated verb at all — tagline-style
//            lines only ("together again")
//   solemn → no verb; the pack's tagline ("a life, well loved")
//
// Lookup-only. Nothing here writes the manifest.
// ─────────────────────────────────────────────────────────────

import { nameModeFor } from '@/lib/event-os/name-mode';
import { getEventType } from '@/lib/event-os/event-types';
import { occasionCopyFor } from '@/components/pearloom/redesign/occasion-copy';

export interface PreviewFrame {
  /** Hero eyebrow — "Save the date" / "In loving memory". */
  eyebrow: string;
  /** Italic line under the names. Grammar-safe per name mode. */
  verbLine: string;
  /** Story band eyebrow ("Our story" / "Their story" / "The story"). */
  storyEyebrow: string;
  /** Story band heading (pack title + italic, joined). */
  storyTitle: string;
  /** Story band one-liner — chrome, occasion-safe, never demo body. */
  storyBlurb: string;
  /** Reply block heading + button label. */
  rsvpTitle: string;
  rsvpCta: string;
}

/** Occasion-specific verb lines. Couple occasions may conjugate
 *  plural; solo occasions MUST be singular; group occasions must
 *  not conjugate at all (one name or many may sit as subject). */
const VERB_OVERRIDES: Record<string, string> = {
  // couple — plural is grammatically guaranteed (two required names)
  wedding: 'are getting married',
  'vow-renewal': 'are renewing their vows',
  engagement: 'are engaged',
  anniversary: 'are celebrating the years',
  'gender-reveal': 'are finding out',
  // solo — singular only
  'bachelor-party': 'is getting married soon',
  'bachelorette-party': 'is getting married soon',
  'bridal-shower': 'is getting married soon',
  'bridal-luncheon': 'is getting married soon',
  'baby-shower': 'is expecting',
  'sip-and-see': 'is here',
  'first-birthday': 'is turning one',
  'sweet-sixteen': 'is turning sixteen',
  quinceanera: 'is turning fifteen',
  'milestone-birthday': 'is marking a big one',
  graduation: 'is graduating',
  retirement: 'is retiring',
  'bar-mitzvah': 'is called to the Torah',
  'bat-mitzvah': 'is called to the Torah',
  baptism: 'is being baptized',
  'first-communion': 'receives First Communion',
  confirmation: 'is being confirmed',
  // group — subject may be one name or many: never conjugate
  reunion: 'together again',
  housewarming: 'a new place to gather',
};

const STORY_BLURBS = {
  couple: 'Two people, a shared beginning, and all the small moments in between.',
  solo: 'One good story, and all the people in it.',
  group: 'The people, the years, and everything worth retelling.',
} as const;

const SOLEMN_STORY_BLURB =
  'The years, the people they loved, and the stories that keep coming up.';

function isSolemn(occasion: string): boolean {
  return getEventType(occasion)?.voice === 'solemn';
}

/** Resolve the wizard preview's occasion frame. Safe for an unset
 *  occasion (step 0): falls back to the generic celebration pack. */
export function previewFrameFor(occasion: string | undefined | null): PreviewFrame {
  const occ = occasion ?? '';
  // '' resolves to the generic BASE pack (never wedding copy).
  const copy = occasionCopyFor(occ || 'unknown');
  const mode = nameModeFor(occ).mode;
  const solemn = isSolemn(occ);

  const verbLine = solemn
    ? copy.tagline
    : VERB_OVERRIDES[occ]
      ?? (mode === 'couple' ? 'are celebrating' : mode === 'solo' ? 'is celebrating' : copy.tagline);

  return {
    eyebrow: copy.lead,
    verbLine,
    storyEyebrow: copy.storyEyebrow,
    storyTitle: `${copy.storyTitle} ${copy.storyItalic}`.trim(),
    storyBlurb: solemn ? SOLEMN_STORY_BLURB : STORY_BLURBS[mode],
    rsvpTitle: copy.rsvpTitle,
    rsvpCta: copy.cta,
  };
}

/* ── Classic palette presets, ordered by occasion voice ───────────
   The wizard's four classic presets rendered in one fixed order for
   everyone — "Groovy Garden" was the first color offered on a
   memorial. Lookup-only reordering by the registry voice; the set
   itself never changes, and an explicit host pick is never touched. */

const VOICE_PALETTE_ORDER: Record<string, string[]> = {
  solemn: ['warm-linen', 'olive-gold', 'dusk-meadow', 'groovy-garden'],
  ceremonial: ['olive-gold', 'warm-linen', 'dusk-meadow', 'groovy-garden'],
  intimate: ['warm-linen', 'dusk-meadow', 'olive-gold', 'groovy-garden'],
  // celebratory / playful keep the authored order.
};

export function orderPalettesForOccasion<T extends { id: string }>(
  palettes: T[],
  occasion?: string | null,
): T[] {
  const voice = getEventType(occasion ?? '')?.voice ?? '';
  const order = VOICE_PALETTE_ORDER[voice];
  if (!order) return palettes;
  const rank = new Map(order.map((id, i) => [id, i]));
  return [...palettes].sort(
    (a, b) => (rank.get(a.id) ?? order.length) - (rank.get(b.id) ?? order.length),
  );
}

/** The palette the wizard defaults to before the host picks one. */
export function defaultPaletteIdFor<T extends { id: string }>(
  palettes: T[],
  occasion?: string | null,
): string {
  return orderPalettesForOccasion(palettes, occasion)[0]?.id ?? palettes[0]?.id ?? '';
}
