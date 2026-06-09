'use client';

/* eslint-disable no-restricted-syntax */
/* ─────────────────────────────────────────────────────────────
   FloatingPearBubble — the single Pear ENTRY POINT on the canvas.

   This used to be a second, competing Pear: it carried its own
   nudge copy, its own /api/pear-critique fetch, an inline
   suggestion card, and a mini chat input — all duplicating the
   DesignAdvisor pane (one-Pear consolidation, 2026-06-09).

   Now it is a pill and nothing else. Tapping it dispatches
   `pearloom:open-pear`; the editor shell routes that to the
   4th-column advisor on desktop or the Pear bottom sheet on
   phones. The proactive "Pear noticed…" nudge logic moved INTO
   the advisor (see editor/DesignAdvisor.tsx PearNoticedCard),
   so the thought the pill advertises is the first thing the
   host sees when the advisor opens.
   ───────────────────────────────────────────────────────────── */

import { Pear } from '../motifs';

interface Props {
  /** Distance from the canvas bottom edge — the shell bumps this
   *  up on phones so the pill clears the fixed bottom bar. */
  bottomOffset?: number | string;
}

export function FloatingPearBubble({ bottomOffset = 24 }: Props) {
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window === 'undefined') return;
        window.dispatchEvent(new CustomEvent('pearloom:open-pear'));
      }}
      className="pl-rd-pop-in"
      aria-label="Open Pear, your design advisor"
      style={{
        position: 'absolute',
        bottom: bottomOffset,
        right: 24,
        padding: '10px 14px 10px 10px',
        borderRadius: 999,
        background: 'var(--card)',
        border: '1px solid var(--line)',
        boxShadow: 'var(--shadow-md)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        zIndex: 20,
        cursor: 'pointer',
      }}
    >
      <Pear size={28} tone="sage" sparkle shadow={false} />
      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>
        Pear has a thought
      </span>
      <span
        aria-hidden
        style={{
          width: 7,
          height: 7,
          background: 'var(--peach-ink)',
          borderRadius: '50%',
          animation: 'pl-dot-pulse 1.4s ease-in-out infinite',
        }}
      />
    </button>
  );
}
