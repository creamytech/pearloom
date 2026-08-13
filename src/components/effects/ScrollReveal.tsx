'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / effects/ScrollReveal.tsx
//
// Two modes:
//   1. Global  — ThemeProvider mounts <ScrollRevealInjector> when
//                theme.effects.scrollReveal is set; applies that
//                animation to every [data-pl-reveal] element that
//                has no specific value.
//   2. Per-block — each block wrapper gets data-pl-reveal="slide-up"
//                (or whichever style) set directly on the element;
//                the CSS selectors target the specific value.
//
// CSS always emits all 5 keyframe sets so any combination works.
// The IntersectionObserver fires once per element, adds .pl-revealed.
// ─────────────────────────────────────────────────────────────

import { useEffect } from 'react';

export type RevealAnimation = 'none' | 'fade' | 'slide-up' | 'slide-left' | 'zoom' | 'blur-in';

// All keyframes + per-value selectors emitted together so any
// data-pl-reveal="X" works regardless of global theme setting.
const ALL_REVEAL_CSS = `
  @keyframes pl-rv-fade {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes pl-rv-slide-up {
    from { opacity: 0; transform: translateY(44px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pl-rv-slide-left {
    from { opacity: 0; transform: translateX(-44px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes pl-rv-zoom {
    from { opacity: 0; transform: scale(0.87); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes pl-rv-blur {
    from { opacity: 0; filter: blur(18px); transform: scale(1.04); }
    to   { opacity: 1; filter: blur(0); transform: scale(1); }
  }

  /* Initial hidden states — keyed by data attribute value */
  [data-pl-reveal="fade"]      { opacity: 0; }
  [data-pl-reveal="slide-up"]  { opacity: 0; transform: translateY(44px); }
  [data-pl-reveal="slide-left"]{ opacity: 0; transform: translateX(-44px); }
  [data-pl-reveal="zoom"]      { opacity: 0; transform: scale(0.87); }
  [data-pl-reveal="blur-in"]   { opacity: 0; filter: blur(18px); }

  /* Revealed states */
  [data-pl-reveal="fade"].pl-revealed       { animation: pl-rv-fade      0.7s  cubic-bezier(0.16,1,0.3,1) forwards; }
  [data-pl-reveal="slide-up"].pl-revealed   { animation: pl-rv-slide-up  0.75s cubic-bezier(0.16,1,0.3,1) forwards; }
  [data-pl-reveal="slide-left"].pl-revealed { animation: pl-rv-slide-left 0.75s cubic-bezier(0.16,1,0.3,1) forwards; }
  [data-pl-reveal="zoom"].pl-revealed       { animation: pl-rv-zoom      0.65s cubic-bezier(0.16,1,0.3,1) forwards; }
  [data-pl-reveal="blur-in"].pl-revealed    { animation: pl-rv-blur      0.85s cubic-bezier(0.16,1,0.3,1) forwards; }
`;

interface ScrollRevealInjectorProps {
  /** The global fallback animation. Pass 'none' to disable the global default
   *  while still supporting per-block data-pl-reveal attributes. */
  animation: RevealAnimation;
}

export function ScrollRevealInjector({ animation }: ScrollRevealInjectorProps) {
  useEffect(() => {
    if (animation === 'none') {
      // Remove lingering classes + inline styles from any previously activated elements
      document.querySelectorAll('[data-pl-reveal]').forEach(el => {
        el.classList.remove('pl-revealed');
        (el as HTMLElement).style.opacity = '';
        (el as HTMLElement).style.transform = '';
        (el as HTMLElement).style.filter = '';
      });
      return;
    }

    const io = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          const delay = el.dataset.plDelay ?? '0';
          el.style.animationDelay = `${delay}ms`;
          el.classList.add('pl-revealed');
          io.unobserve(el);
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );

    const scan = () => {
      document.querySelectorAll('[data-pl-reveal]').forEach(el => {
        if (!el.classList.contains('pl-revealed')) io.observe(el);
      });
    };

    scan();
    // Debounce MutationObserver to avoid scan-on-every-mutation jank
    let rafId: number;
    const mo = new MutationObserver(() => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(scan);
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => { io.disconnect(); mo.disconnect(); cancelAnimationFrame(rafId); };
  }, [animation]);

  // Always emit all CSS so per-block values work even if global is 'none'
  // (skip only when the entire effects system is completely off)
  if (animation === 'none') return null;

  return <style>{ALL_REVEAL_CSS}</style>;
}

// Separate lightweight injector for when only per-block reveals are used
// (no global animation set). Mount this in the site page unconditionally
// whenever any block has blockEffects.scrollReveal set.
export function PerBlockRevealCSS() {
  useEffect(() => {
    const io = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          el.style.animationDelay = `${el.dataset.plDelay ?? '0'}ms`;
          el.classList.add('pl-revealed');
          io.unobserve(el);
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );

    const scan = () => {
      document.querySelectorAll('[data-pl-reveal]').forEach(el => {
        if (!el.classList.contains('pl-revealed')) io.observe(el);
      });
    };
    scan();
    let rafId: number;
    const mo = new MutationObserver(() => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(scan);
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); cancelAnimationFrame(rafId); };
  }, []);

  return <style>{ALL_REVEAL_CSS}</style>;
}
