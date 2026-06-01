import { NextRequest, NextResponse } from 'next/server';
import { GEMINI_FLASH } from '@/lib/memory-engine/gemini-client';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import type { StoryManifest } from '@/types';

// ─────────────────────────────────────────────────────────────
// POST /api/pear-critique
// Pear-drafted review of a wedding/celebration site manifest.
// Returns Suggestion[] consumed by editor/SiteCritic.tsx.
// Falls back to an empty list if the model is unavailable so
// the client can render its own rule-based suggestions.
// ─────────────────────────────────────────────────────────────

type SuggestionLevel = 'warning' | 'suggestion';
// Editor-side block keys that the design-jump listener understands.
// Stay aligned with the BLOCKS list in EditorV8.tsx (minus nav/theme/
// toasts which are chrome rather than content surfaces). Adding new
// tabs here without updating TAB_TO_BLOCK on the client will silently
// drop suggestions, so keep both files in sync.
type EditorTab =
  | 'hero'
  | 'details'
  | 'events'
  | 'story'
  | 'registry'
  | 'travel'
  | 'gallery'
  | 'rsvp'
  | 'faq'
  | 'chapters';

interface Suggestion {
  id: string;
  level: SuggestionLevel;
  title: string;
  description: string;
  tab: EditorTab;
}

const VALID_TABS: ReadonlySet<EditorTab> = new Set([
  'hero', 'details', 'events', 'story', 'registry', 'travel', 'gallery', 'rsvp', 'faq', 'chapters',
]);

interface CritiqueRequest {
  manifest: StoryManifest;
  coupleNames: [string, string];
  /** Quick-action focus from the Pear Companion. The route uses
   *  this to nudge the system prompt so each pass reads
   *  differently — a "polish-hero" pass should ignore travel
   *  gaps; a "missing" pass should bias toward warnings. */
  intent?: 'review' | 'missing' | 'polish-hero';
}

const INTENT_HINTS: Record<NonNullable<CritiqueRequest['intent']>, string> = {
  review:        '',
  missing:       '\nFOCUS: Bias toward "warning" level — what critical info is missing? Skip nice-to-haves.',
  'polish-hero': '\nFOCUS: Limit suggestions to the hero / story / chapters tabs. Ignore travel + registry + faq for this pass.',
};

const SYSTEM = `You are Pear, a warm and concise editor for a wedding/celebration site builder.
You read a site manifest summary that includes a per-section COMPLETENESS map.
Return 3–8 specific, actionable improvements that ONLY reference sections marked
incomplete=true OR sections with placeholder copy. NEVER suggest improving a
section that's marked complete=true unless you can name a specific phrase from
its content that needs fixing — vague "your X is great, polish it" suggestions
are not allowed.

Each suggestion must reference SOMETHING SPECIFIC about THIS site (chapter
title, event name, the actual placeholder text it still has, etc).
Never lecture, never repeat yourself. Be friendly but direct. Each title <= 60
chars, description <= 140 chars.

Output ONLY a JSON array. Each item shape:
{"id":"kebab-case-id","level":"warning"|"suggestion","title":"...","description":"...","tab":"hero|details|events|story|registry|travel|gallery|rsvp|faq|chapters"}

Tab values:
  hero      — the cover (names, date, tagline, hero photo)
  details   — venue, dress code, arrival notes, RSVP deadline
  events    — schedule / order of the day
  story     — chapter-by-chapter narrative
  chapters  — same as story; pick whichever the suggestion targets
  registry  — gift links / cash fund
  travel    — hotels / airports / directions
  gallery   — photo grid
  rsvp      — the RSVP block (separate from logistics)
  faq      — FAQ questions

Use "warning" for missing critical info; "suggestion" for nice-to-haves.
Return [] if the site is genuinely complete.`;

const DEFAULT_TAGLINE = "We'd love you there. Come celebrate with us — the day will be better for it.";
const DEFAULT_TAGLINE_FRAGMENTS = [
  'celebrate with us',
  'the day will be better for it',
  "we'd love you there",
];

interface SectionStatus {
  /** Internal name (matches one of the EditorTab values). */
  name: EditorTab;
  /** True when the section has enough real content to publish. */
  complete: boolean;
  /** One-line note explaining the status — fed to the model so it
   *  can quote it back. */
  note: string;
}

/** Placeholder check for the hero tagline. The wizard ships a
 *  default line on every site; if the host never edited it, count
 *  the hero as "still placeholder" so Pear flags it. */
function isPlaceholderTagline(value: string | undefined): boolean {
  if (!value) return true;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return true;
  if (trimmed === DEFAULT_TAGLINE.toLowerCase()) return true;
  // Substring match catches lightly-edited variants.
  return DEFAULT_TAGLINE_FRAGMENTS.some((f) => trimmed.includes(f));
}

/** Build a structured per-section completeness map. The model reads
 *  this BEFORE it reads the rest of the summary, so its suggestions
 *  are anchored to real gaps rather than imagined ones. Mirrors the
 *  heuristics in PearNudges so the two surfaces agree. */
