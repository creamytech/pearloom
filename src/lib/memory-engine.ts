// ─────────────────────────────────────────────────────────────
// Pearloom / lib/memory-engine.ts — AI story generation
// Upgraded prompt: uses photo metadata (locations, dates,
// cameras, filenames) alongside rich vibe data
// ─────────────────────────────────────────────────────────────

import type { PhotoCluster, StoryManifest, Chapter, ThemeSchema } from '@/types';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent';

/**
 * Sends photo clusters + vibe string to Gemini
 * and returns a fully structured Story Manifest.
 */
export async function generateStoryManifest(
  clusters: PhotoCluster[],
  vibeString: string,
  coupleNames: [string, string],
  apiKey: string,
  googleAccessToken?: string
): Promise<StoryManifest> {
  const prompt = buildPrompt(clusters, vibeString, coupleNames);

  // Build the multimodal parts array
  const parts: Record<string, unknown>[] = [{ text: prompt }];

  // If we have an access token, fetch 1 representative image per cluster to show Gemini
  if (googleAccessToken) {
    console.log(`[Memory Engine] Fetching up to ${clusters.length} images for Multimodal AI analysis...`);
    const imagePromises = clusters.map(async (cluster) => {
      const bestPhoto = cluster.photos[0];
      if (!bestPhoto?.baseUrl) return null;
      
      try {
        const isGoogle = bestPhoto.baseUrl.includes('googleusercontent.com');
        const fetchUrl = isGoogle ? `${bestPhoto.baseUrl}=w1024-h1024` : bestPhoto.baseUrl;
        const headers = isGoogle && googleAccessToken ? { Authorization: `Bearer ${googleAccessToken}` } : undefined;

        const res = await fetch(fetchUrl, { headers });
        
        if (!res.ok) {
          console.warn(`[Memory Engine] Failed to fetch image: ${res.status} ${res.statusText}`);
          return null;
        }
        
        const arrayBuffer = await res.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        
        // Gemini STRICTLY rejects application/octet-stream. Force it to image/jpeg if it's missing or generic.
        let mimeType = bestPhoto.mimeType || 'image/jpeg';
        if (mimeType === 'application/octet-stream' || !mimeType.startsWith('image/')) {
          mimeType = 'image/jpeg';
        }
        
        return {
          inlineData: {
            data: base64,
            mimeType,
          }
        };
      } catch (err) {
        console.warn('Failed to fetch image for Gemini:', err);
        return null;
      }
    });

    const resolvedImages = await Promise.all(imagePromises);
    resolvedImages.forEach((imgData, index) => {
      if (imgData) {
        // Interleave text markers so Gemini knows which cluster this image belongs to
        parts.push({ text: `\n\n--- Image for Cluster ${index} ---` });
        parts.push(imgData);
      }
    });
    console.log(`[Memory Engine] Successfully appended images to Gemini prompt!`);
  }

  const res = await fetch(`${GEMINI_API_BASE}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.8,
        maxOutputTokens: 8192,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  let rawText: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';

  // Strip markdown code fences — Gemini sometimes wraps JSON in ```json ... ```
  rawText = rawText.trim();
  if (rawText.startsWith('```')) {
    rawText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  }

  let parsed: Partial<StoryManifest>;
  try {
    parsed = JSON.parse(rawText);
  } catch (e) {
    console.error('[memory-engine] Failed to parse Gemini JSON:', e);
    console.error('[memory-engine] Raw text sample:', rawText.slice(0, 500));
    throw new Error('AI returned invalid JSON. Please try again.');
  }

  // Defensive defaults — ensure every required field exists before the editor renders
  const DEFAULT_THEME = {
    name: 'pearloom-ivory',
    fonts: { heading: 'Playfair Display', body: 'Inter' },
    colors: {
      background: '#faf9f6',
      foreground: '#1a1a1a',
      accent: '#b8926a',
      accentLight: '#f3e8d8',
      muted: '#8c8c8c',
      cardBg: '#ffffff',
    },
    borderRadius: '1rem',
  };

  const manifest: StoryManifest = {
    coupleId: parsed.coupleId || `couple-${Date.now()}`,
    generatedAt: parsed.generatedAt || new Date().toISOString(),
    vibeString: parsed.vibeString || '',
    theme: parsed.theme ?? DEFAULT_THEME,
    chapters: Array.isArray(parsed.chapters) ? parsed.chapters : [],
    comingSoon: parsed.comingSoon ?? {
      enabled: false,
      title: 'Coming Soon',
      subtitle: 'Something beautiful is on its way.',
      passwordProtected: false,
    },
    logistics: parsed.logistics,
    registry: parsed.registry,
    events: parsed.events,
    faqs: parsed.faqs,
    travelInfo: parsed.travelInfo,
  };

  // Ensure theme has all required color keys
  manifest.theme = {
    ...DEFAULT_THEME,
    ...manifest.theme,
    colors: {
      ...DEFAULT_THEME.colors,
      ...(manifest.theme?.colors || {}),
    },
    fonts: {
      ...DEFAULT_THEME.fonts,
      ...(manifest.theme?.fonts || {}),
    },
  };

  // ─── CRITICAL: Hydrate chapter images from source clusters ───
  // The AI always returns `images: []`. We post-process here to
  // match each chapter back to its source cluster by date range
  // and inject the real photo URLs.
  manifest.chapters = hydrateChapterImages(manifest.chapters, clusters);

  manifest.chapters = manifest.chapters
    .sort((a: Chapter, b: Chapter) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((ch: Chapter, i: number) => ({ ...ch, order: i }));

  return manifest;
}

/**
 * Matches AI-generated chapters back to their source photo clusters
 * by date proximity, then injects ChapterImage[] from the cluster's photos.
 * Each photo gets a { id, url, alt, width, height } record.
 */
function hydrateChapterImages(
  chapters: Chapter[],
  clusters: PhotoCluster[]
): Chapter[] {
  if (!clusters.length) return chapters;

  return chapters.map((chapter) => {
    // Find the cluster whose date range contains or is nearest to the chapter date
    const chapterTime = new Date(chapter.date).getTime();

    let bestCluster: PhotoCluster | null = null;
    let bestDelta = Infinity;

    for (const cluster of clusters) {
      const start = new Date(cluster.startDate).getTime();
      const end = new Date(cluster.endDate).getTime();
      const mid = (start + end) / 2;

      // Exact range match — prefer this
      if (chapterTime >= start - 86_400_000 && chapterTime <= end + 86_400_000) {
        bestCluster = cluster;
        break;
      }

      // Otherwise track nearest midpoint
      const delta = Math.abs(chapterTime - mid);
      if (delta < bestDelta) {
        bestDelta = delta;
        bestCluster = cluster;
      }
    }

    if (!bestCluster) return chapter;

    // Build ChapterImage[] from the cluster's photos
    // Limit to 6 per chapter to keep the UI clean
    const images: import('@/types').ChapterImage[] = bestCluster.photos
      .slice(0, 6)
      .map((photo) => ({
        id: photo.id,
        // Google Photos: append size params. Local uploads: already a data URL
        url: photo.baseUrl.includes('googleusercontent.com')
          ? `${photo.baseUrl}=w1600-h1600`
          : photo.baseUrl,
        alt: photo.description || photo.filename || chapter.title,
        width: photo.width || 1600,
        height: photo.height || 1200,
      }));

    return { ...chapter, images };
  });
}

function buildPrompt(
  clusters: PhotoCluster[],
  vibeString: string,
  coupleNames: [string, string]
): string {
  // Build richly detailed cluster summaries including per-photo metadata
  const clusterSummary = clusters.map((c, i) => {
    const photoDetails = c.photos.map(p => ({
      filename: p.filename,
      date: p.creationTime?.slice(0, 10),
      camera: [p.cameraMake, p.cameraModel].filter(Boolean).join(' ') || 'unknown',
      dimensions: `${p.width}x${p.height}`,
      mimeType: p.mimeType,
    }));

    return {
      clusterIndex: i,
      dateRange: `${c.startDate.slice(0, 10)} to ${c.endDate.slice(0, 10)}`,
      photoCount: c.photos.length,
      location: c.location?.label || 'unknown location',
      photos: photoDetails,
    };
  });

  return `You are the "Memory Engine" for Pearloom — a world-class relationship storytelling AI that crafts breathtakingly personal anniversary and love story websites. Your output powers a live, editorial-quality website. It must be stunning.

## The Couple
- Names: ${coupleNames[0]} & ${coupleNames[1]}

## Their Vibe & Personality
${vibeString}

## Photo Clusters (rich metadata)
${JSON.stringify(clusterSummary, null, 2)}

---
## NARRATIVE QUALITY STANDARDS (non-negotiable)

### Titles — Be SPECIFIC, not generic
✅ Good: "That October Night", "Sundays with Poppy", "The Rooftop, Brooklyn", "Her Terrible Fake Laugh"
❌ Bad: "Our Journey Begins", "Beautiful Memories", "The Start of Us"

Titles must feel like chapter headings from a memoir or short film. They should surprise the reader, not telegraph the obvious.

### Descriptions — Write from inside the memory
- 3–4 sentences, intimate and specific
- Sound like the couple themselves wrote it
- Reference REAL details from their vibe: pets, restaurants, inside jokes, places, rituals
- Never use: "journey", "adventure", "soulmate", "fairy tale", "happily ever after", "storybook"
- DO use: sensory details, specific actions, honest emotions, humor if it fits the vibe

### Subtitles — One poetic, unusual line
- Should feel like a line from a poem or a song lyric, not a description
- Examples: "the part where everything changed", "neither of us were ready", "in all the best ways"

### Mood Tags — Short, evocative, lowercase
- Examples: golden hour, late night, mountain air, lazy sunday, first winter
- Avoid generic: romantic, happy, fun

---
## THEME DESIGN
- Must feel PREMIUM: think Vogue editorial, Kinfolk magazine, Architectural Digest, luxury stationery
- Colors come from the vibe input. If a specific palette or hex was mentioned, use it
- Heading fonts: Cormorant Garamond, EB Garamond, Lora, Playfair Display, Libre Baskerville
- Body fonts: Inter, Outfit, DM Sans, Work Sans, Nunito (all from Google Fonts)
- Background: NEVER pure white. Use warm off-whites (#faf9f6), soft creams, moody deep tones, dusty greens, rose blush — whatever fits the vibe
- Contrast must remain readable at all times

---
## VISUAL ANALYSIS
You have been provided with one representative image per cluster. YOU MUST LOOK AT EACH IMAGE to understand:
- Who is in the photo (clothing, energy, context)
- What environment they're in (indoor, outdoor, landmark, specific setting)
- What the emotional register of the moment is

WRITE DESCRIPTIONS BASED ON WHAT YOU ACTUALLY SEE. If the location metadata says "Unknown" but you can clearly see they're at a ski mountain, write about the mountain. Never gaslighting the couple with incorrect descriptions.

If a cluster location is unknown, deduce it from the visual. Do NOT hallucinate a location based on the vibe string alone.

---
## LAYOUT ROTATION RULES
Available layouts: "editorial", "fullbleed", "split", "cinematic", "gallery", "mosaic"

- Chapter 1: ALWAYS "editorial" or "fullbleed" (maximum visual impact)
- Chapter 2: NEVER the same as chapter 1
- "fullbleed" — use for vacations, outdoor scenery, emotional milestone moments
- "cinematic" — use for intimate, quiet, emotionally heavy memories
- "gallery" — ONLY when a cluster has 3+ images
- "mosaic" — use when a cluster has 3–5 fun, casual, varied photos (travels, gatherings)
- "split" — use for date nights, events, or moments with one strong photo
- "editorial" — versatile; use as a reset between heavy layouts
- NEVER use the same layout for two consecutive chapters
- Distribute layouts as evenly as possible across all chapters

---
## CHAPTER COUNT
- Generate EXACTLY one chapter per cluster
- Maximum: 8 chapters. If there are more than 8 clusters, intelligently merge the least visually distinct ones into nearby chapters.
- Minimum: 2 chapters

---
## OUTPUT SCHEMA (strict JSON, NO markdown)
Return ONLY this JSON with no additional text:
{
  "coupleId": "<generate-uuid>",
  "generatedAt": "<current ISO timestamp>",
  "vibeString": "${vibeString.slice(0, 120)}",
  "theme": {
    "name": "<creative theme name — e.g. 'Warm Ivory', 'Midnight Sage', 'Nordic Blush'>",
    "fonts": { "heading": "<Google Font>", "body": "<Google Font>" },
    "colors": {
      "background": "<hex — warm off-white or moody dark>",
      "foreground": "<hex>",
      "accent": "<hex — warm, saturated but not neon>",
      "accentLight": "<hex — very light version of accent for tints>",
      "muted": "<hex — readable grey or warm neutral>",
      "cardBg": "<hex — slightly lighter/darker than background>"
    },
    "borderRadius": "<css value, e.g. '0.75rem'>",
    "elementShape": "<square | rounded | arch | pill>",
    "cardStyle": "<solid | glass | bordered | shadow-heavy>",
    "backgroundPattern": "<none | noise | dots | grid | waves | floral | topography>"
  },
  "chapters": [
    {
      "id": "<uuid>",
      "date": "<ISO date — REAL date from photo metadata>",
      "title": "<evocative, specific, 2–5 words>",
      "subtitle": "<one poetic, unusual line — not a description>",
      "description": "<3–4 sentences, intimate, specific, written as if by the couple>",
      "images": [],
      "location": { "lat": <number>, "lng": <number>, "label": "<City, State or Country>" } | null,
      "mood": "<two-word lowercase mood tag>",
      "layout": "<editorial | fullbleed | split | cinematic | gallery | mosaic>",
      "order": <number starting at 0>
    }
  ],
  "events": [
    {
      "id": "<uuid>",
      "name": "Ceremony",
      "date": "<ISO 8601 date — infer from vibeString or use a placeholder like 2025-06-15>",
      "time": "4:00 PM",
      "endTime": "5:00 PM",
      "venue": "<infer a beautiful venue name from the vibe — e.g. 'The Garden Pavilion'>",
      "address": "<make a plausible address or leave as 'Location TBA'>",
      "description": "<one warm sentence about what to expect>",
      "dressCode": "<infer from vibe — 'Black Tie', 'Garden Party Chic', 'Cocktail Attire', etc.>",
      "mapUrl": null
    },
    {
      "id": "<uuid>",
      "name": "Reception",
      "date": "<same date as ceremony>",
      "time": "6:00 PM",
      "endTime": "11:00 PM",
      "venue": "<reception venue — can be same or different>",
      "address": "<address or 'Location TBA'>",
      "description": "<one warm sentence about dancing, dinner, toasts>",
      "dressCode": "<same as ceremony>",
      "mapUrl": null
    }
  ],
  "faqs": [
    {
      "id": "<uuid>",
      "question": "Is there parking available?",
      "answer": "<write a warm, helpful answer based on the venue vibe>",
      "order": 0
    },
    {
      "id": "<uuid>",
      "question": "Are children welcome?",
      "answer": "<infer from vibe — intimate adult-only or family friendly>",
      "order": 1
    },
    {
      "id": "<uuid>",
      "question": "What should I wear?",
      "answer": "<match the dress code from events — expand with mood-appropriate style tips>",
      "order": 2
    },
    {
      "id": "<uuid>",
      "question": "When is the RSVP deadline?",
      "answer": "<suggest 4–6 weeks before the event date>",
      "order": 3
    }
  ],
  "travelInfo": {
    "airports": ["<1–2 plausible nearby airports based on vibe/location — e.g. 'JFK - John F. Kennedy International'>"],
    "hotels": [
      {
        "name": "<suggest a premium hotel name matching the vibe>",
        "address": "<plausible address>",
        "bookingUrl": null,
        "groupRate": "Ask for the wedding block rate",
        "notes": "<one warm sentence about the hotel — proximity, amenities, atmosphere>"
      }
    ],
    "parkingInfo": "<brief parking guidance>",
    "directions": "<brief directions hint — e.g. 'Take I-95 N to Exit 12, follow signs for the waterfront district'>"
  },
  "registry": {
    "enabled": true,
    "cashFundUrl": null,
    "cashFundMessage": "Your presence is the greatest gift. But if you'd like to celebrate us further, we've created a honeymoon fund.",
    "entries": [
      {
        "name": "Zola",
        "url": "https://www.zola.com",
        "note": "Our curated home and experience wishlist"
      }
    ]
  },
  "comingSoon": {
    "enabled": true,
    "title": "<3-5 word section title>",
    "subtitle": "<one personalized line — wedding date, birthday wish, or poetic nod to their future>",
    "passwordProtected": false
  }
}

CRITICAL FINAL CHECKS before returning:
1. Did you use REAL dates from photo metadata? (not fabricated)
2. Are all chapter titles specific and evocative? (not generic)
3. Is the layout sequence varied? (no consecutive duplicates)
4. Is the theme background a warm off-white or moody tone? (not #ffffff)
5. Does the vibeString quote feel poetic and site-worthy?
6. Did you generate both ceremony AND reception events?
7. Did you generate at least 4 FAQs?
8. Did you include travelInfo with at least 1 hotel and 1 airport?`;
}

/**
 * Generates only a ThemeSchema from a vibe string.
 */
export async function generateThemeFromVibe(
  vibeString: string,
  apiKey: string
): Promise<ThemeSchema> {
  const prompt = `Generate a sophisticated, premium color theme for a romantic anniversary website.

Vibe: "${vibeString}"

Return JSON:
{
  "name": "<creative-name>",
  "fonts": { "heading": "<Google Font name>", "body": "<Google Font name>" },
  "colors": {
    "background": "<hex - never pure white>",
    "foreground": "<hex>",
    "accent": "<hex>",
    "accentLight": "<hex>",
    "muted": "<hex>",
    "cardBg": "<hex>"
  },
  "borderRadius": "<css value>"
}

Rules: Use premium Google Fonts only. Colors should be warm, intimate, and high-contrast for readability. Background should be an off-white or warm tone, never #ffffff. No neon or overly bright colors. The palette should feel like a luxury brand.`;

  const res = await fetch(`${GEMINI_API_BASE}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.6,
      },
    }),
  });

  if (!res.ok) throw new Error(`Gemini theme generation failed: ${res.status}`);

  const data = await res.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
  return JSON.parse(rawText);
}
