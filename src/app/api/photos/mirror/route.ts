// ─────────────────────────────────────────────────────────────
// Pearloom / api/photos/mirror/route.ts
// Mirrors a Google Photos URL to permanent storage (R2 or Supabase).
// Called by the editor when photos are added to chapters so they
// survive beyond the ~1h Google CDN expiry window.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

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
  if (!session?.user?.email || !session.accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { url, subdomain, key } = await req.json();
  if (!url || !subdomain || !key) {
    return NextResponse.json({ error: 'Missing url, subdomain, or key' }, { status: 400 });
  }

  // Only mirror Google Photos URLs
  if (!url.includes('googleusercontent.com')) {
    return NextResponse.json({ permanentUrl: url });
  }

  try {
    // Fetch image using OAuth token
    const sizedUrl = url.includes('=') ? url : `${url}=w1600-h1200`;
    const photoRes = await fetch(sizedUrl, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });
    if (!photoRes.ok) {
      return NextResponse.json({ error: `Google returned ${photoRes.status}` }, { status: 502 });
    }

    const buffer = await photoRes.arrayBuffer();
    const contentType = photoRes.headers.get('content-type') || 'image/jpeg';
    const ext = contentType.includes('png') ? 'png' : 'jpg';
    const path = `sites/${subdomain}/${key}.${ext}`;

    // Primary: R2
    const r2 = getR2Client();
    const r2Bucket = process.env.R2_BUCKET_NAME || 'pearloom-photos';
    const r2PublicBase = process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.replace(/\/$/, '');

    if (r2 && r2PublicBase) {
      await r2.send(new PutObjectCommand({
        Bucket: r2Bucket,
        Key: path,
        Body: Buffer.from(buffer),
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      }));
      return NextResponse.json({ permanentUrl: `${r2PublicBase}/${path}` });
    }

    // Fallback: Supabase Storage
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && serviceKey) {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, serviceKey);
      const { error } = await supabase.storage
        .from('photos')
        .upload(path, buffer, { contentType, upsert: true, cacheControl: '31536000' });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(path);
      return NextResponse.json({ permanentUrl: publicUrl });
    }

    // No storage configured — return the original URL (will expire)
    return NextResponse.json({ permanentUrl: url, warning: 'No permanent storage configured' });
  } catch (err) {
    console.error('[Mirror] Error:', err);
    return NextResponse.json({ error: 'Failed to mirror photo' }, { status: 500 });
  }
}
