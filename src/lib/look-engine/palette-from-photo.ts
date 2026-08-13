// ─────────────────────────────────────────────────────────────
// palette-from-photo.ts — extract a coherent accent palette from
// an uploaded photo. Port of the design prototype's
// extractColorsFromImage + paletteFromColors from
// shared/site-config.jsx.
//
// The algorithm:
//   1. Downscale the photo to a 48×48 canvas (fast, enough signal).
//   2. Bucket every pixel into a 256/28 = ~9⁳ histogram by
//      quantized RGB.
//   3. Skip near-white (l > 0.94) + near-black (l < 0.06) so
//      paper/ink overlays don't dominate.
//   4. Sort buckets by `n × (0.4 + avgSaturation)` so a few
//      vibrant pixels outrank a flat sea of mid-gray.
//   5. Take the top N as the source palette.
//   6. paletteFromColors picks the most saturated mid-tone as the
//      accent, the warmest hue as gold, then derives soft/ink/bg
//      variants in HSL space.
//
// Writes only `accent` + `accentLight` onto manifest.theme.colors
// so the Edition's paper + ink stay intact (paper bleeds into the
// extracted palette would crush legibility — the WCAG guard in
// LookEnginePanel would catch it, but better to keep ground stable).
// ─────────────────────────────────────────────────────────────

/* ---------- Color utilities (port from prototype) ---------- */

export function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace('#', '');
  const n = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  return [
    parseInt(n.slice(0, 2), 16),
    parseInt(n.slice(2, 4), 16),
    parseInt(n.slice(4, 6), 16),
  ];
}

export function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
      .join('')
  );
}

/* Returns [h (0–360), s (0–1), l (0–1)]. */
export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rr) h = (gg - bb) / d + (gg < bb ? 6 : 0);
    else if (max === gg) h = (bb - rr) / d + 2;
    else h = (rr - gg) / d + 4;
    h /= 6;
  }
  return [h * 360, s, l];
}

export function hslToHex(h: number, s: number, l: number): string {
  const hh = h / 360;
  const f = (n: number) => {
    const k = (n + hh * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    return l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
  };
  return rgbToHex(f(0) * 255, f(8) * 255, f(4) * 255);
}

/* ---------- Extraction (port from prototype) ---------- */

/**
 * Downscale an image to a small canvas + bucket-quantize to
 * dominant colours. Returns up to `count` hex strings ranked by
 * (population × saturation). Returns [] if canvas extraction fails
 * (CORS, transparent image, etc.) — the caller should fall through.
 */
export function extractColorsFromImage(img: HTMLImageElement, count = 6): string[] {
  const W = 48;
  const H = 48;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];
  ctx.drawImage(img, 0, 0, W, H);
  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, W, H).data;
  } catch {
    /* Tainted canvas (cross-origin photo without CORS) — caller
       should display a friendly "use a local file" hint. */
    return [];
  }
  interface Bucket {
    r: number;
    g: number;
    b: number;
    n: number;
    s: number;
  }
  const buckets: Record<string, Bucket> = {};
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 128) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const [, s, l] = rgbToHsl(r, g, b);
    if (l > 0.94 || l < 0.06) continue;
    const key = `${Math.round(r / 28)}-${Math.round(g / 28)}-${Math.round(b / 28)}`;
    if (!buckets[key]) buckets[key] = { r: 0, g: 0, b: 0, n: 0, s: 0 };
    const k = buckets[key];
    k.r += r;
    k.g += g;
    k.b += b;
    k.n += 1;
    k.s += s;
  }
  const arr = Object.values(buckets)
    .map((k) => ({
      hex: rgbToHex(k.r / k.n, k.g / k.n, k.b / k.n),
      n: k.n,
      sat: k.s / k.n,
    }))
    .sort((a, b) => b.n * (0.4 + b.sat) - a.n * (0.4 + a.sat));
  return arr.slice(0, count).map((x) => x.hex);
}

/* ---------- Palette derivation (port from prototype) ---------- */

export interface ExtractedPalette {
  /** Primary accent — most saturated mid-tone in the source. */
  accent: string;
  /** Lighter sibling for backgrounds + secondary accents. */
  accentLight: string;
  /** Darker sibling for ink on accent backgrounds. */
  accentInk: string;
  /** Wash version — very pale, for hover states / cards. */
  accentBg: string;
  /** Warm sibling — gold-ish hue derived from the warmest source. */
  gold: string;
  /** Source colours in display order for the swatch strip UI. */
  swatches: string[];
}

/**
 * Build a coherent accent palette from extracted colours.
 *
 *   accent       = most saturated mid-tone (favors visual identity)
 *   accent-light = same hue, lower saturation, higher lightness
 *   accent-ink   = same hue, deeper saturation, darker
 *   accent-bg    = washed pastel of the accent
 *   gold         = warmest hue (h<60 or h>330), or fallback to accent
 *
 * Returns null if `colors` is empty.
 */
export function paletteFromColors(colors: string[]): ExtractedPalette | null {
  if (!colors || colors.length === 0) return null;

  const ranked = colors.map((hex) => {
    const [h, s, l] = rgbToHsl(...hexToRgb(hex));
    return { hex, h, s, l };
  });

  /* Accent = most saturated mid-tone. The score `s - |l - 0.5|`
     penalizes colours that are too light or too dark even if
     vivid — we want a hue that reads as the brand's voice, not
     a near-white pastel or a near-black ink. */
  const sorted = [...ranked].sort(
    (a, b) => b.s - Math.abs(b.l - 0.5) - (a.s - Math.abs(a.l - 0.5)),
  );
  const acc = sorted[0];

  /* Gold = warmest hue in the source. Fall back to the accent
     when nothing in the photo is warm. */
  const warm = ranked.find((c) => c.h < 60 || c.h > 330) ?? acc;

  const accentHex = hslToHex(
    acc.h,
    Math.min(0.6, Math.max(0.28, acc.s)),
    Math.min(0.5, Math.max(0.34, acc.l)),
  );
  const accentLightHex = hslToHex(
    acc.h,
    Math.min(0.5, acc.s * 0.8),
    Math.min(0.66, acc.l + 0.16),
  );
  const accentBgHex = hslToHex(acc.h, Math.min(0.4, acc.s * 0.55), 0.9);
  const accentInkHex = hslToHex(
    acc.h,
    Math.min(0.7, acc.s + 0.1),
    Math.max(0.26, acc.l - 0.14),
  );
  const goldHex = hslToHex(warm.h, Math.min(0.55, Math.max(0.3, warm.s)), 0.52);

  return {
    accent: accentHex,
    accentLight: accentLightHex,
    accentInk: accentInkHex,
    accentBg: accentBgHex,
    gold: goldHex,
    swatches: [accentHex, accentLightHex, goldHex, accentBgHex],
  };
}

/* ---------- High-level convenience ---------- */

/**
 * Reads a File object, decodes it to an HTMLImageElement, runs
 * extraction + palette derivation, returns the result or null.
 * Promise-based so callers can `await` it from a change handler.
 */
export async function paletteFromFile(file: File): Promise<ExtractedPalette | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve(null);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => resolve(null);
      img.onload = () => {
        const colors = extractColorsFromImage(img, 6);
        resolve(paletteFromColors(colors));
      };
      const result = reader.result;
      if (typeof result === 'string') img.src = result;
      else resolve(null);
    };
    reader.readAsDataURL(file);
  });
}
