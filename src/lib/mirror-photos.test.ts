// Regression tests for the manifest photo walkers — specifically the
// galleryImages walk added 2026-07-09 after Google-picked gallery
// photos rotted (expiring baseUrls persisted raw) while the mirrored
// coverPhoto survived. Without R2/Supabase env, mirrorManifestPhotos
// falls through to stripProxyUrls, so both paths are covered here
// without network.

import { beforeAll, describe, expect, it } from 'vitest';
import { mirrorManifestPhotos, stripProxyUrls, unwrapProxyUrl } from './mirror-photos';
import type { StoryManifest } from '@/types';

// Force the no-storage fallback path regardless of the runner's env —
// these tests must never reach for R2/Supabase.
beforeAll(() => {
  delete process.env.CLOUDFLARE_ACCOUNT_ID;
  delete process.env.R2_ACCESS_KEY_ID;
  delete process.env.R2_SECRET_ACCESS_KEY;
  delete process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

const PROXIED =
  '/api/photos/proxy?url=' +
  encodeURIComponent('https://lh3.googleusercontent.com/abc123=w2048') +
  '&w=1200';

function manifestWith(gallery: string[]): StoryManifest {
  return {
    coverPhoto: PROXIED,
    galleryImages: gallery,
    galleryCaptions: { '0': 'First dance', '2': 'The toast' },
  } as unknown as StoryManifest;
}

describe('stripProxyUrls · galleryImages', () => {
  it('unwraps proxy wrappers in galleryImages, index-stable', () => {
    const out = stripProxyUrls(manifestWith([PROXIED, 'https://cdn.example.com/keep.jpg', PROXIED]));
    const gallery = (out as unknown as { galleryImages: string[] }).galleryImages;
    expect(gallery).toHaveLength(3);
    expect(gallery[0]).toBe('https://lh3.googleusercontent.com/abc123=w2048');
    expect(gallery[1]).toBe('https://cdn.example.com/keep.jpg');
    expect(gallery[2]).toBe(gallery[0]);
    // Index-keyed captions must still point at the same slots.
    expect((out as unknown as { galleryCaptions: Record<string, string> }).galleryCaptions).toEqual({
      '0': 'First dance',
      '2': 'The toast',
    });
  });

  it('leaves manifests without galleryImages untouched', () => {
    const out = stripProxyUrls({ coverPhoto: PROXIED } as unknown as StoryManifest);
    expect((out as unknown as { galleryImages?: string[] }).galleryImages).toBeUndefined();
    expect(out.coverPhoto).toBe('https://lh3.googleusercontent.com/abc123=w2048');
  });
});

describe('mirrorManifestPhotos · galleryImages (no storage env → strip path)', () => {
  it('walks galleryImages on the fallback path too', async () => {
    const out = await mirrorManifestPhotos(manifestWith([PROXIED]), 'token', 'test-site');
    const gallery = (out as unknown as { galleryImages: string[] }).galleryImages;
    expect(gallery[0]).toBe('https://lh3.googleusercontent.com/abc123=w2048');
  });
});

describe('unwrapProxyUrl', () => {
  it('returns non-proxy URLs unchanged', () => {
    expect(unwrapProxyUrl('https://r2.example.com/x.jpg')).toBe('https://r2.example.com/x.jpg');
  });
});
