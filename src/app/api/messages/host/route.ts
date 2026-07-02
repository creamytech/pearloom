// ─────────────────────────────────────────────────────────────
// /api/messages/host — the host side of event-scoped messaging.
//
//   GET    ?siteId=<uuid> (or ?siteSlug=)
//          → { party: [...], dms: [{ guestId, guestName, messages }] }
//   POST   { siteId|siteSlug, thread: 'party'|'dm', guestId?, body }
//   DELETE ?id=<message uuid>&siteId=  → moderation (sets hidden_at)
//
// Session + site-owner gated throughout, same ownership shape as
// /api/guests. Hosts see hidden messages greyed in their own view
// (the audit trail); guests never see them again.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

interface SiteRow {
  id: string;
  site_config?: { creator_email?: string; names?: [string, string] } | null;
  creator_email?: string;
}

/** Resolve site by id or slug + verify the session owns it. */
async function ownedSite(
  supabase: SupabaseClient,
  sessionEmail: string,
  siteId: string | null,
  siteSlug: string | null,
): Promise<SiteRow | null> {
  const q = supabase.from('sites').select('id, site_config, creator_email');
  const { data } = await (siteId
    ? q.eq('id', siteId)
    : q.eq('subdomain', siteSlug ?? '')
  ).maybeSingle();
  const site = data as SiteRow | null;
  if (!site) return null;
  const owner = String(site.creator_email ?? site.site_config?.creator_email ?? '').toLowerCase().trim();
  return owner === sessionEmail ? site : null;
}

interface MessageRow {
  id: string;
  thread: string;
  guest_id: string | null;
  sender: string;
  author_name: string;
  body: string;
  hidden_at: string | null;
  created_at: string;
}

function shape(m: MessageRow) {
  return {
    id: m.id,
    guestId: m.guest_id,
    sender: m.sender as 'host' | 'guest',
    authorName: m.author_name,
    body: m.body,
    hidden: m.hidden_at != null,
    createdAt: m.created_at,
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ party: [], dms: [] });

    const site = await ownedSite(
      supabase,
      session.user.email.toLowerCase().trim(),
      req.nextUrl.searchParams.get('siteId'),
      req.nextUrl.searchParams.get('siteSlug'),
    );
    if (!site) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data, error } = await supabase
      .from('site_messages')
      .select('id, thread, guest_id, sender, author_name, body, hidden_at, created_at')
      .eq('site_id', site.id)
      .order('created_at', { ascending: true })
      .limit(600);
    if (error) return NextResponse.json({ party: [], dms: [] });

    const rows = (data ?? []) as MessageRow[];
    const party = rows.filter((m) => m.thread === 'party').map(shape);
    const byGuest = new Map<string, ReturnType<typeof shape>[]>();
    for (const m of rows) {
      if (m.thread !== 'dm' || !m.guest_id) continue;
      const list = byGuest.get(m.guest_id) ?? [];
      list.push(shape(m));
      byGuest.set(m.guest_id, list);
    }
    // Names for DM partners from the roster.
    let names = new Map<string, string>();
    if (byGuest.size > 0) {
      const { data: guests } = await supabase
        .from('guests')
        .select('id, name')
        .in('id', Array.from(byGuest.keys()));
      names = new Map((guests ?? []).map((g) => [String(g.id), String(g.name ?? 'A guest')]));
    }
    const dms = Array.from(byGuest.entries()).map(([guestId, messages]) => ({
      guestId,
      guestName: names.get(guestId) ?? 'A guest',
      messages,
    }));

    return NextResponse.json({ party, dms });
  } catch (err) {
    console.error('[messages/host] GET failed:', err);
    return NextResponse.json({ party: [], dms: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const sessionEmail = session.user.email.toLowerCase().trim();

    const rate = checkRateLimit(`messages-host:${sessionEmail}`, { max: 40, windowMs: 300_000 });
    if (!rate.allowed) return NextResponse.json({ error: 'Slow down a moment.' }, { status: 429 });

    let parsed: { siteId?: string; siteSlug?: string; thread?: string; guestId?: string; body?: string };
    try {
      parsed = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const body = (parsed.body ?? '').trim();
    if (!body || body.length > 2000) {
      return NextResponse.json({ error: 'Say something — up to 2000 characters.' }, { status: 400 });
    }
    const thread = parsed.thread === 'dm' ? 'dm' : 'party';
    if (thread === 'dm' && !parsed.guestId) {
      return NextResponse.json({ error: 'guestId required for direct messages' }, { status: 400 });
    }

    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ error: 'Messaging not configured' }, { status: 503 });
    const site = await ownedSite(supabase, sessionEmail, parsed.siteId ?? null, parsed.siteSlug ?? null);
    if (!site) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // DM target must be on THIS site's roster.
    if (thread === 'dm') {
      const { data: g } = await supabase
        .from('guests')
        .select('id')
        .eq('id', parsed.guestId)
        .eq('site_id', site.id)
        .maybeSingle();
      if (!g) return NextResponse.json({ error: 'Guest not found on this site' }, { status: 404 });
    }

    const names = (site.site_config?.names ?? []).filter(Boolean);
    const hostName = names.join(' & ') || 'Your hosts';

    const { data, error } = await supabase
      .from('site_messages')
      .insert({
        site_id: site.id,
        thread,
        guest_id: thread === 'dm' ? parsed.guestId : null,
        sender: 'host',
        author_name: hostName,
        body,
      })
      .select('id, thread, guest_id, sender, author_name, body, hidden_at, created_at')
      .single();
    if (error) {
      console.error('[messages/host] insert failed:', error);
      return NextResponse.json({ error: 'Could not send — try again?' }, { status: 500 });
    }
    return NextResponse.json({ ok: true, message: shape(data as MessageRow) });
  } catch (err) {
    console.error('[messages/host] POST failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ error: 'Messaging not configured' }, { status: 503 });

    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const site = await ownedSite(
      supabase,
      session.user.email.toLowerCase().trim(),
      req.nextUrl.searchParams.get('siteId'),
      req.nextUrl.searchParams.get('siteSlug'),
    );
    if (!site) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { error } = await supabase
      .from('site_messages')
      .update({ hidden_at: new Date().toISOString() })
      .eq('id', id)
      .eq('site_id', site.id); // scoped — can't hide other sites' messages
    if (error) return NextResponse.json({ error: 'Hide failed' }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[messages/host] DELETE failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
