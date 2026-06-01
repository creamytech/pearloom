// ─────────────────────────────────────────────────────────────
// suggest-from-photo.ts — auto-suggest an Edition from the hero
// photo's dominant HSL signature.
//
// Same canvas-extractor shape as palette-from-photo: downscale to
// a 32×32 sample, walk every pixel, compute average lightness +
// saturation + warmth (red-yellow ↔ blue-green axis), then run
// a small ruleset against those aggregates to pick the Edition
// whose mood matches the photo.
//
// CRITICAL: this is INFORMATIONAL. The host sees the suggestion
// as a pill above the EditionPicker tiles with a one-click
// "Apply" — we never auto-apply, because Editions stamp the
// whole theme (palette, fonts, radii, atmosphere) and silently
// changing that on photo upload would be hostile.
//
// Rules (in priority order):
//   - lightness < 0.25                                   → 'cinema'
//   - lightness > 0.75 AND saturation < 0.20             → 'quiet'
//   - warmth > 0.65 AND saturation > 0.40                → 'postcard-box'
//   - 0.10 ≤ saturation ≤ 0.30 AND 0.40 ≤ warmth ≤ 0.55  → 'linen-folder'
//   - hue 180–230 (blue-leaning)                         → 'coastal'
//   - default                                            → 'almanac'
//
// Returns null if the canvas read fails (CORS, transparent image,
// missing DOM) — caller should silently fall through.
// ─────────────────────────────────────────────────────────────

import { rgbToHsl } from '@/lib/look-engine/palette-from-photo';
import type { EditionId } from './types';

export interface EditionSuggestion {
  editionId: EditionId;
  confidence: 'high' | 'medium' | 'low';
  rationale: string;
}

/* Internal: load an image URL into an HTMLImageElement, with the
   cross-origin flag set so we can read the pixels via getImageData.
   Resolves to null on error (e.g. R2 bucket missing CORS headers). */
function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/* Internal: aggregate the photo into mean HSL values + a dominant
   hue. Skips near-white (l > 0.94) and near-black (l < 0.06) so
   paper / sky / shadow don't crush the signal. */
interface PhotoSignature {
  /** Mean lightness across non-extreme pixels (0–1). */
  lightness: number;
  /** Mean saturation across non-extreme pixels (0–1). */
  saturation: number;
  /** Warmth: 0 = pure cool (blue-green), 1 = pure warm (red-yellow). */
  warmth: number;
  /** Dominant hue across non-extreme pixels (0–360). */
  dominantHue: number;
}

function readPhotoSignature(img: HTMLImageElement): PhotoSignature | null {
  const W = 32;
  const H = 32;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, W, H);
  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, W, H).data;
  } catch {
    /* Tainted canvas — most often a cross-origin photo without
       CORS headers. Caller should silently bail. */
    return null;
  }

  /* Warmth axis: red-yellow (h ∈ [0, 60] ∪ [300, 360]) reads warm,
     blue-green (h ∈ [120, 270]) reads cool. We project hue onto a
     cosine where 0° / 360° = 1 (warmest), 180° = 0 (coolest), and
     normalize back to 0–1. */
  function hueToWarmth(h: number): number {
    return (Math.cos((h * Math.PI) / 180) + 1) / 2;
  }

  let sumL = 0;
  let sumS = 0;
  let sumWarmth = 0;
  let count = 0;

  /* Hue is circular, so we can't just average it. Track which 30°
     bin each pixel falls into and pick the most-populated one as
     the dominant hue. */
  const hueBins = new Array<number>(12).fill(0);

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 128) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const [h, s, l] = rgbToHsl(r, g, b);
    if (l > 0.94 || l < 0.06) continue;
    sumL += l;
    sumS += s;
    sumWarmth += hueToWarmth(h);
    count += 1;
    /* Only count chromatic pixels toward the dominant hue —
       desaturated grays smear it across bins. */
    if (s > 0.12) {
      const bin = Math.min(11, Math.floor(h / 30));
      hueBins[bin] += 1;
    }
  }

  if (count === 0) return null;

  let topBin = 0;
  for (let i = 1; i < hueBins.length; i += 1) {
    if (hueBins[i] > hueBins[topBin]) topBin = i;
  }
  const dominantHue = topBin * 30 + 15;

  return {
    lightness: sumL / count,
    saturation: sumS / count,
    warmth: sumWarmth / count,
    dominantHue,
  };
}

/* Internal: apply the ruleset. Returns the Edition + a string
   reason so the UI can show "based on your dark candlelit photo". */
function classify(sig: PhotoSignature): EditionSuggestion {
  const { lightness, saturation, warmth, dominantHue } = sig;

  /* Cinema — dark candlelit. Strong signal (lightness alone is
     unambiguous), so high confidence. */
  if (lightness < 0.25) {
    return {
      editionId: 'cinema',
      confidence: 'high',
      rationale: 'based on your dark candlelit photo',
    };
  }

  /* Quiet — minimal, airy. Bright + desaturated is the clearest
     "step back" signal. */
  if (lightness > 0.75 && saturation < 0.2) {
    return {
      editionId: 'quiet',
      confidence: 'high',
      rationale: 'based on the airy, low-saturation light in your photo',
    };
  }

  /* Postcard Box — warm outdoors. Saturated warmth = golden hour /
     tuscan villa / desert wedding. */
  if (warmth > 0.65 && saturation > 0.4) {
    return {
      editionId: 'postcard-box',
      confidence: 'high',
      rationale: 'based on the warm, sunlit tones in your photo',
    };
  }

  /* Linen Folder — formal neutral. Mid-saturation + mid-warmth
     reads as hotel-stationery / linen-tablecloth / venue interior. */
  if (
    saturation >= 0.1 &&
    saturation <= 0.3 &&
    warmth >= 0.4 &&
    warmth <= 0.55
  ) {
    return {
      editionId: 'linen-folder',
      confidence: 'medium',
      rationale: 'based on the soft formal neutrals in your photo',
    };
  }

  /* Coastal — blue-leaning. Cool seaside / harbor light. Confidence
     scales with saturation — a vivid Aegean wedding is a stronger
     signal than a muted overcast. */
  if (dominantHue >= 180 && dominantHue <= 230) {
    return {
      editionId: 'coastal',
      confidence: saturation > 0.25 ? 'high' : 'medium',
      rationale: 'based on the sea-glass blue in your photo',
    };
  }

  /* Default — Almanac, the editorial warmth Pearloom ships with.
     Low confidence because we're saying "nothing else fit better". */
  return {
    editionId: 'almanac',
    confidence: 'low',
    rationale: 'no strong signal — Pearloom’s default warmth fits anything',
  };
}

/**
 * Suggest an Edition based on a hero photo's HSL signature.
 *
 * Returns null if the image can't be decoded or read (typically a
 * CORS-tainted canvas) — caller should silently swallow the null
 * and skip the suggestion pill rather than show an error.
 */
export async function suggestEditionFromPhoto(
  imageUrl: string,
): Promise<EditionSuggestion | null> {
  if (!imageUrl || typeof imageUrl !== 'string') return null;
  const img = await loadImage(imageUrl);
  if (!img) return null;
  const sig = readPhotoSignature(img);
  if (!sig) return null;
  return classify(sig);
}
