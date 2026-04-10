// ─────────────────────────────────────────────────────────────
// Pearloom / lib/mirror-photos.ts
// Server-only helper that mirrors Google Photos baseUrls to
// permanent storage (R2 primary, Supabase Storage fallback).
//
// Google Photos Picker baseUrls expire within ~1 hour, so any
// URL we persist to the DB must first be mirrored; otherwise
// dashboard thumbnails and published sites hit 403 when the
// token expires.
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

/**
 * Mirror a single Google Photos URL to permanent storage.
 * Returns the permanent URL on success or `null` if mirroring failed.
 */
async function mirrorOne(
  ctx: MirrorContext,
  rawUrl: string,
  pathKey: string
): Promise<string | null> {
  try {
    // Picker baseUrls need a size directive; passthrough if already sized.
    const sizedUrl = rawUrl.includes('=w') || rawUrl.includes('=h')
      ? rawUrl
      : `${rawUrl}=w1600-h1200-c`;

    const photoRes = await fetch(sizedUrl, {
      headers: { Authorization: `Bearer ${ctx.accessToken}` },
    });
    if (!photoRes.ok) {
      // 403 / 401 means the baseUrl or token has expired — common for old drafts.
      // Silently skip so the caller can fall back gracefully.
      return null;
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
        return null;
      }
      const { data: { publicUrl } } = ctx.supabase.storage.from('photos').getPublicUrl(path);
      return publicUrl;
    }

    return null;
  } catch (err) {
    console.warn(`[mirror] Exception mirroring ${pathKey}:`, err);
    return null;
  }
}

/**
 * Full mirror pass — walks every chapter image + `coverPhoto` and replaces
 * Google URLs with permanent ones. Used on publish.
 */
export async function mirrorManifestPhotos(
  manifest: StoryManifest,
  accessToken: string,
  subdomain: string
): Promise<StoryManifest> {
  const r2 = getR2Client();
  const r2Bucket = process.env.R2_BUCKET_NAME || 'pearloom-photos';
  const r2PublicBase = process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.replace(/\/$/, '');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const hasR2 = !!(r2 && r2PublicBase);
  const hasSupabase = !!(supabaseUrl && serviceKey);
  if (!hasR2 && !hasSupabase) {
    console.warn('[mirror] No storage backend configured — skipping mirror');
    return manifest;
  }

  const ctx: MirrorContext = {
    r2,
    r2Bucket,
    r2PublicBase,
    supabase: hasSupabase ? createClient(supabaseUrl!, serviceKey!) : null,
    accessToken,
    subdomain,
  };

  const limit = pLimit(5);

  const updatedChapters = await Promise.all(
    (manifest.chapters || []).map(async (chapter, ci) => {
      const updatedImages = await Promise.all(
        (chapter.images || []).map((img, ii) => limit(async () => {
          if (!img.url || !img.url.includes('googleusercontent.com')) return img;
          const mirrored = await mirrorOne(ctx, img.url, `ch${ci}-img${ii}`);
          return mirrored ? { ...img, url: mirrored } : img;
        }))
      );
      return { ...chapter, images: updatedImages };
    })
  );

  let updatedCover = manifest.coverPhoto;
  if (updatedCover && updatedCover.includes('googleusercontent.com')) {
    const mirrored = await mirrorOne(ctx, updatedCover, 'cover');
    if (mirrored) updatedCover = mirrored;
  }

  return { ...manifest, chapters: updatedChapters, coverPhoto: updatedCover };
}

/**
 * Lightweight mirror — only the first chapter cover and `coverPhoto`.
 * Used on draft saves so dashboard thumbnails never rot, without paying
 * the cost of mirroring every chapter photo on every autosave.
 */
export async function mirrorDraftThumbnails(
  manifest: StoryManifest,
  accessToken: string,
  subdomain: string
): Promise<StoryManifest> {
  const r2 = getR2Client();
  const r2Bucket = process.env.R2_BUCKET_NAME || 'pearloom-photos';
  const r2PublicBase = process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.replace(/\/$/, '');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const hasR2 = !!(r2 && r2PublicBase);
  const hasSupabase = !!(supabaseUrl && serviceKey);
  if (!hasR2 && !hasSupabase) return manifest;

  const ctx: MirrorContext = {
    r2,
    r2Bucket,
    r2PublicBase,
    supabase: hasSupabase ? createClient(supabaseUrl!, serviceKey!) : null,
    accessToken,
    subdomain,
  };

  // Mirror only what the dashboard thumbnail grabs: coverPhoto (if set) or
  // the first chapter's first image.
  let updatedCover = manifest.coverPhoto;
  let updatedChapters = manifest.chapters;

  if (updatedCover && updatedCover.includes('googleusercontent.com')) {
    const mirrored = await mirrorOne(ctx, updatedCover, 'cover');
    if (mirrored) updatedCover = mirrored;
  }

  const firstChapterFirstImage = manifest.chapters?.[0]?.images?.[0];
  if (
    firstChapterFirstImage?.url &&
    firstChapterFirstImage.url.includes('googleusercontent.com')
  ) {
    const mirrored = await mirrorOne(ctx, firstChapterFirstImage.url, 'ch0-img0');
    if (mirrored && manifest.chapters) {
      updatedChapters = manifest.chapters.map((ch, ci) => {
        if (ci !== 0 || !ch.images?.length) return ch;
        const images = ch.images.map((img, ii) =>
          ii === 0 ? { ...img, url: mirrored } : img
        );
        return { ...ch, images };
      });
    }
  }

  return { ...manifest, chapters: updatedChapters, coverPhoto: updatedCover };
}
