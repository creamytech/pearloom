// ─────────────────────────────────────────────────────────────
// Pearloom / app/editor/[siteSlug]/page.tsx
// Deep-linkable editor route — server-loads manifest by slug,
// validates ownership, then renders the full-screen editor.
// ─────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic';

import { notFound, redirect } from 'next/navigation';
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

  // Ownership check — site_config JSONB stores creator_email
  const creatorEmail = (siteConfig as unknown as Record<string, unknown>).creator_email as string | undefined;
  if (creatorEmail && creatorEmail !== session.user.email) {
    // Not the owner — redirect to their own dashboard
    redirect('/dashboard');
  }

  const names: [string, string] = Array.isArray(siteConfig.names) && siteConfig.names.length >= 2
    ? [siteConfig.names[0] ?? '', siteConfig.names[1] ?? '']
    : ['', ''];

  return (
    <EditorClient
      manifest={siteConfig.manifest}
      siteSlug={siteSlug}
      names={names}
    />
  );
}
