// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/ask-couple/route.ts
// AI chatbot that speaks AS the couple, trained on their actual
// text messages / writing samples they provide.
// Now with: full manifest knowledge, RSVP awareness, post-wedding mode
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/** Build a comprehensive knowledge base from the full manifest */
function buildKnowledgeBase(manifest: Record<string, unknown>): string {
  const sections: string[] = [];

  // Events / Schedule
  const events = (manifest.events as Array<Record<string, unknown>>) || [];
  if (events.length > 0) {
    sections.push('SCHEDULE & EVENTS:');
    events.forEach(e => {
      const parts = [`- ${e.name || 'Event'}`];
      if (e.date) parts.push(`on ${e.date}`);
      if (e.time) parts.push(`at ${e.time}`);
      if (e.endTime) parts.push(`until ${e.endTime}`);
      if (e.venue) parts.push(`at ${e.venue}`);
      if (e.address) parts.push(`(${e.address})`);
      if (e.dressCode) parts.push(`| Dress code: ${e.dressCode}`);
      if (e.notes) parts.push(`| Note: ${e.notes}`);
      sections.push(parts.join(' '));
    });
  }

  // Logistics
  const logistics = manifest.logistics as Record<string, unknown> | undefined;
  if (logistics) {
    sections.push('LOGISTICS:');
    if (logistics.venue) sections.push(`- Main venue: ${logistics.venue}`);
    if (logistics.venueAddress) sections.push(`- Address: ${logistics.venueAddress}`);
    if (logistics.date) sections.push(`- Date: ${logistics.date}`);
    if (logistics.time) sections.push(`- Time: ${logistics.time}`);
    if (logistics.rsvpDeadline) sections.push(`- RSVP deadline: ${logistics.rsvpDeadline}`);
    if (logistics.dresscode) sections.push(`- Dress code: ${logistics.dresscode}`);
    if (logistics.notes) sections.push(`- Notes: ${logistics.notes}`);
  }

  // Travel
  const travel = manifest.travelInfo as Record<string, unknown> | undefined;
  if (travel) {
    const airports = travel.airports as string[] | undefined;
    const hotels = travel.hotels as Array<Record<string, unknown>> | undefined;
    if (airports?.length) sections.push(`AIRPORTS: ${airports.join(', ')}`);
    if (hotels?.length) {
      sections.push('HOTELS:');
      hotels.forEach(h => {
        const parts = [`- ${h.name}`];
        if (h.address) parts.push(`at ${h.address}`);
        if (h.groupRate) parts.push(`| Group rate: ${h.groupRate}`);
        if (h.bookingUrl) parts.push(`| Book: ${h.bookingUrl}`);
        if (h.notes) parts.push(`| ${h.notes}`);
        sections.push(parts.join(' '));
      });
    }
    if (travel.parkingInfo) sections.push(`PARKING: ${travel.parkingInfo}`);
    if (travel.directions) sections.push(`DIRECTIONS: ${travel.directions}`);
  }

  // Registry
  const registry = manifest.registry as Record<string, unknown> | undefined;
  if (registry?.enabled) {
    sections.push('REGISTRY:');
    if (registry.message) sections.push(`- Message: ${registry.message}`);
    if (registry.cashFundUrl) sections.push(`- Cash fund: ${registry.cashFundUrl}`);
    const entries = registry.entries as Array<Record<string, string>> | undefined;
    entries?.forEach(e => sections.push(`- ${e.name}: ${e.url}`));
  }

  // FAQs
  const faqs = (manifest.faqs as Array<Record<string, string>>) || [];
  if (faqs.length > 0) {
    sections.push('FREQUENTLY ASKED QUESTIONS:');
    faqs.forEach(f => sections.push(`Q: ${f.question}\nA: ${f.answer}`));
  }

  // Chapter locations (story context)
  const chapters = (manifest.chapters as Array<Record<string, unknown>>) || [];
  const locations = chapters
    .filter(c => c.location && (c.location as Record<string, unknown>).label)
    .map(c => `${c.title}: ${(c.location as Record<string, string>).label}`)
    .slice(0, 5);
  if (locations.length > 0) {
    sections.push(`OUR STORY LOCATIONS: ${locations.join('; ')}`);
  }

  // Poetry / tagline
  const poetry = manifest.poetry as Record<string, string> | undefined;
  if (poetry?.heroTagline) sections.push(`OUR TAGLINE: "${poetry.heroTagline}"`);

  return sections.join('\n');
}

/** Generate contextual question suggestions based on what's in the manifest */
function generateSuggestions(manifest: Record<string, unknown>): string[] {
  const suggestions: string[] = [];
  const events = (manifest.events as Array<Record<string, unknown>>) || [];
  const logistics = manifest.logistics as Record<string, unknown> | undefined;
  const travel = manifest.travelInfo as Record<string, unknown> | undefined;
  const registry = manifest.registry as Record<string, unknown> | undefined;

  if (logistics?.dresscode || events.some(e => e.dressCode)) {
    suggestions.push('What should I wear?');
  }
  if (events.length > 0) {
    suggestions.push('What time does it start?');
  }
  if (travel && ((travel.hotels as unknown[])?.length || travel.parkingInfo)) {
    suggestions.push('Where should I stay?');
  }
  if (registry?.enabled) {
    suggestions.push('What gifts do you want?');
  }
  // Always include the love story question
  suggestions.push('Tell me your love story!');

  return suggestions.slice(0, 4);
}

