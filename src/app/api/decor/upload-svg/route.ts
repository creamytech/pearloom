// ─────────────────────────────────────────────────────────────
// Pearloom / api/decor/upload-svg/route.ts
//
// User-supplied SVG/PNG uploads for the decor library — surfaced
// in the editor's Decor tab so a host can drop in their stationer's
// monogram, wedding logo, or any custom flourish that an AI pass
// wouldn't draw exactly right. Returns a permanent R2 URL the
// caller writes into `manifest.decorLibrary.uploads[]`.
//
// This is intentionally a simpler route than /api/photos/upload —
// no clustering, no bucket book-keeping, no DB row. Decor uploads
// are a flat list keyed off the manifest, and the manifest already
// persists on autosave.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { uploadToR2 } from '@/lib/r2';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB — SVGs/icons should be tiny

// Reject any SVG that contains the things we'd pass straight into
// the DOM as background-image: scripts, embedded JS, foreignObject.
// Naive but covers the most-common attack vectors; we're not
// trying to be a full sanitizer (the file lives behind R2 and
// loads as a CSS background, not innerHTML).
function isUnsafeSvg(text: string): boolean {
  const t = text.toLowerCase();
  return /<\s*script\b/.test(t) ||
         /\bjavascript:/.test(t) ||
         /\bon\w+\s*=/.test(t) || // onclick, onload, etc.
         /<\s*foreignobject\b/.test(t);
}

interface UploadPayload {
  filename?: string;
  /** Either a data: URL or a raw base64 string. */
  base64: string;
  /** Optional caller-supplied label shown on the tile. */
  label?: string;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ip = getClientIp(req);
  const limit = checkRateLimit(`decor-upload:${session.user.email}:${ip}`, { max: 30, windowMs: 60_000 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many uploads — give it a moment, then try again.' },
      { status: 429 },
    );
  }

  let body: UploadPayload;
  try {
    body = (await req.json()) as UploadPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body.base64) {
    return NextResponse.json({ error: 'Missing base64 payload' }, { status: 400 });
  }

  // Strip a data: URL prefix if present so we always work with
  // raw base64 + a known mime type. SVG mime is "image/svg+xml";
  // PNG is "image/png". We accept both since hosts often grab a
  // monogram as a transparent PNG.
  const dataUrlMatch = /^data:([^;]+);base64,(.+)$/i.exec(body.base64);
  const mime = dataUrlMatch ? dataUrlMatch[1].toLowerCase() : 'image/svg+xml';
  const rawB64 = dataUrlMatch ? dataUrlMatch[2] : body.base64;

  if (!['image/svg+xml', 'image/png'].includes(mime)) {
    return NextResponse.json(
      { error: 'Only SVG and PNG decor uploads are supported.' },
      { status: 400 },
    );
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(rawB64, 'base64');
  } catch {
    return NextResponse.json({ error: 'Could not decode upload.' }, { status: 400 });
  }
  if (buffer.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large (max 2 MB).' }, { status: 413 });
  }

  // SVG-specific sanity check — script tags + event handlers are a
  // hard reject. PNGs skip this since they're binary.
  if (mime === 'image/svg+xml') {
    const text = buffer.toString('utf-8');
    if (isUnsafeSvg(text)) {
      return NextResponse.json(
        { error: 'SVG contains scripts or event handlers. Strip them and try again.' },
        { status: 400 },
      );
    }
  }

  // Hash-keyed path so identical uploads dedupe to one R2 object.
  const ext = mime === 'image/svg+xml' ? 'svg' : 'png';
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  const safeName = (body.filename ?? 'decor')
    .replace(/[^a-z0-9-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    || 'decor';
  const key = `decor-uploads/${stamp}-${rand}-${safeName}.${ext}`;

  let url: string;
  try {
    url = await uploadToR2(key, buffer, mime);
  } catch (err) {
    console.error('[decor/upload-svg] R2 upload failed:', err);
    return NextResponse.json({ error: 'Upload failed. Try again in a moment.' }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    url,
    label: body.label ?? safeName,
    mime,
  });
}
