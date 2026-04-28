'use client';

// ─────────────────────────────────────────────────────────────
// BackgroundCookPill — small floating "Pear is preparing things
// in the background" indicator shown at the bottom of the
// wizard while the speculative cook (decor library, etc.) is
// running. Once everything's ready, the pill morphs into a
// quiet "Ready when you are" confirmation that fades after 4s.
// Skip rendering on the first wizard step so it doesn't appear
// before the host has any context to support it.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { Pear } from '../motifs';

interface Props {
  cooking: boolean;
  ready: boolean;
}

export function BackgroundCookPill({ cooking, ready }: Props) {
  // After ready transitions true, leave the confirmation visible
  // briefly then fade. This avoids a permanent "ready" badge
  // hanging around through later wizard steps.
  const [showReady, setShowReady] = useState(false);
  useEffect(() => {
    if (!ready) {
      setShowReady(false);
      return;
    }
    setShowReady(true);
    const t = setTimeout(() => setShowReady(false), 4000);
    return () => clearTimeout(t);
  }, [ready]);

  if (!cooking && !showReady) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 24,
        transform: 'translateX(-50%)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 16px 10px 12px',
        background: 'var(--pl-cream-card, #FBF7EE)',
        border: '1px solid var(--pl-divider, #D8CFB8)',
        borderRadius: 999,
        boxShadow: '0 14px 32px rgba(14,13,11,0.16)',
        zIndex: 70,
        fontFamily: 'var(--pl-font-display, "Fraunces", Georgia, serif)',
        fontStyle: 'italic',
        fontSize: 13.5,
        color: 'var(--pl-ink, #0E0D0B)',
        animation: 'pl-cook-pill-rise 320ms cubic-bezier(0.22, 1, 0.36, 1)',
        maxWidth: 'calc(100vw - 32px)',
      }}
    >
      <span
        aria-hidden
        style={{
          flexShrink: 0,
          animation: cooking ? 'pl-cook-pill-breathe 2s ease-in-out infinite' : 'none',
          transformOrigin: 'center bottom',
        }}
      >
        <Pear size={20} tone="sage" sparkle={cooking} shadow={false} />
      </span>
      <span style={{ letterSpacing: '-0.005em' }}>
        {cooking ? 'Pear is preparing things in the background…' : 'Ready when you are.'}
      </span>
      <style jsx global>{`
        @keyframes pl-cook-pill-rise {
          from { opacity: 0; transform: translate(-50%, 8px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes pl-cook-pill-breathe {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.06); }
        }
        @media (prefers-reduced-motion: reduce) {
          [role="status"][aria-live="polite"] { animation: none !important; }
          [role="status"][aria-live="polite"] > span { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
