'use client';

// ─────────────────────────────────────────────────────────────
// PearWelcome — fires once on the first editor load for a site
// (per-slug localStorage flag). A small floating Pear bubble
// pops up at the bottom-right of the canvas and offers to
// either (a) open Pear + walk the host through what's empty,
// or (b) dismiss + start editing solo.
//
// Subsequent visits never see this — the welcome flag is
// permanent unless the host explicitly clears it.
//
// Voice: warm, brief, doesn't hijack the editor. Honours
// prefers-reduced-motion.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { Pear } from '../motifs';

interface Props {
  siteSlug: string;
  /** Open the Pear Companion when the host accepts the tour. */
  onAccept: () => void;
}

export function PearWelcome({ siteSlug, onAccept }: Props) {
  const [show, setShow] = useState(false);
  const memoryKey = `pearloom:pear-welcome:${siteSlug}`;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const seen = window.localStorage.getItem(memoryKey);
      if (seen) return;
      // Defer briefly so the welcome doesn't compete with the
      // editor's own first-paint chrome.
      const t = setTimeout(() => setShow(true), 1200);
      return () => clearTimeout(t);
    } catch { /* ignore quota / private mode */ }
  }, [memoryKey]);

  function dismiss() {
    setShow(false);
    try { window.localStorage.setItem(memoryKey, '1'); } catch { /* ignore */ }
  }

  function accept() {
    dismiss();
    onAccept();
  }

  if (!show) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pear says hello"
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 90,
        width: 'min(340px, calc(100vw - 32px))',
        background: 'var(--cream, #FBF7EE)',
        border: '1px solid var(--card-ring, rgba(61,74,31,0.16))',
        borderRadius: 18,
        boxShadow: '0 24px 60px rgba(14,13,11,0.22), 0 4px 12px rgba(14,13,11,0.06)',
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        animation: 'pl-pear-welcome-rise 380ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div
          aria-hidden
          style={{
            flexShrink: 0,
            animation: 'pl-pear-welcome-breathe 4s ease-in-out infinite',
            transformOrigin: 'center bottom',
          }}
        >
          <Pear size={36} tone="sage" sparkle shadow={false} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--peach-ink, #C6703D)',
              fontFamily: 'var(--font-ui)',
            }}
          >
            Pear
          </div>
          <p
            style={{
              margin: '2px 0 0',
              fontFamily: 'var(--font-display, "Fraunces", Georgia, serif)',
              fontStyle: 'italic',
              fontSize: 15,
              lineHeight: 1.45,
              color: 'var(--ink)',
              letterSpacing: '-0.005em',
            }}
          >
            Hi — I'm Pear. Want me to walk through what your site has and what's still missing?
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          type="button"
          onClick={accept}
          style={{
            flex: 1,
            padding: '9px 14px',
            borderRadius: 999,
            background: 'var(--ink, #0E0D0B)',
            color: 'var(--cream, #FBF7EE)',
            border: 'none',
            fontSize: 12.5,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'var(--font-ui)',
          }}
        >
          Yes, please
        </button>
        <button
          type="button"
          onClick={dismiss}
          style={{
            padding: '9px 14px',
            borderRadius: 999,
            background: 'transparent',
            color: 'var(--ink-soft)',
            border: '1px solid var(--line)',
            fontSize: 12.5,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'var(--font-ui)',
          }}
        >
          I'll explore
        </button>
      </div>
      <style jsx global>{`
        @keyframes pl-pear-welcome-rise {
          from { opacity: 0; transform: translateY(16px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes pl-pear-welcome-breathe {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.05); }
        }
        @media (prefers-reduced-motion: reduce) {
          [aria-label="Pear says hello"] { animation: none !important; }
          [aria-label="Pear says hello"] > div > div { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
