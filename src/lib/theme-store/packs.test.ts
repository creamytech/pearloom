// ─────────────────────────────────────────────────────────────
// Theme-pack catalog invariants (2026-06-13).
//
// 1. EVERY pack's look recipe is unique — the host complaint that
//    triggered the exclusivity round was "you can make any theme
//    right now just by messing in the settings"; the first step
//    of fixing that was discovering several packs shared an
//    IDENTICAL (kit, texture, motif, pattern, divider, monogram)
//    tuple. This test makes catalog uniqueness a build invariant:
//    add a pack that copies another's structure and CI says so.
//
// 2. Pack-exclusive materials never appear on free packs — the
//    exclusives exist to make paid packs worth paying for.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
  PACKS,
  EXCLUSIVE_KITS,
  EXCLUSIVE_TEXTURES,
  EXCLUSIVE_PATTERNS,
  dividerForMotif,
} from './packs';

const EXCLUSIVE_MOTIFS = new Set(['chandelier', 'bow', 'sparkler']);
const EXCLUSIVE_DIVIDERS = new Set(['gilt-chain', 'stitch-seam', 'marquee-bulbs', 'crystal-drops']);
const EXCLUSIVE_MONOGRAMS = new Set(['gilt', 'bow-crest', 'marquee']);

describe('theme pack catalog', () => {
  it('every pack has a unique look recipe (kit · texture · motif · pattern · divider · monogram)', () => {
    const seen = new Map<string, string>();
    const dupes: string[] = [];
    for (const p of PACKS) {
      const fingerprint = [
        p.kit,
        p.texture,
        p.motif,
        p.pattern,
        p.divider ?? dividerForMotif(p.motif),
        p.monogramFrame ?? '',
      ].join('|');
      const prior = seen.get(fingerprint);
      if (prior) dupes.push(`${prior} == ${p.id} (${fingerprint})`);
      seen.set(fingerprint, p.id);
    }
    expect(dupes, `duplicate look recipes:\n${dupes.join('\n')}`).toEqual([]);
  });

  it('every pack is free — the tier system stays collapsed (E.1)', () => {
    // The old test here kept pack-exclusive materials OFF free packs
    // ("the exclusives exist to make paid packs worth paying for") —
    // that policy is retired: pack-signature materials are each
    // pack's signature, not bait, and every pack is free.
    for (const p of PACKS) {
      expect(p.tier, `${p.id} carries a paid tier`).toBe('free');
      expect(p.priceCents, `${p.id} carries a price`).toBe(0);
    }
  });
});
