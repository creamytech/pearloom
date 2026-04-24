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
import { InvitePage } from '@/components/invite/InvitePage';
import type { StoryManifest } from '@/types';

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
          <div
            style={{
              width: 56,
              height: 56,
              border: '1px solid rgba(193,154,75,0.35)',
              borderRadius: 'var(--pl-radius-xs)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              fontSize: 22,
              fontFamily: 'var(--pl-font-heading, "Fraunces", Georgia, serif)',
              fontStyle: 'italic',
              color: '#C19A4B',
              background: '#FBF7EE',
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
  const guestId = (guest?.id as string) || undefined;
  const hasReplied = !!(guest?.responded_at) && guest?.status !== 'pending';

  const siteConfig = siteRow?.site_config as Record<string, unknown> | null;
  const names: [string, string] = (siteConfig?.names as [string, string]) || ['', ''];
  const manifest = siteRow?.ai_manifest as StoryManifest | null;

  return (
    <InvitePage
      manifest={manifest}
      guestName={guestName}
      guestId={guestId}
      token={token}
      coupleNames={names}
      hasReplied={hasReplied}
      priorRsvp={hasReplied ? {
        status: (guest?.status as 'attending' | 'declined' | 'pending') || 'pending',
        email: (guest?.email as string) || undefined,
        plusOne: !!guest?.plus_one,
        plusOneName: (guest?.plus_one_name as string) || undefined,
        mealPreference: (guest?.meal_preference as string) || undefined,
        dietaryRestrictions: (guest?.dietary_restrictions as string) || undefined,
        songRequest: (guest?.song_request as string) || undefined,
        mailingAddress: (guest?.mailing_address as string) || undefined,
        message: (guest?.message as string) || undefined,
        selectedEvents: (guest?.event_ids as string[]) || [],
        respondedAt: (guest?.responded_at as string) || undefined,
      } : null}
    />
  );
}
