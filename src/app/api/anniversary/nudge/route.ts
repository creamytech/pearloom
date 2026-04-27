// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/anniversary/nudge/route.ts
// Generate a new anniversary chapter on (or near) the wedding date.
// Called by a scheduled job, or manually from the editor.
// POST { subdomain, userEmail? }  |  GET ?subdomain=...&force=true
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getSiteConfig } from '@/lib/db';
import { GEMINI_PRO, geminiRetryFetch } from '@/lib/memory-engine/gemini-client';
import type { Chapter } from '@/types';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// ── Helpers ────────────────────────────────────────────────────

function daysBetween(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24);
}

/**
 * Returns true when today falls within `windowDays` of the anniversary's
 * month/day (ignoring year), so the nudge fires on any anniversary.
 */
function isNearAnniversary(
  weddingDateStr: string,
  today: Date,
  windowDays = 3
): { near: boolean; yearsAgo: number } {
  const wedding = new Date(weddingDateStr);
  if (isNaN(wedding.getTime())) return { near: false, yearsAgo: 0 };

  // Build a Date for this year's anniversary
  const thisYearAnn = new Date(
    today.getFullYear(),
    wedding.getMonth(),
    wedding.getDate()
  );

  const yearsAgo = today.getFullYear() - wedding.getFullYear();

  const diff = daysBetween(today, thisYearAnn);
  return { near: diff <= windowDays, yearsAgo };
}

/** Strip markdown code fences if Gemini wraps output in them */
function stripCodeFences(s: string): string {
  return s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

// ── Handler ────────────────────────────────────────────────────

async function handle(subdomain: string | null, force: boolean) {
  if (!subdomain) {
    return NextResponse.json({ error: 'subdomain is required' }, { status: 400 });
  }

  const siteConfig = await getSiteConfig(subdomain);
  if (!siteConfig) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  }

  const manifest = siteConfig.manifest;
  const names = siteConfig.names || ['', ''];
  const weddingDate = manifest?.logistics?.date;

  if (!weddingDate) {
    return NextResponse.json(
      { skipped: true, reason: 'No logistics.date in manifest' },
      { status: 200 }
    );
  }

  const today = new Date();
  const { near, yearsAgo } = isNearAnniversary(weddingDate, today, 3);

  if (!near && !force) {
    return NextResponse.json(
      { skipped: true, reason: 'Not near anniversary date' },
      { status: 200 }
    );
  }

  if (yearsAgo <= 0 && !force) {
    return NextResponse.json(
      { skipped: true, reason: 'Wedding date has not passed yet' },
      { status: 200 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Gemini API key not configured' },
      { status: 500 }
    );
  }

  const chapterTitles = (manifest?.chapters ?? []).map((c) => c.title).join(', ');
  const vibeString = manifest?.vibeString || siteConfig.vibeString || '';
  const ordinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const prompt = `Write a new anniversary chapter for ${names[0]} & ${names[1]}.
This is their ${ordinal(yearsAgo)}-year anniversary.
Their vibe: ${vibeString}
Their story so far (chapter titles): ${chapterTitles || '(none yet)'}
Write a new chapter looking back at the year and forward with hope.
Return JSON only — no markdown, no explanation:
{ "title": "...", "subtitle": "...", "description": "...", "mood": "...", "emotionalIntensity": <1-10> }`;

  let generated: {
    title: string;
    subtitle: string;
    description: string;
    mood: string;
    emotionalIntensity: number;
  };

  try {
    const res = await geminiRetryFetch(
      `${GEMINI_PRO}?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.85,
            maxOutputTokens: 512,
          },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error('[anniversary/nudge] Gemini error:', errText);
      return NextResponse.json(
        { error: 'Gemini generation failed' },
        { status: 502 }
      );
    }

    const geminiData = await res.json();
    const rawText: string =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const cleaned = stripCodeFences(rawText);
    generated = JSON.parse(cleaned);
  } catch (err) {
    console.error('[anniversary/nudge] parse error:', err);
    return NextResponse.json(
      { error: 'Failed to parse Gemini response' },
      { status: 502 }
    );
  }

  // Build the new chapter
  const newChapter: Chapter = {
    id: `anniversary-${Date.now()}`,
    date: today.toISOString().split('T')[0],
    title: generated.title || `${ordinal(yearsAgo)} Anniversary`,
    subtitle: generated.subtitle || '',
    description: generated.description || '',
    images: [],
    location: null,
    mood: generated.mood || 'anniversary',
    order: (manifest?.chapters?.length ?? 0) + 1,
    emotionalIntensity: Math.min(10, Math.max(1, generated.emotionalIntensity ?? 7)),
  };

  // Patch the manifest via the sites API
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pearloom.com';
  const updatedChapters = [...(manifest?.chapters ?? []), newChapter];
  const updatedManifest = { ...manifest, chapters: updatedChapters };

  try {
    const patchRes = await fetch(
      `${baseUrl}/api/sites/${encodeURIComponent(subdomain)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manifest: updatedManifest }),
      }
    );

    if (!patchRes.ok) {
      // Fallback: try direct DB update using service-role
      const { createClient } = await import('@supabase/supabase-js');
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const key =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;
      const supabase = createClient(url, key);
      const { error: dbError } = await supabase
        .from('sites')
        .update({ ai_manifest: updatedManifest })
        .eq('subdomain', subdomain);
      if (dbError) {
        console.error('[anniversary/nudge] DB update error:', dbError);
        return NextResponse.json(
          { error: 'Failed to save chapter' },
          { status: 500 }
        );
      }
    }
  } catch (err) {
    console.error('[anniversary/nudge] save error:', err);
    return NextResponse.json(
      { error: 'Failed to save chapter' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    chapter: newChapter,
    yearsMarked: yearsAgo,
  });
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`anniversary-nudge:${ip}`, { max: 10, windowMs: 60 * 1000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const subdomain: string | null = body?.subdomain ?? null;
    const force = Boolean(body?.force);
    return handle(subdomain, force);
  } catch (err) {
    console.error('[anniversary/nudge] POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`anniversary-nudge:${ip}`, { max: 10, windowMs: 60 * 1000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const subdomain = req.nextUrl.searchParams.get('subdomain');
  const force = req.nextUrl.searchParams.get('force') === 'true';
  return handle(subdomain, force);
}
