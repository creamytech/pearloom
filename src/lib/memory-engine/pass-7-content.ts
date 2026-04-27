// ─────────────────────────────────────────────────────────────
// Pearloom / lib/memory-engine/pass-7-content.ts
//
// Pass 7 — Block content auto-population. After the creative
// passes (story, poetry, vibeSkin, art), this pass fills the
// functional blocks that otherwise ship empty:
//
//   • FAQ            — Claude Haiku drafts 6–8 Q&As from manifest
//                      logistics + occasion. Pure AI, no API.
//   • Registry       — Occasion-aware retailer picks + cash-fund
//                      copy. Pure AI.
//   • Travel         — Real hotels + airports + drive time via
//                      existing /api/ai-hotels endpoint.
//
// Keeps the existing manifest + pipeline shape — returns fields
// that the stream route merges onto the final manifest.
// ─────────────────────────────────────────────────────────────

import type { StoryManifest, FaqItem, TravelInfo } from '@/types';
import { generate, textFrom, parseJsonFromText } from '@/lib/claude/client';
import { log, logWarn } from './gemini-client';

export interface Pass7Result {
  faqs?: FaqItem[];
  registry?: StoryManifest['registry'];
  travelInfo?: TravelInfo;
}

type Voice = 'solemn' | 'intimate' | 'ceremonial' | 'playful' | 'celebratory';

// ── FAQ ───────────────────────────────────────────────────────

