// Dev-only visual harness for the restyled Music dashboard board.
// Mounts the REAL ShellPersistentLayout + AuthProvider (mirrors
// /dev/dash-shell) around the prop-driven MusicBoard fed with
// sample data, so the guest-playlist redesign — the floor set,
// guest requests, needle-drop art, set-aside lane — can be
// screenshot-verified without auth or a seeded site. Hidden in
// production.

import { notFound } from 'next/navigation';
import { AuthProvider } from '@/components/auth-provider';
import { ShellPersistentLayout } from '@/components/pearloom/dash/ShellPersistentLayout';
import { DevMusicHarness } from './DevMusicHarness';

export const dynamic = 'force-dynamic';

export default function DevDashMusic() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <AuthProvider>
      <ShellPersistentLayout>
        <DevMusicHarness />
      </ShellPersistentLayout>
    </AuthProvider>
  );
}
