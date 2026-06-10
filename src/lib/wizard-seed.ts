// ─────────────────────────────────────────────────────────────
// wizard-seed — fill the SECTION data the wizard didn't ask for.
//
// The wizard collects story inputs (occasion, names, photos,
// vibes, palette) but a finished site also needs Schedule /
// Details / Travel / FAQ / RSVP data. seedSectionsFromWizard()
// derives what it honestly can from what the host already gave
// us — venue-aware FAQ answers, a travel intro naming the venue,
// an RSVP deadline ~5 weeks before the date — and fills ONLY
// missing fields, so AI-generated or host-authored content always
// wins. Deterministic, server-safe, no model calls.
//
// Called from WizardV8.handleFinish on BOTH paths (AI + skeleton)
// after the manifest is resolved, plus stamps the host's explicit
// "The Day" picks (events / dress code / deadline) which beat
// anything generated.
// ─────────────────────────────────────────────────────────────

import type { StoryManifest } from '@/types';
import {
  faqQuestionSuggestions,
  faqAnswerDraftFor,
  travelDirectionsSuggestions,
  smartContext,
} from '@/components/pearloom/editor/panels/_suggestions';

type Loose = Record<string, unknown>;

/** Host picks from the wizard's "The Day" step. */
export interface DayPicks {
  /** Tap-built schedule moments (already time-filled). */
  events?: Array<{ name: string; time: string }>;
  dressCode?: string;
  rsvpDeadline?: string; // ISO date
}

/** ~5 weeks before the event date, clamped to tomorrow. */
export function suggestRsvpDeadline(eventDateIso?: string): string | null {
  if (!eventDateIso) return null;
  const ms = Date.parse(eventDateIso);
  if (Number.isNaN(ms)) return null;
  const d = new Date(ms - 35 * 24 * 60 * 60 * 1000);
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const pick = d > tomorrow ? d : tomorrow;
  if (pick.getTime() > ms) return null; // event is (nearly) past
  return pick.toISOString().slice(0, 10);
}

/** Fill-missing section seeding + stamp explicit Day picks. */
export function seedSectionsFromWizard(
  manifest: StoryManifest,
  picks: DayPicks = {},
): StoryManifest {
  const loose = { ...(manifest as unknown as Loose) };
  const logistics = { ...((loose.logistics as Loose | undefined) ?? {}) };

  // ── Host picks always win ──────────────────────────────────
  if (picks.dressCode?.trim()) logistics.dresscode = picks.dressCode.trim();
  if (picks.rsvpDeadline) logistics.rsvpDeadline = picks.rsvpDeadline;
  if (picks.events && picks.events.length > 0) {
    loose.events = picks.events.map((e, i) => ({
      id: `e-${i}-${e.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      name: e.name,
      time: e.time,
      type: 'other',
      date: '',
      venue: '',
      address: '',
    }));
  }

  // ── Derived fills (only when missing) ──────────────────────
  if (!logistics.rsvpDeadline) {
    const dl = suggestRsvpDeadline(logistics.date as string | undefined);
    if (dl) logistics.rsvpDeadline = dl;
  }
  loose.logistics = logistics;

  const ctx = smartContext({ ...loose, logistics });

  // Travel intro — venue-aware first line when none exists.
  const travelInfo = { ...((loose.travelInfo as Loose | undefined) ?? {}) };
  if (!(travelInfo.directions as string | undefined)?.trim() && ctx.venue) {
    travelInfo.directions = travelDirectionsSuggestions(ctx).options[0];
    loose.travelInfo = travelInfo;
  }

  // FAQ — seed the occasion's standard questions WITH venue-aware
  // draft answers (skip questions we can't answer honestly).
  const existingFaqs = (loose.faqs as Array<{ question?: string }> | undefined) ?? [];
  if (existingFaqs.length === 0) {
    const qs = faqQuestionSuggestions(ctx.occasion).options.slice(0, 4);
    const seeded = qs
      .map((q, i) => ({
        id: `f-seed-${i}`,
        question: q,
        answer: faqAnswerDraftFor(q, ctx, { ...loose, logistics }) ?? '',
        order: i,
      }))
      .filter((f) => f.answer); // only ship answered rows
    if (seeded.length > 0) loose.faqs = seeded;
  }

  // Details cards — from dress code when none exist.
  const cards = (loose.detailsCards as unknown[] | undefined) ?? [];
  if (cards.length === 0 && (logistics.dresscode as string | undefined)?.trim()) {
    loose.detailsCards = [['Dress code', logistics.dresscode as string]];
  }

  return loose as unknown as StoryManifest;
}
