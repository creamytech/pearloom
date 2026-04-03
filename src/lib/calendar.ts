// ─────────────────────────────────────────────────────────────
// Pearloom / lib/calendar.ts — ICS file generator
// ─────────────────────────────────────────────────────────────

export interface CalendarEvent {
  title: string;
  date: string;       // ISO date string, e.g. "2024-12-31"
  time: string;       // e.g. "6:00 PM" or "18:00"
  endTime?: string;   // e.g. "10:00 PM" or "22:00"
  venue: string;
  address: string;
  description?: string;
  url?: string;
}

/**
 * Parse a time string like "6:00 PM", "18:00", "6:00PM", "6 PM" into
 * { hours, minutes } in 24-hour format.
 */
function parseTime(timeStr: string): { hours: number; minutes: number } {
  const normalized = timeStr.trim().toUpperCase();

  // Try 12-hour with AM/PM
  const match12 = normalized.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = match12[2] ? parseInt(match12[2], 10) : 0;
    const period = match12[3];
    if (period === 'AM' && hours === 12) hours = 0;
    if (period === 'PM' && hours !== 12) hours += 12;
    return { hours, minutes };
  }

  // Try 24-hour HH:MM
  const match24 = normalized.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    return { hours: parseInt(match24[1], 10), minutes: parseInt(match24[2], 10) };
  }

  // Fallback: midnight
  return { hours: 0, minutes: 0 };
}

/**
 * Format a date + time into RFC 5545 UTC datetime: 20241231T180000Z
 */
function formatICSDate(dateStr: string, timeStr: string): string {
  const { hours, minutes } = parseTime(timeStr);
  // Parse the date parts to avoid timezone offset issues
  const [year, month, day] = dateStr.split('-').map(Number);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${year}${pad(month)}${pad(day)}T${pad(hours)}${pad(minutes)}00Z`;
}

/**
 * Escape special characters in ICS text values.
 */
function escapeICS(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Fold long ICS lines to 75-character limit per RFC 5545.
 */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  chunks.push(line.slice(0, 75));
  let pos = 75;
  while (pos < line.length) {
    chunks.push(' ' + line.slice(pos, pos + 74));
    pos += 74;
  }
  return chunks.join('\r\n');
}

/**
 * Generate an RFC 5545 .ics VEVENT block for a single event.
 */
function generateVEVENT(event: CalendarEvent, uid: string, dtstamp: string): string {
  const dtstart = formatICSDate(event.date, event.time);

  let dtend: string;
  if (event.endTime) {
    dtend = formatICSDate(event.date, event.endTime);
  } else {
    // Default: 2 hours after start
    const { hours, minutes } = parseTime(event.time);
    const endHours = (hours + 2) % 24;
    const [year, month, day] = event.date.split('-').map(Number);
    const pad = (n: number) => String(n).padStart(2, '0');
    dtend = `${year}${pad(month)}${pad(day)}T${pad(endHours)}${pad(minutes)}00Z`;
  }

  const location = [event.venue, event.address].filter(Boolean).join(', ');

  const lines = [
    'BEGIN:VEVENT',
    foldLine(`UID:${uid}`),
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    foldLine(`SUMMARY:${escapeICS(event.title)}`),
    foldLine(`LOCATION:${escapeICS(location)}`),
  ];

  if (event.description) {
    lines.push(foldLine(`DESCRIPTION:${escapeICS(event.description)}`));
  }

  if (event.url) {
    lines.push(foldLine(`URL:${escapeICS(event.url)}`));
  }

  lines.push('END:VEVENT');
  return lines.join('\r\n');
}

/**
 * Generate a full RFC 5545 .ics file string for a single event.
 */
export function generateICS(event: CalendarEvent): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const dtstamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
  const uid = `${dtstamp}-${Math.random().toString(36).slice(2)}@pearloom.com`;

  const vevent = generateVEVENT(event, uid, dtstamp);

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Pearloom//Wedding Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    vevent,
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * Generate a single .ics file containing multiple events.
 */
export function generateMultiICS(events: CalendarEvent[]): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const dtstamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

  const vevents = events.map((evt, i) => {
    const uid = `${dtstamp}-${i}-${Math.random().toString(36).slice(2)}@pearloom.com`;
    return generateVEVENT(evt, uid, dtstamp);
  });

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Pearloom//Wedding Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...vevents,
    'END:VCALENDAR',
  ].join('\r\n');
}
