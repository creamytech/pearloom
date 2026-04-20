// ─────────────────────────────────────────────────────────────
// Pearloom / app/dashboard/connections/page.tsx
// Host-only page for linking sibling sites into a celebration.
// ─────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ConnectionsClient } from './ConnectionsClient';

export const metadata: Metadata = {
  title: 'Connections · Pearloom',
  description: 'Link sibling events into one celebration.',
};

export default async function ConnectionsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/login');

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'var(--pl-cream)',
        padding: 'clamp(32px, 6vw, 64px) 0',
        color: 'var(--pl-ink)',
      }}
    >
      <div
        style={{
          maxWidth: 960,
          margin: '0 auto',
          padding: 'clamp(16px, 4vw, 32px)',
        }}
      >
        <ConnectionsClient />
      </div>
    </main>
  );
}
