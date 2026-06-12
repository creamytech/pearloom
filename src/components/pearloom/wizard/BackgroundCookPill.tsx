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
  if (!cooking && !ready) return null;
  // The "ready" state shows for 4s then fades. Mount inner only
  // while we want to render — same keyed-child pattern as
  // ConfettiBurst — so the inner can hold its own self-hide
  // timer without a setState-in-effect cascade.
  // The key on (cooking, ready) means a re-flip restarts the
  // timer cleanly.
  return <BackgroundCookPillInner key={`${cooking}-${ready}`} cooking={cooking} ready={ready} />;
}

function BackgroundCookPillInner({ cooking, ready }: { cooking: boolean; ready: boolean }) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => setHidden(true), 4000);
    return () => clearTimeout(t);
  }, [ready]);
  if (!cooking && (!ready || hidden)) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        left: '50%',
        // Clear iOS Safari's bottom toolbar — without the safe-area
        // inset the pill renders half-hidden behind browser chrome.
        bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
        transform: 'translateX(-50%)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 16px 10px 12px',
        background: 'var(--pl-glass)',
        backgroundImage: 'var(--pl-glass-sheen)',
        backdropFilter: 'var(--pl-glass-blur, blur(18px) saturate(1.4))',
        WebkitBackdropFilter: 'var(--pl-glass-blur, blur(18px) saturate(1.4))',
        border: '1px solid var(--pl-glass-border)',
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
