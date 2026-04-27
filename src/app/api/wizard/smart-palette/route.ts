// ─────────────────────────────────────────────────────────────
// Pearloom / api/wizard/smart-palette
//
// Claude Haiku reads the user's occasion + venue + vibes +
// fact-sheet and returns 3 bespoke palette candidates with
// rationales. The headline feature here is venue intelligence:
// "Madison Square Garden" → Knicks orange / blue; "Getty Villa
// garden" → ochre + olive; "Central Park in October" → warm
// rust + slate. The wizard renders whichever the user picks,
// and stores the hex array on `preferredPalette` so Pass 2
// (vibeSkin) honors it.
//
// Auth-gated + rate-limited — Haiku is cheap but not free.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { generateJson } from '@/lib/claude';

export const dynamic = 'force-dynamic';
export const maxDuration = 45;

interface Body {
  occasion: string;
  names?: [string, string];
  venue?: string;
  city?: string;
  vibes?: string[];
  howWeMet?: string;
  whyCelebrate?: string;
}

interface Palette {
  id: string;            // kebab-case slug
  name: string;          // evocative 2-3 word name
  rationale: string;     // 1 sentence "why this fits"
  colors: [string, string, string, string];   // hex: [background, primary, accent, contrast]
  tone: string;          // 1-word mood
  source: string;        // e.g. "venue" | "vibe" | "fallback"
}

const PALETTE_SCHEMA = {
  type: 'object',
  properties: {
    palettes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          rationale: { type: 'string' },
          colors: {
            type: 'array',
            minItems: 4,
            maxItems: 4,
            items: { type: 'string' },
          },
          tone: { type: 'string' },
          source: { type: 'string' },
        },
        required: ['id', 'name', 'rationale', 'colors', 'tone', 'source'],
      },
    },
  },
  required: ['palettes'],
} as const;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }

  const rate = checkRateLimit(`smart-palette:${session.user.email}:${getClientIp(req)}`, {
    max: 12,
    windowMs: 5 * 60_000,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Too many palette suggestions in a short window. Try again shortly.' },
      { status: 429 },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }
  if (!body.occasion) {
    return NextResponse.json({ error: 'occasion is required' }, { status: 400 });
  }

  const lines: string[] = [];
  lines.push(`Occasion: ${body.occasion}`);
  if (body.names && (body.names[0] || body.names[1])) {
    const joined = [body.names[0], body.names[1]].filter(Boolean).join(' & ');
    if (joined) lines.push(`Who: ${joined}`);
  }
  if (body.venue) lines.push(`Venue: ${body.venue}`);
  if (body.city) lines.push(`City: ${body.city}`);
  if (body.vibes?.length) lines.push(`Vibes: ${body.vibes.join(', ')}`);
  if (body.howWeMet) lines.push(`Backstory: ${body.howWeMet.slice(0, 400)}`);
  if (body.whyCelebrate) lines.push(`Why this celebration: ${body.whyCelebrate.slice(0, 400)}`);

  const context = lines.join('\n');

  const system =
    `You are Pearloom's palette advisor. You pick THREE distinct four-color palettes for a ` +
    `celebration site. One palette MUST be venue-aware when a venue is given (e.g. ` +
    `"Madison Square Garden" → Knicks orange (#F58426) + blue (#006BB6); ` +
    `"Yankee Stadium" → navy + white pinstripe; ` +
    `"Dodger Stadium" → Dodger blue + cream; ` +
    `"Wrigley Field" → Cubs red + blue; ` +
    `"Fenway Park" → Red Sox red + navy; ` +
    `"Getty Villa" → ochre + olive + travertine; ` +
    `"Glastonbury" → meadow + tie-dye; ` +
    `"Kyoto in winter" → bone + plum-blossom + ink; ` +
    `"Napa vineyard" → deep burgundy + cream + olive; ` +
    `"Hamptons beach" → coastal blue + sand + coral). ` +
    `If no venue, key the first palette off the city or a landmark you can infer. ` +
    `The other two palettes must come from DIFFERENT angles: one from the vibes, one ` +
    `unexpected but still coherent (e.g. a palette from a photo album you'd reach for, ` +
    `or an editorial color study).\n\n` +
    `STRICT RULES:\n` +
    `- Colors are 6-digit hex strings like "#F58426". Always include '#'.\n` +
    `- Each palette has EXACTLY four colors: [background (light/paper), primary (display), accent (highlight), contrast (ink)].\n` +
    `- Background must be light and readable (luminance > 0.65 on 0..1 scale).\n` +
    `- Contrast must be dark enough to read body type on the background.\n` +
    `- Never produce neon unless the voice literally is "playful" or "disco".\n` +
    `- Memorial and funeral occasions must return quiet, muted palettes (no saturated brights). No exceptions.\n` +
    `- Respect the season when the venue or date hints at one.\n` +
    `- "source" field must be one of: "venue", "vibe", "voice", "fallback".\n` +
    `- Palette "id" must be kebab-case and unique within the response.\n` +
    `- Palette "name" is 2–3 poetic words. No clichés.\n` +
    `- Rationale is ONE sentence, under 20 words, specific to their actual context.`;

  try {
    const result = await generateJson<{ palettes: Palette[] }>({
      tier: 'haiku',
      system,
      messages: [
        { role: 'user', content: `Design three palettes for this event:\n\n${context}` },
      ],
      maxTokens: 1500,
      temperature: 0.85,
      schema: PALETTE_SCHEMA as unknown as Record<string, unknown>,
      schemaName: 'emit_palettes',
      schemaDescription: 'Emit three color palettes tuned to the event details.',
    });

    const raw = Array.isArray(result?.palettes) ? result.palettes : [];
    const normalized = raw
      .map((p, i) => ({
        ...p,
        id: (p.id || `palette-${i + 1}`).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, ''),
        colors: (p.colors ?? []).map((c) => String(c).trim()).filter((c) => /^#[0-9a-fA-F]{6}$/.test(c)) as string[],
      }))
      .filter((p) => p.colors.length === 4)
      .slice(0, 3);

    if (normalized.length === 0) {
      return NextResponse.json({ error: 'Palette advisor returned nothing usable.' }, { status: 502 });
    }

    return NextResponse.json({ ok: true, palettes: normalized });
  } catch (err) {
    console.error('[smart-palette] failed:', err);
    return NextResponse.json({ error: 'Palette advisor is busy. Try again shortly.' }, { status: 502 });
  }
}
