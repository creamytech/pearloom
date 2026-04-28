'use client';

// ─────────────────────────────────────────────────────────────
// MobileSaveIndicator — a small peach pill that pins to the top
// of the canvas on phones, mirroring the topbar's SaveDot in a
// place the host can actually see. The desktop topbar is roomy;
// the phone topbar is tight, so save state slips out of view.
//
// Behaviour:
//   • Hidden on tablet+ (uses a CSS media query, not JS).
//   • While saving → "Saving…" pulsing peach pill.
//   • Briefly shows "Saved" with a check (2s) after a successful
//     save, then fades to invisible so it doesn't compete with
//     the canvas during quiet editing.
//   • On error → red-tinted "Save failed — tap to retry" pill
//     that stays visible until resolved.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';

interface Props {
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  onRetry?: () => void;
}

export function MobileSaveIndicator({ saveStatus, onRetry }: Props) {
  // Only show "Saved" briefly — after that the pill should be
  // invisible so it doesn't sit on the canvas during normal editing.
  const [showSaved, setShowSaved] = useState(false);
  useEffect(() => {
    if (saveStatus !== 'saved') {
      setShowSaved(false);
      return;
    }
    setShowSaved(true);
    const t = setTimeout(() => setShowSaved(false), 1800);
    return () => clearTimeout(t);
  }, [saveStatus]);

  const visible =
    saveStatus === 'saving' ||
    saveStatus === 'error' ||
    (saveStatus === 'saved' && showSaved);

  const label =
    saveStatus === 'saving'
      ? 'Saving…'
      : saveStatus === 'error'
        ? 'Save failed — tap to retry'
        : 'Saved';
  const tone =
    saveStatus === 'error'
      ? { bg: 'rgba(122,45,45,0.12)', ring: 'rgba(122,45,45,0.32)', ink: '#7A2D2D' }
      : saveStatus === 'saved'
        ? { bg: 'rgba(140,158,82,0.18)', ring: 'rgba(140,158,82,0.36)', ink: '#3D4A1F' }
        : { bg: 'rgba(198,112,61,0.16)', ring: 'rgba(198,112,61,0.36)', ink: '#C6703D' };

  return (
    <button
      type="button"
      className="pl8-mobile-save-indicator"
      onClick={saveStatus === 'error' ? onRetry : undefined}
      aria-live="polite"
      aria-label={label}
      style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top, 0px) + 56px)',
        left: '50%',
        transform: `translate(-50%, ${visible ? '0' : '-12px'})`,
        opacity: visible ? 1 : 0,
        pointerEvents: visible && saveStatus === 'error' ? 'auto' : 'none',
        zIndex: 80,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        borderRadius: 999,
        background: tone.bg,
        border: `1px solid ${tone.ring}`,
        color: tone.ink,
        fontSize: 11.5,
        fontWeight: 700,
        letterSpacing: '0.04em',
        fontFamily: 'var(--font-ui)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        cursor: saveStatus === 'error' ? 'pointer' : 'default',
        transition: 'opacity 220ms ease, transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <span
        aria-hidden
        style={{
          width: 7,
          height: 7,
          borderRadius: 999,
          background: tone.ink,
          animation: saveStatus === 'saving' ? 'pl-dot-pulse 1.4s ease-in-out infinite' : 'none',
        }}
      />
      {label}
      <style jsx global>{`
        .pl8-mobile-save-indicator {
          display: none;
        }
        @media (max-width: 720px) {
          .pl8-mobile-save-indicator {
            display: inline-flex;
          }
        }
      `}</style>
    </button>
  );
}
