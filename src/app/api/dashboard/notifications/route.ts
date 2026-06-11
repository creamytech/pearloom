// ─────────────────────────────────────────────────────────────
// Pearloom / api/dashboard/notifications
//
// GET  ?siteId=…&since=ISO  — the bell feed. Aggregation lives
//   in lib/notifications/feed.ts (shared with the daily digest
//   cron). Returns the host's server-side last-seen timestamp
//   (notification_reads) so the unread count survives across
//   devices; `unread` counts items newer than it.
//
// POST { siteId } — mark the bell seen "now" for this host.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { fetchNotificationFeed } from '@/lib/notifications/feed';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');
    const sinceParam = searchParams.get('since');
    if (!siteId) {
      return NextResponse.json({ error: 'siteId required' }, { status: 400 });
    }

    // Default lookback: 7 days. The bell only ever shows recent
    // activity — for older items the host has the dedicated tab.
    const since = sinceParam
      ? new Date(sinceParam).toISOString()
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ items: [], unread: 0, latestAt: null, seenAt: null });
    }

    const items = await fetchNotificationFeed(supabase, siteId, since);

    // Server-side read state — cross-device. Missing row = never
    // opened the bell for this site.
    let seenAt: string | null = null;
    try {
      const { data: readRow } = await supabase
        .from('notification_reads')
        .select('last_seen_at')
        .eq('user_email', session.user.email.toLowerCase())
        .eq('site_id', siteId)
        .maybeSingle();
      seenAt = (readRow as { last_seen_at?: string } | null)?.last_seen_at ?? null;
    } catch { /* table missing — unread falls back to item count */ }

    const seenMs = seenAt ? new Date(seenAt).getTime() : 0;
    const unread = items.filter((i) => new Date(i.createdAt).getTime() > seenMs).length;
    const latestAt = items[0]?.createdAt ?? null;

    return NextResponse.json({ items: items.slice(0, 30), unread, latestAt, seenAt });
  } catch (err) {
    console.error('[api/dashboard/notifications] Error:', err);
    return NextResponse.json({ items: [], unread: 0, latestAt: null, seenAt: null });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json().catch(() => ({})) as { siteId?: string };
    if (!body.siteId) {
      return NextResponse.json({ error: 'siteId required' }, { status: 400 });
    }
    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ ok: true });

    const now = new Date().toISOString();
    await supabase.from('notification_reads').upsert({
      user_email: session.user.email.toLowerCase(),
      site_id: body.siteId,
      last_seen_at: now,
    }, { onConflict: 'user_email,site_id' });
    return NextResponse.json({ ok: true, seenAt: now });
  } catch (err) {
    console.error('[api/dashboard/notifications] mark-seen failed:', err);
    return NextResponse.json({ ok: false });
  }
}
