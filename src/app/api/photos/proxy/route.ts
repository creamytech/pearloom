// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/photos/proxy/route.ts
// Server-side image proxy for Picker API baseUrls
// The Picker API baseUrls require OAuth authentication,
// so we fetch server-side with the token and pipe bytes back.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const url = new URL(req.url);
  const baseUrl = url.searchParams.get('url');
  const w = url.searchParams.get('w') ?? '600';
  const h = url.searchParams.get('h') ?? '600';

  if (!baseUrl) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  // Construct the full Google Photos URL with size params
  const photoUrl = `${baseUrl}=w${w}-h${h}-c`;

  try {
    const res = await fetch(photoUrl, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    });

    if (!res.ok) {
      console.error(`[Photo Proxy] Google returned ${res.status} for ${photoUrl}`);
      return new NextResponse(`Google Photos returned ${res.status}`, { status: res.status });
    }

    const contentType = res.headers.get('content-type') ?? 'image/jpeg';
    const imageBuffer = await res.arrayBuffer();

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, immutable',
      },
    });
  } catch (err) {
    console.error('[Photo Proxy] Fetch error:', err);
    return new NextResponse('Failed to fetch image', { status: 500 });
  }
}
