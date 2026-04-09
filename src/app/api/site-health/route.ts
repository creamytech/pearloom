// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/site-health/route.ts
// Smart completeness checker — analyzes a StoryManifest and
// returns actionable suggestions for improving the site.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import type { StoryManifest } from '@/types';

export const dynamic = 'force-dynamic';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent';

interface Suggestion {
  type: 'missing' | 'weak' | 'tip';
  section: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
}

interface HealthResponse {
  suggestions: Suggestion[];
  score: number;
}

// ── Local analysis (fast, no AI needed) ─────────────────────

function runLocalChecks(manifest: StoryManifest): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const occasion = manifest.occasion || 'wedding';

  // 1. Missing sections
  if (!manifest.faqs || manifest.faqs.length === 0) {
    suggestions.push({
      type: 'missing',
      section: 'faqs',
      message: 'No FAQ section found. Guests often wonder about dress code, parking, and plus-ones.',
      priority: 'medium',
    });
  }

  if (!manifest.travelInfo) {
    suggestions.push({
      type: 'missing',
      section: 'travel',
      message: 'No travel information provided. Help out-of-town guests with airports, hotels, and directions.',
      priority: 'medium',
    });
  }

  if (!manifest.registry || !manifest.registry.enabled) {
    suggestions.push({
      type: 'missing',
      section: 'registry',
      message: 'No registry configured. Even a short note about gifts (or no gifts) helps guests feel at ease.',
      priority: 'low',
    });
  }

  if (!manifest.events || manifest.events.length === 0) {
    suggestions.push({
      type: 'missing',
      section: 'events',
      message: 'No events or schedule listed. Add at least the main event so guests know when to arrive.',
      priority: 'high',
    });
  }

  if (!manifest.chapters || manifest.chapters.length === 0) {
    suggestions.push({
      type: 'missing',
      section: 'chapters',
      message: 'No story chapters yet. Add photos and your story to make the site personal.',
      priority: 'high',
    });
  }

  // 2. Empty required fields
  if (!manifest.logistics?.venue) {
    suggestions.push({
      type: 'missing',
      section: 'logistics',
      message: 'Venue name is missing. This is one of the first things guests look for.',
      priority: 'high',
    });
  }

  if (!manifest.logistics?.date) {
    suggestions.push({
      type: 'missing',
      section: 'logistics',
      message: 'Event date is not set. Add a date so guests can plan ahead.',
      priority: 'high',
    });
  }

  if (!manifest.logistics?.time) {
    suggestions.push({
      type: 'missing',
      section: 'logistics',
      message: 'Event start time is missing. Guests need to know when to arrive.',
      priority: 'high',
    });
  }

  if (!manifest.logistics?.rsvpDeadline) {
    suggestions.push({
      type: 'missing',
      section: 'logistics',
      message: 'No RSVP deadline set. A clear deadline helps with planning and headcount.',
      priority: 'medium',
    });
  }

  // 3. Weak content
  if (manifest.chapters) {
    for (const chapter of manifest.chapters) {
      const wordCount = (chapter.description || '').trim().split(/\s+/).length;
      if (wordCount < 20 && chapter.description?.trim()) {
        suggestions.push({
          type: 'weak',
          section: `chapter:${chapter.id}`,
          message: `Chapter "${chapter.title}" has a very short description (${wordCount} words). A few more sentences will make it feel more personal.`,
          priority: 'low',
        });
      }
      if (!chapter.description?.trim()) {
        suggestions.push({
          type: 'weak',
          section: `chapter:${chapter.id}`,
          message: `Chapter "${chapter.title}" has no description. Tell guests the story behind these moments.`,
          priority: 'medium',
        });
      }
    }
  }

  if (manifest.events) {
    for (const event of manifest.events) {
      if (!event.time) {
        suggestions.push({
          type: 'weak',
          section: `event:${event.id}`,
          message: `Event "${event.name}" is missing a start time.`,
          priority: 'medium',
        });
      }
      if (!event.venue && !event.address) {
        suggestions.push({
          type: 'weak',
          section: `event:${event.id}`,
          message: `Event "${event.name}" has no venue or address. Guests need to know where to go.`,
          priority: 'medium',
        });
      }
    }
  }

  // 4. Occasion-specific checks
  if (occasion === 'wedding') {
    if (!manifest.logistics?.dresscode) {
      suggestions.push({
        type: 'tip',
        section: 'logistics',
        message: 'No dress code specified. Letting guests know the dress code prevents awkward moments.',
        priority: 'medium',
      });
    }
    if (!manifest.travelInfo?.parkingInfo && !manifest.logistics?.notes?.toLowerCase().includes('parking')) {
      suggestions.push({
        type: 'tip',
        section: 'travel',
        message: 'No parking information found. Guests driving to the venue will appreciate knowing where to park.',
        priority: 'low',
      });
    }
  }

  if (!manifest.poetry?.heroTagline) {
    suggestions.push({
      type: 'weak',
      section: 'poetry',
      message: 'No hero tagline set. A short, personal tagline makes a great first impression.',
      priority: 'low',
    });
  }

  return suggestions;
}

