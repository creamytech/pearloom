// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/coordinator/route.ts
// AI wedding day coordinator — answers guest questions about
// venue, schedule, parking, dress code, shuttle, etc.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'AI not configured' }, { status: 500 });

  try {
    const { siteId, message, history } = await req.json() as {
      siteId: string;
      message: string;
      history?: Array<{ role: 'user' | 'assistant'; content: string }>;
    };

    if (!siteId || !message?.trim()) {
      return NextResponse.json({ error: 'siteId and message required' }, { status: 400 });
    }

    // Fetch the site's manifest to get logistics + coordinator FAQs
    const supabase = getSupabase();
    const { data: site } = await supabase
      .from('sites')
      .select('manifest, names')
      .eq('subdomain', siteId)
      .single();

    if (!site) {
      return NextResponse.json({
        reply: "I don't have details for this event yet. Please check with the couple!",
      });
    }

    const manifest = site.manifest || {};
    const names: [string, string] = Array.isArray(site.names) && site.names.length >= 2
      ? [String(site.names[0]), String(site.names[1])]
      : ['the couple', 'their partner'];

    const [name1, name2] = names;
    const logistics = manifest.logistics || {};
    const events: Array<{ name: string; venue: string; time: string; address: string }> =
      (manifest.events || []).map((e: { name?: string; venue?: string; time?: string; address?: string }) => ({
        name: e.name || '',
        venue: e.venue || '',
        time: e.time || '',
        address: e.address || '',
      }));

    const coordinatorFaqs: Array<{ q: string; a: string }> = manifest.coordinatorFaqs || [];

    // Derive ceremony and reception from events list if available
    const ceremonyEvent = events.find(e =>
      (e.name || '').toLowerCase().includes('ceremony')
    );
    const receptionEvent = events.find(e =>
      (e.name || '').toLowerCase().includes('reception')
    );

    const systemPrompt = `You are the friendly, helpful wedding coordinator assistant for ${name1} & ${name2}'s wedding.
You answer guest questions about the event. Be warm, helpful, and concise.

WEDDING DETAILS:
Date: ${logistics.date || 'TBD'}
${ceremonyEvent ? `Ceremony: ${ceremonyEvent.venue} at ${ceremonyEvent.time}, ${ceremonyEvent.address}` : logistics.venue ? `Venue: ${logistics.venue}` : ''}
${receptionEvent ? `Reception: ${receptionEvent.venue} at ${receptionEvent.time}, ${receptionEvent.address}` : ''}
Dress Code: ${logistics.dresscode || 'Check with the couple'}
${logistics.notes ? logistics.notes : ''}

${events.length > 0 ? `EVENTS:\n${events.map(e => `${e.name}: ${e.venue} at ${e.time} — ${e.address}`).join('\n')}` : ''}

${coordinatorFaqs.length > 0 ? `CUSTOM Q&A (couple provided):\n${coordinatorFaqs.map(f => `Q: ${f.q}\nA: ${f.a}`).join('\n')}` : ''}

RULES:
- If you don't know the answer, say "I'm not sure — check with the couple directly!"
- Never make up addresses, times, or details not provided above
- Keep answers under 3 sentences
- Be warm and celebratory — this is a joyful occasion`;

    // Build the conversation history for Gemini
    const historyParts = (history || []).map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const contents = [
      ...historyParts,
      { role: 'user', parts: [{ text: message }] },
    ];

    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 220,
        },
      }),
    });

    const data = await res.json();
    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "I'm not sure about that one — check with the couple directly!";

    return NextResponse.json({ reply });
  } catch (err) {
    console.error('[coordinator] Error:', err);
    return NextResponse.json({
      reply: "I'm having a moment — please check with the couple directly for this one!",
    });
  }
}
