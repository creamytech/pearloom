'use client';

/* eslint-disable no-restricted-syntax */
/* =========================================================================
   THE FIRST PRESSING — the reveal moment after Pear weaves a site.

   Plays exactly once, the first time the host lands in the editor after
   generation (WizardV8 arms sessionStorage['pl-first-pressing'] with the
   site slug; the editor mounts this overlay while the canvas loads
   beneath it). Four beats, all in the host's own suite:

     1. THE WARP    — their paper fills the screen; seven warp threads in
                      their accent draw down; one gold weft shuttles across.
     2. THE SEAL    — threads give way to their monogram stamping down
                      like a letterpress platen (scale-settle + press
                      shadow pulse).
     3. THE TITLE   — 'WOVEN FOR' in tracked mono caps, names rising in
                      their display face, then the date line.
     4. THE UNVEIL  — the sheet parts like loom curtains, both halves
                      sliding away to reveal the live site beneath.

   Tap / key to skip straight to the unveil. prefers-reduced-motion gets
   a quiet static title card (1.6s) and a simple fade. Pure CSS keyframes,
   transform/opacity/clip only — no layout thrash over the loading canvas.
   ========================================================================= */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { StoryManifest } from '@/types';
import { suiteThemeFromManifest } from '@/lib/suite/theme';
import { Monogram } from '../site/Monogram';

const SESSION_KEY = 'pl-first-pressing';

/** Arm the pressing for a slug (called by the wizard before routing). */
export function armFirstPressing(siteSlug: string) {
  try {
    window.sessionStorage.setItem(SESSION_KEY, siteSlug);
  } catch {
    /* storage blocked — the moment is skipped, the site still loads */
  }
}

/** Consume the flag — true exactly once per generation per tab. */
export function shouldPlayFirstPressing(siteSlug: string): boolean {
  try {
    const armed = window.sessionStorage.getItem(SESSION_KEY);
    if (armed !== siteSlug) return false;
    window.sessionStorage.removeItem(SESSION_KEY);
    return true;
  } catch {
    return false;
  }
}

interface Props {
  manifest: StoryManifest;
  names: [string, string];
  onDone: () => void;
}

const WARP_COUNT = 7;

