// ─────────────────────────────────────────────────────────────
// /api/messages — the guest side of event-scoped messaging.
//
//   GET  ?token=<guest credential>&thread=party|dm
//     → { messages: [...], canDm: boolean, guestName }
//   POST { token, thread, body }
//     → { ok: true, message }
//
// `token` is either guests.passport_token (?g= links) or
// pearloom_guests.guest_token (/g/[token]) — resolveGuestToken
// normalizes both. The party thread is the event's guest space;
// 'dm' is the guest's private logistics line to the hosts (needs
// a roster row — token-bridged guests without one get canDm:false).
//
// Privacy: a token only ever reads its OWN site's party thread and
// its OWN DM. Hidden (moderated) messages never render to guests.
// Delivery is polling (BroadcastBar pattern); Realtime is the
// named upgrade.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { resolveGuestToken } from '@/lib/people';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

interface MessageRow {
  id: string;
  thread: string;
  guest_id: string | null;
  sender: string;
  author_name: string;
  body: string;
  created_at: string;
}

function shape(m: MessageRow) {
  return {
    id: m.id,
    sender: m.sender as 'host' | 'guest',
    authorName: m.author_name,
    body: m.body,
    createdAt: m.created_at,
  };
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ messages: [], canDm: false });

    const token = req.nextUrl.searchParams.get('token');
    const thread = req.nextUrl.searchParams.get('thread') === 'dm' ? 'dm' : 'party';
    const guest = await resolveGuestToken(supabase, token);
    if (!guest) return NextResponse.json({ error: 'Unknown guest link' }, { status: 401 });

    let q = supabase
      .from('site_messages')
      .select('id, thread, guest_id, sender, author_name, body, created_at')
      .eq('site_id', guest.siteId)
      .eq('thread', thread)
      .is('hidden_at', null)
      .order('created_at', { ascending: true })
      .limit(200);
    if (thread === 'dm') {
      if (!guest.guestRowId) return NextResponse.json({ messages: [], canDm: false, guestName: guest.name });
      q = q.eq('guest_id', guest.guestRowId);
    }
    const { data, error } = await q;
    if (error) {
      // 42P01 = table missing on older deployments — empty, not a crash.
      return NextResponse.json({ messages: [], canDm: Boolean(guest.guestRowId), guestName: guest.name });
    }
    return NextResponse.json({
      messages: ((data ?? []) as MessageRow[]).map(shape),
      canDm: Boolean(guest.guestRowId),
      guestName: guest.name,
    });
  } catch (err) {
    console.error('[messages] GET failed:', err);
    return NextResponse.json({ messages: [], canDm: false });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    let parsed: { token?: string; thread?: string; body?: string };
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

    const rate = checkRateLimit(`messages:${parsed.token ?? ip}`, { max: 20, windowMs: 300_000 });
    if (!rate.allowed) {
      return NextResponse.json({ error: 'A breath between messages — try again in a moment.' }, { status: 429 });
    }

    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ error: 'Messaging not configured' }, { status: 503 });

    const guest = await resolveGuestToken(supabase, parsed.token);
    if (!guest) return NextResponse.json({ error: 'Unknown guest link' }, { status: 401 });
    if (thread === 'dm' && !guest.guestRowId) {
      return NextResponse.json({ error: 'Direct messages need an invite on the guest list.' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('site_messages')
      .insert({
        site_id: guest.siteId,
        thread,
        guest_id: guest.guestRowId,
        sender: 'guest',
        person_id: guest.personId,
        author_name: guest.name,
        body,
      })
      .select('id, thread, guest_id, sender, author_name, body, created_at')
      .single();
    if (error) {
      console.error('[messages] insert failed:', error);
      return NextResponse.json({ error: 'Could not send — try again?' }, { status: 500 });
    }

    // DMs ping the host through the notification bell (existing
    // prefs routing). Fire-and-forget.
    if (thread === 'dm') {
      void (async () => {
        try {
          const { data: site } = await supabase
            .from('sites')
            .select('id, subdomain, creator_email, site_config')
            .eq('id', guest.siteId)
            .maybeSingle();
          if (!site) return;
          const cfg = (site as { site_config?: { creator_email?: string; names?: [string, string] } }).site_config;
          const ownerEmail = String((site as { creator_email?: string }).creator_email ?? cfg?.creator_email ?? '');
          if (!ownerEmail) return;
          const names = (cfg?.names ?? []).filter(Boolean);
          const { notifyHost } = await import('@/lib/notifications/notify');
          await notifyHost(supabase, {
            siteId: String(site.id),
            siteLabel: names.length >= 2 ? `${names[0]} & ${names[1]}` : String((site as { subdomain?: string }).subdomain ?? ''),
            ownerEmail,
            category: 'replies',
            title: `${guest.name} sent you a message`,
            body: body.slice(0, 200),
            href: '/dashboard/messages',
            dedupeKey: `dm:${(data as { id?: string })?.id}`,
          });
        } catch (err) {
          console.warn('[messages] host notify failed (non-fatal):', err);
        }
      })();
    }

    return NextResponse.json({ ok: true, message: shape(data as MessageRow) });
  } catch (err) {
    console.error('[messages] POST failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
