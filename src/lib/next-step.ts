/* ─────────────────────────────────────────────────────────────
   next-step.ts — the GOLDEN THREAD.

   ONE next-best-action computed from real manifest state, shared
   by the editor topbar thread chip (EditorTopbar) and the
   dashboard "Next up" card (WelcomeHome). Pure functions — no
   React, no fetches — so both surfaces stay in lockstep and the
   ladder is unit-testable.

   Priority ladder (first unmet wins):
     1. cover photo missing        → 'Add your cover photo'  (hero)
     2. event date missing         → 'Lock the date'          (hero)
     3. fewer than 4 gallery shots → 'Add N more photos'      (gallery)
     4. story chapters empty       → 'Tell the story'         (story)
     5. not published              → 'Press it live'          (publish)
     6. published, 0 guests        → 'Build your guest list'  (guests)
     7. published, pending replies
        + reply-by within 7 days   → 'Nudge N pending replies'(guests)
     8. nothing unmet              → null ("All threaded.")

   `target` is a SectionId / tool key the editor dispatches via
   `pearloom:design-jump` — except 'publish', which isn't a rail
   panel: consumers open the publish flow the same way the
   Publish button does (pearloom:open-publish via bridge.openPublish).

   Published state: the publish flow (shared/PublishModal) stamps
   `manifest.published = true` on success, and server-persisted
   sites carry `manifest.publishedAt` (ISO). Either counts.
   `manifest.subdomain` is deliberately NOT used — drafts can
   carry a claimed address before the host ever presses publish.
   ───────────────────────────────────────────────────────────── */

import type { StoryManifest } from '@/types';

export type NextStepTarget = 'hero' | 'gallery' | 'story' | 'publish' | 'guests';

export interface NextStep {
  id: 'cover' | 'date' | 'gallery' | 'story' | 'publish' | 'guest-list' | 'nudge';
  /** Short, verb-first action copy ("Add your cover photo"). */
  label: string;
  /** One-line supporting copy (tooltip / card sub-line). */
  hint: string;
  /** Editor jump key. 'publish' opens the publish flow instead of
   *  a rail panel — see module header. */
  target: NextStepTarget;
}

/** Live counts the dashboard already fetches (/api/guests). Both
 *  optional — the editor topbar computes steps 1-5 from the
 *  manifest alone and simply never reaches steps 6-7. */
export interface NextStepCounts {
  /** Total guests on the list (invited). */
  guests?: number;
  /** Guests still pending a reply. */
  pendingRsvps?: number;
}

/** Gallery feels woven (not sparse) at four photos. */
export const GALLERY_TARGET_COUNT = 4;
/** Reply-by urgency window for the nudge step, in days. */
export const NUDGE_WINDOW_DAYS = 7;

/* ── Defensive date parsing ───────────────────────────────────
   Same pattern as RsvpPanel.defaultReplyBy: logistics.date and
   rsvpDeadline are display strings (long form from FDate, or ISO
   from older wizard runs). ISO yyyy-mm-dd parses as LOCAL time to
   avoid tz drift; anything else goes through Date.parse. */
