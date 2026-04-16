import { describe, it, expect } from 'vitest';
import { sanitizeSeatingPlan } from './seating-sanitize';

describe('sanitizeSeatingPlan', () => {
  const tables = [
    { label: 'A', capacity: 2 },
    { label: 'B', capacity: 2 },
  ];

  it('trims overflow at over-capacity tables and pushes to unseated', () => {
    const result = sanitizeSeatingPlan({
      planTables: [
        { label: 'A', guestIds: ['g1', 'g2', 'g3'], rationale: 'core crew' },
        { label: 'B', guestIds: ['g4', 'g5'], rationale: 'friends' },
      ],
      planUnseated: [],
      tables,
      edges: [],
    });
    expect(result.tables[0].guestIds).toEqual(['g1', 'g2']);
    expect(result.tables[1].guestIds).toEqual(['g4', 'g5']);
    expect(result.unseatedGuestIds).toContain('g3');
  });

  it('dedupes guests across tables (first assignment wins)', () => {
    const result = sanitizeSeatingPlan({
      planTables: [
        { label: 'A', guestIds: ['g1', 'g2'], rationale: '' },
        { label: 'B', guestIds: ['g2', 'g3'], rationale: '' },
      ],
      planUnseated: [],
      tables,
      edges: [],
    });
    expect(result.tables[0].guestIds).toEqual(['g1', 'g2']);
    expect(result.tables[1].guestIds).toEqual(['g3']);
  });

  it('preserves planner-provided unseated that were not re-seated', () => {
    const result = sanitizeSeatingPlan({
      planTables: [{ label: 'A', guestIds: ['g1'], rationale: '' }],
      planUnseated: ['g9', 'g1'], // g1 was actually seated; g9 legitimately unseated
      tables,
      edges: [],
    });
    expect(result.unseatedGuestIds).toEqual(['g9']);
  });

  it('is case-insensitive on table labels', () => {
    const result = sanitizeSeatingPlan({
      planTables: [{ label: 'a', guestIds: ['g1', 'g2', 'g3'], rationale: '' }],
      planUnseated: [],
      tables: [{ label: 'A', capacity: 2 }],
      edges: [],
    });
    expect(result.tables[0].guestIds.length).toBe(2);
  });

  it('computes closeness score as sum of same-table edge closeness', () => {
    const result = sanitizeSeatingPlan({
      planTables: [
        { label: 'A', guestIds: ['g1', 'g2'], rationale: '' },
        { label: 'B', guestIds: ['g3', 'g4'], rationale: '' },
      ],
      planUnseated: [],
      tables,
      edges: [
        { from_guest_id: 'g1', to_guest_id: 'g2', closeness: 5 }, // same table
        { from_guest_id: 'g1', to_guest_id: 'g3', closeness: 3 }, // cross table
        { from_guest_id: 'g3', to_guest_id: 'g4', closeness: 4 }, // same table
      ],
    });
    expect(result.stats.closenessScore).toBe(9);        // 5 + 4
    expect(result.stats.closenessPossible).toBe(12);    // 5 + 3 + 4
  });

  it('ignores malformed edges', () => {
    const result = sanitizeSeatingPlan({
      planTables: [{ label: 'A', guestIds: ['g1', 'g2'], rationale: '' }],
      planUnseated: [],
      tables,
      edges: [
        { from_guest_id: null, to_guest_id: 'g2', closeness: 5 },
        { from_guest_id: 'g1', to_guest_id: 'g2', closeness: null },
      ],
    });
    expect(result.stats.closenessPossible).toBe(0);
    expect(result.stats.closenessScore).toBe(0);
  });
});
