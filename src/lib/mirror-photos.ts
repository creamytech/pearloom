// ─────────────────────────────────────────────────────────────
// Pearloom / lib/mirror-photos.ts
// Server-only helper that mirrors Google Photos baseUrls to
// permanent storage (R2 primary, Supabase Storage fallback).
//
// Google Photos Picker baseUrls expire within ~1 hour, so any
// URL we persist to the DB must first be mirrored; otherwise
// dashboard thumbnails, hero images, and published sites hit 403
// when the picker token expires.
//
// This module walks EVERY photo field on a StoryManifest:
//   • manifest.coverPhoto
//   • manifest.heroSlideshow[]
//   • manifest.chapters[*].images[*]
//
// It also transparently unwraps `/api/photos/proxy?url=<...>`
// wrappers that the wizard uses for live-preview images — the
// wrapper points at an ephemeral session token, so persisting the
// wrapper itself leaves dead links in the DB.
// ─────────────────────────────────────────────────────────────

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';
import pLimit from 'p-limit';
import type { StoryManifest } from '@/types';

function getR2Client() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) return null;
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

interface MirrorContext {
  r2: ReturnType<typeof getR2Client>;
  r2Bucket: string;
  r2PublicBase: string | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
  accessToken: string;
  subdomain: string;
}

// ── URL helpers ───────────────────────────────────────────────

/**
 * Unwrap a `/api/photos/proxy?url=<encoded>&w=...&h=...` wrapper
 * and return the inner URL. Returns the input unchanged if it isn't
 * a proxy URL.
 *
 * The wizard pipes googleusercontent URLs through the proxy during
 * the authoring session so the browser can authenticate with the
 * user's OAuth token, but the inner URL is the canonical reference
 * and the only thing worth persisting or mirroring.
 */
export function unwrapProxyUrl(url: string): string {
  if (!url || typeof url !== 'string') return url;
  if (!url.includes('/api/photos/proxy')) return url;
  try {
    // Works for both absolute and relative forms of the proxy URL.
    const u = new URL(url, 'http://localhost');
    const inner = u.searchParams.get('url');
    return inner || url;
  } catch {
    return url;
  }
}

/**
 * Returns true when a URL is a googleusercontent.com picker URL,
 * INCLUDING when it's wrapped in `/api/photos/proxy?url=...`.
 */
function isExpiringGoogleUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  const inner = unwrapProxyUrl(url);
  return inner.includes('googleusercontent.com') || inner.includes('lh3.google');
}

/**
 * Mirror a single URL (proxy-wrapped or raw) to permanent storage.
 * Returns the permanent URL on success or the original URL if the
 * mirror couldn't be done (no storage configured, photo 403, etc.).
 * Non-google URLs and already-permanent URLs are passed through.
 */
