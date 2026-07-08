/* ─────────────────────────────────────────────────────────────
   Proof mode — the Review pressing's honesty layer
   (PERSONA-PLAN S2, law 2: never present borrowed content as
   theirs).

   The wizard's Review step frames the pressing as "the exact site
   Pear will press" — so it must never render buildCopy's demo
   fallbacks (another couple's how-we-met, Santorini hotels under
   an Asheville wedding, a fabricated life story on a memorial).
   In proof mode, host-given content renders real and every
   section that would have leaned on demo copy renders a DRAFTING
   SLAT instead: the section's own (occasion-routed) heading plus
   one quiet line in Pear's voice about how it gets written.

   Leaf module: pure lookups, no React. ThemedSite consumes it in
   sectionEl; tests pin the gate the same way the editable gate is
   pinned.
   ───────────────────────────────────────────────────────────── */

import type { StoryManifest } from '@/types';
import { sectionHasContent } from './section-applicability';
import { getEventType } from '@/lib/event-os/event-types';

/* Sections whose published fallback was demo CONTENT — these slat
   when un-authored. Everything else (hero, rsvp, countdown, map,
   music…) derives from real facts the host gave and renders
   normally with demo copy off. */
const CORE_CONTENT_KINDS = new Set(['story', 'schedule', 'travel', 'registry', 'gallery', 'faq']);

/* Guest-written surfaces — at proof time there are no guests yet,
   so these ALWAYS slat, with a note that says whose words land
   here (and that nothing shows without host approval). */
const GUEST_WRITTEN_KINDS = new Set(['tributeWall', 'adviceWall']);

function detailsAuthored(manifest: StoryManifest): boolean {
  const loose = manifest as unknown as {
    detailsCards?: unknown[];
    kidsWelcome?: boolean;
    adultsOnly?: boolean;
  };
  return (Array.isArray(loose.detailsCards) && loose.detailsCards.length > 0)
    || loose.kidsWelcome === true
    || loose.adultsOnly === true;
}

function obituaryAuthored(manifest: StoryManifest): boolean {
  const ob = (manifest as unknown as { memorial?: { obituary?: Record<string, unknown> } }).memorial?.obituary;
  if (!ob) return false;
  return Object.values(ob).some((v) => typeof v === 'string' && v.trim().length > 0);
}

const DEFAULT_NOTE =
  'Pear drafts this with you in the editor — from your photos and the story you told me.';

const NOTES: Record<string, string> = {
  story: 'Pear drafts your story with you in the editor — from your photos and what you told me.',
  gallery: 'Your photographs land here — add them any time in the editor.',
  travel: 'Add stays and directions in the editor — Pear lays them out for your guests.',
  registry: 'Link stores, funds, or causes in the editor — guests reserve, you never touch fees.',
  schedule: 'Sketch the moments of the day in the editor — times stay flexible.',
  faq: 'Pear drafts the answers with you in the editor, from the details you gave.',
  details: 'The fine print writes itself in the editor — dress code, parking, the little things.',
  tributeWall: 'Your guests write this part — their words appear once you approve them.',
  adviceWall: 'Your guests write this part — their words appear once you approve them.',
  obituary: 'Written in your words, at your pace — Pear helps, gently, in the editor.',
};

const SOLEMN_NOTES: Record<string, string> = {
  story: 'Their story is yours to tell — Pear helps you write it, gently, in the editor. Nothing is published without you.',
  gallery: 'Their photographs land here — add them whenever you are ready.',
  registry: 'Add the causes or funds the family suggests — in the editor, whenever you are ready.',
  tributeWall: 'Guests share their memories here — each one waits for your approval before it appears.',
};

/** Decide the Review pressing's treatment for a section.
 *  Returns the slat note to render, or null to render the section
 *  normally (real host content, or honest functional chrome). */
export function proofSlatFor(
  kind: string,
  manifest: StoryManifest,
  occasion?: string,
): string | null {
  const solemn = getEventType(occasion)?.voice === 'solemn';
  const note = (solemn && SOLEMN_NOTES[kind]) || NOTES[kind] || DEFAULT_NOTE;

  if (GUEST_WRITTEN_KINDS.has(kind)) return note;
  if (CORE_CONTENT_KINDS.has(kind)) {
    return sectionHasContent(kind, manifest) ? null : note;
  }
  if (kind === 'details') return detailsAuthored(manifest) ? null : note;
  if (kind === 'obituary') return obituaryAuthored(manifest) ? null : note;
  return null;
}
