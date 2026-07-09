// ─────────────────────────────────────────────────────────────
// Pearloom / api/cadence/draft — generate copy for a phase.
//
// POST { siteSlug, phaseId }
// Returns { ok, subject, body }
//
// Builds a prompt from the phase's draftPrompt template, fills
// in {names} {date} {venue} {voice}, then runs Claude Haiku to
// generate the copy. When manifest.voiceDNA is set, the system
// prompt is prefixed with the host's captured voice profile so
// the draft sounds like them, not a brand.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generate, textFrom, CLAUDE_HAIKU } from '@/lib/claude';
import { getSiteConfig } from '@/lib/db';
import { parseLocalDate } from '@/lib/date-utils';
import { getCadencePreset } from '@/lib/cadence/cadence-presets';
import { overBudget, chargeAi, centsForUsage, approxTokens, budgetKey } from '@/lib/ai-budget';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface Body {
  siteSlug: string;
  phaseId: string;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }

  let body: Body;
  try { body = (await req.json()) as Body; }
  catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }); }
  if (!body.siteSlug || !body.phaseId) {
    return NextResponse.json({ error: 'siteSlug + phaseId required.' }, { status: 400 });
  }

  const cfg = await getSiteConfig(body.siteSlug);
  if (!cfg?.manifest) return NextResponse.json({ error: 'Site not found.' }, { status: 404 });
  // Case-insensitive owner check — IdP casing variance, see /api/sites/[domain].
  const ownerEmail = String(
    ((cfg as unknown as Record<string, unknown>).creator_email as string | undefined) ?? '',
  ).toLowerCase().trim();
  if (!ownerEmail || ownerEmail !== session.user.email.toLowerCase().trim()) {
    return NextResponse.json({ error: 'Not the site owner.' }, { status: 403 });
  }

  const occasion = (cfg.manifest as unknown as { occasion?: string }).occasion;
  const phase = getCadencePreset(occasion).find((p) => p.id === body.phaseId);
  if (!phase) return NextResponse.json({ error: 'Unknown phase.' }, { status: 400 });

  const names = Array.isArray(cfg.names) ? cfg.names.filter(Boolean).join(' & ') : 'the host';
  const dateObj = parseLocalDate(cfg.manifest.logistics?.date);
  const date = dateObj
    ? dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'the date';
  const venue = cfg.manifest.logistics?.venue ?? 'our venue';
  const voice = (cfg.manifest as unknown as { voiceDNA?: { tone?: string; phrases?: string[] }; }).voiceDNA;

  const filledPrompt = phase.draftPrompt
    .replaceAll('{names}', names)
    .replaceAll('{date}', date)
    .replaceAll('{venue}', venue)
    .replaceAll('{voice}', voice?.tone ?? 'warm and personal');

  const voicePreface = voice
    ? `\n\nThe host's voice profile (use it consistently — write LIKE them, not about them):
- Tone: ${voice.tone ?? 'warm'}
${Array.isArray(voice.phrases) && voice.phrases.length ? `- Signature phrases: ${voice.phrases.slice(0, 6).join(', ')}` : ''}`
    : '';

  const system = `You are Pear, the AI co-pilot for Pearloom — an editorial event-site platform. You draft messages that sound human, intimate, and specific. Never use exclamation marks. Never describe the output as machine-made or "generated"; never use the phrase that pairs "AI" with "powered." Sign with the names provided. Two newlines between subject and body. Output ONLY:

SUBJECT: <one short subject line>
BODY:
<the body text>${voicePreface}`;

  // Daily AI dollar cap (src/lib/ai-budget.ts). Keyed by account
  // email. Fails open — only blocks on a confirmed over-budget read.
  const budget = budgetKey(session.user.email, '');
  if (await overBudget(budget)) {
    return NextResponse.json(
      { ok: false, error: "You've reached today's AI limit. Try again tomorrow." },
      { status: 429 }
    );
  }

  try {
    const msg = await generate({
      tier: 'haiku',
      system,
      messages: [{ role: 'user', content: filledPrompt }],
      maxTokens: 600,
      temperature: 0.7,
    });
    const text = textFrom(msg).trim();
    // Charge the real token cost from the returned Message's usage
    // (falls back to a length estimate if usage is absent).
    void chargeAi(
      budget,
      centsForUsage({
        provider: 'claude',
        model: CLAUDE_HAIKU,
        inputTokens: msg.usage?.input_tokens ?? approxTokens(`${system}${filledPrompt}`),
        outputTokens: msg.usage?.output_tokens ?? approxTokens(text),
        cacheReadTokens: msg.usage?.cache_read_input_tokens ?? 0,
        cacheWriteTokens: msg.usage?.cache_creation_input_tokens ?? 0,
        ms: 0,
      })
    );
    const subjectMatch = text.match(/SUBJECT:\s*(.+)/i);
    const bodyMatch = text.match(/BODY:\s*([\s\S]+)/i);
    return NextResponse.json({
      ok: true,
      subject: (subjectMatch?.[1] ?? '').trim(),
      body: (bodyMatch?.[1] ?? text).trim(),
    });
  } catch (err) {
    console.error('[cadence/draft] failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Draft failed.' },
      { status: 502 },
    );
  }
}
