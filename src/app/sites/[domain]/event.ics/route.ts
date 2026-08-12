// ─────────────────────────────────────────────────────────────
// Pearloom / app/sites/[domain]/event.ics/route.ts
//
// Returns an iCalendar (.ics) file for a published site, importable
// into Apple / Google / Outlook calendars in one tap. Uses the
// site's logistics.date + venue + name fields.
//
// Supports a ?event= query param so multi-event weekends can offer
// individual ICS files per event (ceremony / reception / brunch).
// Defaults to the manifest's primary event if not specified.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getSiteConfig } from '@/lib/db';

export const dynamic = 'force-dynamic';

function escIcs(s: string): string {
  return (s ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

/** Parses '4:00pm' / '16:00' / '4pm' into a YYYYMMDDTHHMMSS stamp.
 *  Returns null when there is no parseable time — the caller emits
 *  an honest all-day event instead of pretending the celebration
 *  starts at midnight (NEW-USER-REVAMP G.6/L31). */
function dateStamp(date: string, time?: string | null): string | null {
  const [y, m, d] = date.split('-');
  if (!time) return null;
  const lower = time.toLowerCase().trim();
  const match = lower.match(/^(\d{1,2}):?(\d{2})?\s*(am|pm)?$/);
  if (!match) return null;
  let h = parseInt(match[1] ?? '0', 10);
  const min = parseInt(match[2] ?? '0', 10);
  const ampm = match[3];
  if (ampm === 'pm' && h < 12) h += 12;
  if (ampm === 'am' && h === 12) h = 0;
  const hh = String(h).padStart(2, '0');
  const mm = String(min).padStart(2, '0');
  return `${y}${m}${d}T${hh}${mm}00`;
}

/** YYYY-MM-DD → the following day's YYYYMMDD (all-day DTEND is
 *  exclusive per RFC 5545). */
function nextDayYmd(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

function addHours(stamp: string, hours: number): string {
  const y = stamp.slice(0, 4);
  const m = stamp.slice(4, 6);
  const d = stamp.slice(6, 8);
  const hh = stamp.slice(9, 11);
  const mm = stamp.slice(11, 13);
  const date = new Date(`${y}-${m}-${d}T${hh}:${mm}:00`);
  date.setHours(date.getHours() + hours);
  const yy = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const h2 = String(date.getHours()).padStart(2, '0');
  const m2 = String(date.getMinutes()).padStart(2, '0');
  return `${yy}${mo}${dd}T${h2}${m2}00`;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get('event');

  const config = await getSiteConfig(domain);
  if (!config?.manifest) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  }
  // The publish gate (H7) — a draft's names/date/venue must not leak
  // through its calendar file either.
  {
    const { isManifestPublished } = await import('@/lib/next-step');
    if (!isManifestPublished(config.manifest)) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }
  }
  const manifest = config.manifest;

  // Resolve the target event. If ?event= is set, use that one;
  // otherwise the first scheduled event, else logistics.date.
  const events = manifest.events ?? [];
  const target = eventId ? events.find((e) => e.id === eventId) : null;
  const baseDate = target?.date || manifest.logistics?.date;
  if (!baseDate || !/^\d{4}-\d{2}-\d{2}$/.test(baseDate)) {
    return NextResponse.json({ error: 'No date set on this site yet' }, { status: 400 });
  }

  const names = Array.isArray(config.names) ? config.names.filter(Boolean).join(' & ') : '';
  const occasion = (manifest as unknown as { occasion?: string }).occasion ?? 'celebration';
  const summary = target?.name
    ? `${target.name} · ${names || occasion}`
    : `${names ? names + "'s " : ''}${occasion}`;

  const venue = target?.venue || manifest.logistics?.venue || '';
  const address = target?.address || manifest.logistics?.venueAddress || '';
  const location = [venue, address].filter(Boolean).join(', ');

  const description = (
    target?.description ||
    (manifest as unknown as { poetry?: { heroTagline?: string } }).poetry?.heroTagline ||
    `${names ? names + "'s " : ''}${occasion} via Pearloom.`
  );

  /* The best real time we have: the targeted event's own time, the
     site-wide logistics time, or the first timed schedule event on
     the same date. NEVER an invented one — with no time anywhere,
     the file becomes an honest all-day event instead of a
     midnight-to-4am block (G.6). */
  const scheduleTime = (() => {
    if (target?.time || manifest.logistics?.time) return target?.time ?? manifest.logistics?.time;
    const onDate = events.filter((e) => e.date === baseDate && e.time);
    return onDate[0]?.time ?? null;
  })();
  const dtStart = dateStamp(baseDate, scheduleTime);
  // 4-hour default block — long enough to cover a ceremony + reception
  // when the host hasn't set a separate end time.
  const dtEnd = dtStart ? addHours(dtStart, 4) : null;
  const allDayStart = baseDate.replace(/-/g, '');
  const allDayEnd = nextDayYmd(baseDate);

  const dtStamp =
    new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || `https://${req.headers.get('host') || 'pearloom.com'}`;
  const url = `${origin}/sites/${domain}`;

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Pearloom//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:pearloom-${domain}-${target?.id ?? 'main'}@pearloom.com`,
    `DTSTAMP:${dtStamp}`,
    dtStart ? `DTSTART:${dtStart}` : `DTSTART;VALUE=DATE:${allDayStart}`,
    dtEnd ? `DTEND:${dtEnd}` : `DTEND;VALUE=DATE:${allDayEnd}`,
    `SUMMARY:${escIcs(summary)}`,
    `DESCRIPTION:${escIcs(description)}\\n\\nMore: ${url}`,
    location ? `LOCATION:${escIcs(location)}` : '',
    `URL:${url}`,
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escIcs(summary)} is tomorrow`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');

  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${domain}.ics"`,
      'Cache-Control': 'public, max-age=300',
    },
  });
}
