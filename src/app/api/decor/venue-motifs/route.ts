// ─────────────────────────────────────────────────────────────
// Pearloom / api/decor/venue-motifs/route.ts
//
// POST /api/decor/venue-motifs
//   body: { venue: string, occasion?: string, vibe?: string }
//   returns: { motifs: Array<{ id, label, prompt }> }
//
// Falls through when the heuristic dictionary in
// `src/lib/decor/venue-motifs.ts` doesn't match the venue. Asks
// Claude Haiku to derive 4-5 concrete decor motifs from the venue
// string + occasion + vibe. Each motif is a one-line subject prompt
// suitable for the AI decor library's customPrompt field.
//
// Rate-limited 30/hour/user — cheap call, but bot-protect anyway.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generate, parseJsonFromText, text, textFrom } from '@/lib/claude/client';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

interface MotifResponse {
  motifs: Array<{ id: string; label: string; prompt: string }>;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in to ask Pear for motifs.' }, { status: 401 });
  }

  const ip = getClientIp(req);
  const key = `decor-motifs:${session.user.email}:${ip}`;
  const rate = checkRateLimit(key, { max: 30, windowMs: 60 * 60 * 1000 });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'You\'ve asked Pear a lot — try again in an hour.' },
      { status: 429 },
    );
  }

  let body: { venue?: string; occasion?: string; vibe?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const venue = (body.venue ?? '').trim();
  if (!venue) {
    return NextResponse.json({ error: 'Venue is required.' }, { status: 400 });
  }
  const occasion = (body.occasion ?? 'wedding').trim();
  const vibe = (body.vibe ?? '').trim();

  const system = [
    text(
      'You are Pear, a hand-drawn-illustrator AI helping a couple build a website for an event. Your job: read the venue + occasion + optional vibe and suggest 4-5 concrete decor motifs that would look beautiful as small hand-drawn ornaments (used as a section divider, section stamps, RSVP confetti, footer flourish).',
    ),
    text(
      [
        'Rules for the motifs:',
        '- Concrete subjects, not adjectives. "olive sprig", not "elegant nature".',
        '- One subject per motif. No compound scenes.',
        '- 4-5 motifs total. Quality over quantity.',
        '- Each prompt MUST end with ", hand-drawn" so the downstream image API gets the right style cue.',
        '- Skip generic flowers unless the venue strongly suggests them.',
        '- Output JSON ONLY — no prose, no markdown fences. Shape exactly:',
        '  { "motifs": [ { "id": "kebab-case-id", "label": "Title Case Label", "prompt": "subject phrase, hand-drawn" } ] }',
      ].join('\n'),
    ),
  ];

  const user = [
    `Venue: ${venue}`,
    `Occasion: ${occasion}`,
    vibe ? `Vibe: ${vibe}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const msg = await generate({
      tier: 'haiku',
      system,
      messages: [{ role: 'user', content: user }],
      maxTokens: 800,
      temperature: 0.6,
    });
    const raw = textFrom(msg);
    const parsed = parseJsonFromText<MotifResponse>(raw);

    // Validate + clean. Drop anything that doesn't have all three
    // fields, dedupe by id, cap at 5.
    const seen = new Set<string>();
    const motifs = (parsed.motifs ?? [])
      .filter((m) => m && typeof m.id === 'string' && typeof m.label === 'string' && typeof m.prompt === 'string')
      .filter((m) => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      })
      .slice(0, 5);

    if (motifs.length === 0) {
      return NextResponse.json({ error: 'Pear couldn\'t come up with motifs. Try a more specific venue.' }, { status: 502 });
    }

    return NextResponse.json({ motifs });
  } catch (err) {
    console.error('[decor/venue-motifs] failed:', err);
    return NextResponse.json({ error: 'Pear is unreachable. Try again in a moment.' }, { status: 502 });
  }
}
