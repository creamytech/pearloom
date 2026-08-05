// ─────────────────────────────────────────────────────────────
// Pearloom / lib/wallet/icon.ts
//
// The icon on a wallet pass — drawn, not shipped.
//
// Apple REQUIRES a square icon.png in every .pkpass. The repo's
// existing images don't qualify: logo.png is 1824×2021 and 455KB,
// email-logo.png is 211×74. Rather than commit new binaries that
// nobody can diff or re-theme, this encodes a PNG directly. Node's
// zlib does the only hard part, so there's no dependency.
//
// The mark is the pearl on olive ground (BRAND §3, §5): a cream
// disc with a soft highlight, centred. Small, calm, unmistakably
// ours at 29pt on a lock screen — and because it's code, a future
// pass can tint it to the site's own accent instead of shipping
// one PNG per theme.
// ─────────────────────────────────────────────────────────────

import { deflateSync } from 'node:zlib';
import { crc32 } from './zip';

interface Rgb { r: number; g: number; b: number }

/** Brand defaults — olive ground, cream pearl (BRAND §5). */
const OLIVE: Rgb = { r: 0x5C, g: 0x6B, b: 0x3F };
const CREAM: Rgb = { r: 0xF5, g: 0xEF, b: 0xE2 };

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([len, typeAndData, crc]);
}

/** Encode raw RGB pixels as a PNG. */
export function encodePng(width: number, height: number, pixels: Buffer): Buffer {
  if (pixels.length !== width * height * 3) {
    throw new Error(`Expected ${width * height * 3} bytes of RGB, got ${pixels.length}`);
  }
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8);    // bit depth
  ihdr.writeUInt8(2, 9);    // colour type 2 = truecolour RGB
  ihdr.writeUInt8(0, 10);   // compression
  ihdr.writeUInt8(0, 11);   // filter
  ihdr.writeUInt8(0, 12);   // interlace

  // Each scanline is prefixed with its filter type; 0 = none.
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (1 + width * 3);
    raw[rowStart] = 0;
    pixels.copy(raw, rowStart + 1, y * width * 3, (y + 1) * width * 3);
  }

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function parseHex(hex: string | null | undefined, fallback: Rgb): Rgb {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex ?? '').trim());
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  const k = Math.max(0, Math.min(1, t));
  return {
    r: Math.round(a.r + (b.r - a.r) * k),
    g: Math.round(a.g + (b.g - a.g) * k),
    b: Math.round(a.b + (b.b - a.b) * k),
  };
}

/**
 * The pass icon: a cream pearl on the celebration's own ground.
 *
 * `size` is square. Apple wants 29/58/87 for icon@1x/2x/3x; 87 is
 * the safe single size to ship, since iOS downsamples cleanly.
 *
 * Edges are antialiased by distance so the disc doesn't read as a
 * jagged blob at small sizes — the one place a naive loop would
 * look obviously cheap.
 */
export function passIcon(size = 87, groundHex?: string | null): Buffer {
  const ground = parseHex(groundHex, OLIVE);
  const pixels = Buffer.alloc(size * size * 3);
  const c = (size - 1) / 2;
  const radius = size * 0.30;
  // Highlight sits up and left, like light falling on a real pearl.
  const hx = c - size * 0.09;
  const hy = c - size * 0.10;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const d = Math.hypot(x - c, y - c);
      // 1 inside the disc, 0 outside, ramped across one pixel.
      const inside = Math.max(0, Math.min(1, radius + 0.5 - d));
      let colour = ground;
      if (inside > 0) {
        const hd = Math.hypot(x - hx, y - hy) / (radius * 1.6);
        const pearl = mix(CREAM, mix(CREAM, ground, 0.18), Math.min(1, hd));
        colour = mix(ground, pearl, inside);
      }
      const i = (y * size + x) * 3;
      pixels[i] = colour.r;
      pixels[i + 1] = colour.g;
      pixels[i + 2] = colour.b;
    }
  }
  return encodePng(size, size, pixels);
}
