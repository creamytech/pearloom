// ─────────────────────────────────────────────────────────────
// Pearloom / app/i/[token]/page.tsx — LEGACY REDIRECT.
//
// Retired in ATELIER-PLAN INV.2: the /i/ invite world was a
// SECOND, hardcoded-cream arrival that never wore the couple's
// theme. New invite emails link straight to the published site
// with the guest's ?g= passport token, where the site-themed
// Sealed Arrival addresses them by name. This route survives
// only so already-sent /i/ links land in that same arrival —
// a 301 resolved from the legacy invite_tokens table.
// ─────────────────────────────────────────────────────────────

import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { buildSitePath } from '@/lib/site-urls';
import { guestTokenColumns } from '@/lib/guest-tokens';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'You’re Invited · Pearloom',
  description: 'A personal invitation from your hosts.',
};

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key);
}

export default async function InviteTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = getSupabase();

  const { data: tokenRow } = await supabase
    .from('invite_tokens')
    .select('site_id, guests(id, passport_token, guest_token)')
    .eq('token', token)
    .maybeSingle();

  if (tokenRow) {
    const { data: siteRow } = await supabase
      .from('sites')
      .select('subdomain, site_config, ai_manifest')
      .eq('id', tokenRow.site_id as string)
      .maybeSingle();

    if (siteRow?.subdomain) {
      const manifest = siteRow.ai_manifest as { occasion?: string } | null;
      const config = siteRow.site_config as { occasion?: string } | null;
      const occasion = manifest?.occasion ?? config?.occasion;

      const guest = tokenRow.guests as
        | { id?: string; passport_token?: string | null; guest_token?: string | null }
        | null;
      let guestToken = String(guest?.passport_token ?? guest?.guest_token ?? '').trim() || null;
      if (!guestToken && guest?.id) {
        // Pre-token guests get one minted so the arrival can
        // still address them. Best-effort — an anonymous arrival
        // is an acceptable fallback.
        const cols = guestTokenColumns();
        const { error } = await supabase.from('guests').update(cols).eq('id', guest.id);
        if (!error) guestToken = cols.passport_token;
      }

      const path = buildSitePath(siteRow.subdomain as string, '', occasion);
      permanentRedirect(guestToken ? `${path}?g=${encodeURIComponent(guestToken)}` : path);
    }
  }

  // Token (or its site) is gone — the one honest dead end.
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#FDFAF0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--pl-font-body, system-ui, -apple-system, sans-serif)',
        color: '#4A5642',
        textAlign: 'center',
        padding: '2rem',
      }}
    >
      <div style={{ maxWidth: 440 }}>
        <p
          style={{
            fontFamily: 'var(--pl-font-mono, ui-monospace, "Geist Mono", monospace)',
            fontSize: '0.62rem',
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: '#6F6557',
            margin: '0 0 14px',
          }}
        >
          An Invitation
        </p>
        <h1
          style={{
            fontFamily: 'var(--pl-font-heading, "Fraunces", Georgia, serif)',
            fontStyle: 'italic',
            fontWeight: 400,
            fontSize: 'clamp(1.6rem, 4vw, 2.1rem)',
            color: '#18181B',
            margin: '0 0 14px',
            lineHeight: 1.2,
            letterSpacing: '-0.01em',
          }}
        >
          This link isn&rsquo;t ready.
        </h1>
        <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.7, color: '#6F6557' }}>
          The invitation link is invalid or has expired.
          <br />
          Reach out to your hosts for a fresh one.
        </p>
      </div>
    </div>
  );
}
