// ─────────────────────────────────────────────────────────────
// Pearloom / lib/email/welcome.ts
//
// Send the welcome email exactly once per account. NextAuth runs
// JWT-only (no adapter), so there's no isNewUser signal — the
// dedupe ledger is public.welcome_emails (email PK): the first
// successful insert wins the send, every later sign-in no-ops.
//
// Fire-and-forget posture: every failure path returns quietly.
// A welcome email must never block or break a sign-in.
// ─────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';
import { buildWelcomeEmail } from '@/lib/email/brand-emails';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Send the welcome email at most once per account.
 *
 * RETURNS TRUE when this call claimed the ledger — i.e. this is the
 * account's first sign-in ever. That claim is the only reliable
 * new-account signal in the app: the JWT strategy gives NextAuth no
 * `isNewUser`, and Google OAuth accounts never touch the register
 * route, so a fire point there would miss every OAuth signup. The
 * caller uses this to record `signed_up` (see lib/auth events).
 */
export async function sendWelcomeEmailOnce(email: string, name?: string | null): Promise<boolean> {
  try {
    const resendKey = process.env.RESEND_API_KEY;
    const sb = getSupabase();
    if (!sb) return false; // no ledger → can't dedupe → don't risk repeats

    const normalized = email.toLowerCase().trim();
    if (!normalized) return false;

    /* ignoreDuplicates + select(): an actual insert returns the row,
       a deduped (already-welcomed) upsert returns []. */
    const { data, error } = await sb
      .from('welcome_emails')
      .upsert({ email: normalized }, { onConflict: 'email', ignoreDuplicates: true })
      .select('email');
    if (error || !data || data.length === 0) return false;

    /* The ledger is claimed, so the caller can record the signup
       from here on — including in the no-mailer branch below.
       Telemetry must not depend on RESEND_API_KEY being set. */
    if (!resendKey) return true; // ledger claimed, no key — dev mode

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pearloom.com';
    const fromEmail = process.env.EMAIL_FROM || 'Pearloom <noreply@pearloom.com>';
    const { subject, html } = buildWelcomeEmail({ name, dashboardUrl: `${baseUrl}/dashboard` });

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: fromEmail, to: [normalized], subject, html }),
    });
    return true;
  } catch (err) {
    console.warn('[welcome-email] send failed (non-fatal):', err);
    // A mailer failure is not evidence about whether the account is
    // new, and claiming it was would double-count on the next
    // sign-in. Stay silent.
    return false;
  }
}
