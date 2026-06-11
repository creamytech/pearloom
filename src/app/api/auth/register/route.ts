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
import { createHash, randomBytes } from 'crypto';
import { Resend } from 'resend';
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
    /* Email verification — non-blocking. The raw token rides the
       email; only its SHA-256 lands in the row. /verify/<token>
       stamps email_verified_at. Sign-in works either way. */
    const verifyToken = randomBytes(32).toString('hex');
    const { error } = await supabase.from('account_credentials').insert({
      email,
      password_hash: hashPassword(body.password!),
      display_name: name,
      verify_token_hash: createHash('sha256').update(verifyToken).digest('hex'),
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

    // Fire-and-forget verification email — registration never
    // waits on (or fails with) the mailer.
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pearloom.com';
      const verifyUrl = `${baseUrl}/verify/${verifyToken}`;
      const firstName = (name ?? '').split(/\s+/)[0] || 'there';
      new Resend(resendKey).emails.send({
        from: process.env.EMAIL_FROM || 'noreply@pearloom.com',
        to: email,
        subject: 'Confirm your Pearloom email',
        html: `
          <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #0E0D0B; background: #F5EFE2;">
            <p style="font-size: 11px; letter-spacing: 0.24em; text-transform: uppercase; color: #5C6B3F; margin: 0 0 16px;">Pearloom</p>
            <h1 style="font-style: italic; font-weight: 500; font-size: 26px; margin: 0 0 14px;">One small knot, ${firstName}.</h1>
            <p style="font-size: 14px; line-height: 1.6; color: #3A332C; margin: 0 0 22px;">
              Confirm this is your email and your account is tied off properly.
              Nothing is blocked in the meantime — this just makes recovery
              and guest features work without a hitch.
            </p>
            <p style="margin: 0 0 26px;">
              <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background: #0E0D0B; color: #F5EFE2; text-decoration: none; border-radius: 100px; font-size: 14px; font-weight: 600;">Confirm my email</a>
            </p>
            <p style="font-size: 11px; color: #6F6557; margin: 0;">Sent with care · Made with Pearloom</p>
          </div>
        `,
      }).catch((e: unknown) => console.warn('[auth/register] verify email failed (non-fatal):', e));
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[auth/register] failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
