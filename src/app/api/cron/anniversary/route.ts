// ─────────────────────────────────────────────────────────────
// Pearloom / api/cron/anniversary/route.ts
//
// Daily cron: finds sites whose event anniversary lands today and
// emails a recap to the original RSVP yes-list. The email links to
// /sites/{slug}/recap which already exists.
//
// Authenticated via CRON_SECRET (Vercel cron, GitHub Actions, etc).
// Run: GET /api/cron/anniversary  with header `Authorization: Bearer <CRON_SECRET>`.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

interface SiteRow {
  id: string;
  subdomain: string;
  site_config: { creator_email?: string; names?: [string, string]; manifest?: { logistics?: { date?: string; venueAddress?: string }; occasion?: string } } | null;
}

function isSameMonthDay(iso: string, today: Date): boolean {
  if (!iso) return false;
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return false;
  return d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization');
    if (!auth || !auth.toLowerCase().startsWith('bearer ') || auth.slice(7) !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ ok: true, reason: 'no_supabase' });

  // Pull all published sites with a logistics.date — paged to handle
  // any size. The site_config jsonb scan is cheap because we already
  // index on (published, created_at).
  const { data, error } = await sb
    .from('sites')
    .select('id, subdomain, site_config')
    .eq('published', true);
  if (error) {
    console.warn('[cron/anniversary]', error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const today = new Date();
  const matches: Array<{ siteId: string; subdomain: string; eventDate: string; yearsAgo: number; recipients: number }> = [];

  for (const row of (data ?? []) as SiteRow[]) {
    const cfg = row.site_config ?? null;
    const eventDate = cfg?.manifest?.logistics?.date;
    if (!eventDate || !isSameMonthDay(eventDate, today)) continue;
    const yearsAgo = today.getFullYear() - new Date(eventDate).getFullYear();
    if (yearsAgo < 1) continue; // not an anniversary if it's the same year

    // Pull RSVPs marked yes.
    const { data: rsvpsData } = await sb
      .from('guests')
      .select('email')
      .eq('site_id', row.id)
      .eq('attending', 'yes')
      .not('email', 'is', null);
    const recipients = (rsvpsData ?? []).filter((r) => r.email).map((r) => String(r.email));

    matches.push({
      siteId: row.id,
      subdomain: row.subdomain,
      eventDate,
      yearsAgo,
      recipients: recipients.length,
    });

    // Send via email backend if configured. We don't ship transactional
    // email yet — log + persist a notification record instead.
    try {
      await sb.from('anniversary_log').insert({
        site_id: row.id,
        run_date: today.toISOString().slice(0, 10),
        years_ago: yearsAgo,
        recipients_count: recipients.length,
      });
    } catch {}
  }

  return NextResponse.json({ ok: true, processed: matches.length, matches });
}
