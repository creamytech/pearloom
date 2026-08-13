// ─────────────────────────────────────────────────────────────
// Pearloom / lib/event-os/rsvp-presets.test.ts
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { getRsvpFields, RSVP_PRESET_IDS } from './rsvp-presets';
import { EVENT_TYPES } from './event-types';

describe('RSVP presets', () => {
  it('every preset has a non-empty field list', () => {
    for (const id of RSVP_PRESET_IDS) {
      const fields = getRsvpFields(id);
      expect(fields.length).toBeGreaterThan(0);
    }
  });

  it('every preset starts with an attending field', () => {
    for (const id of RSVP_PRESET_IDS) {
      const fields = getRsvpFields(id);
      expect(fields[0]?.kind).toBe('attending');
      expect(fields[0]?.required).toBe(true);
    }
  });

  it('every preset has unique field kinds', () => {
    for (const id of RSVP_PRESET_IDS) {
      const kinds = getRsvpFields(id).map((f) => f.kind);
      expect(new Set(kinds).size).toBe(kinds.length);
    }
  });

  it('every event type references a valid preset', () => {
    const presetSet = new Set(RSVP_PRESET_IDS);
    for (const e of EVENT_TYPES) {
      expect(presetSet.has(e.rsvpPreset)).toBe(true);
    }
  });
});
