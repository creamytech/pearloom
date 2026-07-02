'use client';

// ─────────────────────────────────────────────────────────────
// DayOfBanner — sticky top strip that surfaces day-of state for
// guests as they scroll. Pairs with LiveNowHero (which replaces
// the hero) by giving the same information a place to live AFTER
// the guest has scrolled past the hero — schedule, photos, etc.
//
// Renders in three forms by status:
//   • 'live'  — peach pulse + "Live now: {nowEvent}" + delta to next
//   • 'pre'   — lavender + "Tomorrow / Today" + delta to next event
//   • 'post'  — sage + "Thanks for celebrating with us"
//
// Quietly hides when the day-of state is inactive. Tickers every
// 30s so the delta stays accurate without re-rendering on every
// frame. Click dismisses for the session (sessionStorage); the
// banner reappears on the next pageload so a guest who closes it
// during the pre window still sees the live banner.
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react';
import { computeDayOfState, formatDelta, type DayOfState } from '@/lib/day-of/state';
import { getEventType } from '@/lib/event-os/event-types';
import type { StoryManifest } from '@/types';

interface Props {
  manifest: StoryManifest;
}

const DISMISS_KEY = 'pl-day-of-banner-dismissed';

export function DayOfBanner({ manifest }: Props) {
  // dismissed from sessionStorage via lazy useState init so the
  // banner doesn't flash before the effect ran.
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try { return sessionStorage.getItem(DISMISS_KEY) === '1'; }
    catch { return false; }
  });

  // The 30s tick forces a re-render so computeDayOfState picks
  // up the latest clock. The counter value isn't read anywhere
  // — bumping it is the signal. No setState-in-effect cascade.
  const [tick, bumpTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => bumpTick((n) => n + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);
  // Memoise on (manifest, tick) so the derivation re-runs both
  // when the manifest changes and on every tick. The tick value
  // isn't read inside computeDayOfState — bumping the counter is
  // the only signal that the wall-clock has moved 30s.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const state = useMemo(() => computeDayOfState(manifest), [manifest, tick]);

  if (!state.active || dismissed || state.status === 'inactive') return null;

  const tone = state.status === 'live' ? 'peach' : state.status === 'post' ? 'sage' : 'lavender';
  const palette = TONE_PALETTE[tone];

  /* Solemn occasions (memorial / funeral) get a quieter after-state
     — "Thanks for celebrating / See you again, soon." is the wrong
     key for a service. */
  const solemn = getEventType(manifest.occasion ?? 'wedding')?.voice === 'solemn';

  const eyebrow = state.status === 'live'
    ? 'Live now'
    : state.status === 'post'
      ? (solemn ? 'With gratitude' : 'Thanks for celebrating')
      : state.nextLabel
        ? 'Up next'
        : 'Tomorrow';

  const headline = state.status === 'live'
    ? state.nowLabel ?? 'The day, in your hands'
    : state.status === 'post'
      ? (solemn ? 'Thank you for being with us.' : 'See you again, soon.')
      : state.nextLabel ?? 'The day is starting';

  const meta = state.nextMomentAt && state.status !== 'post'
    ? formatDelta(state.nextMomentAt)
    : null;

  function dismiss() {
    setDismissed(true);
    if (typeof window !== 'undefined') {
      try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
    }
  }

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 240,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '10px clamp(16px, 4vw, 32px)',
        background: palette.bg,
        borderBottom: `1px solid ${palette.border}`,
        color: palette.fg,
        fontFamily: 'var(--font-ui)',
        fontSize: 13.5,
        fontWeight: 500,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <span
        aria-hidden
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: palette.fg,
          flexShrink: 0,
          animation: state.status === 'live' ? 'pl-day-of-pulse 1.6s ease-in-out infinite' : undefined,
        }}
      />
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          flexShrink: 0,
        }}
      >
        {eyebrow}
      </span>
      <span
        style={{
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontFamily: 'var(--font-display, "Fraunces", Georgia, serif)',
          fontStyle: 'italic',
          fontSize: 15,
          color: palette.headline,
        }}
      >
        {headline}
      </span>
      {meta && (
        <span
          style={{
            fontSize: 11.5,
            fontWeight: 600,
            color: palette.headline,
            opacity: 0.8,
            flexShrink: 0,
          }}
        >
          {meta}
        </span>
      )}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss banner"
        style={{
          width: 22,
          height: 22,
          padding: 0,
          background: 'transparent',
          border: 'none',
          color: palette.fg,
          cursor: 'pointer',
          fontSize: 14,
          lineHeight: 1,
          opacity: 0.6,
          flexShrink: 0,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        ×
      </button>
      <style jsx global>{`
        @keyframes pl-day-of-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.45; transform: scale(0.85); }
        }
      `}</style>
    </div>
  );
}

const TONE_PALETTE = {
  peach: {
    bg: 'rgba(251,232,214,0.94)',
    border: 'rgba(198,112,61,0.32)',
    fg: 'var(--peach-ink, #C6703D)',
    headline: 'var(--ink, #0E0D0B)',
  },
  lavender: {
    bg: 'rgba(232,224,240,0.94)',
    border: 'rgba(107,90,140,0.28)',
    fg: 'var(--lavender-ink, #6B5A8C)',
    headline: 'var(--ink, #0E0D0B)',
  },
  sage: {
    bg: 'rgba(227,230,200,0.94)',
    border: 'rgba(109,125,63,0.28)',
    fg: 'var(--sage-deep, #6d7d3f)',
    headline: 'var(--ink, #0E0D0B)',
  },
};
