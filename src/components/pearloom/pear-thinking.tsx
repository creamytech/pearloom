'use client';

// ─────────────────────────────────────────────────────────────
// PearThinking — unified "AI is generating" indicator.
//
// Replaces the ad-hoc "Threading…" / "Drafting…" / "Generating…"
// text that's scattered across the app with a single visual:
//   • A small breathing Pear avatar
//   • Three peach dots that pulse in sequence
//   • Optional verb-first label per BRAND.md §7 ("drafting…",
//     "threading…", "weaving…") matching the source context.
//
// Compact (`size="sm"`) for inline buttons + chat bubbles;
// comfortable (`size="md"`) for cards + panel headers;
// banner (`size="lg"`) for full-section AI passes.
//
// Pure presentational — no streaming logic, no fetch. Just
// renders the visual when `active` is true. Consumers gate
// visibility on their own loading state.
// ─────────────────────────────────────────────────────────────

import type { CSSProperties } from 'react';
import { Pear } from './motifs';

interface Props {
  /** When false, nothing renders. Lets consumers always mount
   *  the component without conditional JSX. */
  active?: boolean;
  /** Verb the indicator pairs the dots with. BRAND.md §7 says
   *  use "drafting" for AI generation, "threading" for generic
   *  loading. Defaults to "drafting". Trailing ellipsis is
   *  appended automatically. */
  label?: string;
  /** Sizes the avatar + dot strip. sm = inline button height,
   *  md = card row, lg = section banner. */
  size?: 'sm' | 'md' | 'lg';
  /** Hide the avatar — sometimes the consuming surface already
   *  shows a Pear icon and an extra one feels redundant. */
  hideAvatar?: boolean;
  /** Hide the label — pure dot trio (icon-only contexts). */
  hideLabel?: boolean;
  /** Override the dot color. Defaults to peach-ink. */
  color?: string;
  /** Wrapper style overrides. */
  style?: CSSProperties;
}

const SIZE: Record<NonNullable<Props['size']>, {
  avatar: number; dot: number; gap: number; font: number; padY: number;
}> = {
  sm: { avatar: 14, dot: 4, gap: 6,  font: 11.5, padY: 4 },
  md: { avatar: 18, dot: 5, gap: 8,  font: 13,   padY: 6 },
  lg: { avatar: 24, dot: 7, gap: 10, font: 14.5, padY: 10 },
};

export function PearThinking({
  active = true,
  label = 'drafting',
  size = 'md',
  hideAvatar = false,
  hideLabel = false,
  color = 'var(--peach-ink, #C6703D)',
  style,
}: Props) {
  if (!active) return null;
  const s = SIZE[size];
  return (
    <span
      role="status"
      aria-live="polite"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: s.gap,
        padding: `${s.padY}px ${Math.max(8, s.padY + 2)}px`,
        color,
        fontSize: s.font,
        fontWeight: 500,
        fontFamily: 'var(--font-display, Fraunces, Georgia, serif)',
        fontStyle: 'italic',
        ...style,
      }}
    >
      {!hideAvatar && (
        <span
          aria-hidden
          style={{
            display: 'inline-block',
            animation: 'pl-pear-breathe 1.8s ease-in-out infinite',
          }}
        >
          <Pear size={s.avatar} tone="sage" shadow={false} />
        </span>
      )}
      <span
        aria-hidden
        style={{ display: 'inline-flex', alignItems: 'center', gap: Math.max(2, s.dot / 2) }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: s.dot,
              height: s.dot,
              borderRadius: '50%',
              background: 'currentColor',
              opacity: 0.4,
              animation: `pl-pear-dot 1.4s ease-in-out ${i * 0.18}s infinite`,
            }}
          />
        ))}
      </span>
      {!hideLabel && <span>{label.replace(/[.…]+$/, '')}…</span>}
      <style jsx>{`
        @keyframes pl-pear-dot {
          0%, 80%, 100% { opacity: 0.25; transform: translateY(0); }
          40%           { opacity: 1;    transform: translateY(-1px); }
        }
        @keyframes pl-pear-breathe {
          0%, 100% { transform: scale(1);     opacity: 0.85; }
          50%      { transform: scale(1.06);  opacity: 1;    }
        }
        @media (prefers-reduced-motion: reduce) {
          :global([role="status"]) > span > span { animation: none !important; opacity: 0.7 !important; }
          :global([role="status"]) > span:first-child { animation: none !important; }
        }
      `}</style>
    </span>
  );
}
