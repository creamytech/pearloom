'use client';

/* ─────────────────────────────────────────────────────────────
   CompareHold — press-and-hold "show me my site before this
   change" in the Theme rail / Design tab header.

   While held it dispatches `pearloom:design-compare` (active:
   true); EditorRedesign peeks the bridge's undo stack (read-only
   — no history mutation, no persist) and paints the previous
   manifest on the canvas with a "Before" chip. Releasing —
   pointer up, pointer leave, blur, Esc, unmount — always
   dispatches active: false, so the canvas can never stick on
   the old look.

   Keyboard: hold Space or Enter. aria-pressed mirrors the state.
   ───────────────────────────────────────────────────────────── */

import { useEffect, useRef, useState } from 'react';
import { setDesignCompare } from './design-feedback';

export function CompareHold() {
  const [held, setHeld] = useState(false);
  const heldRef = useRef(false);

  const set = (v: boolean) => {
    if (heldRef.current === v) return;
    heldRef.current = v;
    setHeld(v);
    setDesignCompare(v);
  };

  /* Unmount while held (tab flip, sheet close) must release. */
  useEffect(() => () => {
    if (heldRef.current) {
      heldRef.current = false;
      setDesignCompare(false);
    }
  }, []);

  return (
    <button
      type="button"
      aria-pressed={held}
      title="Press and hold to see your site before the last change"
      onPointerDown={(e) => { e.preventDefault(); set(true); }}
      onPointerUp={() => set(false)}
      onPointerLeave={() => set(false)}
      onPointerCancel={() => set(false)}
      onKeyDown={(e) => {
        if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); set(true); }
        if (e.key === 'Escape') set(false);
      }}
      onKeyUp={(e) => {
        if (e.key === ' ' || e.key === 'Enter') set(false);
      }}
      onBlur={() => set(false)}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 11px',
        borderRadius: 999,
        border: held ? '1px solid var(--ink)' : '1px solid var(--line)',
        background: held ? 'var(--ink)' : 'var(--cream-2)',
        color: held ? 'var(--cream)' : 'var(--ink-soft)',
        fontSize: 11,
        fontWeight: 600,
        fontFamily: 'inherit',
        cursor: 'pointer',
        userSelect: 'none',
        touchAction: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      <span
        aria-hidden
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          flexShrink: 0,
          /* Half-and-half disc — the before/after glyph. */
          background: held
            ? 'linear-gradient(90deg, var(--cream) 50%, transparent 50%)'
            : 'linear-gradient(90deg, var(--ink-soft) 50%, transparent 50%)',
          border: held ? '1px solid var(--cream)' : '1px solid var(--ink-soft)',
        }}
      />
      {held ? 'Before' : 'Compare'}
    </button>
  );
}
