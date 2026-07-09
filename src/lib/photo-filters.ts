// ─────────────────────────────────────────────────────────────
// Pearloom / lib/photo-filters.ts
// Shared photo-filter presets + canvas baking. Used by the editor
// PhotoFilterEditor (host) and the guest upload flow so the look is
// identical everywhere. Presets are restrained + on-brand — "made",
// not Instagram.
// ─────────────────────────────────────────────────────────────

export interface FilterPreset {
  id: string;
  label: string;
  /** CSS/canvas filter string. Empty = original. */
  filter: string;
}

export const FILTER_PRESETS: FilterPreset[] = [
  { id: 'none',        label: 'Original',    filter: '' },
  { id: 'warm',        label: 'Warm',        filter: 'saturate(1.12) sepia(0.14) contrast(1.03) brightness(1.02)' },
  { id: 'letterpress', label: 'Letterpress', filter: 'grayscale(0.18) contrast(1.12) brightness(1.02) sepia(0.08)' },
  { id: 'film',        label: 'Film',        filter: 'contrast(1.08) saturate(0.92) sepia(0.2) brightness(1.02)' },
  { id: 'bw',          label: 'B & W',       filter: 'grayscale(1) contrast(1.08)' },
  { id: 'fade',        label: 'Fade',        filter: 'contrast(0.92) brightness(1.06) saturate(0.82)' },
];

/** A crop rectangle in normalized SOURCE coords (0..1), applied
 *  before rotation. Omit (or full 0,0,1,1) for no crop. */
export interface CropRect { x: number; y: number; w: number; h: number }

export const FULL_CROP: CropRect = { x: 0, y: 0, w: 1, h: 1 };

export function isFullCrop(c?: CropRect | null): boolean {
  return !c || (c.x <= 0.0001 && c.y <= 0.0001 && c.w >= 0.9999 && c.h >= 0.9999);
}

export interface BakeOptions {
  filter: string;
  /** 0..1 — filter strength, blended over the original. Default 1. */
  intensity?: number;
  /** 0 | 90 | 180 | 270. Default 0. */
  rotation?: number;
  /** Normalized source crop, applied before rotation. */
  crop?: CropRect | null;
  /** Long-edge cap for the re-encode. Default 2000. */
  maxEdge?: number;
  /** JPEG quality 0..1. Default 0.9. */
  quality?: number;
}

/** Load an image (crossOrigin anonymous so remote sources can be
 *  drawn when CORS allows). Rejects on load failure / taint. */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image load failed'));
    img.src = src;
  });
}

/** Draw an image through a canvas with filter + intensity + rotation,
 *  returning the canvas (caller chooses toDataURL / toBlob). The
 *  filtered layer is composited over the original at `intensity`. */
export function bakeToCanvas(img: HTMLImageElement, opts: BakeOptions, canvasEl?: HTMLCanvasElement): HTMLCanvasElement {
  const { filter, intensity = 1, rotation = 0, crop, maxEdge = 2000 } = opts;

  // Source crop in pixels (clamped to the image).
  const c = isFullCrop(crop) ? FULL_CROP : crop!;
  const sx = Math.max(0, c.x) * img.naturalWidth;
  const sy = Math.max(0, c.y) * img.naturalHeight;
  const sw = Math.min(1 - Math.max(0, c.x), c.w) * img.naturalWidth;
  const sh = Math.min(1 - Math.max(0, c.y), c.h) * img.naturalHeight;

  // Output size of the (unrotated) cropped region, capped.
  const scale = Math.min(1, maxEdge / Math.max(sw, sh));
  const ow = Math.max(1, Math.round(sw * scale));
  const oh = Math.max(1, Math.round(sh * scale));

  const rot = ((rotation % 360) + 360) % 360;
  const swap = rot === 90 || rot === 270;

  const canvas = canvasEl ?? document.createElement('canvas');
  canvas.width = swap ? oh : ow;
  canvas.height = swap ? ow : oh;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no 2d context');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rot * Math.PI) / 180);
  // Base — cropped, unfiltered.
  ctx.filter = 'none';
  ctx.drawImage(img, sx, sy, sw, sh, -ow / 2, -oh / 2, ow, oh);
  // Filtered layer over the base at `intensity`.
  if (filter && intensity > 0) {
    ctx.globalAlpha = Math.min(1, Math.max(0, intensity));
    ctx.filter = filter;
    ctx.drawImage(img, sx, sy, sw, sh, -ow / 2, -oh / 2, ow, oh);
  }
  ctx.restore();
  return canvas;
}

/** Bake a source URL → JPEG data URL. Throws if the source taints. */
export async function bakeToDataUrl(src: string, opts: BakeOptions): Promise<string> {
  const img = await loadImage(src);
  return bakeToCanvas(img, opts).toDataURL('image/jpeg', opts.quality ?? 0.9);
}

/** Bake a File (e.g. a guest's camera capture) → a new JPEG File.
 *  Falls back to the original File if anything goes wrong. */
export async function bakeFileToFile(file: File, opts: BakeOptions): Promise<File> {
  const hasEdit = !!opts.filter || (!!opts.rotation && opts.rotation % 360 !== 0) || !isFullCrop(opts.crop);
  if (!hasEdit) return file;
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const canvas = bakeToCanvas(img, opts);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', opts.quality ?? 0.9),
    );
    if (!blob) return file;
    const name = file.name.replace(/\.[^.]+$/, '') + '-edited.jpg';
    return new File([blob], name, { type: 'image/jpeg' });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
