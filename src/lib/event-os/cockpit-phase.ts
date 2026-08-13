// ─────────────────────────────────────────────────────────────
// cockpit-phase — the dashboard's ONE clock (AFTERGLOW-PLAN §3).
//
// Every cockpit card used to do its own date math, and the shared
// input (`stage`) derived from a clamped days-until that could
// never pass zero — so 11 days after the wedding the Home still
// said "FINAL STRETCH · Save the date". This module is the single
// resolver every card reads instead:
//
//   planning  — rawDaysUntil > 30, or no date yet
//   final     — 1..30, the final stretch (real this time)
//   the-day   — 0, day-of
//   afterglow — -1..-45, photos arrive + thank-yous go out
//   kept      — < -45, the quiet keepsake state
//
// Input is the UNCLAMPED calendar-day count from
// daysBetweenCalendarDates (negative once the day has passed).
// The legacy `stage` ('early'|'mid'|'late') survives only INSIDE
// planning/final for copy granularity — it is never consulted
// after the day.
//
// phaseCopyFor is the one place the phase-level voice lives
// (header, blessing, chip label) so tense can't drift per-card;
// postEventEyebrowFor names the site-preview eyebrow once the
// day is kept ("Save the date" would make the couple wince).
// ─────────────────────────────────────────────────────────────

import { getEventType, type EventVoice } from './event-types';

export type CockpitPhase = 'planning' | 'final' | 'the-day' | 'afterglow' | 'kept';

/** Days-until at or below which planning becomes the final stretch. */
export const FINAL_STRETCH_DAYS = 30;

/** How long the afterglow lasts after the day (thank-you-etiquette
 *  season — AFTERGLOW-PLAN §8 Q1; tune here, one place). */
export const AFTERGLOW_WINDOW_DAYS = 45;

export function cockpitPhaseFor(rawDaysUntil: number | null): CockpitPhase {
  if (rawDaysUntil == null) return 'planning';
  if (rawDaysUntil > FINAL_STRETCH_DAYS) return 'planning';
  if (rawDaysUntil > 0) return 'final';
  if (rawDaysUntil === 0) return 'the-day';
  if (rawDaysUntil >= -AFTERGLOW_WINDOW_DAYS) return 'afterglow';
  return 'kept';
}

export function isPostEventPhase(phase: CockpitPhase): boolean {
  return phase === 'afterglow' || phase === 'kept';
}

export interface CockpitPhaseCopy {
  /** The NeedsYouNow chip ("Final stretch" / "The afterglow"). */
  label: string;
  /** CockpitGreeting title — the upright clause. */
  headerTitle: string;
  /** CockpitGreeting titleItalic — the italic accent clause. */
  headerItalic: string;
  /** The footer blessing. */
  blessing: string;
}

/**
 * The phase-level voice. Solemn occasions keep the remembering
 * register in every phase; everyone else moves building → doing →
 * did. `stage` refines the planning label only (early vs mid).
 */
export function phaseCopyFor(
  phase: CockpitPhase,
  voice: EventVoice,
  stage?: 'early' | 'mid' | 'late',
): CockpitPhaseCopy {
  const solemn = voice === 'solemn';
  const planningHeader = {
    headerTitle: solemn ? "You're gathering" : "You're building",
    headerItalic: solemn ? 'something to remember.' : 'something beautiful.',
    blessing: solemn ? 'Held with love and care.' : "You're doing something wonderful.",
  };
  switch (phase) {
    case 'planning':
      return { label: stage === 'mid' ? 'Mid-planning' : 'Planning', ...planningHeader };
    case 'final':
      return { label: 'Final stretch', ...planningHeader };
    case 'the-day':
      return {
        label: solemn ? 'The gathering' : 'The day',
        headerTitle: solemn ? 'Today,' : "Today's",
        headerItalic: solemn ? 'we remember.' : 'the day.',
        blessing: planningHeader.blessing,
      };
    case 'afterglow':
      return {
        label: solemn ? 'The remembering' : 'The afterglow',
        headerTitle: solemn ? 'You gathered' : 'You did',
        headerItalic: solemn ? 'something to remember.' : 'something beautiful.',
        blessing: solemn ? 'Held with love and care.' : 'You did something wonderful.',
      };
    case 'kept':
      return {
        label: solemn ? 'In remembrance' : 'Kept',
        headerTitle: solemn ? 'A thread that' : 'Something worth',
        headerItalic: solemn ? 'stays woven.' : 'keeping.',
        blessing: solemn ? 'Held with love and care.' : 'It was wonderful.',
      };
  }
}

/* The site-preview eyebrow once the day has passed. Occasions not
   named here fall to their voice: solemn keeps the memorial line,
   everything else gets the quiet generic. */
const POST_EVENT_EYEBROWS: Record<string, string> = {
  wedding: 'Just married',
  'vow-renewal': 'Vows, renewed',
  engagement: 'They said yes',
  anniversary: 'Another year, woven',
  memorial: 'In loving memory',
  funeral: 'In loving memory',
  graduation: 'They did it',
  retirement: 'A new chapter',
  'baby-shower': 'Showered with love',
  'bridal-shower': 'Showered with love',
  reunion: 'Until next time',
  birthday: 'Well celebrated',
  'milestone-birthday': 'Well celebrated',
  'first-birthday': 'Well celebrated',
  'sweet-sixteen': 'Well celebrated',
  quinceanera: 'Well celebrated',
};

export function postEventEyebrowFor(occasion: string): string {
  const named = POST_EVENT_EYEBROWS[occasion];
  if (named) return named;
  if (getEventType(occasion)?.voice === 'solemn') return 'In loving memory';
  return 'The day, kept';
}
