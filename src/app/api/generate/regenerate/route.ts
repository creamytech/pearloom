// ─────────────────────────────────────────────────────────────
// Pearloom / api/generate/regenerate/route.ts
//
// Per-block retry — the cheapest, highest-keep-rate win after
// first generation. User taps a hero tagline / welcome statement
// / closing line / RSVP intro / chapter title / chapter paragraph
// and asks Pear to "try again." We re-run the relevant pass with
// a higher temperature and pass in the previous attempts as
// `avoid:` so the model doesn't loop.
//
// POST body: {
//   siteId: string;
//   target: 'heroTagline' | 'welcomeStatement' | 'closingLine'
//         | 'rsvpIntro' | 'storyChapter';
//   chapterId?: string;                  // required for storyChapter
//   avoid?: string[];                    // previous attempts to avoid
//   hint?: string;                       // optional user steer
// }
//
// Auth: session required + site ownership check.
// Returns: { ok: true, target, text, prev?, sibling? }
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { createClient } from '@supabase/supabase-js';
import { authOptions } from '@/lib/auth';
import { generate, textFrom } from '@/lib/claude';
import type { StoryManifest } from '@/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type Target =
  | 'heroTagline'
  | 'welcomeStatement'
  | 'closingLine'
  | 'rsvpIntro'
  | 'storyChapter';

const TARGET_SPECS: Record<Target, {
  label: string;
  maxWords: number;
  instruction: string;
  temperature: number;
}> = {
  heroTagline: {
    label: 'hero tagline',
    maxWords: 10,
    instruction:
      'Write a literary, cinematic hero tagline. 5-8 words. Specific, unexpected, never sentimental. Avoid "Today is the Day", "Happy Birthday", "Celebrating", "Happily Ever After".',
    temperature: 1.1,
  },
  closingLine: {
    label: 'closing line',
    maxWords: 18,
    instruction:
      'Write a closing line for the site. 10-15 words. Warm, specific to this event, sits at the foot of the page.',
    temperature: 1.0,
  },
  rsvpIntro: {
    label: 'RSVP intro',
    maxWords: 40,
    instruction:
      'Write the RSVP block intro. 1-2 sentences. Personal, inviting, specific. Never use "RSVP" in the sentence itself.',
    temperature: 0.9,
  },
  welcomeStatement: {
    label: 'welcome statement',
    maxWords: 90,
    instruction:
      'Write a welcome statement for the site. 3-5 sentences, in the host\'s voice, referencing at least one specific vibe detail. Feels like a real human wrote it.',
    temperature: 0.95,
  },
  storyChapter: {
    label: 'story chapter body',
    maxWords: 160,
    instruction:
      'Write this chapter\'s paragraph — 80-140 words, two short paragraphs max, grounded in the chapter title and any user captions provided. Nothing generic.',
    temperature: 0.95,
  },
};

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function toneLine(manifest: StoryManifest): string {
  const tone = manifest.tonePolicy ?? 'celebratory';
  if (tone === 'reflective')
    return 'Voice: reflective, gentle, present-tense. No exclamations, no emojis, no celebratory language.';
  if (tone === 'mixed')
    return 'Voice: warm but measured. Not jubilant, not sombre. Specific over exclamatory.';
  return 'Voice: warm, specific, a little literary. Never saccharine. No exclamation marks unless the user\'s own voice has them.';
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  let body: {
    siteId?: string;
    target?: Target;
    chapterId?: string;
    avoid?: string[];
    hint?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const { siteId, target, chapterId, avoid, hint } = body;
  if (!siteId || !target) {
    return NextResponse.json({ error: 'siteId and target required' }, { status: 400 });
  }
  const spec = TARGET_SPECS[target];
  if (!spec) return NextResponse.json({ error: 'bad target' }, { status: 400 });

  // Load site + ownership check + current manifest.
  const { data: site, error } = await sb()
    .from('sites')
    .select('id, site_config, manifest:ai_manifest')
    .eq('id', siteId)
    .maybeSingle();
  if (error || !site) {
    return NextResponse.json({ error: 'site not found' }, { status: 404 });
  }
  const cfg = (site.site_config ?? {}) as { creator_email?: string };
  if (cfg.creator_email !== email) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const manifest = (site.manifest ?? {}) as StoryManifest;
  const names = manifest.names ?? ['', ''];
  const occasion = manifest.occasion ?? 'celebration';
  const vibeName = manifest.vibeName ?? '';
  const vibeString = manifest.vibeString ?? '';
  const factSheet = manifest.factSheet ?? {};
  const chapters = manifest.chapters ?? [];

  let chapterContext = '';
  let prevText = '';
  if (target === 'storyChapter') {
    const chapter = chapters.find((c) => c.id === chapterId);
    if (!chapter) {
      return NextResponse.json({ error: 'chapter not found' }, { status: 404 });
    }
    chapterContext = `Chapter title: "${chapter.title}"\nCurrent description: "${chapter.description ?? ''}"`;
    prevText = chapter.description ?? '';
  } else {
    const current =
      target === 'heroTagline'
        ? manifest.poetry?.heroTagline
        : target === 'closingLine'
        ? manifest.poetry?.closingLine
        : target === 'rsvpIntro'
        ? manifest.poetry?.rsvpIntro
        : target === 'welcomeStatement'
        ? manifest.poetry?.welcomeStatement
        : '';
    prevText = current ?? '';
  }

  const avoidList = [
    ...(avoid ?? []).slice(-6),
    ...(prevText ? [prevText] : []),
  ].filter(Boolean);

  const namesLine =
    names.filter(Boolean).length === 2
      ? `${names[0]} & ${names[1]}`
      : names[0] || 'the hosts';

  const prompt = [
    `Rewrite the ${spec.label} for a ${occasion} website for ${namesLine}.`,
    vibeName ? `The user described the vibe as: "${vibeName}".` : null,
    vibeString ? `Theme string: ${vibeString.slice(0, 220)}` : null,
    factSheet.howWeMet ? `How they met: ${factSheet.howWeMet}` : null,
    factSheet.why ? `Why this event matters: ${factSheet.why}` : null,
    factSheet.favorite ? `Favorite thing about each other: ${factSheet.favorite}` : null,
    chapterContext || null,
    hint ? `User steer: "${hint}"` : null,
    avoidList.length > 0
      ? `Do NOT repeat any of these previous attempts — the user rejected each one:\n${avoidList.map((a) => `  • "${a}"`).join('\n')}`
      : null,
    toneLine(manifest),
    '',
    spec.instruction,
    `Return ONLY the new ${spec.label}, no preamble, no quotes, no commentary.`,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const msg = await generate({
      tier: 'sonnet',
      temperature: spec.temperature,
      maxTokens: 400,
      system:
        'You rewrite a single piece of site copy cleanly and return just the new text. Never explain your reasoning. Never wrap output in quotes. Never include a greeting.',
      messages: [{ role: 'user', content: prompt }],
    });
    const rawText = textFrom(msg);
    const cleaned = rawText
      .trim()
      .replace(/^"|"$/g, '')
      .replace(/^\s*[-*•]\s*/, '')
      .trim();

    const words = cleaned.split(/\s+/).length;
    if (words > spec.maxWords * 1.5) {
      return NextResponse.json(
        { error: 'draft too long', text: cleaned },
        { status: 422 },
      );
    }

    return NextResponse.json({
      ok: true,
      target,
      chapterId: chapterId ?? null,
      text: cleaned,
      previous: prevText || null,
      avoided: avoidList.length,
    });
  } catch (err) {
    console.error('[generate/regenerate]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'regenerate failed' },
      { status: 500 },
    );
  }
}
