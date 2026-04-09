// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/ai-chat/route.ts
// Smart inline AI assistant — understands the full site manifest
// and can make comprehensive changes across all sections.
// ─────────────────────────────────────────────────────────────

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { StoryManifest } from '@/types';

export const dynamic = 'force-dynamic';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent';

const SYSTEM_PROMPT = `You are Pear, the friendly AI assistant built into Pearloom. You're the smartest, most helpful wedding site assistant — like a best friend who also happens to be a world-class wedding planner and web designer. You talk warmly, think proactively, and always do the MOST you can for the user. Always refer to yourself as "Pear" (never "AI" or "Pearloom AI"). End replies with a friendly sign-off like "— Pear" when it feels natural.

## YOUR PERSONALITY:
- Warm, encouraging, never condescending
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

### When you notice gaps, SUGGEST:
After ANY action, check if the site is missing critical things and mention ONE suggestion:
- No events? "By the way, I noticed you haven't added your ceremony details yet. Want me to set that up?"
- No RSVP? "Tip: Add an RSVP section so guests can confirm attendance!"
- No date? "What's the big day? I can add a countdown timer too."
- Bland tagline? "Your tagline could be more personal — want me to rewrite it based on your story?"

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

## RULES:
- Return ONLY valid JSON: { action, data, reply }
- reply should feel like a friend texting — warm, short, with personality. Sign off as "— Pear" naturally
- After making changes, your reply should confirm WHAT changed AND suggest what to do next
- If you need more info, use action "message" and ask specific questions (not vague ones)
- Write wedding copy that's beautiful and personal, not corporate or generic
- When changing colors, ALWAYS return all 6 (background, foreground, accent, accentLight, muted, cardBg) as a coordinated palette
- When adding events, use realistic times (ceremony 4pm, cocktails 5pm, reception 6pm) and rich descriptions`;

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

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
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
      .map(c => `  [${c.id}] "${c.title}" — ${c.description?.slice(0, 120) ?? '(no description)'}`)
      .join('\n');

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
- Colors: bg=${colors?.background ?? '?'}, fg=${colors?.foreground ?? '?'}, accent=${colors?.accent ?? '?'}, accentLight=${colors?.accentLight ?? '?'}, muted=${colors?.muted ?? '?'}
- Fonts: heading="${fonts?.heading ?? '?'}", body="${fonts?.body ?? '?'}"

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
    const fullPrompt = `${SYSTEM_PROMPT}\n\n${contextBlock}\n\nUser request: ${safeMessage}`;

    const raw = await callGemini(fullPrompt, apiKey);

    let parsed: { action: string; data: unknown; reply: string };
    try {
      parsed = JSON.parse(raw);
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

    const ALLOWED_ACTIONS = new Set([
      'update_chapter', 'update_manifest', 'update_theme',
      'update_blocks', 'update_events', 'update_faqs',
      'update_registry', 'message',
    ]);
    const action = ALLOWED_ACTIONS.has(parsed.action) ? parsed.action : 'message';

    return Response.json({
      action,
      data: parsed.data ?? null,
      reply: typeof parsed.reply === 'string' ? parsed.reply.slice(0, 1000) : 'Done!',
    });
  } catch (err) {
    console.error('[ai-chat] Error:', err);
    return Response.json(
      { error: 'Internal server error', detail: String(err) },
      { status: 500 },
    );
  }
}
