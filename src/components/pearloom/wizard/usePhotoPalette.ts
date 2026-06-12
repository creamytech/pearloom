'use client';

// ─────────────────────────────────────────────────────────────
// usePhotoPalette — derive a "From your photos" palette option
// for the wizard's Palette step from the host's first uploaded
// photo, using the Look Engine's client-side extraction
// (Canvas 48×48 bucket-quantize → accent/gold/bg/ink).
//
// Failure is silent by design: a tainted canvas (cross-origin
// Google photo without CORS), a decode error, or an empty
// extraction all resolve to null and the wizard simply doesn't
// offer the tile.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import {
  extractColorsFromImage,
  paletteFromColors,
  type ExtractedPalette,
} from '@/lib/look-engine/palette-from-photo';

/**
 * Decode an image URL (data URL or remote) and run extraction +
 * palette derivation. Resolves null on any failure — never throws.
 */
export function paletteFromImageUrl(url: string): Promise<ExtractedPalette | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !url) {
      resolve(null);
      return;
    }
    const img = new Image();
    // Remote photos (Google CDN, R2) need CORS opt-in or the canvas
    // taints; data URLs must NOT set crossOrigin or some browsers
    // refuse to decode.
    if (!url.startsWith('data:')) img.crossOrigin = 'anonymous';
    img.onerror = () => resolve(null);
    img.onload = () => {
      try {
        const colors = extractColorsFromImage(img, 6);
        resolve(paletteFromColors(colors));
      } catch {
        resolve(null);
      }
    };
    img.src = url;
  });
}

/**
 * Compute (and cache) a photo-derived palette for the wizard.
 *
 * - `sourceUrl` — the photo to read (the wizard passes the first
 *   uploaded photo's preview data URL). When it changes (photos
 *   re-picked after a back-navigation), the palette recomputes.
 * - `enabled` — gate the work to the Palette step so we don't run
 *   canvas extraction while the host is still mid-upload.
 *
 * Returns null until a palette is ready, and null again if the
 * source photo disappears or extraction fails.
 */
export function usePhotoPalette(
  sourceUrl: string | undefined,
  enabled: boolean,
): ExtractedPalette | null {
  /* One-slot cache keyed by source URL. The cache entry lives in
     STATE so the render-time "is this palette for the current
     photo?" check reads state, not a ref; the effect mirrors it
     into a ref so the cache-hit check doesn't need a state read
     (which would be a sync setState-in-effect dance). */
  const [entry, setEntry] = useState<{ url: string; palette: ExtractedPalette | null } | null>(null);
  const entryRef = useRef(entry);
  useEffect(() => { entryRef.current = entry; }, [entry]);

  useEffect(() => {
    if (!enabled || !sourceUrl) return;
    if (entryRef.current?.url === sourceUrl) return; // cache hit — nothing to do
    let cancelled = false;
    void paletteFromImageUrl(sourceUrl).then((p) => {
      if (cancelled) return;
      setEntry({ url: sourceUrl, palette: p });
    });
    return () => {
      cancelled = true;
    };
  }, [sourceUrl, enabled]);

  // Never surface a palette computed for a different (or removed) photo.
  if (!sourceUrl || entry?.url !== sourceUrl) return null;
  return entry.palette;
}
