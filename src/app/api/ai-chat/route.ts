// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/ai-chat/route.ts
// Smart inline AI assistant — understands the full site manifest
// and can make comprehensive changes across all sections.
// ─────────────────────────────────────────────────────────────

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkPearGate, pearHeaders, PEAR_MONTHLY_LIMIT } from '@/lib/rate-limit';
import { generate, cached, textFrom, parseJsonFromText } from '@/lib/claude';
import type { StoryManifest } from '@/types';

export const dynamic = 'force-dynamic';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent';

const SYSTEM_PROMPT = `You are Pear, the friendly AI assistant built into Pearloom. You're the smartest, most helpful wedding site assistant — like a best friend who also happens to be a world-class wedding planner and web designer. You talk warmly, think proactively, and always do the MOST you can for the user. Always refer to yourself as "Pear" (never "AI" or "Pearloom AI"). End replies with a friendly sign-off like "— Pear" when it feels natural.

## YOUR PERSONALITY:
- Warm, encouraging, never condescending
- NEVER use emojis in your replies. No 🎉 🍐 ✨ 💍 or any other emoji. Use plain text only. The UI has its own custom icons.
- Proactive — don't just do what's asked, think about what ELSE would help
- If the user says "add FAQs" and there's no venue/date set, ASK for that info first so you can write REAL answers (not generic ones)
- If you notice the site is missing something important, mention it naturally
- Use the couple's actual names in your replies when you know them

## SMART BEHAVIORS:

### When info is missing, ASK for it:
If user says "write FAQs" but there's no venue/date/dress code → reply with:
"I'd love to write your FAQs! To make them specific to your event, could you tell me:
• Where's the ceremony? (venue name + address)
• What's the dress code?
• Will there be parking?
• Any dietary options for dinner?
Just tell me what you know and I'll fill in the rest!"

### CRITICAL — Be occasion-aware:
The site has an "occasion" field (wedding, birthday, anniversary, engagement, story). You MUST tailor ALL your language and suggestions to the occasion:
- WEDDING: ceremony, reception, bride/groom, guests, registry, venue, dress code
- BIRTHDAY: party, birthday person, celebration, cake, gifts, activities, theme
- ANNIVERSARY: milestones, memories, celebration dinner, years together
- ENGAGEMENT: proposal story, engagement party, save the date
- STORY: personal narrative, chapters, timeline

NEVER suggest wedding-specific things (ceremony, bridal party, registry) for a birthday site.
NEVER suggest birthday things (cake, party games) for a wedding site.
Always check the occasion field in the context and adapt your tone, suggestions, and content accordingly.

### When you notice gaps, SUGGEST:
After ANY action, check if the site is missing critical things and mention ONE suggestion APPROPRIATE to the occasion:
- Wedding with no events? "Want me to set up your ceremony and reception?"
- Birthday with no events? "Want me to add your birthday party details?"
- Anniversary with no events? "Want me to set up your anniversary dinner?"
- No date? "What's the date? I can add a countdown!"
- Bland tagline? "Want me to write something more personal?"

### Be COMPREHENSIVE with changes:
- "Make it romantic" → change tagline + colors (warm blush/rose) + fonts (script heading) + welcome text + vibe ALL at once
- "Add events" → create ceremony + cocktail hour + reception with realistic times, descriptions, and the venue if known
- "Write FAQs" → write 5-7 specific FAQs using actual venue, date, dress code, parking info from the site
- "Change style" → update colors + fonts + nav style + layout as a coordinated design change

## ACTIONS (return ONLY valid JSON):

{ action: "update_manifest", data: { path: "poetry.heroTagline", value: "string" }, reply: "string" }
{ action: "update_chapter", data: { id: "chapter-id", title?, subtitle?, description?, mood? }, reply: "string" }
{ action: "update_theme", data: { colors?: { background, foreground, accent, accentLight, muted, cardBg }, fonts?: { heading, body } }, reply: "string" }
{ action: "update_blocks", data: { add?: [{ type, config }], remove?: ["blockId"], update?: [{ id, config }] }, reply: "string" }
{ action: "update_events", data: { events: [{ name, type, date, time, venue, address, dressCode, description }] }, reply: "string" }
{ action: "update_faqs", data: { faqs: [{ question, answer }] }, reply: "string" }
{ action: "update_registry", data: { entries?: [{ name, url, note }], message?, cashFundUrl?, cashFundMessage? }, reply: "string" }
{ action: "message", data: null, reply: "string" }

Manifest paths: poetry.heroTagline, poetry.closingLine, poetry.welcomeStatement, poetry.rsvpIntro, logistics.venue, logistics.venueAddress, logistics.date, logistics.time, logistics.dresscode, vibeString, navStyle, pageMode, coverPhoto

Block types: hero, story, event, countdown, rsvp, registry, travel, faq, photos, guestbook, quote, text, video, spotify, hashtag, divider, weddingParty, welcome, vibeQuote, map, quiz, anniversary, storymap, footer

Font options: Playfair Display, Cormorant Garamond, Great Vibes, Dancing Script, Lora, Libre Baskerville, Josefin Sans, DM Sans, Montserrat, Inter, Raleway, Open Sans, Source Sans 3, Lato

## DATA FORMAT RULES:
- Dates MUST be in ISO 8601 format: "2025-06-15" (YYYY-MM-DD). NEVER use "June 15, 2025" or "6/15/25"
- Times should be in 12-hour format: "4:00 PM", "6:30 PM". NEVER use 24-hour format
- If a user says "June 15th" or "next Saturday", convert it to YYYY-MM-DD format before returning

## CRITICAL RULES:
- Return ONLY valid JSON: { action, data, reply }
- reply should feel like a friend texting — warm, short, with personality
- NEVER make up or hallucinate data. If the site has no venue, don't invent one — ASK the user
- NEVER reference chapter IDs, block IDs, or event IDs that don't exist in the context above
- If user asks to "add a chapter", use action "add_chapter" with { title, description, mood }
- If user asks to edit an EXISTING chapter, use "update_chapter" with the EXACT ID from the context above
- When the site has very little content (no events, no venue, no date), DON'T generate placeholder content. Instead, use "message" action to ask for the real details
- After making changes, confirm WHAT changed specifically
- When changing colors, return all 6 (background, foreground, accent, accentLight, muted, cardBg)
- When adding events, only add realistic events if you KNOW the venue/date. Otherwise ask first
- For text content, use the couple's actual names and details — never use placeholder names like "Sarah & James"`;

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    signal: AbortSignal.timeout(25_000),
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 2048,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Gemini API error ${res.status}: ${errText}`);
  }

  const data: GeminiResponse = await res.json();
  const raw = (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
  return raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();
}

// ── Claude call (preferred) ───────────────────────────────────────
// The full SYSTEM_PROMPT is injected as a cached block so repeat
// turns within the editor cost ~10% of the tokens.
async function callClaude(systemPrompt: string, contextBlock: string, message: string): Promise<string> {
  const msg = await generate({
    tier: 'sonnet',
    temperature: 0.7,
    maxTokens: 2048,
    system: [cached(systemPrompt, '1h')],
    messages: [
      {
        role: 'user',
        content: `${contextBlock}\n\nUser request: ${message}\n\nRespond with ONLY a single JSON object: { action, data, reply }. No markdown fences, no prose.`,
      },
    ],
  });
  return textFrom(msg).trim();
}

function claudeEnabled(): boolean {
  if (process.env.PEARLOOM_CLAUDE_CHAT === 'off') return false;
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── Pear monthly usage check ──────────────────────────────
  const userEmail = session.user.email;
  const { blocked, gate } = await checkPearGate(userEmail);
  if (blocked) return blocked;

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || process.env.GOOGLE_API_KEY;
  const useClaude = claudeEnabled();
  if (!useClaude && !apiKey) {
    return Response.json({ error: 'No AI provider configured (set ANTHROPIC_API_KEY or GEMINI_API_KEY)' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const message: string = body.message;
    const manifest: StoryManifest = body.manifest;
    const activeChapterId: string | null = body.activeChapterId ?? null;

    if (!message?.trim()) {
      return Response.json({ error: 'message is required' }, { status: 400 });
    }

    // Build RICH context — give AI full understanding of the site
    const activeChapter = manifest?.chapters?.find(c => c.id === activeChapterId) ?? null;

    const chapterSummaries = (manifest?.chapters ?? [])
      .map(c => {
        const imgs = (c.images ?? []).slice(0, 2).map(i => i.url).filter(Boolean);
        const imgPart = imgs.length ? ` | photos: ${imgs.length} (${imgs.join(' ')})` : ' | photos: 0';
        return `  [${c.id}] "${c.title}" — ${c.description?.slice(0, 200) ?? '(no description)'}${imgPart}`;
      })
      .join('\n');

    const heroPhotos = [
      manifest?.coverPhoto,
      ...(manifest?.heroSlideshow ?? []),
    ].filter((u): u is string => typeof u === 'string' && u.length > 0).slice(0, 5);

    const blockSummaries = (manifest?.blocks ?? [])
      .map(b => `  [${b.id}] ${b.type} (${b.visible ? 'visible' : 'hidden'})${b.config?.title ? ` — "${b.config.title}"` : ''}`)
      .join('\n');

    const eventSummaries = (manifest?.events ?? [])
      .map(e => `  "${e.name}" — ${e.date || 'no date'} at ${e.venue || 'no venue'}`)
      .join('\n');

    const faqSummaries = (manifest?.faqs ?? [])
      .map(f => `  Q: ${f.question.slice(0, 60)}`)
      .join('\n');

    const colors = manifest?.theme?.colors;
    const fonts = manifest?.theme?.fonts;

    const contextBlock = `
