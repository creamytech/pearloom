'use client';

/* eslint-disable no-restricted-syntax */
/* LITERAL PORT of handoff/pages/editor-redesign.jsx L982-1062. */

import { useState } from 'react';
import { Icon, Pear } from '../motifs';
import type { SectionId } from './EditorRedesign';

interface Props {
  active: SectionId;
}

const NUDGES: Record<string, string> = {
  hero:    'Your tagline is doing a lot of work. Want me to try 3 alternatives?',
  rsvp:    "You haven't set a reminder cadence yet. I drafted one — want to review?",
  gallery: '38 photos! I can pick the 12 strongest for the homepage strip.',
  default: 'I noticed your schedule has gaps — want me to rebalance the timeline?',
};

export function FloatingPearBubble({ active }: Props) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const nudge = active ? NUDGES[active] ?? NUDGES.default : NUDGES.default;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          position: 'absolute',
          bottom: 24, right: 24,
          padding: '10px 14px 10px 10px',
          borderRadius: 999,
          background: 'var(--card)',
          border: '1px solid var(--line)',
          boxShadow: 'var(--shadow-md)',
          display: 'flex', alignItems: 'center', gap: 10,
          zIndex: 20,
          cursor: 'pointer',
        }}
      >
        <Pear size={28} tone="sage" sparkle shadow={false} />
        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>
          Pear has a thought
        </span>
        <span
          style={{
            width: 7, height: 7,
            background: 'var(--peach-ink)',
            borderRadius: '50%',
            animation: 'pl-dot-pulse 1.4s ease-in-out infinite',
          }}
        />
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 24, right: 24,
        width: 320,
        background: 'var(--card)',
        border: '1px solid var(--line)',
        borderRadius: 16,
        boxShadow: 'var(--shadow-lg)',
        zIndex: 20,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '12px 14px 10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--line-soft)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Pear size={22} tone="sage" sparkle shadow={false} />
          <span style={{ fontSize: 13, fontWeight: 700 }}>Pear</span>
          <span
            style={{
              fontSize: 10.5,
              color: 'var(--ink-muted)',
              padding: '1px 6px',
              borderRadius: 999,
              background: 'var(--cream-2)',
            }}
          >
            watching
          </span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Minimise"
            style={{ width: 24, height: 24, borderRadius: 6, display: 'grid', placeItems: 'center', background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            <Icon name="minus" size={13} color="var(--ink-soft)" />
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
            style={{ width: 24, height: 24, borderRadius: 6, display: 'grid', placeItems: 'center', background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            <Icon name="close" size={13} color="var(--ink-soft)" />
          </button>
        </div>
      </div>

      <div style={{ padding: '12px 14px' }}>
        <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.45, marginBottom: 10 }}>
          {nudge}
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            style={{ flex: 1, justifyContent: 'center', fontSize: 12 }}
          >
            Yes, try it
          </button>
          <button type="button" className="btn btn-outline btn-sm" style={{ fontSize: 12 }}>
            Not now
          </button>
        </div>
        <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 10 }}>
          <input
            placeholder="Or ask something else…"
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 999,
              border: '1px solid var(--line)',
              background: 'var(--cream-2)',
              fontSize: 12,
              outline: 'none',
            }}
          />
        </div>
      </div>
    </div>
  );
}
