// ─────────────────────────────────────────────────────────────
// Pearloom / app/editor/[siteSlug]/page.tsx
// Deep-linkable editor route — server-loads manifest by slug,
// validates ownership, then renders the full-screen editor.
// ─────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Editor · Pearloom',
  description: 'Edit and customise your celebration site.',
};
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSiteConfig } from '@/lib/db';
import EditorClient from './EditorClient';

interface Props {
  params: Promise<{ siteSlug: string }>;
}

export default async function EditorPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect('/');
  }

  const { siteSlug } = await params;
  const siteConfig = await getSiteConfig(siteSlug);

  if (!siteConfig || !siteConfig.manifest) {
    notFound();
  }

  // Ownership check — site_config.creator_email gates access.
  // Two sources of dashboard-list breakage we self-heal here:
  //
  //   (a) Orphan sites with no creator_email at all. The editor's
  //       previous `creatorEmail && …` short-circuit let any auth'd
  //       user through, but the dashboard listing's ILIKE filter
  //       found no match — so the site loaded in the editor but
  //       disappeared from the user's site list.
  //
  //   (b) Case-mismatched ownership (e.g. site created with
  //       "Foo@bar.com", session is "foo@bar.com"). Strict !==
  //       blocked the owner from their own site.
  //
  // For both: when the current user is the only plausible owner
  // (orphan, or case-only difference), normalise the stored
  // creator_email to lowercase. The dashboard's case-insensitive
  // ILIKE picks it up next load. Strict mismatch (different
  // identity) still redirects.
  const sessionEmail = session.user.email.toLowerCase().trim();
  const rawCreator = (siteConfig as unknown as Record<string, unknown>).creator_email as string | undefined;
  const storedCreator = (rawCreator ?? '').toLowerCase().trim();

  // Co-host resolution — accepted collaborators (cohosts table)
  // open the editor with their role; everyone else with a
  // mismatched email still bounces to the dashboard. 'editor'
  // edits + saves; 'viewer' / 'guest-manager' open read-only
  // (server-side save gate in /api/sites enforces it regardless).
  let viewerRole: 'owner' | 'editor' | 'guest-manager' | 'viewer' = 'owner';
  if (storedCreator && storedCreator !== sessionEmail) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const { resolveViewerRole } = await import('@/lib/cohost-access');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      );
      const access = await resolveViewerRole(supabase, { subdomain: siteSlug }, sessionEmail);
      if (!access.role || access.role === 'owner') redirect('/dashboard');
      viewerRole = access.role;
    } catch (err) {
      // redirect() throws NEXT_REDIRECT — rethrow it; only genuine
      // lookup failures fall through to the dashboard bounce.
      if ((err as { digest?: string })?.digest?.startsWith('NEXT_REDIRECT')) throw err;
      console.warn('[editor] co-host lookup failed:', err);
      redirect('/dashboard');
    }
  }

  // Self-heal cases (a) and (b): write the normalised creator_email
  // back to site_config so the dashboard's listing picks it up.
  // OWNERS ONLY — a co-host opening an orphaned site must never
  // adopt it out from under the real host.
  if (viewerRole === 'owner' && (!rawCreator || rawCreator !== sessionEmail)) {
    try {
      const { adoptSite } = await import('@/lib/db');
      await adoptSite(siteSlug, sessionEmail);
    } catch (err) {
      // Non-fatal — the editor still loads; the user will just need
      // to save once for the dashboard listing to find the site.
      console.warn('[editor] adoptSite failed (non-fatal):', err);
    }
  }

  const names: [string, string] = Array.isArray(siteConfig.names) && siteConfig.names.length >= 2
    ? [siteConfig.names[0] ?? '', siteConfig.names[1] ?? '']
    : ['', ''];

  return (
    <EditorClient
      manifest={siteConfig.manifest}
      siteSlug={siteSlug}
      names={names}
      viewerRole={viewerRole}
      viewerEmail={sessionEmail}
      viewerName={session.user.name ?? null}
    />
  );
}
