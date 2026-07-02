// ─────────────────────────────────────────────────────────────
// _reorder.test.ts — the pure helpers behind the shared reorder
// primitive. Every list panel writes through these; the contracts
// pinned here are what makes "reorder is safe" true everywhere.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { moveItem, swapItems, moveIndexKeyed } from './_reorder';

describe('moveItem', () => {
  it('moves an item down the list', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('moves an item up the list', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('adjacent move is a swap', () => {
    expect(moveItem(['a', 'b', 'c'], 1, 2)).toEqual(['a', 'c', 'b']);
  });

  it('returns the ORIGINAL array (reference-equal) on no-op or out-of-range, so callers can skip the write', () => {
    const list = ['a', 'b'];
    expect(moveItem(list, 0, 0)).toBe(list);
    expect(moveItem(list, 0, 2)).toBe(list);
    expect(moveItem(list, -1, 0)).toBe(list);
  });

  it('never mutates the input', () => {
    const list = ['a', 'b', 'c'];
    moveItem(list, 0, 2);
    expect(list).toEqual(['a', 'b', 'c']);
  });
});

describe('swapItems', () => {
  it('swaps two non-adjacent positions (grouped-list "move up" across other days)', () => {
    expect(swapItems(['a', 'b', 'c', 'd'], 0, 3)).toEqual(['d', 'b', 'c', 'a']);
  });

  it('returns the original array on no-op / out-of-range', () => {
    const list = ['a', 'b'];
    expect(swapItems(list, 1, 1)).toBe(list);
    expect(swapItems(list, 1, 2)).toBe(list);
  });
});

describe('moveIndexKeyed (gallery captions sidecar)', () => {
  it('keeps every caption attached to its photo when a photo moves down', () => {
    // photos [p0, p1, p2, p3] with captions on 0 + 2; move p0 → index 2.
    const captions = { '0': 'first dance', '2': 'the caldera' };
    expect(moveIndexKeyed(captions, 0, 2)).toEqual({ '2': 'first dance', '1': 'the caldera' });
  });

  it('keeps captions attached when a photo moves up', () => {
    const captions = { '0': 'a', '2': 'c', '3': 'd' };
    expect(moveIndexKeyed(captions, 3, 1)).toEqual({ '0': 'a', '3': 'c', '1': 'd' });
  });

  it('leaves captions outside the moved span untouched', () => {
    const captions = { '0': 'a', '4': 'e' };
    expect(moveIndexKeyed(captions, 1, 2)).toEqual({ '0': 'a', '4': 'e' });
  });

  it('preserves non-integer keys verbatim', () => {
    const captions = { '0': 'a', 'legacy': 'x' };
    expect(moveIndexKeyed(captions, 0, 1)).toEqual({ '1': 'a', 'legacy': 'x' });
  });

  it('round-trips with moveItem — caption text follows the same photo', () => {
    const photos = ['p0', 'p1', 'p2', 'p3'];
    const captions: Record<string, string> = { '1': 'cap-p1', '3': 'cap-p3' };
    const from = 3; const to = 0;
    const movedPhotos = moveItem(photos, from, to);
    const movedCaps = moveIndexKeyed(captions, from, to);
    // cap-p3 must still sit at p3's new index; cap-p1 at p1's.
    expect(movedPhotos[Number(Object.keys(movedCaps).find((k) => movedCaps[k] === 'cap-p3'))]).toBe('p3');
    expect(movedPhotos[Number(Object.keys(movedCaps).find((k) => movedCaps[k] === 'cap-p1'))]).toBe('p1');
  });
});
