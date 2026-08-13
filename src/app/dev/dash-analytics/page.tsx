// Dev-only visual harness for the Analytics dashboard screen (zip
// ScreensExtra Analytics port). Mounts the REAL DashAnalytics client
// inside the persistent ShellPersistentLayout (mirrors /dev/dash-shell
// and /dev/dash-guests) so the restyled KPI tiles, RSVP funnel, still-
// quiet callout, arrival sources, engagement-by-section bars, and the
// Pear's-reading insight rail can be screenshot-verified against the
// zip. Hidden in production. Without auth the site/guest hooks fall
// back to their empty states; the Playwright harness route-mocks
// /api/sites + the three /api/analytics feeds + /api/guests to drive
// the populated layout (no fabricated product data).

import { notFound } from 'next/navigation';
import { AuthProvider } from '@/components/auth-provider';
import { ShellPersistentLayout } from '@/components/pearloom/dash/ShellPersistentLayout';
import { DashAnalytics } from '@/components/marketing/design/dash/DashAnalytics';

export const dynamic = 'force-dynamic';

export default function DevDashAnalytics() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <AuthProvider>
      <ShellPersistentLayout>
        <DashAnalytics />
      </ShellPersistentLayout>
    </AuthProvider>
  );
}
