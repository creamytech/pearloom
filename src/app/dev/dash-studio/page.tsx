// Dev-only visual harness for the stationery Studio (/dashboard/invite).
// Mounts the REAL StudioApp inside the REAL ShellPersistentLayout +
// AuthProvider (mirrors /dev/dash-shell) with a sample site manifest so
// the editorial chrome — letterpress topbar, mono/gold rail eyebrows,
// palette rows, live card preview — can be screenshot-verified without
// auth or a network round-trip. Hidden in production.
//
// The sample manifest carries a non-empty `studio` slice so the app
// skips the first-run StudioLanding and opens straight on the editor
// (the surface being restyled). Guest-count + autosave fetches fail
// soft without auth, which is the honest empty state.

import { notFound } from 'next/navigation';
import type { StoryManifest } from '@/types';
import { AuthProvider } from '@/components/auth-provider';
import { ShellPersistentLayout } from '@/components/pearloom/dash/ShellPersistentLayout';
import { StudioApp } from '@/components/pearloom/studio/StudioApp';

export const dynamic = 'force-dynamic';

const SAMPLE_MANIFEST = {
  occasion: 'wedding',
  logistics: {
    date: '2026-09-06',
    venue: 'Point Reyes',
    venueAddress: 'Cypress Grove, Point Reyes, CA',
    rsvpDeadline: '2026-08-10',
  },
  theme: { colors: { accent: '#8B9C5A' } },
  // Non-empty → StudioApp skips the first-run landing and opens the
  // editor. Fields are validated against the canonical option lists.
  studio: {
    type: 'invite',
    view: 'front',
    palette: 'sage',
    fontPair: 'editorial',
    layout: 'classic',
    motif: 'monogram',
    tone: 'warm',
  },
} as unknown as StoryManifest;

export default function DevDashStudio() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <AuthProvider>
      <ShellPersistentLayout>
        <StudioApp
          siteSlug="demo-mira-jun"
          manifest={SAMPLE_MANIFEST}
          names={['Mira', 'Jun']}
          initialThanks={null}
        />
      </ShellPersistentLayout>
    </AuthProvider>
  );
}
