'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/canvas/useEditorHistory.ts
//
// Editor undo/redo stack. The hot path lives in memory so undo
// is instantaneous (typing burst → single undo via 650ms
// coalesce). The past stack mirrors to IndexedDB per siteSlug
// so an accidental Ctrl+R / tab close doesn't wipe history —
// the next mount rehydrates whatever survived to IDB. Cap is
// 40 snapshots per site (RING_CAP).
//
// Wires Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z shortcuts globally,
// skipping inputs / contentEditable so per-field undo still
// works while a user is typing.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';
import type { StoryManifest } from '@/types';
import { appendSnapshot, loadHistory, popSnapshot } from '@/lib/editor-undo-db';

interface Snapshot {
  manifest: StoryManifest;
  names: [string, string];
  at: number;
}

const MAX_SNAPSHOTS = 80;
const COALESCE_MS = 650;
let historyCapWarned = false;

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
 *  every change and `undo`/`redo` from keyboard/menu.
 *
 *  When `siteSlug` is provided, the past stack mirrors to
 *  IndexedDB so a refresh / accidental tab close keeps history
 *  available the next time the editor mounts. */
export function useEditorHistory(
  initialManifest: StoryManifest,
  initialNames: [string, string],
  onRestore: (manifest: StoryManifest, names: [string, string]) => void,
  siteSlug?: string,
): EditorHistoryApi {
  const pastRef = useRef<Snapshot[]>([]);
  const futureRef = useRef<Snapshot[]>([]);
  const currentRef = useRef<Snapshot>({ manifest: initialManifest, names: initialNames, at: Date.now() });
  const coalesceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-render trigger when undo/redo state changes.
  const [, forceRerender] = useState(0);
  const bump = useCallback(() => forceRerender((n) => n + 1), []);

  // ── Hydrate from IndexedDB on mount ─────────────────────
  // Loads any past snapshots persisted from a prior session for
  // this site. Idempotent — runs once per site change. Doesn't
  // restore the manifest (the editor already has fresh state from
  // the network); it only repopulates the past stack so Cmd-Z
  // walks back through prior-session edits.
  useEffect(() => {
    if (!siteSlug || typeof window === 'undefined') return;
    let cancelled = false;
    void loadHistory(siteSlug).then((rows) => {
      if (cancelled || rows.length === 0) return;
      // The newest stored row corresponds to the last committed
      // state — treat it as "current" if it matches the current
      // manifest, otherwise treat all rows as past.
      pastRef.current = rows.map((r) => ({ manifest: r.manifest, names: r.names, at: r.at }));
      bump();
    });
    return () => { cancelled = true; };
  }, [siteSlug, bump]);

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
        if (pastRef.current.length > MAX_SNAPSHOTS) {
          pastRef.current.shift();
          // One-time warn so we know when users are hitting the cap
          // (dev tool; not user-visible). The IDB ring is capped at
          // 40 by editor-undo-db so this rarely matters in practice.
          if (!historyCapWarned) {
            historyCapWarned = true;
            console.warn(`[editor] Undo history capped at ${MAX_SNAPSHOTS} entries; oldest dropping off.`);
          }
        }
        currentRef.current = { manifest, names, at: now };
        futureRef.current = [];
        // Mirror the new committed snapshot to IndexedDB so it
        // survives a refresh. Fire-and-forget — failures here only
        // affect cross-session persistence; in-session undo is
        // already up to date.
        if (siteSlug) {
          void appendSnapshot(siteSlug, { manifest, names, at: now });
        }
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
    // Pop the matching IDB row so the persisted ring stays in sync
    // with the in-memory stack. If the user redoes, the next record
    // call will re-append.
    if (siteSlug) void popSnapshot(siteSlug);
    bump();
  }, [onRestore, bump, siteSlug]);

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
