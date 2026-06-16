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

export interface BakeOptions {
  filter: string;
  /** 0..1 — filter strength, blended over the original. Default 1. */
  intensity?: number;
  /** 0 | 90 | 180 | 270. Default 0. */
  rotation?: number;
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
export function bakeToCanvas(img: HTMLImageElement, opts: BakeOptions): HTMLCanvasElement {
  const { filter, intensity = 1, rotation = 0, maxEdge = 2000 } = opts;
  const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);
  const rot = ((rotation % 360) + 360) % 360;
  const swap = rot === 90 || rot === 270;

  const canvas = document.createElement('canvas');
  canvas.width = swap ? h : w;
  canvas.height = swap ? w : h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no 2d context');

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.filter = 'none';
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  if (filter && intensity > 0) {
    ctx.globalAlpha = Math.min(1, Math.max(0, intensity));
    ctx.filter = filter;
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
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
  if (!opts.filter && !(opts.rotation && opts.rotation % 360 !== 0)) return file;
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
