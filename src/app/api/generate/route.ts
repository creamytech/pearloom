// ─────────────────────────────────────────────────────────────
// everglow / app/api/generate/route.ts
// AI generation endpoint — takes selected photos + vibe,
// returns a full StoryManifest via the Memory Engine
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { clusterPhotos, reverseGeocode } from '@/lib/google-photos';
import { generateStoryManifest } from '@/lib/memory-engine';
import type { GooglePhotoMetadata } from '@/types';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Gemini API key not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const {
      photos,
      vibeString,
      names,
    }: {
      photos: GooglePhotoMetadata[];
      vibeString: string;
      names: [string, string];
    } = body;

    if (!photos?.length) {
      return NextResponse.json({ error: 'No photos selected' }, { status: 400 });
    }

    if (!vibeString) {
      return NextResponse.json({ error: 'Vibe string is required' }, { status: 400 });
    }

    // 1. Cluster the selected photos
    const clusters = clusterPhotos(photos, 14);

    // 2. Reverse-geocode cluster locations
    const enrichedClusters = await Promise.all(
      clusters.map(async (c) => {
        if (c.location && !c.location.label) {
          c.location.label = await reverseGeocode(c.location.lat, c.location.lng);
        }
        return c;
      })
    );

    // 3. Generate the Story Manifest via Gemini
    const manifest = await generateStoryManifest(
      enrichedClusters,
      vibeString,
      names,
      apiKey
    );

    // 4. Map the actual photo URLs into the generated chapters
    manifest.chapters = manifest.chapters.map((chapter, i) => {
      const cluster = enrichedClusters[i];
      if (cluster) {
        // Pick the best photos from the cluster (up to 3)
        chapter.images = cluster.photos.slice(0, 3).map((p) => ({
          id: p.id,
          url: `${p.baseUrl}=w1200-h800`, // Google Photos CDN — sized
          alt: p.description || chapter.title,
          width: p.width,
          height: p.height,
        }));

        // Prefer the geocoded location from the cluster
        if (cluster.location) {
          chapter.location = cluster.location;
        }
      }
      return chapter;
    });

    return NextResponse.json({ manifest });
  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    );
  }
}
