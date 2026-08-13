// ─────────────────────────────────────────────────────────────
// Pearloom / api/img/[...slug]/route.ts
// Decrypt-and-serve proxy for encrypted R2 images.
// All images uploaded after encryption was enabled are stored as
// AES-256-GCM ciphertext. This route fetches from the private R2
// bucket, decrypts, and serves with the correct Content-Type.
// Legacy unencrypted files are served as-is (graceful fallback).
//
// URL: /api/img/<key>   e.g. /api/img/chapters/2025_abc.jpg
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { decryptBuffer, isEncryptionEnabled } from '@/lib/crypto';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/heic',
  heif: 'image/heif',
  svg: 'image/svg+xml',
  avif: 'image/avif',
};

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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const ip = getClientIp(_req);
  const rl = checkRateLimit(`img-proxy:${ip}`, { max: 60, windowMs: 60 * 1000 });
  if (!rl.allowed) {
    return new NextResponse('Too many requests', { status: 429 });
  }

  const { slug } = await params;
  const key = slug.join('/');

  const r2 = getR2Client();
  if (!r2) {
    return new NextResponse('Storage not configured', { status: 503 });
  }

  const bucket = process.env.R2_BUCKET_NAME || 'pearloom-photos';

  try {
    const res = await r2.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!res.Body) return new NextResponse('Not found', { status: 404 });

    // Stream entire body into a buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of res.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    const raw = Buffer.concat(chunks);

    // Attempt decryption — fall back for legacy unencrypted files
    let body: Buffer;
    if (isEncryptionEnabled()) {
      try {
        body = decryptBuffer(raw);
      } catch {
        // Pre-encryption legacy file — serve raw bytes
        body = raw;
      }
    } else {
      body = raw;
    }

    const ext = key.split('.').pop()?.toLowerCase() ?? 'jpg';
    const contentType = MIME_BY_EXT[ext] ?? 'image/jpeg';

    return new NextResponse(body.buffer as ArrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': String(body.length),
      },
    });
  } catch (err: unknown) {
    const name = (err as { name?: string }).name;
    if (name === 'NoSuchKey' || name === 'NotFound') {
      return new NextResponse('Not found', { status: 404 });
    }
    console.error('[img proxy] Error fetching/decrypting:', key, err);
    return new NextResponse('Internal error', { status: 500 });
  }
}
