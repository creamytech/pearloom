// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/generate/route.ts
// AI generation endpoint — takes selected photos + vibe,
// returns a full StoryManifest via the Memory Engine.
// Accepts pre-built clusters from the ClusterReview step so
// user-entered locations are preserved.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { clusterPhotos, reverseGeocode } from '@/lib/google-photos';
import { generateStoryManifest } from '@/lib/memory-engine';
import type { GooglePhotoMetadata, PhotoCluster, WeddingEvent } from '@/types';

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
      clusters: prebuiltClusters,
      vibeString,
      names,
      occasion,
      eventDate,
      ceremonyVenue,
      ceremonyAddress,
      ceremonyTime,
      receptionVenue,
      receptionAddress,
      receptionTime,
      dresscode,
      officiant,
      celebrationVenue,
      celebrationTime,
      guestNotes,
    }: {
      photos: GooglePhotoMetadata[];
      clusters?: PhotoCluster[];
      vibeString: string;
      names: [string, string];
      occasion?: string;
      eventDate?: string;
      ceremonyVenue?: string;
      ceremonyAddress?: string;
      ceremonyTime?: string;
      receptionVenue?: string;
      receptionAddress?: string;
      receptionTime?: string;
      dresscode?: string;
      officiant?: string;
      celebrationVenue?: string;
      celebrationTime?: string;
      guestNotes?: string;
    } = body;

    if (!photos?.length) {
      return NextResponse.json({ error: 'No photos selected' }, { status: 400 });
    }

    if (!vibeString) {
      return NextResponse.json({ error: 'Vibe string is required' }, { status: 400 });
    }

    let enrichedClusters: PhotoCluster[];

    if (prebuiltClusters && prebuiltClusters.length > 0) {
      // ── User went through ClusterReview — clusters already have user-set labels ──
      // Only geocode clusters that still have no label (GPS found but not yet reverse-geocoded)
      enrichedClusters = await Promise.all(
        prebuiltClusters.map(async (c) => {
          if (c.location && !c.location.label) {
            // Has GPS coords but label not yet set — reverse geocode
            c.location.label = await reverseGeocode(c.location.lat, c.location.lng);
          }
          // If location is null and user didn't set one, leave it null — AI will infer from timing
          return c;
        })
      );
      console.log(`[Generate] Using ${enrichedClusters.length} pre-reviewed clusters from UI`);
    } else {
      // ── Fallback: cluster fresh from photos + reverse-geocode ──
      const rawClusters = clusterPhotos(photos, 14);
      enrichedClusters = await Promise.all(
        rawClusters.map(async (c) => {
          if (c.location && !c.location.label) {
            c.location.label = await reverseGeocode(c.location.lat, c.location.lng);
          }
          return c;
        })
      );
      console.log(`[Generate] Built ${enrichedClusters.length} clusters from scratch`);
    }

    // Generate the Story Manifest via Gemini (3-pass: generate → critique → vibeSkin)
    const manifest = await generateStoryManifest(
      enrichedClusters,
      vibeString,
      names,
      apiKey,
      session.accessToken,
      occasion,
      eventDate
    );

    // Pre-populate logistics date from user-provided eventDate
    if (eventDate) {
      manifest.logistics = {
        ...(manifest.logistics ?? {}),
        date: eventDate,
      };
    }

    // Auto-create WeddingEvent entries from user-supplied details
    const events: WeddingEvent[] = [];

    if (ceremonyVenue || ceremonyTime) {
      events.push({
        id: 'ceremony',
        name: 'Ceremony',
        type: 'ceremony',
        date: eventDate ?? '',
        time: ceremonyTime ?? '',
        venue: ceremonyVenue ?? '',
        address: ceremonyAddress ?? '',
        notes: officiant ? `Officiated by ${officiant}` : undefined,
        dressCode: dresscode,
        order: 0,
      });
    }

    if (receptionVenue || receptionTime) {
      events.push({
        id: 'reception',
        name: 'Reception',
        type: 'reception',
        date: eventDate ?? '',
        time: receptionTime ?? '',
        venue: receptionVenue ?? '',
        address: receptionAddress ?? '',
        dressCode: dresscode,
        order: 1,
      });
    }

    // Anniversary / birthday / engagement celebration venue
    if (celebrationVenue || celebrationTime) {
      const celebrationName =
        occasion === 'birthday'
          ? 'Birthday Celebration'
          : occasion === 'anniversary'
          ? 'Anniversary Celebration'
          : 'Engagement Party';
      events.push({
        id: 'celebration',
        name: celebrationName,
        type: 'reception',
        date: eventDate ?? '',
        time: celebrationTime ?? '',
        venue: celebrationVenue ?? '',
        address: '',
        dressCode: dresscode,
        order: 0,
      });
    }

    if (events.length > 0) {
      manifest.events = events;
    }

    // Set top-level logistics fields from user-supplied details
    if (dresscode) {
      manifest.logistics = { ...(manifest.logistics ?? {}), dresscode };
    }
    if (guestNotes) {
      manifest.logistics = { ...(manifest.logistics ?? {}), notes: guestNotes };
    }

    // Map actual photo URLs + REAL locations into generated chapters.
    // CRITICAL: cluster location (from GPS or user input) ALWAYS overrides
    // whatever the AI hallucinated. If no location exists, strip it.
    manifest.chapters = manifest.chapters.map((chapter, i) => {
      const cluster = enrichedClusters[i];
      if (cluster) {
        chapter.images = cluster.photos.slice(0, 3).map((p) => ({
          id: p.id,
          url: p.baseUrl,
          alt: p.description || chapter.title,
          width: p.width,
          height: p.height,
        }));

        // ALWAYS use cluster location — never trust AI-generated ones
        if (cluster.location && cluster.location.label) {
          chapter.location = cluster.location;
        } else {
          // No real location data → delete any AI hallucination
          chapter.location = null;
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
