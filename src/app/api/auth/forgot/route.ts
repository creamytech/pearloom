// ─────────────────────────────────────────────────────────────
// POST /api/auth/forgot — start a password reset. Body: { email }.
//
// Always answers { ok: true } so the endpoint never confirms
// which emails have accounts. When one exists, a single-use
// token is minted (raw token emailed; only its SHA-256 lands in
// the database), valid for one hour. The email goes out through
// Resend like every other Pearloom lifecycle message.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash, randomBytes } from 'crypto';
import { Resend } from 'resend';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
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
    const rate = checkRateLimit(`forgot:${ip}`, { max: 4, windowMs: 900_000 });
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Too many attempts. Try again in a few minutes.' }, { status: 429 });
    }

    let body: { email?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }
    const email = normalizePersonEmail(body.email);
    if (!email) {
      return NextResponse.json({ error: 'That doesn’t look like an email address.' }, { status: 400 });
    }

    const supabase = getSupabase();
    const resendKey = process.env.RESEND_API_KEY;
    if (!supabase || !resendKey) return NextResponse.json({ ok: true }); // quietly no-op

    const { data: row } = await supabase
      .from('account_credentials')
      .select('email, display_name')
      .eq('email', email)
      .maybeSingle();
    if (!row) return NextResponse.json({ ok: true }); // same answer either way

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const { error } = await supabase
      .from('account_credentials')
      .update({
        reset_token_hash: tokenHash,
        reset_expires_at: new Date(Date.now() + 3600_000).toISOString(),
      })
      .eq('email', email);
    if (error) {
      console.error('[auth/forgot] token store failed:', error);
      return NextResponse.json({ ok: true });
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pearloom.com';
    const resetUrl = `${baseUrl}/reset/${token}`;
    const fromEmail = process.env.EMAIL_FROM || 'noreply@pearloom.com';

    const { buildPasswordResetEmail } = await import('@/lib/email/brand-emails');
    const { subject, html } = buildPasswordResetEmail({ resetUrl });
    const resend = new Resend(resendKey);
    await resend.emails.send({ from: fromEmail, to: email, subject, html });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[auth/forgot] failed:', err);
    return NextResponse.json({ ok: true }); // never leak via errors
  }
}
