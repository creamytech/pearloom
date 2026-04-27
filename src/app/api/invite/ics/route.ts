// ─────────────────────────────────────────────────────────────
// Pearloom / api/invite/ics/route.ts
//
// GET ?token=xxx  — returns an RFC 5545 .ics calendar file for
// the guest to add the events they're RSVPd attending to their
// phone's calendar. Pulls the guest's invite_tokens row, joins
// to guests.event_ids, joins to sites.ai_manifest.events, and
// emits one VEVENT per attended event.
//
// Supports webcal:// links so iOS adds it with a single tap.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { StoryManifest, WeddingEvent } from '@/types';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key);
}

// Normalise an event's date+time to a Date object. Times are parsed as
// local-wall-clock for the venue; we emit FLOATING (no TZID) so calendars
// show the event at the wall-clock time regardless of the guest's TZ.
function eventStart(evt: WeddingEvent): Date | null {
  if (!evt.date) return null;
  const d = new Date(evt.date.includes('T') ? evt.date : `${evt.date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  if (evt.time) {
    const [h, m, ampm] = parseTime(evt.time);
    if (h !== null) {
      d.setHours(ampm === 'pm' && h < 12 ? h + 12 : ampm === 'am' && h === 12 ? 0 : h);
      d.setMinutes(m ?? 0);
    }
  } else {
    d.setHours(17, 0); // sensible default: 5 pm
  }
  return d;
}

function parseTime(
  raw: string,
): [number | null, number | null, 'am' | 'pm' | null] {
  const s = raw.trim();
  const twelve = s.match(/^(\d{1,2})(?::(\d{2}))?\s*([apAP])\.?\s*[mM]?\.?$/);
  if (twelve) {
    return [
      parseInt(twelve[1], 10),
      twelve[2] ? parseInt(twelve[2], 10) : 0,
      twelve[3].toLowerCase() === 'a' ? 'am' : 'pm',
    ];
  }
  const twentyFour = s.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFour) return [parseInt(twentyFour[1], 10), parseInt(twentyFour[2], 10), null];
  return [null, null, null];
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

// FLOATING (local wall-clock) DATE-TIME as required by RFC 5545 — no Z, no TZID.
function formatFloating(d: Date): string {
  return (
    d.getFullYear() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    'T' +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

function formatUtc(d: Date): string {
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  );
}

function escapeText(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

// Fold long lines to 75 octets per RFC 5545 §3.1.
function fold(line: string): string {
  if (line.length <= 75) return line;
  const out: string[] = [];
  let i = 0;
  while (i < line.length) {
    const chunk = line.slice(i, i + (i === 0 ? 75 : 74));
    out.push((i === 0 ? '' : ' ') + chunk);
    i += i === 0 ? 75 : 74;
  }
  return out.join('\r\n');
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'token required' }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data: tokenRow } = await supabase
    .from('invite_tokens')
    .select('guest_id, site_id')
    .eq('token', token)
    .maybeSingle();
  if (!tokenRow) {
    return NextResponse.json({ error: 'invalid token' }, { status: 404 });
  }

  const [{ data: guest }, { data: siteRow }] = await Promise.all([
    supabase
      .from('guests')
      .select('name, event_ids, status')
      .eq('id', tokenRow.guest_id as string)
      .maybeSingle(),
    supabase
      .from('sites')
      .select('subdomain, site_config, ai_manifest')
      .eq('id', tokenRow.site_id as string)
      .maybeSingle(),
  ]);

  if (!siteRow) return NextResponse.json({ error: 'site not found' }, { status: 404 });

  const manifest = siteRow.ai_manifest as StoryManifest | null;
  const allEvents = manifest?.events || [];
  const attendedIds = (guest?.event_ids as string[]) || [];
  const selected = attendedIds.length > 0
    ? allEvents.filter((e) => attendedIds.includes(e.id))
    : allEvents;

  const siteConfig = siteRow.site_config as Record<string, unknown> | null;
  const names = (siteConfig?.names as [string, string]) || ['', ''];
  const coupleLabel = names.filter(Boolean).join(' & ') || 'Pearloom';

  const now = new Date();
  const stamp = formatUtc(now);

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Pearloom//Wedding Pass//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(`${coupleLabel}'s wedding`)}`,
  ];

  for (const evt of selected) {
    const start = eventStart(evt);
    if (!start) continue;
    const end = new Date(start.getTime() + 3 * 60 * 60 * 1000); // default 3h
    const uid = `${evt.id}@${(siteRow.subdomain as string) || 'pearloom'}.pearloom.com`;
    const location = [evt.venue, evt.address].filter(Boolean).join(', ');
    const description = [
      `You're attending ${coupleLabel}'s ${evt.name.toLowerCase()}.`,
      evt.dressCode ? `Dress code: ${evt.dressCode}` : '',
      evt.description || '',
    ]
      .filter(Boolean)
      .join('\n\n');

    lines.push('BEGIN:VEVENT');
    lines.push(fold(`UID:${uid}`));
    lines.push(`DTSTAMP:${stamp}`);
    lines.push(`DTSTART:${formatFloating(start)}`);
    lines.push(`DTEND:${formatFloating(end)}`);
    lines.push(fold(`SUMMARY:${escapeText(`${coupleLabel} · ${evt.name}`)}`));
    if (location) lines.push(fold(`LOCATION:${escapeText(location)}`));
    if (description) lines.push(fold(`DESCRIPTION:${escapeText(description)}`));
    lines.push('STATUS:CONFIRMED');
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');

  const body = lines.join('\r\n') + '\r\n';
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${coupleLabel.replace(/[^a-z0-9]+/gi, '-')}.ics"`,
      'Cache-Control': 'no-store',
    },
  });
}
