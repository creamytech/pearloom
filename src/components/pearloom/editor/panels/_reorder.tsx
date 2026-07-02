'use client';

/* eslint-disable no-restricted-syntax */
/* _reorder — the shared list-reorder primitive (editor chrome).

   Order IS content in most section panels: an order of service, a
   menu's course sequence, the processional, a photo wall. Every
   list panel mounts the same ▲/▼ handle (ReorderHandle) and writes
   the moved array back through its existing onChange path, so
   every reorder is one manifest write — debounced, autosaved, and
   undoable via the bridge like any other edit.

   The pure helpers live here too (moveItem / swapItems /
   moveIndexKeyed) so panels never fork splice logic and the
   contracts stay unit-testable (_reorder.test.ts).

   Touch: buttons grow to a ≥44px-wide hit column on coarse
   pointers via .pl8-reorder-btn (pearloom.css) — same pattern as
   .pl-hit44, without the overlap two stacked expanded targets
   would create. */

import { Icon } from '../../motifs';

/** Pure move — a new array with the item at `from` re-inserted at
 *  `to`. Out-of-range or no-op moves return the ORIGINAL array
 *  (reference-equal), so callers can skip the manifest write. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  if (from === to) return list as T[];
  if (from < 0 || from >= list.length || to < 0 || to >= list.length) return list as T[];
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/** Pure swap of two positions. Used by grouped lists (multi-day
 *  schedule) where "move up" means trading places with the previous
 *  row of the SAME group — which may not be adjacent in the flat
 *  array. Out-of-range or no-op swaps return the original array. */
export function swapItems<T>(list: readonly T[], i: number, j: number): T[] {
  if (i === j) return list as T[];
  if (i < 0 || i >= list.length || j < 0 || j >= list.length) return list as T[];
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

/** Remap an index-keyed sidecar record (e.g. manifest.galleryCaptions,
 *  keyed by stringified photo index) after moveItem(list, from, to),
 *  so each entry stays attached to the item it described. Non-integer
 *  keys are preserved untouched. */
export function moveIndexKeyed(
  record: Record<string, string>,
  from: number,
  to: number,
): Record<string, string> {
  if (from === to) return record;
  const next: Record<string, string> = {};
  for (const [k, v] of Object.entries(record)) {
    const ki = Number(k);
    if (!Number.isInteger(ki) || String(ki) !== k) { next[k] = v; continue; }
    let mapped = ki;
    if (ki === from) mapped = to;
    else if (from < to && ki > from && ki <= to) mapped = ki - 1;
    else if (from > to && ki >= to && ki < from) mapped = ki + 1;
    next[String(mapped)] = v;
  }
  return next;
}

/** Stacked ▲/▼ move buttons for one list row. `onMove(from, to)`
 *  fires with the row's current index and its target — the panel
 *  maps that onto its own write path (moveItem / swapItems). Ends
 *  disable rather than hide, so the column never shifts layout. */
export function ReorderHandle({
  index, count, onMove, label = 'item',
}: {
  index: number;
  count: number;
  onMove: (from: number, to: number) => void;
  label?: string;
}) {
  const btn = (dir: -1 | 1) => {
    const disabled = dir === -1 ? index === 0 : index === count - 1;
    return (
      <button
        type="button"
        className="pl8-reorder-btn"
        aria-label={`Move ${label} ${dir === -1 ? 'up' : 'down'}`}
        disabled={disabled}
        onClick={() => onMove(index, index + dir)}
        style={{
          width: 26, height: 20,
          display: 'grid', placeItems: 'center',
          background: 'transparent', border: 'none', padding: 0,
          cursor: disabled ? 'default' : 'pointer',
          color: 'var(--ink-muted)',
          opacity: disabled ? 0.3 : 1,
        }}
      >
        <Icon name={dir === -1 ? 'chev-up' : 'chev-down'} size={11} />
      </button>
    );
  };
  return (
    <span
      style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0, alignSelf: 'center' }}
      /* Row cards often live inside toggle rows (FAQ) — a reorder
         tap must never bubble into an open/close. */
      onClick={(e) => e.stopPropagation()}
    >
      {btn(-1)}
      {btn(1)}
    </span>
  );
}
