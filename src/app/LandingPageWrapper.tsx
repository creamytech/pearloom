'use client';

/* ========================================================================
   PEARLOOM — PUBLIC LANDING PAGE  (Landing v4)
   Composes the design-bundle marketing surfaces in their canonical order:
     DesignNav → DesignHero → DesignPillars → DesignJourney →
     DesignTogether → DesignStudio → DesignGallery → DesignDayOf →
     DesignTestimonials → DesignPricing → DesignCTAFooter
   The hero owns the occasion + names; they flow into the Studio playground
   and the occasion gallery so the whole page speaks one occasion at a time.

   Scroll reveal is the design's own [data-rv] system: elements start
   opacity:1 (no-JS + reduced-motion safe), and under
   prefers-reduced-motion:no-preference they thread in (translateY + blur)
   when an IntersectionObserver adds .rv-in. No paper grain over the page —
   the hero carries its own; the sections are clean paper.
   ======================================================================== */

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { DesignNav } from '@/components/marketing/design/DesignNav';
import { DesignHero } from '@/components/marketing/design/DesignHero';
import { DesignPillars } from '@/components/marketing/design/DesignPillars';
import { DesignJourney } from '@/components/marketing/design/DesignJourney';
import { DesignTogether } from '@/components/marketing/design/DesignTogether';
import { DesignStudio } from '@/components/marketing/design/DesignStudio';
import { DesignGallery } from '@/components/marketing/design/DesignGallery';
import { DesignDayOf } from '@/components/marketing/design/DesignDayOf';
import { DesignTestimonials } from '@/components/marketing/design/DesignTestimonials';
import { DesignPricing } from '@/components/marketing/design/DesignPricing';
import { DesignCTAFooter } from '@/components/marketing/design/DesignCTAFooter';
import { OCC, type OccasionKey } from '@/components/marketing/design/landing-data';
import { PD } from '@/components/marketing/design/DesignAtoms';
import { Thread } from '@/components/brand/Thread';
import { GrooveMotion } from '@/components/brand/groove';
import { ThreadSpine } from '@/components/marketing/design/ThreadSpine';

function ThreadDivider() {
  return (
    <div aria-hidden style={{ maxWidth: 320, margin: '8px auto', padding: '0 24px' }}>
      <Thread variant="weave" height={12} color={PD.olive} color2={PD.gold} />
    </div>
  );
}

