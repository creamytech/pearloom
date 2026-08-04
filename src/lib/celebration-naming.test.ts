// ─────────────────────────────────────────────────────────────
// celebration-naming — the container never calls a funeral a
// celebration.
//
// The internal id stays `celebration` (table, manifest field, API
// path). What these tests defend is the HOST-FACING label: a
// memorial planner must never read "your celebration", and a mixed
// weekend arc must fall to the gentlest register rather than the
// most common one.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
  containerNoun,
  containerLabel,
  containerNounPlural,
  containerNounForSet,
  containerLabelForSet,
} from './celebration-naming';
import { EVENT_TYPES } from '@/lib/event-os/event-types';

describe('containerNoun — register per occasion', () => {
  it('never says "celebration" for a solemn occasion', () => {
    for (const occasion of ['memorial', 'funeral']) {
      expect(containerNoun(occasion), occasion).toBe('remembrance');
      expect(containerLabel(occasion)).toBe('Remembrance');
    }
  });

  it('says "celebration" for celebratory and ceremonial occasions', () => {
    for (const occasion of ['wedding', 'birthday', 'baby-shower', 'quinceanera', 'bar-mitzvah', 'graduation']) {
      expect(containerNoun(occasion), occasion).toBe('celebration');
    }
  });

  it('uses the neutral "gathering" for a reunion', () => {
    expect(containerNoun('reunion')).toBe('gathering');
    expect(containerLabel('reunion')).toBe('Gathering');
  });

  it('derives from the registry voice, not a hardcoded list', () => {
    // If a new solemn occasion is added to EVENT_TYPES it must be
    // handled without editing celebration-naming.ts. Proxy for that:
    // every registry occasion whose voice is solemn reads as a
    // remembrance.
    const solemn = EVENT_TYPES.filter((e) => e.voice === 'solemn');
    expect(solemn.length).toBeGreaterThan(0);
    for (const e of solemn) {
      expect(containerNoun(e.id), e.id).toBe('remembrance');
    }
  });

  it('falls back to "celebration" for unknown/absent occasions', () => {
    expect(containerNoun(null)).toBe('celebration');
    expect(containerNoun(undefined)).toBe('celebration');
    expect(containerNoun('')).toBe('celebration');
    expect(containerNoun('not-a-real-occasion')).toBe('celebration');
  });

  it('pluralizes', () => {
    expect(containerNounPlural('wedding')).toBe('celebrations');
    expect(containerNounPlural('memorial')).toBe('remembrances');
    expect(containerNounPlural('reunion')).toBe('gatherings');
  });
});

describe('containerNounForSet — a mixed arc takes the gentlest register', () => {
  it('one solemn event makes the whole container a remembrance', () => {
    expect(containerNounForSet(['wedding', 'brunch', 'memorial'])).toBe('remembrance');
    expect(containerLabelForSet(['memorial', 'reunion'])).toBe('Remembrance');
  });

  it('an all-gathering arc stays a gathering', () => {
    expect(containerNounForSet(['reunion', 'reunion'])).toBe('gathering');
  });

  it('a mixed celebratory/gathering arc is a celebration', () => {
    expect(containerNounForSet(['wedding', 'reunion'])).toBe('celebration');
  });

  it('an empty set is a celebration (the product default)', () => {
    expect(containerNounForSet([])).toBe('celebration');
  });
});
