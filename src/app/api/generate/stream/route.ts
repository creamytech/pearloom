// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/generate/stream/route.ts
// SSE streaming wrapper for the Memory Engine — emits progress
// events as each pass completes instead of blocking for 30-90s.
// ─────────────────────────────────────────────────────────────

// Allow up to 5 minutes — 7-pass engine + image generation needs the headroom
export const maxDuration = 300;

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { clusterPhotos, reverseGeocode } from '@/lib/google-photos';
import { generateStoryManifest } from '@/lib/memory-engine';
import type { GooglePhotoMetadata, PhotoCluster, WeddingEvent, LogoIconId } from '@/types';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import pLimit from 'p-limit';
import { encryptBuffer, isEncryptionEnabled } from '@/lib/crypto';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

// ── Pass labels (index 0-7) ────────────────────────────────────
const PASS_LABELS = [
  'Gathering your memories…',
  'Writing your story…',
  'Refining every word…',
  'Learning your DNA…',
  'Weaving the poetry…',
  'Designing your world…',
  'Crafting custom art…',
  'Final polish…',
];

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

    const plaintext = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
    const key = `chapters/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
    const body = isEncryptionEnabled() ? encryptBuffer(plaintext) : plaintext;

    await r2.client.send(new PutObjectCommand({
      Bucket: r2.bucket,
      Key: key,
      Body: body,
      ContentType: 'application/octet-stream',
      CacheControl: 'public, max-age=31536000, immutable',
    }));

    return `/api/img/${key}`;
  } catch (err) {
    console.warn('[R2 Upload] Failed to upload photo to R2 — site will use ephemeral Google Photos URL:', err instanceof Error ? err.message : err);
    return rawUrl; // on any failure, fall back gracefully
  }
}

function getDefaultBlocks(occasion: string, _hasEvents: boolean, _hasDate: boolean) {
  const base = [
    { id: 'hero',  type: 'hero',  visible: true,  order: 0 },
    { id: 'story', type: 'story', visible: true,  order: 1 },
  ];

  if (occasion === 'wedding') {
    return [...base,
      { id: 'event',     type: 'event',     visible: false, order: 2 },
      { id: 'countdown', type: 'countdown', visible: false, order: 3 },
      { id: 'rsvp',      type: 'rsvp',      visible: false, order: 4 },
      { id: 'travel',    type: 'travel',    visible: false, order: 5 },
      { id: 'registry',  type: 'registry',  visible: false, order: 6 },
      { id: 'faq',       type: 'faq',       visible: false, order: 7 },
      { id: 'photos',    type: 'photos',    visible: false, order: 8 },
      { id: 'guestbook', type: 'guestbook', visible: false, order: 9 },
    ];
  }

  if (occasion === 'anniversary') {
    return [...base,
      { id: 'event',     type: 'event',     visible: false, order: 2 },
      { id: 'photos',    type: 'photos',    visible: false, order: 3 },
      { id: 'guestbook', type: 'guestbook', visible: false, order: 4 },
      { id: 'rsvp',      type: 'rsvp',      visible: false, order: 5 },
      { id: 'countdown', type: 'countdown', visible: false, order: 6 },
      { id: 'registry',  type: 'registry',  visible: false, order: 7 },
      { id: 'travel',    type: 'travel',    visible: false, order: 8 },
      { id: 'faq',       type: 'faq',       visible: false, order: 9 },
    ];
  }

  if (occasion === 'birthday') {
    return [...base,
      { id: 'event',     type: 'event',     visible: false, order: 2 },
      { id: 'guestbook', type: 'guestbook', visible: false, order: 3 },
      { id: 'photos',    type: 'photos',    visible: false, order: 4 },
      { id: 'rsvp',      type: 'rsvp',      visible: false, order: 5 },
      { id: 'countdown', type: 'countdown', visible: false, order: 6 },
      { id: 'registry',  type: 'registry',  visible: false, order: 7 },
      { id: 'travel',    type: 'travel',    visible: false, order: 8 },
      { id: 'faq',       type: 'faq',       visible: false, order: 9 },
    ];
  }

  if (occasion === 'engagement') {
    return [...base,
      { id: 'event',     type: 'event',     visible: false, order: 2 },
      { id: 'countdown', type: 'countdown', visible: false, order: 3 },
      { id: 'photos',    type: 'photos',    visible: false, order: 4 },
      { id: 'rsvp',      type: 'rsvp',      visible: false, order: 5 },
      { id: 'guestbook', type: 'guestbook', visible: false, order: 6 },
      { id: 'registry',  type: 'registry',  visible: false, order: 7 },
      { id: 'travel',    type: 'travel',    visible: false, order: 8 },
      { id: 'faq',       type: 'faq',       visible: false, order: 9 },
    ];
  }

  // story / just-because
  return [...base,
    { id: 'photos',    type: 'photos',    visible: false, order: 2 },
    { id: 'guestbook', type: 'guestbook', visible: false, order: 3 },
    { id: 'event',     type: 'event',     visible: false, order: 4 },
    { id: 'rsvp',      type: 'rsvp',      visible: false, order: 5 },
    { id: 'countdown', type: 'countdown', visible: false, order: 6 },
    { id: 'registry',  type: 'registry',  visible: false, order: 7 },
    { id: 'travel',    type: 'travel',    visible: false, order: 8 },
    { id: 'faq',       type: 'faq',       visible: false, order: 9 },
  ];
}

/** Generate a custom logo SVG icon via AI based on the couple's vibe + occasion */
async function generateLogoIcon(occasion: string | undefined, vibeString: string | undefined, names: [string, string], apiKey: string): Promise<{ logoIcon: LogoIconId; logoSvg?: string }> {
  const fallbackIcon: LogoIconId = occasion === 'wedding' ? 'wedding-rings'
    : occasion === 'anniversary' ? 'champagne'
    : occasion === 'engagement' ? 'heart'
    : occasion === 'birthday' ? 'gift'
    : 'pearl';

  if (!apiKey || !vibeString) return { logoIcon: fallbackIcon };

  try {
    const isBirthday = occasion === 'birthday';
    const who = isBirthday ? names[0] : `${names[0]} & ${names[1]}`;

    const prompt = `Design a tiny logo icon (24x24 SVG viewBox) for a ${occasion || 'celebration'} website for ${who}.

