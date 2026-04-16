// ─────────────────────────────────────────────────────────────────
// Pearloom / lib/memory-engine/claude-passes.ts
//
// Claude-powered implementations of the Memory Engine passes:
//   - Pass 1   (core storytelling)    — Claude Opus 4.7
//   - Pass 1.2 (chapter critique)     — Claude Sonnet 4.6
//   - Pass 1.5 (couple DNA extract)   — Claude Haiku 4.5
//   - Pass 4   (poetry + welcome)     — Claude Sonnet 4.6
//
// Prompt caching is layered in so repeat calls for the same
// vibe + chapters hit the ephemeral cache (90%+ cost savings).
//
// Gemini is unchanged for:
//   - Pass 2 (vibeSkin / SVG chapter icons / particle motifs)
//   - Pass 2.5 (raster art)
// because Gemini's image model remains our best-in-class for
// visual generation.
// ─────────────────────────────────────────────────────────────────

import type { PhotoCluster, StoryManifest, Chapter } from '@/types';
import { generate, generateJson, cached, text, textFrom, parseJsonFromText } from '@/lib/claude';
import { buildPrompt } from './prompts';

// ── Pass 1 — Core storytelling on Opus 4.7 ─────────────────────────

export interface Pass1Result {
  manifest: Partial<StoryManifest>;
  raw: string;
}

export async function corePassClaude(
  clusters: PhotoCluster[],
  vibeString: string,
  coupleNames: [string, string],
  opts: {
    occasion?: string;
    eventDate?: string;
    photoCount: number;
    layoutFormat?: string;
  }
): Promise<Pass1Result> {
  const prompt = buildPrompt(
    clusters,
    vibeString,
    coupleNames,
    opts.occasion,
    opts.eventDate,
    opts.photoCount,
    opts.layoutFormat
  );

  // We split the prompt into a "stable" cacheable prefix (the system rules
  // and the cluster data block that won't change between revisions) and a
  // small tail. For now the whole buildPrompt output goes into one cached
  // text block. If the user rerenders with the same clusters, the cache
  // hits and only the instruction tail is billed at full price.
  const msg = await generate({
    tier: 'opus',
    temperature: 0.85,
    maxTokens: 16384,
    system: [
      cached(
        'You are Pearloom\'s Memory Engine — a literary editor and web designer ' +
          'rolled into one. You turn a photo archive into a cohesive, emotionally ' +
          'layered celebration website. Your output is always valid JSON matching ' +
          'the schema supplied in the user prompt. You never use clichés like ' +
          '"journey", "adventure", "soulmate", "fairy tale". You write in first-person ' +
          'plural ("we / us / our") from the couple\'s voice.',
          '1h'
      ),
    ],
    messages: [
      {
        role: 'user',
        content: [cached(prompt, '5m')],
      },
      {
        role: 'assistant',
        content: '{',
      },
    ],
    stopSequences: [],
  });

  let raw = textFrom(msg).trim();
  // We prefilled "{" so prepend it for parsing.
  if (!raw.startsWith('{')) raw = '{' + raw;

  const manifest = parseJsonFromText<Partial<StoryManifest>>(raw);
  return { manifest, raw };
}

// ── Pass 1.2 — Chapter critique on Sonnet ──────────────────────────

interface ChapterCritique {
  index: number;
  score: number;
  issue: string | null;
  rewrite: {
    title: string | null;
    subtitle: string | null;
    description: string | null;
  };
}

