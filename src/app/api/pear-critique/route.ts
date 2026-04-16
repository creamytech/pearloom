import { NextRequest, NextResponse } from 'next/server';
import { GEMINI_FLASH } from '@/lib/memory-engine/gemini-client';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import type { StoryManifest } from '@/types';

// ─────────────────────────────────────────────────────────────
// POST /api/pear-critique
// AI-powered review of a wedding/celebration site manifest.
// Returns Suggestion[] consumed by editor/SiteCritic.tsx.
// Falls back to an empty list if the model is unavailable so
// the client can render its own rule-based suggestions.
// ─────────────────────────────────────────────────────────────

type SuggestionLevel = 'warning' | 'suggestion';
type EditorTab = 'details' | 'events' | 'story' | 'registry' | 'travel' | 'faq' | 'chapters';

interface Suggestion {
  id: string;
  level: SuggestionLevel;
  title: string;
  description: string;
  tab: EditorTab;
}

const VALID_TABS: ReadonlySet<EditorTab> = new Set([
  'details', 'events', 'story', 'registry', 'travel', 'faq', 'chapters',
]);

interface CritiqueRequest {
  manifest: StoryManifest;
  coupleNames: [string, string];
}

const SYSTEM = `You are Pear, a warm and concise editor for a wedding/celebration site builder.
You read a site manifest (JSON summary) and return 3–8 specific, actionable improvements.
Focus on: missing critical info (date, RSVP deadline, ceremony time), narrative gaps (chapters, photos),
hospitality (travel, FAQs, registry), and tone/voice consistency.
Each suggestion must reference SOMETHING SPECIFIC about THIS site (chapter title, event name, etc).
Never lecture, never repeat yourself. Be friendly but direct. Each title <= 60 chars, description <= 140 chars.
Output ONLY a JSON array. Each item shape:
{"id":"kebab-case-id","level":"warning"|"suggestion","title":"...","description":"...","tab":"details|events|story|registry|travel|faq|chapters"}
Use "warning" for missing critical info; "suggestion" for nice-to-haves.
Return [] if the site is genuinely complete.`;

function summariseManifest(manifest: StoryManifest, names: [string, string]): string {
  const couple = `${names[0]} & ${names[1]}`;
  const date = manifest.logistics?.date ?? '(none)';
  const rsvp = manifest.logistics?.rsvpDeadline ?? '(none)';
  const events = (manifest.events ?? []).map(e =>
    `  - ${e.type ?? 'event'}: ${e.name ?? '(unnamed)'}${e.date ? ` on ${e.date}` : ''}${e.time ? ` @ ${e.time}` : ''}${e.venue ? ` — ${e.venue}` : ''}`
  ).join('\n') || '  (none)';
  const chapters = (manifest.chapters ?? []).map(c =>
    `  - "${c.title ?? '(untitled)'}" — ${c.description?.slice(0, 80) ?? '(no description)'} | ${c.images?.length ?? 0} photo(s)`
  ).join('\n') || '  (none)';
  const registryEnabled = !!manifest.registry?.enabled;
  const registryEntries = manifest.registry?.entries?.length ?? 0;
  const registryFund = !!manifest.registry?.cashFundUrl;
  const hotels = manifest.travelInfo?.hotels?.length ?? 0;
  const airports = manifest.travelInfo?.airports?.length ?? 0;
  const faqs = manifest.faqs?.length ?? 0;
  const intro = (manifest.poetry?.heroTagline || manifest.poetry?.welcomeStatement || '').slice(0, 120) || '(none)';

  return `Couple: ${couple}
Date: ${date}
RSVP deadline: ${rsvp}
Intro line: ${intro}

EVENTS:
${events}

CHAPTERS (${manifest.chapters?.length ?? 0}):
${chapters}

REGISTRY: enabled=${registryEnabled}, entries=${registryEntries}, cashFund=${registryFund}
TRAVEL: hotels=${hotels}, airports=${airports}, parking=${!!manifest.travelInfo?.parkingInfo}, directions=${!!manifest.travelInfo?.directions}
FAQS: ${faqs}`;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`pear-critique:${ip}`, { max: 10, windowMs: 60 * 1000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ suggestions: [], source: 'no-key' });
  }

  let body: CritiqueRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  if (!body.manifest || !Array.isArray(body.coupleNames) || body.coupleNames.length !== 2) {
    return NextResponse.json({ error: 'manifest and coupleNames are required' }, { status: 400 });
  }

  const summary = summariseManifest(body.manifest, body.coupleNames);

  try {
    const res = await fetch(`${GEMINI_FLASH}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM }] },
        contents: [{ parts: [{ text: `Site summary:\n\n${summary}\n\nReturn the JSON array of suggestions now.` }] }],
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 1024,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ suggestions: [], source: 'model-error' });
    }

    const data = await res.json();
    const raw = (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
    const cleaned = raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();

    let suggestions: Suggestion[] = [];
    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        suggestions = parsed
          .map((s: unknown, i: number): Suggestion | null => {
            if (typeof s !== 'object' || s === null) return null;
            const o = s as Record<string, unknown>;
            const level = o.level === 'warning' ? 'warning' : 'suggestion';
            const tab = typeof o.tab === 'string' && VALID_TABS.has(o.tab as EditorTab)
              ? (o.tab as EditorTab) : 'details';
            const title = typeof o.title === 'string' ? o.title.slice(0, 80) : '';
            const description = typeof o.description === 'string' ? o.description.slice(0, 200) : '';
            const id = typeof o.id === 'string' && o.id.length > 0
              ? `ai-${o.id.replace(/[^a-z0-9-]/gi, '-').slice(0, 40)}`
              : `ai-suggestion-${i}`;
            if (!title || !description) return null;
            return { id, level, title, description, tab };
          })
          .filter((s): s is Suggestion => s !== null)
          .slice(0, 8);
      }
    } catch {
      // model returned non-JSON — fall through to empty
    }

    return NextResponse.json({ suggestions, source: 'ai' });
  } catch {
    return NextResponse.json({ suggestions: [], source: 'exception' });
  }
}
