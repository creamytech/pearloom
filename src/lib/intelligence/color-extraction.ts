// ─────────────────────────────────────────────────────────────
// Pearloom / lib/intelligence/color-extraction.ts
// Extract dominant colors from photos to build a unique palette.
// AI generates, user can swap any color.
//
// Flow:
//   1. Gemini Vision analyzes hero photo for dominant colors
//   2. We generate complementary palette from those colors
//   3. User sees "Colors from your photos" with swap controls
//   4. Every color is individually editable
// ─────────────────────────────────────────────────────────────

// ── Types ────────────────────────────────────────────────────

export interface ExtractedPalette {
  /** Source photo URL */
  sourcePhotoUrl: string;
  /** Raw dominant colors extracted */
  dominantColors: string[];
  /** Generated site palette */
  palette: {
    background: string;
    foreground: string;
    accent: string;
    accentLight: string;
    muted: string;
    cardBg: string;
  };
  /** Whether palette was auto-generated or user-customized */
  source: 'photo-extracted' | 'ai-generated' | 'user-customized' | 'theme-preset';
  /** Complementary color suggestions the user can swap to */
  alternatives: {
    accents: string[];    // 5 alternative accent colors
    backgrounds: string[]; // 3 alternative backgrounds
  };
}

// ── Color Math Utilities ─────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [h * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)));
  };
  return rgbToHex(f(0), f(8), f(4));
}

function getLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

// ── Palette Generation ───────────────────────────────────────

/**
 * Generate a site palette from dominant colors extracted from a photo.
 * Creates harmonious background, foreground, accent, and muted tones.
 */
export function generatePaletteFromColors(dominantColors: string[]): ExtractedPalette['palette'] {
  if (dominantColors.length === 0) {
    return { background: '#FAF7F2', foreground: '#1A1A1A', accent: '#5C6B3F', accentLight: '#EEE8DC', muted: '#6B665F', cardBg: '#FFFFFF' };
  }

  // Find the most vibrant color for accent
  let bestAccent = dominantColors[0];
  let bestSaturation = 0;
  for (const color of dominantColors) {
    const [, s] = rgbToHsl(...hexToRgb(color));
    if (s > bestSaturation) {
      bestSaturation = s;
      bestAccent = color;
    }
  }

  // Find lightest color for background base
  const sorted = [...dominantColors].sort((a, b) => getLuminance(b) - getLuminance(a));
  const lightestColor = sorted[0];
  const darkestColor = sorted[sorted.length - 1];

  // Generate palette
  const [accentH, accentS, accentL] = rgbToHsl(...hexToRgb(bestAccent));
  const [lightH, , lightL] = rgbToHsl(...hexToRgb(lightestColor));

  // Background: very light version of the lightest dominant color
  const bgL = Math.max(92, lightL);
  const background = hslToHex(lightH, Math.min(15, accentS * 0.2), bgL);

  // Foreground: dark version of the darkest color or near-black
  const foreground = getLuminance(darkestColor) < 0.3 ? darkestColor : '#1A1A1A';

  // Accent: the most saturated color, slightly adjusted
  const accent = hslToHex(accentH, Math.min(60, accentS), Math.max(35, Math.min(55, accentL)));

  // Accent light: very desaturated, light version of accent
  const accentLight = hslToHex(accentH, Math.min(20, accentS * 0.3), 90);

  // Muted: desaturated mid-tone
  const muted = hslToHex(accentH, 10, 50);

  // Card bg: white or very slightly tinted
  const cardBg = hslToHex(lightH, Math.min(5, accentS * 0.1), 99);

  return { background, foreground, accent, accentLight, muted, cardBg };
}

/**
 * Generate complementary alternatives for each palette color.
 * These are the "swap" options the user sees.
 */
export function generateAlternatives(accent: string): ExtractedPalette['alternatives'] {
  const [h, s, l] = rgbToHsl(...hexToRgb(accent));

  return {
    accents: [
      hslToHex((h + 30) % 360, s, l),      // Analogous +30
      hslToHex((h - 30 + 360) % 360, s, l), // Analogous -30
      hslToHex((h + 180) % 360, s, l),      // Complementary
      hslToHex((h + 120) % 360, s, l),      // Triadic +120
      hslToHex(h, Math.max(20, s - 20), l), // Desaturated version
    ],
    backgrounds: [
      '#FFFFFF',  // Pure white
      '#FAF7F2',  // Warm cream (Pearloom default)
      hslToHex(h, Math.min(8, s * 0.15), 96), // Tinted to match accent
    ],
  };
}

/**
 * Extract colors from a photo using Gemini Vision.
 * Returns the dominant colors as hex values.
 */
export async function extractColorsFromPhoto(
  photoUrl: string,
  apiKey: string,
): Promise<string[]> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: 'Extract the 6 most dominant colors from this image. Return ONLY a JSON array of hex color strings, e.g. ["#D4A574","#8B9B6A","#F5F0E8","#1A1510","#C4A96A","#E8D5B8"]. No explanation, just the array.' },
              { fileData: { mimeType: 'image/jpeg', fileUri: photoUrl } },
            ],
          }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      }
    );

    if (!res.ok) return [];

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return [];

    const colors = JSON.parse(text);
    return Array.isArray(colors) ? colors.filter((c: unknown) => typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c as string)) : [];
  } catch {
    return [];
  }
}

/**
 * Full pipeline: extract colors from photo → generate palette → generate alternatives.
 */
export async function extractPaletteFromPhoto(
  photoUrl: string,
  apiKey: string,
): Promise<ExtractedPalette> {
  const dominantColors = await extractColorsFromPhoto(photoUrl, apiKey);
  const palette = generatePaletteFromColors(dominantColors);
  const alternatives = generateAlternatives(palette.accent);

  return {
    sourcePhotoUrl: photoUrl,
    dominantColors,
    palette,
    source: 'photo-extracted',
    alternatives,
  };
}
