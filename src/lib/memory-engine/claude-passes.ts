// ─────────────────────────────────────────────────────────────────
// Pearloom / lib/memory-engine/claude-passes.ts
//
// Claude-powered implementations of the Memory Engine passes:
//   - Pass 1   (core storytelling)    — Claude Opus 4.8
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

// ── Pass 1 — Core storytelling on Opus 4.8 ─────────────────────────

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
    /** Voice from EventType — shifts tone + pronoun + banned list. */
    voice?: PoetryVoice;
    /** Anchors collected from the wizard — the story must quote these. */
    factSheet?: {
      howWeMet?: string;
      why?: string;
      favorite?: string;
      /** Open-ended personal anchors mined from the host's story by
       *  /api/wizard/listen — named, specific facts (the dog, the
       *  bar in Lisbon, grandma's lemon cake). The copy must SPEND
       *  these, not summarize them. */
      anchors?: string[];
      /** The host's own story, verbatim, as they told it. The single
       *  richest grounding source — quoted (clamped) so the model
       *  hears their actual voice. */
      story?: string;
    };
    /** Per-event wizard extras (bachelor/reunion day count, memorial
     *  livestream + in-memory-of, graduation school). Injected into
     *  the fact-sheet block with hard rules so the story actually
     *  uses them instead of inventing around them. */
    eventDetails?: {
      days?: number;
      livestreamUrl?: string;
      inMemoryOf?: string;
      school?: string;
    };
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

  const voice: PoetryVoice = opts.voice ?? 'celebratory';

  // factSheet is a HARD anchor, not a hint. The story must weave
  // these facts in — the grounding pass flags and rewrites anything
  // that contradicts, but this prompt ensures the AI uses them
  // proactively rather than inventing substitutes. eventDetails
  // (days / livestream / in-memory-of / school) rides in the same
  // block under the same contract.
  const fs = opts.factSheet ?? {};
  const ed = opts.eventDetails ?? {};
  const anchors = (fs.anchors ?? []).map((a) => String(a).trim()).filter(Boolean).slice(0, 10);
  const story = (fs.story ?? '').trim().slice(0, 1600);
  const factLines = [
    story ? `  • IN THEIR OWN WORDS (the host's story, verbatim): "${story}"` : null,
    ...anchors.map((a) => `  • ANCHOR: "${a}"`),
    fs.howWeMet ? `  • HOW THEY GOT HERE: "${fs.howWeMet}"` : null,
    fs.why ? `  • WHY THIS CELEBRATION: "${fs.why}"` : null,
    fs.favorite ? `  • FAVOURITE MEMORY: "${fs.favorite}"` : null,
    ed.inMemoryOf ? `  • IN MEMORY OF: "${ed.inMemoryOf}"` : null,
    ed.school ? `  • SCHOOL: "${ed.school}"` : null,
    ed.days && ed.days > 1 ? `  • EVENT SPAN: ${ed.days} days` : null,
    ed.livestreamUrl
      ? `  • A LIVESTREAM will be available for guests who can't attend in person`
      : null,
  ].filter(Boolean) as string[];
  const hasFactSheet = Boolean(fs.howWeMet || fs.why || fs.favorite || story || anchors.length);
  const hardRules = [
    ...(hasFactSheet
      ? [
          `  - Chapter 1 MUST reference "HOW THEY GOT HERE" if present.`,
          `  - At least one chapter MUST reference "WHY THIS CELEBRATION" if present.`,
          `  - The final chapter MUST reference "FAVOURITE MEMORY" if present.`,
          `  - Never invent alternative origin stories when the user's words are provided.`,
        ]
      : []),
    ed.inMemoryOf
      ? `  - The opening chapter MUST name ${ed.inMemoryOf} exactly as written in "IN MEMORY OF" — never rename, shorten, or paraphrase them.`
      : null,
    ed.school
      ? `  - Mention "${ed.school}" by name exactly once across the chapters.`
      : null,
    ed.days && ed.days > 1
      ? `  - The story should acknowledge the event's ${ed.days}-day span (e.g. "${ed.days} days in…").`
      : null,
    anchors.length
      ? `  - SPEND THE ANCHORS: at least ${Math.min(anchors.length, 3)} of the ANCHOR facts must appear, by name, somewhere on the site — chapters, FAQ answers, schedule item names, or detail cards. Specifics beat summaries: "Biscuit gets a seat at the ceremony" is right; "their beloved pet" is wrong.`
      : null,
    story
      ? `  - Match the register of IN THEIR OWN WORDS — if they're playful, be playful; if they're hushed, be hushed. Their phrasing outranks the voice preset when the two disagree.`
      : null,
  ].filter(Boolean) as string[];

  const factSheetBlock = factLines.length
    ? `FACT-SHEET — these are the user's own words. Weave them into the chapters naturally. Quote them back (paraphrasing allowed; contradicting them is forbidden):\n` +
      factLines.join('\n') +
      `\n\nHARD RULES:\n` +
      hardRules.join('\n')
    : '';

  const voiceSystem =
    `You are Pearloom's Memory Engine — a literary editor and web designer rolled into one. ` +
    `You turn a photo archive into a cohesive, emotionally layered celebration website. ` +
    `Your output is always valid JSON matching the schema supplied in the user prompt.\n\n` +
    `Voice for this event (${voice}): ${VOICE_GUIDANCE[voice]}\n` +
    `Pronouns: ${VOICE_PRONOUNS[voice]}\n` +
    `Banned clichés (never use): ${VOICE_BANNED[voice].map((w) => `"${w}"`).join(', ')}.`;

  // Prompt-caching contract: only the STATIC prefix is wrapped in
  // cached(). voiceSystem varies solely by `voice` (5 enumerable
  // variants → 5 cache entries, fine). The fact-sheet block carries
  // per-couple words, so it rides in a SECOND, uncached system block
  // after the breakpoint — baking it into the cached block would key
  // a fresh cache entry per request and the cache would never hit.
  // (Same split pattern as /api/pear-chat's stable-prefix caching.)
  const msg = await generate({
    tier: 'opus',
    temperature: 0.85,
    maxTokens: 16384,
    system: [
      cached(voiceSystem, '1h'),
      ...(factSheetBlock ? [text(factSheetBlock)] : []),
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
  clusterNotes?: Array<{ chapterIndex: number; note: string; location: string | null }>,
  voice?: PoetryVoice,
): Promise<Chapter[]> {
  if (!chapters.length) return chapters;
  const namesCtx = coupleNames ? `${coupleNames[0]} & ${coupleNames[1]}` : 'this couple';
  const occ = (occasion || 'wedding').charAt(0).toUpperCase() + (occasion || 'wedding').slice(1);
  const activeVoice: PoetryVoice = voice ?? 'celebratory';
  const bannedList = VOICE_BANNED[activeVoice].join(', ');

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
    /* Extended thinking — observably better calibration on
       chapter-score rubrics per Anthropic docs. 4000 tokens
       gives Sonnet enough room to actually reason about why
       a chapter is/isn't specific to this couple before
       emitting the score + rewrite. */
    thinkingBudget: 4000,
    /* Static-prefix cache: occ (≤28 occasions) × voice (5) are
       enumerable, not per-request — bounded cache fan-out. Per-couple
       material (names, notes, chapters) stays in the user message. */
    system: [
      cached(
        `You are a world-class story editor for Pearloom. You score chapter descriptions for specificity: could this chapter ONLY belong to this host, or could it fit any ${occ} site? Rewrite anything scoring below 7.\n\n` +
        `Voice for this event (${activeVoice}): ${VOICE_GUIDANCE[activeVoice]}\n` +
        `Pronouns: ${VOICE_PRONOUNS[activeVoice]}`,
        '1h'
      ),
    ],
    messages: [
      {
        role: 'user',
        content: `Vibe: "${vibeString.slice(0, 500)}"\nHost: ${namesCtx}\n${notesSection}\nCHAPTERS:\n${chapterList}\n\nScore 1-10. BANNED when rewriting: ${bannedList}, "beautiful memories", "new chapter", "story of us". Rewrites: 3-4 sentences, reference specific vibe details, honour the voice above.`,
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

/**
 * Voice modifier per event archetype. Pulled from
 * EventType.voice in the event-os registry; drives tone, line
 * length, and banned-phrase lists for the poetry pass.
 */
export type PoetryVoice = 'celebratory' | 'intimate' | 'ceremonial' | 'playful' | 'solemn';

export const VOICE_GUIDANCE: Record<PoetryVoice, string> = {
  celebratory: 'Warm, upbeat, forward-leaning. Hints of anticipation. Default wedding/birthday tone.',
  intimate:    'Smaller-room tone. Quiet confidence, affection, understated. Good for showers, anniversaries, vow renewals.',
  ceremonial:  'Formal, ritual-aware. Measured pacing. References the tradition without being heavy-handed. Good for weddings, bar/bat mitzvah, confirmations.',
  playful:     'Loud, in-on-the-joke, slightly irreverent. Still brand-safe — no slang, no crass. Good for bachelor/ette, sweet sixteen.',
  solemn:      'Gentle, respectful, grief-aware. Short sentences, soft cadence. Never cheery, never morose. Good for memorials, funerals.',
};

/**
 * Pronoun voice per archetype — corePassClaude & critique use
 * this to decide whether to write "we/us/our" (couple) or a
 * narrator/host voice (birthdays, memorials, showers, etc.).
 */
export const VOICE_PRONOUNS: Record<PoetryVoice, string> = {
  celebratory: 'First-person plural (we / us / our) for couple events; narrator voice for birthdays.',
  intimate:    'First-person plural when it\u2019s a couple; otherwise gentle narrator.',
  ceremonial:  'Respectful narrator for religious/cultural ceremonies; first-person plural for weddings.',
  playful:     'Narrator or host voice; never the couple\u2019s voice (the bachelor party is NOT the couple\u2019s site).',
  solemn:      'Respectful narrator on behalf of the family; never first-person plural.',
};

const VOICE_BANNED_BASE = ['journey', 'adventure', 'fairy tale', 'soulmate'];
export const VOICE_BANNED: Record<PoetryVoice, string[]> = {
  celebratory: VOICE_BANNED_BASE,
  intimate:    [...VOICE_BANNED_BASE, 'epic', 'wild ride', 'best day ever'],
  ceremonial:  [...VOICE_BANNED_BASE, 'magical', 'dream', 'fairytale'],
  playful:     [...VOICE_BANNED_BASE, 'sacred', 'forever', 'eternity'],
  solemn:      [...VOICE_BANNED_BASE, 'party', 'celebrate', 'fun', 'amazing', 'awesome', 'best day', 'happy'],
};

export async function poetryPassClaude(
  vibeString: string,
  coupleNames: [string, string] | undefined,
  chapters: Chapter[],
  occasion?: string,
  voice?: PoetryVoice,
): Promise<PoetryResult> {
  const namesCtx = coupleNames ? `${coupleNames[0]} & ${coupleNames[1]}` : 'this couple';
  const name1 = coupleNames?.[0] ?? 'We';
  const occ = occasion || 'wedding';
  const occCap = occ.charAt(0).toUpperCase() + occ.slice(1);
  const activeVoice: PoetryVoice = voice ?? 'celebratory';
  const voiceDirection = VOICE_GUIDANCE[activeVoice];
  const bannedList = VOICE_BANNED[activeVoice].join('", "');

  const vibeForPoetry = vibeString
    .replace(/^Occasion\s*\/\s*Project Type:[^\n]*\n?/im, '')
    .replace(/^This is a (?:BIRTHDAY|WEDDING|ANNIVERSARY|ENGAGEMENT|CELEBRATION)[^\n]*\n?/gim, '')
    .trim();

  const chapterContext = (Array.isArray(chapters) ? chapters : [])
    .slice(0, 8)
    .map((c) => `"${c.title}": ${c.description?.slice(0, 200) || ''}`)
    .join('\n');

  const needsMilestones = ['anniversary', 'birthday'].includes(occ);

  const result = await generateJson<PoetryResult>({
    tier: 'sonnet',
    temperature: 1.0,
    maxTokens: 2048,
    /* Fully static system prompt — one cache entry, every poetry
       call shares it. Per-request material (vibe, chapters, names)
       stays in the user message after the breakpoint. */
    system: [
      cached(
        'You are a gifted literary copywriter. You write lines that feel plucked from a novel: specific, unexpected, quietly devastating. Never sentimental, never generic.',
        '1h'
      ),
    ],
    messages: [
      {
        role: 'user',
        content: `Write a hero tagline, closing line, RSVP intro, welcome statement${needsMilestones ? ', and milestones' : ''} for ${namesCtx}'s ${occCap} website.

Vibe: "${vibeForPoetry}"
Chapters: ${chapterContext}

Voice for this event: ${voiceDirection}

Rules:
- heroTagline: 5-8 words, literary/cinematic. Match the voice above. BANNED: "Today is the Day", "Happy Birthday", "Celebrating", "Happily Ever After".
- closingLine: 10-15 words, warm, references their story. Match the voice above.
- rsvpIntro: 1-2 sentences, personal. Match the voice above.
- welcomeStatement: 3-5 sentences in the ${occ === 'birthday' ? `host/birthday person's` : `couple's`} voice, referencing at least ONE specific vibe detail. Must feel like a real human wrote it, in the voice above. BANNED: "${bannedList}".
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
  const chapterCtx = (Array.isArray(chapters) ? chapters : [])
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
export function isClaudeStoryEnabled(): boolean {
  if (process.env.PEARLOOM_CLAUDE_STORY === 'off') return false;
  return Boolean(process.env.ANTHROPIC_API_KEY);
}
