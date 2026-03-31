// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Pearloom / app/api/ask-couple/route.ts
// AI chatbot that speaks AS the couple, trained on their actual
// text messages / writing samples they provide.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

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
  // Rate limit: 20 requests per IP per hour to prevent AI cost abuse
  const ip = getClientIp(req);
  const rateCheck = checkRateLimit(`ask-couple:${ip}`, { max: 20, windowMs: 60 * 60 * 1000 });
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Too many questions — please wait a while and try again.' },
      { status: 429 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'AI not configured' }, { status: 500 });

  try {
    const { siteId, question, history } = await req.json() as {
      siteId: string;
      question: string;
      history?: { role: 'user' | 'couple'; text: string }[];
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

    if (!site) return NextResponse.json({ answer: "We're a little busy right now, but we'll catch up at the wedding! ðŸ’•" });

    const manifest = site.manifest || {};
    const names: [string, string] = Array.isArray(site.names) && site.names.length >= 2
      ? [String(site.names[0]), String(site.names[1])]
      : ['We', 'Us'];
    const voiceSamples: string[] = manifest.voiceSamples || [];
    const vibeString: string = manifest.vibeString || '';

    const [name1, name2] = names;

    // Build the system prompt
    const voiceContext = voiceSamples.length > 0
      ? `\nHere are real text messages and writing samples from ${name1} & ${name2} â€” use these to match their exact voice, phrasing, emoji usage, and personality:\n\n${voiceSamples.slice(0, 8).map((s, i) => `Sample ${i + 1}: "${s}"`).join('\n')}\n`
      : '';

    const conversationHistory = (history || []).map(m =>
      `${m.role === 'user' ? 'Guest' : `${name1} & ${name2}`}: ${m.text}`
    ).join('\n');

    const systemPrompt = `You are ${name1} & ${name2}, a couple getting married. A wedding guest is chatting with you on your wedding website. Respond warmly and authentically â€” as if you are actually them texting back.
${voiceContext}
Their wedding vibe: "${vibeString}"

Key facts about the wedding (from their site):
- Couple: ${name1} & ${name2}
- Venue: ${manifest.logistics?.venue || 'TBD'}
- Date: ${manifest.logistics?.date || 'Coming Soon'}
- RSVP Deadline: ${manifest.logistics?.rsvpDeadline || 'TBD'}

${conversationHistory ? `Previous conversation:\n${conversationHistory}\n` : ''}

RULES:
- Always speak as both of them together ("we", "us", "our")
- Keep replies SHORT â€” 1-3 sentences, like a real text
- Match their tone: casual, loving, excited, warm
- If asked about something you don't know, say something charming like "Ask us at the reception! ðŸ¥‚"
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
          maxOutputTokens: 180,
          stopSequences: ['Guest:'],
        },
      }),
    });

    const data = await res.json();
    const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
      || `We'd love to chat more in person! See you at the wedding ðŸ’•`;

    return NextResponse.json({ answer });
  } catch (err) {
    console.error('[ask-couple] Error:', err);
    return NextResponse.json({ answer: "Oops, we're a little distracted with wedding planning ðŸ˜… â€” ask us at the reception!" });
  }
}

