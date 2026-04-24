// ─────────────────────────────────────────────────────────────
// Pearloom / api/photos/upload/route.ts
//
// Direct photo upload for the Pear wizard. Accepts base64 image
// data from the drag-and-drop zone, uploads each photo to R2
// (or Supabase Storage as a fallback), and returns a
// GooglePhotoMetadata-shaped object so the rest of the wizard
// pipeline (clustering, generation, mirror) works without
// changes.
//
// Why base64 instead of multipart/form-data: Next.js API routes
// make multipart annoying without a body parser, and the
// wizard already has the bytes in memory (read by FileReader
// for the live preview), so base64 over JSON is the simplest
// path that doesn't add dependencies.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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

const MAX_PHOTOS_PER_REQUEST = 25;
const MAX_BYTES_PER_PHOTO = 12 * 1024 * 1024; // 12 MB

interface UploadPayload {
  id: string;
  filename: string;
  mimeType: string;
  /**
   * Base64-encoded image bytes — can be a full data URL
   * (`data:image/jpeg;base64,…`) or a raw base64 string.
   */
  base64: string;
  /**
   * Original capture time from `file.lastModified` if the
   * browser exposed it. ISO 8601. Falls back to request time.
   */
  capturedAt?: string;
  /** Image dimensions if the client measured them. */
  width?: number;
  height?: number;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { photos?: UploadPayload[] } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const photos = Array.isArray(body.photos) ? body.photos : [];
  if (photos.length === 0) {
    return NextResponse.json({ error: 'No photos provided' }, { status: 400 });
  }
  if (photos.length > MAX_PHOTOS_PER_REQUEST) {
    return NextResponse.json(
      { error: `Too many photos — max ${MAX_PHOTOS_PER_REQUEST} per upload.` },
      { status: 400 },
    );
  }

  // ── Resolve a storage backend ────────────────────────────────
  const r2 = getR2Client();
  const r2Bucket = process.env.R2_BUCKET_NAME || 'pearloom-photos';
  const r2PublicBase = process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.replace(/\/$/, '');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase =
    supabaseUrl && serviceKey ? createClient(supabaseUrl, serviceKey) : null;

  const hasR2 = !!(r2 && r2PublicBase);
  if (!hasR2 && !supabase) {
    return NextResponse.json(
      { error: 'Photo storage is not configured on this server.' },
      { status: 500 },
    );
  }