export async function critiqueChaptersClaude(
  chapters: Chapter[],
  vibeString: string,
  coupleNames: [string, string] | undefined,
  occasion?: string,
  clusterNotes?: Array<{ chapterIndex: number; note: string; location: string | null }>
): Promise<Chapter[]> {
  if (!chapters.length) return chapters;
  const namesCtx = coupleNames ? `${coupleNames[0]} & ${coupleNames[1]}` : 'this couple';
  const occ = (occasion || 'wedding').charAt(0).toUpperCase() + (occasion || 'wedding').slice(1);

  const chapterList = chapters
    .map(
      (c, i) =>
        `Chapter ${i}:\n  Title: "${c.title}"\n  Subtitle: "${c.subtitle}"\n  Description: "${c.description}"\n  Mood: ${c.mood}`
    )
    .join('\n\n');

  const notesSection =
    clusterNotes && clusterNotes.length > 0
      ? `\nCRITICAL: The following chapters have USER-WRITTEN NOTES that MUST be preserved in any rewrite:\n${clusterNotes
          .filter((cn) => cn.chapterIndex < chapters.length)
          .map(
            (cn) =>
              `Chapter ${cn.chapterIndex}: "${cn.note}"${cn.location ? ` (location: ${cn.location})` : ''}`
          )
          .join('\n')}\n`
      : '';

  const result = await generateJson<{ chapters: ChapterCritique[] }>({
    tier: 'sonnet',
    temperature: 0.7,
    maxTokens: 4096,
    system: cached(
      `You are a world-class story editor for Pearloom. You score chapter descriptions for specificity: could this chapter ONLY belong to this couple, or could it fit any ${occ} site? Rewrite anything scoring below 7.`,
      '1h'
    ) as unknown as string, // cached block array is accepted at runtime
    messages: [
      {
        role: 'user',
        content: `Vibe: "${vibeString.slice(0, 500)}"\nCouple: ${namesCtx}\n${notesSection}\nCHAPTERS:\n${chapterList}\n\nScore 1-10. BANNED when rewriting: journey, adventure, soulmate, fairy tale, magical, beautiful memories, new chapter, story of us. Rewrites must be first-person plural, 3-4 sentences, reference specific vibe details.`,
      },
    ],
    schemaName: 'emit_critiques',
    schemaDescription: 'Emit critique + optional rewrite for each chapter',
    schema: {
      type: 'object',
      properties: {
        chapters: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              index: { type: 'integer' },
              score: { type: 'integer', minimum: 1, maximum: 10 },
              issue: { type: ['string', 'null'] },
              rewrite: {
                type: 'object',
                properties: {
                  title: { type: ['string', 'null'] },
                  subtitle: { type: ['string', 'null'] },
                  description: { type: ['string', 'null'] },
                },
                required: ['title', 'subtitle', 'description'],
              },
            },
            required: ['index', 'score', 'rewrite'],
          },
        },
      },
      required: ['chapters'],
    },
  });

  const refined = chapters.map((ch, i) => {
    const critique = result.chapters.find((c) => c.index === i);
    if (!critique || critique.score >= 7) return ch;
    return {
      ...ch,
      title: critique.rewrite.title || ch.title,
      subtitle: critique.rewrite.subtitle || ch.subtitle,
      description: critique.rewrite.description || ch.description,
    };
  });

  return refined;
}

// ── Pass 4 — Poetry on Sonnet ──────────────────────────────────────

export interface PoetryResult {
  heroTagline: string;
  closingLine: string;
  rsvpIntro: string;
  welcomeStatement?: string;
  milestones?: Array<{ year: number; label: string; emoji?: string }>;
}

