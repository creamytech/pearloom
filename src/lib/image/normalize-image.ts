// ─────────────────────────────────────────────────────────────
// normalize-image.ts — client-side photo ingestion normalizer.
//
// Every photo the host picks (wizard, editor slots, PhotoPicker)
// runs through `normalizeImageFile` BEFORE upload or preview.
// It solves three real bugs:
//
//   1. "Too big — 12 MB max": iPhone photos are 5–20 MB. Instead
//      of hard-rejecting, we downscale the longest edge and
//      re-encode with a quality search until the bytes fit a
//      budget, so any-size photo uploads.
//   2. Google-Photos / gallery grey broken tiles: HEIC/HEIF bytes
//      that Chrome can't paint. We decode (Safari decodes HEIC
//      via createImageBitmap) and re-encode to JPEG — a web-safe
//      format every browser renders. When decode genuinely fails
//      (HEIC on Chrome with no bitmap support) we throw a TYPED
//      error the UI turns into a clear message — never a silent
//      grey tile.
//   3. Stale File / object-URL references: we read the bytes
//      IMMEDIATELY on selection (decode → canvas → blob), so a
//      lazily-streamed picker File can't go stale before upload.
//
// EXIF orientation is preserved: createImageBitmap is called with
// `imageOrientation: 'from-image'`, and the <img> fallback relies
// on the browser's default `image-orientation: from-image` bake-in
// when decoding for an <img> element. Portrait iPhone photos do
// not rotate.
//
// The heavy lifting (decode/canvas/encode) is browser-only and
// guarded. The math helpers (`computeScaledDimensions`,
// `qualityLadder`, `isHeicLike`, error messaging) are pure and
// unit-tested in `normalize-image.test.ts`.
// ─────────────────────────────────────────────────────────────

/** Typed failure codes so the UI can branch on them. */
export type NormalizeErrorCode =
  | 'ssr' // called on the server — no canvas/DOM
  | 'not-image' // the File isn't an image and isn't HEIC-like
  | 'decode-failed' // bytes couldn't be decoded to pixels
  | 'heic-unsupported' // HEIC/HEIF this browser can't decode (Chrome)
  | 'encode-failed' // canvas produced no blob
  | 'too-large'; // still over the hard ceiling after full compression

export class ImageNormalizeError extends Error {
  code: NormalizeErrorCode;
  constructor(code: NormalizeErrorCode, message: string) {
    super(message);
    this.name = 'ImageNormalizeError';
    this.code = code;
  }
}

export interface NormalizeOptions {
  /** Max length of the longest edge, in px. Default 2560. */
  maxEdge?: number;
  /** Byte budget the quality search aims to fit under. Default ~4 MB. */
  targetBytes?: number;
  /** Absolute ceiling after full compression; over this we throw
   *  `too-large`. Default ~10 MB (under the 12 MB server cap). */
  hardCeilingBytes?: number;
  /** Output MIME. Default 'image/jpeg' (widest support). */
  mimeType?: 'image/jpeg' | 'image/webp';
  /** Quality search start. Default 0.85. */
  initialQuality?: number;
  /** Quality search floor. Default 0.4. */
  minQuality?: number;
  /** Quality search step. Default 0.1. */
  qualityStep?: number;
}

export interface NormalizedImage {
  /** The re-encoded, web-safe image bytes. */
  blob: Blob;
  /** A fresh object URL for the normalized blob. Caller owns
   *  revocation via `URL.revokeObjectURL` when done. */
  url: string;
  /** Final pixel width after downscale. */
  width: number;
  /** Final pixel height after downscale. */
  height: number;
  /** Output MIME type of `blob`. */
  mimeType: string;
}

const DEFAULTS = {
  maxEdge: 2560,
  targetBytes: 4 * 1024 * 1024,
  hardCeilingBytes: 10 * 1024 * 1024,
  mimeType: 'image/jpeg' as const,
  initialQuality: 0.85,
  minQuality: 0.4,
  qualityStep: 0.1,
};

