// ─────────────────────────────────────────────────────────────
// sheet.ts — slice a generated multi-asset sheet into N clean,
// content-trimmed PNGs.
//
// Why this exists:
//   gpt-image-2 charges per generation. A single 1536×1024 image
//   can carry a 3×3 grid of distinct decor pieces — one API call,
//   nine assets. The naive crop ("split into 9 equal cells") leaves
//   each cell padded with white wherever the model didn't fill the
//   square. trimToContent() walks the alpha channel after the
//   white-flood pass and crops every cell to its actual ink
//   bounding box, so each saved asset is the smallest pixel box
//   that contains the drawing.
//
// The isolation quality gate refuses cells where >92% of pixels
// were removed (effectively empty) — the caller decides whether
// to retry the whole sheet or just keep the cells that survived.
// ─────────────────────────────────────────────────────────────

import sharp from 'sharp';
import { removeWhiteBackground } from './remove-background';

export interface SheetCell {
  /** Logical key the caller asked for (e.g. 'hero', 'travel'). */
  key: string;
  /** Cleaned PNG buffer of just this cell, content-trimmed. */
  buffer: Buffer;
  /** True when the cell had visible ink after isolation. */
  ok: boolean;
  /** Width × height after content trim. Useful for downstream
   *  layout decisions when the asset isn't square. */
  width: number;
  height: number;
  /** Ratio of pixels that were detected as ink — sanity gate. */
  contentRatio: number;
}

export interface SheetSliceOptions {
  /** Number of columns in the grid the model was asked to draw. */
  cols: number;
  /** Number of rows in the grid the model was asked to draw. */
  rows: number;
  /** Logical keys for each cell, row-major. Must equal cols*rows.
   *  The output preserves this order. */
  keys: string[];
  /** Pad each trimmed cell with this many transparent pixels so
   *  thin strokes near the edge don't render against the canvas
   *  background flush. Default 12. */
  padding?: number;
  /** Minimum content ratio per cell to count as "ok". Cells below
   *  this are returned with ok=false so the caller can decide to
   *  retry the whole sheet. Default 0.005 (0.5% inked pixels). */
  minContentRatio?: number;
}

/**
 * Slice a generated sheet image into N content-trimmed cells.
 *
 * The pipeline per cell:
 *   1. Fixed-grid extract (col*tileW, row*tileH).
 *   2. White-flood removal (existing removeWhiteBackground).
 *   3. Content-bbox trim (alpha channel scan).
 *   4. Optional padding around the bbox.
 */
export async function sliceSheet(
  sheetPng: Buffer,
  opts: SheetSliceOptions,
): Promise<SheetCell[]> {
  const { cols, rows, keys, padding = 12, minContentRatio = 0.005 } = opts;
  if (keys.length !== cols * rows) {
    throw new Error(`sliceSheet: keys.length (${keys.length}) must equal cols*rows (${cols * rows})`);
  }

  // Inspect the sheet so we know its true dimensions (the painter
  // doesn't always honour the requested size to the pixel).
  const sheetMeta = await sharp(sheetPng).metadata();
  const sheetW = sheetMeta.width ?? 0;
  const sheetH = sheetMeta.height ?? 0;
  if (!sheetW || !sheetH) throw new Error('sliceSheet: source has no dimensions');

  const tileW = Math.floor(sheetW / cols);
  const tileH = Math.floor(sheetH / rows);

  const out: SheetCell[] = [];
  for (let i = 0; i < keys.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const left = col * tileW;
    const top = row * tileH;

    try {
      const tile = await sharp(sheetPng)
        .extract({ left, top, width: tileW, height: tileH })
        .png()
        .toBuffer();

      const cleaned = await removeWhiteBackground(tile);
      const trimmed = await trimToContent(cleaned.buffer, padding);

      out.push({
        key: keys[i],
        buffer: trimmed.buffer,
        width: trimmed.width,
        height: trimmed.height,
        contentRatio: trimmed.contentRatio,
        ok: trimmed.contentRatio >= minContentRatio,
      });
    } catch (err) {
      console.error(`[sliceSheet] cell ${i} (${keys[i]}) failed:`, err);
      out.push({
        key: keys[i],
        buffer: Buffer.alloc(0),
        width: 0,
        height: 0,
        contentRatio: 0,
        ok: false,
      });
    }
  }

  return out;
}

interface TrimResult {
  buffer: Buffer;
  width: number;
  height: number;
  contentRatio: number;
}

/**
 * Crop a transparent PNG to the smallest bounding box that
 * contains all pixels with non-zero alpha. Adds the requested
 * padding back as transparent margin. Returns the source unchanged
 * when the image has no opaque pixels.
 */
export async function trimToContent(input: Buffer, padding: number): Promise<TrimResult> {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  if (channels !== 4 || !width || !height) {
    return { buffer: input, width: width ?? 0, height: height ?? 0, contentRatio: 0 };
  }

  let minX = width, minY = height, maxX = -1, maxY = -1;
  let inked = 0;
  // Treat alpha > 16 as "ink" — keeps soft anti-aliased edges from
  // tightening the box too aggressively, but excludes the JPEG-grade
  // grey haze the painter leaves behind in some renders.
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const off = (y * width + x) * 4;
      const a = data[off + 3];
      if (a !== undefined && a > 16) {
        inked++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const total = width * height;
  const contentRatio = inked / total;

  if (maxX < 0 || maxY < 0) {
    return { buffer: input, width, height, contentRatio: 0 };
  }

  const cropLeft = Math.max(0, minX - padding);
  const cropTop = Math.max(0, minY - padding);
  const cropRight = Math.min(width - 1, maxX + padding);
  const cropBottom = Math.min(height - 1, maxY + padding);
  const cropW = cropRight - cropLeft + 1;
  const cropH = cropBottom - cropTop + 1;

  const buffer = await sharp(input)
    .extract({ left: cropLeft, top: cropTop, width: cropW, height: cropH })
    .png()
    .toBuffer();

  return { buffer, width: cropW, height: cropH, contentRatio };
}
