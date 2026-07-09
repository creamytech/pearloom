// Dev-only visual harness for the "My sites" dashboard screen
// (design-system v2 · ScreensSite). Mounts the REAL EventIndexPage
// inside the persistent shell so the site-card grid, the new-site
// tile, and the weekend banner can be screenshot-verified against
// the zip. Session/site/stat hooks fall back to their empty states
// without auth; the Playwright harness stubs /api/sites +
// /api/dashboard/sites-stats to exercise the populated grid.
// Hidden in production.

import { notFound } from 'next/navigation';
import { AuthProvider } from '@/components/auth-provider';
import { ShellPersistentLayout } from '@/components/pearloom/dash/ShellPersistentLayout';
import { EventIndexPage } from '@/components/pearloom/pages/EventIndexPage';

export const dynamic = 'force-dynamic';

export default function DevDashSites() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <AuthProvider>
      <ShellPersistentLayout>
        <EventIndexPage />
      </ShellPersistentLayout>
    </AuthProvider>
  );
}