// ─── Pure helpers (unit-tested) ──────────────────────────────

/**
 * Scale (width, height) so the longest edge is at most `maxEdge`,
 * preserving aspect ratio. Never upscales. Returns integer dims,
 * each at least 1.
 */
export function computeScaledDimensions(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  const w = Math.max(0, Math.floor(width));
  const h = Math.max(0, Math.floor(height));
  if (w <= 0 || h <= 0 || !Number.isFinite(w) || !Number.isFinite(h)) {
    return { width: 1, height: 1 };
  }
  const longest = Math.max(w, h);
  if (longest <= maxEdge || maxEdge <= 0) {
    return { width: w, height: h };
  }
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(w * scale)),
    height: Math.max(1, Math.round(h * scale)),
  };
}

/**
 * Descending list of quality values to try, from `start` down to
 * (but not below) `min`, stepping by `step`. Always includes at
 * least the start value; clamps into (0, 1].
 */
export function qualityLadder(start: number, step: number, min: number): number[] {
  const clamp = (n: number) => Math.min(1, Math.max(0.01, n));
  const s = clamp(start);
  const lo = clamp(min);
  const st = Math.max(0.01, step);
  const out: number[] = [];
  for (let q = s; q >= lo - 1e-9; q -= st) {
    out.push(Math.round(clamp(q) * 100) / 100);
  }
  if (out.length === 0) out.push(s);
  return out;
}

/** HEIC/HEIF detection by MIME or extension — the format Chrome
 *  can't paint but iPhones hand out. Some pickers give an empty
 *  MIME, so we also sniff the filename. */
export function isHeicLike(file: { type?: string; name?: string }): boolean {
  const type = (file.type ?? '').toLowerCase();
  if (type.includes('heic') || type.includes('heif')) return true;
  const name = (file.name ?? '').toLowerCase();
  return /\.(heic|heif)$/.test(name);
}

/** The clear, actionable message for a HEIC file this browser
 *  can't decode. */
export function heicUnsupportedMessage(): string {
  return (
    "This photo's format (HEIC) can't be read in this browser — try " +
    "'Most compatible' in iPhone Settings › Camera › Formats, or pick " +
    'from your gallery again.'
  );
}

/** Turn any thrown value into a host-facing message. Typed
 *  ImageNormalizeError codes get bespoke copy; everything else
 *  falls back to a calm generic line. */
export function normalizeErrorMessage(err: unknown): string {
  if (err instanceof ImageNormalizeError) {
    switch (err.code) {
      case 'heic-unsupported':
        return heicUnsupportedMessage();
      case 'not-image':
        return "That file isn't an image.";
      case 'too-large':
        return "That photo is enormous — we couldn't shrink it enough. Try a smaller one.";
      case 'decode-failed':
        return "This photo couldn't be read. Try a different one, or re-save it as JPG.";
      case 'encode-failed':
        return "This photo couldn't be prepared. Try a different one.";
      case 'ssr':
        return 'Photo preparation is only available in the browser.';
    }
  }
  return "This photo couldn't be prepared — try another?";
}

// ─── Browser-only decode / canvas / encode ───────────────────

interface DecodedSource {
  source: CanvasImageSource;
  width: number;
  height: number;
  cleanup: () => void;
}

async function decodeFile(file: File): Promise<DecodedSource> {
  // Path 1: createImageBitmap with EXIF orientation baked in.
  // On Safari this also decodes HEIC natively.
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      if (bitmap.width > 0 && bitmap.height > 0) {
        return {
          source: bitmap,
          width: bitmap.width,
          height: bitmap.height,
          cleanup: () => bitmap.close(),
        };
      }
      bitmap.close();
    } catch {
      // fall through to the <img> path
    }
  }

  // Path 2: <img> + object URL. Modern browsers bake EXIF
  // orientation in when decoding for an <img> element.
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    if (width <= 0 || height <= 0) {
      throw new ImageNormalizeError('decode-failed', 'Zero-dimension decode.');
    }
    return {
      source: img,
      width,
      height,
      cleanup: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (err) {
    URL.revokeObjectURL(objectUrl);
    if (err instanceof ImageNormalizeError) throw err;
    // Both decode paths failed. If it's HEIC-like, the culprit is
    // near-certainly the format (Chrome). Otherwise it's a generic
    // decode failure.
    if (isHeicLike(file)) {
      throw new ImageNormalizeError('heic-unsupported', heicUnsupportedMessage());
    }
    throw new ImageNormalizeError('decode-failed', "This photo couldn't be decoded.");
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('img load failed'));
    img.src = src;
  });
}

