'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/UndoChip.tsx
// Spatial undo affordance — after any edit, a small "↶ Undo"
// chip briefly appears near the mutation site so the user can
// revert without reaching for Cmd+Z. Auto-dismisses after ~4s.
//
// How we track location:
//   • `input` events on [data-pe-editable] fields → caret rect
//   • `pearloom-art-edit-done` events → art toolbar anchor rect
//   • `pearloom-field-focus` custom events → programmatic focus
//
// When state.undoHistory grows past our last seen length, we
// pop the chip at the most recently captured rect.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw } from 'lucide-react';
import { useEditor } from '@/lib/editor-state';

interface ChipState {
  top: number;
  left: number;
  label: string;
  // Monotonic id so consecutive edits re-mount + retrigger the exit timer.
  nonce: number;
}

const DISMISS_MS = 4000;

export function UndoChip() {
  const { state, actions } = useEditor();
  const [chip, setChip] = useState<ChipState | null>(null);
  const lastRectRef = useRef<{ top: number; left: number } | null>(null);
  const prevHistoryLenRef = useRef<number>(state.undoHistory.length);
  const prevHistoryIdxRef = useRef<number>(state.undoIndex);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Rect capture ─────────────────────────────────────────
  // For contenteditable input events, anchor the chip just above the caret.
  // For art-edit-done events, detail.rect carries the toolbar's own rect.
  useEffect(() => {
    const captureCaretRect = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return null;
      const r = sel.getRangeAt(0).getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return null;
      return { top: r.top, left: r.left + r.width / 2 };
    };

    const onInput = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (!t || !t.closest?.('[data-pe-editable="true"]')) return;
      const r = captureCaretRect();
      if (r) lastRectRef.current = r;
      else {
        const el = t.closest<HTMLElement>('[data-pe-editable="true"]');
        if (el) {
          const box = el.getBoundingClientRect();
          lastRectRef.current = { top: box.top, left: box.left + box.width / 2 };
        }
      }
    };

    const onArtDone = (e: Event) => {
      const detail = (e as CustomEvent).detail as { rect?: DOMRect } | undefined;
      const r = detail?.rect;
      if (r) lastRectRef.current = { top: r.top, left: r.left + r.width / 2 };
    };

    const onFieldFocus = (e: Event) => {
      const detail = (e as CustomEvent).detail as { rect?: DOMRect } | undefined;
      const r = detail?.rect;
      if (r) lastRectRef.current = { top: r.top, left: r.left + r.width / 2 };
    };

    document.addEventListener('input', onInput, true);
    window.addEventListener('pearloom-art-edit-done', onArtDone);
    window.addEventListener('pearloom-field-focus', onFieldFocus);
    return () => {
      document.removeEventListener('input', onInput, true);
      window.removeEventListener('pearloom-art-edit-done', onArtDone);
      window.removeEventListener('pearloom-field-focus', onFieldFocus);
    };
  }, []);

  // ── Fire chip when history grows ─────────────────────────
  useEffect(() => {
    const prevLen = prevHistoryLenRef.current;
    const prevIdx = prevHistoryIdxRef.current;
    const nextLen = state.undoHistory.length;
    const nextIdx = state.undoIndex;
    prevHistoryLenRef.current = nextLen;
    prevHistoryIdxRef.current = nextIdx;

    // New entry appended AND we're at the tip → a real new edit (not an undo).
    const grew = nextLen > prevLen;
    const advanced = nextIdx > prevIdx;
    if (!grew || !advanced) return;

    // Skip the very first initial-state entry.
    const entry = state.undoHistory[nextIdx];
    if (!entry || entry.label === 'Initial state') return;

    const rect = lastRectRef.current;
    if (!rect) return; // No spatial anchor — skip.

    // Clamp to viewport so the chip is always reachable.
    const top = Math.max(12, Math.min(window.innerHeight - 48, rect.top - 36));
    const left = Math.max(60, Math.min(window.innerWidth - 60, rect.left));

    setChip({ top, left, label: entry.label, nonce: Date.now() });

    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(() => setChip(null), DISMISS_MS);
  }, [state.undoHistory, state.undoIndex]);

  // Hide chip on scroll (rect would be stale).
  useEffect(() => {
    if (!chip) return;
    const onScroll = () => setChip(null);
    window.addEventListener('scroll', onScroll, true);
    return () => window.removeEventListener('scroll', onScroll, true);
  }, [chip]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {chip && (
        <motion.button
          key={chip.nonce}
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            actions.undo();
            setChip(null);
          }}
          initial={{ opacity: 0, y: 6, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.92 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: 'fixed',
            top: chip.top,
            left: chip.left,
            transform: 'translateX(-50%)',
            zIndex: 'var(--z-max)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 10px 5px 8px',
            borderRadius: 'var(--pl-radius-full)',
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(24,24,27,0.92)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            color: '#FDFAF0',
            fontSize: 11,
            fontWeight: 600,
            fontFamily: 'inherit',
            letterSpacing: '0.01em',
            cursor: 'pointer',
            boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
            pointerEvents: 'auto',
          }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          title={`Undo: ${chip.label}`}
        >
          <RotateCcw size={11} />
          <span>Undo</span>
          <span style={{
            fontWeight: 500,
            color: 'rgba(255,255,255,0.55)',
            maxWidth: 140,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            · {chip.label}
          </span>
        </motion.button>
      )}
    </AnimatePresence>,
    document.body,
  );
}