function computeSectionStatuses(manifest: StoryManifest): SectionStatus[] {
  const l = manifest.logistics ?? {};
  const poetry = manifest.poetry;
  const chapters = manifest.chapters ?? [];
  const events = manifest.events ?? [];
  const faqs = manifest.faqs ?? [];
  const hotels = manifest.travelInfo?.hotels ?? [];
  const tagline = poetry?.heroTagline;

  const out: SectionStatus[] = [];

  // Hero — date + venue + non-placeholder tagline + names.
  const heroPlaceholder = isPlaceholderTagline(tagline);
  const heroComplete = !!l.date && !!l.venue && !heroPlaceholder;
  out.push({
    name: 'hero',
    complete: heroComplete,
    note: heroComplete
      ? `OK (date=${l.date}, venue="${l.venue}", tagline non-default)`
      : `${!l.date ? 'MISSING DATE; ' : ''}${!l.venue ? 'MISSING VENUE; ' : ''}${heroPlaceholder ? 'TAGLINE IS STILL THE DEFAULT PLACEHOLDER LINE' : ''}`.trim(),
  });

  // Details — at least venue + dresscode or notes set, RSVP deadline.
  const detailsComplete = !!l.venue && (!!l.dresscode || !!l.notes) && !!l.rsvpDeadline;
  out.push({
    name: 'details',
    complete: detailsComplete,
    note: detailsComplete
      ? 'OK'
      : `${!l.dresscode && !l.notes ? 'MISSING dress code AND notes; ' : ''}${!l.rsvpDeadline ? 'MISSING RSVP DEADLINE; ' : ''}`.trim() || 'incomplete',
  });

  // Story / chapters — at least 2 chapters, each with a title and at
  // least one with a photo.
  const titledChapters = chapters.filter((c) => (c.title ?? '').trim().length > 0);
  const chaptersWithPhotos = chapters.filter((c) => (c.images ?? []).length > 0);
  const storyComplete = titledChapters.length >= 2 && chaptersWithPhotos.length >= 1;
  out.push({
    name: 'story',
    complete: storyComplete,
    note: storyComplete
      ? `OK (${titledChapters.length} titled chapters, ${chaptersWithPhotos.length} have photos)`
      : `Only ${titledChapters.length} titled chapters; ${chaptersWithPhotos.length} have photos`,
  });

  // Schedule / events — at least 2 events with descriptions.
  const eventsWithDesc = events.filter((e) => (e.description ?? '').trim().length >= 8);
  const eventsComplete = events.length >= 2 && eventsWithDesc.length >= 2;
  out.push({
    name: 'events',
    complete: eventsComplete,
    note: eventsComplete
      ? `OK (${events.length} events, ${eventsWithDesc.length} have descriptions)`
      : `${events.length} event(s) — ${eventsWithDesc.length} have a description`,
  });

  // Travel — at least 1 hotel with a description.
  const hotelsWithBlurb = hotels.filter((h) => {
    const note = (h as { description?: string; notes?: string }).description ?? (h as { notes?: string }).notes;
    return !!note && note.length >= 8;
  });
  const travelComplete = hotels.length >= 1 && hotelsWithBlurb.length >= 1;
  out.push({
    name: 'travel',
    complete: travelComplete,
    note: travelComplete
      ? `OK (${hotels.length} hotels, ${hotelsWithBlurb.length} described)`
      : `${hotels.length} hotel(s) — ${hotelsWithBlurb.length} have a one-liner`,
  });

  // Registry — enabled and at least one entry OR a cash fund URL.
  const registryComplete = !!manifest.registry?.enabled && (
    (manifest.registry?.entries?.length ?? 0) > 0 ||
    !!manifest.registry?.cashFundUrl
  );
  out.push({
    name: 'registry',
    complete: registryComplete,
    note: registryComplete
      ? `OK (${manifest.registry?.entries?.length ?? 0} entries${manifest.registry?.cashFundUrl ? ' + cash fund' : ''})`
      : `Disabled or empty`,
  });

  // FAQ — at least 4 questions.
  const faqComplete = faqs.length >= 4;
  out.push({
    name: 'faq',
    complete: faqComplete,
    note: faqComplete ? `OK (${faqs.length} questions)` : `Only ${faqs.length} question(s)`,
  });

  // Gallery — at least one chapter with photos OR a coverPhoto.
  const galleryComplete = chaptersWithPhotos.length >= 1 || !!(manifest as unknown as { coverPhoto?: string }).coverPhoto;
  out.push({
    name: 'gallery',
    complete: galleryComplete,
    note: galleryComplete ? 'OK' : 'No photos uploaded',
  });

  // RSVP — block enabled and a deadline set.
  const rsvpComplete = !!l.rsvpDeadline;
  out.push({
    name: 'rsvp',
    complete: rsvpComplete,
    note: rsvpComplete ? `OK (deadline ${l.rsvpDeadline})` : 'No RSVP deadline',
  });

  return out;
}

