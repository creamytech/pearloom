// Dev-only visual harness for the restyled Director (/dashboard/director).
// Mounts the REAL DashDirector inside the persistent dashboard shell so
// the design-handoff port can be screenshot-verified. Hidden in
// production. Without auth the director/vendor fetches fail soft and the
// site hooks fall back to their empty states — fine for chrome QA.

import { notFound } from 'next/navigation';
import { AuthProvider } from '@/components/auth-provider';
import { ShellPersistentLayout } from '@/components/pearloom/dash/ShellPersistentLayout';
import { DashDirector } from '@/components/marketing/design/dash/DashDirector';

export const dynamic = 'force-dynamic';

export default function DevDashDirector() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <AuthProvider>
      <ShellPersistentLayout>
        <DashDirector />
      </ShellPersistentLayout>
    </AuthProvider>
  );
}
