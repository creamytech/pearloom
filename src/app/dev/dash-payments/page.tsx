// Dev-only visual harness for the /dashboard/payments surface.
// Mounts the REAL PaymentsDashboardClient inside the REAL
// ShellPersistentLayout + AuthProvider so the zip-ported Payments
// composition (the "The ledger" card + the "Received" running-total
// rail + the "Pearloom never touches the money" note) can be
// screenshot-verified exactly as it renders in production. Hidden in
// production. Without auth the site/payments hooks fall back to their
// empty states; a Playwright harness can route-mock /api/sites +
// /api/payments to render the populated ledger (no fabricated
// product data).

import { notFound } from 'next/navigation';
import { AuthProvider } from '@/components/auth-provider';
import { ShellPersistentLayout } from '@/components/pearloom/dash/ShellPersistentLayout';
import { PaymentsDashboardClient } from '@/app/(shell)/dashboard/payments/PaymentsDashboardClient';

export const dynamic = 'force-dynamic';

export default function DevDashPayments() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <AuthProvider>
      <ShellPersistentLayout>
        <PaymentsDashboardClient />
      </ShellPersistentLayout>
    </AuthProvider>
  );
}
