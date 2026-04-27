// ─────────────────────────────────────────────────────────────
// Pearloom / api/assets/upload/route.ts
// Authenticated asset upload to Cloudflare R2.
// Accepts FormData with `file` and `key` fields.
// Returns { publicUrl } on success.
// ─────────────────────────────────────────────────────────────

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { uploadToR2 } from '@/lib/r2';
import { checkRateLimit } from '@/lib/rate-limit';

const MAX_SIZE_MB = 10;

/** 20 uploads per hour per user */
const UPLOAD_RATE_LIMIT = { max: 20, windowMs: 60 * 60 * 1000 } as const;

export async function POST(req: NextRequest) {
  // ── Auth ──
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return Response.json(
      { error: 'You must be signed in to upload assets' },
      { status: 401 },
    );
  }

  // ── Rate limit ──
  const limiter = checkRateLimit(
    `asset-upload:${session.user.email}`,
    UPLOAD_RATE_LIMIT,
  );
  if (!limiter.allowed) {
    return Response.json(
      { error: 'Too many uploads. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((limiter.resetAt - Date.now()) / 1000)) } },
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const key = formData.get('key') as string | null;

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!key || typeof key !== 'string' || key.length === 0) {
      return Response.json({ error: 'No key provided' }, { status: 400 });
    }

    // Sanitise key — prevent path traversal
    const safeKey = key.replace(/\.\./g, '').replace(/^\/+/, '');
    if (safeKey.length === 0) {
      return Response.json({ error: 'Invalid key' }, { status: 400 });
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return Response.json(
        { error: `File too large (max ${MAX_SIZE_MB}MB)` },
        { status: 413 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType = file.type || 'application/octet-stream';

    const publicUrl = await uploadToR2(safeKey, buffer, contentType);

    return Response.json({ publicUrl });
  } catch (err) {
    console.error('[assets/upload] Error:', err);
    return Response.json({ error: 'Upload failed' }, { status: 500 });
  }
}
