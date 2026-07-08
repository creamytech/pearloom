'use client';

/* ─── Photo focus — reframing a photo inside its slot ─────────────
   Every site photo renders object-fit: cover, and cover crops from
   the CENTER by default — a portrait in a landscape slot loses the
   subject's head (owner report, 2026-07-08). `manifest.photoFocus`
   stores a per-photo focal point (URL-keyed, 0–100 percentages for
   object-position) that the host sets by DRAGGING the photo in the
   editor (EditPhotoTarget's Reframe mode).

   Read path: ThemedSite wraps the site in <PhotoFocusProvider>;
   FadeInImage (the shared photo atom) asks usePhotoFocus(src) —
   so every slot honors the focal point on BOTH the editor canvas
   and the published site with zero per-variant wiring.

   data: URLs are never stored (a base64 key would bloat the
   manifest, and stripArtForStorage would orphan it anyway).
   ────────────────────────────────────────────────────────────── */

import { createContext, useContext, type ReactNode } from 'react';
import type { StoryManifest } from '@/types';

export interface PhotoFocus {
  /** object-position percentages, 0–100. 50/50 = centered. */
  x: number;
  y: number;
}
export type PhotoFocusMap = Record<string, PhotoFocus>;

const PhotoFocusContext = createContext<PhotoFocusMap | null>(null);

export function PhotoFocusProvider({ manifest, children }: { manifest: StoryManifest; children: ReactNode }) {
  const map = ((manifest as unknown as { photoFocus?: PhotoFocusMap }).photoFocus) ?? null;
  return <PhotoFocusContext.Provider value={map}>{children}</PhotoFocusContext.Provider>;
}

/** The stored object-position for a photo URL — undefined when the
 *  host never reframed it (atoms fall back to their own default). */
export function usePhotoFocus(src?: string): string | undefined {
  const map = useContext(PhotoFocusContext);
  if (!map || !src) return undefined;
  const f = map[src];
  return f ? `${f.x}% ${f.y}%` : undefined;
}

/** Dispatched by the canvas Reframe drag on release; EditorRedesign
 *  listens and writes manifest.photoFocus through the bridge. */
export const PHOTO_FOCUS_COMMIT_EVENT = 'pearloom:set-photo-focus';

export interface PhotoFocusCommitDetail {
  url: string;
  x: number;
  y: number;
}

export function commitPhotoFocus(detail: PhotoFocusCommitDetail) {
  try {
    window.dispatchEvent(new CustomEvent(PHOTO_FOCUS_COMMIT_EVENT, { detail }));
  } catch { /* SSR / detached */ }
}
