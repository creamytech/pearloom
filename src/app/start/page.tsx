// ─────────────────────────────────────────────────────────────
// Pearloom / app/start/page.tsx — the express door.
//
// "Give us what you already have." Paste the site you started
// somewhere else, a save-the-date, or the details in your own
// words; we read what we can and hand the wizard a filled-in
// start. The nine-step wizard remains the guided path at
// /wizard/new — this is the fast one beside it.
//
// No account required: the doorway contract puts auth at
// save/publish, never at the door (proxy.test.ts pins it).
// ─────────────────────────────────────────────────────────────

import type { Metadata } from 'next';
import { StartExpress } from '@/components/pearloom/pages/StartExpress';

export const metadata: Metadata = {
  title: 'Start your site · Pearloom',
  description:
    'Paste what you already have — a link, a save-the-date, or the details in your own words — and we’ll press a site from it.',
};

export const dynamic = 'force-dynamic';

export default function StartPage() {
  return <StartExpress />;
}
