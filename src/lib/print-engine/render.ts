// ─────────────────────────────────────────────────────────────
// Pearloom / lib/print-engine/render.ts
//
// Shared SVG → 300dpi PNG → R2 render+stage step, extracted from
// /api/print/orders so both the (now payment-gated) checkout
// route and any future print surface render artwork identically.
//
// Returns a discriminated result instead of throwing so callers
// can map the failed stage to the right user-facing message.
// ─────────────────────────────────────────────────────────────

import { uploadToR2, getR2Url } from '@/lib/r2';
import type { PostcardSize } from './pricing';

export type RenderArtworkResult =
  | { ok: true; frontUrl: string; r2Key: string }
  | { ok: false; stage: 'render' | 'upload'; message: string };

export function dimensionsForSize(size: PostcardSize = '4x6'): { width: number; height: number } {
  // 300 dpi — standard print resolution. SVG viewBox is 1000×1400
  // already; Sharp scales it during the render step.
  switch (size) {
    case '6x9':  return { width: 1800, height: 2700 };
    case '6x11': return { width: 1800, height: 3300 };
    case '4x6':
    default:     return { width: 1200, height: 1800 };
  }
}

/**
 * Render the designer's raw SVG to a print-resolution PNG via
 * Sharp (librsvg) and stage it on R2 under
 * `print/{siteSlug}/{batchId}/front.png`.
 */
export async function renderPrintArtwork(opts: {
  svg: string;
  size?: PostcardSize;
  siteSlug: string;
  batchId: string;
}): Promise<RenderArtworkResult> {
  const dim = dimensionsForSize(opts.size);
  const sharpModule = await import('sharp');
  const sharp = sharpModule.default;

  let pngBuffer: Buffer;
  try {
    pngBuffer = await sharp(Buffer.from(opts.svg, 'utf-8'), { density: 300 })
      .resize({ width: dim.width, height: dim.height, fit: 'fill' })
      .png({ quality: 92 })
      .toBuffer();
  } catch (err) {
    console.error('[print] sharp render failed:', err);
    return {
      ok: false,
      stage: 'render',
      message: err instanceof Error ? err.message : 'render failed',
    };
  }

  const r2Key = `print/${opts.siteSlug}/${opts.batchId}/front.png`;
  try {
    await uploadToR2(r2Key, pngBuffer, 'image/png');
  } catch (err) {
    console.error('[print] R2 upload failed:', err);
    return {
      ok: false,
      stage: 'upload',
      message: err instanceof Error ? err.message : 'upload failed',
    };
  }

  return { ok: true, frontUrl: getR2Url(r2Key), r2Key };
}
