// Dev-only visual harness for the Help screen
// (design-system dashboard · ScreensShop Help). Mounts the REAL
// HelpClient (the /dashboard/help target) inside the persistent shell
// so the dark help hero, the topic grid, the FAQ accordion, and the
// support card can be screenshot-verified against the zip. Hidden in
// production.

import { notFound } from 'next/navigation';
import { AuthProvider } from '@/components/auth-provider';
import { ShellPersistentLayout } from '@/components/pearloom/dash/ShellPersistentLayout';
import HelpClient from '@/app/(shell)/dashboard/help/HelpClient';

export const dynamic = 'force-dynamic';

export default function DevDashHelp() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <AuthProvider>
      <ShellPersistentLayout>
        <HelpClient />
      </ShellPersistentLayout>
    </AuthProvider>
  );
}
