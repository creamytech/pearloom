'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/canvas/useEditorHistory.ts
//
// In-memory undo/redo stack for the editor. Captures manifest
// + names snapshots, coalesces rapid edits (so a single
// typing burst becomes one undo, not one-per-keystroke), and
// wires Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z shortcuts.
//
// Deliberately does NOT persist across page reloads — that's
// the DB's job. This gives the user a fast in-session undo.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';
import type { StoryManifest } from '@/types';

interface Snapshot {
  manifest: StoryManifest;
  names: [string, string];
  at: number;
}

const MAX_SNAPSHOTS = 50;
const COALESCE_MS = 650;

export interface EditorHistoryApi {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  /** Called by the editor's onManifestChange after applying
   *  a patch. The history records the NEW state; the old
   *  state is already in the stack. */
  record: (manifest: StoryManifest, names: [string, string]) => void;
}

/** Hook that manages the undo/redo stack. Returns the API plus
 *  the current state to render; the editor calls `record` on
 *  every change and `undo`/`redo` from keyboard/menu. */
export function useEditorHistory(
  initialManifest: StoryManifest,
  initialNames: [string, string],
  onRestore: (manifest: StoryManifest, names: [string, string]) => void,
): EditorHistoryApi {
  const pastRef = useRef<Snapshot[]>([]);
  const futureRef = useRef<Snapshot[]>([]);
  const currentRef = useRef<Snapshot>({ manifest: initialManifest, names: initialNames, at: Date.now() });
  const coalesceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-render trigger when undo/redo state changes.
  const [, forceRerender] = useState(0);
  const bump = useCallback(() => forceRerender((n) => n + 1), []);

  const record = useCallback(
    (manifest: StoryManifest, names: [string, string]) => {
      const now = Date.now();
      const cur = currentRef.current;
      // Coalesce edits within the debounce window into the
      // same history entry. A fresh typing burst > COALESCE_MS
      // after the last push creates a new undo step.
      if (coalesceTimer.current) clearTimeout(coalesceTimer.current);
      coalesceTimer.current = setTimeout(() => {
        // Push the PREVIOUS current into the past; update current
        // to the committed snapshot; drop the redo queue since
        // we've branched the history.
        pastRef.current.push(cur);
        if (pastRef.current.length > MAX_SNAPSHOTS) pastRef.current.shift();
        currentRef.current = { manifest, names, at: now };
        futureRef.current = [];
        bump();
      }, COALESCE_MS);
      // Update the "current" optimistically so the next record
      // uses the latest snapshot when it fires — but don't push
      // onto `past` until the coalesce window ends.
      currentRef.current = { manifest, names, at: now };
    },
    [bump],
  );

  const undo = useCallback(() => {
    const prev = pastRef.current.pop();
    if (!prev) return;
    futureRef.current.push(currentRef.current);
    currentRef.current = prev;
    onRestore(prev.manifest, prev.names);
    bump();
  }, [onRestore, bump]);

  const redo = useCallback(() => {
    const next = futureRef.current.pop();
    if (!next) return;
    pastRef.current.push(currentRef.current);
    currentRef.current = next;
    onRestore(next.manifest, next.names);
    bump();
  }, [onRestore, bump]);

  // Keyboard shortcuts — Cmd/Ctrl+Z (undo), Cmd/Ctrl+Shift+Z
  // (redo). Skip inside form inputs so the user's typing undo
  // still works within a field.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      if (e.key.toLowerCase() !== 'z') return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  return {
    canUndo: pastRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
    undo,
    redo,
    record,
  };
}