// ── Gemini-powered deeper analysis ──────────────────────────

async function getAiSuggestions(
  manifest: StoryManifest,
  localSuggestions: Suggestion[],
  apiKey: string,
): Promise<Suggestion[]> {
  const occasion = manifest.occasion || 'wedding';
  const existingSections = localSuggestions.map(s => s.section);

  // Build a summary of the manifest for the AI (avoid sending all photo data)
  const summary = {
    occasion,
    hasChapters: (manifest.chapters?.length ?? 0) > 0,
    chapterCount: manifest.chapters?.length ?? 0,
    chapterTitles: manifest.chapters?.map(c => c.title) ?? [],
    hasEvents: (manifest.events?.length ?? 0) > 0,
    eventNames: manifest.events?.map(e => e.name) ?? [],
    hasFaqs: (manifest.faqs?.length ?? 0) > 0,
    faqCount: manifest.faqs?.length ?? 0,
    hasRegistry: manifest.registry?.enabled ?? false,
    hasTravelInfo: !!manifest.travelInfo,
    hasVenue: !!manifest.logistics?.venue,
    hasDate: !!manifest.logistics?.date,
    hasDressCode: !!manifest.logistics?.dresscode,
    hasRsvpDeadline: !!manifest.logistics?.rsvpDeadline,
    hasPoetry: !!manifest.poetry?.heroTagline,
    hasHashtags: (manifest.hashtags?.length ?? 0) > 0,
    hasSpotify: !!manifest.spotifyUrl,
    hasCustomPages: (manifest.customPages?.length ?? 0) > 0,
    vibeString: manifest.vibeString || '',
    alreadyFlaggedSections: existingSections,
  };

  const prompt = `You are a wedding/event site completeness advisor for Pearloom, a premium celebration website platform.

Analyze this ${occasion} site summary and return additional actionable suggestions that the local checker may have missed. Focus on:
1. Common omissions for a ${occasion} (things guests always ask about)
2. Content quality tips based on what exists
3. Creative suggestions to make the site more engaging

Site summary:
${JSON.stringify(summary, null, 2)}

Already flagged sections (do NOT duplicate these): ${existingSections.join(', ')}

Return ONLY valid JSON (no markdown, no backticks) matching this schema:
[
  {
    "type": "missing" | "weak" | "tip",
    "section": "string (section name like 'faqs', 'travel', 'registry', etc.)",
    "message": "string (1-2 sentence actionable suggestion, warm and helpful tone)",
    "priority": "high" | "medium" | "low"
  }
]

Return 2-5 suggestions that add value beyond the already-flagged items. If the site is already very complete, return an empty array [].`;

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 1024,
      },
    }),
  });

  const data = await res.json();
  const raw = (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
  const cleaned = raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];

    // Validate and sanitize each suggestion
    return parsed
      .filter(
        (s: Record<string, unknown>) =>
          typeof s.type === 'string' &&
          typeof s.section === 'string' &&
          typeof s.message === 'string' &&
          typeof s.priority === 'string' &&
          ['missing', 'weak', 'tip'].includes(s.type as string) &&
          ['high', 'medium', 'low'].includes(s.priority as string),
      )
      .map((s: Record<string, unknown>) => ({
        type: s.type as Suggestion['type'],
        section: s.section as string,
        message: s.message as string,
        priority: s.priority as Suggestion['priority'],
      }));
  } catch {
    console.warn('[site-health] Failed to parse Gemini response, using local suggestions only');
    return [];
  }
}

// ── Score calculation ───────────────────────────────────────

function calculateScore(suggestions: Suggestion[]): number {
  let score = 100;

  for (const s of suggestions) {
    const penalty =
      s.priority === 'high' ? 12
        : s.priority === 'medium' ? 6
          : 3;
    score -= penalty;
  }

  return Math.max(0, Math.min(100, score));
}

// ── POST handler ────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateCheck = checkRateLimit(`site-health:${session.user.email}`, RATE_LIMITS.siteHealth);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please wait before running another health check.' },
      { status: 429 },
    );
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }

  try {
    const { manifest } = (await req.json()) as { manifest: StoryManifest };
    if (!manifest || typeof manifest !== 'object') {
      return NextResponse.json({ error: 'Missing or invalid manifest in request body' }, { status: 400 });
    }

    // Run fast local checks first
    const localSuggestions = runLocalChecks(manifest);

    // Augment with AI-powered suggestions
    let aiSuggestions: Suggestion[] = [];
    try {
      aiSuggestions = await getAiSuggestions(manifest, localSuggestions, apiKey);
    } catch (err) {
      console.warn('[site-health] AI analysis failed, returning local suggestions only:', err);
    }

    const allSuggestions = [...localSuggestions, ...aiSuggestions];
    const score = calculateScore(allSuggestions);

    const response: HealthResponse = {
      suggestions: allSuggestions,
      score,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error('[site-health] Error:', err);
    return NextResponse.json({ error: 'Health check failed' }, { status: 500 });
  }
}
