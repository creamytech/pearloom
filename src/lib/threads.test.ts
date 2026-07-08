// ─────────────────────────────────────────────────────────────
// Pearloom / lib/threads.test.ts — orderPair is the invariant that
// keeps one thread per pair (lo < hi, case-normalized). Pin it.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { orderPair } from './threads';

const A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

describe('orderPair', () => {
  it('orders lo < hi regardless of argument order', () => {
    expect(orderPair(A, B)).toEqual([A, B]);
    expect(orderPair(B, A)).toEqual([A, B]);
  });
  it('normalizes case so the same pair can never fork', () => {
    expect(orderPair(A.toUpperCase(), B)).toEqual([A, B]);
  });
  it('refuses self-pairs and junk', () => {
    expect(orderPair(A, A)).toBeNull();
    expect(orderPair('not-a-uuid', B)).toBeNull();
    expect(orderPair('', '')).toBeNull();
  });
});
