'use client';

/* ========================================================================
   PEARLOOM — PUBLIC LANDING PAGE
   Composes the design-bundle marketing surfaces in their canonical order:
     DesignNav → DesignHero → ThreeActsStage → DesignOccasions →
     DesignPricing → DesignTestimonials → DesignFAQ → DesignCTAFooter
   These components ship the full visual-fidelity port (Fraunces display,
   pearl atoms, paper grain, olive accent, hand-drawn motifs). Each takes
   a single `onGetStarted` callback that fans out to the wizard.

   Brand atoms mounted here (BRAND.md §3):
   - `.pl-grain` paper texture on the page wrapper (the ::before is
     raised to z-index 1 below so it reads over the sections' own
     paper backgrounds; the sticky nav at z-index 50 stays above it).
   - `<Thread />` two-strand dividers between the major sections.
   - A global prefers-reduced-motion guard for every `.pd-anim`
     inline-animated element in the design components.
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
import { Thread } from '@/components/brand/Thread';

/** Quiet two-strand thread rule between major sections (BRAND.md §3). */
function ThreadDivider() {
  return (
    <div
      aria-hidden
      style={{
        maxWidth: 320,
        margin: '56px auto',
        padding: '0 24px',
      }}
    >
      <Thread variant="weave" height={12} />
    </div>
  );
}

export default function LandingPageWrapper() {
  const router = useRouter();
  const onGetStarted = useCallback(() => {
    router.push('/wizard/new');
  }, [router]);

  return (
    <main
      className="pl-grain pd-landing"
      style={{
        background: PD.paper,
        color: PD.ink,
        minHeight: '100vh',
        fontFamily: 'var(--pl-font-body)',
        position: 'relative',
      }}
    >
      <DesignNav onGetStarted={onGetStarted} />
      <DesignHero onGetStarted={onGetStarted} />
      <ThreadDivider />
      <section id="acts" style={{ scrollMarginTop: 96 }}>
        <ThreeActsStage />
      </section>
      <section id="occasions" style={{ scrollMarginTop: 96 }}>
        <DesignOccasions onGetStarted={onGetStarted} />
      </section>
      <ThreadDivider />
      <section id="pricing" style={{ scrollMarginTop: 96 }}>
        <DesignPricing onGetStarted={onGetStarted} />
      </section>
      <ThreadDivider />
      <DesignTestimonials />
      <DesignFAQ />
      <DesignCTAFooter onGetStarted={onGetStarted} />

      <style jsx global>{`
        /* The .pl-grain ::before ships at z-index 0, which the
           positioned section surfaces would paint over. Raise it to
           sit above the paper but below the sticky nav (z 50) — it's
           pointer-events: none and multiply-blended, so copy stays
           readable through it (BRAND.md §3 "quiet enough to read
           through"). */
        main.pd-landing.pl-grain::before {
          z-index: 1;
        }
        /* Accessibility: every inline-animated atom on the landing
           page carries .pd-anim — switch them all off under
           prefers-reduced-motion. .pd-anim-draw marks draw-in
           strokes that must also land in their finished state. */
        @media (prefers-reduced-motion: reduce) {
          .pd-anim,
          .pd-anim * {
            animation: none !important;
          }
          .pd-anim-draw {
            stroke-dashoffset: 0 !important;
          }
        }
      `}</style>
    </main>
  );
}
