'use client';

// ─────────────────────────────────────────────────────────────
// BackToTop — paper-styled floating "back to top" pill that
// appears once the guest has scrolled past 60% of the page. The
// position is fixed in the bottom-right corner so it never gets
// in the way of the sticky RSVP CTA on the bottom-centre of
// mobile. Pearloom voice — Fraunces italic micro-label that
// reads "to the top" without an arrow icon (BRAND.md wants verbs
// that fit the metaphor; "scroll up" felt too SaaS).
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';

export function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let raf: number | null = null;
    function check() {
      raf = null;
      const doc = document.documentElement;
      const total = doc.scrollHeight - doc.clientHeight;
      if (total <= 0) {
        setShow(false);
        return;
      }
      const ratio = doc.scrollTop / total;
      setShow(ratio > 0.6);
    }
    function onScroll() {
      if (raf != null) return;
      raf = window.requestAnimationFrame(check);
    }
    check();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf != null) window.cancelAnimationFrame(raf);
    };
  }, []);

  function handleClick() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <button
      type="button"
      aria-label="Back to top"
      onClick={handleClick}
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 70,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 16px 10px 14px',
        borderRadius: 999,
        background: 'var(--paper, #FBF7EE)',
        color: 'var(--ink)',
        border: '1px solid var(--card-ring, rgba(61,74,31,0.18))',
        boxShadow: '0 14px 30px -8px rgba(14,13,11,0.22), 0 4px 8px -2px rgba(14,13,11,0.06)',
        cursor: 'pointer',
        fontFamily: 'var(--font-display, "Fraunces", Georgia, serif)',
        fontStyle: 'italic',
        fontWeight: 500,
        fontSize: 13,
        letterSpacing: '-0.005em',
        opacity: show ? 1 : 0,
        pointerEvents: show ? 'auto' : 'none',
        transform: show ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 280ms cubic-bezier(0.22, 1, 0.36, 1), transform 280ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <span
        aria-hidden
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 22,
          height: 22,
          borderRadius: 999,
          background: 'var(--peach-ink, #C6703D)',
          color: '#FFFFFF',
        }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </span>
      to the top
    </button>
  );
}
