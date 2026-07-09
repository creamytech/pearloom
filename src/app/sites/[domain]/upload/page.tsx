// ─────────────────────────────────────────────────────────────
// /sites/[domain]/upload — one-tap mobile photo upload page.
//
// Designed for QR-poster pickup at the venue: a guest scans the
// poster on their table, lands here, taps Take a photo, the
// camera opens, they shoot, we upload. No login, no app, no
// account creation.
//
// Submits via the existing /api/guest-photos POST. Photos land
// in the moderation queue (status='pending') by default; the
// host approves via the existing dashboard, then the photo
// surfaces on /sites/[domain]/live (which already does Supabase
// Realtime).
//
// Returns 404 only when the site doesn't exist; an unpublished
// site still allows uploads so guests can post during the
// rehearsal dinner before the public site goes live.
// ─────────────────────────────────────────────────────────────

import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import type { StoryManifest } from '@/types';
import { GuestUploadClient } from './GuestUploadClient';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Add a photo · Pearloom',
  description: 'Share a photo with the couple.',
};

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

interface SiteRow {
  id: string;
  subdomain: string;
  ai_manifest: StoryManifest | null;
  site_config: { names?: [string, string] } | null;
}

export default async function GuestUploadPage({
  params,
  searchParams,
}: {
  params: Promise<{ domain: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { domain } = await params;
  const { t: guestToken } = await searchParams;
  const sb = getSupabase();
  if (!sb) notFound();

  const { data: site } = await sb
    .from('sites')
    .select('id, subdomain, ai_manifest, site_config')
    .eq('subdomain', domain)
    .maybeSingle<SiteRow>();
  if (!site) notFound();

  const names = (site.ai_manifest?.names ?? site.site_config?.names ?? []).filter(Boolean);
  const couple = names.length >= 2 ? `${names[0]} & ${names[1]}` : (names[0] ?? 'the celebration');

  // Host's "Guest uploads" switch (GalleryPanel → manifest.guestUploads,
  // default ON). When the host turns it off, this page becomes a
  // gentle closed notice instead of a camera — and /api/guest-photos
  // enforces the same flag server-side.
  const uploadsOpen =
    ((site.ai_manifest as unknown as { guestUploads?: boolean } | null)?.guestUploads) !== false;
  if (!uploadsOpen) {
    return (
      <main
        style={{
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          background: '#F5EFE2',
          color: '#0E0D0B',
          fontFamily: 'Georgia, serif',
          padding: 24,
          textAlign: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.55, marginBottom: 12 }}>
            {couple}
          </div>
          <h1 style={{ fontSize: 28, fontStyle: 'italic', margin: '0 0 10px' }}>
            Photo uploads are closed.
          </h1>
          <p style={{ fontSize: 14, opacity: 0.7, maxWidth: 380, margin: '0 auto' }}>
            The hosts aren&rsquo;t collecting photos right now, but they&rsquo;d
            still love to see you at the celebration.
          </p>
        </div>
      </main>
    );
  }

  // Invitation-only sites (rsvpConfig.guestListOnly) only let people
  // already on the guest list add photos — resolved through their
  // personal token. No valid token → a gentle "use your invite link"
  // notice instead of a camera. /api/guest-photos enforces the same
  // gate server-side.
  const guestListOnly = Boolean(
    (site.ai_manifest as unknown as { rsvpConfig?: { guestListOnly?: boolean } } | null)
      ?.rsvpConfig?.guestListOnly,
  );
  if (guestListOnly) {
    const { resolveGuestToken } = await import('@/lib/people');
    const resolved = guestToken ? await resolveGuestToken(sb, guestToken) : null;
    const onList = !!resolved && String(resolved.siteId) === String(site.id);
    if (!onList) {
      return (
        <main
          style={{
            minHeight: '100dvh',
            display: 'grid',
            placeItems: 'center',
            background: '#F5EFE2',
            color: '#0E0D0B',
            fontFamily: 'Georgia, serif',
            padding: 24,
            textAlign: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.55, marginBottom: 12 }}>
              {couple}
            </div>
            <h1 style={{ fontSize: 28, fontStyle: 'italic', margin: '0 0 10px' }}>
              Photos are by invitation.
            </h1>
            <p style={{ fontSize: 14, opacity: 0.7, maxWidth: 400, margin: '0 auto', lineHeight: 1.55 }}>
              Open the personal link the hosts sent you to add your photos. Can&rsquo;t
              find it? Reach out to your hosts and they&rsquo;ll send it along.
            </p>
          </div>
        </main>
      );
    }
  }

  // Pre-fill the uploader name + email from the personalized guest
  // record when /upload?t=<guest_token> is used. The form stays
  // editable in case the guest's borrowing someone's phone.
  let prefillName: string | null = null;
  if (guestToken && guestToken.length >= 6) {
    const { data: guestRow } = await sb
      .from('pearloom_guests')
      .select('display_name')
      .eq('guest_token', guestToken)
      .maybeSingle();
    prefillName = (guestRow as { display_name?: string } | null)?.display_name ?? null;
  }

  return (
    <GuestUploadClient
      siteId={site.subdomain}
      couple={couple}
      guestToken={guestToken ?? null}
      prefillName={prefillName}
    />
  );
}
