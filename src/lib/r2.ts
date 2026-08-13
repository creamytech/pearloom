// ─────────────────────────────────────────────────────────────
// Pearloom / lib/r2.ts
// Cloudflare R2 storage utility — upload files and SVGs,
// retrieve public URLs. Uses lazy-init S3-compatible client.
// ─────────────────────────────────────────────────────────────

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { env } from '@/lib/env';

// Lazy-init singleton — avoids creating the client at import time
// (which would throw if env vars aren't set yet).
let client: S3Client | null = null;

function getR2Client(): S3Client {
  if (client) return client;

  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = env.R2_ACCESS_KEY_ID;
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      '[r2] Missing R2 credentials. Set CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY.',
    );
  }

  client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  return client;
}

/**
 * Get the public URL for a given R2 object key.
 */
export function getR2Url(key: string): string {
  const publicUrl = env.R2_PUBLIC_URL;
  if (!publicUrl) {
    throw new Error('[r2] NEXT_PUBLIC_R2_PUBLIC_URL is not configured.');
  }
  // Ensure no double-slash between base URL and key
  const base = publicUrl.replace(/\/$/, '');
  return `${base}/${key}`;
}

/**
 * Upload a file (Buffer or string) to R2.
 * Returns the public URL of the uploaded object.
 */
export async function uploadToR2(
  key: string,
  body: Buffer | string,
  contentType: string,
): Promise<string> {
  const r2 = getR2Client();
  const bucket = env.R2_BUCKET_NAME || 'pearloom-assets';

  await r2.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: typeof body === 'string' ? Buffer.from(body, 'utf-8') : body,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );

  return getR2Url(key);
}

/**
 * Upload an SVG string to R2.
 * Convenience wrapper that sets the correct content type.
 */
export async function uploadSvg(key: string, svgContent: string): Promise<string> {
  return uploadToR2(key, svgContent, 'image/svg+xml');
}
