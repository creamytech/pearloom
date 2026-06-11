// resolveArrivalStyle — the occasion-matching contract for the
// Sealed Arrival. Solemn voices must never get the envelope.
import { describe, expect, it } from 'vitest';
import type { StoryManifest } from '@/types';
import { resolveArrivalStyle } from './ArrivalReveal';

function manifestWith(fields: Record<string, unknown>): StoryManifest {
  return fields as unknown as StoryManifest;
}

describe('resolveArrivalStyle', () => {
  it('explicit host picks always win', () => {
    expect(resolveArrivalStyle(manifestWith({ arrival: 'off', occasion: 'wedding' }))).toBe('off');
    expect(resolveArrivalStyle(manifestWith({ arrival: 'quiet', occasion: 'wedding' }))).toBe('quiet');
    expect(resolveArrivalStyle(manifestWith({ arrival: 'envelope', occasion: 'memorial' }))).toBe('envelope');
  });

  it('auto: memorial + funeral resolve to quiet', () => {
    expect(resolveArrivalStyle(manifestWith({ occasion: 'memorial' }))).toBe('quiet');
    expect(resolveArrivalStyle(manifestWith({ occasion: 'funeral' }))).toBe('quiet');
    expect(resolveArrivalStyle(manifestWith({ arrival: 'auto', occasion: 'memorial' }))).toBe('quiet');
  });

  it('auto: celebratory occasions resolve to envelope', () => {
    expect(resolveArrivalStyle(manifestWith({ occasion: 'wedding' }))).toBe('envelope');
    expect(resolveArrivalStyle(manifestWith({ occasion: 'bachelorette-party' }))).toBe('envelope');
    expect(resolveArrivalStyle(manifestWith({ occasion: 'baby-shower' }))).toBe('envelope');
  });

  it('auto: unknown / missing occasion falls back to envelope', () => {
    expect(resolveArrivalStyle(manifestWith({}))).toBe('envelope');
    expect(resolveArrivalStyle(manifestWith({ occasion: 'not-a-real-occasion' }))).toBe('envelope');
  });
});