Their vibe/interests: "${vibeString.slice(0, 300)}"

Create a SINGLE elegant SVG icon that reflects their SPECIFIC interests, not a generic symbol. Examples:
- If they mention "Knicks" → a basketball with a subtle heart
- If they mention "hiking" → a mountain peak with a trail
- If they mention "coffee" → a coffee cup with steam curling into a heart
- If they mention "cats" → an elegant cat silhouette
- If they mention "music" → a musical note with personality
- ${isBirthday ? 'For a birthday, incorporate a candle or cake element subtly' : 'For a wedding, weave in a subtle romantic element'}

Return ONLY a valid SVG string. ViewBox must be "0 0 24 24". Use stroke-based design (stroke-width 1.5, stroke-linecap round). NO fill on the main paths (fill="none"). Keep it minimal — 3-6 path elements max. The icon should be recognizable at 18px.`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 500 },
        }),
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!res.ok) return { logoIcon: fallbackIcon };

    const data = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    // Extract SVG from response (may have markdown wrapping)
    const svgMatch = raw.match(/<svg[\s\S]*?<\/svg>/i);
    if (svgMatch && svgMatch[0].length > 50 && svgMatch[0].length < 2000) {
      return { logoIcon: fallbackIcon, logoSvg: svgMatch[0] };
    }

    return { logoIcon: fallbackIcon };
  } catch {
    return { logoIcon: fallbackIcon };
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }

  if ((session as { error?: string }).error === 'RefreshAccessTokenError') {
    return new Response(
      JSON.stringify({ error: 'Your Google session has expired. Please sign out and sign back in.' }),
      { status: 401 }
    );
  }

  // Rate limit by user email — AI generation is expensive
  const userEmail = (session as { user?: { email?: string } }).user?.email || 'unknown';
  const rateCheck = checkRateLimit(`generate:${userEmail}`, RATE_LIMITS.aiGenerate);
  if (!rateCheck.allowed) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded. Please wait before generating again.', resetAt: rateCheck.resetAt }),
      { status: 429 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Gemini API key not configured' }), { status: 500 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), { status: 400 });
  }

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
    layoutFormat,
    rsvpDeadline,
    cashFundUrl,
    eventVenue,
    selectedPaletteColors,
    photoNotes,
    storyLayout,
    songUrl,
  } = body as {
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
    layoutFormat?: string;
    rsvpDeadline?: string;
    cashFundUrl?: string;
    eventVenue?: string;
    selectedPaletteColors?: string[];
    photoNotes?: Record<string, { note?: string; location?: string; date?: string }>;
    storyLayout?: 'parallax' | 'filmstrip' | 'magazine' | 'timeline' | 'kenburns' | 'bento';
    songUrl?: string;
  };

  if (!photos?.length) {
    return new Response(JSON.stringify({ error: 'No photos selected' }), { status: 400 });
  }
  if (photos.length > 500) {
    return new Response(JSON.stringify({ error: 'Too many photos (max 500)' }), { status: 400 });
  }
  if (prebuiltClusters && prebuiltClusters.length > 50) {
    return new Response(JSON.stringify({ error: 'Too many clusters (max 50)' }), { status: 400 });
  }
  if (!vibeString) {
    return new Response(JSON.stringify({ error: 'Vibe string is required' }), { status: 400 });
  }
  if (vibeString.length > 5000) {
    return new Response(JSON.stringify({ error: 'Vibe description too long (max 5000 characters)' }), { status: 400 });
  }

  // Cluster enrichment must happen before we start streaming, since it's quick
  let enrichedClusters: PhotoCluster[];
  try {
    if (prebuiltClusters && prebuiltClusters.length > 0) {
      enrichedClusters = await Promise.all(
        prebuiltClusters.map(async (c) => {
          if (c.location && !c.location.label) {
            c.location.label = await reverseGeocode(c.location.lat, c.location.lng);
          }
          return c;
        })
      );
      console.log(`[Generate/Stream] Using ${enrichedClusters.length} pre-reviewed clusters from UI`);
    } else {
      const rawClusters = clusterPhotos(photos, 14);
      enrichedClusters = await Promise.all(
        rawClusters.map(async (c) => {
          if (c.location && !c.location.label) {
            c.location.label = await reverseGeocode(c.location.lat, c.location.lng);
          }
          return c;
        })
      );
      console.log(`[Generate/Stream] Built ${enrichedClusters.length} clusters from scratch`);
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Failed to prepare photo clusters' }),
      { status: 500 }
    );
  }

  // Attach per-photo user notes (from the photo-review step) onto the
  // containing cluster so Pass 1's prompt can cite them verbatim. Each
  // cluster aggregates the notes + any user-entered locations for its
  // member photos.
  if (photoNotes && Object.keys(photoNotes).length > 0) {
    enrichedClusters = enrichedClusters.map((cluster) => {
      const notesForCluster: string[] = [];
      let manualLocation: string | null = null;
      for (const photo of cluster.photos) {
        const entry = photoNotes[photo.id];
        if (!entry) continue;
        if (entry.note && entry.note.trim().length > 0) {
          notesForCluster.push(entry.note.trim());
        }
        if (!manualLocation && entry.location && entry.location.trim().length > 0) {
          manualLocation = entry.location.trim();
        }
      }
      const mergedNote = notesForCluster.length > 0
        ? notesForCluster.join(' • ')
        : cluster.note;
      // Only overwrite location label if the user actually typed one.
      let location = cluster.location;
      if (manualLocation) {
        location = location
          ? { ...location, label: manualLocation }
          : { lat: 0, lng: 0, label: manualLocation };
      }
      return { ...cluster, note: mergedNote, location };
    });
    const withNotes = enrichedClusters.filter(c => c.note && c.note.length > 0).length;
    console.log(`[Generate/Stream] Attached user notes to ${withNotes}/${enrichedClusters.length} clusters`);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch { /* stream may be closed */ }
      };

      try {
        // Send pass 0 immediately
        send({ type: 'progress', pass: 0, label: PASS_LABELS[0] });

        const manifest = await generateStoryManifest(
          enrichedClusters,
          vibeString,
          names,
          apiKey,
          session.accessToken,
          occasion,
          eventDate,
          inspirationUrls,
          layoutFormat,
          (pass, snapshot) => {
            send({
              type: 'progress',
              pass,
              label: PASS_LABELS[Math.min(pass, 7)],
              // Stream intermediate manifest snapshots as each pass completes
              // so the live preview updates in real time.
              manifest: snapshot ?? undefined,
            });
          },
          selectedPaletteColors,
        );

        // ── Post-processing (mirrors /api/generate/route.ts lines 354-506) ──

        // Pre-populate logistics from user-provided fields
        if (eventDate) {
          manifest.logistics = {
            ...(manifest.logistics ?? {}),
            date: eventDate,
          };
        }
        if (rsvpDeadline) {
          manifest.logistics = { ...(manifest.logistics ?? {}), rsvpDeadline };
        }
        if (eventVenue) {
          manifest.logistics = { ...(manifest.logistics ?? {}), venue: eventVenue };
        }
        if (cashFundUrl) {
          manifest.registry = {
            ...(manifest.registry ?? { enabled: true }),
            enabled: true,
            cashFundUrl,
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
        manifest.events = events.length > 0 ? events : [];

        // Always reset travelInfo — users fill in real hotels/airports via the editor.
        manifest.travelInfo = { airports: [], hotels: [] };

        // Clear AI-hallucinated FAQs — users add real FAQs in the Details tab.
        manifest.faqs = [];

        // Initialize blocks: occasion-aware defaults.
        {
          const blocks = getDefaultBlocks(occasion ?? 'story', events.length > 0, !!eventDate);
          manifest.blocks = blocks as typeof manifest.blocks;
        }

        // Hide all sub-pages from nav by default.
        manifest.hiddenPages = ['schedule', 'rsvp', 'travel', 'faq', 'registry'];

        // Set top-level logistics fields from user-supplied details
        if (dresscode) {
          manifest.logistics = { ...(manifest.logistics ?? {}), dresscode };
        }
        if (guestNotes) {
          manifest.logistics = { ...(manifest.logistics ?? {}), notes: guestNotes };
        }

        // Trim chapters to cluster count
        if (manifest.chapters.length > enrichedClusters.length) {
          manifest.chapters = manifest.chapters.slice(0, enrichedClusters.length);
        }
        const uploadLimit = pLimit(8); // max 8 concurrent R2 uploads

        // Pre-upload the first few photos to R2 while the OAuth token
        // is still fresh so we can fill `coverPhoto` + `heroSlideshow`
        // with permanent URLs before the client ever hits save. This
        // is the first-ever save's safety net — without it, the
        // skeleton's proxy-wrapped Picker URLs would survive into the
        // DB and 404 within the hour.
        const heroPhotoSources = photos.slice(0, 6);
        const heroUploadPromise = Promise.all(
          heroPhotoSources.map(p => uploadLimit(() => uploadPhotoUrl(p.baseUrl))),
        );

        // Run chapter photo uploads, logo generation, and hero mirroring in parallel
        const [updatedChapters, logoResult, heroUrls] = await Promise.all([
          // 1. Upload chapter photos to R2 + resolve locations
          Promise.all(manifest.chapters.map(async (chapter, i) => {
            const cluster = enrichedClusters[i];
            if (cluster) {
              // Attach EVERY photo in the cluster, not just the first 3.
              // Individual layouts cap their own display counts at render
              // time (FilmStrip/MagazineSpread/TimelineVine use photos[0],
              // BentoGrid caps at 5, KenBurns at 6). Keeping the full set
              // in the manifest means the dashboard gallery can show every
              // photo the user actually uploaded instead of losing the tail.
              const photosToUpload = cluster.photos;
              const uploadedUrls = await Promise.all(
                photosToUpload.map(p => uploadLimit(() => uploadPhotoUrl(p.baseUrl)))
              );

              chapter.images = photosToUpload.map((p, pi) => ({
                id: p.id,
                url: uploadedUrls[pi],
                alt: p.description || chapter.title,
                width: p.width,
                height: p.height,
              }));

              // ALWAYS use cluster location — never trust AI-generated ones
              if (cluster.location) {
                if (!cluster.location.label && (cluster.location.lat || cluster.location.lng)) {
                  const label = await reverseGeocode(cluster.location.lat, cluster.location.lng);
                  cluster.location.label = label || `${cluster.location.lat.toFixed(2)}, ${cluster.location.lng.toFixed(2)}`;
                }
                chapter.location = cluster.location.label ? cluster.location : null;
              } else {
                chapter.location = null;
              }
            }
            return chapter;
          })),

          // 2. Generate custom AI logo icon
          generateLogoIcon(occasion, vibeString, names, apiKey),

          // 3. Pre-upload hero photos to R2 while the OAuth token is fresh
          heroUploadPromise,
        ]);

        manifest.chapters = updatedChapters;
        manifest.logoIcon = logoResult.logoIcon;
        if (logoResult.logoSvg) manifest.logoSvg = logoResult.logoSvg;

        // Auto-reveal the photos block whenever the user uploaded
        // photos. The gallery renders by aggregating chapter images,
        // so if any chapter has images it means the user gave us
        // something to show — no reason to leave the block hidden
        // and force them to toggle it on manually.
        {
          const hasAnyChapterPhoto = (manifest.chapters || []).some(
            (c) => Array.isArray(c.images) && c.images.length > 0,
          );
          if (hasAnyChapterPhoto && manifest.blocks) {
            manifest.blocks = manifest.blocks.map((b) =>
              b.type === 'photos' ? { ...b, visible: true } : b,
            );
          }
        }
        // Seed the hero media with the freshly-uploaded R2 URLs.
        // `uploadPhotoUrl` falls back to the original baseUrl on
        // failure so we only adopt values that actually look
        // permanent (`/api/img/…` or an R2 public URL).
        const permanentHeroUrls = heroUrls.filter((u: string) => u && !u.includes('googleusercontent.com'));
        if (permanentHeroUrls.length > 0) {
          manifest.coverPhoto = permanentHeroUrls[0];
          manifest.heroSlideshow = permanentHeroUrls.slice(0, 5);
        }
        // Persist the wizard's story layout pick onto the final manifest so
        // the published site renders with it.
        if (storyLayout) {
          manifest.storyLayout = storyLayout;
        }

        // Insert a Spotify/YouTube music block if the user
        // pasted a song URL on the wizard's song step. The
        // block is added right after the hero so it's visible
        // above the fold on the published site.
        if (songUrl && typeof songUrl === 'string' && songUrl.trim().length > 0) {
          const songBlock = {
            id: `spotify-${Date.now()}`,
            type: 'spotify' as const,
            visible: true,
            order: 1,
            config: { url: songUrl.trim() },
          };
          const existing = manifest.blocks || [];
          // Bump every existing block's order by 1 to make
          // room for the song block at order 1 (just under the
          // hero which lives at order 0).
          manifest.blocks = [
            ...existing.map((b) =>
              b.order >= 1 ? { ...b, order: b.order + 1 } : b,
            ),
            songBlock,
          ].sort((a, b) => a.order - b.order);
        }

        send({ type: 'complete', manifest });
      } catch (err) {
        send({ type: 'error', message: err instanceof Error ? err.message : 'Generation failed' });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
