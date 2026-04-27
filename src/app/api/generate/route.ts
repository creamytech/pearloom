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
import type { GooglePhotoMetadata, PhotoCluster, WeddingEvent, LogoIconId } from '@/types';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import pLimit from 'p-limit';
import { encryptBuffer, isEncryptionEnabled } from '@/lib/crypto';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { seedBlocksFromEventDetails } from '@/lib/event-os/seed-event-details';
import { getDefaultThemeFamily } from '@/lib/event-os/theme-family';

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
  // All blocks start hidden except hero + story.
  // Users enable sections they want via the editor — this prevents empty/broken
  // sections (schedule with no events, travel with no hotels, etc.) from appearing
  // on freshly generated sites. Block ORDER is occasion-aware so the editor shows
  // a sensible default sequence when blocks are toggled on.

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
  // Default fallback per occasion
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

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  if ((session as { error?: string }).error === 'RefreshAccessTokenError') {
    return NextResponse.json(
      { error: 'Your Google session has expired. Please sign out and sign back in.' },
      { status: 401 }
    );
  }

  // Rate limit by user email — AI generation is expensive
  const userEmail = (session as { user?: { email?: string } }).user?.email || 'unknown';
  const rateCheck = checkRateLimit(`generate:${userEmail}`, RATE_LIMITS.aiGenerate);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please wait before generating again.', resetAt: rateCheck.resetAt },
      { status: 429 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || process.env.GOOGLE_API_KEY;
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
      layoutFormat,
      voiceSamples,
      rsvpDeadline,
      cashFundUrl,
      eventVenue,
      selectedPaletteColors,
      photoNotes,
      storyLayout,
      songUrl,
      // Occasion-specific context (anniversary / birthday / engagement)
      anniversaryYears,
      anniversaryMilestone,
      originalDate,
      coupleEvolution,
      birthdayAge,
      isSurprise,
      birthdayPassions,
      birthdayTribute,
      proposalStory,
      proposalDate,
      weddingTimeline,
      ringDetails,
      venueAesthetic,
      eventDetails,
      templateId,
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
      layoutFormat?: string;
      voiceSamples?: string[];
      rsvpDeadline?: string;
      cashFundUrl?: string;
      eventVenue?: string;
      selectedPaletteColors?: string[];
      photoNotes?: Record<string, { note?: string; location?: string; date?: string }>;
      storyLayout?: 'parallax' | 'filmstrip' | 'magazine' | 'timeline' | 'kenburns' | 'bento';
      songUrl?: string;
      anniversaryYears?: string;
      anniversaryMilestone?: string;
      originalDate?: string;
      coupleEvolution?: string;
      birthdayAge?: string;
      isSurprise?: boolean;
      birthdayPassions?: string;
      birthdayTribute?: string;
      proposalStory?: string;
      proposalDate?: string;
      weddingTimeline?: string;
      ringDetails?: string;
      venueAesthetic?: string;
      eventDetails?: {
        days?: number;
        livestreamUrl?: string;
        inMemoryOf?: string;
        school?: string;
      };
      templateId?: string;
    } = body;

    if (!photos?.length) {
      return NextResponse.json({ error: 'No photos selected' }, { status: 400 });
    }
    if (photos.length > 500) {
      return NextResponse.json({ error: 'Too many photos (max 500)' }, { status: 400 });
    }
    if (prebuiltClusters && prebuiltClusters.length > 50) {
      return NextResponse.json({ error: 'Too many clusters (max 50)' }, { status: 400 });
    }

    if (!vibeString) {
      return NextResponse.json({ error: 'Vibe string is required' }, { status: 400 });
    }
    if (vibeString.length > 5000) {
      return NextResponse.json({ error: 'Vibe description too long (max 5000 characters)' }, { status: 400 });
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

    // Attach per-photo user notes (from the photo-review step) onto the
    // containing cluster so Pass 1's prompt cites them verbatim.
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
        let location = cluster.location;
        if (manualLocation) {
          location = location
            ? { ...location, label: manualLocation }
            : { lat: 0, lng: 0, label: manualLocation };
        }
        return { ...cluster, note: mergedNote, location };
      });
      const withNotes = enrichedClusters.filter(c => c.note && c.note.length > 0).length;
      console.log(`[Generate] Attached user notes to ${withNotes}/${enrichedClusters.length} clusters`);
    }

    // ── Photo Intelligence — score photos for story arc ──────────
    // Enhances hero selection and narrative ordering by analyzing
    // emotional intensity and visual quality of each cluster's best photo.
    try {
      const { scoreStoryArc } = await import('@/lib/photo-intelligence/analyzer');
      // Build lightweight analyses for scoring (without Gemini Vision call for speed)
      const quickAnalyses = enrichedClusters.flatMap(c =>
        c.photos.slice(0, 1).map(p => ({
          photoId: p.id,
          faces: [],
          scene: { scene: 'portrait' as const, timeOfDay: 'unknown' as const, season: 'unknown' as const, lighting: 'natural-soft' as const, colorTemp: 0, dominantColors: [] },
          emotion: { intensity: Math.min(10, c.photos.length * 1.5), primary: 'joy' as const, isPeak: c.photos.length > 4, narrativeWeight: Math.min(10, c.photos.length * 2) },
          quality: { score: 7, sharpness: 7, composition: 7, exposure: 7, heroCandidate: c.photos.length > 3, isDuplicate: false },
          storyArc: { position: 'setup' as const, role: 'establishing' as const, captionStyle: 'descriptive' as const },
          tags: [],
          analyzedAt: Date.now(),
        }))
      );
      scoreStoryArc(quickAnalyses);
      console.log(`[Generate] Photo intelligence: scored ${quickAnalyses.length} photos for story arc`);
    } catch {}

    // Generate the Story Manifest via Gemini (3-pass: generate → critique → vibeSkin)
    // If no photos at all, pass a minimal dummy cluster so the AI has something to work with
    const clustersForGeneration = enrichedClusters.length > 0
      ? enrichedClusters
      : [{ photos: [], location: null, startDate: eventDate || new Date().toISOString(), endDate: eventDate || new Date().toISOString() }] as PhotoCluster[];

    // Synthesize occasion-specific context into the vibe string so the AI
    // weaves these details into chapter copy instead of dropping them.
    const occasionContext: string[] = [];
    if (occasion === 'anniversary') {
      if (anniversaryYears) occasionContext.push(`Celebrating ${anniversaryYears} years together.`);
      if (anniversaryMilestone) occasionContext.push(`Milestone: ${anniversaryMilestone}.`);
      if (originalDate) occasionContext.push(`Originally married on ${originalDate}.`);
      if (coupleEvolution) occasionContext.push(`How they've grown: ${coupleEvolution}`);
    }
    if (occasion === 'birthday') {
      if (birthdayAge) occasionContext.push(`Turning ${birthdayAge}.`);
      if (isSurprise) occasionContext.push('This is a surprise party — keep details warm but discreet.');
      if (birthdayPassions) occasionContext.push(`Passions: ${birthdayPassions}`);
      if (birthdayTribute) occasionContext.push(`Tribute notes from loved ones: ${birthdayTribute}`);
    }
    if (occasion === 'engagement') {
      if (proposalStory) occasionContext.push(`Proposal: ${proposalStory}`);
      if (proposalDate) occasionContext.push(`Proposal date: ${proposalDate}.`);
      if (weddingTimeline) occasionContext.push(`Wedding timeline: ${weddingTimeline}.`);
      if (ringDetails) occasionContext.push(`Ring details: ${ringDetails}`);
    }
    if (venueAesthetic) occasionContext.push(`Venue aesthetic: ${venueAesthetic}`);

    const baseVibe = vibeString || `${occasion || 'celebration'} ${names[0]} ${names[1] || ''}`.trim();
    const enrichedVibe = occasionContext.length > 0
      ? `${baseVibe}\n\nADDITIONAL CONTEXT:\n${occasionContext.join('\n')}`
      : baseVibe;

    const manifest = await generateStoryManifest(
      clustersForGeneration,
      enrichedVibe,
      names,
      apiKey,
      session.accessToken,
      occasion,
      eventDate,
      inspirationUrls,  // passed to memory-engine for visual style matching
      layoutFormat,
      undefined,
      selectedPaletteColors,
    );

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
    // If user provided no event details, this clears any hallucinated venues/times.
    manifest.events = events.length > 0 ? events : [];

    // Always reset travelInfo — users fill in real hotels/airports via the editor.
    // Never let AI-hallucinated hotel names reach the published site.
    manifest.travelInfo = { airports: [], hotels: [] };

    // Clear AI-hallucinated FAQs — users add real FAQs in the Details tab.
    manifest.faqs = [];

    // ── Initialize blocks: occasion-aware defaults.
    // Hero + Story are always shown. Remaining blocks are auto-revealed based
    // on what the user supplied during the wizard so they don't have to manually
    // toggle every relevant section after generation.
    {
      const blocks = getDefaultBlocks(occasion ?? 'story', events.length > 0, !!eventDate);
      const hasEvents = events.length > 0;
      const hasDate = !!eventDate;
      const hasRsvp = !!rsvpDeadline;
      const hasRegistry = !!cashFundUrl;
      const revealed = new Set<string>();
      if (hasEvents) revealed.add('event');
      if (hasDate)   revealed.add('countdown');
      if (hasRsvp)   revealed.add('rsvp');
      if (hasRegistry) revealed.add('registry');
      const revealedBlocks = blocks.map((b) =>
        revealed.has(b.type) ? { ...b, visible: true } : b
      );
      // Seed block configs from the wizard's event-details step.
      seedBlocksFromEventDetails(
        revealedBlocks as unknown as import('@/types').PageBlock[],
        occasion,
        eventDetails,
        names,
      );
      manifest.blocks = revealedBlocks as typeof manifest.blocks;
    }

    // Seed theme family from occasion voice — see
    // lib/event-os/theme-family.ts for the mapping.
    if (!manifest.themeFamily) {
      manifest.themeFamily = getDefaultThemeFamily(occasion);
    }

    // Hide sub-pages by default, then unhide the ones backed by user-supplied data
    // so generated sites don't ship with dead nav links to empty pages, but DO ship
    // with nav for pages the couple actually filled in.
    {
      const hidden = new Set<string>(['schedule', 'rsvp', 'travel', 'faq', 'registry']);
      if (events.length > 0) hidden.delete('schedule');
      if (rsvpDeadline)      hidden.delete('rsvp');
      if (cashFundUrl)       hidden.delete('registry');
      manifest.hiddenPages = Array.from(hidden);
    }

    // Set top-level logistics fields from user-supplied details
    if (dresscode) {
      manifest.logistics = { ...(manifest.logistics ?? {}), dresscode };
    }
    if (guestNotes) {
      manifest.logistics = { ...(manifest.logistics ?? {}), notes: guestNotes };
    }

    // Stash raw occasion-specific fields on the manifest so editor surfaces and
    // future regenerations can re-use them without re-asking the user.
    if (occasionContext.length > 0) {
      (manifest as unknown as Record<string, unknown>)._occasionDetails = {
        anniversaryYears, anniversaryMilestone, originalDate, coupleEvolution,
        birthdayAge, isSurprise, birthdayPassions, birthdayTribute,
        proposalStory, proposalDate, weddingTimeline, ringDetails, venueAesthetic,
      };
    }

    // Map actual photo URLs + REAL locations into generated chapters.
    // Upload each photo to R2 so URLs don't expire (Google Photos baseUrl ~60min TTL).
    // CRITICAL: cluster location (from GPS or user input) ALWAYS overrides AI hallucination.
    // Trim chapters to cluster count — AI may generate more chapters than clusters provided
    if (manifest.chapters.length > enrichedClusters.length) {
      manifest.chapters = manifest.chapters.slice(0, enrichedClusters.length);
    }
    const uploadLimit = pLimit(8); // max 8 concurrent R2 uploads

    // Pre-upload the first few photos to R2 while the OAuth token is
    // still fresh so `coverPhoto` + `heroSlideshow` land permanent
    // before the client hits save.
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

    // Auto-reveal the photos block whenever the user uploaded photos.
    // The gallery renders by aggregating chapter images, so if any
    // chapter has images it means we have something to show — no
    // reason to leave the block hidden and force users to toggle it
    // on manually in the editor.
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
    // Seed hero media with the freshly-uploaded R2 URLs. Fall back
    // to the original baseUrl silently if upload failed (the
    // /api/sites mirror pass will retry on save).
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

    // Insert a Spotify/YouTube music block if the user pasted a
    // song URL on the wizard's song step.
    if (songUrl && typeof songUrl === 'string' && songUrl.trim().length > 0) {
      const songBlock = {
        id: `spotify-${Date.now()}`,
        type: 'spotify' as const,
        visible: true,
        order: 1,
        config: { url: songUrl.trim() },
      };
      const existing = manifest.blocks || [];
      manifest.blocks = [
        ...existing.map((b) =>
          b.order >= 1 ? { ...b, order: b.order + 1 } : b,
        ),
        songBlock,
      ].sort((a, b) => a.order - b.order);
    }

    // Train voice profile if samples provided
    if (voiceSamples && voiceSamples.length > 0) {
      try {
        const { trainVoiceProfile } = await import('@/lib/voice-engine/trainer');
        const profile = trainVoiceProfile(
          voiceSamples.map((text: string) => ({ text, source: 'freeform' as const })),
          session.user?.email || 'anon',
        );
        manifest.voiceSamples = voiceSamples;
        // Store the trained system prompt for future AI rewrites
        (manifest as unknown as Record<string, unknown>)._voiceSystemPrompt = profile.systemPrompt;
      } catch {}
    }

    // ── Quality evaluation ──────────────────────────────
    const { evaluateQuality: evalQuality } = await import('@/lib/intelligence/quality-eval');
    const qualityReport = evalQuality(manifest);
    console.log(`[Generate] Quality score: ${qualityReport.overallScore}/100 (${qualityReport.passed ? 'PASSED' : 'FLAGGED'})`);
    if (qualityReport.issues.filter(i => i.severity === 'critical').length > 0) {
      console.warn('[Generate] Critical quality issues:', qualityReport.issues.filter(i => i.severity === 'critical').map(i => i.message));
    }

    // Pass 7 — auto-populate functional blocks (FAQ, Registry, Travel)
    // so the published site doesn't ship with empty sections.
    try {
      const { runPass7Content } = await import('@/lib/memory-engine/pass-7-content');
      const { getEventType } = await import('@/lib/event-os/event-types');
      const voice = getEventType(occasion as never)?.voice ?? 'celebratory';
      const baseUrl = (() => {
        try {
          return new URL(req.url).origin;
        } catch {
          return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        }
      })();
      const result = await runPass7Content({
        manifest,
        occasion: occasion ?? 'wedding',
        voice: voice as 'solemn' | 'intimate' | 'ceremonial' | 'playful' | 'celebratory',
        names,
        baseUrl,
      });
      if (result.faqs && result.faqs.length > 0) manifest.faqs = result.faqs;
      if (result.registry) manifest.registry = result.registry;
      if (result.travelInfo) manifest.travelInfo = result.travelInfo;
    } catch (err) {
      console.warn('[Pass 7] Non-fatal failure:', err);
    }

    // Apply the selected template's signature motifs, blockOrder,
    // hiddenBlocks, and (if the manifest doesn't already have one)
    // theme + poetry. The AI passes generate the heart of the manifest;
    // the template layers its voice on top.
    const { applyTemplateToManifest } = await import('@/lib/templates/apply-template');
    const themed = applyTemplateToManifest(manifest, templateId ?? null);

    return NextResponse.json({ manifest: themed });
  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    );
  }
}
