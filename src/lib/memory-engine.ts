// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Pearloom / lib/memory-engine.ts â€” AI story generation
// Upgraded prompt: uses photo metadata (locations, dates,
// cameras, filenames) alongside rich vibe data
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

import type { PhotoCluster, StoryManifest, Chapter, ThemeSchema } from '@/types';
import { generateVibeSkin, WAVE_PATHS } from '@/lib/vibe-engine';
import type { VibeSkin } from '@/lib/vibe-engine';

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
  googleAccessToken?: string,
  occasion?: string
): Promise<StoryManifest> {
  const prompt = buildPrompt(clusters, vibeString, coupleNames, occasion);

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
      background: '#F5F1E8',
      foreground: '#2B2B2B',
      accent: '#A3B18A',
      accentLight: '#EEE8DC',
      muted: '#9A9488',
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

  // ── Pass 2: Generate vibeSkin (visual design + custom SVG art) ────────
  // Bake the full visual skin in-process before critique.
  try {
    const vibeSkin = await generateVibeSkin(manifest.vibeString, coupleNames, apiKey);
    manifest.vibeSkin = vibeSkin;
    console.log('[Memory Engine] Pass 2: VibeSkin generated');
  } catch (err) {
    console.warn('[Memory Engine] VibeSkin generation failed (non-fatal):', err);
  }

  // ── Pass 3: Design critique & iterative refinement ───────────────────
  // Gemini reviews its own visual design for thematic specificity.
  // Colors, SVG art, section labels, icons — all scored and patched
  // if too generic before the user ever sees the result.
  if (manifest.vibeSkin) {
    try {
      manifest.vibeSkin = await critiqueAndRefineDesign(
        manifest.vibeSkin, manifest.vibeString, coupleNames, apiKey
      );
      console.log('[Memory Engine] Pass 3: Design critique complete');
    } catch (err) {
      console.warn('[Memory Engine] Design critique pass failed (non-fatal):', err);
    }
  }

  // ── Pass 4: Poetry pass ────────────────────────────────────────────────
  // Lightweight Gemini call that generates the hero tagline, footer closing
  // line, and RSVP intro — all personalized to this couple's specific story.
  try {
    manifest.poetry = await generatePoetryPass(
      manifest.vibeString, coupleNames, manifest.chapters, apiKey
    );
    console.log('[Memory Engine] Pass 4: Poetry pass complete');
  } catch (err) {
    console.warn('[Memory Engine] Poetry pass failed (non-fatal):', err);
  }

  return manifest;
}