function summariseManifest(manifest: StoryManifest, names: [string, string]): string {
  const couple = `${names[0]} & ${names[1]}`;
  const date = manifest.logistics?.date ?? '(none)';
  const rsvp = manifest.logistics?.rsvpDeadline ?? '(none)';
  const tagline = manifest.poetry?.heroTagline ?? '';
  const taglineNote = isPlaceholderTagline(tagline) ? ' (DEFAULT PLACEHOLDER — host has not edited)' : '';
  const welcomeLine = manifest.poetry?.welcomeStatement ?? '(none)';
  const closingLine = manifest.poetry?.closingLine ?? '(none)';
  const dresscode = manifest.logistics?.dresscode ?? '(none)';
  const notes = manifest.logistics?.notes ?? '(none)';
  const venue = manifest.logistics?.venue ?? '(none)';

  const events = (manifest.events ?? []).map(e =>
    `  - ${e.type ?? 'event'}: "${e.name ?? '(unnamed)'}"${e.time ? ` @ ${e.time}` : ''}${e.venue ? ` — ${e.venue}` : ''} | desc: ${(e.description ?? '').slice(0, 70) || '(empty)'}`
  ).join('\n') || '  (none)';

  const chapters = (manifest.chapters ?? []).map((c, i) =>
    `  - ch${i}: "${c.title ?? '(untitled)'}"${c.subtitle ? ` — ${c.subtitle}` : ''} | desc: ${(c.description ?? '').slice(0, 70) || '(empty)'} | ${c.images?.length ?? 0} photo(s)`
  ).join('\n') || '  (none)';

  const registryEnabled = !!manifest.registry?.enabled;
  const registryEntries = manifest.registry?.entries?.length ?? 0;
  const registryFund = !!manifest.registry?.cashFundUrl;

  const hotels = manifest.travelInfo?.hotels ?? [];
  const hotelLines = hotels.map((h) => {
    const desc = ((h as { description?: string; notes?: string }).description ?? (h as { notes?: string }).notes ?? '').slice(0, 60);
    return `  - "${(h as { name?: string }).name ?? '(unnamed)'}" | ${desc || '(no description)'}`;
  }).join('\n') || '  (none)';
  const airports = manifest.travelInfo?.airports?.length ?? 0;

  const faqs = manifest.faqs ?? [];
  const faqLines = faqs.slice(0, 6).map((f) =>
    `  - Q: "${(f.question ?? '').slice(0, 60)}" | A: ${(f.answer ?? '').slice(0, 50) || '(empty)'}`
  ).join('\n') || '  (none)';

  const statuses = computeSectionStatuses(manifest);
  const statusLines = statuses.map((s) =>
    `  - ${s.name}: complete=${s.complete} | ${s.note}`
  ).join('\n');

  return `Couple: ${couple}
Date: ${date}
RSVP deadline: ${rsvp}
Venue: ${venue}
Hero tagline: "${tagline.slice(0, 120)}"${taglineNote}
Welcome line: ${welcomeLine.slice(0, 100)}
Closing line: ${closingLine.slice(0, 100)}
Dress code: ${dresscode}
Logistics notes: ${notes.slice(0, 80)}

SECTION COMPLETENESS (the model MUST anchor suggestions to incomplete=true rows):
${statusLines}

EVENTS:
${events}

CHAPTERS (${manifest.chapters?.length ?? 0}):
${chapters}

REGISTRY: enabled=${registryEnabled}, entries=${registryEntries}, cashFund=${registryFund}

TRAVEL — hotels (${hotels.length}):
${hotelLines}
airports: ${airports} | parking: ${!!manifest.travelInfo?.parkingInfo} | directions: ${!!manifest.travelInfo?.directions}

FAQS (${faqs.length}):
${faqLines}`;
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
  const intentHint = body.intent && INTENT_HINTS[body.intent] ? INTENT_HINTS[body.intent] : '';

  try {
    const res = await fetch(`${GEMINI_FLASH}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM + intentHint }] },
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
    let droppedCount = 0;
    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        suggestions = parsed
          .map((s: unknown, i: number): Suggestion | null => {
            if (typeof s !== 'object' || s === null) return null;
            const o = s as Record<string, unknown>;
            const level = o.level === 'warning' ? 'warning' : 'suggestion';
            // Validate the tab strictly. Previously an unrecognized
            // tab silently fell through to 'details', which meant
            // every "polish hero" / gallery / rsvp suggestion landed
            // the host on the wrong panel. Now: drop the suggestion
            // if the tab isn't valid — better to show nothing than to
            // mislead.
            if (typeof o.tab !== 'string' || !VALID_TABS.has(o.tab as EditorTab)) {
              droppedCount += 1;
              return null;
            }
            const tab = o.tab as EditorTab;
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

    if (droppedCount > 0) {
      console.warn(`[pear-critique] dropped ${droppedCount} suggestion(s) with invalid tab — keep VALID_TABS in sync with editor BLOCKS`);
    }

    return NextResponse.json({ suggestions, source: 'ai' });
  } catch {
    return NextResponse.json({ suggestions: [], source: 'exception' });
  }
}
