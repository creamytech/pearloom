// Dev-only visual harness for the Settings screen
// (design-system dashboard · ScreensShop Settings). Mounts the REAL
// DashSettings (the sidebar "Settings" target, /dashboard/profile)
// inside the persistent shell so the grouped section list, the detail
// panels, and the sign-out control can be screenshot-verified against
// the zip. Session/prefs/plan hooks fall back to their empty states
// without auth. Hidden in production.

import { notFound } from 'next/navigation';
import { AuthProvider } from '@/components/auth-provider';
import { ShellPersistentLayout } from '@/components/pearloom/dash/ShellPersistentLayout';
import { DashSettings } from '@/components/marketing/design/dash/DashSettings';

export const dynamic = 'force-dynamic';

export default function DevDashSettings() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <AuthProvider>
      <ShellPersistentLayout>
        <DashSettings />
      </ShellPersistentLayout>
    </AuthProvider>
  );
}
