// Dev-only visual harness for the Day-of dashboard screen (zip
// DayOf port). Mounts the REAL DayOfV8 client inside the persistent
// ShellPersistentLayout (mirrors /dev/dash-shell) so the restyled
// room-is-live hero, the run-of-show rail timeline, the call sheet
// + point-person rail, and the live-room cards can be screenshot-
// verified against the zip. Hidden in production. Without auth the
// site/guest/vendor hooks fall back to their empty states; the
// Playwright harness route-mocks /api/sites + the day-of feeds to
// drive the populated layout (no fabricated product data).

import { notFound } from 'next/navigation';
import { AuthProvider } from '@/components/auth-provider';
import { ShellPersistentLayout } from '@/components/pearloom/dash/ShellPersistentLayout';
import { DayOfV8 } from '@/components/pearloom/pages/DayOfV8';

export const dynamic = 'force-dynamic';

export default function DevDashDayOf() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <AuthProvider>
      <ShellPersistentLayout>
        <DayOfV8 />
      </ShellPersistentLayout>
    </AuthProvider>
  );
}
