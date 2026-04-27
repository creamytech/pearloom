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
import { generate, textFrom } from '@/lib/claude';
import { getSiteConfig } from '@/lib/db';
import { getCadencePreset } from '@/lib/cadence/cadence-presets';

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
  const ownerEmail = ((cfg as unknown as Record<string, unknown>).creator_email as string | undefined) ?? null;
  if (ownerEmail !== session.user.email) {
    return NextResponse.json({ error: 'Not the site owner.' }, { status: 403 });
  }

  const occasion = (cfg.manifest as unknown as { occasion?: string }).occasion;
  const phase = getCadencePreset(occasion).find((p) => p.id === body.phaseId);
  if (!phase) return NextResponse.json({ error: 'Unknown phase.' }, { status: 400 });

  const names = Array.isArray(cfg.names) ? cfg.names.filter(Boolean).join(' & ') : 'the host';
  const date = cfg.manifest.logistics?.date
    ? new Date(cfg.manifest.logistics.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
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

  const system = `You are Pear, the AI co-pilot for Pearloom — an editorial event-site platform. You draft messages that sound human, intimate, and specific. Never use exclamation marks. Never say "AI-powered" or "generated." Sign with the names provided. Two newlines between subject and body. Output ONLY:

SUBJECT: <one short subject line>
BODY:
<the body text>${voicePreface}`;

  try {
    const msg = await generate({
      tier: 'haiku',
      system,
      messages: [{ role: 'user', content: filledPrompt }],
      maxTokens: 600,
      temperature: 0.7,
    });
    const text = textFrom(msg).trim();
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
