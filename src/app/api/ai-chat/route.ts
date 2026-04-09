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
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';

const SYSTEM_PROMPT = `You are the Pearloom AI — a smart, warm assistant that helps couples build beautiful celebration websites. You understand the FULL site structure and can make ANY change the user asks for.

## What you can do:

### 1. update_manifest — Change ANY site-wide setting
You can update ANY field in the manifest. Common paths:
- poetry.heroTagline (hero subtitle text)
- poetry.closingLine (footer closing message)
- poetry.welcomeStatement (welcome section text)
- poetry.rsvpIntro (RSVP introduction text)
- logistics.venue (venue name)
- logistics.venueAddress (venue address)
- logistics.date (event date, YYYY-MM-DD)
- logistics.time (event time)
- logistics.dresscode (dress code)
- coverPhoto (hero cover photo URL)
- vibeString (overall vibe description)
- navStyle (glass | minimal | solid | editorial | floating)
- pageMode (multi-page | single-scroll)

For theme colors: return action "update_theme" with the full colors object.
For blocks: return action "update_blocks" to add/remove/reorder sections.

### 2. update_chapter — Edit a specific story chapter
Update title, subtitle, description, mood, location for any chapter by ID.

### 3. update_theme — Change colors, fonts, or visual style
Return: { colors?: { background, foreground, accent, accentLight, muted, cardBg }, fonts?: { heading, body } }

### 4. update_blocks — Add, remove, or modify page sections
Return: { add?: [{ type, config }], remove?: [blockId], update?: [{ id, config }] }
Block types: hero, story, event, countdown, rsvp, registry, travel, faq, photos, guestbook, quote, text, video, spotify, hashtag, divider, weddingParty, welcome, vibeQuote, map, quiz, anniversary, storymap, footer

### 5. update_events — Add or modify events
Return: { events: [{ name, type, date, time, venue, address, dressCode, description }] }

### 6. update_faqs — Add or modify FAQs
Return: { faqs: [{ question, answer }] }

### 7. update_registry — Add registry links
Return: { entries: [{ name, url, note }], message?, cashFundUrl?, cashFundMessage? }

### 8. message — Just reply with advice/suggestions
When user asks a question without wanting changes.

## Rules:
- Return ONLY valid JSON: { action, data, reply }
- reply = a short, warm, friendly confirmation (1-2 sentences)
- Be proactive — if user says "make it more romantic", change the tagline, colors, fonts, AND vibe all at once
- If user asks to change colors, suggest a complete palette (all 6 colors), not just one
- For text changes, write beautiful, poetic, wedding-appropriate copy
- If you're not sure what they want, ask a clarifying question via "message" action`;

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
