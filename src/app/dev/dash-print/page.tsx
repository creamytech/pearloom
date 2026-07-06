// Dev-only visual harness for the restyled Print orders surface.
// Mounts the REAL PrintOrdersClient inside the REAL ShellPersistentLayout
// so the handoff restyle can be screenshot-verified. Hidden in
// production. Session/site/print-order fetches fall back to their
// empty/error states without auth, which is fine for chrome QA.

import { notFound } from 'next/navigation';
import { AuthProvider } from '@/components/auth-provider';
import { ShellPersistentLayout } from '@/components/pearloom/dash/ShellPersistentLayout';
import { PrintOrdersClient } from '@/app/(shell)/dashboard/print/PrintOrdersClient';

export const dynamic = 'force-dynamic';

export default function DevDashPrint() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <AuthProvider>
      <ShellPersistentLayout>
        <PrintOrdersClient siteFilter={null} orderBanner="success" />
      </ShellPersistentLayout>
    </AuthProvider>
  );
}
