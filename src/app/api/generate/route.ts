// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/generate/route.ts
// AI generation endpoint — takes selected photos + vibe,
// returns a full StoryManifest via the Memory Engine.
// Accepts pre-built clusters from the ClusterReview step so
// user-entered locations are preserved.
// ─────────────────────────────────────────────────────────────

// Allow up to 5 minutes — 7-pass engine + image generation needs the headroom
export const maxDuration = 300;

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { clusterPhotos, reverseGeocode } from '@/lib/google-photos';
import { generateStoryManifest } from '@/lib/memory-engine';
import type { GooglePhotoMetadata, PhotoCluster, WeddingEvent } from '@/types';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// ── R2 upload helper — fetches a URL and stores it permanently ─
function getR2Client() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) return null;
  return {
    client: new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    }),
    bucket: process.env.R2_BUCKET_NAME || 'pearloom-photos',
    publicBase: (process.env.NEXT_PUBLIC_R2_PUBLIC_URL || '').replace(/\/$/, ''),
  };
}

async function uploadPhotoUrl(rawUrl: string): Promise<string> {
  const r2 = getR2Client();
  if (!r2 || !r2.publicBase) return rawUrl; // no R2 → keep original URL

  try {
    // Fetch at a reasonable size to save R2 storage
    const fetchUrl = rawUrl.includes('googleusercontent.com')
      ? `${rawUrl}=w1200-h1200`
      : rawUrl;

    const res = await fetch(fetchUrl, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) return rawUrl;

    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
    const key = `chapters/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

    await r2.client.send(new PutObjectCommand({
      Bucket: r2.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }));

    return `${r2.publicBase}/${key}`;
  } catch {
    return rawUrl; // on any failure, fall back gracefully
  }
}

function getDefaultBlocks(occasion: string, hasEvents: boolean, hasDate: boolean) {
  const base = [
    { id: 'hero', type: 'hero', visible: true, order: 0 },
    { id: 'story', type: 'story', visible: true, order: 1 },
  ];

  if (occasion === 'wedding') {
    return [...base,
      { id: 'event', type: 'event', visible: hasEvents, order: 2 },
      { id: 'countdown', type: 'countdown', visible: hasDate && hasEvents, order: 3 },
      { id: 'rsvp', type: 'rsvp', visible: true, order: 4 },
      { id: 'travel', type: 'travel', visible: hasEvents, order: 5 },
      { id: 'registry', type: 'registry', visible: false, order: 6 },
      { id: 'faq', type: 'faq', visible: hasEvents, order: 7 },
      { id: 'photos', type: 'photos', visible: false, order: 8 },
      { id: 'guestbook', type: 'guestbook', visible: false, order: 9 },
    ];
  }

  if (occasion === 'anniversary') {
    return [...base,
      { id: 'event', type: 'event', visible: hasEvents, order: 2 },
      { id: 'photos', type: 'photos', visible: true, order: 3 },
      { id: 'guestbook', type: 'guestbook', visible: true, order: 4 },
      { id: 'rsvp', type: 'rsvp', visible: hasEvents, order: 5 },
      { id: 'countdown', type: 'countdown', visible: hasDate, order: 6 },
      { id: 'registry', type: 'registry', visible: false, order: 7 },
      { id: 'travel', type: 'travel', visible: false, order: 8 },
      { id: 'faq', type: 'faq', visible: false, order: 9 },
    ];
  }

  if (occasion === 'birthday') {
    return [...base,
      { id: 'event', type: 'event', visible: hasEvents, order: 2 },
      { id: 'guestbook', type: 'guestbook', visible: true, order: 3 },
      { id: 'photos', type: 'photos', visible: true, order: 4 },
      { id: 'rsvp', type: 'rsvp', visible: hasEvents, order: 5 },
      { id: 'countdown', type: 'countdown', visible: hasDate, order: 6 },
      { id: 'registry', type: 'registry', visible: false, order: 7 },
      { id: 'travel', type: 'travel', visible: false, order: 8 },
      { id: 'faq', type: 'faq', visible: false, order: 9 },
    ];
  }

  if (occasion === 'engagement') {
    return [...base,
      { id: 'event', type: 'event', visible: hasEvents, order: 2 },
      { id: 'countdown', type: 'countdown', visible: hasDate, order: 3 },
      { id: 'photos', type: 'photos', visible: true, order: 4 },
      { id: 'rsvp', type: 'rsvp', visible: hasEvents, order: 5 },
      { id: 'guestbook', type: 'guestbook', visible: false, order: 6 },
      { id: 'registry', type: 'registry', visible: false, order: 7 },
      { id: 'travel', type: 'travel', visible: false, order: 8 },
      { id: 'faq', type: 'faq', visible: false, order: 9 },
    ];
  }

  // story / just-because
  return [...base,
    { id: 'photos', type: 'photos', visible: true, order: 2 },
    { id: 'guestbook', type: 'guestbook', visible: true, order: 3 },
    { id: 'event', type: 'event', visible: hasEvents, order: 4 },
    { id: 'rsvp', type: 'rsvp', visible: hasEvents, order: 5 },
    { id: 'countdown', type: 'countdown', visible: false, order: 6 },
    { id: 'registry', type: 'registry', visible: false, order: 7 },
    { id: 'travel', type: 'travel', visible: false, order: 8 },
    { id: 'faq', type: 'faq', visible: false, order: 9 },
  ];
}

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
      inspirationUrls,
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
      inspirationUrls?: string[];
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
      eventDate,
      inspirationUrls  // NEW: passed to memory-engine for visual style matching
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

    // Always overwrite AI-generated events with real user data.
    // If user provided no event details, this clears any hallucinated venues/times.
    manifest.events = events.length > 0 ? events : [];

    // Clear AI-generated travelInfo — the schema now returns empty arrays,
    // but guard against any residual hallucination slipping through.
    if (!manifest.travelInfo?.hotels?.length && !manifest.travelInfo?.airports?.length) {
      manifest.travelInfo = { airports: [], hotels: [] };
    }

    // ── Initialize blocks: occasion-aware defaults.
    // Hero + Story are always shown. Remaining blocks are shown/hidden based on occasion.
    {
      const blocks = getDefaultBlocks(occasion ?? 'story', events.length > 0, !!eventDate);
      manifest.blocks = blocks as typeof manifest.blocks;
    }

    // Set top-level logistics fields from user-supplied details
    if (dresscode) {
      manifest.logistics = { ...(manifest.logistics ?? {}), dresscode };
    }
    if (guestNotes) {
      manifest.logistics = { ...(manifest.logistics ?? {}), notes: guestNotes };
    }

    // Map actual photo URLs + REAL locations into generated chapters.
    // Upload each photo to R2 so URLs don't expire (Google Photos baseUrl ~60min TTL).
    // CRITICAL: cluster location (from GPS or user input) ALWAYS overrides AI hallucination.
    manifest.chapters = await Promise.all(manifest.chapters.map(async (chapter, i) => {
      const cluster = enrichedClusters[i];
      if (cluster) {
        // Upload all chapter photos to R2 in parallel (up to 3 per chapter)
        const photosToUpload = cluster.photos.slice(0, 3);
        const uploadedUrls = await Promise.all(
          photosToUpload.map(p => uploadPhotoUrl(p.baseUrl))
        );

        chapter.images = photosToUpload.map((p, pi) => ({
          id: p.id,
          url: uploadedUrls[pi],
          alt: p.description || chapter.title,
          width: p.width,
          height: p.height,
        }));

        // ALWAYS use cluster location — never trust AI-generated ones
        if (cluster.location && cluster.location.label) {
          chapter.location = cluster.location;
        } else {
          chapter.location = null;
        }
      }
      return chapter;
    }));

    return NextResponse.json({ manifest });
  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    );
  }
}
