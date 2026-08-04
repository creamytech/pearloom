// ─────────────────────────────────────────────────────────────
// Pearloom / lib/doorway/makeover.ts
//
// THE MAKEOVER: "paste the site you have, see it reimagined."
//
// All three external reviews named this the strongest content
// engine available — the product manufactures its own proof, and
// most couples have ALREADY started somewhere else before they
// find Pearloom, so switching has to feel easier than staying.
//
// This module turns a `DoorwayPrefill` (whatever we could read
// from their existing page) into a real StoryManifest, pressed
// through the SAME look pipeline the wizard uses. Not a mockup,
// not a screenshot: the actual renderer, the actual theme
// resolution, the actual sections.
//
// THE HONESTY LINE — this is the whole reason the module is
// careful. A makeover shows someone THEIR event, so:
//
//   • Only facts we actually read are placed. Nothing is invented
//     to make the preview look fuller.
//   • Everything else is left EMPTY and the caller says so. The
//     renderer's own empty states are honest by construction
//     (CLAUDE-DESIGN §7 — demo copy is gated on `editable`, which
//     is false here).
//   • `preview: true` marks the manifest as never-published. It is
//     never saved, never given a slug, never indexed.
//
// A makeover that fabricates a venue or a story is a lie about a
// stranger's wedding. Emptier and true beats fuller and false.
// ─────────────────────────────────────────────────────────────

import type { StoryManifest } from '@/types';
import type { DoorwayPrefill } from './extract';
import { applyWizardLook } from '@/lib/site-look/wizard-look';
import { lookDefaultsFor, getEventType } from '@/lib/event-os/event-types';
import { normalizeOccasion } from '@/lib/site-urls';
import { recommendEdition } from '@/lib/site-editions/resolve';

/** Palettes offered as the makeover's "three ways to see it".
 *  Deliberately few — a wall of options is a decision, not a gift. */
export const MAKEOVER_LOOKS: ReadonlyArray<{
  id: string;
  label: string;
  themeId: string;
  blurb: string;
}> = [
  { id: 'editorial', label: 'Editorial', themeId: 'editorial', blurb: 'Quiet, typographic, modern.' },
  { id: 'garden', label: 'Pressed Garden', themeId: 'garden', blurb: 'Warm paper, botanical, soft.' },
  { id: 'midnight', label: 'Midnight', themeId: 'midnight', blurb: 'Editorial dark, gold hairlines.' },
];

export interface MakeoverInput {
  prefill: DoorwayPrefill;
  /** One of MAKEOVER_LOOKS ids. Falls back to the first. */
  lookId?: string;
}

export interface MakeoverResult {
  manifest: StoryManifest;
  /** Fields genuinely carried from their page — what we can point
   *  at and say "this is yours". */
  carried: string[];
  /** True when we had so little that a preview would be a shell.
   *  The caller should ask for details rather than show it. */
  tooThin: boolean;
}

/** A display title from whatever names we have. */
function titleFrom(names: [string, string] | undefined, occasion: string): string | null {
  if (!names) return null;
  const [a, b] = names.map((n) => (n ?? '').trim());
  if (a && b) {
    // Couple-shaped occasions join with an ampersand; everything
    // else reads as a list.
    const coupleish = ['wedding', 'engagement', 'anniversary', 'vow-renewal'].includes(occasion);
    return coupleish ? `${a} & ${b}` : `${a}, ${b}`;
  }
  return a || b || null;
}

/**
 * Build a real, renderable manifest from what we read.
 *
 * Every placement is conditional on the fact existing — there is
 * no `?? 'Some Venue'` anywhere in this file, by design.
 */
export function buildMakeoverManifest(input: MakeoverInput): MakeoverResult {
  const prefill = input.prefill ?? {};
  const occasion = normalizeOccasion(prefill.occasion ?? 'wedding');
  const look =
    MAKEOVER_LOOKS.find((l) => l.id === input.lookId) ?? MAKEOVER_LOOKS[0];

  const carried: string[] = [];
  const base: Record<string, unknown> = {
    occasion,
    themeFamily: 'v8',
    themeId: look.themeId,
    /** Never published, never saved, never indexed. */
    preview: true,
    published: false,
  };

  const names = prefill.names;
  if (names) {
    base.names = names;
    carried.push('names');
    const title = titleFrom(names, occasion);
    if (title) base.seoTitle = title;
  }

  const logistics: Record<string, unknown> = {};
  if (prefill.eventDate) {
    logistics.date = prefill.eventDate;
    carried.push('date');
  }
  if (prefill.venueName) {
    logistics.venue = prefill.venueName;
    carried.push('venue');
  }
  if (prefill.location) {
    logistics.venueAddress = prefill.location;
    if (!carried.includes('venue')) carried.push('location');
  }
  if (Object.keys(logistics).length > 0) base.logistics = logistics;

  // Schedule lines only when we genuinely read some. A wedding
  // preview with an invented run-of-show is exactly the lie this
  // module refuses.
  if (prefill.scheduleHints && prefill.scheduleHints.length > 0) {
    base.events = prefill.scheduleHints.slice(0, 6).map((line, i) => ({
      id: `read-${i}`,
      name: line,
    }));
    carried.push('schedule');
  }

  // The occasion's own look defaults, then the theme pick — the
  // same order the wizard presses in.
  const defaults = lookDefaultsFor(occasion as never);
  const withLook = applyWizardLook(base as unknown as StoryManifest, {
    occasion: occasion as never,
    ...(defaults ?? {}),
  } as never);

  const manifest = withLook as unknown as Record<string, unknown>;
  // Theme pick wins over the occasion default — the visitor chose it.
  manifest.themeId = look.themeId;
  manifest.edition = recommendEdition(
    occasion as never,
    getEventType(occasion)?.voice,
  );

  return {
    manifest: manifest as unknown as StoryManifest,
    carried,
    // Names alone is a shell. We need a name AND one more fact
    // before a preview says anything worth showing.
    tooThin: carried.length < 2,
  };
}

/** Plain sentence naming what we carried across, for the UI. */
export function carriedSentence(carried: readonly string[]): string {
  const words: Record<string, string> = {
    names: 'your names',
    date: 'your date',
    venue: 'your venue',
    location: 'where it is',
    schedule: 'your schedule',
  };
  const parts = carried.map((c) => words[c] ?? c).filter(Boolean);
  if (parts.length === 0) return 'We couldn’t read anything from that page.';
  if (parts.length === 1) return `We brought over ${parts[0]}.`;
  const last = parts[parts.length - 1];
  return `We brought over ${parts.slice(0, -1).join(', ')} and ${last}.`;
}
