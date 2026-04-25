// ─────────────────────────────────────────────────────────────
// Pearloom / api/pear/voice/route.ts
//
// POST /api/pear/voice  body: { siteId?, transcript?, audioBase64?, durationMs? }
//   → stores a host voice sample. If audioBase64 + OPENAI key are
//     present we transcribe via Whisper (gpt-4o-transcribe). Otherwise
//     uses the supplied transcript verbatim.
//   → also extracts a vocab summary (most-used non-stopword tokens)
//     so AI prompts can reference the host's distinctive phrasing.
//
// GET  /api/pear/voice?siteId=&limit=               → list samples
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { uploadToR2, getR2Url } from '@/lib/r2';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const STOP = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
  'did', 'will', 'would', 'could', 'should', 'may', 'might', 'shall', 'can', 'i', 'me',
  'my', 'myself', 'we', 'our', 'ours', 'you', 'your', 'yours', 'he', 'she', 'him',
  'her', 'they', 'them', 'their', 'this', 'that', 'these', 'those', 'just', 'so',
  'really', 'like', 'about', 'know', 'get', 'got', 'one', 'two', 'three',
]);

function vocabSummary(text: string): string {
  const counts: Record<string, number> = {};
  text
    .toLowerCase()
    .replace(/[^a-z' ]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP.has(w))
    .forEach((w) => {
      counts[w] = (counts[w] ?? 0) + 1;
    });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([w]) => w)
    .join(', ');
}

async function transcribeWithWhisper(buffer: Buffer, mimeType: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const form = new FormData();
  const blob = new Blob([new Uint8Array(buffer)], { type: mimeType || 'audio/webm' });
  form.append('file', blob, `sample.${mimeType.includes('mp4') ? 'mp4' : mimeType.includes('mp3') ? 'mp3' : 'webm'}`);
  form.append('model', 'whisper-1');
  form.append('response_format', 'text');
  try {
    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) {
      console.warn('[pear/voice] whisper', res.status, await res.text().catch(() => ''));
      return null;
    }
    return (await res.text()).trim();
  } catch (err) {
    console.warn('[pear/voice] whisper error', err);
    return null;
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ samples: [] });

  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get('siteId');
  const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? '20'), 1), 50);

  let query = sb
    .from('pear_voice_samples')
    .select('*')
    .eq('user_email', session.user.email)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (siteId) query = query.or(`site_id.eq.${siteId},site_id.is.null`);

  const { data, error } = await query;
  if (error) {
    console.warn('[pear/voice GET]', error.message);
    return NextResponse.json({ samples: [] });
  }
  return NextResponse.json({ samples: data ?? [] });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ip = getClientIp(req);
  const rl = checkRateLimit(`pear-voice:${session.user.email}:${ip}`, {
    max: 12,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many voice samples — try again later.' }, { status: 429 });
  }

  let body: { siteId?: string; transcript?: string; audioBase64?: string; durationMs?: number; mimeType?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  let transcript = (body.transcript ?? '').trim();
  let audioUrl: string | null = null;

  if (body.audioBase64) {
    const raw = body.audioBase64.includes(',') ? body.audioBase64.split(',')[1] : body.audioBase64;
    const buffer = Buffer.from(raw, 'base64');
    if (buffer.length > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'Audio too large (max 20MB).' }, { status: 413 });
    }
    const mimeType = body.mimeType ?? 'audio/webm';
    const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('mp3') ? 'mp3' : 'webm';
    try {
      const key = `pear-voice/${encodeURIComponent(session.user.email).replace(/[^a-zA-Z0-9_-]/g, '_')}/${Date.now()}.${ext}`;
      await uploadToR2(key, buffer, mimeType);
      audioUrl = getR2Url(key);
    } catch (err) {
      console.warn('[pear/voice] R2 upload failed', err);
    }
    if (!transcript) {
      const ws = await transcribeWithWhisper(buffer, mimeType);
      if (ws) transcript = ws;
    }
  }

  if (!transcript) {
    return NextResponse.json({ error: 'Need either transcript or audioBase64.' }, { status: 400 });
  }
  if (transcript.length > 5000) transcript = transcript.slice(0, 5000);

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Storage not configured' }, { status: 500 });

  const { data, error } = await sb
    .from('pear_voice_samples')
    .insert({
      user_email: session.user.email,
      site_id: body.siteId ?? null,
      transcript,
      audio_url: audioUrl,
      vocab_summary: vocabSummary(transcript),
      duration_ms: body.durationMs ?? null,
    })
    .select()
    .single();

  if (error) {
    console.warn('[pear/voice POST]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ sample: data });
}
