'use client';

/* ========================================================================
   PEARLOOM — PUBLIC LANDING PAGE  (Landing v4)
   Composes the design-bundle marketing surfaces in their canonical order:
     DesignNav → DesignHero → DesignPillars → DesignJourney →
     DesignTogether → DesignStudio → DesignOccasions → DesignDayOf →
     DesignTestimonials → DesignPricing → DesignCTAFooter
   The hero owns the occasion + names state; it flows into the Studio
   playground and the occasion gallery so the whole page speaks one
   occasion at a time. Each CTA fans out to the wizard via onGetStarted.

   Brand atoms mounted here (BRAND.md §3):
   - `.pl-grain` paper texture on the page wrapper.
   - `<Thread />` two-strand dividers between the major light sections.
   - A global prefers-reduced-motion guard for `.pd-anim` atoms.
   ======================================================================== */

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { DesignNav } from '@/components/marketing/design/DesignNav';
import { DesignHero } from '@/components/marketing/design/DesignHero';
import { DesignPillars } from '@/components/marketing/design/DesignPillars';
import { DesignJourney } from '@/components/marketing/design/DesignJourney';
import { DesignTogether } from '@/components/marketing/design/DesignTogether';
import { DesignStudio } from '@/components/marketing/design/DesignStudio';
import { DesignOccasions } from '@/components/marketing/design/DesignOccasions';
import { DesignDayOf } from '@/components/marketing/design/DesignDayOf';
import { DesignTestimonials } from '@/components/marketing/design/DesignTestimonials';
import { DesignPricing } from '@/components/marketing/design/DesignPricing';
import { DesignCTAFooter } from '@/components/marketing/design/DesignCTAFooter';
import { OCC, type OccasionKey } from '@/components/marketing/design/landing-data';
import { PD } from '@/components/marketing/design/DesignAtoms';
import { Thread } from '@/components/brand/Thread';
import { GrooveMotion } from '@/components/brand/groove';

/** Quiet two-strand thread rule between major light sections. */
function ThreadDivider() {
  return (
    <div aria-hidden style={{ maxWidth: 320, margin: '8px auto', padding: '0 24px' }}>
      <Thread variant="weave" height={12} color={PD.olive} color2={PD.gold} />
    </div>
  );
}

