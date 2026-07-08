// ─────────────────────────────────────────────────────────────
// Pearloom / api/friends/route.ts — the HOST-side friend circle
// (GRAND-PLAN Phase 4). The account-holder counterpart to the
// guest-passport /api/guest/friends: a signed-in user manages the
// same first-names-only friend graph from the dashboard.
//
// Auth is the SESSION (not a passport token). The caller's identity
// in the people graph is resolved from their account email via
// resolvePersonId — closing the guest↔user gap (one person_id across
// both). Everything below is the same privacy contract as the guest
// API: mutual consent, opt-in (default off), first names only, no
// email / last name ever emitted.
//
//   GET  → { optedIn, friends[], incoming[], candidates[] }
//   POST { action:'opt-in', optIn }            — toggle discovery
//        { action:'request'|'accept'|'decline', otherPersonId, siteId? }
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { resolvePersonId, getConnectionsOptIn, setConnectionsOptIn } from '@/lib/people';
import {
  listFriends,
  pendingIncoming,
  pendingOutgoing,
  friendCandidates,
  requestFriend,
  respondFriend,
  isRequestable,
  inviteToCircle,
  normalizeInviteEmail,
  createCircleInvite,
} from '@/lib/friends';
import { isSmsConfigured, normalizePhone, sendSms } from '@/lib/sms';
import { getAppOrigin } from '@/lib/site-urls';

export const dynamic = 'force-dynamic';

function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Resolve the signed-in caller to their people-graph id (upserting a
 *  person row for their account email if needed — this is what closes
 *  the guest↔user gap). Returns null when unauthenticated / unresolvable. */
async function callerPerson(
  sb: SupabaseClient,
  session: { user?: { email?: string | null; name?: string | null } } | null,
): Promise<string | null> {
  const email = session?.user?.email?.toLowerCase().trim();
  if (!email) return null;
  return resolvePersonId(sb, { email, name: session?.user?.name ?? undefined });
}

/** Candidates the host could friend: mutual-opt-in familiar faces
 *  across every event where the host's OWN person appears as a guest
 *  (deduped). Discovery is gated on the caller being opted in, exactly
 *  like the guest API. Carries the siteId each was found through so a
 *  later `request` can re-verify requestability. */
async function hostCandidates(
  sb: SupabaseClient,
  personId: string,
): Promise<Array<{ firstName: string; personId: string; siteId: string }>> {
  try {
    // The sites where this person is a guest (their own attendance).
    const { data: mine } = await sb
      .from('guests')
      .select('site_id')
      .eq('person_id', personId)
      .limit(40);
    const siteIds = Array.from(new Set((mine ?? []).map((r) => String(r.site_id)))).slice(0, 20);
    const seen = new Set<string>();
    const out: Array<{ firstName: string; personId: string; siteId: string }> = [];
    for (const siteId of siteIds) {
      const faces = await friendCandidates(sb, { personId, siteId });
      for (const f of faces) {
        if (seen.has(f.personId)) continue;
        seen.add(f.personId);
        out.push({ firstName: f.firstName, personId: f.personId, siteId });
      }
    }
    return out;
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  if (!checkRateLimit(`friends:r:${ip}`, { max: 60, windowMs: 60_000 }).allowed) {
    return NextResponse.json({ ok: false, error: 'Too many requests' }, { status: 429 });
  }
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ ok: true, available: false, optedIn: false, friends: [], incoming: [], candidates: [] });

  const session = await getServerSession(authOptions);
  const personId = await callerPerson(sb, session);
  if (!personId) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const [optedIn, friends, incoming, outgoing] = await Promise.all([
    getConnectionsOptIn(sb, personId),
    listFriends(sb, personId),
    pendingIncoming(sb, personId),
    pendingOutgoing(sb, personId),
  ]);
  // Discovery only when opted in — mutual, like the guest API.
  const candidates = optedIn ? await hostCandidates(sb, personId) : [];

  // `me` = the caller's own opaque people-graph id — needed client-
  // side to derive the symmetric pair-thread ping channel (C.5).
  // It's the caller's own handle, never someone else's.
  return NextResponse.json({ ok: true, available: true, optedIn, me: personId, friends, incoming, outgoing, candidates });
}

