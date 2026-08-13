import { describe, it, expect } from 'vitest';
import {
  computeScaledDimensions,
  qualityLadder,
  isHeicLike,
  heicUnsupportedMessage,
  normalizeErrorMessage,
  filenameForOutput,
  ImageNormalizeError,
} from './normalize-image';

describe('computeScaledDimensions', () => {
  it('does not upscale images already within the max edge', () => {
    expect(computeScaledDimensions(1200, 800, 2560)).toEqual({ width: 1200, height: 800 });
  });

  it('scales the longest (landscape) edge down to the max, preserving aspect', () => {
    const out = computeScaledDimensions(8000, 6000, 2560);
    expect(out.width).toBe(2560);
    // 6000 * (2560/8000) = 1920
    expect(out.height).toBe(1920);
  });

  it('scales the longest (portrait) edge down to the max, preserving aspect', () => {
    const out = computeScaledDimensions(3024, 4032, 2560); // typical portrait iPhone
    expect(out.height).toBe(2560);
    // 3024 * (2560/4032) = 1920
    expect(out.width).toBe(1920);
    // portrait stays portrait — height is the long edge
    expect(out.height).toBeGreaterThan(out.width);
  });

  it('preserves aspect ratio to within a pixel', () => {
    const out = computeScaledDimensions(4000, 3000, 2560);
    const ratioIn = 4000 / 3000;
    const ratioOut = out.width / out.height;
    expect(Math.abs(ratioIn - ratioOut)).toBeLessThan(0.01);
  });

  it('never returns a dimension below 1', () => {
    const out = computeScaledDimensions(10000, 1, 2560);
    expect(out.width).toBe(2560);
    expect(out.height).toBeGreaterThanOrEqual(1);
  });

  it('guards against zero / NaN dimensions', () => {
    expect(computeScaledDimensions(0, 0, 2560)).toEqual({ width: 1, height: 1 });
    expect(computeScaledDimensions(NaN, 100, 2560)).toEqual({ width: 1, height: 1 });
  });

  it('returns source dims when maxEdge is non-positive', () => {
    expect(computeScaledDimensions(4000, 3000, 0)).toEqual({ width: 4000, height: 3000 });
  });
});

describe('qualityLadder', () => {
  it('descends from start to min by step', () => {
    expect(qualityLadder(0.85, 0.1, 0.4)).toEqual([0.85, 0.75, 0.65, 0.55, 0.45]);
  });

  it('includes the floor when it lands exactly on a step', () => {
    expect(qualityLadder(0.8, 0.1, 0.4)).toEqual([0.8, 0.7, 0.6, 0.5, 0.4]);
  });

  it('is strictly descending', () => {
    const ladder = qualityLadder(0.9, 0.15, 0.3);
    for (let i = 1; i < ladder.length; i++) {
      expect(ladder[i]).toBeLessThan(ladder[i - 1]);
    }
  });

  it('always yields at least the start value', () => {
    expect(qualityLadder(0.5, 0.1, 0.9)).toEqual([0.5]);
  });

  it('clamps values into (0, 1]', () => {
    const ladder = qualityLadder(1.5, 0.1, -1);
    expect(ladder.every((q) => q > 0 && q <= 1)).toBe(true);
  });
});

describe('isHeicLike', () => {
  it('detects HEIC/HEIF by MIME', () => {
    expect(isHeicLike({ type: 'image/heic' })).toBe(true);
    expect(isHeicLike({ type: 'image/heif' })).toBe(true);
    expect(isHeicLike({ type: 'IMAGE/HEIC' })).toBe(true);
  });

  it('detects HEIC/HEIF by filename when MIME is empty', () => {
    expect(isHeicLike({ type: '', name: 'IMG_0421.HEIC' })).toBe(true);
    expect(isHeicLike({ type: '', name: 'photo.heif' })).toBe(true);
  });

  it('is false for jpeg/png/webp', () => {
    expect(isHeicLike({ type: 'image/jpeg', name: 'a.jpg' })).toBe(false);
    expect(isHeicLike({ type: 'image/png', name: 'a.png' })).toBe(false);
    expect(isHeicLike({ type: 'image/webp', name: 'a.webp' })).toBe(false);
  });
});

describe('normalizeErrorMessage', () => {
  it('gives the actionable HEIC copy for the heic-unsupported code', () => {
    const err = new ImageNormalizeError('heic-unsupported', 'x');
    const msg = normalizeErrorMessage(err);
    expect(msg).toBe(heicUnsupportedMessage());
    expect(msg).toMatch(/HEIC/);
    expect(msg).toMatch(/Most compatible/);
  });

  it('maps each typed code to a non-empty message', () => {
    for (const code of [
      'ssr',
      'not-image',
      'decode-failed',
      'heic-unsupported',
      'encode-failed',
      'too-large',
    ] as const) {
      const msg = normalizeErrorMessage(new ImageNormalizeError(code, 'x'));
      expect(msg.length).toBeGreaterThan(0);
    }
  });

  it('never surfaces a raw/blank message for unknown throws', () => {
    expect(normalizeErrorMessage(new Error('kaboom')).length).toBeGreaterThan(0);
    expect(normalizeErrorMessage(undefined).length).toBeGreaterThan(0);
  });

  it('carries a machine-readable code on the typed error', () => {
    const err = new ImageNormalizeError('too-large', 'x');
    expect(err.code).toBe('too-large');
    expect(err).toBeInstanceOf(Error);
  });
});

describe('filenameForOutput', () => {
  it('swaps a HEIC extension to jpg', () => {
    expect(filenameForOutput('IMG_0421.HEIC', 'image/jpeg')).toBe('IMG_0421.jpg');
  });

  it('swaps to webp when the output is webp', () => {
    expect(filenameForOutput('pic.png', 'image/webp')).toBe('pic.webp');
  });

  it('handles missing names', () => {
    expect(filenameForOutput(undefined, 'image/jpeg')).toBe('photo.jpg');
  });

  it('handles names without an extension', () => {
    expect(filenameForOutput('vacation', 'image/jpeg')).toBe('vacation.jpg');
  });
});
