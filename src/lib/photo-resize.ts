// ─────────────────────────────────────────────────────────────
// Pearloom / lib/photo-resize.ts
// Downscale + re-encode a photo upload before it ever touches
// storage, so a 12-megapixel phone capture doesn't ship to every
// guest at full resolution.
//
// Fail-open by contract: any decode / encode error (or an animated
// / vector source) returns the ORIGINAL bytes untouched — a resize
// hiccup must never drop a guest's photo. The output format is kept
// consistent with the caller's file extension so the stored bytes
// always agree with the Content-Type the photo is served under.
// ─────────────────────────────────────────────────────────────

import sharp from 'sharp';

/** Longest-edge cap. 2048px covers retina full-bleed on the largest
 *  phones/tablets while cutting a typical ~4000px camera original to
 *  roughly a quarter of the pixels. */
export const MAX_EDGE = 2048;

/** Extensions we deliberately never re-encode. `gif` is (usually)
 *  animated and would flatten to a single frame; `svg` is vector.
 *  Both pass straight through. Animated non-gif sources (e.g. an
 *  animated webp) are caught separately via the page count. */
const SKIP_EXTS = new Set(['gif', 'svg']);

/**
 * Downscale `input` so its longest edge is at most {@link MAX_EDGE},
 * honouring EXIF orientation and preserving aspect ratio, then
 * re-encode in a format that matches `ext`.
 *
 * The re-encoded buffer is adopted only when it is actually smaller
 * than the original — an already-small / already-optimised image is
 * never re-inflated at our quality setting. On any sharp error, or
 * for animated / vector sources, the original buffer is returned
 * unchanged.
 *
 * @param input Raw image bytes as read from the upload.
 * @param ext   The extension the caller will store the file under
 *              (e.g. `jpg`, `png`, `webp`). Drives the output format.
 */
export async function downscalePhoto(input: Buffer, ext: string): Promise<Buffer> {
  const e = ext.toLowerCase().replace(/^\./, '');
  if (SKIP_EXTS.has(e)) return input;

  try {
    // failOn:'none' — tolerate truncated / slightly malformed files
    // rather than throwing on a warning; a best-effort decode still
    // beats shipping the full-resolution original.
    const image = sharp(input, { failOn: 'none' });
    const meta = await image.metadata();

    // Animated source (multi-page webp, etc.) — leave it whole so we
    // don't silently drop frames.
    if ((meta.pages ?? 1) > 1) return input;

    const resized = image
      .rotate() // bake EXIF orientation into the pixels, then drop the tag
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true });

    let out: Buffer;
    switch (e) {
      case 'png':
        out = await resized.png({ compressionLevel: 9 }).toBuffer();
        break;
      case 'webp':
        out = await resized.webp({ quality: 82 }).toBuffer();
        break;
      default:
        // jpg / jpeg — and heic/heif, which callers rename to jpg and
        // which sharp decodes to JPEG here when libheif is available.
        out = await resized.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
    }

    // Only keep the re-encode when it genuinely saved bytes.
    return out.length > 0 && out.length < input.length ? out : input;
  } catch (err) {
    console.warn('[photo-resize] downscale failed (keeping original):', err);
    return input;
  }
}
