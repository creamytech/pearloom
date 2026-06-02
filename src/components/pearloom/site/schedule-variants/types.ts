// ──────────────────────────────────────────────────────────────
// Shared types for the schedule variant components. Mirrors the
// pattern in hero-variants/types.ts.
// ──────────────────────────────────────────────────────────────

import type { StoryManifest } from '@/types';

export type ScheduleEvent = NonNullable<StoryManifest['events']>[number];

export type ScheduleFieldEditor = (
  patch: (m: StoryManifest) => StoryManifest,
) => void;

export interface ScheduleVariantProps {
  events: ScheduleEvent[];
  editMode?: boolean;
  onEditField?: ScheduleFieldEditor;
}

/** Split "4:00 PM" / "16:00" into {t, m} per the prototype's schema.
 *  Mirrors splitTime() in ThemedSiteRenderer so the meridian renders
 *  at a smaller size next to the time. */
export function splitTime(raw: string | undefined | null): { t: string; m: string } {
  if (!raw) return { t: '', m: '' };
  const m = raw.match(/^(\d{1,2}:\d{2})\s*(AM|PM|am|pm)?$/);
  if (m) return { t: m[1], m: (m[2] ?? '').toUpperCase() };
  return { t: raw, m: '' };
}

/** Patch a single event field. Mirrors makePatchEvent() in
 *  ThemedSiteRenderer — matches by id first (so reorders don't
 *  drift), then by index as fallback. */
export function makePatchEvent(
  onEditField: ScheduleFieldEditor | undefined,
  eventId: string | undefined,
  eventIndex: number,
) {
  return (field: 'name' | 'description' | 'time') => (value: string) => {
    if (!onEditField) return;
    onEditField((m) => {
      const events = [...(m.events ?? [])];
      let idx = eventId ? events.findIndex((e) => e.id === eventId) : -1;
      if (idx < 0) idx = eventIndex;
      if (idx < 0 || idx >= events.length) return m;
      events[idx] = { ...events[idx], [field]: value };
      return { ...m, events } as StoryManifest;
    });
  };
}
