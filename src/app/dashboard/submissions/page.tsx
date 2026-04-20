// ─────────────────────────────────────────────────────────────
// Pearloom / app/dashboard/submissions/page.tsx
// Host-only moderation page for tribute_submissions — advice
// walls, tribute walls, memory walls across the host's sites.
// ─────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SubmissionsModeration } from '@/components/dashboard/SubmissionsModeration';

export const metadata: Metadata = {
  title: 'Submissions · Pearloom',
  description: 'Moderate advice, tribute, and memory wall posts from your guests.',
};

export default async function SubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/login');

  const params = await searchParams;
  let siteId = params.siteId || '';

  // Fall back to the host's first site if none specified.
  if (!siteId) {
    try {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const res = await fetch(`${baseUrl}/api/sites`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        siteId = data.sites?.[0]?.domain || data.sites?.[0]?.id || '';
      }
    } catch { /* siteId stays empty */ }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'var(--pl-cream)',
        padding: 'clamp(32px, 6vw, 64px) 0',
        color: 'var(--pl-ink)',
      }}
    >
      {siteId ? (
        <SubmissionsModeration siteId={siteId} />
      ) : (
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '60px 24px', textAlign: 'center' }}>
          <h1
            className="pl-display"
            style={{
              margin: 0,
              fontStyle: 'italic',
              fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)',
              color: 'var(--pl-ink)',
            }}
          >
            No sites yet
          </h1>
          <p style={{ color: 'var(--pl-muted)', marginTop: 12 }}>
            Publish a site with an advice or tribute wall and submissions will appear here.
          </p>
        </div>
      )}
    </main>
  );
}