export default function LandingPageWrapper() {
  const router = useRouter();
  const [occ, setOcc] = useState<OccasionKey>('wedding');
  const [names, setNames] = useState('Mira & Jun');

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--occ', OCC[occ].accent);
    root.style.setProperty('--occ2', OCC[occ].accent2);
  }, [occ]);

  // The design's own scroll-reveal: observe every [data-rv] and add .rv-in
  // when it enters the viewport. Viewport-based, so it's robust under the
  // Lenis smooth-scroll wrapper. Idempotent across client navigation.
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-rv]'));
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('rv-in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('rv-in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: '0px 0px -8% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const onGetStarted = useCallback((prefill?: { names?: string; occ?: OccasionKey }) => {
    /* The hero passes { names, occ }; every other CTA calls this
       bare (or with a click event) — only honor a real prefill.
       Landing tab keys map to registry occasion ids; the wizard's
       ?occasion= deep link means "start a new site of this kind",
       so it only rides an EXPLICIT tab pick (never the rotation). */
    const OCC_TO_WIZARD: Record<OccasionKey, string> = {
      wedding: 'wedding', milestone: 'milestone-birthday', memorial: 'memorial',
      baby: 'baby-shower', reunion: 'reunion',
    };
    const p = prefill && typeof prefill === 'object' && ('names' in prefill || 'occ' in prefill) ? prefill : undefined;
    const params = new URLSearchParams();
    if (p?.names) params.set('names', p.names);
    if (p?.occ && OCC_TO_WIZARD[p.occ]) params.set('occasion', OCC_TO_WIZARD[p.occ]);
    const qs = params.toString();
    const href = qs ? `/wizard/new?${qs}` : '/wizard/new';
    const motion = (window as Window & {
      PearloomMotion?: {
        weave?: (onPeak: () => void, opts?: { duration?: number }) => void;
        reduced?: boolean;
      };
    }).PearloomMotion;
    if (motion?.weave && !motion.reduced) {
      motion.weave(() => router.push(href), { duration: 520 });
      return;
    }
    router.push(href);
  }, [router]);

  // The re-press (RADICAL-DESIGN-DIRECTIONS §C): an EXPLICIT occasion
  // pick doesn't just swap an accent — the whole page re-presses into
  // the new occasion through the weave wipe, with the swap at the
  // wipe's covered peak so the reader never sees a half-changed page.
  // The hero's ambient auto-rotation passes an updater function — that
  // stays a quiet instant swap (a full-screen wipe every few idle
  // seconds would be unbearable). Reduced motion / no engine → instant.
  const changeOcc = useCallback((next: OccasionKey | ((prev: OccasionKey) => OccasionKey)) => {
    if (typeof next === 'function') {
      setOcc(next); // ambient rotation — never theatrical
      return;
    }
    setOcc((prev) => {
      if (next === prev) return prev;
      const motion = (window as Window & {
        PearloomMotion?: {
          weave?: (onPeak: () => void, opts?: { duration?: number }) => void;
          reduced?: boolean;
        };
      }).PearloomMotion;
      if (motion?.weave && !motion.reduced) {
        motion.weave(() => setOcc(next), { duration: 420 });
        return prev; // the weave's peak performs the swap
      }
      return next;
    });
  }, []);

  return (
    // Native scroll on the landing: the smooth-scroll (Lenis) layer
    // visibly stalls ("hangs up") whenever a frame drops on this
    // heavy page (hero ken-burns, the fixed glass nav's backdrop
    // blur, the scroll-reveal layers). The browser's native scroll
    // never does that. Scroll-linked effects (reveal observer,
    // ripening pear, tracing thread) all read native scroll fine.
    <GrooveMotion disabled>
      <main
        className="pd-landing"
        style={{
          background: PD.paper,
          color: PD.ink,
          minHeight: '100vh',
          fontFamily: 'var(--pl-font-body)',
          position: 'relative',
          overflowX: 'hidden',
        }}
      >
        <ThreadSpine />
        <DesignNav onGetStarted={onGetStarted} />
        <DesignHero
          occ={occ}
          setOcc={changeOcc}
          names={names}
          setNames={setNames}
          onType={setNames}
          onGetStarted={onGetStarted}
        />

        <div data-rv>
          <DesignPillars />
        </div>

        <DesignJourney />

        <div data-rv style={{ scrollMarginTop: 96 }}>
          <DesignTogether onGetStarted={onGetStarted} />
        </div>

        <ThreadDivider />
        <div data-rv style={{ scrollMarginTop: 96 }}>
          <DesignStudio occ={occ} names={names} />
        </div>

        <ThreadDivider />
        <DesignGallery onPickOccasion={changeOcc} />

        <ThreadDivider />
        <div data-rv style={{ scrollMarginTop: 96 }}>
          <DesignDayOf />
        </div>

        <div data-rv>
          <DesignTestimonials />
        </div>

        <div id="pricing" style={{ scrollMarginTop: 96 }}>
          <DesignPricing onGetStarted={onGetStarted} />
        </div>

        <div data-rv>
          <DesignCTAFooter onGetStarted={onGetStarted} />
        </div>

        <style jsx global>{`
          /* ── Landing palette variables (PD reads var(--pd-*, <hex>)) ── */
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
          :global(html[data-theme='dark']) main.pd-landing .pl-letterpress {
            text-shadow: 0 -1px 0 rgba(0, 0, 0, 0.55), 0 1px 1px rgba(255, 248, 230, 0.04);
          }

          /* ── The design's scroll-reveal ─────────────────────────────
             Default visible (no-JS + reduced-motion safe). Under
             no-preference, [data-rv] threads in when JS adds .rv-in. */
          main.pd-landing [data-rv] {
            opacity: 1;
          }
          @media (prefers-reduced-motion: no-preference) {
            main.pd-landing [data-rv] {
              opacity: 0;
              transform: translateY(30px);
              transition: opacity 1s var(--pl-ease-emphasis, cubic-bezier(0.2, 0.8, 0.2, 1)),
                transform 1s var(--pl-ease-emphasis, cubic-bezier(0.2, 0.8, 0.2, 1));
              transition-delay: var(--rv-d, 0ms);
              /* No lingering will-change — it would leave every reveal
                 section promoted to its own compositor layer for the
                 life of the page, which compounds scroll stutter. */
            }
            main.pd-landing [data-rv].rv-in {
              opacity: 1;
              transform: none;
            }
            /* The soft blur-in is a compositor-expensive filter to
               animate across a full section. On touch devices, a batch
               of sections blurring in as you scroll down is the main
               reason scrolling back up "hangs" a second later. Keep the
               blur for fine-pointer (desktop) only; touch gets the
               cheaper opacity + rise, which reads nearly identical. */
            @media (pointer: fine) {
              main.pd-landing [data-rv] {
                filter: blur(6px);
                transition: opacity 1s var(--pl-ease-emphasis, cubic-bezier(0.2, 0.8, 0.2, 1)),
                  transform 1s var(--pl-ease-emphasis, cubic-bezier(0.2, 0.8, 0.2, 1)), filter 0.8s ease;
              }
              main.pd-landing [data-rv].rv-in {
                filter: blur(0);
              }
            }
          }
          @media (prefers-reduced-motion: reduce) {
            .pd-anim,
            .pd-anim * {
              animation: none !important;
            }
          }
        `}</style>
      </main>
    </GrooveMotion>
  );
}