async function generateFaqs({
  occasion,
  voice,
  names,
  venue,
  date,
  time,
  dresscode,
  rsvpDeadline,
  guestNotes,
}: {
  occasion: string;
  voice: Voice;
  names?: [string, string];
  venue?: string;
  date?: string;
  time?: string;
  dresscode?: string;
  rsvpDeadline?: string;
  guestNotes?: string;
}): Promise<FaqItem[]> {
  // Skip FAQ entirely for events where it reads wrong (memorials
  // shouldn't get auto "What's the dress code?" chirpy answers).
  if (voice === 'solemn') return [];

  const ctx = [
    names ? `Names: ${names.filter(Boolean).join(' & ')}.` : null,
    venue ? `Venue: ${venue}.` : null,
    date ? `Date: ${date}.` : null,
    time ? `Start: ${time}.` : null,
    dresscode ? `Dress code: ${dresscode}.` : null,
    rsvpDeadline ? `RSVP deadline: ${rsvpDeadline}.` : null,
    guestNotes ? `Host notes: ${guestNotes}.` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const prompt = `Draft 6–8 FAQ entries for a ${occasion} celebration site. Tone: ${voice}, ${
    voice === 'playful' ? 'loose and funny' : voice === 'ceremonial' ? 'respectful and formal' : 'warm and honest'
  }. Guests will see these before they RSVP.

CONTEXT:
${ctx || '(no details yet — write generic-but-warm questions)'}

Cover these topics when possible:
  - arrival + start time
  - dress code
  - kids / plus ones
  - parking / transport
  - dietary / food
  - accommodations (hotels)
  - gift / registry expectations
  - anything unusual for this occasion

Rules:
  - Each answer 1–3 sentences max.
  - Use the context verbatim where relevant (don't invent a venue or time).
  - If a detail is missing, phrase the answer so the host can fill it in ("details coming soon").
  - Match the tone — never "Can't wait!!" for ceremonial events.

Return ONLY a JSON array. No markdown. No preface.
[{ "question": "...", "answer": "..." }, ...]`;

  try {
    const msg = await generate({
      tier: 'haiku',
      temperature: 0.6,
      maxTokens: 1800,
      system: 'You are Pearloom\'s FAQ drafter. Precise, warm, never saccharine.',
      messages: [
        { role: 'user', content: prompt },
        { role: 'assistant', content: '[' },
      ],
    });
    const raw = '[' + textFrom(msg).trim();
    const parsed = parseJsonFromText<Array<{ question?: string; answer?: string }>>(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((q) => q.question && q.answer)
      .slice(0, 10)
      .map((q, i) => ({ id: `faq-${i}`, question: q.question!, answer: q.answer!, order: i }));
  } catch (err) {
    logWarn('[Pass 7 · FAQ]', err);
    return [];
  }
}

// ── Registry ──────────────────────────────────────────────────

async function generateRegistry({
  occasion,
  voice,
  names,
}: {
  occasion: string;
  voice: Voice;
  names?: [string, string];
}): Promise<StoryManifest['registry'] | null> {
  // Not all occasions have registries. Memorials get donation
  // guidance instead; story sites don't need one at all.
  const registryApplies = !['memorial', 'funeral', 'story', 'bachelor-party', 'bachelorette-party', 'reunion'].includes(
    occasion,
  );
  if (!registryApplies) return null;

  const prompt = `Draft registry copy + 2–3 retailer picks for a ${occasion} celebration.

Tone: ${voice}, writing as if from ${names?.filter(Boolean).join(' & ') || 'the hosts'}.

Output EXACT JSON shape — no markdown, no preface:
{
  "message": "1–2 sentence 'gifts are optional' note in the host's voice.",
  "cashFundMessage": "1 sentence alternative — contributions toward X",
  "entries": [
    { "name": "Retailer display name", "url": "https://...", "note": "one-line reason" }
  ]
}

Retailer rules by occasion:
  - wedding/anniversary/engagement: pick 2–3 from Zola, Crate & Barrel, Williams-Sonoma, West Elm, Amazon. Prefer couple-centric ones.
  - baby-shower/gender-reveal/sip-and-see: Babylist, Amazon Baby, Pottery Barn Kids.
  - birthday/milestone-birthday/sweet-sixteen/retirement/graduation: Amazon, local bookstore, a donation-in-lieu option.
  - bridal-shower/rehearsal-dinner/welcome-party/brunch: same as wedding.
  - housewarming: West Elm, Crate & Barrel, Food52.
  - cultural (bar/bat mitzvah, quinceañera, baptism): honeyfund-style + a charitable option.

  The "url" must be the retailer's real homepage (e.g. https://zola.com).`;

  try {
    const msg = await generate({
      tier: 'haiku',
      temperature: 0.4,
      maxTokens: 600,
      system: 'You write registry copy for Pearloom. Never use "we\'d love".',
      messages: [
        { role: 'user', content: prompt },
        { role: 'assistant', content: '{' },
      ],
    });
    const raw = '{' + textFrom(msg).trim();
    const parsed = parseJsonFromText<{
      message?: string;
      cashFundMessage?: string;
      entries?: Array<{ name?: string; url?: string; note?: string }>;
    }>(raw);
    const entries = (parsed.entries ?? [])
      .filter((e) => e.name && e.url)
      .slice(0, 4)
      .map((e) => ({ name: e.name!, url: e.url!, note: e.note }));
    return {
      enabled: true,
      message: parsed.message,
      cashFundMessage: parsed.cashFundMessage,
      entries,
    };
  } catch (err) {
    logWarn('[Pass 7 · Registry]', err);
    return null;
  }
}

// ── Travel (via existing /api/ai-hotels) ──────────────────────

async function generateTravelInfo({
  venue,
  venueAddress,
  baseUrl,
}: {
  venue?: string;
  venueAddress?: string;
  baseUrl: string;
}): Promise<TravelInfo | null> {
  if (!venue && !venueAddress) return null;
  try {
    const res = await fetch(`${baseUrl}/api/ai-hotels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        venueName: venue,
        venueAddress,
        radiusMiles: 8,
        count: 5,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json() as {
      hotels?: Array<{ name: string; address?: string; distance?: string; priceLevel?: string; bookingUrl?: string; notes?: string; groupRate?: string }>;
      airports?: Array<{ code: string; name?: string; distance?: string }> | string[];
      drivingTips?: string;
      parkingInfo?: string;
      directions?: string;
    };
    const airports: string[] = Array.isArray(data.airports)
      ? (data.airports as Array<string | { code: string; name?: string; distance?: string }>).map((a) =>
          typeof a === 'string' ? a : `${a.code}${a.name ? ` · ${a.name}` : ''}${a.distance ? ` (${a.distance})` : ''}`,
        )
      : [];
    const travel: TravelInfo = {
      airports,
      hotels: (data.hotels ?? []).slice(0, 5).map((h) => ({
        name: h.name,
        address: h.address ?? '',
        bookingUrl: h.bookingUrl,
        groupRate: h.groupRate,
        notes: h.notes ?? h.distance ?? h.priceLevel,
      })),
      parkingInfo: data.parkingInfo,
      directions: data.directions ?? data.drivingTips,
    };
    return travel;
  } catch (err) {
    logWarn('[Pass 7 · Travel]', err);
    return null;
  }
}

// ── Orchestrator ──────────────────────────────────────────────

export async function runPass7Content(opts: {
  manifest: StoryManifest;
  occasion: string;
  voice: Voice;
  names?: [string, string];
  baseUrl: string;
}): Promise<Pass7Result> {
  const { manifest, occasion, voice, names, baseUrl } = opts;
  const logistics = manifest.logistics ?? {};

  log('[Pass 7] Auto-populating FAQ, Registry, Travel…');
  const [faqs, registry, travelInfo] = await Promise.all([
    generateFaqs({
      occasion,
      voice,
      names,
      venue: logistics.venue,
      date: logistics.date,
      time: logistics.time,
      dresscode: logistics.dresscode,
      rsvpDeadline: logistics.rsvpDeadline,
      guestNotes: logistics.notes,
    }),
    generateRegistry({ occasion, voice, names }),
    generateTravelInfo({
      venue: logistics.venue,
      venueAddress: logistics.venueAddress,
      baseUrl,
    }),
  ]);

  log(
    '[Pass 7] Populated:',
    `${faqs.length} FAQs,`,
    registry?.entries?.length ?? 0,
    'registry picks,',
    travelInfo?.hotels?.length ?? 0,
    'hotels',
  );

  return {
    faqs: faqs.length > 0 ? faqs : undefined,
    registry: registry ?? undefined,
    travelInfo: travelInfo ?? undefined,
  };
}
