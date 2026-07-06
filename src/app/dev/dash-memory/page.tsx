// Dev-only visual harness for the Memory book screen
// (design-system dashboard · ScreensMore Memory). Mounts the REAL
// KeepsakesPage (the sidebar "Memory book" target, /dashboard/keepsakes)
// inside the persistent shell so the memory-book hero, the woven reel,
// the "What's inside" rail, and the keepsake tools can be
// screenshot-verified against the zip. Session/site/memory-book hooks
// fall back to their empty states without auth. Hidden in production.

import { notFound } from 'next/navigation';
import { AuthProvider } from '@/components/auth-provider';
import { ShellPersistentLayout } from '@/components/pearloom/dash/ShellPersistentLayout';
import { KeepsakesPage } from '@/components/pearloom/pages/KeepsakesPage';

export const dynamic = 'force-dynamic';

export default function DevDashMemory() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <AuthProvider>
      <ShellPersistentLayout>
        <KeepsakesPage />
      </ShellPersistentLayout>
    </AuthProvider>
  );
}
