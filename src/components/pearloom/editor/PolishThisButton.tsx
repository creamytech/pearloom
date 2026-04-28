'use client';

// ─────────────────────────────────────────────────────────────
// PolishThisButton — small inline "Pear, polish this" affordance
// that drops into any section panel. Click dispatches a global
// event the editor's DesignAdvisor wrapper listens for; advisor
// opens with the section preselected so Pear's first pass is
// scoped to just that block.
//
// One-line panel addition turns into a focused Pear loop. Cuts
// the round-trip of opening the companion + typing a prompt.
// ─────────────────────────────────────────────────────────────

import { Icon } from '../motifs';

interface Props {
  /** Block key matching DesignAdvisor's currentBlock contract:
   *  'hero' | 'story' | 'details' | 'schedule' | 'travel' |
   *  'registry' | 'gallery' | 'rsvp' | 'faq'. */
  block: string;
  /** Optional human label — defaults to "Polish this {block}". */
  label?: string;
}

export function PolishThisButton({ block, label }: Props) {
  function open() {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('pearloom:open-pear-for', {
      detail: { block, intent: 'review' },
    }));
  }
  return (
    <button
      type="button"
      onClick={open}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        borderRadius: 999,
        background: 'transparent',
        border: '1px dashed var(--peach-ink, #C6703D)',
        color: 'var(--peach-ink, #C6703D)',
        fontSize: 11.5,
        fontWeight: 700,
        letterSpacing: '0.04em',
        cursor: 'pointer',
        fontFamily: 'var(--font-ui)',
        transition: 'background 160ms ease, color 160ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--peach-ink, #C6703D)';
        e.currentTarget.style.color = '#FFFFFF';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = 'var(--peach-ink, #C6703D)';
      }}
    >
      <Icon name="sparkles" size={11} />
      {label ?? `Pear, polish this ${block}`}
    </button>
  );
}
