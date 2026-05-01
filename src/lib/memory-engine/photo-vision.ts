// ─────────────────────────────────────────────────────────────
// Pearloom / lib/memory-engine/photo-vision.ts
//
// Cheap Gemini-Flash vision pass over every photo (not just the
// 6 representatives used in Pass 1). Returns lightweight tags —
// scene type, people count, mood, time-of-day, setting — that
// improve chapter assignment + auto-caption quality beyond what
// EXIF timestamps alone can cluster.
//
// Designed for cost: 1 image per request, model returns a
// 6-field JSON. Failures are non-fatal — if the API rejects or
// times out for a photo, it just gets an empty tag object and
// the pipeline keeps running.
// ─────────────────────────────────────────────────────────────

import type { GooglePhotoMetadata } from '@/types';
import { log, logWarn } from './gemini-client';

export interface PhotoTags {
  sceneType?:
    | 'ceremony'
    | 'reception'
    | 'toast'
    | 'dancing'
    | 'portrait'
    | 'travel'
    | 'food'
    | 'getting-ready'
    | 'family'
    | 'quiet-moment'
    | 'outdoor'
    | 'detail'
    | 'other';
  peopleCount?: 0 | 1 | 2 | '3-5' | '6-12' | '12+' | null;
  mood?: 'joyful' | 'tender' | 'solemn' | 'playful' | 'candid' | 'formal' | 'nostalgic' | null;
  timeOfDay?: 'morning' | 'afternoon' | 'golden-hour' | 'evening' | 'night' | null;
  setting?: string; // free-text: "garden, string lights", "chapel interior", "beach dunes"
  caption?: string; // 4–10 words, poetic, for use as alt text / chapter placeholder
}

export interface TaggedPhoto {
  photo: GooglePhotoMetadata;
  tags: PhotoTags;
}

const GEMINI_FLASH = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent';

const MAX_CONCURRENT = 6;
const PER_PHOTO_TIMEOUT_MS = 7_000;

/** Fetch one photo and return { base64, mimeType } for inline vision. */
async function fetchInline(
  photo: GooglePhotoMetadata,
  googleAccessToken?: string | null,
): Promise<{ data: string; mimeType: string } | null> {
  if (!photo.baseUrl) return null;
  try {
    const isGoogle = photo.baseUrl.includes('googleusercontent.com');
    const url = isGoogle ? `${photo.baseUrl}=w600-h600` : photo.baseUrl;
    const headers: Record<string, string> = {};
    if (isGoogle && googleAccessToken) headers.Authorization = `Bearer ${googleAccessToken}`;
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(PER_PHOTO_TIMEOUT_MS) });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const base64 = Buffer.from(buf).toString('base64');
    let mimeType = photo.mimeType || 'image/jpeg';
    if (mimeType === 'application/octet-stream' || !mimeType.startsWith('image/')) mimeType = 'image/jpeg';
    return { data: base64, mimeType };
  } catch {
    return null;
  }
}

async function tagOne(
  photo: GooglePhotoMetadata,
  apiKey: string,
  googleAccessToken?: string | null,
): Promise<PhotoTags> {
  const image = await fetchInline(photo, googleAccessToken);
  if (!image) return {};

  const prompt = `Look at this photo from a celebration and describe it in 6 fields. Return ONLY JSON, no markdown, no preface.

{
  "sceneType": one of [ceremony, reception, toast, dancing, portrait, travel, food, getting-ready, family, quiet-moment, outdoor, detail, other],
  "peopleCount": one of [0, 1, 2, "3-5", "6-12", "12+"],
  "mood": one of [joyful, tender, solemn, playful, candid, formal, nostalgic],
  "timeOfDay": one of [morning, afternoon, golden-hour, evening, night],
  "setting": 3-6 words, what’s in the background (e.g. "garden, string lights" or "chapel interior"),
  "caption": 4-10 words, poetic alt text for this moment — no exclamation marks, no cliches.
}`;

  try {
    const res = await fetch(`${GEMINI_FLASH}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(PER_PHOTO_TIMEOUT_MS + 2_000),
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inlineData: { data: image.data, mimeType: image.mimeType } },
              { text: prompt },
            ],
          },
        ],
        generationConfig: { temperature: 0.2, maxOutputTokens: 300 },
      }),
    });
    if (!res.ok) return {};
    const data = await res.json();
    const raw = (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(cleaned) as PhotoTags;
    return parsed ?? {};
  } catch {
    return {};
  }
}

/** Runs the tagger across every photo with bounded concurrency.
 *  Returns a parallel array of TaggedPhoto — original photo
 *  metadata plus the inferred tags. */
export async function tagPhotos(
  photos: GooglePhotoMetadata[],
  apiKey: string,
  googleAccessToken?: string | null,
): Promise<TaggedPhoto[]> {
  if (!photos.length) return [];
  log(`[Photo Vision] Tagging ${photos.length} photo${photos.length === 1 ? '' : 's'}…`);

  const results: TaggedPhoto[] = new Array(photos.length);
  let cursor = 0;

  async function worker() {
    while (cursor < photos.length) {
      const i = cursor++;
      const photo = photos[i];
      const tags = await tagOne(photo, apiKey, googleAccessToken).catch((err) => {
        logWarn(`[Photo Vision] Photo ${i} tagging failed:`, err);
        return {} as PhotoTags;
      });
      results[i] = { photo, tags };
    }
  }

  await Promise.all(Array.from({ length: Math.min(MAX_CONCURRENT, photos.length) }, worker));
  log(`[Photo Vision] Done. Sample:`, results[0]?.tags);
  return results;
}

/** Roll photo tags into cluster-level summaries the story pass can consume. */
export function summarizeClusterTags(tags: PhotoTags[]): string {
  if (!tags.length) return '';
  const counts: Record<string, number> = {};
  for (const t of tags) {
    if (t.sceneType) counts[`scene:${t.sceneType}`] = (counts[`scene:${t.sceneType}`] ?? 0) + 1;
    if (t.mood) counts[`mood:${t.mood}`] = (counts[`mood:${t.mood}`] ?? 0) + 1;
    if (t.timeOfDay) counts[`time:${t.timeOfDay}`] = (counts[`time:${t.timeOfDay}`] ?? 0) + 1;
  }
  const topScene = Object.entries(counts)
    .filter(([k]) => k.startsWith('scene:'))
    .sort((a, b) => b[1] - a[1])[0]?.[0]
    ?.replace('scene:', '');
  const topMood = Object.entries(counts)
    .filter(([k]) => k.startsWith('mood:'))
    .sort((a, b) => b[1] - a[1])[0]?.[0]
    ?.replace('mood:', '');
  const topTime = Object.entries(counts)
    .filter(([k]) => k.startsWith('time:'))
    .sort((a, b) => b[1] - a[1])[0]?.[0]
    ?.replace('time:', '');
  const parts: string[] = [];
  if (topScene) parts.push(topScene);
  if (topMood) parts.push(`${topMood} mood`);
  if (topTime) parts.push(topTime);
  return parts.join(' · ');
}
