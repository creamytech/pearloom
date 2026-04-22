'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / marketing/v2/LandingV2.tsx
// Full landing composition — replaces the earlier DesignNav +
// DesignHero + etc. composition with the "woven" design refresh.
// ─────────────────────────────────────────────────────────────

import { useRouter } from 'next/navigation';
import { LandingNav } from './LandingNav';
import { LandingHero } from './LandingHero';
import { LandingTemplates } from './LandingTemplates';
import { WovenDivider } from '../WovenDivider';
import { LandingPillars } from './LandingPillars';
import { LandingPricing } from './LandingPricing';
import { LandingProof } from './LandingProof';
import { LandingClosing } from './LandingClosing';

export function LandingV2() {
  const router = useRouter();
  const start = () => router.push('/wizard/new');

  return (
    <main style={{ background: 'var(--pl-cream, #F4ECD8)', minHeight: '100vh' }}>
      <LandingNav onStart={start} />
      <LandingHero onStart={start} />
      <LandingTemplates />
      <WovenDivider />
      <LandingPillars />
      <LandingPricing onStart={start} />
      <LandingProof />
      <LandingClosing onStart={start} />
    </main>
  );
}
