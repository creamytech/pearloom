// Dev-only visual harness for the restyled Passport cards surface.
// Mounts the REAL PassportCardsPage inside the REAL ShellPersistentLayout
// so the handoff restyle can be screenshot-verified. Hidden in
// production. Session/site hooks fall back to their empty states
// without auth, which is fine for chrome QA.

import { notFound } from 'next/navigation';
import { AuthProvider } from '@/components/auth-provider';
import { ShellPersistentLayout } from '@/components/pearloom/dash/ShellPersistentLayout';
import { PassportCardsPage } from '@/components/pearloom/pages/PassportCardsPage';

export const dynamic = 'force-dynamic';

export default function DevDashPassport() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <AuthProvider>
      <ShellPersistentLayout>
        <PassportCardsPage />
      </ShellPersistentLayout>
    </AuthProvider>
  );
}
