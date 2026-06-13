// ─────────────────────────────────────────────────────────────
// Pearloom / api/newsletter/subscribe/route.ts
//
// Marketing newsletter signup from the footer form. Validates
// the email, rate-limits per IP, and upserts into Supabase
// (public.newsletter_subscribers). Quietly succeeds on duplicate
// signups so we don't leak membership state to scrapers.
//
// If Supabase isn't configured on this deploy, the route still
// returns 200 and logs the email server-side — the frontend
// always gets a consistent "you're on the list" state, and ops
// can pull the log later.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;

// RFC-5322-light: good enough for signup forms, strict enough to
// filter obvious garbage. We intentionally allow things like +
// tagging since that's how we expect partners to track sources.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface SubscribePayload {
  email?: string;
  source?: string;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`newsletter:${ip}`, { max: 5, windowMs: 10 * 60 * 1000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: 'Too many signups — try again in a few minutes.' },
      { status: 429 },
    );
  }

  let body: SubscribePayload = {};
  try {
    body = (await req.json()) as SubscribePayload;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const email = (body.email ?? '').trim();
  if (!email || !EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json(
      { ok: false, error: 'Please enter a valid email address.' },
      { status: 400 },
    );
  }
  const source = typeof body.source === 'string' ? body.source.slice(0, 64) : 'marketing_footer';

  // Hash UA + truncate IP to /24 so we get an anti-abuse signal
  // without storing a full fingerprint against the email.
  const ua = req.headers.get('user-agent') ?? '';
  const uaHash = await sha256(ua).catch(() => null);
  const ipPrefix = ip.includes('.') ? ip.split('.').slice(0, 3).join('.') + '.0' : null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    // Supabase not wired — log the signup so ops can scrape it and
    // return success to the frontend so the UX still resolves.
    console.log('[newsletter] signup (no-db):', { email, source, ipPrefix });
    return NextResponse.json({ ok: true, stored: false });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { error } = await supabase
    .from('newsletter_subscribers')
    .insert({
      email,
      source,
      ip_prefix: ipPrefix,
      ua_hash: uaHash,
    });

  if (error) {
    // Duplicate email hits the unique index on email_lower — treat
    // as success so we don't leak membership state and so the user
    // doesn't get error-shaming for signing up twice.
    const msg = error.message?.toLowerCase() ?? '';
    if (error.code === '23505' || msg.includes('duplicate') || msg.includes('unique')) {
      return NextResponse.json({ ok: true, stored: true, alreadySubscribed: true });
    }
    console.error('[newsletter] insert failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Couldn\u2019t save your email. Try again.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, stored: true });
}

async function sha256(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
