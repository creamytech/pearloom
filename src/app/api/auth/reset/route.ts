// ─────────────────────────────────────────────────────────────
// POST /api/auth/reset — finish a password reset.
// Body: { token, password }. The token is the raw value from the
// emailed link; we look up its SHA-256, check expiry, write the
// new scrypt hash, and burn the token. Single use.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { hashPassword, passwordProblem } from '@/lib/password';

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
    const rate = checkRateLimit(`reset:${ip}`, { max: 6, windowMs: 900_000 });
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Too many attempts. Try again in a few minutes.' }, { status: 429 });
    }

    let body: { token?: string; password?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }
    const token = (body.token ?? '').trim();
    if (!/^[0-9a-f]{64}$/.test(token)) {
      return NextResponse.json({ error: 'This reset link isn’t valid.' }, { status: 400 });
    }
    const problem = passwordProblem(body.password ?? '');
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });

    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ error: 'Not configured.' }, { status: 503 });

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const { data: row } = await supabase
      .from('account_credentials')
      .select('email, reset_expires_at')
      .eq('reset_token_hash', tokenHash)
      .maybeSingle();
    if (!row || !row.reset_expires_at || new Date(String(row.reset_expires_at)).getTime() < Date.now()) {
      return NextResponse.json(
        { error: 'This reset link has expired or was already used. Request a fresh one.' },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from('account_credentials')
      .update({
        password_hash: hashPassword(body.password!),
        reset_token_hash: null,
        reset_expires_at: null,
      })
      .eq('email', row.email);
    if (error) {
      console.error('[auth/reset] update failed:', error);
      return NextResponse.json({ error: 'Could not save the new password. Try again?' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[auth/reset] failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