  // Each upload gets a stable subfolder per user + session so
  // re-uploads don't collide with anything else in the bucket.
  const userSlug = (session.user.email || 'anon')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 48);
  const sessionSlug = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  // ── Upload each photo in parallel (capped concurrency) ──────
  const uploaded = await Promise.all(
    photos.map(async (p, idx): Promise<
      | { ok: true; photo: UploadedPhoto }
      | { ok: false; error: string; index: number }
    > => {
      try {
        if (!p.base64 || typeof p.base64 !== 'string') {
          return { ok: false, error: 'Missing base64 data', index: idx };
        }

        // Strip `data:image/jpeg;base64,` prefix if present.
        const commaIdx = p.base64.indexOf(',');
        const rawB64 =
          commaIdx > -1 && p.base64.startsWith('data:')
            ? p.base64.slice(commaIdx + 1)
            : p.base64;

        const buffer = Buffer.from(rawB64, 'base64');
        if (buffer.length === 0) {
          return { ok: false, error: 'Empty photo', index: idx };
        }
        if (buffer.length > MAX_BYTES_PER_PHOTO) {
          return {
            ok: false,
            error: `Photo ${p.filename || idx + 1} is too large (max ${MAX_BYTES_PER_PHOTO / (1024 * 1024)} MB).`,
            index: idx,
          };
        }

        const mimeType = p.mimeType || 'image/jpeg';
        const ext = extFromMime(mimeType);
        const safeId = (p.id || `photo-${idx}`).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
        const path = `uploads/${userSlug}/${sessionSlug}/${safeId}.${ext}`;

        let publicUrl: string | null = null;

        // Primary: R2
        if (hasR2) {
          try {
            await r2!.send(
              new PutObjectCommand({
                Bucket: r2Bucket,
                Key: path,
                Body: buffer,
                ContentType: mimeType,
                CacheControl: 'public, max-age=31536000, immutable',
              }),
            );
            publicUrl = `${r2PublicBase}/${path}`;
          } catch (err) {
            console.warn(`[upload] R2 upload failed for ${path}:`, err);
          }
        }

        // Fallback: Supabase Storage
        if (!publicUrl && supabase) {
          const { error } = await supabase.storage
            .from('photos')
            .upload(path, buffer, {
              contentType: mimeType,
              upsert: true,
              cacheControl: '31536000',
            });
          if (error) {
            return { ok: false, error: error.message, index: idx };
          }
          publicUrl = supabase.storage.from('photos').getPublicUrl(path).data.publicUrl;
        }

        if (!publicUrl) {
          return { ok: false, error: 'Upload failed', index: idx };
        }

        // GooglePhotoMetadata-compatible shape so the rest of the
        // pipeline (clustering, generation) treats these the same
        // as Picker API photos.
        return {
          ok: true,
          photo: {
            id: safeId,
            filename: p.filename || `upload-${idx}.${ext}`,
            mimeType,
            creationTime: isoOrNow(p.capturedAt),
            width: clampDim(p.width),
            height: clampDim(p.height),
            baseUrl: publicUrl,
            // description stays empty — user will fill it in on
            // the photo-review step if they want.
            description: '',
          },
        };
      } catch (err) {
        console.error(`[upload] Exception at index ${idx}:`, err);
        return { ok: false, error: 'Upload failed', index: idx };
      }
    }),
  );

  const successes = uploaded.filter((r): r is { ok: true; photo: UploadedPhoto } => r.ok);
  const failures = uploaded
    .filter((r): r is { ok: false; error: string; index: number } => !r.ok)
    .map((r) => ({ index: r.index, error: r.error }));

  // Also persist every successful upload to the user's media library
  // so it's available in the Gallery and the editor's photo picker
  // without another explicit save step. Source flag tells us where
  // the upload came from (wizard/editor/invite) — handy for filtering.
  try {
    const sourceTag: string = (() => {
      const raw = (body as { source?: string }).source;
      if (typeof raw === 'string' && ['upload', 'wizard', 'editor', 'invite'].includes(raw)) return raw;
      return 'upload';
    })();
    const siteId = (body as { siteId?: string }).siteId ?? null;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key && successes.length > 0) {
      const db = createClient(url, key);
      await db.from('user_media').insert(
        successes.map((s) => ({
          owner_email: session.user!.email!,
          url: s.photo.baseUrl,
          width: s.photo.width || null,
          height: s.photo.height || null,
          mime_type: s.photo.mimeType,
          filename: s.photo.filename,
          taken_at: s.photo.creationTime || null,
          source: sourceTag,
          source_site_id: siteId,
        })),
      );
    }
  } catch (err) {
    // Library persistence is non-fatal — the upload still succeeds.
    console.warn('[upload] user_media persist failed (non-fatal):', err);
  }

  return NextResponse.json({
    photos: successes.map((s) => s.photo),
    failures,
  });
}

interface UploadedPhoto {
  id: string;
  filename: string;
  mimeType: string;
  creationTime: string;
  width: number;
  height: number;
  baseUrl: string;
  description: string;
}

function extFromMime(mime: string): string {
  if (!mime) return 'jpg';
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('heic') || mime.includes('heif')) return 'heic';
  if (mime.includes('gif')) return 'gif';
  return 'jpg';
}

function isoOrNow(maybeIso: string | undefined): string {
  if (!maybeIso) return new Date().toISOString();
  try {
    const d = new Date(maybeIso);
    if (Number.isNaN(d.getTime())) return new Date().toISOString();
    return d.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

function clampDim(n: number | undefined): number {
  if (!n || typeof n !== 'number' || !Number.isFinite(n)) return 1200;
  return Math.max(1, Math.min(10_000, Math.round(n)));
}
