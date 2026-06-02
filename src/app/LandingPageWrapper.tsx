'use client';

/* ========================================================================
   PEARLOOM — PUBLIC LANDING PAGE
   Composes the design-bundle marketing surfaces in their canonical order:
     DesignNav → DesignHero → ThreeActsStage → DesignOccasions →
     DesignPricing → DesignTestimonials → DesignFAQ → DesignCTAFooter
   These components ship the full visual-fidelity port (Fraunces display,
   pearl atoms, paper grain, olive accent, hand-drawn motifs). Each takes
   a single `onGetStarted` callback that fans out to the wizard.
   ======================================================================== */

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { DesignNav } from '@/components/marketing/design/DesignNav';
import { DesignHero } from '@/components/marketing/design/DesignHero';
import { ThreeActsStage } from '@/components/marketing/design/ThreeActsStage';
import { DesignOccasions } from '@/components/marketing/design/DesignOccasions';
import { DesignPricing } from '@/components/marketing/design/DesignPricing';
import { DesignTestimonials } from '@/components/marketing/design/DesignTestimonials';
import { DesignFAQ } from '@/components/marketing/design/DesignFAQ';
import { DesignCTAFooter } from '@/components/marketing/design/DesignCTAFooter';
import { PD } from '@/components/marketing/design/DesignAtoms';

export default function LandingPageWrapper() {
  const router = useRouter();
  const onGetStarted = useCallback(() => {
    router.push('/wizard/new');
  }, [router]);

  return (
    <main
      style={{
        background: PD.paper,
        color: PD.ink,
        minHeight: '100vh',
        fontFamily: 'var(--pl-font-body)',
      }}
    >
      <DesignNav onGetStarted={onGetStarted} />
      <DesignHero onGetStarted={onGetStarted} />
      <section id="acts">
        <ThreeActsStage />
      </section>
      <section id="occasions">
        <DesignOccasions onGetStarted={onGetStarted} />
      </section>
      <section id="pricing">
        <DesignPricing onGetStarted={onGetStarted} />
      </section>
      <DesignTestimonials />
      <DesignFAQ />
      <DesignCTAFooter onGetStarted={onGetStarted} />
    </main>
  );
}
