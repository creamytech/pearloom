'use client';

// ─────────────────────────────────────────────────────────────
// DraftedByPearBanner — small editorial pill that surfaces above
// any section auto-drafted by Pear. Lets the host accept the
// draft (banner clears), redraft (calls the drafter again), or
// clear the section back to empty.
//
// Renders only in edit mode + only when manifest.draftedByPear
// flags the section as drafted. After accept, the flag flips to
// false and the banner disappears.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import type { StoryManifest } from '@/types';

interface Props {
  sectionKey: string;
  /** Human label shown in the banner — "Schedule", "FAQ", etc. */
  sectionLabel: string;
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
  /** Optional handler for "Redraft" — caller supplies the drafter
   *  for this section. When omitted, the redraft button hides. */
  onRedraft?: () => void;
  /** Optional handler for "Start blank" — caller wipes the
   *  drafted section's data. When omitted, the button hides. */
  onClear?: () => void;
}

export function DraftedByPearBanner({
  sectionKey,
  sectionLabel,
  manifest,
  onChange,
  onRedraft,
  onClear,
}: Props) {
  const isDrafted = manifest.draftedByPear?.[sectionKey] === true;
  const [dismissing, setDismissing] = useState(false);
  if (!isDrafted || dismissing) return null;

  function accept() {
    setDismissing(true);
    onChange({
      ...manifest,
      draftedByPear: {
        ...(manifest.draftedByPear ?? {}),
        [sectionKey]: false,
      },
    });
  }

  return (
    <div
      role="status"
      aria-label={`${sectionLabel} drafted by Pear`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        margin: '0 auto 14px',
        maxWidth: 'min(720px, calc(100% - 32px))',
        padding: '8px 14px',
        borderRadius: 999,
        background: 'rgba(184,146,68,0.10)',
        border: '1px dashed rgba(184,146,68,0.45)',
        color: 'var(--peach-ink, #C6703D)',
        fontFamily: 'var(--font-ui, Geist, system-ui, sans-serif)',
        fontSize: 12,
        fontWeight: 600,
        animation: 'pl-enter-fade-in 320ms cubic-bezier(0.22, 1, 0.36, 1) both',
      }}
    >
      <span aria-hidden style={{ fontSize: 14 }}>✦</span>
      <span style={{ flex: 1, color: 'var(--ink-soft, #3A332C)' }}>
        Pear drafted this {sectionLabel.toLowerCase()} — edit anything, or:
      </span>
      <button
        type="button"
        onClick={accept}
        style={{
          padding: '4px 12px',
          borderRadius: 999,
          background: 'var(--peach-ink, #C6703D)',
          color: 'var(--cream, #FBF7EE)',
          border: 'none',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.04em',
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        Looks good
      </button>
      {onRedraft && (
        <button
          type="button"
          onClick={onRedraft}
          style={{
            padding: '4px 10px',
            borderRadius: 999,
            background: 'transparent',
            color: 'var(--ink-soft, #3A332C)',
            border: '1px solid var(--line, rgba(14,13,11,0.14))',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Redraft
        </button>
      )}
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          style={{
            padding: '4px 10px',
            borderRadius: 999,
            background: 'transparent',
            color: 'var(--ink-muted, #6F6557)',
            border: 'none',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Start blank
        </button>
      )}
    </div>
  );
}
