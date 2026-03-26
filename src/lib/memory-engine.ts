// ─────────────────────────────────────────────────────────────
// Pearloom / lib/memory-engine.ts — AI story generation
// Upgraded prompt: uses photo metadata (locations, dates,
// cameras, filenames) alongside rich vibe data
// ─────────────────────────────────────────────────────────────

import type { PhotoCluster, StoryManifest, Chapter, ThemeSchema } from '@/types';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent';

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
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';

  const manifest: StoryManifest = JSON.parse(rawText);

  manifest.chapters = manifest.chapters
    .sort((a: Chapter, b: Chapter) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((ch: Chapter, i: number) => ({ ...ch, order: i }));

  return manifest;
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
5. Does the vibeString quote feel poetic and site-worthy?`;
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
