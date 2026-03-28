// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/sort-photos/route.ts
// AI Photo Sort — returns a suggested ordering of chapter images
// POST { chapterId, images, useAI? }
// Returns { sortedIds: string[] }
// ─────────────────────────────────────────────────────────────

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { ChapterImage } from '@/types';

export const dynamic = 'force-dynamic';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 256,
      },
    }),
  });
  const data = await res.json();
  const raw = (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
  return raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const images: ChapterImage[] = body.images || [];
    const useAI: boolean = body.useAI === true;

    if (!images.length) {
      return Response.json({ sortedIds: [] });
    }

    // Default: chronological/preserve original order
    if (!useAI) {
      return Response.json({
        sortedIds: images.map((img) => img.id),
        note: 'Preserved original order. Pass useAI: true for AI-ranked sorting.',
      });
    }

    // AI mode: ask Gemini to rank images by visual quality heuristics
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    const imageList = images
      .map((img, i) => `${i + 1}. id="${img.id}" url="${img.url}" alt="${img.alt}"`)
      .join('\n');

    const prompt = `You are a photo editor helping sort wedding photos for a story chapter.

Here are the images (by index):
${imageList}

Rank these images in the best visual storytelling order — consider:
- Lead with the most striking or emotional image (great for a cover)
- Group similar moments
- Build narrative arc from beginning to end of the memory

Return ONLY a JSON array of the image IDs in your suggested order:
["id1", "id2", "id3", ...]

Include ALL ${images.length} IDs.`;

    try {
      const raw = await callGemini(prompt, apiKey);
      const sortedIds: string[] = JSON.parse(raw);

      // Validate: must contain all original IDs
      const originalIds = new Set(images.map((img) => img.id));
      const returnedIds = sortedIds.filter((id) => originalIds.has(id));

      // Add any missing IDs at the end
      const returnedSet = new Set(returnedIds);
      const missing = images.map((img) => img.id).filter((id) => !returnedSet.has(id));

      return Response.json({ sortedIds: [...returnedIds, ...missing] });
    } catch {
      console.warn('[sort-photos] Gemini parse failed, returning original order');
      return Response.json({
        sortedIds: images.map((img) => img.id),
        note: 'AI sort failed — returned original order.',
      });
    }
  } catch (err) {
    console.error('[sort-photos] Error:', err);
    return Response.json({ error: 'Sort failed' }, { status: 500 });
  }
}
