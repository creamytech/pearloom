// ─────────────────────────────────────────────────────────────
// Pearloom / api/calendar/[siteId]/route.ts
// Returns a .ics calendar file for all events at a site
// ─────────────────────────────────────────────────────────────

import { getSiteConfig } from '@/lib/db';
import { generateMultiICS } from '@/lib/calendar';
import type { CalendarEvent } from '@/lib/calendar';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ siteId: string }> },
) {
  try {
  const { siteId } = await params;

  const siteConfig = await getSiteConfig(siteId);
  if (!siteConfig) {
    return new Response(JSON.stringify({ error: 'Site not found' }), { status: 404 });
  }

  const manifest = siteConfig.manifest as {
    title?: string;
    events?: Array<{
      id: string;
      name: string;
      date: string;
      time: string;
      endTime?: string;
      venue: string;
      address: string;
      description?: string;
    }>;
    logistics?: {
      date?: string;
      time?: string;
      endTime?: string;
      venue?: string;
      address?: string;
      description?: string;
    };
  } | null;

  if (!manifest) {
    return new Response(JSON.stringify({ error: 'No manifest found' }), { status: 404 });
  }

  const calEvents: CalendarEvent[] = [];

  // Use manifest.events if present
  if (manifest.events && manifest.events.length > 0) {
    for (const evt of manifest.events) {
      if (!evt.date || !evt.time) continue;
      calEvents.push({
        title: evt.name || manifest.title || 'Event',
        date: evt.date,
        time: evt.time,
        endTime: evt.endTime,
        venue: evt.venue || '',
        address: evt.address || '',
        description: evt.description,
      });
    }
  } else if (manifest.logistics?.date) {
    // Fall back to the primary logistics event
    const l = manifest.logistics;
    const logisticsDate = l.date as string;
    calEvents.push({
      title: manifest.title || 'Event',
      date: logisticsDate,
      time: l.time || '12:00 PM',
      endTime: l.endTime,
      venue: l.venue || '',
      address: l.address || '',
      description: l.description,
    });
  }

  if (calEvents.length === 0) {
    return new Response(JSON.stringify({ error: 'No events to export' }), { status: 404 });
  }

  const icsContent = generateMultiICS(calEvents);

  return new Response(icsContent, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="event.ics"',
      'Cache-Control': 'no-store',
    },
  });
  } catch (err) {
    console.error('[api/calendar]', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 });
  }
}