async function mirrorOne(
  ctx: MirrorContext,
  rawUrl: string,
  pathKey: string,
): Promise<string> {
  if (!rawUrl) return rawUrl;
  const inner = unwrapProxyUrl(rawUrl);

  // Only mirror expiring google URLs — everything else is already
  // either permanent or a data URL.
  if (!inner.includes('googleusercontent.com') && !inner.includes('lh3.google')) {
    return inner;
  }

  try {
    // Picker baseUrls need a size directive; passthrough if already sized.
    const sizedUrl = inner.includes('=w') || inner.includes('=h')
      ? inner
      : `${inner}=w1600-h1200-c`;

    const photoRes = await fetch(sizedUrl, {
      headers: { Authorization: `Bearer ${ctx.accessToken}` },
    });
    if (!photoRes.ok) {
      // 403/401 means the baseUrl or token has expired — return the
      // inner URL so the DB at least keeps a meaningful pointer (the
      // wrapper pointing at an expired token is worse than nothing).
      return inner;
    }

    const buffer = await photoRes.arrayBuffer();
    const contentType = photoRes.headers.get('content-type') || 'image/jpeg';
    const ext = contentType.includes('png') ? 'png' : 'jpg';
    const path = `sites/${ctx.subdomain}/${pathKey}.${ext}`;

    if (ctx.r2 && ctx.r2PublicBase) {
      try {
        await ctx.r2.send(new PutObjectCommand({
          Bucket: ctx.r2Bucket,
          Key: path,
          Body: Buffer.from(buffer),
          ContentType: contentType,
          CacheControl: 'public, max-age=31536000, immutable',
        }));
        return `${ctx.r2PublicBase}/${path}`;
      } catch (err) {
        console.warn(`[mirror] R2 upload failed for ${path}, trying Supabase:`, err);
      }
    }

    if (ctx.supabase) {
      const { error } = await ctx.supabase.storage
        .from('photos')
        .upload(path, buffer, {
          contentType,
          upsert: true,
          cacheControl: '31536000',
        });
      if (error) {
        console.warn(`[mirror] Supabase upload failed for ${path}:`, error.message);
        return inner;
      }
      const { data: { publicUrl } } = ctx.supabase.storage.from('photos').getPublicUrl(path);
      return publicUrl;
    }

    return inner;
  } catch (err) {
    console.warn(`[mirror] Exception mirroring ${pathKey}:`, err);
    return inner;
  }
}

function buildContext(accessToken: string, subdomain: string): MirrorContext | null {
  const r2 = getR2Client();
  const r2Bucket = process.env.R2_BUCKET_NAME || 'pearloom-photos';
  const r2PublicBase = process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.replace(/\/$/, '');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const hasR2 = !!(r2 && r2PublicBase);
  const hasSupabase = !!(supabaseUrl && serviceKey);
  if (!hasR2 && !hasSupabase) {
    console.warn('[mirror] No storage backend configured — skipping mirror');
    return null;
  }

  return {
    r2,
    r2Bucket,
    r2PublicBase,
    supabase: hasSupabase ? createClient(supabaseUrl!, serviceKey!) : null,
    accessToken,
    subdomain,
  };
}

// ── Public API ────────────────────────────────────────────────

/**
 * Full mirror pass — walks every chapter image, `coverPhoto`, and
 * `heroSlideshow[*]` and replaces proxy-wrapped or expiring Google
 * URLs with permanent ones. Used on publish AND draft save.
 */
export async function mirrorManifestPhotos(
  manifest: StoryManifest,
  accessToken: string,
  subdomain: string,
): Promise<StoryManifest> {
  const ctx = buildContext(accessToken, subdomain);
  if (!ctx) return stripProxyUrls(manifest);

  const limit = pLimit(5);

  // Mirror all chapter images. Each slot gets a stable path so
  // re-saves idempotently overwrite the same R2 object.
  const updatedChapters = await Promise.all(
    (manifest.chapters || []).map(async (chapter, ci) => {
      if (!chapter.images?.length) return chapter;
      const updatedImages = await Promise.all(
        chapter.images.map((img, ii) => limit(async () => {
          if (!isExpiringGoogleUrl(img.url)) {
            // Already permanent — but still unwrap any proxy wrapper.
            return { ...img, url: unwrapProxyUrl(img.url) };
          }
          const permanent = await mirrorOne(ctx, img.url, `ch${ci}-img${ii}`);
          return { ...img, url: permanent };
        })),
      );
      return { ...chapter, images: updatedImages };
    }),
  );

  // Mirror coverPhoto (if expiring) and heroSlideshow (always walk).
  let updatedCover = manifest.coverPhoto;
  if (updatedCover && isExpiringGoogleUrl(updatedCover)) {
    updatedCover = await mirrorOne(ctx, updatedCover, 'cover');
  } else if (updatedCover) {
    updatedCover = unwrapProxyUrl(updatedCover);
  }

  let updatedHeroSlideshow = manifest.heroSlideshow;
  if (updatedHeroSlideshow && updatedHeroSlideshow.length > 0) {
    updatedHeroSlideshow = await Promise.all(
      updatedHeroSlideshow.map((url, i) => limit(async () => {
        if (!isExpiringGoogleUrl(url)) return unwrapProxyUrl(url);
        return mirrorOne(ctx, url, `hero-${i}`);
      })),
    );
  }

  return {
    ...manifest,
    chapters: updatedChapters,
    coverPhoto: updatedCover,
    heroSlideshow: updatedHeroSlideshow,
  };
}

