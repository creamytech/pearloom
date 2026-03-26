// ─────────────────────────────────────────────────────────────
// Pearloom / lib/memory-engine.ts — AI story generation
// Upgraded prompt: uses photo metadata (locations, dates,
// cameras, filenames) alongside rich vibe data
// ─────────────────────────────────────────────────────────────

import type { PhotoCluster, StoryManifest, Chapter, ThemeSchema } from '@/types';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';

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

  return `You are the "Memory Engine" for Pearloom, a premium relationship storytelling platform that creates breathtakingly beautiful, deeply personal anniversary/love story websites.

Your job is to generate a COMPLETE Story Manifest JSON that will power a cinematic, editorial-quality website. The quality should rival the most beautiful wedding websites and love story sites on the internet.

## Couple
- Names: ${coupleNames[0]} & ${coupleNames[1]}

## Their Vibe & Personality
${vibeString}

## Photo Clusters (with rich metadata)
${JSON.stringify(clusterSummary, null, 2)}

## CRITICAL INSTRUCTIONS

### Photo Intelligence
- STUDY the photo metadata carefully. File dates reveal the timeline. Locations reveal where they've been.
- Camera models reveal their lifestyle (iPhone = modern/spontaneous, DSLR = intentional/artistic).
- File formats like .HEIC or .DNG suggest high-quality, intentional photography.
- Use photo dates and locations to write narratives that feel REAL and specific, not generic.
- If a cluster is from a specific real location, reference it by name in the chapter description.

### Narrative Quality
- Chapter titles should be EVOCATIVE and specific (NOT generic like "Our Journey Begins"). Examples: "That October Night", "Sunday Mornings with Poppy", "The Rooftop in Brooklyn"
- Descriptions should be intimate, emotionally layered, and sound like they were written by the couple themselves.
- Reference REAL details from their story: how they met, their pets, their favorite places, inside jokes.
- Each chapter should feel like a distinct memory, not a generic timeline entry.
- DO NOT use cliché phrases like "journey", "adventure", "soulmate", "happily ever after" unless the vibe specifically calls for it.

### Theme Design
- The theme MUST feel premium. Think: Vogue editorial, architectural digest, luxury branding.
- Colors should come from the vibe input (including any color palette they chose).
- Heading fonts should be elegant and distinctive (Cormorant Garamond, EB Garamond, Lora, Playfair Display).
- Body fonts should be clean and modern (Inter, Outfit, DM Sans, Work Sans).
- The background should NEVER be pure white. Use warm off-whites (#faf9f6), soft creams, or moody dark tones depending on vibe.

## Output Schema (strict JSON)
Return a JSON object with this exact shape:
{
  "coupleId": "<generate-uuid>",
  "generatedAt": "<current ISO timestamp>",
  "vibeString": "${vibeString.slice(0, 100)}...",
  "theme": {
    "name": "<creative-theme-name>",
    "fonts": { "heading": "<Google Font>", "body": "<Google Font>" },
    "colors": {
      "background": "<hex>",
      "foreground": "<hex>",
      "accent": "<hex>",
      "accentLight": "<hex>",
      "muted": "<hex>",
      "cardBg": "<hex>"
    },
    "borderRadius": "<css value>",
    "elementShape": "<square | rounded | arch | pill>",
    "cardStyle": "<solid | glass | bordered | shadow-heavy>",
    "backgroundPattern": "<none | noise | dots | grid | waves | floral | topography>"
  },
  "chapters": [
    {
      "id": "<uuid>",
      "date": "<ISO date from the cluster's actual date>",
      "title": "<evocative, specific, 2-5 word title>",
      "subtitle": "<one poetic line>",
      "description": "<3-4 sentence intimate narrative that references real details>",
      "images": [],
      "location": { "lat": <number>, "lng": <number>, "label": "<city, state>" } | null,
      "mood": "<one or two word mood>",
      "layout": "<editorial | fullbleed | split | cinematic | gallery>",
      "order": <number>
    }
  ],
  "comingSoon": {
    "enabled": true,
    "title": "The Next Chapter",
    "subtitle": "<personalized line about their future>",
    "passwordProtected": false
  }
}

Rules:
- Generate exactly one chapter per cluster.
- USE the actual dates and locations from the photo metadata when setting chapter dates and locations.
- All text must use proper capitalization.
- The theme colors MUST complement the vibe. If they chose a color palette, base your colors on it.
- Font choices must feel premium and intentional.
- OCCASION AWARENESS: Check the 'Occasion' in the vibe data. If it's a Wedding/Engagement, make the 'comingSoon' section about their upcoming wedding date and save-the-date details. If it's an Anniversary or Story, make it a poetic nod to 'The Next Chapter'. If it's a Birthday, make it a heartfelt birthday wish!
- CRITICAL: Assign a DIFFERENT layout to each chapter. Vary between: "editorial" (photo + text side-by-side), "fullbleed" (cinematic hero-style photo with text overlay), "split" (contained card layout), "cinematic" (quote-style text-focused), "gallery" (multi-image grid). 
- The first chapter should be "editorial" or "fullbleed" for maximum impact.
- Never use the same layout for consecutive chapters.
- Use "cinematic" for the most emotional/intimate chapters.
- Use "fullbleed" for chapters with strong visual moments (vacations, scenery).
- Use "gallery" when there are multiple photos in a cluster.
- VISUAL ANALYSIS: You have been provided with exactly one representative image for each cluster, appended in sequential order. YOU MUST LOOK AT THE IMAGES to see who is in the photo, what they are wearing, what the environment is (e.g. if they are on a boat, in front of a landmark, indoor vs outdoor), and write the description based on the ACTUAL visual contents! Ignore location metadata or vibe strings if the photo clearly contradicts it.`;
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
