// ─────────────────────────────────────────────────────────────
// Pearloom / app/wizard-v2/page.tsx
// New wizard experience — 11 steps, voice-first alt, sticky Pear
// helper, breath moment, opaque generating stage with a curtain
// reveal into the editor.
// ─────────────────────────────────────────────────────────────

import type { Metadata } from 'next';
import { WizardV2 } from '@/components/wizard/design/WizardV2';

export const metadata: Metadata = {
  title: 'Begin a thread · Pearloom',
  description: 'Pear walks you through it. One step at a time, or all at once.',
};

export const dynamic = 'force-dynamic';

export default function WizardV2Page() {
  return <WizardV2 />;
}
