// ─────────────────────────────────────────────────────────────
// Pearloom / app/wizard/new/page.tsx
// Standalone entry for WizardV2. Owns /api/sites save + editor
// redirect so the wizard works from any dashboard surface.
// ─────────────────────────────────────────────────────────────

import type { Metadata } from 'next';
import { WizardNewClient } from './WizardNewClient';

export const metadata: Metadata = {
  title: 'Begin a thread · Pearloom',
  description: 'Pear walks you through it. One step at a time, or all at once.',
};

export const dynamic = 'force-dynamic';

export default function WizardNewPage() {
  return <WizardNewClient />;
}
