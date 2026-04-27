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

function dateStamp(date: string, time?: string | null): string {
  // Build YYYYMMDDTHHMMSS in local time. Calendar apps interpret
  // floating-time correctly when paired with TZID=UTC if provided.
  // For simplicity we emit floating local time — works on every
  // major calendar app.
  const [y, m, d] = date.split('-');
  let hh = '00';
  let mm = '00';
  if (time) {
    // Accept '4:00pm', '16:00', '4pm', etc.
    const lower = time.toLowerCase().trim();
    const match = lower.match(/^(\d{1,2}):?(\d{2})?\s*(am|pm)?$/);
    if (match) {
      let h = parseInt(match[1] ?? '0', 10);
      const min = parseInt(match[2] ?? '0', 10);
      const ampm = match[3];
      if (ampm === 'pm' && h < 12) h += 12;
      if (ampm === 'am' && h === 12) h = 0;
      hh = String(h).padStart(2, '0');
      mm = String(min).padStart(2, '0');
    }
  }
  return `${y}${m}${d}T${hh}${mm}00`;
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

  const dtStart = dateStamp(baseDate, target?.time ?? manifest.logistics?.time);
  // 4-hour default block — long enough to cover a ceremony + reception
  // when the host hasn't set a separate end time.
  const dtEnd = addHours(dtStart, 4);

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
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
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