CURRENT SITE STATE:
- Couple names: ${manifest?.coupleId ?? 'unknown'}
- Occasion: ${manifest?.occasion ?? 'wedding'}
- Vibe: ${manifest?.vibeString ?? '(none)'}
- Page mode: ${manifest?.pageMode ?? 'multi-page'}
- Nav style: ${manifest?.navStyle ?? 'glass'}

CONTENT:
- Hero tagline: "${manifest?.poetry?.heroTagline ?? '(not set)'}"
- Welcome statement: "${manifest?.poetry?.welcomeStatement?.slice(0, 100) ?? '(not set)'}"
- Closing line: "${manifest?.poetry?.closingLine ?? '(not set)'}"
- RSVP intro: "${manifest?.poetry?.rsvpIntro?.slice(0, 100) ?? '(not set)'}"

LOGISTICS:
- Venue: ${manifest?.logistics?.venue ?? '(not set)'}
- Address: ${manifest?.logistics?.venueAddress ?? '(not set)'}
- Date: ${manifest?.logistics?.date ?? '(not set)'}
- Time: ${manifest?.logistics?.time ?? '(not set)'}
- Dress code: ${manifest?.logistics?.dresscode ?? '(not set)'}

THEME:
- Palette: bg=${colors?.background ?? '?'}, fg=${colors?.foreground ?? '?'}, accent=${colors?.accent ?? '?'}, accentLight=${colors?.accentLight ?? '?'}, muted=${colors?.muted ?? '?'}, cardBg=${colors?.cardBg ?? '?'}
- Fonts: heading="${fonts?.heading ?? '?'}", body="${fonts?.body ?? '?'}"
- Story layout: ${manifest?.storyLayout ?? 'default'}