function parseEventishDate(raw: string | undefined | null): Date | null {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (iso) {
    const d = new Date(+iso[1], +iso[2] - 1, +iso[3]);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const ms = Date.parse(trimmed);
  if (Number.isNaN(ms)) return null;
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Whole days from `now` to `target`, midnight-normalized (the
 *  GoLiveBadge convention): 0 = today, negative = past. */
function daysFromTodayTo(target: Date, now: Date): number {
  const a = new Date(now);
  a.setHours(0, 0, 0, 0);
  const b = new Date(target);
  b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** True once the host has pressed the site live. */
export function isManifestPublished(manifest: StoryManifest): boolean {
  const loose = manifest as unknown as { published?: boolean };
  return Boolean(loose.published) || Boolean((manifest.publishedAt ?? '').trim());
}

/** Effective reply-by date: an explicit host-set `rsvpDeadline`
 *  always wins; otherwise the site's displayed default (event
 *  date minus 14 days — mirrors RsvpPanel.defaultReplyBy). Null
 *  when neither parses. */
export function rsvpReplyBy(manifest: StoryManifest): Date | null {
  const loose = manifest as unknown as { rsvpDeadline?: string };
  const explicit = parseEventishDate(loose.rsvpDeadline);
  if (explicit) return explicit;
  const event = parseEventishDate(manifest.logistics?.date);
  if (!event) return null;
  const d = new Date(event);
  d.setDate(d.getDate() - 14);
  return d;
}

export interface RsvpMomentum {
  pending: number;
  replyBy: Date;
  /** Whole days until reply-by (0 = today). Always 0..NUDGE_WINDOW_DAYS. */
  daysLeft: number;
}

/** Non-null when pending replies exist AND the reply-by date lands
 *  within the next NUDGE_WINDOW_DAYS days. Drives both the ladder's
 *  nudge step and the dashboard's RSVP momentum card. */
export function rsvpMomentumFor(
  manifest: StoryManifest,
  pending: number,
  now: Date = new Date(),
): RsvpMomentum | null {
  if (!Number.isFinite(pending) || pending <= 0) return null;
  const replyBy = rsvpReplyBy(manifest);
  if (!replyBy) return null;
  const daysLeft = daysFromTodayTo(replyBy, now);
  if (daysLeft < 0 || daysLeft > NUDGE_WINDOW_DAYS) return null;
  return { pending, replyBy, daysLeft };
}

/** The one next-best-action. Null means everything on the ladder
 *  is met — consumers render the quiet "All threaded." state (or
 *  nothing at all). */
export function nextStepFor(
  manifest: StoryManifest,
  counts?: NextStepCounts,
  now: Date = new Date(),
): NextStep | null {
  const loose = manifest as unknown as { galleryImages?: string[] };

  /* 1 — cover photo. */
  if (!(manifest.coverPhoto ?? '').trim()) {
    return {
      id: 'cover',
      label: 'Add your cover photo',
      hint: 'The first thing guests see, set it in the Hero panel.',
      target: 'hero',
    };
  }

  /* 2 — event date. */
  if (!(manifest.logistics?.date ?? '').trim()) {
    return {
      id: 'date',
      label: 'Lock the date',
      hint: 'Everything else threads from the date.',
      target: 'hero',
    };
  }

  /* 3 — gallery depth. */
  const photos = (Array.isArray(loose.galleryImages) ? loose.galleryImages : [])
    .filter((p) => typeof p === 'string' && p.trim().length > 0);
  if (photos.length < GALLERY_TARGET_COUNT) {
    const missing = GALLERY_TARGET_COUNT - photos.length;
    return {
      id: 'gallery',
      label: `Add ${missing} more photo${missing === 1 ? '' : 's'}`,
      hint: 'Four photos make the gallery feel woven, not sparse.',
      target: 'gallery',
    };
  }

  /* 4 — story. */
  const chapters = Array.isArray(manifest.chapters) ? manifest.chapters : [];
  if (chapters.length === 0) {
    return {
      id: 'story',
      label: 'Tell the story',
      hint: 'A first chapter is enough, Pear can draft it with you.',
      target: 'story',
    };
  }

  /* 5 — press it live. */
  if (!isManifestPublished(manifest)) {
    return {
      id: 'publish',
      label: 'Press it live',
      hint: 'The essentials are in, press your site and share the link.',
      target: 'publish',
    };
  }

  /* 6 — guest list (published, counts available, zero guests). */
  if (counts?.guests === 0) {
    return {
      id: 'guest-list',
      label: 'Build your guest list',
      hint: 'Invite people so replies can start arriving.',
      target: 'guests',
    };
  }

  /* 7 — nudge pending replies inside the reply-by window. */
  const momentum = rsvpMomentumFor(manifest, counts?.pendingRsvps ?? 0, now);
  if (momentum) {
    const dateLabel = momentum.replyBy.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    return {
      id: 'nudge',
      label: `Nudge ${momentum.pending} pending repl${momentum.pending === 1 ? 'y' : 'ies'}`,
      hint: `Reply-by lands ${dateLabel}, a gentle nudge now fills the table.`,
      target: 'guests',
    };
  }

  /* 8 — all threaded. */
  return null;
}
