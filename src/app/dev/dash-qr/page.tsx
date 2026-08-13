// Dev-only visual harness for the restyled QR poster surface.
// Mounts the REAL QrPosterPage inside the REAL ShellPersistentLayout
// so the handoff restyle can be screenshot-verified. Hidden in
// production. Session/site hooks fall back to their empty states
// without auth, which is fine for chrome QA.

import { notFound } from 'next/navigation';
import { AuthProvider } from '@/components/auth-provider';
import { ShellPersistentLayout } from '@/components/pearloom/dash/ShellPersistentLayout';
import { QrPosterPage } from '@/components/pearloom/pages/QrPosterPage';

export const dynamic = 'force-dynamic';

export default function DevDashQr() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <AuthProvider>
      <ShellPersistentLayout>
        <QrPosterPage />
      </ShellPersistentLayout>
    </AuthProvider>
  );
}
