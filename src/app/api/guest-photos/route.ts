// ─────────────────────────────────────────────────────────────
// Pearloom / api/guest-photos/route.ts
// Guest photo upload + public retrieval for the Photo Wall feature.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { addGuestPhoto, getGuestPhotos } from '@/lib/db';
import { encryptBuffer, isEncryptionEnabled } from '@/lib/crypto';

export const dynamic = 'force-dynamic';

const MAX_SIZE_MB = 10;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']);
const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif']);

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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get('siteId');

  if (!siteId) {
    return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
  }

  const photos = await getGuestPhotos(siteId, 'approved');
  return NextResponse.json({ photos });
}

export async function POST(req: NextRequest) {
  // Rate limit: 5 uploads per hour per IP
  const ip = getClientIp(req);
  const rateCheck = checkRateLimit(`guest-photos:${ip}`, { max: 5, windowMs: 60 * 60 * 1000 });
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Too many uploads — please wait a while and try again.' },
      { status: 429 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const siteId = formData.get('siteId') as string | null;
    const uploaderName = formData.get('uploaderName') as string | null;
    const caption = formData.get('caption') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    }
    if (!uploaderName?.trim()) {
      return NextResponse.json({ error: 'uploaderName is required' }, { status: 400 });
    }

    // iOS can report HEIC with empty or generic MIME — accept by extension fallback
    const rawExt = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ALLOWED_MIME_TYPES.has(file.type) && !ALLOWED_EXTENSIONS.has(rawExt)) {
      return NextResponse.json({ error: 'Only jpeg, png, webp, gif, and heic images are allowed' }, { status: 400 });
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json({ error: `File too large (max ${MAX_SIZE_MB}MB)` }, { status: 413 });
    }

    let ext = rawExt || 'jpg';
    if (ext === 'heic' || ext === 'heif') ext = 'jpg';

    const uuid = Math.random().toString(36).substring(2, 15);
    const filename = `guest-photos/${Date.now()}_${uuid}.${ext}`;

    const plaintext = Buffer.from(await file.arrayBuffer());
    const body = isEncryptionEnabled() ? encryptBuffer(plaintext) : plaintext;

    const r2 = getR2Client();
    const bucket = process.env.R2_BUCKET_NAME || 'pearloom-photos';

    let publicUrl: string;

    if (r2) {
      // Primary: Cloudflare R2 — encrypted, served via /api/img proxy
      await r2.send(new PutObjectCommand({
        Bucket: bucket,
        Key: filename,
        Body: body,
        ContentType: 'application/octet-stream',
        CacheControl: 'public, max-age=31536000, immutable',
      }));
      publicUrl = `/api/img/${filename}`;
    } else {
      // Fallback: Supabase Storage
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error('[guest-photos] No storage backend configured');
        return NextResponse.json({ error: 'Storage not configured — contact support' }, { status: 503 });
      }
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
      );

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(filename, plaintext, {
          contentType: file.type,
          cacheControl: '31536000',
          upsert: false,
        });

      if (uploadError) {
        console.error('[guest-photos] Supabase storage error:', uploadError);
        return NextResponse.json({ error: uploadError.message }, { status: 500 });
      }

      const { data: { publicUrl: supabaseUrl } } = supabase.storage.from('photos').getPublicUrl(filename);
      publicUrl = supabaseUrl;
    }

    const photo = await addGuestPhoto({
      siteId,
      uploaderName: uploaderName.trim(),
      url: publicUrl,
      thumbnailUrl: undefined,
      caption: caption?.trim() || undefined,
      status: 'pending',
    });

    if (!photo) {
      return NextResponse.json({ error: 'Failed to save photo metadata' }, { status: 500 });
    }

    return NextResponse.json({ success: true, photo });
  } catch (err) {
    console.error('[guest-photos] Unexpected error:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
