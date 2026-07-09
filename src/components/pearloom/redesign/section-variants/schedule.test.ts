// Long-content resilience (Wave 2) — the stepper no longer renders
// one endless horizontal scroll: past 5 moments a day wraps onto
// stacked stepper lines. Pins the chunker the layout is built on.

import { describe, it, expect } from 'vitest';
import { chunkStepperRows } from './schedule';

describe('chunkStepperRows', () => {
  it('keeps short days on one line', () => {
    expect(chunkStepperRows([1, 2, 3])).toEqual([[1, 2, 3]]);
    expect(chunkStepperRows([1, 2, 3, 4, 5])).toEqual([[1, 2, 3, 4, 5]]);
  });

  it('wraps a long weekend into lines of 5', () => {
    const rows = Array.from({ length: 13 }, (_, i) => i);
    expect(chunkStepperRows(rows).map((line) => line.length)).toEqual([5, 5, 3]);
  });

  it('returns [] for an empty day (no phantom line)', () => {
    expect(chunkStepperRows([])).toEqual([]);
  });
});
