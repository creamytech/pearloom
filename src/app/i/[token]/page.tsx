// ─────────────────────────────────────────────────────────────
// Pearloom / app/i/[token]/page.tsx
// Per-guest animated invitation page
// ─────────────────────────────────────────────────────────────

import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';

export const metadata: Metadata = {
  title: 'You\u2019re Invited · Pearloom',
  description: 'A personal invitation from the couple.',
};
import { InviteReveal } from '@/components/invite/InviteReveal';
import type { StoryManifest } from '@/types';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key);
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = getSupabase();

  // Look up the token with guest data
  const { data: tokenRow } = await supabase
    .from('invite_tokens')
    .select('*, guests(*)')
    .eq('token', token)
    .maybeSingle();

  if (!tokenRow) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#FAF7F2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--pl-font-body, system-ui, -apple-system, sans-serif)',
          color: '#3A332C',
          textAlign: 'center',
          padding: '2rem',
        }}
      >
        <div style={{ maxWidth: 440 }}>
          <div
            style={{
              width: 56,
              height: 56,
              border: '1px solid rgba(184,147,90,0.35)',
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              fontSize: 22,
              fontFamily: 'var(--pl-font-heading, "Fraunces", Georgia, serif)',
              fontStyle: 'italic',
              color: '#B8935A',
              background: '#F0ECE3',
            }}
          >
            ✦
          </div>
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
          <p
            style={{
              margin: 0,
              fontSize: '0.95rem',
              lineHeight: 1.7,
              color: '#6F6557',
            }}
          >
            The invitation link is invalid or has expired.
            <br />
            Reach out to the couple for a fresh one.
          </p>
        </div>
      </div>
    );
  }

  // Mark as opened (fire and forget — don't block render)
  void supabase
    .from('invite_tokens')
    .update({ opened_at: new Date().toISOString() })
    .eq('token', token);

  // Fetch site config via the site_id on the token row
  const siteId: string = tokenRow.site_id as string;

  const { data: siteRow } = await supabase
    .from('sites')
    .select('subdomain, site_config, ai_manifest')
    .eq('id', siteId)
    .maybeSingle();

  const guest = tokenRow.guests as Record<string, unknown> | null;
  const guestName = (guest?.name as string) || 'Guest';

  const siteConfig = siteRow?.site_config as Record<string, unknown> | null;
  const names: [string, string] = (siteConfig?.names as [string, string]) || ['', ''];
  const manifest = siteRow?.ai_manifest as StoryManifest | null;

  return (
    <InviteReveal
      manifest={manifest}
      guestName={guestName}
      token={token}
      coupleNames={names}
    />
  );
}