export async function poetryPassClaude(
  vibeString: string,
  coupleNames: [string, string] | undefined,
  chapters: Chapter[],
  occasion?: string
): Promise<PoetryResult> {
  const namesCtx = coupleNames ? `${coupleNames[0]} & ${coupleNames[1]}` : 'this couple';
  const name1 = coupleNames?.[0] ?? 'We';
  const occ = occasion || 'wedding';
  const occCap = occ.charAt(0).toUpperCase() + occ.slice(1);

  const vibeForPoetry = vibeString
    .replace(/^Occasion\s*\/\s*Project Type:[^\n]*\n?/im, '')
    .replace(/^This is a (?:BIRTHDAY|WEDDING|ANNIVERSARY|ENGAGEMENT|CELEBRATION)[^\n]*\n?/gim, '')
    .trim();

  const chapterContext = chapters
    .slice(0, 8)
    .map((c) => `"${c.title}": ${c.description?.slice(0, 200) || ''}`)
    .join('\n');

  const needsMilestones = ['anniversary', 'birthday'].includes(occ);

  const result = await generateJson<PoetryResult>({
    tier: 'sonnet',
    temperature: 1.0,
    maxTokens: 2048,
    system: cached(
      'You are a gifted literary copywriter. You write lines that feel plucked from a novel: specific, unexpected, quietly devastating. Never sentimental, never generic.',
      '1h'
    ) as unknown as string,
    messages: [
      {
        role: 'user',
        content: `Write a hero tagline, closing line, RSVP intro, welcome statement${needsMilestones ? ', and milestones' : ''} for ${namesCtx}'s ${occCap} website.

Vibe: "${vibeForPoetry}"
Chapters: ${chapterContext}

Rules:
- heroTagline: 5-8 words, literary/cinematic. BANNED: "Today is the Day", "Happy Birthday", "Celebrating", "Happily Ever After".
- closingLine: 10-15 words, warm, references their story.
- rsvpIntro: 1-2 sentences, personal.
- welcomeStatement: 3-5 sentences in the ${occ === 'birthday' ? `host/birthday person's` : `couple's`} voice, referencing at least ONE specific vibe detail. Must feel like a real human wrote it. BANNED: "journey", "adventure", "fairy tale", "soulmate".
${needsMilestones ? `- milestones: 5-8 specific, poetic 3-6 word highlights with years and emojis (e.g. \`{"year":2019,"label":"Moved in, chaos ensued","emoji":"📦"}\`).` : ''}`,
      },
    ],
    schemaName: 'emit_poetry',
    schema: {
      type: 'object',
      properties: {
        heroTagline: { type: 'string' },
        closingLine: { type: 'string' },
        rsvpIntro: { type: 'string' },
        welcomeStatement: { type: 'string' },
        milestones: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              year: { type: 'integer' },
              label: { type: 'string' },
              emoji: { type: 'string' },
            },
            required: ['year', 'label'],
          },
        },
      },
      required: ['heroTagline', 'closingLine', 'rsvpIntro'],
    },
  });

  // Word-count guard — reject model instruction echoes
  const isShort = (s: string | undefined, max: number) =>
    typeof s === 'string' && s.length > 0 && s.split(/\s+/).length <= max;

  const heroFallbacks: Record<string, string> = {
    wedding: 'A love story worth every page',
    birthday: 'Still becoming, still magnificent',
    anniversary: 'Every year the same choice',
    engagement: 'The beginning of everything',
    story: 'The moments that made us',
  };

  return {
    heroTagline: isShort(result.heroTagline, 12)
      ? result.heroTagline
      : heroFallbacks[occ] || heroFallbacks.wedding,
    closingLine: isShort(result.closingLine, 22)
      ? result.closingLine
      : 'Thank you for being part of our story.',
    rsvpIntro:
      typeof result.rsvpIntro === 'string' && result.rsvpIntro.length > 0
        ? result.rsvpIntro
        : "We can't wait to celebrate with you. Please let us know if you'll be joining us.",
    ...(typeof result.welcomeStatement === 'string' && result.welcomeStatement.length > 10
      ? { welcomeStatement: result.welcomeStatement }
      : {}),
    ...(Array.isArray(result.milestones) && result.milestones.length > 0
      ? { milestones: result.milestones }
      : {}),
  };
}

// ── Pass 1.5 — Couple DNA on Haiku (fast + cheap) ──────────────────

export interface ClaudeCoupleProfile {
  pets: string[];
  interests: string[];
  locations: string[];
  motifs: string[];
  heritage: string[];
  illustrationPrompt: string;
}

export async function extractCoupleProfileClaude(
  vibeString: string,
  chapters: Array<{ title: string; description: string; mood: string }>,
  occasion?: string,
  clusterNotes?: Array<{ chapterIndex: number; note: string; location: string | null }>
): Promise<ClaudeCoupleProfile> {
  const chapterCtx = chapters
    .slice(0, 6)
    .map((c) => `"${c.title}" (${c.mood}): ${c.description?.slice(0, 160) || ''}`)
    .join('\n');

  const notesBlob = clusterNotes?.length
    ? `\nUser-written notes:\n${clusterNotes.map((n) => `- ${n.note}${n.location ? ` (${n.location})` : ''}`).join('\n')}`
    : '';

  const result = await generateJson<ClaudeCoupleProfile>({
    tier: 'haiku',
    temperature: 0.4,
    maxTokens: 1024,
    system:
      'You extract structured "couple DNA" — pets, interests, shared places, recurring motifs, cultural heritage — that will drive bespoke illustration generation.',
    messages: [
      {
        role: 'user',
        content: `Occasion: ${occasion || 'wedding'}
Vibe: "${vibeString.slice(0, 800)}"
Chapters:
${chapterCtx}${notesBlob}

Extract:
- pets: concrete animals (dog, cat names OK)
- interests: hobbies, activities (hiking, salsa, coffee)
- locations: specific places mentioned
- motifs: visual recurring elements (mountains, ocean, books)
- heritage: cultural/ethnic/geographic roots if implied
- illustrationPrompt: a 2-sentence bespoke prompt an illustrator could use to draw a custom logo for this couple.`,
      },
    ],
    schemaName: 'emit_couple_profile',
    schema: {
      type: 'object',
      properties: {
        pets: { type: 'array', items: { type: 'string' } },
        interests: { type: 'array', items: { type: 'string' } },
        locations: { type: 'array', items: { type: 'string' } },
        motifs: { type: 'array', items: { type: 'string' } },
        heritage: { type: 'array', items: { type: 'string' } },
        illustrationPrompt: { type: 'string' },
      },
      required: ['pets', 'interests', 'locations', 'motifs', 'heritage', 'illustrationPrompt'],
    },
  });

  return {
    pets: result.pets || [],
    interests: result.interests || [],
    locations: result.locations || [],
    motifs: result.motifs || [],
    heritage: result.heritage || [],
    illustrationPrompt: result.illustrationPrompt || '',
  };
}

// ── Feature flag ───────────────────────────────────────────────────

/**
 * Returns true when Claude-powered passes should run instead of Gemini.
 * Enabled whenever ANTHROPIC_API_KEY is set. Can be disabled per-env by
 * setting PEARLOOM_CLAUDE_STORY=off.
 */
export function useClaudeForStory(): boolean {
  if (process.env.PEARLOOM_CLAUDE_STORY === 'off') return false;
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

// silence "unused" warning on `text` helper import if the caller pruned it
void text;
