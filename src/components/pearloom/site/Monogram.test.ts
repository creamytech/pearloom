// ─────────────────────────────────────────────────────────────
// deriveInitials — couple vs solo-honoree crest derivation.
//
// The solo flag exists because a solo full name ('Eleanor Rose
// Thompson') is indistinguishable from a two-person subject by
// string shape alone — without it the middle name reads as a
// partner and solo sites crest a couple-style pair (2026-06-10
// fix). Callers pass solo only for DERIVED sources; host-typed
// initials parse verbatim.
// ─────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import { deriveInitials } from './Monogram';

describe('deriveInitials — couple subjects (default)', () => {
  it('splits an ampersand pair', () => {
    expect(deriveInitials('Emma & James')).toMatchObject({ initA: 'E', initB: 'J' });
  });

  it('treats two bare words as a pair', () => {
    expect(deriveInitials('Scott Shauna')).toMatchObject({ initA: 'S', initB: 'S' });
  });

  it('falls back to the A/B placeholder pair when empty', () => {
    expect(deriveInitials('')).toMatchObject({ initA: 'A', initB: 'B' });
    expect(deriveInitials(null)).toMatchObject({ initA: 'A', initB: 'B' });
  });

  it('honours short initials-form strings verbatim', () => {
    expect(deriveInitials('EJ')).toMatchObject({ initA: 'E', initB: 'J' });
    expect(deriveInitials('E&J')).toMatchObject({ initA: 'E', initB: 'J' });
    expect(deriveInitials('E')).toMatchObject({ initA: 'E', initB: '' });
  });

  it('single name gets a single initial even without the flag', () => {
    expect(deriveInitials('Eleanor')).toMatchObject({ initA: 'E', initB: '' });
  });
});

describe('deriveInitials — solo honoree', () => {
  it('crests one initial from a multi-word full name', () => {
    expect(deriveInitials('Eleanor Rose Thompson', { solo: true }))
      .toMatchObject({ initA: 'E', initB: '' });
  });

  it('crests one initial from a two-word name', () => {
    expect(deriveInitials('Kai Nakamura', { solo: true }))
      .toMatchObject({ initA: 'K', initB: '' });
  });

  it('never resurrects a pair from an ampersand source', () => {
    expect(deriveInitials('Eleanor & Rose', { solo: true }))
      .toMatchObject({ initA: 'E', initB: '' });
  });

  it('collapses short initials-form strings to the first letter', () => {
    expect(deriveInitials('EJ', { solo: true })).toMatchObject({ initA: 'E', initB: '' });
  });

  it('falls back to a single placeholder initial when empty', () => {
    expect(deriveInitials('', { solo: true })).toMatchObject({ initA: 'A', initB: '' });
  });
});
