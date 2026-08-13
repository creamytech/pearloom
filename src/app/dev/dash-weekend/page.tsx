// Dev-only visual harness for the restyled Weekend builder
// (/dashboard/weekend). Mounts the REAL WeekendBuilderPage inside the
// persistent dashboard shell so the design-handoff port can be
// screenshot-verified. Hidden in production. The builder needs no auth
// to render its steps; the build POST is only fired on submit.

import { notFound } from 'next/navigation';
import { AuthProvider } from '@/components/auth-provider';
import { ShellPersistentLayout } from '@/components/pearloom/dash/ShellPersistentLayout';
import { WeekendBuilderPage } from '@/components/pearloom/pages/WeekendBuilderPage';

export const dynamic = 'force-dynamic';

export default function DevDashWeekend() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <AuthProvider>
      <ShellPersistentLayout>
        <WeekendBuilderPage />
      </ShellPersistentLayout>
    </AuthProvider>
  );
}
