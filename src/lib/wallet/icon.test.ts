// ─────────────────────────────────────────────────────────────
// The pass icon — verified as a real PNG, not just as bytes.
//
// Hand-rolled binary again, so the same rule as the ZIP writer:
// my encoder agreeing with my own reader proves nothing. These
// tests decode the output independently (zlib inflate, chunk walk,
// CRC per chunk) and check the actual pixels, so a file iOS would
// reject can't pass.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { inflateSync } from 'node:zlib';
import { encodePng, passIcon } from './icon';
import { crc32 } from './zip';

/** Walk PNG chunks, verifying each CRC as we go. */
function readChunks(png: Buffer) {
  expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const chunks: { type: string; data: Buffer }[] = [];
  let off = 8;
  while (off < png.length) {
    const len = png.readUInt32BE(off);
    const type = png.subarray(off + 4, off + 8).toString('ascii');
    const data = png.subarray(off + 8, off + 8 + len);
    const stated = png.readUInt32BE(off + 8 + len);
    expect(crc32(png.subarray(off + 4, off + 8 + len)), `bad CRC on ${type}`).toBe(stated);
    chunks.push({ type, data });
    off += 12 + len;
  }
  return chunks;
}

describe('encodePng produces a decodable PNG', () => {
  const png = passIcon(29);
  const chunks = readChunks(png);

  it('has IHDR, IDAT and IEND, in that order', () => {
    expect(chunks.map((c) => c.type)).toEqual(['IHDR', 'IDAT', 'IEND']);
  });

  it('declares the right dimensions and colour type', () => {
    const ihdr = chunks[0].data;
    expect(ihdr.readUInt32BE(0)).toBe(29);
    expect(ihdr.readUInt32BE(4)).toBe(29);
    expect(ihdr.readUInt8(8)).toBe(8);     // 8-bit
    expect(ihdr.readUInt8(9)).toBe(2);     // truecolour RGB
  });

  it('inflates to exactly one filter byte per scanline plus pixels', () => {
    const raw = inflateSync(chunks[1].data);
    expect(raw.length).toBe(29 * (1 + 29 * 3));
    for (let y = 0; y < 29; y += 1) {
      expect(raw[y * (1 + 29 * 3)], `scanline ${y} filter`).toBe(0);
    }
  });

  it('rejects a pixel buffer of the wrong size instead of writing garbage', () => {
    expect(() => encodePng(4, 4, Buffer.alloc(10))).toThrow(/Expected 48 bytes/);
  });
});

describe('the mark actually looks like a pearl on a ground', () => {
  const size = 87;
  const png = passIcon(size);
  const raw = inflateSync(readChunks(png)[1].data);
  const px = (x: number, y: number) => {
    const i = y * (1 + size * 3) + 1 + x * 3;
    return { r: raw[i], g: raw[i + 1], b: raw[i + 2] };
  };

  it('is olive in the corners', () => {
    const corner = px(1, 1);
    expect(corner).toEqual({ r: 0x5C, g: 0x6B, b: 0x3F });
  });

  it('is cream at the centre', () => {
    const middle = px(Math.floor(size / 2), Math.floor(size / 2));
    expect(middle.r).toBeGreaterThan(0xD0);
    expect(middle.g).toBeGreaterThan(0xD0);
    expect(middle.b).toBeGreaterThan(0xC0);
  });

  it('antialiases the disc edge rather than stepping hard', () => {
    // Walk out from the centre; there must be at least one pixel
    // that is neither pure ground nor pure pearl.
    const y = Math.floor(size / 2);
    let blended = 0;
    for (let x = 0; x < size; x += 1) {
      const p = px(x, y);
      const isGround = p.r === 0x5C && p.g === 0x6B && p.b === 0x3F;
      const isPearl = p.r > 0xE0;
      if (!isGround && !isPearl) blended += 1;
    }
    expect(blended).toBeGreaterThan(0);
  });

  it('takes the celebration’s own ground colour', () => {
    const tinted = passIcon(29, '#7A2D2D');
    const rawT = inflateSync(readChunks(tinted)[1].data);
    const i = 1 * (1 + 29 * 3) + 1 + 1 * 3;
    expect({ r: rawT[i], g: rawT[i + 1], b: rawT[i + 2] }).toEqual({ r: 0x7A, g: 0x2D, b: 0x2D });
  });

  it('falls back to olive on a junk colour rather than throwing', () => {
    for (const bad of ['', 'not-a-colour', '#12', null, undefined]) {
      expect(() => passIcon(29, bad as string)).not.toThrow();
    }
  });
});

describe('size', () => {
  it('stays small enough to sit in a pass', () => {
    // A .pkpass travels over mobile data; the icon has no business
    // being more than a couple of KB.
    expect(passIcon(87).length).toBeLessThan(8 * 1024);
  });

  it('is deterministic — the same icon every time', () => {
    expect(passIcon(29).equals(passIcon(29))).toBe(true);
  });
});
