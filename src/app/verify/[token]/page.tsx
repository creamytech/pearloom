// ─────────────────────────────────────────────────────────────
// /verify/[token] — confirm a manual account's email. Server
// component: looks up the token's SHA-256, stamps
// email_verified_at, burns the token, renders the result.
// Non-blocking verification — sign-in never depended on it.
// ─────────────────────────────────────────────────────────────

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

export const metadata: Metadata = {
  title: 'Confirm your email · Pearloom',
};
export const dynamic = 'force-dynamic';

async function confirm(token: string): Promise<'ok' | 'stale' | 'unavailable'> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return 'unavailable';
  try {
    const supabase = createClient(url, key);
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const { data: row } = await supabase
      .from('account_credentials')
      .select('email')
      .eq('verify_token_hash', tokenHash)
      .maybeSingle();
    if (!row) return 'stale';
    await supabase
      .from('account_credentials')
      .update({ email_verified_at: new Date().toISOString(), verify_token_hash: null })
      .eq('email', row.email);
    return 'ok';
  } catch (err) {
    console.error('[verify] failed:', err);
    return 'unavailable';
  }
}

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!/^[0-9a-f]{64}$/.test(token)) notFound();
  const result = await confirm(token);

  const copy = result === 'ok'
    ? { title: 'Tied off.', body: 'Your email is confirmed — the account is fully yours. Carry on weaving.' }
    : result === 'stale'
      ? { title: 'Already done (or expired).', body: 'This link was used already, or the account was confirmed another way. Nothing more to do.' }
      : { title: 'A snag.', body: 'We couldn’t confirm just now. Try the link again in a moment.' };

  return (
    <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: 'var(--pl-cream, #F5EFE2)', color: 'var(--pl-ink, #0E0D0B)', padding: 24, fontFamily: 'var(--pl-font-body, system-ui, sans-serif)' }}>
      <div style={{ maxWidth: 420, textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)', fontSize: '0.6rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--pl-olive, #5C6B3F)', margin: '0 0 14px' }}>
          Pearloom
        </p>
        <h1 style={{ fontFamily: 'var(--pl-font-display, "Fraunces", Georgia, serif)', fontStyle: 'italic', fontWeight: 500, fontSize: 'clamp(1.8rem, 5vw, 2.6rem)', margin: '0 0 12px' }}>
          {copy.title}
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--pl-ink-soft, #3A332C)', lineHeight: 1.6, margin: '0 0 24px' }}>
          {copy.body}
        </p>
        <Link
          href="/login"
          style={{ display: 'inline-block', padding: '12px 24px', borderRadius: 999, background: 'var(--pl-ink, #0E0D0B)', color: 'var(--pl-cream, #F5EFE2)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600 }}
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
