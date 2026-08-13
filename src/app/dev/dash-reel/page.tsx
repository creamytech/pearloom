// Dev-only visual harness for the /dashboard/gallery surface ("The
// Reel"). Mounts the REAL DashGallery inside the REAL
// ShellPersistentLayout + AuthProvider so the zip-ported Gallery
// composition (intake ribbon + moderation queue + guest-upload card
// + the masonry wall) can be screenshot-verified exactly as it
// renders in production. Hidden in production. Session/site/reel
// hooks fall back to their empty states without auth; a Playwright
// harness can stub /api/sites + /api/dashboard/reel +
// /api/guest-photos/moderate to render the full wall.

import { notFound } from 'next/navigation';
import { AuthProvider } from '@/components/auth-provider';
import { ShellPersistentLayout } from '@/components/pearloom/dash/ShellPersistentLayout';
import { DashGallery } from '@/components/marketing/design/dash/DashGallery';

export const dynamic = 'force-dynamic';

export default function DevDashReel() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <AuthProvider>
      <ShellPersistentLayout>
        <DashGallery />
      </ShellPersistentLayout>
    </AuthProvider>
  );
}
