// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/address-book/route.ts
//
// POST — public write from the /a/{siteSlug} "Share your
// address" page. A guest submits their own mailing address;
// we match them to an existing guest row (case-insensitive
// email first, then exact-insensitive name) and update the
// mailing columns, or insert a fresh guest row when nobody
// matches. These are the same columns the print-mail checkout
// reads (mailing_address_line1/2, city, state, postal_code,
// country), so a collected address is immediately mailable.
//
// Conventions follow /api/rsvp: rate limit per IP, site
// existence check, no auth, warm error copy, graceful
// { ok: true, stored: false } when Supabase is unconfigured.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/** 10 submissions per 5 minutes per IP. */
const ADDRESS_RATE = { max: 10, windowMs: 5 * 60 * 1000 };

/** Field length ceiling — generous for real addresses, hostile to abuse. */
const MAX_LEN = 200;

const clean = (v: unknown): string =>
  typeof v === 'string' ? v.trim().slice(0, MAX_LEN) : '';

/** Escape ilike pattern chars so guest input is matched literally. */
const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

interface GuestMatchRow {
  id: string;
  name: string | null;
  email: string | null;
  mailing_address_line1: string | null;
  mailing_address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
}

const MATCH_COLUMNS =
  'id, name, email, mailing_address_line1, mailing_address_line2, city, state, postal_code, country';

export async function POST(req: NextRequest) {
  // Rate limit by IP — same posture as /api/rsvp.
  const ip = getClientIp(req);
  const rateCheck = checkRateLimit(`address-book:${ip}`, ADDRESS_RATE);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { ok: false, error: 'Too many submissions. Please wait a moment and try again.' },
      { status: 429 },
    );
  }

  // Parse body — invalid JSON is a 400, not a 500.
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'We couldn’t read that submission. Please try again.' },
      { status: 400 },
    );
  }

  const siteSlug = clean(body.siteSlug);
  const name = clean(body.name);
  const email = clean(body.email);
  const line1 = clean(body.line1);
  const line2 = clean(body.line2);
  const city = clean(body.city);
  const state = clean(body.state);
  const zip = clean(body.zip);
  const country = clean(body.country) || 'United States';

  // ── Validate early, warmly ──
  if (!siteSlug) {
    return NextResponse.json(
      { ok: false, error: 'This link isn’t pointing anywhere. Ask your hosts for a fresh one.' },
      { status: 400 },
    );
  }
  if (!name) {
    return NextResponse.json(
      { ok: false, error: 'We need a name for the envelope.' },
      { status: 400 },
    );
  }
  if (!line1 || !city || !state || !zip) {
    return NextResponse.json(
      { ok: false, error: 'Almost there: street, city, state, and ZIP are all needed for the envelope.' },
      { status: 400 },
    );
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { ok: false, error: 'That email doesn’t look quite right. It’s optional, feel free to leave it blank.' },
      { status: 400 },
    );
  }

  // ── Graceful degrade when Supabase isn't configured ──
  const supabase = getSupabase();
  if (!supabase) {
    console.warn('[address-book] Supabase not configured — address not stored');
    return NextResponse.json({ ok: true, stored: false });
  }

  try {
    // ── Resolve the site by subdomain (fail-soft 404) ──
    const { data: siteRow } = await supabase
      .from('sites')
      .select('id')
      .eq('subdomain', siteSlug)
      .maybeSingle();
    if (!siteRow) {
      return NextResponse.json(
        { ok: false, error: 'This link isn’t tied to a celebration yet. Ask your hosts for a fresh one.' },
        { status: 404 },
      );
    }
    const siteId = siteRow.id as string;
    const now = new Date().toISOString();

    // ── Match an existing guest ──
    // Case-insensitive email match first (strongest signal), then
    // exact-insensitive name match. ilike with escaped input is a
    // case-insensitive equality check — no wildcards survive.
    let match: GuestMatchRow | null = null;
    if (email) {
      const { data } = await supabase
        .from('guests')
        .select(MATCH_COLUMNS)
        .eq('site_id', siteId)
        .ilike('email', escapeLike(email))
        .limit(1);
      match = (data?.[0] as GuestMatchRow | undefined) ?? null;
    }
    if (!match) {
      const { data } = await supabase
        .from('guests')
        .select(MATCH_COLUMNS)
        .eq('site_id', siteId)
        .ilike('name', escapeLike(name))
        .limit(1);
      match = (data?.[0] as GuestMatchRow | undefined) ?? null;
    }

    const addressFields = {
      mailing_address_line1: line1,
      mailing_address_line2: line2 || null,
      city,
      state,
      postal_code: zip,
      country,
      address_collected_at: now,
    };

    if (match) {
      // The guest is the authority on their own address — a differing
      // submission still wins, but we log the overwrite so a host
      // support thread can reconstruct what changed.
      if (match.mailing_address_line1 && match.mailing_address_line1 !== line1) {
        console.warn('[address-book] guest replaced an existing address:', {
          guestId: match.id,
          siteId,
          previousLine1: match.mailing_address_line1,
          newLine1: line1,
        });
      }

      const { error: updateError } = await supabase
        .from('guests')
        .update({
          ...addressFields,
          // Backfill an email onto a matched-by-name row, never
          // overwrite one the host already has on file.
          ...(email && !match.email ? { email } : {}),
          updated_at: now,
        })
        .eq('id', match.id);

      if (updateError) {
        console.error('[address-book] update failed:', updateError);
        return NextResponse.json(
          { ok: false, error: 'We couldn’t set your address just now. Try again in a moment.' },
          { status: 500 },
        );
      }
      return NextResponse.json({ ok: true });
    }

    // ── No match — insert a fresh guest row ──
    // Mirrors /api/guests POST's insert shape; status/preset columns
    // take their schema defaults ('pending' / {}).
    const { error: insertError } = await supabase.from('guests').insert({
      site_id: siteId,
      name,
      email: email || null,
      status: 'pending',
      ...addressFields,
      created_at: now,
    });

    if (insertError) {
      // 23505 = unique violation on (site_id, lower(email)) — a row
      // with this email appeared between our match check and the
      // insert. Resolve the race by updating that row instead.
      if (insertError.code === '23505' && email) {
        const { error: retryError } = await supabase
          .from('guests')
          .update({ ...addressFields, updated_at: now })
          .eq('site_id', siteId)
          .ilike('email', escapeLike(email));
        if (!retryError) return NextResponse.json({ ok: true });
        console.error('[address-book] race-retry update failed:', retryError);
      } else {
        console.error('[address-book] insert failed:', insertError);
      }
      return NextResponse.json(
        { ok: false, error: 'We couldn’t set your address just now. Try again in a moment.' },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[address-book] error:', err);
    return NextResponse.json(
      { ok: false, error: 'We couldn’t set your address just now. Try again in a moment.' },
      { status: 500 },
    );
  }
}