export default function LandingPageWrapper() {
  const router = useRouter();

  // The occasion + names live here so the hero switcher re-keys the
  // Studio preview and the occasion gallery in lock-step.
  const [occ, setOcc] = useState<OccasionKey>('wedding');
  const [names, setNames] = useState('Mira & Jun');

  // Publish the occasion accent as --occ / --occ2 so any section that
  // wants the current voice can read it.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--occ', OCC[occ].accent);
    root.style.setProperty('--occ2', OCC[occ].accent2);
  }, [occ]);

  const onGetStarted = useCallback(() => {
    // The signature weave: two paper panels close, olive + gold threads
    // draw the seam, and we navigate under the cover (BRAND §6). Reduced
    // motion / missing engine falls straight through to an instant push.
    const motion = (window as Window & {
      PearloomMotion?: {
        weave?: (onPeak: () => void, opts?: { duration?: number }) => void;
        reduced?: boolean;
      };
    }).PearloomMotion;
    if (motion?.weave && !motion.reduced) {
      motion.weave(() => router.push('/wizard/new'), { duration: 520 });
      return;
    }
    router.push('/wizard/new');
  }, [router]);

  useEffect(() => {
    (window as Window & { PearloomMotion?: { init?: () => void } }).PearloomMotion?.init?.();
  }, []);

  return (
    <GrooveMotion>
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
        <DesignHero
          occ={occ}
          setOcc={setOcc}
          names={names}
          setNames={setNames}
          onType={setNames}
          onGetStarted={onGetStarted}
        />

        {/* Sections thread in on scroll via the motion engine
            (public/pearloom-motion.js → data-reveal), reduced-motion safe. */}
        <div data-reveal="up">
          <DesignPillars />
        </div>

        <DesignJourney />

        <div data-reveal="up" style={{ scrollMarginTop: 96 }}>
          <DesignTogether onGetStarted={onGetStarted} />
        </div>

        <ThreadDivider />
        <div data-reveal="up" style={{ scrollMarginTop: 96 }}>
          <DesignStudio occ={occ} names={names} />
        </div>

        <ThreadDivider />
        <div data-reveal="up" style={{ scrollMarginTop: 96 }}>
          <DesignOccasions onGetStarted={onGetStarted} />
        </div>

        <ThreadDivider />
        <div data-reveal="up" style={{ scrollMarginTop: 96 }}>
          <DesignDayOf />
        </div>

        <div data-reveal="up">
          <DesignTestimonials />
        </div>

        <div data-reveal="rise" id="pricing" style={{ scrollMarginTop: 96 }}>
          <DesignPricing onGetStarted={onGetStarted} />
        </div>

        <div data-reveal="up">
          <DesignCTAFooter onGetStarted={onGetStarted} />
        </div>

        <style jsx global>{`
          /* ── Landing palette variables (PD reads var(--pd-*, <hex>)) ──
             Light values here; editorial-midnight under [data-theme='dark']
             (set before paint by layout.tsx's boot script, or the hero's
             Daylight/Midnight toggle). BRAND §10: warm dark paper, cream
             ink, brightened olive, warmed gold — never OLED black. */
          main.pd-landing {
            --pd-paper: #fdfaf0;
            --pd-paper2: #f7f0e0;
            --pd-paper3: #f7f0e0;
            --pd-paperCard: #fbf7ee;
            --pd-paperDeep: #f7f0e0;
            --pd-ink: #18181b;
            --pd-inkSoft: #4a5642;
            --pd-olive: #5c6b3f;
            --pd-oliveDeep: #363f22;
            --pd-gold: #c19a4b;
            --pd-terra: #c6703d;
            --pd-rose: #d9a89e;
            --pd-plum: #7a2d2d;
            --pd-stone: #c8bfa5;
            --pd-line: #e2d9c3;
            --pd-sand: #e8dcb4;
            --pd-wash: #e8d9d3;
            --pd-blush: #e3dcc0;
            --pd-mint: #dcdfb8;
            --pd-slab: #0e0d0b;
            --pd-slabInk: #f5efe2;
            --pd-glass: rgba(244, 236, 216, 0.78);
            --pd-shadow: #1f2418;
            --pd-wordmark: #2c3022;
            --pd-wash-fade: 1;
            --pd-btn-ink-bg: #1f2418;
            --pd-btn-ink-fg: #f4ecd8;
            --pd-btn-ink-hover: #4c5a26;
            --pd-btn-paper-bg: #f4ecd8;
            --pd-btn-paper-fg: #1f2418;
            --pd-btn-paper-hover: #eadfc4;
            color-scheme: light;
          }
          :global(html[data-theme='dark']) main.pd-landing {
            --pd-paper: #0d0b07;
            --pd-paper2: #15110a;
            --pd-paper3: #15110a;
            --pd-paperCard: #1a1610;
            --pd-paperDeep: #15110a;
            --pd-ink: #f1ebdc;
            --pd-inkSoft: #d4cdbc;
            --pd-olive: #a4b57a;
            --pd-oliveDeep: #8a9a60;
            --pd-gold: #d4b373;
            --pd-terra: #d67852;
            --pd-rose: #c08a7e;
            --pd-plum: #c46a6a;
            --pd-stone: #6e6553;
            --pd-line: #2a241a;
            --pd-sand: #2b2412;
            --pd-wash: #2a1f1c;
            --pd-blush: #2a2418;
            --pd-mint: #232813;
            --pd-slab: #1a1610;
            --pd-slabInk: #f1ebdc;
            --pd-glass: rgba(26, 22, 16, 0.8);
            --pd-shadow: #000000;
            --pd-wordmark: #332c1d;
            --pd-wash-fade: 0.35;
            --pd-btn-ink-bg: #f1ebdc;
            --pd-btn-ink-fg: #0d0b07;
            --pd-btn-ink-hover: #d4cdbc;
            --pd-btn-paper-bg: #1a1610;
            --pd-btn-paper-fg: #f1ebdc;
            --pd-btn-paper-hover: #221c13;
            color-scheme: dark;
          }
          :global(html[data-theme='dark']) main.pd-landing.pl-grain::before {
            mix-blend-mode: screen;
            opacity: 0.18;
          }
          :global(html[data-theme='dark']) main.pd-landing .pl-letterpress {
            text-shadow: 0 -1px 0 rgba(0, 0, 0, 0.55), 0 1px 1px rgba(255, 248, 230, 0.04);
          }
          main.pd-landing.pl-grain::before {
            z-index: 1;
          }
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
    </GrooveMotion>
  );
}
