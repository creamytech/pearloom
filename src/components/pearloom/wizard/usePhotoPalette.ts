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
  const [palette, setPalette] = useState<ExtractedPalette | null>(null);
  // One-slot cache keyed by source URL — revisiting the Palette step
  // with the same photo never recomputes.
  const cacheRef = useRef<{ url: string; palette: ExtractedPalette | null } | null>(null);

  useEffect(() => {
    if (!enabled || !sourceUrl) return;
    if (cacheRef.current?.url === sourceUrl) {
      setPalette(cacheRef.current.palette);
      return;
    }
    let cancelled = false;
    void paletteFromImageUrl(sourceUrl).then((p) => {
      if (cancelled) return;
      cacheRef.current = { url: sourceUrl, palette: p };
      setPalette(p);
    });
    return () => {
      cancelled = true;
    };
  }, [sourceUrl, enabled]);

  // Never surface a palette computed for a different (or removed) photo.
  if (!sourceUrl || cacheRef.current?.url !== sourceUrl) return null;
  return palette;
}
