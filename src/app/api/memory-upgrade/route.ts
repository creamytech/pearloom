// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/memory-upgrade/route.ts
// Post-Wedding Memory Mode — rewrites chapter descriptions to past tense
// and sets features.postWedding = true, anniversaryMode = true
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSiteConfig, saveSiteDraft } from '@/lib/db';
import type { StoryManifest } from '@/types';

export const dynamic = 'force-dynamic';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent';

async function rewriteDescriptionToPastTense(
  description: string,
  apiKey: string
): Promise<string> {
  const prompt = `Rewrite this wedding story chapter description from before/during the wedding to a past-tense memory:
Original: ${description}
Rewrite it warmly in past tense as if looking back on this beautiful memory. Keep the same emotional tone and length. Return ONLY the rewritten text, no explanation.`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.8, maxOutputTokens: 400 },
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return description;
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return text || description;
  } catch {
    return description;
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }

  try {
    const { subdomain } = await req.json() as { subdomain: string };

    if (!subdomain) {
      return NextResponse.json({ error: 'Missing subdomain' }, { status: 400 });
    }

    // Fetch the current manifest
    const siteConfig = await getSiteConfig(subdomain);
    if (!siteConfig?.manifest) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    const manifest: StoryManifest = siteConfig.manifest;

    // Rewrite each chapter description in parallel (one at a time via Promise.allSettled)
    const rewrittenChapters = await Promise.allSettled(
      (manifest.chapters || []).map(async (chapter) => {
        const rewrittenDescription = await rewriteDescriptionToPastTense(
          chapter.description,
          apiKey
        );
        return { ...chapter, description: rewrittenDescription };
      })
    );

    const updatedChapters = rewrittenChapters.map((result, i) => {
      if (result.status === 'fulfilled') return result.value;
      return manifest.chapters[i]; // fallback to original on error
    });

    // Build updated manifest
    const updatedManifest: StoryManifest = {
      ...manifest,
      chapters: updatedChapters,
      features: {
        ...manifest.features,
        postWedding: true,
      },
      anniversaryMode: true,
    };

    // Save the updated manifest
    const names = (siteConfig as unknown as Record<string, unknown>).names as [string, string] | undefined;
    const saveResult = await saveSiteDraft(
      session.user.email,
      subdomain,
      updatedManifest,
      names || ['', '']
    );

    if (!saveResult.success) {
      return NextResponse.json({ error: saveResult.error || 'Failed to save' }, { status: 500 });
    }

    return NextResponse.json({ success: true, manifest: updatedManifest });
  } catch (err) {
    console.error('[memory-upgrade] Error:', err);
    return NextResponse.json({ error: 'Memory upgrade failed' }, { status: 500 });
  }
}
