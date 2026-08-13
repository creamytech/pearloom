// ─────────────────────────────────────────────────────────────
// Pearloom / app/co-host/[token]/page.tsx
// Invitee landing for co-host invites. Logged-in users can
// accept with one tap; logged-out users are prompted to sign in
// and the token is held until they return.
// ─────────────────────────────────────────────────────────────

import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { CoHostAccept } from '@/components/co-host/CoHostAccept';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Co-host invite · Pearloom',
  description: 'You\'ve been invited to help plan a Pearloom site.',
};

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key);
}

export default async function CoHostAcceptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await getServerSession(authOptions);

  /* Keyless deploys (no Supabase env) degrade to the invalid-invite
     card instead of a 500 — same graceful posture as the API routes. */
  let supabase: ReturnType<typeof getSupabase> | null = null;
  try {
    supabase = getSupabase();
  } catch {
    supabase = null;
  }

  const { data: inv } = supabase
    ? await supabase
        .from('cohost_invites')
        .select('token, site_id, role, invited_by, note, created_at, expires_at, accepted_at')
        .eq('token', token)
        .maybeSingle()
    : { data: null };

  let siteName = '';
  let coupleNames: [string, string] = ['', ''];
  if (inv && supabase) {
    const { data: siteRow } = await supabase
      .from('sites')
      .select('subdomain, site_config, ai_manifest')
      .eq('id', inv.site_id as string)
      .maybeSingle();
    if (siteRow) {
      siteName = (siteRow.subdomain as string) || '';
      const siteConfig = siteRow.site_config as Record<string, unknown> | null;
      const manifest = siteRow.ai_manifest as Record<string, unknown> | null;
      coupleNames =
        (siteConfig?.names as [string, string])
        || (siteConfig?.coupleNames as [string, string])
        || (manifest?.names as [string, string])
        || ['', ''];
    }
  }

  return (
    <CoHostAccept
      token={token}
      invite={inv
        ? {
            role: inv.role as 'editor' | 'guest-manager' | 'viewer',
            invitedBy: inv.invited_by as string,
            note: (inv.note as string) || undefined,
            expiresAt: inv.expires_at as string,
            acceptedAt: (inv.accepted_at as string) || null,
          }
        : null}
      siteName={siteName}
      coupleNames={coupleNames}
      currentUserEmail={session?.user?.email || null}
    />
  );
}
