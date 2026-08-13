/* ─────────────────────────────────────────────────────────────
   Pearloom / redesign/loom-weave — pure geometry for The Loom.

   The Loom is a living tapestry on the RSVP section: every
   attending reply becomes one weft thread woven through a fixed
   warp. This module is the deterministic half — seed string in,
   identical strand geometry out, every time. No Math.random(),
   no Date.now(): the cloth must render the same on the server,
   the client, and every re-render (React Compiler safe).

   Consumed by LoomTapestry.tsx; unit-tested in loom-weave.test.ts.
   ───────────────────────────────────────────────────────────── */

export interface LoomStrand {
  /** Short stable hash from /api/rsvp/weave (no PII). */
  seed: string;
  /** 0..1 position in reply order — early replies at the top. */
  t: number;
}

/** Everything an SVG <path> needs to draw one weft thread. */
export interface WeftSpec {
  /** SVG path `d` — a gently curved horizontal thread. */
  path: string;
  /** Brand-safe CSS var — accent / accent-2 / gold only. */
  colorVar: string;
  opacity: number;
  strokeWidth: number;
}

/* Fixed cloth geometry — the SVG viewBox the tapestry renders in.
   Density comes from strand count, not from a growing canvas. */
export const LOOM_W = 640;
export const LOOM_H = 180;
export const LOOM_PAD_X = 14;
export const LOOM_PAD_Y = 16;
/** Warp hairline spacing (vertical threads in --t-line). */
export const LOOM_WARP_STEP = 24;

/* ── Tiny seeded PRNG ─────────────────────────────────────────
   FNV-1a over seed+salt, finished with a xorshift-style mix, then
   mapped to [0, 1). Plenty for thread wobble; deterministic by
   construction. */

export function hashSeed(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Deterministic unit interval value for a (seed, salt) pair. */
export function seededUnit(seed: string, salt = ''): number {
  let x = hashSeed(`${seed}::${salt}`) || 1;
  /* xorshift32 round to de-correlate nearby salts. */
  x ^= x << 13; x >>>= 0;
  x ^= x >> 17;
  x ^= x << 5; x >>>= 0;
  return x / 0x100000000;
}

/* ── Color mapping ────────────────────────────────────────────
   Hue derives from the seed but only onto the site's own theme
   range: accent leads, accent-2 seconds, gold stays punctuation
   (BRAND §5 — gold is a hairline, never a field). */

const WEFT_COLORS = ['var(--t-accent)', 'var(--t-accent-2)', 'var(--t-gold)'] as const;

export function weftColorVar(seed: string): string {
  const u = seededUnit(seed, 'hue');
  if (u < 0.5) return WEFT_COLORS[0];
  if (u < 0.85) return WEFT_COLORS[1];
  return WEFT_COLORS[2];
}

/* ── Weft geometry ────────────────────────────────────────────
   One thread per strand: baseline y from t (reply order stacks
   downward) + a small seeded jitter, then two cubic segments with
   seeded wobble so no two threads lie identically. All numbers
   rounded to 2dp so path strings are stable across platforms. */

const r2 = (v: number) => Math.round(v * 100) / 100;

export function weftFromStrand(strand: LoomStrand): WeftSpec {
  const { seed } = strand;
  const t = Math.min(1, Math.max(0, strand.t));

  const usable = LOOM_H - LOOM_PAD_Y * 2;
  const jitter = (seededUnit(seed, 'y') - 0.5) * 6;
  const y = r2(LOOM_PAD_Y + t * usable + jitter);

  const x0 = LOOM_PAD_X;
  const x1 = LOOM_W - LOOM_PAD_X;
  const mid = (x0 + x1) / 2;
  const q1 = x0 + (x1 - x0) * 0.25;
  const q3 = x0 + (x1 - x0) * 0.75;

  /* Gentle wobble — a hand-thrown shuttle, not a sine wave. */
  const amp = 2.5 + seededUnit(seed, 'amp') * 4;
  const d1 = (seededUnit(seed, 'w1') - 0.5) * 2 * amp;
  const d2 = (seededUnit(seed, 'w2') - 0.5) * 2 * amp;
  const dm = (seededUnit(seed, 'wm') - 0.5) * amp;
  const d3 = (seededUnit(seed, 'w3') - 0.5) * 2 * amp;

  const path =
    `M ${r2(x0)} ${y} ` +
    `C ${r2(q1 - 30)} ${r2(y + d1)}, ${r2(q1 + 30)} ${r2(y + d2)}, ${r2(mid)} ${r2(y + dm)} ` +
    `S ${r2(q3 + 30)} ${r2(y + d3)}, ${r2(x1)} ${y}`;

  const colorVar = weftColorVar(seed);
  const gold = colorVar === WEFT_COLORS[2];

  return {
    path,
    colorVar,
    /* Gold threads run thinner + brighter — punctuation. */
    opacity: r2(gold ? 0.75 + seededUnit(seed, 'op') * 0.2 : 0.45 + seededUnit(seed, 'op') * 0.4),
    strokeWidth: r2(gold ? 0.9 + seededUnit(seed, 'sw') * 0.6 : 1.3 + seededUnit(seed, 'sw') * 1.4),
  };
}

/** Warp x positions — fixed vertical hairlines across the cloth. */
export function warpPositions(): number[] {
  const xs: number[] = [];
  for (let x = LOOM_PAD_X + LOOM_WARP_STEP / 2; x <= LOOM_W - LOOM_PAD_X; x += LOOM_WARP_STEP) {
    xs.push(r2(x));
  }
  return xs;
}

/* ── Fixed strand sets ────────────────────────────────────────
   DEMO — the 14-strand editor-canvas preview (deterministic
   seeds; never shown on published sites). STARTER — the two
   hosts' threads that open an empty published cloth. */

export const DEMO_LOOM_STRANDS: LoomStrand[] = Array.from({ length: 14 }, (_, i) => ({
  seed: `loom-demo-${String(i).padStart(2, '0')}`,
  t: i / 13,
}));

export const STARTER_LOOM_STRANDS: LoomStrand[] = [
  { seed: 'loom-host-a', t: 0.32 },
  { seed: 'loom-host-b', t: 0.68 },
];
