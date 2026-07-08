// ─────────────────────────────────────────────────────────────
// Pearloom / api/threads — person-pair threads (SOCIAL-PLAN S2).
//
// The second (and last) social object next to the Circle: a
// bounded 1:1 conversation between two MUTUAL CONNECTIONS,
// persisting between celebrations. No feed, no discovery, no
// strangers — every operation re-verifies the accepted friendship
// server-side (lib/threads.ts).
//
//   GET                       → { threads[] } (first names, last note)
//   GET ?with=<personId>      → { messages[] } for that pair
//   POST { otherPersonId, body }            — send a note
//   POST { action:'hide', messageId }       — retract your own note
//
// Session-authed; the caller resolves to their people-graph id via
// resolvePersonId (the same closing-the-gap move as /api/friends).
// Delivery is polling from the circle card (the BroadcastBar
// cadence); Realtime pings are the named upgrade path.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { resolvePersonId } from '@/lib/people';
import { listThreads, listMessages, sendMessage, hideOwnMessage } from '@/lib/threads';

export const dynamic = 'force-dynamic';

function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function caller(sb: SupabaseClient): Promise<string | null> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase().trim();
  if (!email) return null;
  return resolvePersonId(sb, { email, name: session?.user?.name ?? undefined });
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  if (!checkRateLimit(`threads:r:${ip}`, { max: 120, windowMs: 60_000 }).allowed) {
    return NextResponse.json({ ok: false, error: 'Too many requests' }, { status: 429 });
  }
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ ok: true, available: false, threads: [], messages: [] });
  const personId = await caller(sb);
  if (!personId) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const withId = req.nextUrl.searchParams.get('with');
  if (withId) {
    const messages = await listMessages(sb, { personId, otherId: withId });
    return NextResponse.json({ ok: true, available: true, messages });
  }
  const threads = await listThreads(sb, personId);
  return NextResponse.json({ ok: true, available: true, threads });
}

interface PostBody {
  action?: 'send' | 'hide';
  otherPersonId?: string;
  body?: string;
  messageId?: string;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!checkRateLimit(`threads:w:${ip}`, { max: 30, windowMs: 5 * 60_000 }).allowed) {
    return NextResponse.json({ ok: false, error: 'Too many requests' }, { status: 429 });
  }
  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ ok: false, error: 'Not configured' }, { status: 503 });
  const personId = await caller(sb);
  if (!personId) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  if (body.action === 'hide') {
    const ok = await hideOwnMessage(sb, { personId, messageId: String(body.messageId ?? '') });
    return ok
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ ok: false, error: 'Could not retract' }, { status: 400 });
  }

  const otherId = typeof body.otherPersonId === 'string' ? body.otherPersonId : '';
  const text = typeof body.body === 'string' ? body.body : '';
  const result = await sendMessage(sb, { personId, otherId, body: text });
  if (!result.ok) {
    const status = result.error === 'not_connected' ? 403 : result.error === 'empty' ? 400 : 500;
    const msg = result.error === 'not_connected'
      ? 'You can only write to people in your circle.'
      : result.error === 'empty' ? 'Write something first.' : 'Could not send — try again.';
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
