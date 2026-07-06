import { NextRequest, NextResponse } from 'next/server';
import { GEMINI_FLASH, geminiRetryFetch } from '@/lib/memory-engine/gemini-client';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { overBudget, chargeAi, centsForUsage, approxTokens, budgetKey } from '@/lib/ai-budget';
import type { StoryManifest } from '@/types';

// ─────────────────────────────────────────────────────────────
// POST /api/pear-scene
// Pear-suggests a scene preset (Letterpress / Carved / Scrapbook /
// Linen / Slate / Vellum) for a given section based on the site's
// occasion + vibes + palette. The client (BlockStylePanel) then
// applies the recommended preset's style values in one click.
// ─────────────────────────────────────────────────────────────

const SCENE_IDS = ['letterpress', 'carved', 'scrapbook', 'linen', 'slate', 'vellum'] as const;
type SceneId = typeof SCENE_IDS[number];

interface SceneRequest {
  manifest: StoryManifest;
  blockId: string;
}

const SYSTEM = `You are Pear, a calm editorial design advisor.
Pick exactly one scene preset for the given section. Your only
output is JSON of shape: {"scene":"letterpress|carved|scrapbook|linen|slate|vellum","reason":"<= 80 chars"}.

Scene moods:
  letterpress — sharp, hairline border, no shadow. Reads like a printed card.
  carved      — pillow shape, lifted shadow, generous padding. Embossed.
  scrapbook   — scallop edges, soft shadow, cream backdrop. Hand-cut feel.
  linen       — vellum tint, soft radius, no border. Layered, airy.
  slate       — sharp, heavy border, floating shadow. Architectural.
  vellum      — rounded, gold-mist backdrop, no shadow. Quiet warmth.

Rules:
- Match the occasion's mood (memorial → linen or vellum, never slate)
- Read the vibes — formal/architectural → slate, intimate → linen, playful → scrapbook
- Don't repeat the section's current scene
- Reason is one short sentence the host will read.`;

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`pear-scene:${ip}`, { max: 12, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Slow down a tick' }, { status: 429 });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ scene: 'linen', reason: "Pear isn't connected — picked Linen as a calm default." });
  }

  // Daily AI dollar cap (src/lib/ai-budget.ts). Keyed by client IP.
  // Fails open — only blocks on a confirmed over-budget read.
  const budget = budgetKey(null, ip);
  if (await overBudget(budget)) {
    return NextResponse.json(
      { error: "You've reached today's AI limit — try again tomorrow." },
      { status: 429 }
    );
  }

  let body: SceneRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  if (!body.manifest || !body.blockId) {
    return NextResponse.json({ error: 'manifest + blockId required' }, { status: 400 });
  }

  const occasion = (body.manifest as unknown as { occasion?: string }).occasion ?? 'wedding';
  const vibes = ((body.manifest as unknown as { vibes?: string[] }).vibes ?? []).join(', ');
  const palette = (body.manifest as unknown as { theme?: { colors?: Record<string, string> } }).theme?.colors;
  const summary = `Occasion: ${occasion}\nSection: ${body.blockId}\nVibes: ${vibes || '(none)'}\nPalette: ${JSON.stringify(palette ?? {})}`;

  try {
    const res = await geminiRetryFetch(`${GEMINI_FLASH}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM }] },
        contents: [{ parts: [{ text: summary + '\n\nReturn ONLY the JSON object.' }] }],
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 80,
          responseMimeType: 'application/json',
        },
      }),
    });
    if (!res.ok) {
      return NextResponse.json({ scene: 'linen', reason: 'Pear hesitated — Linen is a safe pick.' });
    }
    const data = await res.json();
    const raw = (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
    // Charge the estimated cost once the model call succeeded.
    void chargeAi(
      budget,
      centsForUsage({
        provider: 'gemini',
        model: 'gemini-3.5-flash',
        inputTokens: approxTokens(`${SYSTEM}${summary}`),
        outputTokens: approxTokens(raw),
        ms: 0,
      })
    );
    const cleaned = raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();
    let parsed: { scene?: string; reason?: string } = {};
    try { parsed = JSON.parse(cleaned); } catch { /* fall through */ }
    const scene = (SCENE_IDS as readonly string[]).includes(parsed.scene ?? '')
      ? (parsed.scene as SceneId)
      : 'linen';
    const reason = (parsed.reason ?? '').slice(0, 100) || 'Pear thinks this fits the section.';
    return NextResponse.json({ scene, reason });
  } catch {
    return NextResponse.json({ scene: 'linen', reason: 'Pear hiccuped — Linen is a safe pick.' });
  }
}
