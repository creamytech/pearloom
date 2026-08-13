// ─────────────────────────────────────────────────────────────
// Pearloom / api/rsvp/plus-one/route.ts
//
// POST /api/rsvp/plus-one
// Body: { siteSlug, hostGuestName, plusOneName, email? }
//
// After a guest RSVPs yes with a +1, the form calls this to mint
// a separate guest row for the +1 with its own opaque passport_token.
// The response contains the passport URL the inviter can share so
// their +1 lands on the site already greeted by name.
//
// Public — the inviter has already proven they're on the list by
// finding their own name in the RSVP form.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function mintToken() {
  return randomBytes(18).toString('base64url');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const siteSlug = String(body.siteSlug ?? '').trim();
    const hostGuestName = String(body.hostGuestName ?? '').trim();
    const plusOneName = String(body.plusOneName ?? '').trim();
    const email = typeof body.email === 'string' ? body.email.trim() : '';

    if (!siteSlug || !plusOneName) {
      return NextResponse.json({ error: 'siteSlug + plusOneName required' }, { status: 400 });
    }

    const sb = getSupabase();
    if (!sb) {
      // Fallback: still return a token so the URL works for /sites/<slug>?token=…
      // even though we couldn't persist it. Better than blocking the user.
      const fallbackToken = mintToken();
      return NextResponse.json({
        ok: true,
        stored: false,
        token: fallbackToken,
        url: buildPassportUrl(req, siteSlug, fallbackToken),
      });
    }

    // Resolve site row.
    const { data: site } = await sb
      .from('sites')
      .select('id')
      .eq('subdomain', siteSlug)
      .maybeSingle();
    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    // Don't mint a duplicate passport for the same name on the same
    // site — the inviter may have hit the button twice. If a row
    // already exists, return its token.
    const { data: existing } = await sb
      .from('guests')
      .select('id, passport_token')
      .eq('site_id', site.id)
      .eq('name', plusOneName)
      .maybeSingle();

    let token = existing?.passport_token as string | undefined;
    if (!token) token = mintToken();

    if (existing) {
      // Patch token if it was missing, leave the rest untouched.
      if (!existing.passport_token) {
        await sb.from('guests').update({ passport_token: token }).eq('id', existing.id);
      }
    } else {
      await sb.from('guests').insert({
        site_id: site.id,
        name: plusOneName,
        email: email || null,
        passport_token: token,
        plus_one: true,
        // The "host_guest_name" is the inviter — we capture it as a
        // convenience note since the schema has no explicit FK.
        message: hostGuestName ? `Plus-one of ${hostGuestName}` : null,
        created_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      ok: true,
      stored: true,
      token,
      url: buildPassportUrl(req, siteSlug, token),
    });
  } catch (err) {
    console.error('[rsvp/plus-one] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function buildPassportUrl(req: NextRequest, siteSlug: string, token: string) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
  return `${origin.replace(/\/$/, '')}/sites/${encodeURIComponent(siteSlug)}?token=${token}`;
}
