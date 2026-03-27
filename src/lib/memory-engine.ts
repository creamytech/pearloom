// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Pearloom / lib/memory-engine.ts â€” AI story generation
// Upgraded prompt: uses photo metadata (locations, dates,
// cameras, filenames) alongside rich vibe data
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

import type { PhotoCluster, StoryManifest, Chapter, ThemeSchema } from '@/types';
import { generateVibeSkin } from '@/lib/vibe-engine';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';

/**
 * Wraps a Gemini fetch with automatic retry on 503 (UNAVAILABLE) and 429 (rate limit).
 * Uses exponential back-off: 2s â†’ 4s â†’ 8s (max 3 attempts).
 */
async function geminiRetryFetch(
  url: string,
  init: RequestInit,
  maxAttempts = 3
): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(url, init);
    if (res.status === 503 || res.status === 429) {
      const retryAfter = res.headers.get('Retry-After');
      const backoff = retryAfter ? parseInt(retryAfter, 10) * 1000 : Math.pow(2, attempt) * 1000;
      if (attempt < maxAttempts) {
        console.warn(`[Memory Engine] Gemini ${res.status} â€” retrying in ${backoff / 1000}s (attempt ${attempt}/${maxAttempts})...`);
        await new Promise(resolve => setTimeout(resolve, backoff));
        continue;
      }
      lastError = new Error(`Gemini API temporarily unavailable (${res.status}). Please try again in a moment.`);
      throw lastError;
    }
    return res;
  }
  throw lastError ?? new Error('Gemini request failed after max retries');
}

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

  console.log('[Memory Engine] Sending request to Gemini...');
  const res = await geminiRetryFetch(`${GEMINI_API_BASE}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.75,
        maxOutputTokens: 16384,
        topP: 0.95,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  let rawText: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';

  // â”€â”€ Robust JSON extraction â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // 1. Strip leading/trailing whitespace
  rawText = rawText.trim();

  // 2. Strip markdown code fences (```json ... ``` or ``` ... ```)
  rawText = rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  // 3. If the response has stray text before the JSON object, find '{'
  const firstBrace = rawText.indexOf('{');
  if (firstBrace > 0) {
    rawText = rawText.slice(firstBrace);
  }

  // 4. If JSON is truncated (Gemini hit token limit), try to close it
  // Count open braces â€” if unbalanced, append closing braces
  const openBraces = (rawText.match(/"/g) || []).length;
  if (openBraces % 2 !== 0) {
    // Truncated mid-string â€” cut at last complete field
    const lastGoodComma = rawText.lastIndexOf('\"');
    if (lastGoodComma > 0) rawText = rawText.slice(0, lastGoodComma + 1);
  }

  // 5. Count { vs } â€” append missing closing braces
  let depth = 0;
  for (const ch of rawText) {
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
  }
  if (depth > 0) {
    rawText += '}'.repeat(depth);
  }

  // 6. Remove trailing commas before } or ] (common Gemini mistake)
  rawText = rawText.replace(/,\s*([}\]])/g, '$1');

  let parsed: Partial<StoryManifest>;
  try {
    parsed = JSON.parse(rawText);
  } catch (e) {
    console.error('[memory-engine] Failed to parse Gemini JSON:', e);
    console.error('[memory-engine] Raw text (first 800 chars):', rawText.slice(0, 800));

    // Last resort: try extracting just the chapters array if it's there
    try {
      const chapStart = rawText.indexOf('"chapters"');
      if (chapStart !== -1) {
        const partial = '{' + rawText.slice(chapStart);
        parsed = JSON.parse(partial + '}');
        console.warn('[memory-engine] Recovered partial manifest (chapters only)');
      } else {
        throw new Error('no chapters');
      }
    } catch {
      throw new Error('AI returned invalid JSON. Please try again.');
    }
  }

  // Defensive defaults â€” ensure every required field exists before the editor renders
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

  let manifest: StoryManifest = {
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

  // â”€â”€â”€ CRITICAL: Hydrate chapter images from source clusters â”€â”€â”€
  // The AI always returns `images: []`. We post-process here to
  // match each chapter back to its source cluster by date range
  // and inject the real photo URLs.
  manifest.chapters = hydrateChapterImages(manifest.chapters, clusters);

  manifest.chapters = manifest.chapters
    .sort((a: Chapter, b: Chapter) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((ch: Chapter, i: number) => ({ ...ch, order: i }));

  // ── Pass 2: Gemini self-critique + refinement ─────────────────────
  // A second Gemini call reviews the output and patches weak chapters
  // before the user ever sees the result.
  try {
    manifest = await critiqueAndRefineManifest(manifest, apiKey);

  } catch (err) {
    console.warn('[Memory Engine] Critique pass failed (non-fatal), using original:', err);
  }

  // ── Pass 3: Bake vibeSkin into manifest ───────────────────────────
  // Generate all custom SVG art and visual skin in-process so it's
  // ready on first render (no separate API call from the client).
  try {
    const vibeSkin = await generateVibeSkin(manifest.vibeString, coupleNames, apiKey);
    manifest.vibeSkin = vibeSkin;
    console.log('[Memory Engine] VibeSkin generated and baked into manifest');
  } catch (err) {
    console.warn('[Memory Engine] VibeSkin generation failed (non-fatal):', err);
  }

  return manifest;
}

// ── Self-critique & refinement pass ───────────────────────────────────────────
// Gemini reviews its own output and patches weak chapters/titles.
async function critiqueAndRefineManifest(
  manifest: StoryManifest,
  apiKey: string
): Promise<StoryManifest> {
  const chapterSummary = (manifest.chapters || []).map((ch, i) => ({
    index: i, id: ch.id, title: ch.title, subtitle: ch.subtitle, description: ch.description, mood: ch.mood,
  }));

  const critiquePrompt = `You are a senior editorial director reviewing a wedding website story draft.

Couple's vibe: "${manifest.vibeString}"
Theme name: ${manifest.theme?.name}

Here are the chapter drafts:
${JSON.stringify(chapterSummary, null, 2)}

Your task: Identify chapters with WEAK titles, descriptions, or subtitles and return ONLY the ones that need improvement.

Quality standards:
- Titles must be specific, evocative, memoir-like — NOT generic ("Our Beautiful Day" = bad)
- Descriptions must have sensory detail and feel written by the couple themselves
- Subtitles must feel like a line from a song or poem, NOT a description
- Mood tags should be specific two-word combinations, not just "romantic" or "happy"

Return JSON:
{
  "patches": [
    {
      "id": "<chapter id>",
      "title": "<improved title if needed, else omit>",
      "subtitle": "<improved subtitle if needed, else omit>",
      "description": "<improved description if needed, else omit>",
      "mood": "<improved mood if needed, else omit>"
    }
  ]
}

Only return patches for chapters that genuinely need improvement. Return empty patches array if everything is already strong. Return ONLY JSON.`;

  const res = await geminiRetryFetch(`${GEMINI_API_BASE}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: critiquePrompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.6,
        maxOutputTokens: 4096,
      },
    }),
  });

  if (!res.ok) throw new Error(`Critique pass API error: ${res.status}`);

  const data = await res.json();
  let raw: string = (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}').trim();
  raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  raw = raw.replace(/,\s*([}\]])/g, '$1');

  const { patches } = JSON.parse(raw) as { patches: Array<{ id: string; title?: string; subtitle?: string; description?: string; mood?: string }> };

  if (!patches?.length) {
    console.log('[Memory Engine] Critique pass: all chapters passed quality review');
    return manifest;
  }

  console.log(`[Memory Engine] Critique pass: patching ${patches.length} chapter(s)`);

  const patchMap = new Map(patches.map(p => [p.id, p]));
  return {
    ...manifest,
    chapters: manifest.chapters.map(ch => {
      const patch = patchMap.get(ch.id);
      if (!patch) return ch;
      return {
        ...ch,
        ...(patch.title ? { title: patch.title } : {}),
        ...(patch.subtitle ? { subtitle: patch.subtitle } : {}),
        ...(patch.description ? { description: patch.description } : {}),
        ...(patch.mood ? { mood: patch.mood } : {}),
      };
    }),
  };
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

      // Exact range match â€” prefer this
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

  return `You are the "Memory Engine" for Pearloom â€” a world-class relationship storytelling AI that crafts breathtakingly personal anniversary and love story websites. Your output powers a live, editorial-quality website. It must be stunning.

## The Couple
- Names: ${coupleNames[0]} & ${coupleNames[1]}

## Their Vibe & Personality
${vibeString}

## Photo Clusters (rich metadata)
${JSON.stringify(clusterSummary, null, 2)}

---
## NARRATIVE QUALITY STANDARDS (non-negotiable)

### Titles â€” Be SPECIFIC, not generic
âœ… Good: "That October Night", "Sundays with Poppy", "The Rooftop, Brooklyn", "Her Terrible Fake Laugh"
âŒ Bad: "Our Journey Begins", "Beautiful Memories", "The Start of Us"

Titles must feel like chapter headings from a memoir or short film. They should surprise the reader, not telegraph the obvious.

### Descriptions â€” Write from inside the memory
- 3â€“4 sentences, intimate and specific
- Sound like the couple themselves wrote it
- Reference REAL details from their vibe: pets, restaurants, inside jokes, places, rituals
- Never use: "journey", "adventure", "soulmate", "fairy tale", "happily ever after", "storybook"
- DO use: sensory details, specific actions, honest emotions, humor if it fits the vibe

### Subtitles â€” One poetic, unusual line
- Should feel like a line from a poem or a song lyric, not a description
- Examples: "the part where everything changed", "neither of us were ready", "in all the best ways"

### Mood Tags â€” Short, evocative, lowercase
- Examples: golden hour, late night, mountain air, lazy sunday, first winter
- Avoid generic: romantic, happy, fun

---
## THEME DESIGN
- Must feel PREMIUM: think Vogue editorial, Kinfolk magazine, Architectural Digest, luxury stationery
- Colors come from the vibe input. If a specific palette or hex was mentioned, use it
- Heading fonts: Cormorant Garamond, EB Garamond, Lora, Playfair Display, Libre Baskerville
- Body fonts: Inter, Outfit, DM Sans, Work Sans, Nunito (all from Google Fonts)
- Background: NEVER pure white. Use warm off-whites (#faf9f6), soft creams, moody deep tones, dusty greens, rose blush â€” whatever fits the vibe
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
- "fullbleed" â€” use for vacations, outdoor scenery, emotional milestone moments
- "cinematic" â€” use for intimate, quiet, emotionally heavy memories
- "gallery" â€” ONLY when a cluster has 3+ images
- "mosaic" â€” use when a cluster has 3â€“5 fun, casual, varied photos (travels, gatherings)
- "split" â€” use for date nights, events, or moments with one strong photo
- "editorial" â€” versatile; use as a reset between heavy layouts
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
    "name": "<creative theme name â€” e.g. 'Warm Ivory', 'Midnight Sage', 'Nordic Blush'>",
    "fonts": { "heading": "<Google Font>", "body": "<Google Font>" },
    "colors": {
      "background": "<hex â€” warm off-white or moody dark>",
      "foreground": "<hex>",
      "accent": "<hex â€” warm, saturated but not neon>",
      "accentLight": "<hex â€” very light version of accent for tints>",
      "muted": "<hex â€” readable grey or warm neutral>",
      "cardBg": "<hex â€” slightly lighter/darker than background>"
    },
    "borderRadius": "<css value, e.g. '0.75rem'>",
    "elementShape": "<square | rounded | arch | pill>",
    "cardStyle": "<solid | glass | bordered | shadow-heavy>",
    "backgroundPattern": "<none | noise | dots | grid | waves | floral | topography>"
  },
  "chapters": [
    {
      "id": "<uuid>",
      "date": "<ISO date â€” REAL date from photo metadata>",
      "title": "<evocative, specific, 2â€“5 words>",
      "subtitle": "<one poetic, unusual line â€” not a description>",
      "description": "<3â€“4 sentences, intimate, specific, written as if by the couple>",
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
      "date": "<ISO 8601 date â€” infer from vibeString or use a placeholder like 2025-06-15>",
      "time": "4:00 PM",
      "endTime": "5:00 PM",
      "venue": "<infer a beautiful venue name from the vibe â€” e.g. 'The Garden Pavilion'>",
      "address": "<make a plausible address or leave as 'Location TBA'>",
      "description": "<one warm sentence about what to expect>",
      "dressCode": "<infer from vibe â€” 'Black Tie', 'Garden Party Chic', 'Cocktail Attire', etc.>",
      "mapUrl": null
    },
    {
      "id": "<uuid>",
      "name": "Reception",
      "date": "<same date as ceremony>",
      "time": "6:00 PM",
      "endTime": "11:00 PM",
      "venue": "<reception venue â€” can be same or different>",
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
      "answer": "<infer from vibe â€” intimate adult-only or family friendly>",
      "order": 1
    },
    {
      "id": "<uuid>",
      "question": "What should I wear?",
      "answer": "<match the dress code from events â€” expand with mood-appropriate style tips>",
      "order": 2
    },
    {
      "id": "<uuid>",
      "question": "When is the RSVP deadline?",
      "answer": "<suggest 4â€“6 weeks before the event date>",
      "order": 3
    }
  ],
  "travelInfo": {
    "airports": ["<1â€“2 plausible nearby airports based on vibe/location â€” e.g. 'JFK - John F. Kennedy International'>"],
    "hotels": [
      {
        "name": "<suggest a premium hotel name matching the vibe>",
        "address": "<plausible address>",
        "bookingUrl": null,
        "groupRate": "Ask for the wedding block rate",
        "notes": "<one warm sentence about the hotel â€” proximity, amenities, atmosphere>"
      }
    ],
    "parkingInfo": "<brief parking guidance>",
    "directions": "<brief directions hint â€” e.g. 'Take I-95 N to Exit 12, follow signs for the waterfront district'>"
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
    "subtitle": "<one personalized line â€” wedding date, birthday wish, or poetic nod to their future>",
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

  const res = await geminiRetryFetch(`${GEMINI_API_BASE}?key=${apiKey}`, {
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
  let themeRaw: string = (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}').trim();
  themeRaw = themeRaw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  const firstBrace = themeRaw.indexOf('{');
  if (firstBrace > 0) themeRaw = themeRaw.slice(firstBrace);
  themeRaw = themeRaw.replace(/,\s*([}\]])/g, '$1');
  try {
    return JSON.parse(themeRaw);
  } catch {
    console.warn('[generateThemeFromVibe] Parse failed, returning default theme');
    return {
      name: 'Warm Ivory',
      fonts: { heading: 'Playfair Display', body: 'Inter' },
      colors: { background: '#faf9f6', foreground: '#1a1a1a', accent: '#b8926a', accentLight: '#f3e8d8', muted: '#8c8c8c', cardBg: '#ffffff' },
      borderRadius: '1rem',
    };
  }
}

