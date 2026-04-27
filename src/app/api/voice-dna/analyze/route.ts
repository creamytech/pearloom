// ─────────────────────────────────────────────────────────────
// Pearloom / api/voice-dna/analyze
//
// POST { siteSlug, samples: [{ promptId, text }] }
// Runs the transcripts through Claude Haiku to extract a voice
// profile:
//   • tone — one short adjective phrase ("warm and conversational")
//   • formality — 1 (casual) … 5 (formal)
//   • vocabulary — distinctive words the host actually uses
//   • phrases — 5–10 short signature phrases
//   • avoidList — words the host noticeably avoids
//   • greetingStyle — how they typically open
//   • signoffStyle — how they typically end a message
//
// Stored on the site's manifest.voiceDNA. Every Claude pass that
// drafts copy (cadence, story, vows, thank-yous) reads from it
// so the language sounds like the host, not a brand.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { generate, parseJsonFromText, textFrom } from '@/lib/claude';
import { getSiteConfig } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface Sample {
  promptId?: string;
  text: string;
}
interface Body {
  siteSlug: string;
  samples: Sample[];
}

export interface VoiceDNA {
  tone: string;
  formality: number;
  vocabulary: string[];
  phrases: string[];
  avoidList?: string[];
  greetingStyle?: string;
  signoffStyle?: string;
  capturedAt: string;
}

function sb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }
  let body: Body;
  try { body = (await req.json()) as Body; }
  catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }); }
  if (!body.siteSlug || !Array.isArray(body.samples) || body.samples.length === 0) {
    return NextResponse.json({ error: 'siteSlug + samples are required.' }, { status: 400 });
  }

  const cfg = await getSiteConfig(body.siteSlug);
  if (!cfg?.manifest) return NextResponse.json({ error: 'Site not found.' }, { status: 404 });
  const ownerEmail = ((cfg as unknown as Record<string, unknown>).creator_email as string | undefined) ?? null;
  if (ownerEmail !== session.user.email) {
    return NextResponse.json({ error: 'Not the site owner.' }, { status: 403 });
  }

  const transcripts = body.samples
    .filter((s) => typeof s.text === 'string' && s.text.trim().length > 0)
    .map((s, i) => `Sample ${i + 1}${s.promptId ? ` (${s.promptId})` : ''}:\n${s.text.trim()}`)
    .join('\n\n');

  if (!transcripts) {
    return NextResponse.json({ error: 'No usable text in the samples.' }, { status: 400 });
  }

  const system = `You are a linguistic profiler. Read the host's spoken transcripts and extract a voice profile that captures HOW they speak — the rhythm, vocabulary, formality, signature phrases. The output drives downstream AI copywriting that needs to sound like THEM.

Output ONLY valid JSON matching this exact shape:
{
  "tone": "<one short phrase, max 8 words>",
  "formality": <integer 1-5, 1=very casual, 5=very formal>,
  "vocabulary": ["<6-12 distinctive words they actually used>"],
  "phrases": ["<6-10 signature short phrases (3-8 words each) directly quoted from the samples>"],
  "avoidList": ["<3-5 cliched words they noticeably did NOT use>"],
  "greetingStyle": "<one example of how they'd open a note>",
  "signoffStyle": "<one example of how they'd close a note>"
}

Rules:
- Quote phrases verbatim from the transcripts when possible
- Don't invent words they didn't say
- If the samples are too short or sparse, return your best guess with low formality
- Never include personally identifying info (names, addresses)`;

  try {
    const msg = await generate({
      tier: 'haiku',
      system,
      messages: [{ role: 'user', content: transcripts }],
      maxTokens: 900,
      temperature: 0.3,
    });
    const raw = textFrom(msg).trim();
    const parsed = parseJsonFromText<Omit<VoiceDNA, 'capturedAt'>>(raw);
    const profile: VoiceDNA = {
      tone: parsed.tone || 'warm and personal',
      formality: typeof parsed.formality === 'number' ? Math.max(1, Math.min(5, parsed.formality)) : 3,
      vocabulary: Array.isArray(parsed.vocabulary) ? parsed.vocabulary.slice(0, 12) : [],
      phrases: Array.isArray(parsed.phrases) ? parsed.phrases.slice(0, 10) : [],
      avoidList: Array.isArray(parsed.avoidList) ? parsed.avoidList.slice(0, 5) : [],
      greetingStyle: parsed.greetingStyle ?? '',
      signoffStyle: parsed.signoffStyle ?? '',
      capturedAt: new Date().toISOString(),
    };

    // Persist to the manifest. We use the existing sites table
    // structure; both ai_manifest and site_config.manifest get
    // the voiceDNA stored so all reading paths see it.
    const client = sb();
    if (client) {
      const { data: row } = await client
        .from('sites')
        .select('subdomain, ai_manifest, site_config')
        .eq('subdomain', body.siteSlug)
        .maybeSingle();
      if (row) {
        const next = { ...((row.ai_manifest ?? {}) as Record<string, unknown>), voiceDNA: profile };
        const cfgManifest = (row.site_config as { manifest?: Record<string, unknown> } | null)?.manifest;
        const cfgNext = cfgManifest
          ? { ...row.site_config, manifest: { ...cfgManifest, voiceDNA: profile } }
          : row.site_config;
        await client
          .from('sites')
          .update({ ai_manifest: next, site_config: cfgNext })
          .eq('subdomain', body.siteSlug);
      }
    }

    return NextResponse.json({ ok: true, voiceDNA: profile });
  } catch (err) {
    console.error('[voice-dna/analyze] failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Analysis failed.' },
      { status: 502 },
    );
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }
  const siteSlug = req.nextUrl.searchParams.get('site');
  if (!siteSlug) return NextResponse.json({ error: 'site is required.' }, { status: 400 });
  const cfg = await getSiteConfig(siteSlug);
  if (!cfg?.manifest) return NextResponse.json({ error: 'Site not found.' }, { status: 404 });
  const ownerEmail = ((cfg as unknown as Record<string, unknown>).creator_email as string | undefined) ?? null;
  if (ownerEmail !== session.user.email) {
    return NextResponse.json({ error: 'Not the site owner.' }, { status: 403 });
  }
  const voice = (cfg.manifest as unknown as { voiceDNA?: VoiceDNA }).voiceDNA ?? null;
  return NextResponse.json({ ok: true, voiceDNA: voice });
}
