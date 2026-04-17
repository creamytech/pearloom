// ─────────────────────────────────────────────────────────────
// Pearloom / app/wizard/photo-first/page.tsx
// Photo-first onboarding — drop 10+ photos, get a site in 30 s.
// ─────────────────────────────────────────────────────────────

import type { Metadata } from 'next';
import { PhotoFirstWizard } from '@/components/wizard/PhotoFirstWizard';

export const metadata: Metadata = {
  title: 'Start from photos · Pearloom',
  description: 'Drop a folder of photos and Pearloom will build the rest.',
};

export default function PhotoFirstWizardPage() {
  return <PhotoFirstWizard />;
}
