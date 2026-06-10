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

export async function sendWelcomeEmailOnce(email: string, name?: string | null): Promise<void> {
  try {
    const resendKey = process.env.RESEND_API_KEY;
    const sb = getSupabase();
    if (!sb) return; // no ledger → can't dedupe → don't risk repeats

    const normalized = email.toLowerCase().trim();
    if (!normalized) return;

    /* ignoreDuplicates + select(): an actual insert returns the row,
       a deduped (already-welcomed) upsert returns []. */
    const { data, error } = await sb
      .from('welcome_emails')
      .upsert({ email: normalized }, { onConflict: 'email', ignoreDuplicates: true })
      .select('email');
    if (error || !data || data.length === 0) return;

    if (!resendKey) return; // ledger claimed, no key — dev mode

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pearloom.com';
    const fromEmail = process.env.EMAIL_FROM || 'Pearloom <noreply@pearloom.com>';
    const { subject, html } = buildWelcomeEmail({ name, dashboardUrl: `${baseUrl}/dashboard` });

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: fromEmail, to: [normalized], subject, html }),
    });
  } catch (err) {
    console.warn('[welcome-email] send failed (non-fatal):', err);
  }
}
