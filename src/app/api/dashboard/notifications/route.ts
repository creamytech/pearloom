// ─────────────────────────────────────────────────────────────
// Pearloom / api/dashboard/notifications
//
// Aggregates "what's new since I last looked?" across every
// data source the host might care about — RSVPs, photos,
// guestbook messages, whispers, vendor confirmations. Replaces
// the previous pattern where every dashboard widget had to
// fetch + render its own "X new" badge separately.
//
// Query: ?siteId=…&since=ISO-8601
//   - siteId required (the only site the bell is keyed to)
//   - since defaults to 7d ago when omitted
//
// Response shape:
//   {
//     items: Notification[],
//     unread: number,
//     latestAt: string | null,
//   }
//
// Each Notification has { id, kind, label, preview, href,
// createdAt }. The dashboard NotificationBell renders the list,
// dedupes by id, and tracks "last seen" via localStorage so the
// unread count is local-state, not server-state.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

interface Notification {
  id: string;
  kind: 'rsvp' | 'photo' | 'guestbook' | 'whisper' | 'message';
  label: string;
  preview?: string;
  href: string;
  createdAt: string;
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
      return NextResponse.json({ items: [], unread: 0, latestAt: null });
    }

    const items: Notification[] = [];

    // ── RSVPs ──────────────────────────────────────────────
    try {
      const { data: rsvps } = await supabase
        .from('guests')
        .select('id, name, status, responded_at, created_at')
        .eq('site_id', siteId)
        .not('responded_at', 'is', null)
        .gte('responded_at', since)
        .order('responded_at', { ascending: false })
        .limit(20);
      for (const r of (rsvps ?? []) as Array<{ id: string; name: string; status: string; responded_at: string }>) {
        const verb = r.status === 'attending' ? 'is in'
                   : r.status === 'declined' ? "can't make it"
                   : 'replied';
        items.push({
          id: `rsvp-${r.id}`,
          kind: 'rsvp',
          label: `${r.name} ${verb}`,
          href: `/dashboard/rsvp`,
          createdAt: r.responded_at,
        });
      }
    } catch {
      // table missing or RLS blocked — silently skip this source
    }

    // ── Guestbook messages ─────────────────────────────────
    // Canonical table is `guestbook` (api/guestbook/route.ts) with
    // column `guest_name`. Older notification code queried a
    // non-existent `guestbook_entries` table — that's why guestbook
    // posts never showed in the bell.
    try {
      const { data: notes } = await supabase
        .from('guestbook')
        .select('id, guest_name, message, created_at')
        .eq('site_id', siteId)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(20);
      for (const n of (notes ?? []) as Array<{ id: string; guest_name: string | null; message: string; created_at: string }>) {
        items.push({
          id: `note-${n.id}`,
          kind: 'guestbook',
          label: `${n.guest_name ?? 'A guest'} left a note`,
          preview: n.message.slice(0, 80),
          href: `/dashboard/submissions`,
          createdAt: n.created_at,
        });
      }
    } catch {
      // skip
    }
    // Belt-and-braces: some flows use `guestbook_messages` (older
    // wedding OS code path) — pick those up too so we don't lose
    // notes regardless of which writer landed them.
    try {
      const { data: notes } = await supabase
        .from('guestbook_messages')
        .select('id, guest_name, message, created_at')
        .eq('site_id', siteId)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(20);
      for (const n of (notes ?? []) as Array<{ id: string; guest_name: string | null; message: string; created_at: string }>) {
        items.push({
          id: `note2-${n.id}`,
          kind: 'guestbook',
          label: `${n.guest_name ?? 'A guest'} left a note`,
          preview: (n.message ?? '').slice(0, 80),
          href: `/dashboard/submissions`,
          createdAt: n.created_at,
        });
      }
    } catch {
      // table may not exist on this deployment — silent skip
    }

    // ── Whispers ───────────────────────────────────────────
    try {
      const { data: whispers } = await supabase
        .from('whispers')
        .select('id, message, created_at, read_at')
        .eq('site_id', siteId)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(20);
      for (const w of (whispers ?? []) as Array<{ id: string; message: string; created_at: string }>) {
        items.push({
          id: `whisper-${w.id}`,
          kind: 'whisper',
          label: 'A guest whispered',
          preview: w.message.slice(0, 80),
          href: `/dashboard/bridge`,
          createdAt: w.created_at,
        });
      }
    } catch {
      // skip
    }

    // ── Guest photos ───────────────────────────────────────
    // Column is `uploader_name` per src/lib/db.ts addGuestPhoto;
    // earlier code queried a non-existent `guest_name` column and
    // silently dropped these from the bell.
    try {
      const { data: photos } = await supabase
        .from('guest_photos')
        .select('id, uploader_name, created_at')
        .eq('site_id', siteId)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(20);
      for (const p of (photos ?? []) as Array<{ id: string; uploader_name: string | null; created_at: string }>) {
        items.push({
          id: `photo-${p.id}`,
          kind: 'photo',
          label: `${p.uploader_name ?? 'A guest'} dropped a photo`,
          href: `/dashboard/gallery`,
          createdAt: p.created_at,
        });
      }
    } catch {
      // skip
    }

    // Sort all sources together so the timeline reads naturally.
    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const latestAt = items[0]?.createdAt ?? null;
    return NextResponse.json({ items: items.slice(0, 30), unread: items.length, latestAt });
  } catch (err) {
    console.error('[api/dashboard/notifications] Error:', err);
    return NextResponse.json({ items: [], unread: 0, latestAt: null });
  }
}