interface PostBody {
  action?: 'opt-in' | 'request' | 'accept' | 'decline' | 'invite';
  otherPersonId?: string;
  siteId?: string;
  optIn?: boolean;
  /** invite action — the address the caller already knows.
   *  Exactly one of email/phone (GRAND-PLAN-2 C.2: text parity). */
  email?: string;
  phone?: string;
  name?: string;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!checkRateLimit(`friends:w:${ip}`, { max: 30, windowMs: 5 * 60_000 }).allowed) {
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

  const session = await getServerSession(authOptions);
  const personId = await callerPerson(sb, session);
  if (!personId) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  if (body.action === 'opt-in') {
    await setConnectionsOptIn(sb, personId, body.optIn === true);
    return NextResponse.json({ ok: true, optedIn: body.optIn === true });
  }

  if (body.action === 'invite') {
    /* SOCIAL-PLAN S1 — invite to your circle by email; GRAND-PLAN-2
       C.2 — or by TEXT. No shared event required. Tighter cap than
       other writes: each invite touches the people graph or sends
       an SMS, so it must not become an enumeration / spam vector.
       Consent is untouched — the invited person still has to accept
       (email: the pending request greets them on first sign-in via
       the email-keyed people row; text: the SMS carries a personal
       claim link that files the pending request when they sign up). */
    if (!checkRateLimit(`friends:i:${personId}`, { max: 10, windowMs: 60 * 60_000 }).allowed) {
      return NextResponse.json({ ok: false, error: 'Too many invites — try again in an hour' }, { status: 429 });
    }
    const name = typeof body.name === 'string' ? body.name.slice(0, 80) : undefined;

    // ── By text ─────────────────────────────────────────────
    if (typeof body.phone === 'string' && body.phone.trim()) {
      if (!isSmsConfigured()) {
        return NextResponse.json({ ok: false, error: 'Text invites aren’t set up yet — invite by email for now' }, { status: 503 });
      }
      const phone = normalizePhone(body.phone);
      if (!phone) return NextResponse.json({ ok: false, error: 'That number doesn’t look dialable' }, { status: 400 });
      const minted = await createCircleInvite(sb, { fromPersonId: personId, phone, name });
      if (!minted.ok || !minted.token) {
        return NextResponse.json({ ok: false, error: 'Could not create the invitation' }, { status: 500 });
      }
      const inviterFirst = (session?.user?.name ?? '').trim().split(/\s+/)[0] || 'A friend';
      const link = `${getAppOrigin()}/signup?circle=${encodeURIComponent(minted.token)}`;
      const first = name?.trim().split(/\s+/)[0];
      const text = `${first ? `${first}, ` : ''}${inviterFirst} wants to keep you in their circle on Pearloom — the people they celebrate with. Join them: ${link}`;
      const res = await sendSms({ to: phone, body: text });
      if (!res.ok) {
        console.warn('[friends] circle SMS send failed:', res.error);
        return NextResponse.json({ ok: false, error: 'The text didn’t go through — try email instead' }, { status: 502 });
      }
      return NextResponse.json({ ok: true, channel: 'sms' });
    }

    // ── By email (the original S1 path) ─────────────────────
    const email = normalizeInviteEmail(body.email);
    if (!email) return NextResponse.json({ ok: false, error: 'A valid email is required' }, { status: 400 });
    if (email === session?.user?.email?.toLowerCase().trim()) {
      return NextResponse.json({ ok: false, error: 'That’s your own address' }, { status: 400 });
    }
    const result = await inviteToCircle(sb, { fromPersonId: personId, email, name });
    if (!result.ok) {
      const msg = result.error === 'self' ? 'That’s your own address' : 'Could not send the invitation';
      return NextResponse.json({ ok: false, error: msg }, { status: result.error === 'self' ? 400 : 500 });
    }

    /* The invitation actually reaches their inbox (email audit
       2026-07-08) — before this, an email invite was silently
       filed and the person only discovered it on their next
       sign-in. Same one-tap claim link the SMS path carries;
       consent unchanged (they still accept). Fire-and-forget. */
    void (async () => {
      try {
        const resendKey = process.env.RESEND_API_KEY;
        if (!resendKey) return;
        const { isSuppressed } = await import('@/lib/email/suppression');
        if (await isSuppressed(sb, email)) return;
        const minted = await createCircleInvite(sb, { fromPersonId: personId, email, name });
        const inviterFirst = (session?.user?.name ?? '').trim().split(/\s+/)[0] || 'A friend';
        const link = minted.ok && minted.token
          ? `${getAppOrigin()}/signup?circle=${encodeURIComponent(minted.token)}`
          : `${getAppOrigin()}/signup`;
        const first = name?.trim().split(/\s+/)[0];
        const { emailLayout, button } = await import('@/lib/email-sequences');
        const escT = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const html = emailLayout(`
          <tr><td style="padding:44px 36px 0;text-align:center">
            <p style="font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 16px;opacity:0.75">Your circle awaits</p>
            <h1 style="font-size:30px;font-weight:400;font-style:italic;margin:0 0 14px;line-height:1.2">${escT(inviterFirst)} keeps you in their circle.</h1>
            ${first ? `<p style="font-size:14.5px;margin:0 0 10px">Dear <em>${escT(first)}</em>,</p>` : ''}
            <p style="font-size:15px;line-height:1.7;margin:0">
              On Pearloom, a circle is the people you celebrate with —
              the ones who show up. ${escT(inviterFirst)} added you to
              theirs. One tap and you're woven in.
            </p>
          </td></tr>
          <tr><td style="padding:24px 36px 44px;text-align:center">
            ${button('Join their circle', link)}
          </td></tr>
        `);
        const { listUnsubHeaders, htmlToText } = await import('@/lib/email/deliverability');
        const fromEmail = process.env.EMAIL_FROM || 'Pearloom <noreply@pearloom.com>';
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: fromEmail,
            to: [email],
            subject: `${inviterFirst} wants you in their circle`,
            html,
            text: htmlToText(html),
            headers: listUnsubHeaders({ email, channel: 'circle' }),
          }),
        }).catch((e) => console.warn('[friends] circle invite email failed (non-fatal):', e));
      } catch (err) {
        console.warn('[friends] circle invite email failed (non-fatal):', err);
      }
    })();

    return NextResponse.json({ ok: true, status: result.status, channel: 'email' });
  }

  const other = typeof body.otherPersonId === 'string' ? body.otherPersonId : '';
  if (!other || other === personId) {
    return NextResponse.json({ ok: false, error: 'otherPersonId required' }, { status: 400 });
  }

  if (body.action === 'request') {
    // A request may only go to a current mutual-opt-in familiar face —
    // re-verified server-side against the site the candidate came from.
    const siteId = typeof body.siteId === 'string' ? body.siteId : '';
    const ok = siteId && (await isRequestable(sb, { personId, siteId, otherPersonId: other }));
    if (!ok) return NextResponse.json({ ok: false, error: 'Not connectable' }, { status: 403 });
    const status = await requestFriend(sb, { fromPersonId: personId, toPersonId: other });
    return NextResponse.json({ ok: true, status });
  }

  if (body.action === 'accept' || body.action === 'decline') {
    const status = await respondFriend(sb, {
      personId,
      otherPersonId: other,
      accept: body.action === 'accept',
    });
    return NextResponse.json({ ok: true, status });
  }

  return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
}
