// Dev-only visual harness for the /dashboard/registry surface.
// Mounts the REAL RegistryDashboardClient inside the REAL
// ShellPersistentLayout + AuthProvider so the zip-ported Registry
// composition (gift grid + thank-you ledger + "The registry" rail)
// can be screenshot-verified exactly as it renders in production.
// Hidden in production. Session/site/registry hooks fall back to
// their empty states without auth; a Playwright harness can stub
// /api/sites + the registry endpoints to render the full grid.

import { notFound } from 'next/navigation';
import { AuthProvider } from '@/components/auth-provider';
import { ShellPersistentLayout } from '@/components/pearloom/dash/ShellPersistentLayout';
import { RegistryDashboardClient } from '@/app/(shell)/dashboard/registry/RegistryDashboardClient';

export const dynamic = 'force-dynamic';

export default function DevDashRegistry() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <AuthProvider>
      <ShellPersistentLayout>
        <RegistryDashboardClient />
      </ShellPersistentLayout>
    </AuthProvider>
  );
}
