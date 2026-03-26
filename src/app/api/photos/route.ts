// ─────────────────────────────────────────────────────────────
// everglow / app/api/photos/route.ts
// Proxy to Google Photos API — returns normalized metadata
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { fetchAllPhotos, clusterPhotos, reverseGeocode } from '@/lib/google-photos';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json(
      { error: 'Not authenticated. Connect Google Photos first.' },
      { status: 401 }
    );
  }

  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') ?? '200', 10);
    const cluster = url.searchParams.get('cluster') === 'true';

    // Fetch photos from Google
    const photos = await fetchAllPhotos(session.accessToken, limit);

    if (cluster) {
      // Cluster and reverse-geocode
      const clusters = clusterPhotos(photos);

      // Reverse-geocode each cluster in parallel
      const enriched = await Promise.all(
        clusters.map(async (c) => {
          if (c.location && !c.location.label) {
            c.location.label = await reverseGeocode(c.location.lat, c.location.lng);
          }
          return c;
        })
      );

      return NextResponse.json({ clusters: enriched, totalPhotos: photos.length });
    }

    return NextResponse.json({ photos, total: photos.length });
  } catch (error) {
    console.error('Photos API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch photos' },
      { status: 500 }
    );
  }
}
