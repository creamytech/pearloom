// Dev-only visual harness for the /dashboard/vendors surface (the
// Vendor Book). Mounts the REAL VendorBookClient inside the REAL
// ShellPersistentLayout + AuthProvider so the zip-ported two-column
// composition (grouped roster + the due-next strip + "The team"
// summary rail) can be screenshot-verified exactly as it renders in
// production. Hidden in production. Session/site/vendor hooks fall
// back to their empty states without auth; a Playwright harness can
// stub /api/sites + /api/vendors/book to render the full roster.

import { notFound } from 'next/navigation';
import { AuthProvider } from '@/components/auth-provider';
import { ShellPersistentLayout } from '@/components/pearloom/dash/ShellPersistentLayout';
import { VendorBookClient } from '@/app/(shell)/dashboard/vendors/VendorBookClient';

export const dynamic = 'force-dynamic';

export default function DevDashVendors() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <AuthProvider>
      <ShellPersistentLayout>
        <VendorBookClient />
      </ShellPersistentLayout>
    </AuthProvider>
  );
}
