// Dev-only visual harness for the restyled Speeches dashboard screen
// (zip Speeches port). Mounts the REAL SpeechComposerPage client inside
// the persistent ShellPersistentLayout + AuthProvider (mirrors
// /dev/dash-shell) so the editorial composer card, kind tabs, target
// meta, Pear's-read rail, and "Words from your guests" panel can be
// screenshot-verified against the zip. Hidden in production. Without
// auth the site hook falls back to its empty state (no selected site →
// no inspirations); the composer + analysis chrome still render, which
// is what the chrome QA needs.

import { notFound } from 'next/navigation';
import { AuthProvider } from '@/components/auth-provider';
import { ShellPersistentLayout } from '@/components/pearloom/dash/ShellPersistentLayout';
import { SpeechComposerPage } from '@/components/pearloom/pages/SpeechComposerPage';

export const dynamic = 'force-dynamic';

export default function DevDashSpeeches() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <AuthProvider>
      <ShellPersistentLayout>
        <SpeechComposerPage />
      </ShellPersistentLayout>
    </AuthProvider>
  );
}
