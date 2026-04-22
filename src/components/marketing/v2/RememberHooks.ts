'use client';

// Real data hooks for the Remember page.

import { useEffect, useMemo, useRef, useState } from 'react';
import type { StoryManifest, Chapter, ChapterImage } from '@/types';

export interface FlatPhoto {
  url: string;
  caption?: string;
  chapterId: string;
}

export function flattenPhotos(manifest: StoryManifest | null | undefined): FlatPhoto[] {
  if (!manifest) return [];
  const out: FlatPhoto[] = [];
  for (const ch of manifest.chapters ?? []) {
    for (const img of (ch.images ?? []) as ChapterImage[]) {
      if (!img?.url) continue;
      out.push({
        url: img.url,
        caption: img.caption ?? undefined,
        chapterId: ch.id,
      });
    }
  }
  // Cover + hero slideshow join the pool
  if (manifest.coverPhoto) {
    out.unshift({ url: manifest.coverPhoto, chapterId: 'cover' });
  }
  for (const u of manifest.heroSlideshow ?? []) {
    if (u) out.push({ url: u, chapterId: 'hero' });
  }
  return out;
}

export function findVowsChapter(manifest: StoryManifest | null | undefined): Chapter | null {
  if (!manifest) return null;
  for (const ch of manifest.chapters ?? []) {
    const t = (ch.title ?? '').toLowerCase();
    if (t.includes('vow') || t.includes('promise') || t.includes('ceremony')) return ch;
  }
  return null;
}

export interface RememberCounts {
  video: number;
  toasts: number;
  photos: number;
  vows: number;
  speeches: number;
  details: number;
}

export function useRememberCounts(
  manifest: StoryManifest | null | undefined,
  toastsLength: number,
): RememberCounts {
  return useMemo(() => {
    const photos = flattenPhotos(manifest).length;
    const vowsChapter = findVowsChapter(manifest);
    return {
      video: manifest?.heroSlideshow?.length ?? 0,
      toasts: toastsLength,
      photos,
      vows: vowsChapter ? 1 : 0,
      speeches: manifest?.chapters?.filter((c) => /speech|toast|reading/i.test(c.title ?? ''))
        .length ?? 0,
      details: Object.keys(manifest?.logistics ?? {}).length,
    };
  }, [manifest, toastsLength]);
}

export interface TimeCapsule {
  id: string;
  message?: string;
  open_at?: string | null;
  recipients?: string[];
}

export function useTimeCapsules(siteId?: string | null) {
  const [items, setItems] = useState<TimeCapsule[]>([]);
  const [loading, setLoading] = useState(true);
  const ref = useRef(0);

  useEffect(() => {
    if (!siteId) {
      setItems([]);
      setLoading(false);
      return;
    }
    const id = ++ref.current;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/time-capsule?siteId=${encodeURIComponent(siteId)}`,
          { cache: 'no-store' },
        );
        if (ref.current !== id) return;
        if (!res.ok) {
          setItems([]);
        } else {
          const data = await res.json();
          setItems(Array.isArray(data.items) ? data.items : []);
        }
      } catch {
        if (ref.current === id) setItems([]);
      } finally {
        if (ref.current === id) setLoading(false);
      }
    })();
  }, [siteId]);

  return { items, loading };
}
