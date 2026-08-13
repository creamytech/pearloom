// ─────────────────────────────────────────────────────────────
// Pearloom / api/img-brightness — same-origin brightness sample.
//
// The renderer used to load <img> programmatically with
// crossOrigin='anonymous' to read pixel data for picking light vs
// dark text on top of cover photos. R2 doesn't return CORS
// headers so Chrome blocked the fetch and logged a wall of
// "Access-Control-Allow-Origin missing" errors — even though the
// actual visible <img> tag rendered fine. (Plain `<img>` doesn't
// need CORS; only canvas pixel reads do.)
//
// This route fetches the image server-side, samples a 64×64
// downsample with sharp, and returns one of:
//   { brightness: 'light' | 'dark', value: 0-255 }
// Same-origin → no CORS dance from the browser.
//
// Cached at the edge for an hour since brightness is deterministic
// per URL.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`img-brightness:${ip}`, { max: 120, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const url = req.nextUrl.searchParams.get('url') ?? '';
  if (!/^https?:\/\//.test(url)) {
    return NextResponse.json({ error: 'invalid url' }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
  } catch {
    return NextResponse.json({ error: 'fetch failed' }, { status: 502 });
  }
  if (!upstream.ok) return NextResponse.json({ error: `upstream ${upstream.status}` }, { status: 502 });

  let bytes: Buffer;
  try {
    bytes = Buffer.from(await upstream.arrayBuffer());
  } catch {
    return NextResponse.json({ error: 'read failed' }, { status: 502 });
  }
  // Bound the work — refuse to sample huge files.
  if (bytes.length > 12 * 1024 * 1024) {
    return NextResponse.json({ error: 'too large' }, { status: 413 });
  }

  let value: number;
  try {
    // Resize to 64×64 then read raw RGB. ITU-R BT.709 luma gives
    // the perceived-brightness number we use to pick light/dark.
    const { data } = await sharp(bytes)
      .resize(64, 64, { fit: 'cover' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let total = 0;
    const pixels = data.length / 3;
    for (let i = 0; i < data.length; i += 3) {
      total += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    }
    value = total / pixels;
  } catch (err) {
    console.error('[img-brightness] sample failed:', err);
    return NextResponse.json({ error: 'sample failed' }, { status: 502 });
  }

  const brightness = value < 128 ? 'light' : 'dark';
  return NextResponse.json(
    { brightness, value: Math.round(value) },
    {
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    },
  );
}
