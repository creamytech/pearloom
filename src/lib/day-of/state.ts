// ─────────────────────────────────────────────────────────────
// Pearloom / lib/day-of/state.ts
//
// Compute Day-Of Mode state from a StoryManifest. Day-Of Mode
// flips the published site's hero, surfaces a live photo wall,
// pins a "happening now" pulse, and reveals the host's
// broadcast composer — but only when it makes sense.
//
// Manifest field `dayOfMode` controls behaviour:
//   • undefined / 'auto' (default) — auto-enable on the day
//     of the event and the morning after, off otherwise.
//   • 'on'  — force live mode (rehearsals, demos).
//   • 'off' — disable even on the day of (e.g. memorial host
//     who doesn't want a real-time experience).
// ─────────────────────────────────────────────────────────────

import type { StoryManifest } from '@/types';

export type DayOfMode = 'auto' | 'on' | 'off';

export interface DayOfState {
  /** True iff Day-Of Mode is active right now. */
  active: boolean;
  /** Substate for finer UI swaps (pre/live/post). */
  status: 'pre' | 'live' | 'post' | 'inactive';
  /** Anchor — the timestamp of the next-most-relevant moment. */
  nextMomentAt: string | null;
  /** Label for the "happening now" pulse. */
  nowLabel: string | null;
  /** Label for the next moment (when status=pre). */
  nextLabel: string | null;
}

interface ManifestEvent {
  id?: string;
  title?: string;
  time?: string;            // ISO timestamp or "HH:mm"
  startsAt?: string;
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function parseEventStart(eventDateIso: string, ev: ManifestEvent): Date | null {
  // Prefer explicit ISO timestamp.
  if (ev.startsAt) {
    const d = new Date(ev.startsAt);
    if (!Number.isNaN(d.getTime())) return d;
  }
  // Otherwise combine event date + HH:mm time.
  if (ev.time && /^\d{1,2}:\d{2}/.test(ev.time)) {
    const base = new Date(eventDateIso);
    if (Number.isNaN(base.getTime())) return null;
    const [hh, mm] = ev.time.split(':').map((s) => parseInt(s, 10));
    base.setHours(hh, mm, 0, 0);
    return base;
  }
  // Fall back to the event date at noon.
  const fb = new Date(eventDateIso);
  if (Number.isNaN(fb.getTime())) return null;
  fb.setHours(12, 0, 0, 0);
  return fb;
}

export function computeDayOfState(
  manifest: StoryManifest | null | undefined,
  now: Date = new Date(),
): DayOfState {
  const inactive: DayOfState = { active: false, status: 'inactive', nextMomentAt: null, nowLabel: null, nextLabel: null };
  if (!manifest) return inactive;

  const mode = ((manifest as unknown as { dayOfMode?: DayOfMode }).dayOfMode ?? 'auto') as DayOfMode;
  if (mode === 'off') return inactive;

  const eventDateIso = manifest.logistics?.date;
  if (!eventDateIso) return mode === 'on' ? { ...inactive, active: true, status: 'pre' } : inactive;
  const eventDate = new Date(eventDateIso);
  if (Number.isNaN(eventDate.getTime())) return inactive;

  // ── Auto detection window ──
  const sameCalendarDay =
    eventDate.getFullYear() === now.getFullYear() &&
    eventDate.getMonth() === now.getMonth() &&
    eventDate.getDate() === now.getDate();
  const morningAfter = (() => {
    const tomorrow = new Date(eventDate);
    tomorrow.setDate(eventDate.getDate() + 1);
    return tomorrow.getFullYear() === now.getFullYear() &&
           tomorrow.getMonth() === now.getMonth() &&
           tomorrow.getDate() === now.getDate();
  })();
  const autoActive = sameCalendarDay || morningAfter;
  const active = mode === 'on' || (mode === 'auto' && autoActive);
  if (!active) return inactive;

  // ── Resolve current/next moment from manifest.events ──
  const events = ((manifest.events ?? []) as ManifestEvent[])
    .map((ev) => ({ ev, start: parseEventStart(eventDateIso, ev) }))
    .filter((row): row is { ev: ManifestEvent; start: Date } => !!row.start)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  // What's happening now? We declare an event "now" if it's
  // started within the last 90 min and the next event hasn't
  // started yet (or there is no next event within 90 min).
  let nowEvent: { ev: ManifestEvent; start: Date } | null = null;
  let nextEvent: { ev: ManifestEvent; start: Date } | null = null;
  for (let i = 0; i < events.length; i += 1) {
    const row = events[i];
    if (row.start.getTime() <= now.getTime()) {
      if (now.getTime() - row.start.getTime() <= 90 * 60 * 1000) {
        nowEvent = row;
      }
    } else if (!nextEvent) {
      nextEvent = row;
    }
  }

  if (nowEvent) {
    return {
      active: true,
      status: 'live',
      nowLabel: nowEvent.ev.title ?? 'Live now',
      nextLabel: nextEvent?.ev.title ?? null,
      nextMomentAt: nextEvent?.start.toISOString() ?? null,
    };
  }

  if (nextEvent) {
    return {
      active: true,
      status: 'pre',
      nowLabel: null,
      nextLabel: nextEvent.ev.title ?? 'Up next',
      nextMomentAt: nextEvent.start.toISOString(),
    };
  }

  // No event matched — we're past the last one.
  return {
    active: true,
    status: 'post',
    nowLabel: null,
    nextLabel: null,
    nextMomentAt: null,
  };
}

/** Format a delta for the "happening in 1h 24m" pulse. */
export function formatDelta(targetIso: string, now: Date = new Date()): string {
  const ms = new Date(targetIso).getTime() - now.getTime();
  if (ms <= 0) return 'now';
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return 'less than a minute';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remMin = minutes - hours * 60;
  if (hours < 6) return remMin > 0 ? `${hours}h ${remMin}m` : `${hours}h`;
  return `${hours} hours`;
}

void DAY; void HOUR;
