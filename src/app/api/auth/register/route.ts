// ─────────────────────────────────────────────────────────────
// POST /api/auth/register — create a manual (email + password)
// account. Body: { email, password, name? }.
//
// Writes public.account_credentials (scrypt hash via
// lib/password.ts). The caller follows up with
// signIn('credentials') — registration itself never mints a
// session. Rate-limited per IP; duplicate emails return a clear
// 409 (registration is the one place where confirming an
// account exists is the correct UX).
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { hashPassword, passwordProblem } from '@/lib/password';
import { normalizePersonEmail } from '@/lib/people';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`register:${ip}`, { max: 5, windowMs: 900_000 });
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Too many attempts — try again in a few minutes.' }, { status: 429 });
    }

    let body: { email?: string; password?: string; name?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }

    const email = normalizePersonEmail(body.email);
    if (!email) {
      return NextResponse.json({ error: 'That doesn’t look like an email address.' }, { status: 400 });
    }
    const problem = passwordProblem(body.password ?? '');
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: 'Sign-up is not configured on this deployment.' }, { status: 503 });
    }

    const name = (body.name ?? '').trim().slice(0, 80) || null;
    const { error } = await supabase.from('account_credentials').insert({
      email,
      password_hash: hashPassword(body.password!),
      display_name: name,
    });
    if (error) {
      // 23505 = unique violation — the account already exists.
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'An account with this email already exists — try signing in instead.' },
          { status: 409 },
        );
      }
      console.error('[auth/register] insert failed:', error);
      return NextResponse.json({ error: 'Could not create the account. Try again?' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[auth/register] failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
