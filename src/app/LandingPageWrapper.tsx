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
import { WovenDivider } from '@/components/marketing/design/WovenDivider';
import { ThreeActsStage } from '@/components/marketing/design/ThreeActsStage';
import { DesignOccasions } from '@/components/marketing/design/DesignOccasions';
import { DesignTogether } from '@/components/marketing/design/DesignTogether';
import { DesignPricing } from '@/components/marketing/design/DesignPricing';
import { DesignTestimonials } from '@/components/marketing/design/DesignTestimonials';
import { DesignFAQ } from '@/components/marketing/design/DesignFAQ';
import { DesignCTAFooter } from '@/components/marketing/design/DesignCTAFooter';
import { PD } from '@/components/marketing/design/DesignAtoms';
import { Thread } from '@/components/brand/Thread';

/** Quiet two-strand thread rule between major sections (BRAND.md §3).
 *  Strand colors route through the landing's --pd-* variables so the
 *  olive brightens / gold warms in editorial-midnight dark mode (the
 *  global --pl tokens stay light here — the landing has no
 *  [data-theme] ancestor). */
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
      <Thread variant="weave" height={12} color={PD.olive} color2={PD.gold} />
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
      {/* The loom passes through the page — one continuous thread
          from the hero into the three acts. */}
      <WovenDivider />
      <section id="acts" style={{ scrollMarginTop: 96 }}>
        <ThreeActsStage />
      </section>
      <section id="occasions" style={{ scrollMarginTop: 96 }}>
        <DesignOccasions onGetStarted={onGetStarted} />
      </section>
      <ThreadDivider />
      <section id="together" style={{ scrollMarginTop: 96 }}>
        <DesignTogether onGetStarted={onGetStarted} />
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
        /* ── Landing palette variables ─────────────────────────────
           The PD object in DesignAtoms reads every themed entry as
           var(--pd-*, <light hex>). The variables are defined here,
           scoped to the landing root, with editorial-midnight dark
           values under prefers-color-scheme (no toggle — the landing
           follows the system; it carries no theme state). BRAND.md
           §10: warm dark paper, cream ink, brightened olive, warmed
           gold — never OLED black. Values mirror the product's
           [data-theme='dark'] tokens in globals.css. */
        main.pd-landing {
          --pd-paper: #f5efe2;
          --pd-paper2: #ebe3d2;
          --pd-paper3: #ebe3d2;
          --pd-paperCard: #fbf7ee;
          --pd-paperDeep: #ebe3d2;
          --pd-ink: #0e0d0b;
          --pd-inkSoft: #3a332c;
          --pd-olive: #5c6b3f;
          --pd-oliveDeep: #363f22;
          --pd-gold: #c19a4b;
          --pd-terra: #c6703d;
          --pd-rose: #d9a89e;
          --pd-plum: #7a2d2d;
          --pd-stone: #c8bfa5;
          --pd-line: #d8cfb8;
          --pd-sand: #e8dcb4;
          --pd-wash: #e8d9d3;
          --pd-blush: #e3dcc0;
          --pd-mint: #dcdfb8;
          /* Ink-slab surfaces (testimonials, footer): equal ink/paper
             in light mode; lift above the page paper in dark. */
          --pd-slab: #0e0d0b;
          --pd-slabInk: #f5efe2;
          /* Floating chrome (nav pill, occasion switcher). */
          --pd-glass: rgba(244, 236, 216, 0.78);
          /* Shadow base — warm ink in light, black in dark. */
          --pd-shadow: #1f2418;
          /* Giant footer wordmark — barely-there tone on the slab. */
          --pd-wordmark: #2c3022;
          /* Multiplier on the big decorative mascot-tone blobs —
             dampened in dark so constant pear/butter washes don't
             glow against midnight paper. */
          --pd-wash-fade: 1;
          /* PLButton variants that must restate themselves at night. */
          --pd-btn-ink-bg: #1f2418;
          --pd-btn-ink-fg: #f4ecd8;
          --pd-btn-ink-hover: #4c5a26;
          --pd-btn-paper-bg: #f4ecd8;
          --pd-btn-paper-fg: #1f2418;
          --pd-btn-paper-hover: #eadfc4;
          color-scheme: light;
        }
        @media (prefers-color-scheme: dark) {
          main.pd-landing {
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
          /* Grain: globals.css flips [data-theme='dark'] .pl-grain to
             a screen blend, but the landing themes via media query —
             mirror it here so the multiply grain doesn't go muddy on
             midnight paper. */
          main.pd-landing.pl-grain::before {
            mix-blend-mode: screen;
            opacity: 0.18;
          }
          /* Letterpress: mirror the [data-theme='dark'] variant —
             press INTO the dark paper (deep top bevel, faint warm
             under-light) instead of the light-mode emboss. */
          main.pd-landing .pl-letterpress {
            text-shadow:
              0 -1px 0 rgba(0, 0, 0, 0.55),
              0 1px 1px rgba(255, 248, 230, 0.04);
          }
        }

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
