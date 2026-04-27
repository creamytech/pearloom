// ──────────────────────────────────────────────────────────────
// Pearloom / lib/decor/remove-background.ts
//
// Edge-flood-fill white-background removal using sharp.
//
// gpt-image-2 doesn't honour `background: 'transparent'`. Our decor
// prompts ask the model to render isolated subjects on pure white
// (#FFFFFF). This helper turns those into clean transparent PNGs:
//
//   1. Decode the input as raw RGBA pixels.
//   2. Run a flood-fill from every edge pixel — any "white-ish"
//      pixel reachable from the canvas border becomes alpha=0.
//   3. Pixels INSIDE the subject that happen to be white (a dove's
//      breast, a candle's wick) are preserved because they're not
//      connected to the outer border.
//   4. Optional 1-px feather softens the resulting alpha edge so we
//      don't get hard chroma-key halos on the published site.
//
// Output: a PNG buffer with proper alpha. Always succeeds even if
// the input has no flood-fillable white edge — in that case the
// image just passes through unchanged (graceful degradation).
//
// Quality gate: if the flood removed >= MAX_REMOVAL_RATIO of the
// canvas (very dark image, prompt drift, model returned a coloured
// background), we return the ORIGINAL buffer instead of the
// near-empty alpha version. The route can then surface a "couldn't
// isolate this one" hint to the UI.
// ──────────────────────────────────────────────────────────────

import sharp from 'sharp';

export interface RemoveBgOptions {
  /** 0–80, how strict the white-match is (255-tolerance per channel
   *  is the floor for "white-ish"). Default 28 — empirically catches
   *  paper-grain noise without nibbling at light subject edges. */
  tolerance?: number;
  /** Soft edge in px applied to the alpha mask. Default 1 — kills
   *  hard chroma-key halos. Set 0 to disable. */
  feather?: number;
  /** If we'd remove more than this fraction of the canvas, abort and
   *  return the original (likely the prompt didn't yield a white
   *  background). Default 0.92 — only a fully-white background trips
   *  this safety. */
  maxRemovalRatio?: number;
}

export interface RemoveBgResult {
  /** PNG buffer with alpha. Either the cleaned output or, if the
   *  quality gate fired, the original input. */
  buffer: Buffer;
  /** True when the flood-fill produced a viable cutout. False when
   *  the safety abort fired and we returned the original. */
  isolated: boolean;
  /** Fraction of pixels turned transparent (0–1). Useful for
   *  logging + debugging prompt drift. */
  removedRatio: number;
  /** Width × height of the processed image. */
  width: number;
  height: number;
}

const DEFAULT_TOLERANCE = 28;
const DEFAULT_FEATHER = 1;
const DEFAULT_MAX_REMOVAL = 0.92;

export async function removeWhiteBackground(
  input: Buffer,
  opts: RemoveBgOptions = {},
): Promise<RemoveBgResult> {
  const tolerance = clamp(opts.tolerance ?? DEFAULT_TOLERANCE, 0, 80);
  const feather = Math.max(0, opts.feather ?? DEFAULT_FEATHER);
  const maxRemoval = clamp(opts.maxRemovalRatio ?? DEFAULT_MAX_REMOVAL, 0.5, 0.99);

  // Decode to raw RGBA so we can hand-walk the pixel buffer.
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  if (info.channels !== 4) {
    return { buffer: input, isolated: false, removedRatio: 0, width, height };
  }

  // BFS from every edge pixel. Any white-ish pixel reachable from
  // the border gets alpha=0. Stack reused as a typed array for
  // speed on 1024×1024 images (~1M pixels).
  const total = width * height;
  const visited = new Uint8Array(total);
  // Use a number[] stack — pixel indices fit in safe int range
  // (max 1024*1024 = 1M, well under 2^53).
  const stack: number[] = [];

  for (let x = 0; x < width; x++) {
    stack.push(x);                          // top edge
    stack.push((height - 1) * width + x);   // bottom edge
  }
  for (let y = 0; y < height; y++) {
    stack.push(y * width);                  // left edge
    stack.push(y * width + (width - 1));    // right edge
  }

  const whiteFloor = 255 - tolerance;
  let removed = 0;

  while (stack.length > 0) {
    const idx = stack.pop()!;
    if (visited[idx]) continue;

    const off = idx * 4;
    const r = data[off];
    const g = data[off + 1];
    const b = data[off + 2];
    if (r === undefined || g === undefined || b === undefined) continue;
    if (r < whiteFloor || g < whiteFloor || b < whiteFloor) continue;

    visited[idx] = 1;
    data[off + 3] = 0;
    removed++;

    const x = idx % width;
    const y = (idx - x) / width;
    if (x > 0)            stack.push(idx - 1);
    if (x < width - 1)    stack.push(idx + 1);
    if (y > 0)            stack.push(idx - width);
    if (y < height - 1)   stack.push(idx + width);
  }

  const removedRatio = removed / total;

  // Quality gate — refuse to ship an empty alpha mask.
  if (removedRatio >= maxRemoval || removed === 0) {
    return {
      buffer: await sharp(input).png().toBuffer(),
      isolated: false,
      removedRatio,
      width,
      height,
    };
  }

  // Encode the mutated raw back to a PNG.
  let pipeline = sharp(data, {
    raw: { width, height, channels: 4 },
  });

  // Optional feather — slight blur on the alpha channel only.
  if (feather > 0) {
    // Extract alpha, blur, recompose. Sharp doesn't expose
    // alpha-only blur directly, so we round-trip via composite.
    const rgb = await pipeline
      .clone()
      .removeAlpha()
      .raw()
      .toBuffer();
    const alpha = await sharp(data, { raw: { width, height, channels: 4 } })
      .clone()
      .extractChannel(3)
      .blur(feather)
      .raw()
      .toBuffer();

    // Reassemble as RGBA: channels = 3 + 1
    pipeline = sharp(rgb, { raw: { width, height, channels: 3 } })
      .joinChannel(alpha, { raw: { width, height, channels: 1 } });
  }

  const out = await pipeline.png({ compressionLevel: 9 }).toBuffer();
  return { buffer: out, isolated: true, removedRatio, width, height };
}

function clamp(n: number, lo: number, hi: number): number {
  return n < lo ? lo : n > hi ? hi : n;
}
