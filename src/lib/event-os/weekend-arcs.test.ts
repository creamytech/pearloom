import { describe, it, expect } from 'vitest';
import { WEEKEND_ANCHORS, weekendArcFor } from './weekend-arcs';
import { getEventType } from './event-types';

describe('weekend arcs', () => {
  it('every anchor and event kind is a registered occasion', () => {
    for (const a of WEEKEND_ANCHORS) {
      expect(getEventType(a.id), `anchor ${a.id}`).toBeTruthy();
      for (const e of a.events) {
        expect(getEventType(e.kind), `${a.id} → ${e.kind}`).toBeTruthy();
      }
    }
  });

  it('every arc has exactly one main event (the anchor site) and unique slug suffixes', () => {
    for (const a of WEEKEND_ANCHORS) {
      const mains = a.events.filter((e) => e.sluffix === '');
      expect(mains.length, a.id).toBe(1);
      expect(mains[0].kind, a.id).toBe(a.id);
      const sluffixes = a.events.map((e) => e.sluffix);
      expect(new Set(sluffixes).size, `${a.id} slug suffixes collide`).toBe(sluffixes.length);
    }
  });

  it('every arc recommends its main event and offers at least one satellite', () => {
    for (const a of WEEKEND_ANCHORS) {
      expect(a.events.find((e) => e.sluffix === '')?.recommended, a.id).toBe(true);
      expect(a.events.filter((e) => e.sluffix !== '').length, a.id).toBeGreaterThan(0);
    }
  });

  it('weekendArcFor falls back to the wedding arc', () => {
    expect(weekendArcFor(undefined).id).toBe('wedding');
    expect(weekendArcFor('block-party').id).toBe('wedding');
    expect(weekendArcFor('quinceanera').id).toBe('quinceanera');
  });
});
