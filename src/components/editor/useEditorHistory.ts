'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/editor/useEditorHistory.ts
// Generic undo/redo hook — up to 50 history entries
// ─────────────────────────────────────────────────────────────

import { useState, useCallback, useRef } from 'react';

const MAX_HISTORY = 50;

export interface EditorHistory<T> {
  value: T;
  set: (v: T) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  historyLength: number;
}

export function useEditorHistory<T>(initialValue: T): EditorHistory<T> {
  // Stack of states; index points at the "current" position
  const stackRef = useRef<T[]>([initialValue]);
  const indexRef = useRef<number>(0);

  // Reactive state — only re-renders when canUndo/canRedo/value change
  const [, forceRender] = useState(0);
  const rerender = () => forceRender(n => n + 1);

  const set = useCallback((v: T) => {
    // Trim the redo stack (everything after current index)
    const trimmed = stackRef.current.slice(0, indexRef.current + 1);
    trimmed.push(v);
    // Cap at MAX_HISTORY entries (drop oldest)
    if (trimmed.length > MAX_HISTORY) {
      trimmed.shift();
    }
    stackRef.current = trimmed;
    indexRef.current = trimmed.length - 1;
    rerender();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const undo = useCallback(() => {
    if (indexRef.current <= 0) return;
    indexRef.current -= 1;
    rerender();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const redo = useCallback(() => {
    if (indexRef.current >= stackRef.current.length - 1) return;
    indexRef.current += 1;
    rerender();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const idx = indexRef.current;
  const stack = stackRef.current;

  return {
    value: stack[idx],
    set,
    undo,
    redo,
    canUndo: idx > 0,
    canRedo: idx < stack.length - 1,
    historyLength: stack.length,
  };
}
