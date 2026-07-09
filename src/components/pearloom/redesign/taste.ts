'use client';

/* ════════════════════════════════════════════════════════════════
   TASTE MEMORY — Pear learns what you keep.

   Every Keep/Discard on a rewrite preview trains a small local
   profile: which directions land (warmer? funnier?), and whether
   the host trims length. The profile then (a) reorders the tone
   chips so the host's favorites lead, and (b) rides along as a
   hint inside the rewrite instruction so drafts start closer to
   taste. Stored in localStorage — taste is personal, not synced.

   The first time Pear says "shorter this time — you've trimmed my
   last three drafts" is the moment she stops being a tool.
   ════════════════════════════════════════════════════════════════ */

const KEY = 'pl-pear-taste-v1';

export interface TasteProfile {
  /** direction label → kept count */
  kept: Record<string, number>;
  /** direction label → discarded count */
  discarded: Record<string, number>;
  /** Rolling signal: positive = host keeps shorter-than-original
   *  drafts, negative = keeps longer. Range clamped ±6. */
  lengthBias: number;
}

const EMPTY: TasteProfile = { kept: {}, discarded: {}, lengthBias: 0 };

export function readTaste(): TasteProfile {
  if (typeof window === 'undefined') return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const p = JSON.parse(raw) as Partial<TasteProfile>;
    return {
      kept: p.kept ?? {},
      discarded: p.discarded ?? {},
      lengthBias: typeof p.lengthBias === 'number' ? p.lengthBias : 0,
    };
  } catch {
    return EMPTY;
  }
}

function write(p: TasteProfile) {
  try { window.localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* full/blocked, taste is a nicety */ }
}

/** Record a Keep or Discard. `label` is the direction ('warmer',
 *  'whisper', …); length deltas feed the shorter/longer signal. */
export function recordTaste(verdict: 'keep' | 'discard', label: string, originalLen: number, draftLen: number) {
  if (typeof window === 'undefined') return;
  const p = readTaste();
  const bucket = verdict === 'keep' ? p.kept : p.discarded;
  bucket[label] = (bucket[label] ?? 0) + 1;
  if (verdict === 'keep' && originalLen > 8) {
    const delta = draftLen < originalLen * 0.92 ? 1 : draftLen > originalLen * 1.08 ? -1 : 0;
    p.lengthBias = Math.max(-6, Math.min(6, p.lengthBias + delta));
  }
  write(p);
}

/** Order tone labels so the host's most-kept directions lead. */
export function orderByTaste<T extends string>(tones: readonly T[]): T[] {
  const p = readTaste();
  const score = (t: T) => (p.kept[t] ?? 0) - (p.discarded[t] ?? 0) * 0.5;
  return [...tones].sort((a, b) => score(b) - score(a));
}

/** A one-line hint folded into the rewrite instruction, or '' when
 *  there isn't enough signal yet. Never overrides the host's own
 *  direction — it rides after it. */
export function tasteHint(): string {
  const p = readTaste();
  const parts: string[] = [];
  if (p.lengthBias >= 2) parts.push('the host consistently prefers SHORTER drafts');
  else if (p.lengthBias <= -2) parts.push('the host prefers slightly fuller drafts');
  const fav = Object.entries(p.kept).sort((a, b) => b[1] - a[1])[0];
  if (fav && fav[1] >= 3 && fav[0] !== 'whisper') parts.push(`they have kept ${fav[1]} '${fav[0]}' drafts before`);
  return parts.length ? `(Taste notes: ${parts.join('; ')}.)` : '';
}

/** The visible why — Pear says what she learned. '' until earned. */
export function tasteLine(): string {
  const p = readTaste();
  if (p.lengthBias >= 3) return 'Drafting shorter, you’ve trimmed my last few.';
  const fav = Object.entries(p.kept).sort((a, b) => b[1] - a[1])[0];
  if (fav && fav[1] >= 3 && fav[0] !== 'whisper') return `Leading with ${fav[0]}, you’ve kept it ${fav[1]} times.`;
  return '';
}
