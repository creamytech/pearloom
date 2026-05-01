'use client';

// ─────────────────────────────────────────────────────────────
// LiveNowHero — replaces the standard hero on day-of.
//
// Two states:
//   • status = 'live' — pulsing dot + "Happening now: <event>"
//   • status = 'pre'  — countdown to the next event ("Up next:
//                       Ceremony in 1h 24m")
//   • status = 'post' — quiet morning-after card asking guests
//                       to add photos / leave a memory
//
// Self-ticks every minute so the countdown stays fresh without
// the parent re-rendering.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { computeDayOfState, formatDelta, type DayOfState } from '@/lib/day-of/state';
import type { StoryManifest } from '@/types';

interface Props {
  manifest: StoryManifest;
  names: [string, string];
  /** Quick-action buttons. The Sticker layer of the parent hero
   *  is preserved — this component only swaps the *content*. */
  onAddPhoto?: () => void;
  onAddMemory?: () => void;
}

export function LiveNowHero({ manifest, names, onAddPhoto, onAddMemory }: Props) {
  const [state, setState] = useState<DayOfState>(() => computeDayOfState(manifest));
  useEffect(() => {
    const tick = () => setState(computeDayOfState(manifest));
    tick();
    const t = setInterval(tick, 60_000);
    return () => clearInterval(t);
  }, [manifest]);

  const accent = (manifest.theme?.colors?.accent as string | undefined) ?? '#C6703D';
  const ink = (manifest.theme?.colors?.foreground as string | undefined) ?? '#0E0D0B';
  const couple = names.filter(Boolean).join(' & ') || 'Today';

  const isLive = state.status === 'live';
  const isPost = state.status === 'post';

  return (
    <section
      style={{
        position: 'relative',
        padding: 'clamp(48px, 8vw, 96px) clamp(20px, 5vw, 48px)',
        textAlign: 'center',
        borderBottom: `1px solid ${accent}22`,
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '7px 16px',
            borderRadius: 999,
            background: isLive ? '#7A2D2D' : isPost ? `${accent}18` : `${accent}14`,
            color: isLive ? '#FFFFFF' : ink,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            marginBottom: 24,
          }}
        >
          <span
            aria-hidden
            style={{
              width: 8, height: 8, borderRadius: 999,
              background: isLive ? '#FFFFFF' : accent,
              animation: isLive ? 'pl-dot-pulse 1.4s ease-in-out infinite' : undefined,
              boxShadow: isLive ? '0 0 0 0 #FFFFFF' : 'none',
            }}
          />
          {isLive ? 'Live now' : isPost ? 'Today, looking back' : `Today · ${couple}`}
        </div>

        {state.status === 'live' && (
          <>
            <h1
              className="display"
              style={{
                fontFamily: 'Fraunces, Georgia, serif',
                fontSize: 'clamp(36px, 6vw, 64px)',
                lineHeight: 1.05,
                margin: '0 0 16px',
                color: ink,
                fontWeight: 500,
                letterSpacing: '-0.02em',
              }}
            >
              {state.nowLabel || 'Happening now'}
            </h1>
            {state.nextLabel && state.nextMomentAt && (
              <p style={{ color: ink, opacity: 0.72, fontSize: 16, margin: '0 0 28px' }}>
                Next: <strong>{state.nextLabel}</strong> in {formatDelta(state.nextMomentAt)}
              </p>
            )}
          </>
        )}

        {state.status === 'pre' && state.nextLabel && state.nextMomentAt && (
          <>
            <h1
              className="display"
              style={{
                fontFamily: 'Fraunces, Georgia, serif',
                fontSize: 'clamp(36px, 6vw, 64px)',
                lineHeight: 1.05,
                margin: '0 0 16px',
                color: ink,
                fontWeight: 500,
                letterSpacing: '-0.02em',
              }}
            >
              Up next · {state.nextLabel}
            </h1>
            <p style={{ color: ink, opacity: 0.72, fontSize: 16, margin: '0 0 28px' }}>
              In {formatDelta(state.nextMomentAt)} · {couple}
            </p>
          </>
        )}

        {state.status === 'post' && (
          <>
            <h1
              className="display"
              style={{
                fontFamily: 'Fraunces, Georgia, serif',
                fontSize: 'clamp(36px, 6vw, 64px)',
                lineHeight: 1.05,
                margin: '0 0 16px',
                color: ink,
                fontWeight: 500,
                letterSpacing: '-0.02em',
              }}
            >
              The day, in your hands
            </h1>
            <p style={{ color: ink, opacity: 0.72, fontSize: 16, margin: '0 0 28px' }}>
              Add the frames you caught. Leave a memory. {couple} will read every word.
            </p>
          </>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          {onAddPhoto && (
            <button
              type="button"
              onClick={onAddPhoto}
              style={{
                padding: '11px 20px',
                background: accent,
                color: '#FFFFFF',
                borderRadius: 999,
                border: 'none',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              Add a photo
            </button>
          )}
          {onAddMemory && (
            <button
              type="button"
              onClick={onAddMemory}
              style={{
                padding: '10px 18px',
                background: 'transparent',
                color: ink,
                borderRadius: 999,
                border: `1.5px solid ${ink}22`,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              Leave a memory
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