/**
 * Normalize a picked image File into a web-safe, size-bounded blob
 * ready for upload/preview. See the module header for the why.
 *
 * @throws ImageNormalizeError with a typed `code` on any failure.
 */
export async function normalizeImageFile(
  file: File,
  opts: NormalizeOptions = {},
): Promise<NormalizedImage> {
  if (typeof document === 'undefined' && typeof OffscreenCanvas === 'undefined') {
    throw new ImageNormalizeError('ssr', 'normalizeImageFile requires a browser.');
  }

  const o = { ...DEFAULTS, ...opts };
  const type = (file.type ?? '').toLowerCase();
  if (!type.startsWith('image/') && !isHeicLike(file)) {
    throw new ImageNormalizeError('not-image', "That file isn't an image.");
  }

  const decoded = await decodeFile(file);
  try {
    const { width, height } = computeScaledDimensions(decoded.width, decoded.height, o.maxEdge);

    // Draw once, encode many. OffscreenCanvas and <canvas> both
    // support drawImage + a to-blob path; we build the canvas +
    // context inline so the same drawn bitmap is re-encoded across
    // the quality ladder without redrawing.
    const useOffscreen = typeof OffscreenCanvas !== 'undefined';
    let encode: (t: string, q: number) => Promise<Blob | null>;

    if (useOffscreen) {
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new ImageNormalizeError('encode-failed', 'No 2D context.');
      ctx.drawImage(decoded.source, 0, 0, width, height);
      encode = async (t, q) => {
        try {
          return await canvas.convertToBlob({ type: t, quality: q });
        } catch {
          return null;
        }
      };
    } else {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new ImageNormalizeError('encode-failed', 'No 2D context.');
      ctx.drawImage(decoded.source, 0, 0, width, height);
      encode = (t, q) =>
        new Promise<Blob | null>((resolve) => {
          canvas.toBlob((b) => resolve(b), t, q);
        });
    }

    const ladder = qualityLadder(o.initialQuality, o.qualityStep, o.minQuality);
    let best: Blob | null = null;
    for (const q of ladder) {
      const blob = await encode(o.mimeType, q);
      if (!blob) continue;
      best = blob; // ladder descends, so each is smaller than the last
      if (blob.size <= o.targetBytes) break;
    }

    if (!best) {
      throw new ImageNormalizeError('encode-failed', 'Canvas produced no image.');
    }
    if (best.size > o.hardCeilingBytes) {
      throw new ImageNormalizeError(
        'too-large',
        "That photo is enormous — we couldn't shrink it enough.",
      );
    }

    return {
      blob: best,
      url: URL.createObjectURL(best),
      width,
      height,
      mimeType: o.mimeType,
    };
  } finally {
    decoded.cleanup();
  }
}

/** Read a Blob as a base64 data URL — the shape /api/photos/upload
 *  expects. Browser-only. */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new ImageNormalizeError('decode-failed', "Couldn't read the file."));
    reader.readAsDataURL(blob);
  });
}

/** Swap a filename's extension to match the normalized output type
 *  (so a `.heic` upload lands as `.jpg`). */
export function filenameForOutput(name: string | undefined, mimeType: string): string {
  const ext = mimeType.includes('webp') ? 'webp' : 'jpg';
  const base = (name ?? 'photo').replace(/\.[^./\\]+$/, '');
  return `${base || 'photo'}.${ext}`;
}