HERO MEDIA (${heroPhotos.length}):
${heroPhotos.length ? heroPhotos.map((u, i) => `  ${i + 1}. ${u}`).join('\n') : '  (no hero photos uploaded)'}

CHAPTERS (${manifest?.chapters?.length ?? 0}):
${chapterSummaries || '  (none)'}

BLOCKS (${manifest?.blocks?.length ?? 0}):
${blockSummaries || '  (none)'}

EVENTS (${manifest?.events?.length ?? 0}):
${eventSummaries || '  (none)'}

FAQs (${manifest?.faqs?.length ?? 0}):
${faqSummaries || '  (none)'}

REGISTRY: ${manifest?.registry?.entries?.length ?? 0} links, cash fund: ${manifest?.registry?.cashFundUrl ? 'yes' : 'no'}
TRAVEL: ${manifest?.travelInfo?.hotels?.length ?? 0} hotels, ${manifest?.travelInfo?.airports?.length ?? 0} airports

ACTIVE CHAPTER: ${activeChapter ? `[${activeChapter.id}] "${activeChapter.title}" — "${activeChapter.description?.slice(0, 200)}"` : '(none selected)'}
`.trim();

    const safeMessage = message.trim().replace(/["`]/g, "'");

    let raw: string;
    try {
      if (useClaude) {
        raw = await callClaude(SYSTEM_PROMPT, contextBlock, safeMessage);
      } else {
        const fullPrompt = `${SYSTEM_PROMPT}\n\n${contextBlock}\n\nUser request: ${safeMessage}`;
        raw = await callGemini(fullPrompt, apiKey!);
      }
    } catch (err) {
      // If Claude times out / fails, fall back to Gemini when possible
      if (useClaude && apiKey) {
        const fullPrompt = `${SYSTEM_PROMPT}\n\n${contextBlock}\n\nUser request: ${safeMessage}`;
        raw = await callGemini(fullPrompt, apiKey);
      } else {
        throw err;
      }
    }

    let parsed: { action: string; data: unknown; reply: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      try {
        parsed = parseJsonFromText(raw);
      } catch {
        const match = raw.match(/\{[\s\S]*\}/);
        if (!match) {
          return Response.json({
            action: 'message',
            data: null,
            reply: raw.slice(0, 500) || 'I had trouble understanding that. Could you rephrase?',
          });
        }
        parsed = JSON.parse(match[0]);
      }
    }

    const ALLOWED_ACTIONS = new Set([
      'update_chapter', 'add_chapter', 'update_manifest', 'update_theme',
      'update_blocks', 'update_events', 'update_faqs',
      'update_registry', 'message',
    ]);
    const action = ALLOWED_ACTIONS.has(parsed.action) ? parsed.action : 'message';

    // Whitelist block.type strings on update_blocks so a hallucinated
    // type ("hero-v2", "section") can't reach the editor and crash render.
    const ALLOWED_BLOCK_TYPES = new Set([
      'hero', 'story', 'countdown', 'event', 'rsvp', 'registry',
      'travel', 'faq', 'photos', 'guestbook', 'text', 'divider',
      'video', 'quote', 'map', 'spotify', 'quiz', 'storymap',
      'hashtag', 'photoWall', 'gallery', 'vibeQuote', 'welcome',
      'footer', 'anniversary', 'weddingParty',
    ]);
    if (action === 'update_blocks' && parsed.data && typeof parsed.data === 'object') {
      const d = parsed.data as { add?: Array<{ type?: unknown; config?: unknown }>; remove?: unknown[]; update?: unknown[] };
      if (Array.isArray(d.add)) {
        d.add = d.add.filter(
          (b) => b && typeof b === 'object' && typeof b.type === 'string' && ALLOWED_BLOCK_TYPES.has(b.type),
        );
      }
      parsed.data = d;
    }

    const responseBody = {
      action,
      data: parsed.data ?? null,
      reply: typeof parsed.reply === 'string' ? parsed.reply.slice(0, 1000) : 'Done!',
      ...(gate!.isUnlimited
        ? { plan: gate!.plan }
        : { remaining: gate!.remaining, limit: PEAR_MONTHLY_LIMIT, plan: 'free' }),
    };

    return Response.json(responseBody, { headers: pearHeaders(gate!) });
  } catch (err) {
    console.error('[ai-chat] Error:', err);
    return Response.json(
      { error: 'Internal server error', detail: String(err) },
      { status: 500 },
    );
  }
}