// ── Pass 4: Poetry pass ───────────────────────────────────────────────
// Lightweight Gemini call that generates 3 couple-specific text pieces:
//   heroTagline — 5-8 word poetic subtitle for the hero section
//   closingLine — 10-15 word footer closing line
//   rsvpIntro   — warm, personal 1-2 sentence intro for the RSVP section
async function generatePoetryPass(
  vibeString: string,
  coupleNames: [string, string] | undefined,
  chapters: import('@/types').Chapter[],
  apiKey: string
): Promise<{ heroTagline: string; closingLine: string; rsvpIntro: string }> {
  const namesCtx = coupleNames ? `${coupleNames[0]} & ${coupleNames[1]}` : 'this couple';

  // Pull a few chapter titles to give Gemini narrative context
  const chapterTitles = chapters.slice(0, 4).map(c => c.title).join(', ');

  const poetryPrompt = `You are a poet writing for ${namesCtx}'s wedding website on Pearloom.
Their vibe: "${vibeString}"
Their story chapters include: ${chapterTitles || 'the beginning of their love'}

Write 3 short pieces of text — each must be specific to THIS couple, not generic:

1. heroTagline: A 5-8 word poetic subtitle for their hero section. Should feel like a beautiful line from a literary novel or indie film. NOT "A love story written in stars" or other cliches. Reference their actual vibe.
   Examples: "A love story written in light", "Where the mountains remembered everything", "Two people who chose the long way home"

2. closingLine: A 10-15 word closing line for their site footer. Warm, intimate, final. References their story or vibe.
   Examples: "Two threads, one loom, forever woven in light", "Here is where we began. Here is where we stay."

3. rsvpIntro: A warm, personal 1-2 sentence intro for their RSVP section. Should feel written by the couple, inviting their guests with genuine warmth and a specific nod to their celebration.

Return ONLY valid JSON:
{
  "heroTagline": "<5-8 word poetic subtitle>",
  "closingLine": "<10-15 word closing footer line>",
  "rsvpIntro": "<1-2 warm, personal sentences inviting guests to RSVP>"
}`;

  const res = await geminiRetryFetch(
    `${GEMINI_API_BASE}?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: poetryPrompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 1.0,
          maxOutputTokens: 512,
        },
      }),
    }
  );

  if (!res.ok) throw new Error(`Poetry pass API ${res.status}`);

  const data = await res.json();
  let raw: string = (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}').trim()
    .replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
    .replace(/,\s*([}\]])/g, '$1');

  const result = JSON.parse(raw) as {
    heroTagline?: string;
    closingLine?: string;
    rsvpIntro?: string;
  };

  return {
    heroTagline: typeof result.heroTagline === 'string' && result.heroTagline.length > 0
      ? result.heroTagline : 'A love story worth every page',
    closingLine: typeof result.closingLine === 'string' && result.closingLine.length > 0
      ? result.closingLine : 'Thank you for being part of our story.',
    rsvpIntro: typeof result.rsvpIntro === 'string' && result.rsvpIntro.length > 0
      ? result.rsvpIntro : "We can't wait to celebrate with you. Please let us know if you'll be joining us.",
  };
}

// ── Design critique & iterative refinement pass ───────────────────────
// Gemini reviews the VibeSkin it just generated and asks:
//   "Is this design truly specific to this couple's world,
//    or could it belong to any wedding site?"
// Scores each dimension 1-10 and patches any below 7.
async function critiqueAndRefineDesign(
  skin: VibeSkin,
  vibeString: string,
  coupleNames: [string, string] | undefined,
  apiKey: string
): Promise<VibeSkin> {

  const namesCtx = coupleNames ? `${coupleNames[0]} & ${coupleNames[1]}` : 'this couple';

  const critiquePrompt = `You are a senior art director and brand strategist reviewing an AI-generated wedding website design for ${namesCtx}.

Their vibe: "${vibeString}"

Current design spec:
- Visual tone: ${skin.tone}
- Curve/shape language: ${skin.curve}
- Color accent: ${skin.particleColor}
- Primary motif: ${skin.accentSymbol}
- Decorative icons: ${skin.decorIcons.join(' ')}
- Divider quote: "${skin.dividerQuote}"
- Section labels: ${JSON.stringify(skin.sectionLabels, null, 2)}
- Custom SVG art generated: ${[skin.heroPatternSvg, skin.sectionBorderSvg, skin.medallionSvg].filter(Boolean).length}/3 pieces

Your job: Score each of these dimensions 1-10 for how SPECIFIC and UNIQUE they feel to "${vibeString}" (vs. being generic wedding defaults):
1. particleColor — does this hex feel emotionally tied to their specific vibe world?
2. decorIcons — are these icons thematically tied to their world (not just generic hearts/stars)?  
3. dividerQuote — does this quote feel written FOR them specifically (not a cliche)?
4. sectionLabels — do these feel like a letter written to this couple, not just relabeled defaults?
5. tone — is this the right emotional register for their specific vibe?

If ALL score 7+, return: { "approved": true }

If ANY score below 7, return ONLY the fields that need improvement:
{
  "approved": false,
  "reason": "<single sentence: what's the weakest point>",
  "improvements": {
    "particleColor": "<more evocative hex if needed>",
    "accentSymbol": "<more thematically specific symbol if needed>",
    "decorIcons": ["<5 icons tightly tied to their specific vibe world>"],
    "dividerQuote": "<original quote that could only be for THIS couple — intimate, specific, under 14 words>",
    "tone": "<corrected tone if needed — dreamy|playful|luxurious|wild|intimate|cosmic|rustic>",
    "curve": "<corrected curve if needed — organic|arch|geometric|wave|petal>",
    "sectionLabels": {
      "story": "<poetic label that fits their vibe>",
      "events": "<label>",
      "registry": "<label>",
      "travel": "<label>",
      "faqs": "<label>",
      "rsvp": "<personal invitation in their voice>"
    }
  }
}

Return ONLY valid JSON. No markdown. No backticks.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: critiquePrompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.75,
          maxOutputTokens: 2048,
        },
      }),
    }
  );

  if (!res.ok) throw new Error(`Design critique API \${res.status}`);

  const data = await res.json();
  let raw: string = (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}').trim()
    .replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
    .replace(/,\s*([}\]])/g, '$1');

  const result = JSON.parse(raw) as {
    approved?: boolean;
    reason?: string;
    improvements?: Partial<VibeSkin & { sectionLabels: VibeSkin['sectionLabels'] }>;
  };

  if (result.approved) {
    console.log('[Design Critique] Design approved — thematically specific, no changes needed');
    return skin;
  }

  const imp = result.improvements ?? {};
  console.log(`[Design Critique] Refining design: \${result.reason || 'generic elements detected'}`);

  const VALID_CURVES: VibeSkin['curve'][] = ['organic', 'arch', 'geometric', 'wave', 'petal'];
  const VALID_TONES: VibeSkin['tone'][] = ['dreamy', 'playful', 'luxurious', 'wild', 'intimate', 'cosmic', 'rustic'];

  const curve: VibeSkin['curve'] = (imp.curve && VALID_CURVES.includes(imp.curve as VibeSkin['curve']))
    ? imp.curve as VibeSkin['curve'] : skin.curve;
  const waveDef = WAVE_PATHS[curve];

  return {
    ...skin,
    curve,
    wavePath: waveDef.d,
    wavePathInverted: waveDef.di,
    ...(imp.tone && VALID_TONES.includes(imp.tone as VibeSkin['tone']) ? { tone: imp.tone as VibeSkin['tone'] } : {}),
    ...(imp.particle ? { particle: imp.particle } : {}),
    ...(imp.particleColor ? { particleColor: imp.particleColor } : {}),
    ...(imp.accentSymbol ? { accentSymbol: imp.accentSymbol } : {}),
    ...(Array.isArray(imp.decorIcons) && imp.decorIcons.length >= 3
      ? { decorIcons: imp.decorIcons.slice(0, 5) } : {}),
    ...(imp.dividerQuote ? { dividerQuote: imp.dividerQuote } : {}),
    ...(imp.sectionLabels ? {
      sectionLabels: { ...skin.sectionLabels, ...imp.sectionLabels }
    } : {}),
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
  coupleNames: [string, string],
  occasion?: string
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

  const occ = occasion || 'wedding';
  const occasionLabels: Record<string, string> = {
    wedding: 'a breathtaking wedding website with ceremony & reception events',
    engagement: 'a stunning engagement announcement & celebration website',
    anniversary: 'a beautiful anniversary celebration documenting years of love',
    birthday: 'a joyful birthday celebration gift website',
    story: 'a deeply personal love story documentary website',
  };
  const ctxLabel = occasionLabels[occ] || occasionLabels.wedding;
  const occCap = occ.charAt(0).toUpperCase() + occ.slice(1);

  return `You are the "Memory Engine" for Pearloom \u2014 a world-class storytelling AI that crafts ${ctxLabel}. Your output powers a live, editorial-quality website. It must be stunning.

## The Couple / Honorees
- Names: ${coupleNames[0]} & ${coupleNames[1]}
- Occasion type: ${occCap}

## Their Vibe & Personality
${vibeString}

## Photo Clusters (rich metadata)
${JSON.stringify(clusterSummary, null, 2)}

---
## NARRATIVE QUALITY STANDARDS (non-negotiable)

### Titles â€” Be SPECIFIC, evocative, poetic (3-6 words max)
âœ… Good: "That October Night", "Sundays with Poppy", "The Rooftop, Brooklyn", "Her Terrible Fake Laugh", "How It Started"
âŒ Bad: "Our Journey Begins", "Beautiful Memories", "The Start of Us", "First Meeting", "A New Chapter"

Titles must feel like chapter headings from a memoir or short film. They should surprise the reader, not telegraph the obvious.

### Descriptions â€” Write in FIRST PERSON PLURAL, from inside the memory
- 3â€“4 sentences, intimate and specific
- ALWAYS use "We", "us", "our" â€” written as if the couple themselves are narrating
- Include SENSORY DETAILS: what the weather was, what song was playing, the smell of the place, the texture of the moment
- Reference REAL details from their vibe: pets, restaurants, inside jokes, places, rituals
- Never use: "journey", "adventure", "soulmate", "fairy tale", "happily ever after", "storybook"
- DO use: specific sensory experiences, honest emotions, humor if it fits the vibe
- Each chapter description should feel like it could ONLY belong to this couple

### EMOTIONAL ARC â€” The chapters must have a narrative through-line
- First 1-2 chapters: wonder, excitement, the spark â€” "We found ourselves..."
- Middle chapters: growth, discovery, challenge overcome â€” "We learned..."
- Final 1-2 chapters: certainty, commitment, coming home â€” "We knew..."

### Chapter count: Minimum 3, Maximum 7

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
- Background: NEVER pure white. Use warm off-whites (#F5F1E8), soft creams, moody deep tones, dusty greens, rose blush â€” whatever fits the vibe
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
      colors: { background: '#F5F1E8', foreground: '#2B2B2B', accent: '#A3B18A', accentLight: '#EEE8DC', muted: '#9A9488', cardBg: '#ffffff' },
      borderRadius: '1rem',
    };
  }
}

