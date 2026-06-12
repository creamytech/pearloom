'use client';

/* UndoToast — the TRY-ANYTHING-SAFELY primitive.

   One bottom-center toast for the redesign editor: paper card,
   hairline border, message + an "Undo" text button, 6-second
   auto-dismiss with a gold progress hairline. Undo-after, never
   confirm-before (BRAND.md: no "Are you sure?" modals).

   Event-driven so any surface can fire it without prop drilling:

     window.dispatchEvent(new CustomEvent('pearloom:undoable', {
       detail: { message: 'Section hidden', undo: () => { … } },
     }));

   …or import `fireUndoable(message, undo)` for the typed helper.
   Follows the `pearloom:*` custom-event convention
   (CLAUDE-DESIGN.md §16.4).

   MOUNTING — mount exactly once per editor. In the redesign editor
   it lives inside `EditorThemeShop` (editor/EditorThemeShop.tsx)
   because that is the only TRY-ANYTHING-SAFELY-owned component
   that is ALWAYS mounted on both desktop and mobile:
   `EditorDrawers` renders it unconditionally (open/closed is just
   a transform), regardless of viewport, active section, or
   preview mode. SectionRail unmounts on mobile (it only exists
   inside the Sections bottom sheet) and PropertyRail unmounts
   whenever no section is active — a toast fired from a mobile
   props-sheet hide would die with the sheet. A module-level
   singleton guard makes accidental double-mounts harmless: only
   the first instance renders. */

import { useEffect, useState } from 'react';

export const UNDOABLE_EVENT = 'pearloom:undoable';

export interface UndoableDetail {
  /** Past-tense, warm, short. "Section hidden", "Pack applied —
   *  your old look is one tap away". */
  message: string;
  /** Restores the prior state — must route through the same
   *  onChange path the destructive action used. */
  undo: () => void;
}

/** Typed dispatcher for `pearloom:undoable`. Safe to call from
 *  event handlers anywhere in the editor — no-ops on the server. */
export function fireUndoable(message: string, undo: () => void): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<UndoableDetail>(UNDOABLE_EVENT, { detail: { message, undo } }),
  );
}

const TOAST_MS = 6000;

/* Singleton guard — only the first mounted instance listens +
   renders, so stray extra mounts can never double the toast. */
let undoToastClaimed = false;

interface ActiveToast extends UndoableDetail {
  /** Monotonic key so a new toast restarts the entrance + progress
   *  animations even when the message text is identical. */
  key: number;
}

export function UndoToast() {
  const [toast, setToast] = useState<ActiveToast | null>(null);

  /* Claim the singleton slot + listen for pearloom:undoable. A
     non-primary instance simply never subscribes, so its toast
     state stays null and it renders nothing. A new event replaces
     the current toast (single-toast rule — the latest destructive
     action is the one the host is thinking about). */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (undoToastClaimed) {
      console.warn('[undo-toast] duplicate <UndoToast /> mount ignored — it renders once per editor.');
      return;
    }
    undoToastClaimed = true;
    const onUndoable = (e: Event) => {
      const detail = (e as CustomEvent<UndoableDetail>).detail;
      if (!detail || typeof detail.message !== 'string' || typeof detail.undo !== 'function') return;
      setToast({ message: detail.message, undo: detail.undo, key: Date.now() });
    };
    window.addEventListener(UNDOABLE_EVENT, onUndoable);
    return () => {
      undoToastClaimed = false;
      window.removeEventListener(UNDOABLE_EVENT, onUndoable);
    };
  }, []);

  /* 6s auto-dismiss — keyed on the toast so replacements restart it. */
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(t);
  }, [toast]);

  if (!toast) return null;

  const runUndo = () => {
    try {
      toast.undo();
    } catch (e) {
      console.error('[undo-toast] undo callback failed:', e);
    }
    setToast(null);
  };

  return (
    <div
      key={toast.key}
      role="status"
      aria-live="polite"
      className="pl-rd-undo-toast"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 'calc(18px + env(safe-area-inset-bottom, 0px))',
        transform: 'translateX(-50%)',
        /* Just under modals (--z-modal: 300) so a publish flow or
           confirm dialog always wins, but above sheets + drawers
           (theme shop sheet sits at 85). Literal because calc() on
           z-index is still patchy in some embedded webviews. */
        zIndex: 299,
        maxWidth: 'min(440px, calc(100vw - 32px))',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '11px 10px 11px 16px',
        borderRadius: 12,
        overflow: 'hidden',
        background: 'var(--pl-glass)',
        backgroundImage: 'var(--pl-glass-sheen)',
        backdropFilter: 'var(--pl-glass-blur, blur(18px) saturate(1.4))',
        WebkitBackdropFilter: 'var(--pl-glass-blur, blur(18px) saturate(1.4))',
        border: '1px solid var(--pl-glass-border)',
        color: 'var(--pl-chrome-text, var(--ink, #0E0D0B))',
        boxShadow: 'var(--pl-glass-shadow-lg)',
        fontSize: 12.5,
        lineHeight: 1.45,
        animation: 'pl-rd-undo-in 220ms var(--pl-ease-emphasis, cubic-bezier(0.16, 1, 0.3, 1))',
        pointerEvents: 'auto',
      }}
    >
      <style>{`
        @keyframes pl-rd-undo-in {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes pl-rd-undo-run {
          from { transform: scaleX(1); }
          to   { transform: scaleX(0); }
        }
        .pl-rd-undo-btn:hover { background: var(--pl-chrome-surface-2, var(--cream-2, #F0E9D8)); }
        @media (prefers-reduced-motion: reduce) {
          .pl-rd-undo-toast { animation: none !important; }
          .pl-rd-undo-progress { animation: none !important; }
        }
      `}</style>
      <span style={{ flex: 1, minWidth: 0 }}>{toast.message}</span>
      <button
        type="button"
        onClick={runUndo}
        className="pl-rd-undo-btn"
        style={{
          flexShrink: 0,
          padding: '6px 12px',
          borderRadius: 8,
          border: 'none',
          background: 'transparent',
          color: 'var(--pl-chrome-accent, var(--sage-deep, #5C6B3F))',
          fontSize: 12.5,
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: 'inherit',
          transition: 'background var(--pl-dur-instant, 100ms)',
        }}
      >
        Undo
      </button>
      {/* Progress hairline — a gold 1px rule that recedes left-to-
          right across the 6s window. Under reduced motion it stays
          static; the JS timer still dismisses. */}
      <span
        aria-hidden
        className="pl-rd-undo-progress"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 1,
          background: 'var(--gold, #C19A4B)',
          transformOrigin: 'left center',
          animation: `pl-rd-undo-run ${TOAST_MS}ms linear forwards`,
        }}
      />
    </div>
  );
}

export default UndoToast;