/**
 * Lightweight mirror — only the fields the dashboard thumbnail
 * grid reads (coverPhoto + first chapter first image + first
 * heroSlideshow entry). Used on draft save so the first autosave
 * already has permanent thumbnails, even before publish.
 *
 * This helper also unwraps any `/api/photos/proxy` wrapper on
 * every photo URL in the manifest so the DB never holds a proxy
 * URL, even for photos we don't actively mirror.
 */
export async function mirrorDraftThumbnails(
  manifest: StoryManifest,
  accessToken: string,
  subdomain: string,
): Promise<StoryManifest> {
  const ctx = buildContext(accessToken, subdomain);
  // We still unwrap proxy URLs even when no storage backend is
  // configured so the DB never holds a wrapper pointing at an
  // ephemeral session token.
  const base = stripProxyUrls(manifest);
  if (!ctx) return base;

  // Cover photo
  let updatedCover = base.coverPhoto;
  if (updatedCover && isExpiringGoogleUrl(updatedCover)) {
    updatedCover = await mirrorOne(ctx, updatedCover, 'cover');
  }

  // First chapter first image — picked up by user-sites thumbnails
  let updatedChapters = base.chapters;
  const firstChapterFirstImage = base.chapters?.[0]?.images?.[0];
  if (
    firstChapterFirstImage?.url &&
    isExpiringGoogleUrl(firstChapterFirstImage.url) &&
    base.chapters
  ) {
    const mirrored = await mirrorOne(ctx, firstChapterFirstImage.url, 'ch0-img0');
    updatedChapters = base.chapters.map((ch, ci) => {
      if (ci !== 0 || !ch.images?.length) return ch;
      const images = ch.images.map((img, ii) =>
        ii === 0 ? { ...img, url: mirrored } : img,
      );
      return { ...ch, images };
    });
  }

  // First heroSlideshow entry — visible on the hero before the
  // slideshow starts cycling so it's worth mirroring up front.
  let updatedHeroSlideshow = base.heroSlideshow;
  if (updatedHeroSlideshow && updatedHeroSlideshow.length > 0) {
    const first = updatedHeroSlideshow[0];
    if (isExpiringGoogleUrl(first)) {
      const mirrored = await mirrorOne(ctx, first, 'hero-0');
      updatedHeroSlideshow = [mirrored, ...updatedHeroSlideshow.slice(1)];
    }
  }

  return {
    ...base,
    chapters: updatedChapters,
    coverPhoto: updatedCover,
    heroSlideshow: updatedHeroSlideshow,
  };
}

/**
 * Walk every photo URL on a manifest and unwrap any
 * `/api/photos/proxy` wrapper, leaving the raw underlying URL.
 * This is a pure, sync transform — no network calls — and is safe
 * to run whenever the DB shouldn't hold proxy wrappers (e.g. draft
 * save paths where we know the wrapper is scoped to the current
 * editing session).
 */
export function stripProxyUrls(manifest: StoryManifest): StoryManifest {
  const chapters = (manifest.chapters || []).map((ch) => {
    if (!ch.images?.length) return ch;
    const images = ch.images.map((img) => ({
      ...img,
      url: unwrapProxyUrl(img.url),
    }));
    return { ...ch, images };
  });

  return {
    ...manifest,
    chapters,
    coverPhoto: manifest.coverPhoto ? unwrapProxyUrl(manifest.coverPhoto) : manifest.coverPhoto,
    heroSlideshow: manifest.heroSlideshow
      ? manifest.heroSlideshow.map(unwrapProxyUrl)
      : manifest.heroSlideshow,
  };
}
