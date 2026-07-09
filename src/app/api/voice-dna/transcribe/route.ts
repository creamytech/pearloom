// ─────────────────────────────────────────────────────────────
// Pearloom / api/voice-dna/transcribe
//
// POST audio/* (multipart) — forwards to OpenAI Whisper and
// returns the transcript. Optional question prompt (for the
// guided 8-question interview) is logged with the response so
// the analyze step can match transcripts to prompts.
//
// Whisper-1 is good enough and ~$0.006/minute. We cap the
// upload at 25MB (Whisper hard limit) and 5 minutes per chunk.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Voice transcription is offline — OPENAI_API_KEY isn\'t configured.' },
      { status: 503 },
    );
  }
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data.' }, { status: 400 });
  }
  const file = form.get('audio');
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'audio field is required.' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Recording too large. Keep clips under 25MB / 5 minutes.' }, { status: 413 });
  }
  const promptId = (form.get('promptId') as string | null) ?? null;

  const upstreamForm = new FormData();
  upstreamForm.set('file', file, 'voice.webm');
  upstreamForm.set('model', 'whisper-1');
  upstreamForm.set('response_format', 'verbose_json');
  upstreamForm.set('temperature', '0');

  let res: Response;
  try {
    res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: upstreamForm,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Network error.' }, { status: 502 });
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return NextResponse.json({ error: `Whisper returned ${res.status}: ${text.slice(0, 280)}` }, { status: 502 });
  }
  const data = await res.json() as { text?: string; duration?: number; language?: string };
  return NextResponse.json({
    ok: true,
    promptId,
    text: (data.text ?? '').trim(),
    duration: data.duration,
    language: data.language,
  });
}
