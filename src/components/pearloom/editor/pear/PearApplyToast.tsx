'use client';

// ─────────────────────────────────────────────────────────────
// PearApplyToast — top-center peach pill that fires when Pear
// applies a patch. Listens for `pearloom:patch-applied` events
// from DesignAdvisor's apply handler and surfaces the patch's
// summary as a transient confirmation, so the host sees the
// change land without needing to look at the chat.
//
// Auto-dismisses after 3.2s. Manual dismiss with the × button.
// Stacking: a second event arriving before the first dismisses
// replaces the message (no queue) — the most recent change is
// always what the host sees.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { Pear } from '../../motifs';

export function PearApplyToast() {
  // The toast renders one entry at a time. New events replace the
  // current entry instead of stacking — the host always sees the
  // most recent change. Undo is captured per-event so a stale
  // rollback can't fire after the host applied a follow-up.
  const [entry, setEntry] = useState<{ summary: string; undo?: () => void } | null>(null);
  const [undone, setUndone] = useState(false);

  useEffect(() => {
    function onApplied(e: Event) {
      const detail = (e as CustomEvent<{ summary?: string; undo?: () => void }>).detail;
      const summary = detail?.summary?.trim();
      if (!summary) return;
      setEntry({ summary, undo: detail?.undo });
      setUndone(false);
    }
    window.addEventListener('pearloom:patch-applied', onApplied);
    return () => window.removeEventListener('pearloom:patch-applied', onApplied);
  }, []);

  useEffect(() => {
    if (!entry) return;
    // Undo extends the dwell time slightly so the host has a real
    // moment to tap it. 3.2s for confirm-only; 5s when undo is
    // available.
    const dwell = entry.undo ? 5000 : 3200;
    const t = setTimeout(() => setEntry(null), dwell);
    return () => clearTimeout(t);
  }, [entry]);

  if (!entry) return null;

  function handleUndo() {
    if (!entry?.undo) return;
    entry.undo();
    setUndone(true);
    setTimeout(() => setEntry(null), 1200);
  }

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 76,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 380,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 16px 10px 14px',
        background: 'linear-gradient(135deg, var(--peach-bg, #FBE8D6) 0%, rgba(232,224,240,0.96) 100%)',
        border: '1px solid rgba(198,112,61,0.32)',
        borderRadius: 999,
        boxShadow: '0 14px 36px rgba(14,13,11,0.18)',
        fontFamily: 'var(--font-ui)',
        fontSize: 12.5,
        fontWeight: 500,
        color: 'var(--ink)',
        maxWidth: 'min(520px, 90vw)',
        animation: 'pl-pear-toast-rise 220ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <Pear size={20} tone="peach" sparkle shadow={false} />
      <span
        style={{
          fontSize: 9.5,
          fontWeight: 700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: undone ? 'var(--sage-deep, #5C6B3F)' : 'var(--peach-ink, #C6703D)',
          flexShrink: 0,
        }}
      >
        {undone ? 'Undone' : 'Pear'}
      </span>
      <span
        style={{
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={entry.summary}
      >
        {undone ? `Reverted: ${entry.summary}` : entry.summary}
      </span>
      {entry.undo && !undone && (
        <button
          type="button"
          onClick={handleUndo}
          style={{
            padding: '4px 10px',
            borderRadius: 999,
            background: 'var(--ink, #0E0D0B)',
            color: 'var(--cream, #FBF7EE)',
            border: 'none',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            fontFamily: 'var(--font-ui)',
            flexShrink: 0,
          }}
        >
          Undo
        </button>
      )}
      <button
        type="button"
        onClick={() => setEntry(null)}
        aria-label="Dismiss"
        style={{
          width: 22,
          height: 22,
          padding: 0,
          background: 'transparent',
          border: 'none',
          color: 'var(--ink-muted)',
          cursor: 'pointer',
          fontSize: 14,
          lineHeight: 1,
          flexShrink: 0,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        ×
      </button>
      <style jsx>{`
        @keyframes pl-pear-toast-rise {
          from { opacity: 0; transform: translate(-50%, -8px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  );
}
