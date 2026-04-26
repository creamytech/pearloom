'use client';

// ──────────────────────────────────────────────────────────────
// useFieldEdit — central inline-edit dispatcher.
//
// Resolves a dotted manifest path ("poetry.heroTagline",
// "logistics.dressCode", "chapters[0].description") to a
// read-current + write-next pair of callbacks. Backs every
// EditableText on the canvas so per-block panels and inline edits
// share the same source of truth — no diverging state, no panel
// staleness when a user types on the canvas.
//
// Path syntax:
//   "a.b"          — object property
//   "a[0].b"       — array index
//   "a.b[3].c"     — mixed
//
// Out of scope: typed-path safety. Callers know the shape of their
// own block (it's their panel anyway). The escape hatch is a
// transformer arg if a path-only update isn't enough.
// ──────────────────────────────────────────────────────────────

import { useCallback, useMemo } from 'react';
import type { StoryManifest } from '@/types';

type FieldEditor = (patch: (m: StoryManifest) => StoryManifest) => void;

export interface FieldHandle<T = string> {
  /** Current value at the path. */
  value: T;
  /** Write a new value. */
  set: (next: T) => void;
}

/** Tokenise a path ("a.b[2].c") into its segments. */
function tokens(path: string): Array<string | number> {
  if (!path) return [];
  const out: Array<string | number> = [];
  let cur = '';
  for (let i = 0; i < path.length; i++) {
    const c = path[i];
    if (c === '.') {
      if (cur) { out.push(cur); cur = ''; }
    } else if (c === '[') {
      if (cur) { out.push(cur); cur = ''; }
      const close = path.indexOf(']', i);
      if (close < 0) throw new Error(`Bad path: ${path}`);
      const idx = parseInt(path.slice(i + 1, close), 10);
      if (Number.isNaN(idx)) throw new Error(`Bad index in path: ${path}`);
      out.push(idx);
      i = close;
    } else {
      cur += c;
    }
  }
  if (cur) out.push(cur);
  return out;
}

function readPath(root: unknown, ts: Array<string | number>): unknown {
  let cur: unknown = root;
  for (const t of ts) {
    if (cur == null) return undefined;
    if (typeof t === 'number') {
      if (!Array.isArray(cur)) return undefined;
      cur = cur[t];
    } else {
      if (typeof cur !== 'object') return undefined;
      cur = (cur as Record<string, unknown>)[t];
    }
  }
  return cur;
}

function writePath<T>(root: T, ts: Array<string | number>, value: unknown): T {
  if (ts.length === 0) return value as T;
  // Walk + clone each level so React sees a new reference.
  const head = ts[0]!;
  const rest = ts.slice(1);
  if (typeof head === 'number') {
    const arr = Array.isArray(root) ? [...root] : [];
    arr[head] = writePath(arr[head], rest, value);
    return arr as unknown as T;
  }
  const obj = root && typeof root === 'object' ? { ...(root as Record<string, unknown>) } : {};
  (obj as Record<string, unknown>)[head] = writePath(
    (obj as Record<string, unknown>)[head],
    rest,
    value,
  );
  return obj as T;
}

/** Hook: returns a stable {value, set} pair for a manifest path. */
export function useFieldEdit<T = string>(
  manifest: StoryManifest,
  path: string,
  onEditField?: FieldEditor,
  fallback: T = '' as unknown as T,
): FieldHandle<T> {
  const ts = useMemo(() => tokens(path), [path]);
  const value = (readPath(manifest, ts) as T | undefined) ?? fallback;

  const set = useCallback((next: T) => {
    onEditField?.((m) => writePath(m, ts, next));
  }, [onEditField, ts]);

  return { value, set };
}
