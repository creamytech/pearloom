// ─────────────────────────────────────────────────────────────
// Pearloom / components/invite/ics.ts
//
// Pure, server-safe .ics builder shared by the guest-facing
// reveal surfaces (InviteReveal, SaveTheDateReveal). Returns a
// data: href the browser downloads directly — no API round trip.
//
// Extracted verbatim from InviteReveal's inline useMemo
// (2026-06-09, Suite Phase 2) so the save-the-date reveal page
// could reuse it server-side.
// ─────────────────────────────────────────────────────────────

export interface IcsEventInput {
  /** ISO date ("2027-06-22" or full ISO timestamp). */
  date: string;
  /** Free-text time ("4:30 PM" or "16:30"). Defaults to 16:00. */
  time?: string | null;
  /** Event summary line. */
  title: string;
  venue?: string | null;
  address?: string | null;
  /** Lines joined into the DESCRIPTION field. */
  descriptionLines?: string[];
  /** Stable UID — e.g. `invite-${token}@pearloom.com`. */
  uid: string;
}

/**
 * Build a `data:text/calendar` href for a single event, or null
 * when the date can't be parsed. Floating local time (no TZID) —
 * matches the prior InviteReveal behaviour.
 */
export function buildIcsDataHref(input: IcsEventInput): string | null {
  const { date, time, title, venue, address, descriptionLines = [], uid } = input;
  if (!date) return null;

  const dateStr = date.includes('T') ? date.slice(0, 10) : date;
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return null;
  const pad = (n: number) => String(n).padStart(2, '0');

  // Parse the headline time if present; default to 16:00 local.
  let hh = 16, mm = 0;
  if (time) {
    const t = time.trim().toUpperCase();
    const m12 = t.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/);
    const m24 = t.match(/^(\d{1,2}):(\d{2})$/);
    if (m12) {
      hh = parseInt(m12[1], 10);
      mm = m12[2] ? parseInt(m12[2], 10) : 0;
      if (m12[3] === 'AM' && hh === 12) hh = 0;
      if (m12[3] === 'PM' && hh !== 12) hh += 12;
    } else if (m24) {
      hh = parseInt(m24[1], 10);
      mm = parseInt(m24[2], 10);
    }
  }
  const endHh = (hh + 3) % 24;
  const dtStart = `${y}${pad(m)}${pad(d)}T${pad(hh)}${pad(mm)}00`;
  const dtEnd = `${y}${pad(m)}${pad(d)}T${pad(endHh)}${pad(mm)}00`;
  const esc = (s: string) => s.replace(/[,;\\]/g, ' ');
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Pearloom//Invitation//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${esc(title)}`,
    `LOCATION:${esc([venue, address].filter(Boolean).join(', '))}`,
    `DESCRIPTION:${esc(descriptionLines.join(' \\n '))}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}
