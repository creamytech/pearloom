// ─────────────────────────────────────────────────────────────
// proofs.test.ts — the pure half of the proof-sheet pass:
// pack-character → stylize-style mapping, and the raw-model →
// validated-SuiteProof coercion (invalid ids must coerce to
// suite defaults, never throw; short sheets must pad).
// generateProofSheet itself (the Claude call) is not unit-tested.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import type { StoryManifest } from '@/types';
import { suiteThemeFromManifest } from '@/lib/suite/theme';
import {
  stylizeStyleForSuite,
  coerceProofSheet,
  buildCoerceContext,
} from '@/lib/suite/proofs';
import { PALETTES, LAYOUTS, MOTIFS, FONT_PAIRS, COPY_TONES } from '@/components/pearloom/studio/studio-constants';

function manifestOf(extra: Record<string, unknown> = {}): StoryManifest {
  return {
    occasion: 'wedding',
    theme: { colors: { accent: '#5C6B3F' } },
    ...extra,
  } as unknown as StoryManifest;
}

const PALETTE_IDS = new Set(PALETTES.map((p) => p.id));
const LAYOUT_IDS = new Set(LAYOUTS.map((l) => l.id));
const MOTIF_IDS = new Set(MOTIFS.map((m) => m.id));
const FONT_IDS = new Set(FONT_PAIRS.map((f) => f.id));
const TONE_IDS = new Set(COPY_TONES.map((t) => t.id));

describe('stylizeStyleForSuite', () => {
  it('defaults to watercolor', () => {
    const suite = suiteThemeFromManifest(manifestOf(), ['Avery', 'Sam']);
    expect(stylizeStyleForSuite(suite)).toBe('watercolor');
  });

  it('maps gilded / deco character to gilded-deco', () => {
    const suite = suiteThemeFromManifest(manifestOf(), ['A', 'B']);
    expect(stylizeStyleForSuite(suite, 'gilded')).toBe('gilded-deco');
    const decoSuite = suiteThemeFromManifest(manifestOf({ kitId: 'deco' }), ['A', 'B']);
    expect(stylizeStyleForSuite(decoSuite)).toBe('gilded-deco');
  });

  it('maps pressed-paper textures to letterpress', () => {
    const suite = suiteThemeFromManifest(manifestOf(), ['A', 'B']);
    for (const t of ['kraft', 'paper', 'letterpress', 'newsprint'] as const) {
      expect(stylizeStyleForSuite(suite, t)).toBe('letterpress');
    }
  });

  it('maps velvet / dark evening paper to oil-portrait', () => {
    const light = suiteThemeFromManifest(manifestOf(), ['A', 'B']);
    expect(stylizeStyleForSuite(light, 'velvet')).toBe('oil-portrait');
    const dark = suiteThemeFromManifest(
      manifestOf({ themeVars: { '--t-paper': '#1F2236' } }),
      ['A', 'B'],
    );
    expect(stylizeStyleForSuite(dark)).toBe('oil-portrait');
  });

  it('maps playful character to linocut and garden motifs to botanical', () => {
    const playful = suiteThemeFromManifest(
      manifestOf({ occasion: 'bachelorette-party' }),
      ['A', 'B'],
    );
    expect(stylizeStyleForSuite(playful)).toBe('linocut');
    const garden = suiteThemeFromManifest(manifestOf({ motifKind: 'fern' }), ['A', 'B']);
    expect(stylizeStyleForSuite(garden)).toBe('botanical');
  });

  it('keeps watercolor texture on watercolor', () => {
    const suite = suiteThemeFromManifest(manifestOf({ kitId: 'scrapbook' }), ['A', 'B']);
    expect(stylizeStyleForSuite(suite, 'watercolor')).toBe('watercolor');
  });
});

describe('coerceProofSheet', () => {
  const manifest = manifestOf();
  const suite = suiteThemeFromManifest(manifest, ['Avery', 'Sam']);
  const ctx = buildCoerceContext({ suite, manifest, type: 'std', seed: 123 });

  it('coerces invalid ids to suite defaults instead of failing', () => {
    const [proof] = coerceProofSheet(
      [{
        name: 'Gilded Evening',
        layoutId: 'hologram',
        motif: 'unicorn',
        monogramFrame: 'neon',
        paletteEmphasis: 'sparkly',
        useStylizedArt: 'yes',
        copy: {},
      }],
      ctx,
      6,
    );
    expect(LAYOUT_IDS.has(proof.layoutId)).toBe(true);
    expect(proof.motif).toBe('olive'); // suite has no motif → fallback
    expect(proof.monogramFrame).toBe('ring');
    expect(proof.paletteEmphasis).toBe('accent');
    expect(proof.useStylizedArt).toBe(false); // strict boolean only
    expect(proof.copy.eyebrow.length).toBeGreaterThan(0);
  });

  it('pads an empty model response to a 4-proof sheet of valid ids', () => {
    const proofs = coerceProofSheet([], ctx, 6);
    expect(proofs.length).toBe(4);
    for (const p of proofs) {
      expect(PALETTE_IDS.has(p.studio.palette)).toBe(true);
      expect(LAYOUT_IDS.has(p.studio.layout)).toBe(true);
      expect(MOTIF_IDS.has(p.studio.motif)).toBe(true);
      expect(FONT_IDS.has(p.studio.fontPair)).toBe(true);
      expect(TONE_IDS.has(p.studio.tone)).toBe(true);
    }
    // Deterministic for the same seed.
    expect(coerceProofSheet([], ctx, 6)).toEqual(proofs);
    // Unique ids within the sheet.
    expect(new Set(proofs.map((p) => p.id)).size).toBe(proofs.length);
  });

  it('passes valid picks through and clamps copy lengths', () => {
    const [proof] = coerceProofSheet(
      [{
        name: 'Pressed Garden',
        note: 'olive · vine · soft',
        layoutId: 'asym',
        motif: 'vine',
        monogramFrame: 'sprig',
        paletteEmphasis: 'paper',
        useStylizedArt: true,
        copy: {
          eyebrow: 'Save the evening of June 22',
          headline: 'Avery & Sam',
          dateLine: 'x'.repeat(400),
          footer: 'Formal invitation to follow',
        },
      }],
      ctx,
      6,
    );
    expect(proof.layoutId).toBe('asym');
    expect(proof.motif).toBe('vine');
    expect(proof.monogramFrame).toBe('sprig');
    expect(proof.useStylizedArt).toBe(true);
    expect(proof.studio.motif).toBe('leaves'); // vine → Studio's leaves overlay
    expect(proof.studio.palette).toBe('cream'); // 'paper' emphasis on light ground
    expect(proof.copy.dateLine.length).toBeLessThanOrEqual(90);
    expect(proof.copy.eyebrow).toBe('Save the evening of June 22');
  });

  it('uses gentle solemn copy fallbacks for memorial sites', () => {
    const m = manifestOf({ occasion: 'memorial' });
    const s = suiteThemeFromManifest(m, ['Eleanor', '']);
    const solemnCtx = buildCoerceContext({ suite: s, manifest: m, type: 'std', seed: 7 });
    const proofs = coerceProofSheet([{}], solemnCtx, 6);
    expect(proofs[0].copy.eyebrow).toBe('Join us in remembering');
    expect(proofs[0].copy.eyebrow).not.toMatch(/party/i);
  });
});
