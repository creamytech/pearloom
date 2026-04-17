// ─────────────────────────────────────────────────────────────
// Pearloom / app/i/[token]/page.tsx
// Per-guest animated invitation page
// ─────────────────────────────────────────────────────────────

import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';

export const metadata: Metadata = {
  title: 'You\'re Invited | Pearloom',
  description: 'You have received a special invitation.',
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
          background: '#0E0B12',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Georgia, serif',
          color: 'rgba(245,241,232,0.5)',
          textAlign: 'center',
          padding: '2rem',
        }}
      >
        <div>
          <div
            style={{
              width: 48,
              height: 48,
              border: '1px solid rgba(196,169,106,0.3)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              fontSize: 20,
            }}
          >
            ✦
          </div>
          <h1
            style={{
              margin: '0 0 12px',
              fontSize: '1.5rem',
              fontWeight: 400,
              color: 'rgba(245,241,232,0.7)',
            }}
          >
            Invitation Not Found
          </h1>
          <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.6 }}>
            This invitation link is invalid or has expired.
            <br />
            Please contact the couple for a new link.
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
