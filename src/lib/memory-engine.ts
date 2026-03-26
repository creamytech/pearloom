// ─────────────────────────────────────────────────────────────
// everglow / lib/memory-engine.ts — AI story generation
// ─────────────────────────────────────────────────────────────

import type { PhotoCluster, StoryManifest, Chapter, ThemeSchema } from '@/types';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';

/**
 * Sends photo clusters + vibe string to Gemini Flash
 * and returns a fully structured Story Manifest.
 */
export async function generateStoryManifest(
  clusters: PhotoCluster[],
  vibeString: string,
  coupleNames: [string, string],
  apiKey: string
): Promise<StoryManifest> {
  const prompt = buildPrompt(clusters, vibeString, coupleNames);

  const res = await fetch(`${GEMINI_API_BASE}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.7,
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

  // Parse the structured JSON from the model output
  const manifest: StoryManifest = JSON.parse(rawText);

  // Ensure chapter ordering
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
  const clusterSummary = clusters.map((c, i) => ({
    clusterIndex: i,
    dateRange: `${c.startDate.slice(0, 10)} to ${c.endDate.slice(0, 10)}`,
    photoCount: c.photos.length,
    location: c.location?.label || 'unknown location',
    suggestedTitle: c.suggestedTitle || null,
  }));

  return `You are the "Memory Engine" for Pearloom, a premium relationship storytelling platform.

Given the following photo metadata clusters and the couple's personal vibe, generate a complete Story Manifest JSON.

## Couple
- Names: ${coupleNames[0]} & ${coupleNames[1]}
- Vibe: "${vibeString}"

## Photo Clusters
${JSON.stringify(clusterSummary, null, 2)}

## Output Schema (strict JSON)
Return a JSON object with this exact shape:
{
  "coupleId": "<generate-uuid>",
  "generatedAt": "<current ISO timestamp>",
  "vibeString": "${vibeString}",
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
    "borderRadius": "<css value>"
  },
  "chapters": [
    {
      "id": "<uuid>",
      "date": "<ISO date>",
      "title": "<poetic, short title>",
      "subtitle": "<one line>",
      "description": "<2-3 sentence heartfelt narrative>",
      "images": [],
      "location": { "lat": <number>, "lng": <number>, "label": "<city, state>" } | null,
      "mood": "<one or two word mood>",
      "order": <number>
    }
  ],
  "comingSoon": {
    "enabled": true,
    "title": "The Next Chapter",
    "subtitle": "Our story is just beginning...",
    "passwordProtected": false
  }
}

Rules:
- The theme colors must complement the Core Vibe. Keep it sophisticated and minimal.
- If "How we met" is provided, weave that into the hero subtitle or the very first chapter description.
- If "Important details" (like pets or inside jokes) are provided, try to actively weave them into at least one chapter description.
- Chapter titles should be poetic but concise (2-5 words, properly capitalized).
- Descriptions should be sincere and emotionally resonant.
- Generate exactly one chapter per cluster.
- All text should use proper capitalization.
- Font choices should feel premium (e.g. Cormorant Garamond, EB Garamond, Lora for headings; Inter, Outfit, DM Sans for body).`;
}

/**
 * Generates only a ThemeSchema from a vibe string.
 * Useful for the preview page before full manifest generation.
 */
export async function generateThemeFromVibe(
  vibeString: string,
  apiKey: string
): Promise<ThemeSchema> {
  const prompt = `Generate a sophisticated, minimal color theme for a romantic anniversary website.

Vibe: "${vibeString}"

Return JSON:
{
  "name": "<creative-name>",
  "fonts": { "heading": "<Google Font name>", "body": "<Google Font name>" },
  "colors": {
    "background": "<hex>",
    "foreground": "<hex>",
    "accent": "<hex>",
    "accentLight": "<hex>",
    "muted": "<hex>",
    "cardBg": "<hex>"
  },
  "borderRadius": "<css value>"
}

Rules: Use premium Google Fonts only. Colors should be warm, intimate, and high-contrast for readability. No neon or overly bright colors.`;

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
