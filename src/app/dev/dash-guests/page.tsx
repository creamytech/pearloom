// Dev-only visual harness for the Guests dashboard screen. Mounts the
// REAL DashGuests client inside the persistent ShellPersistentLayout
// (mirrors /dev/dash-shell) so the restyled roster + RSVP donut + stat
// pills + insight rail can be screenshot-verified. Hidden in
// production. Without auth the site/guest hooks fall back to their
// empty states; Playwright route-mocks /api/sites + /api/guests to
// drive the full roster with sample rows (no fabricated product data).

import { notFound } from 'next/navigation';
import { AuthProvider } from '@/components/auth-provider';
import { ShellPersistentLayout } from '@/components/pearloom/dash/ShellPersistentLayout';
import { DashGuests } from '@/components/marketing/design/dash/DashGuests';

export const dynamic = 'force-dynamic';

export default function DevDashGuests() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <AuthProvider>
      <ShellPersistentLayout>
        <DashGuests />
      </ShellPersistentLayout>
    </AuthProvider>
  );
}
