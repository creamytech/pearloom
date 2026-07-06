// ─────────────────────────────────────────────────────────────
// /api/draft-registry — Pear drafts a starter registry from
// occasion + venue + vibes. The host clicks "Pear, draft my
// registry" in RegistryPanel; this endpoint returns 6-10 items
// across cash funds, kitchen, home, and experiences in the
// canonical editor shape, ready to insert without further mapping.
//
// Items aren't tied to real retailers — Pear just shapes them
// (name, description, price hint, kind). The host picks the
// retailer URL after; we pre-fill a placeholder so the row reads
// as drafted, not broken.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, checkPearGate } from '@/lib/rate-limit';
import { geminiRetryFetch } from '@/lib/memory-engine/gemini-client';
import { overBudget, chargeAi, centsForUsage, approxTokens, budgetKey } from '@/lib/ai-budget';

export const dynamic = 'force-dynamic';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent';

const RATE_LIMIT = { max: 8, windowMs: 60 * 60 * 1000 };

interface DraftRequest {
  occasion?: string;
  venue?: string;
  vibes?: string[] | string;
  /** Couple names — informs voice ("for Alex & Jamie's kitchen"). */
  names?: [string, string];
  /** When the host already has items, exclude their categories
   *  so Pear suggests complementary ones instead of duplicates. */
  existingNames?: string[];
}

interface DraftedItem {
  label: string;
  description: string;
  kind: 'fund' | 'registry' | 'link';
  priceLabel: string;
  /** Placeholder URL — host fills in the retailer link after. */
  url: string;
}

const SYSTEM_PROMPT = (req: DraftRequest) => `You're Pear, a registry consultant. Draft 8 starter registry items for a host who's planning a celebration. Each item should be specific (not "kitchen stuff"), warm, and matched to the host's vibe.

Context:
- Occasion: ${req.occasion ?? 'wedding'}
- Venue: ${req.venue ?? '(unspecified)'}
- Vibes: ${Array.isArray(req.vibes) ? req.vibes.join(', ') : (req.vibes ?? '(unspecified)')}
- Hosts: ${(req.names ?? []).filter(Boolean).join(' & ') || '(unspecified)'}
${req.existingNames?.length ? `- Already on the list (skip): ${req.existingNames.join(', ')}` : ''}

Return ONLY a JSON array of 8 items, no prose. Each item:
{
  "label": "Short specific name (e.g. 'Honeymoon — Kyoto', 'Le Creuset Dutch oven', 'Linen sheets')",
  "description": "1-2 sentences in the host's voice. No 'we'd love' clichés. Reference the vibe when natural.",
  "kind": "fund" | "registry" | "link",
  "priceLabel": "Free-form price hint: '$120', 'From $40', 'Group gift', or 'Cash fund'",
  "url": ""
}

Rules:
- Always include 1 cash fund (kind: "fund", url: "" — host fills in Honeyfund / Venmo).
- Mix kitchen, home, experience, sentimental items. Don't just do kitchen.
- For non-fund items, kind is "registry" if it's a category (Williams-Sonoma kitchen registry) or "link" if it's a specific product (a single Le Creuset).
- Keep labels under 32 chars. Descriptions under 120 chars.
- DO NOT make up retailer URLs. Leave url: "" — the host adds it.
- Lower-case sentences only when the host's vibe is lower-case (e.g. casual / playful); otherwise sentence case.

Output ONLY the JSON array, starting with [ and ending with ].`;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { blocked } = await checkPearGate(session.user.email);
  if (blocked) return blocked;

  const rate = checkRateLimit(`draft-registry:${session.user.email}`, RATE_LIMIT);
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Slow down a tick — try again in an hour.' }, { status: 429 });
  }

  // Daily AI dollar cap (src/lib/ai-budget.ts). Keyed by account
  // email. Fails open — only blocks on a confirmed over-budget read.
  const budget = budgetKey(session.user.email, '');
  if (await overBudget(budget)) {
    return NextResponse.json(
      { ok: false, error: "You've reached today's AI limit — try again tomorrow." },
      { status: 429 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Pear isn\'t connected to a model on this server.' }, { status: 503 });
  }

  let body: DraftRequest = {};
  try { body = await req.json(); } catch { /* tolerate empty body */ }

  // geminiRetryFetch retries 429/503 with backoff, then THROWS after
  // exhausting attempts — catch and surface the same 502 the non-ok
  // branch below returns, so callers see one failure shape.
  let upstream: Response;
  try {
    upstream = await geminiRetryFetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: SYSTEM_PROMPT(body) }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      }),
    });
  } catch {
    return NextResponse.json({ error: `Pear couldn't draft (upstream unavailable)` }, { status: 502 });
  }

  if (!upstream.ok) {
    return NextResponse.json({ error: `Pear couldn't draft (${upstream.status})` }, { status: 502 });
  }

  const data = await upstream.json();
  const raw: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  // Charge the estimated cost once the model call succeeded.
  void chargeAi(
    budget,
    centsForUsage({
      provider: 'gemini',
      model: 'gemini-3.1-flash-lite-preview',
      inputTokens: approxTokens(SYSTEM_PROMPT(body)),
      outputTokens: approxTokens(raw),
      ms: 0,
    })
  );
  const cleaned = raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();

  let parsed: unknown;
  try { parsed = JSON.parse(cleaned); }
  catch {
    // Try to recover by finding the first '[' to last ']'.
    const first = cleaned.indexOf('[');
    const last = cleaned.lastIndexOf(']');
    if (first >= 0 && last > first) {
      try { parsed = JSON.parse(cleaned.slice(first, last + 1)); }
      catch { return NextResponse.json({ error: 'Pear returned malformed JSON.' }, { status: 502 }); }
    } else {
      return NextResponse.json({ error: 'Pear returned malformed JSON.' }, { status: 502 });
    }
  }

  if (!Array.isArray(parsed)) {
    return NextResponse.json({ error: 'Pear didn\'t return a list.' }, { status: 502 });
  }

  const items: DraftedItem[] = parsed
    .filter((it): it is Record<string, unknown> => Boolean(it) && typeof it === 'object')
    .map((it): DraftedItem | null => {
      const label = typeof it.label === 'string' ? it.label.slice(0, 60) : null;
      if (!label) return null;
      return {
        label,
        description: typeof it.description === 'string' ? it.description.slice(0, 200) : '',
        kind: (it.kind === 'fund' || it.kind === 'link' || it.kind === 'registry') ? it.kind : 'link',
        priceLabel: typeof it.priceLabel === 'string' ? it.priceLabel.slice(0, 40) : '',
        url: typeof it.url === 'string' ? it.url : '',
      };
    })
    .filter((it): it is DraftedItem => it != null)
    .slice(0, 10);

  return NextResponse.json({ items });
}
