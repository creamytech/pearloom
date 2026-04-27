// ─────────────────────────────────────────────────────────────
// Pearloom / app/brand/groove/page.tsx
// Design-review page for the groove product-UI brand. Lives off
// the main nav; reach it by URL only. Renders every primitive
// + the ripening pear with a scroll-driven ripeness slider so
// the team can critique in isolation before the full migration.
// ─────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { GrooveReview } from './GrooveReview';

export const metadata: Metadata = {
  title: 'Groove · Pearloom design review',
  robots: { index: false, follow: false },
};

export default function GrooveReviewPage() {
  return <GrooveReview />;
}
