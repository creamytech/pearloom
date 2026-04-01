// ─────────────────────────────────────────────────────────────
// Pearloom / api/upload/route.ts
// Authenticated photo upload → Cloudflare R2 (AES-256-GCM encrypted).
// Falls back to Supabase Storage when R2 env vars are absent.
// Images are served via /api/img/<key> (decrypt-and-serve proxy).
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { encryptBuffer, isEncryptionEnabled } from '@/lib/crypto';

const MAX_SIZE_MB = 20;

// iOS Safari can report HEIC/HEIF files as '' or 'application/octet-stream'.
// We accept by extension in those cases.
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
  'image/gif', 'image/heic', 'image/heif',
]);
const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif']);

// Normalise extension and MIME for HEIC → stored as jpg since browsers can't render HEIC
function normalise(ext: string, mime: string): { ext: string; contentType: string } {
  const e = ext.toLowerCase();
  if (e === 'heic' || e === 'heif') return { ext: 'jpg', contentType: 'image/jpeg' };
  // For unknown/empty MIME types, derive from extension
  if (!mime || mime === 'application/octet-stream') {
    const derived: Record<string, string> = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
      webp: 'image/webp', gif: 'image/gif',
    };
    return { ext: e, contentType: derived[e] ?? 'image/jpeg' };
  }
  return { ext: e, contentType: mime };
}

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

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'You must be signed in to upload photos' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // iOS can send HEIC/HEIF with empty or generic MIME type — accept by extension too
    const rawExt = file.name.split('.').pop()?.toLowerCase() ?? '';
    const mimeOk = ALLOWED_MIME_TYPES.has(file.type);
    const extOk  = ALLOWED_EXTENSIONS.has(rawExt);
    if (!mimeOk && !extOk) {
      return NextResponse.json(
        { error: 'Only jpeg, png, webp, gif, and heic images are allowed' },
        { status: 400 },
      );
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json({ error: `File too large (max ${MAX_SIZE_MB}MB)` }, { status: 413 });
    }

    const { ext, contentType } = normalise(rawExt || 'jpg', file.type);
    const uuid = Math.random().toString(36).substring(2, 15);
    const filename = `${Date.now()}_${uuid}.${ext}`;

    const plaintext = Buffer.from(await file.arrayBuffer());
    const body = isEncryptionEnabled() ? encryptBuffer(plaintext) : plaintext;

    const r2 = getR2Client();
    const bucket = process.env.R2_BUCKET_NAME || 'pearloom-photos';

    if (r2) {
      // Primary: Cloudflare R2 — store encrypted blob, serve via /api/img proxy
      await r2.send(new PutObjectCommand({
        Bucket: bucket,
        Key: filename,
        Body: body,
        // Store as octet-stream — Content-Type is resolved by the proxy from the extension
        ContentType: 'application/octet-stream',
        CacheControl: 'public, max-age=31536000, immutable',
      }));

      return NextResponse.json({
        filename,
        publicUrl: `/api/img/${filename}`,
        originalName: file.name,
        mimeType: contentType,
        storage: 'r2',
      });
    }

    // Fallback: Supabase Storage (no encryption — Supabase encrypts at rest natively)
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[upload] No storage backend configured');
      return NextResponse.json({ error: 'Storage not configured — contact support' }, { status: 503 });
    }
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );

    const { error } = await supabase.storage
      .from('photos')
      .upload(filename, plaintext, {
        contentType,
        cacheControl: '31536000',
        upsert: false,
      });

    if (error) {
      console.error('[upload] Supabase storage error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(filename);
    return NextResponse.json({
      filename,
      publicUrl,
      originalName: file.name,
      mimeType: contentType,
      storage: 'supabase',
    });
  } catch (err) {
    console.error('[upload] Unexpected error:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
