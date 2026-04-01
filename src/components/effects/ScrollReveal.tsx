'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / effects/ScrollReveal.tsx
// Injects a <style> tag with CSS @keyframes + IntersectionObserver
// triggering class that animates elements as they scroll into view.
//
// Usage: mount <ScrollRevealInjector> once in ThemeProvider.
// All elements with data-pl-reveal attribute will animate.
// The observer is attached globally — no per-element React needed.
// ─────────────────────────────────────────────────────────────

import { useEffect } from 'react';

type RevealAnimation = 'none' | 'fade' | 'slide-up' | 'slide-left' | 'zoom' | 'blur-in';

interface ScrollRevealInjectorProps {
  animation: RevealAnimation;
}

const KEYFRAMES: Record<Exclude<RevealAnimation, 'none'>, string> = {
  fade: `
    @keyframes pl-reveal-fade {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    [data-pl-reveal] { opacity: 0; }
    [data-pl-reveal].pl-revealed { animation: pl-reveal-fade 0.7s cubic-bezier(0.16,1,0.3,1) forwards; }
  `,
  'slide-up': `
    @keyframes pl-reveal-slide-up {
      from { opacity: 0; transform: translateY(40px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    [data-pl-reveal] { opacity: 0; transform: translateY(40px); }
    [data-pl-reveal].pl-revealed { animation: pl-reveal-slide-up 0.75s cubic-bezier(0.16,1,0.3,1) forwards; }
  `,
  'slide-left': `
    @keyframes pl-reveal-slide-left {
      from { opacity: 0; transform: translateX(-40px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    [data-pl-reveal] { opacity: 0; transform: translateX(-40px); }
    [data-pl-reveal].pl-revealed { animation: pl-reveal-slide-left 0.75s cubic-bezier(0.16,1,0.3,1) forwards; }
  `,
  zoom: `
    @keyframes pl-reveal-zoom {
      from { opacity: 0; transform: scale(0.88); }
      to   { opacity: 1; transform: scale(1); }
    }
    [data-pl-reveal] { opacity: 0; transform: scale(0.88); }
    [data-pl-reveal].pl-revealed { animation: pl-reveal-zoom 0.65s cubic-bezier(0.16,1,0.3,1) forwards; }
  `,
  'blur-in': `
    @keyframes pl-reveal-blur {
      from { opacity: 0; filter: blur(16px); transform: scale(1.04); }
      to   { opacity: 1; filter: blur(0px); transform: scale(1); }
    }
    [data-pl-reveal] { opacity: 0; filter: blur(16px); }
    [data-pl-reveal].pl-revealed { animation: pl-reveal-blur 0.85s cubic-bezier(0.16,1,0.3,1) forwards; }
  `,
};

export function ScrollRevealInjector({ animation }: ScrollRevealInjectorProps) {
  // Attach IntersectionObserver to all [data-pl-reveal] elements
  useEffect(() => {
    if (animation === 'none') {
      // Remove any lingering classes if disabled mid-session
      document.querySelectorAll('[data-pl-reveal]').forEach(el => {
        el.classList.remove('pl-revealed');
        (el as HTMLElement).style.opacity = '';
        (el as HTMLElement).style.transform = '';
      });
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // Stagger children if the revealed element has data-pl-stagger
            const el = entry.target as HTMLElement;
            const delay = el.dataset.plDelay ?? '0';
            el.style.animationDelay = `${delay}ms`;
            el.classList.add('pl-revealed');
            io.unobserve(el); // fire once
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );

    const observe = () => {
      document.querySelectorAll('[data-pl-reveal]').forEach(el => {
        if (!el.classList.contains('pl-revealed')) {
          io.observe(el);
        }
      });
    };

    observe();

    // Re-observe on DOM mutations (dynamically added sections)
    const mo = new MutationObserver(observe);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [animation]);

  if (animation === 'none') return null;

  const css = KEYFRAMES[animation as Exclude<RevealAnimation, 'none'>];
  return <style>{css}</style>;
}
