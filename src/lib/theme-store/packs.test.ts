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

  it('pack-exclusive materials never ship on free packs', () => {
    const leaks: string[] = [];
    for (const p of PACKS) {
      if (p.tier !== 'free') continue;
      if (EXCLUSIVE_KITS.has(p.kit)) leaks.push(`${p.id}: kit ${p.kit}`);
      if (EXCLUSIVE_TEXTURES.has(p.texture)) leaks.push(`${p.id}: texture ${p.texture}`);
      if (EXCLUSIVE_PATTERNS.has(p.pattern)) leaks.push(`${p.id}: pattern ${p.pattern}`);
      if (EXCLUSIVE_MOTIFS.has(p.motif)) leaks.push(`${p.id}: motif ${p.motif}`);
      if (p.divider && EXCLUSIVE_DIVIDERS.has(p.divider)) leaks.push(`${p.id}: divider ${p.divider}`);
      if (p.monogramFrame && EXCLUSIVE_MONOGRAMS.has(p.monogramFrame)) leaks.push(`${p.id}: monogram ${p.monogramFrame}`);
    }
    expect(leaks, `exclusives on free packs:\n${leaks.join('\n')}`).toEqual([]);
  });
});
