import { describe, expect, it } from 'vitest';
import {
  DEMO_LOOM_STRANDS,
  LOOM_H,
  LOOM_PAD_X,
  LOOM_PAD_Y,
  LOOM_W,
  STARTER_LOOM_STRANDS,
  seededUnit,
  warpPositions,
  weftColorVar,
  weftFromStrand,
} from './loom-weave';

const BRAND_VARS = ['var(--t-accent)', 'var(--t-accent-2)', 'var(--t-gold)'];

describe('loom-weave — seeded PRNG', () => {
  it('is deterministic for the same seed + salt', () => {
    expect(seededUnit('a1b2c3d4', 'y')).toBe(seededUnit('a1b2c3d4', 'y'));
    expect(seededUnit('a1b2c3d4')).toBe(seededUnit('a1b2c3d4'));
  });

  it('stays in [0, 1)', () => {
    for (let i = 0; i < 200; i++) {
      const u = seededUnit(`seed-${i}`, 'salt');
      expect(u).toBeGreaterThanOrEqual(0);
      expect(u).toBeLessThan(1);
    }
  });

  it('differs across salts for one seed', () => {
    const values = new Set(['y', 'amp', 'w1', 'w2', 'wm', 'w3', 'op', 'sw'].map((s) => seededUnit('a1b2c3d4', s)));
    expect(values.size).toBeGreaterThan(4);
  });
});

describe('loom-weave — weft layout determinism', () => {
  it('produces identical specs for identical strands', () => {
    const strand = { seed: 'deadbeef', t: 0.4 };
    expect(weftFromStrand(strand)).toEqual(weftFromStrand({ ...strand }));
  });

  it('produces different paths for different seeds', () => {
    const a = weftFromStrand({ seed: 'deadbeef', t: 0.4 });
    const b = weftFromStrand({ seed: 'cafef00d', t: 0.4 });
    expect(a.path).not.toBe(b.path);
  });

  it('stacks strands downward in reply order', () => {
    /* Baseline y is embedded as the M-command y — early t sits
       above late t even with the ±3px seeded jitter. */
    const yOf = (t: number) => Number(weftFromStrand({ seed: 'a1b2c3d4', t }).path.split(' ')[2]);
    expect(yOf(0)).toBeLessThan(yOf(0.5));
    expect(yOf(0.5)).toBeLessThan(yOf(1));
  });

  it('keeps every thread inside the cloth', () => {
    for (const strand of [...DEMO_LOOM_STRANDS, ...STARTER_LOOM_STRANDS]) {
      const spec = weftFromStrand(strand);
      const y = Number(spec.path.split(' ')[2]);
      expect(y).toBeGreaterThanOrEqual(LOOM_PAD_Y - 3);
      expect(y).toBeLessThanOrEqual(LOOM_H - LOOM_PAD_Y + 3);
      expect(spec.opacity).toBeGreaterThan(0);
      expect(spec.opacity).toBeLessThanOrEqual(1);
      expect(spec.strokeWidth).toBeGreaterThan(0);
    }
  });

  it('only ever colors threads from the brand-safe theme range', () => {
    for (let i = 0; i < 100; i++) {
      expect(BRAND_VARS).toContain(weftColorVar(`seed-${i}`));
    }
    /* Gold stays punctuation — a minority of threads. */
    const golds = Array.from({ length: 200 }, (_, i) => weftColorVar(`g-${i}`))
      .filter((c) => c === 'var(--t-gold)').length;
    expect(golds).toBeLessThan(80);
    expect(golds).toBeGreaterThan(0);
  });
});

describe('loom-weave — fixed strand sets', () => {
  it('ships a 14-strand deterministic demo, t ascending 0→1', () => {
    expect(DEMO_LOOM_STRANDS).toHaveLength(14);
    expect(DEMO_LOOM_STRANDS[0].t).toBe(0);
    expect(DEMO_LOOM_STRANDS[13].t).toBe(1);
    for (let i = 1; i < DEMO_LOOM_STRANDS.length; i++) {
      expect(DEMO_LOOM_STRANDS[i].t).toBeGreaterThan(DEMO_LOOM_STRANDS[i - 1].t);
    }
  });

  it('ships exactly two starter (host) threads', () => {
    expect(STARTER_LOOM_STRANDS).toHaveLength(2);
  });

  it('lays warp hairlines inside the cloth', () => {
    const xs = warpPositions();
    expect(xs.length).toBeGreaterThan(10);
    for (const x of xs) {
      expect(x).toBeGreaterThanOrEqual(LOOM_PAD_X);
      expect(x).toBeLessThanOrEqual(LOOM_W - LOOM_PAD_X);
    }
  });
});
