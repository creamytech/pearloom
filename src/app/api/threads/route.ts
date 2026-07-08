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
import { listThreads, listMessages, sendMessage, hideOwnMessage, listCrews, listCrewMessages, sendCrewMessage, createCrewThread } from '@/lib/threads';

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
  /* Crew threads (C.6) — membership-gated in the lib. */
  const crewId = req.nextUrl.searchParams.get('crew');
  if (crewId) {
    const messages = await listCrewMessages(sb, { threadId: crewId, personId });
    return NextResponse.json({ ok: true, available: true, messages });
  }
  const [threads, crews] = await Promise.all([
    listThreads(sb, personId),
    listCrews(sb, personId),
  ]);
  return NextResponse.json({ ok: true, available: true, me: personId, threads, crews });
}

interface PostBody {
  action?: 'send' | 'hide' | 'create-crew';
  otherPersonId?: string;
  body?: string;
  messageId?: string;
  /** Crew threads (C.6). */
  crewThreadId?: string;
  title?: string;
  memberPersonIds?: string[];
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

  /* Start a crew (C.6) — members must be the creator's accepted
     friends; the lib re-verifies every one server-side. */
  if (body.action === 'create-crew') {
    const result = await createCrewThread(sb, {
      creatorId: personId,
      title: String(body.title ?? ''),
      memberIds: Array.isArray(body.memberPersonIds) ? body.memberPersonIds.map(String) : [],
    });
    if (!result.ok) {
      const msg = result.error === 'title' ? 'Give the crew a name.'
        : result.error === 'members' ? 'Pick at least one friend.'
        : result.error === 'too_many' ? 'Crews cap at 16 people.'
        : result.error === 'not_connected' ? 'Everyone in a crew has to be in your circle first.'
        : 'Could not start the crew — try again.';
      const status = result.error === 'not_connected' ? 403
        : result.error === 'title' || result.error === 'members' || result.error === 'too_many' ? 400 : 500;
      return NextResponse.json({ ok: false, error: msg }, { status });
    }
    return NextResponse.json({ ok: true, crewId: result.crewId }, { status: 201 });
  }

  /* Send into a crew (C.6). */
  if (typeof body.crewThreadId === 'string' && body.crewThreadId) {
    const result = await sendCrewMessage(sb, {
      threadId: body.crewThreadId,
      personId,
      body: typeof body.body === 'string' ? body.body : '',
    });
    if (!result.ok) {
      const status = result.error === 'not_member' ? 403 : result.error === 'empty' ? 400 : 500;
      const msg = result.error === 'not_member' ? 'You’re not in that crew.'
        : result.error === 'empty' ? 'Write something first.' : 'Could not send — try again.';
      return NextResponse.json({ ok: false, error: msg }, { status });
    }
    return NextResponse.json({ ok: true }, { status: 201 });
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
