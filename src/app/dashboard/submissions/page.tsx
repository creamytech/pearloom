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
import { VotesSummary } from '@/components/dashboard/VotesSummary';
import { ToastClaimsList } from '@/components/dashboard/ToastClaimsList';

export const metadata: Metadata = {
  title: 'Submissions · Pearloom',
  description: 'Moderate advice, tribute, and memory wall posts + activity votes + toast signups from your guests.',
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
        <div style={{ maxWidth: 960, margin: '0 auto', padding: 'clamp(16px, 4vw, 32px)' }}>
          <SubmissionsModeration siteId={siteId} />
          <VotesSummary siteId={siteId} />
          <ToastClaimsList siteId={siteId} />
        </div>
      ) : (
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '60px 24px', textAlign: 'center' }}>
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--pl-font-body)',
              fontWeight: 700,
              fontSize: 'clamp(1.8rem, 3.5vw, 2.4rem)',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              color: 'var(--pl-groove-ink)',
            }}
          >
            No sites yet
          </h1>
          <p style={{
            color: 'color-mix(in oklab, var(--pl-groove-ink) 70%, transparent)',
            marginTop: 12,
            fontSize: '0.96rem',
            lineHeight: 1.55,
          }}>
            Publish a site with an advice or tribute wall and submissions will appear here.
          </p>
        </div>
      )}
    </main>
  );
}