export function FirstPressing({ manifest, names, onDone }: Props) {
  const suite = useMemo(() => suiteThemeFromManifest(manifest, names), [manifest, names]);
  const [phase, setPhase] = useState<'weave' | 'unveil' | 'gone'>('weave');
  const reduced = useRef(false);
  const timers = useRef<number[]>([]);

  /* Load the suite display face so the names render in their type,
     not the fallback serif. Best-effort — the sequence doesn't wait. */
  useEffect(() => {
    const id = 'pl-first-pressing-fonts';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = suite.fonts.googleHref;
      document.head.appendChild(link);
    }
  }, [suite.fonts.googleHref]);

  useEffect(() => {
    reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const unveilAt = reduced.current ? 1600 : 3700;
    const goneAt = unveilAt + (reduced.current ? 500 : 900);
    timers.current = [
      window.setTimeout(() => setPhase('unveil'), unveilAt),
      window.setTimeout(() => {
        setPhase('gone');
        onDone();
      }, goneAt),
    ];
    return () => timers.current.forEach(clearTimeout);
  }, [onDone]);

  /* Skip — jump to the unveil from wherever we are. */
  const skip = () => {
    if (phase !== 'weave') return;
    timers.current.forEach(clearTimeout);
    setPhase('unveil');
    timers.current = [
      window.setTimeout(() => {
        setPhase('gone');
        onDone();
      }, 900),
    ];
  };

  useEffect(() => {
    const onKey = () => skip();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  if (phase === 'gone') return null;

  const { palette, fonts } = suite;
  const displayNames = names.filter(Boolean);
  const dateLine = suite.eventDate ?? '';
  const r = reduced.current;

  /* One curtain half. The unveil slides each half outward. */
  const half = (side: 'left' | 'right'): React.CSSProperties => ({
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '50.5%', // tiny overlap so no seam shows while closed
    [side]: 0,
    background: palette.paper,
    /* 880ms is choreographed against the phase timers — keep the
       literal duration; the curve is exactly --pl-ease-in-out. */
    transition: 'transform 880ms var(--pl-ease-in-out)',
    transform:
      phase === 'unveil'
        ? `translateX(${side === 'left' ? '-101%' : '101%'})`
        : 'translateX(0)',
    willChange: 'transform',
  });

  return (
    <div
      onClick={skip}
      role="status"
      aria-label="Your site is ready"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 'var(--z-max, 500)' as unknown as number,
        cursor: phase === 'weave' ? 'pointer' : 'default',
        pointerEvents: phase === 'unveil' ? 'none' : 'auto',
      }}
    >
      <style>{`
        @keyframes plfp-warp { from { transform: scaleY(0); } to { transform: scaleY(1); } }
        @keyframes plfp-weft { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        @keyframes plfp-threads-out { to { opacity: 0; } }
        @keyframes plfp-press {
          0%   { transform: scale(1.45); opacity: 0; filter: blur(6px); }
          55%  { transform: scale(0.96); opacity: 1; filter: blur(0); }
          75%  { transform: scale(1.03); }
          100% { transform: scale(1); }
        }
        @keyframes plfp-press-shadow {
          0%, 40% { opacity: 0; transform: scale(1.3); }
          60%     { opacity: 0.5; transform: scale(0.92); }
          100%    { opacity: 0.18; transform: scale(1); }
        }
        @keyframes plfp-rise {
          from { opacity: 0; transform: translateY(14px); filter: blur(5px); }
          to   { opacity: 1; transform: translateY(0);    filter: blur(0); }
        }
        @keyframes plfp-fade { from { opacity: 0; } to { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          .plfp-anim { animation: none !important; opacity: 1 !important; transform: none !important; filter: none !important; }
        }
      `}</style>

      {/* The two sheet halves (paper + grain). Content rides the sheet
          so it parts with the curtains. */}
      <div style={half('left')} aria-hidden />
      <div style={half('right')} aria-hidden />
      <div
        aria-hidden
        className="pl-grain"
        style={{
          position: 'absolute',
          inset: 0,
          opacity: phase === 'unveil' ? 0 : 1,
          transition: 'opacity 500ms ease',
          pointerEvents: 'none',
        }}
      />

      {/* Stage — fades as the curtains part. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          opacity: phase === 'unveil' ? 0 : 1,
          transition: 'opacity 420ms ease',
        }}
      >
        {/* 1 · THE WARP — seven vertical threads + one gold weft. */}
        {!r && (
          <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
            {Array.from({ length: WARP_COUNT }).map((_, i) => (
              <span
                key={i}
                className="plfp-anim"
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: `${((i + 1) / (WARP_COUNT + 1)) * 100}%`,
                  width: 1,
                  background: palette.accent,
                  opacity: 0.45,
                  transformOrigin: 'top',
                  animation: `plfp-warp 700ms cubic-bezier(0.22,1,0.36,1) ${i * 90}ms both, plfp-threads-out 400ms ease ${1500 + i * 30}ms both`,
                }}
              />
            ))}
            <span
              className="plfp-anim"
              style={{
                position: 'absolute',
                left: '6%',
                right: '6%',
                top: '50%',
                height: 1.5,
                background: palette.gold,
                transformOrigin: 'left',
                animation: 'plfp-weft 900ms cubic-bezier(0.65,0,0.35,1) 480ms both, plfp-threads-out 400ms ease 1600ms both',
              }}
            />
          </div>
        )}

        {/* 2–3 · THE SEAL + THE TITLE. */}
        <div style={{ textAlign: 'center', padding: 24, maxWidth: 720 }}>
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: 18 }}>
            {/* Press shadow pulse under the stamp. */}
            {!r && (
              <span
                aria-hidden
                className="plfp-anim"
                style={{
                  position: 'absolute',
                  inset: -10,
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${palette.accent}33 0%, transparent 70%)`,
                  animation: 'plfp-press-shadow 700ms cubic-bezier(0.22,1,0.36,1) 1450ms both',
                }}
              />
            )}
            <div
              className="plfp-anim"
              style={{
                animation: r ? undefined : 'plfp-press 700ms cubic-bezier(0.22,1,0.36,1) 1450ms both',
                ['--t-accent' as string]: palette.accent,
                ['--t-ink' as string]: palette.ink,
                ['--t-gold' as string]: palette.gold,
                ['--t-display' as string]: fonts.display,
              }}
            >
              <Monogram
                initials={suite.monogram.initials}
                frame={suite.monogram.frame as never}
                size={120}
                withCard={false}
                ariaHidden
              />
            </div>
          </div>

          <div
            className="plfp-anim"
            style={{
              fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
              fontSize: 11,
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: palette.gold,
              animation: r ? undefined : 'plfp-rise 600ms cubic-bezier(0.22,1,0.36,1) 2050ms both',
              marginBottom: 14,
            }}
          >
            Woven for
          </div>

          <h1
            style={{
              fontFamily: fonts.display,
              fontWeight: 500,
              fontSize: 'clamp(34px, 6vw, 64px)',
              lineHeight: 1.05,
              color: palette.ink,
              margin: 0,
            }}
          >
            {displayNames.length > 1 ? (
              <>
                <span
                  className="plfp-anim"
                  style={{ display: 'inline-block', animation: r ? undefined : 'plfp-rise 700ms cubic-bezier(0.22,1,0.36,1) 2250ms both' }}
                >
                  {displayNames[0]}
                </span>
                <span
                  className="plfp-anim"
                  style={{
                    display: 'inline-block',
                    fontStyle: 'italic',
                    color: palette.accent,
                    margin: '0 0.28em',
                    animation: r ? undefined : 'plfp-rise 700ms cubic-bezier(0.22,1,0.36,1) 2420ms both',
                  }}
                >
                  &amp;
                </span>
                <span
                  className="plfp-anim"
                  style={{ display: 'inline-block', animation: r ? undefined : 'plfp-rise 700ms cubic-bezier(0.22,1,0.36,1) 2560ms both' }}
                >
                  {displayNames[1]}
                </span>
              </>
            ) : (
              <span
                className="plfp-anim"
                style={{ display: 'inline-block', animation: r ? undefined : 'plfp-rise 700ms cubic-bezier(0.22,1,0.36,1) 2250ms both' }}
              >
                {displayNames[0] ?? 'Your celebration'}
              </span>
            )}
          </h1>

          {dateLine && (
            <div
              className="plfp-anim"
              style={{
                fontFamily: fonts.body,
                fontSize: 15,
                color: palette.inkSoft,
                marginTop: 16,
                animation: r ? undefined : 'plfp-rise 600ms cubic-bezier(0.22,1,0.36,1) 2850ms both',
              }}
            >
              {dateLine}
              {suite.venue ? ` · ${suite.venue}` : ''}
            </div>
          )}

          <div
            className="plfp-anim"
            style={{
              fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
              fontSize: 10,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: palette.inkSoft,
              opacity: 0.6,
              marginTop: 40,
              animation: r ? undefined : 'plfp-fade 600ms ease 3100ms both',
            }}
          >
            Tap to enter
          </div>
        </div>
      </div>
    </div>
  );
}
