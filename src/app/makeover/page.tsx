// ─────────────────────────────────────────────────────────────
// Pearloom / app/makeover/page.tsx
//
// "Already started somewhere else?" — paste the wedding site you
// built on another platform and see the same day woven our way,
// rendered by the real renderer on a real manifest.
//
// This is the switching surface: most couples have started
// elsewhere before they find Pearloom, so the product has to show
// rather than argue. It writes nothing, publishes nothing, and
// needs no account (the doorway contract).
// ─────────────────────────────────────────────────────────────

import type { Metadata } from 'next';
import { MakeoverPage } from '@/components/pearloom/pages/MakeoverPage';

export const metadata: Metadata = {
  title: 'See your wedding site, reimagined · Pearloom',
  description:
    'Paste the link to the wedding site you already started and see the same day woven Pearloom’s way. Nothing saved, nothing published.',
  alternates: { canonical: '/makeover' },
};

export const dynamic = 'force-dynamic';

export default function Page() {
  return <MakeoverPage />;
}