export async function POST(req: NextRequest) {
  // Rate limit: 20 requests per IP per hour to prevent AI cost abuse
  const ip = getClientIp(req);
  const rateCheck = checkRateLimit(`ask-couple:${ip}`, { max: 20, windowMs: 60 * 60 * 1000 });
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Too many questions — please wait a while and try again.' },
      { status: 429 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'AI not configured' }, { status: 500 });

  try {
    const { siteId, question, history, guestEmail } = await req.json() as {
      siteId: string;
      question: string;
      history?: { role: 'user' | 'couple'; text: string }[];
      guestEmail?: string;
    };

    if (!siteId || !question?.trim()) {
      return NextResponse.json({ error: 'siteId and question required' }, { status: 400 });
    }

    // Fetch the site's manifest to get couple info + voice samples
    const supabase = getSupabase();
    const { data: site } = await supabase
      .from('sites')
      .select('manifest, names')
      .eq('subdomain', siteId)
      .single();

    if (!site) return NextResponse.json({ answer: "We're a little busy right now, but we'll catch up at the wedding!" });

    const manifest = (site.manifest || {}) as Record<string, unknown>;
    const names: [string, string] = Array.isArray(site.names) && site.names.length >= 2
      ? [String(site.names[0]), String(site.names[1])]
      : ['We', 'Us'];
    const voiceSamples: string[] = (manifest.voiceSamples as string[]) || [];
    const vibeString: string = (manifest.vibeString as string) || '';

    const [name1, name2] = names;

    // ── RSVP-aware context ──
    let rsvpContext = '';
    if (guestEmail) {
      try {
        const { data: rsvp } = await supabase
          .from('guests')
          .select('status, guest_name, meal_preference, selected_events')
          .eq('site_id', siteId)
          .eq('email', guestEmail)
          .single();
        if (rsvp) {
          if (rsvp.status === 'attending') {
            rsvpContext = `\nIMPORTANT: This guest (${rsvp.guest_name}) has RSVP'd YES. Be extra excited. If relevant, mention you're looking forward to seeing them.`;
          } else if (rsvp.status === 'declined') {
            rsvpContext = `\nThis guest (${rsvp.guest_name}) has declined the RSVP. Be gracious and understanding if they mention it.`;
          } else {
            rsvpContext = `\nThis guest (${rsvp.guest_name}) hasn't RSVP'd yet. If it comes up naturally, gently encourage them to RSVP on the site.`;
          }
        }
      } catch { /* RSVP lookup failed — continue without it */ }
    }

    // ── Post-wedding personality shift ──
    const weddingDate = (manifest.logistics as Record<string, unknown> | undefined)?.date as string | undefined;
    const isPostWedding = weddingDate ? new Date(weddingDate) < new Date() : false;
    const timeContext = isPostWedding
      ? `\nIMPORTANT: The wedding has ALREADY HAPPENED. Speak in past tense about the event. Be nostalgic and grateful. Say things like "It was such a beautiful day" instead of future-tense.`
      : '';

    // ── Full knowledge base ──
    const knowledgeBase = buildKnowledgeBase(manifest);

    // Build voice context
    const voiceContext = voiceSamples.length > 0
      ? `\nHere are real text messages and writing samples from ${name1} & ${name2} — match their voice:\n\n${voiceSamples.slice(0, 8).map((s, i) => `Sample ${i + 1}: "${s}"`).join('\n')}\n`
      : '';

    const conversationHistory = (history || []).map(m =>
      `${m.role === 'user' ? 'Guest' : `${name1} & ${name2}`}: ${m.text}`
    ).join('\n');

    const systemPrompt = `You are ${name1} & ${name2}, a couple ${isPostWedding ? 'who recently got married' : 'getting married'}. A guest is chatting with you on your wedding website. Respond warmly and authentically.
${voiceContext}
Their wedding vibe: "${vibeString}"
${timeContext}
${rsvpContext}

COMPLETE KNOWLEDGE BASE — use this to answer ANY question accurately:
${knowledgeBase}

${conversationHistory ? `Previous conversation:\n${conversationHistory}\n` : ''}

RULES:
- Always speak as both of them together ("we", "us", "our")
- Keep replies SHORT — 1-3 sentences, like a real text
- Match their tone: casual, loving, excited, warm
- If the answer is in the KNOWLEDGE BASE above, use it! Give accurate, specific answers about schedule, venue, dress code, hotels, parking, etc.
- Only deflect if the information truly isn't available — say something like "We haven't figured that out yet — stay tuned!"
- NEVER say you're an AI
- Use emoji naturally if their samples show they do

Guest's question: "${question}"
${name1} & ${name2}'s reply:`;

    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: {
          temperature: 0.95,
          maxOutputTokens: 250,
          stopSequences: ['Guest:'],
        },
      }),
    });

    const data = await res.json();
    const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
      || (isPostWedding ? "Let's catch up soon!" : "See you at the wedding!");

    // ── Generate suggested questions on first message ──
    let suggestions: string[] | undefined;
    if (!history || history.length === 0) {
      suggestions = generateSuggestions(manifest);
    }

    return NextResponse.json({ answer, suggestions });
  } catch (err) {
    console.error('[ask-couple] Error:', err);
    return NextResponse.json({ answer: "Oops, we're a little distracted with wedding planning — ask us at the reception!" });
  }
}
