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
      return NextResponse.json({ error: 'Too many attempts — try again in a few minutes.' }, { status: 429 });
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
    const firstName = ((row.display_name as string | null) ?? '').trim().split(/\s+/)[0] || 'there';
    const fromEmail = process.env.EMAIL_FROM || 'noreply@pearloom.com';

    const resend = new Resend(resendKey);
    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: 'Reset your Pearloom password',
      html: `
        <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #0E0D0B; background: #F5EFE2;">
          <p style="font-size: 11px; letter-spacing: 0.24em; text-transform: uppercase; color: #5C6B3F; margin: 0 0 16px;">Pearloom</p>
          <h1 style="font-style: italic; font-weight: 500; font-size: 26px; margin: 0 0 14px;">A fresh thread, ${firstName}.</h1>
          <p style="font-size: 14px; line-height: 1.6; color: #3A332C; margin: 0 0 22px;">
            Someone asked to reset the password for this account. If that was you,
            the link below works once and expires in an hour. If it wasn't, ignore
            this and nothing changes.
          </p>
          <p style="margin: 0 0 26px;">
            <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #0E0D0B; color: #F5EFE2; text-decoration: none; border-radius: 100px; font-size: 14px; font-weight: 600;">Choose a new password</a>
          </p>
          <p style="font-size: 11px; color: #6F6557; margin: 0;">Sent with care · Made with Pearloom</p>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[auth/forgot] failed:', err);
    return NextResponse.json({ ok: true }); // never leak via errors
  }
}
