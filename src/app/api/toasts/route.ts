// ─────────────────────────────────────────────────────────────
// Pearloom / api/toasts/route.ts
//
// Voice toast ingestion + listing.
//
// POST (public, token-gated): guest uploads an audio recording.
//   Body: multipart/form-data with `audio` + `token` OR JSON
//   { token, audioBase64, contentType, durationSeconds? }
//
// GET (owner only): ?siteId=... — lists toasts.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { uploadToR2 } from '@/lib/r2';
import { getGuestByToken, listVoiceToasts } from '@/lib/event-os/db';
import { isSoftEmptyError } from '@/lib/event-os/soft-empty';
import { generate, CLAUDE_HAIKU, textFrom } from '@/lib/claude';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Max 40 MB — roughly 4 min of 128 kbps MP4/AAC.
const MAX_BYTES = 40 * 1024 * 1024;

function sb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

function extForContentType(ct: string): string {
  if (ct.includes('mp4') || ct.includes('m4a') || ct.includes('aac')) return 'm4a';
  if (ct.includes('webm')) return 'webm';
  if (ct.includes('ogg')) return 'ogg';
  if (ct.includes('mpeg') || ct.includes('mp3')) return 'mp3';
  if (ct.includes('wav')) return 'wav';
  return 'bin';
}

export async function POST(req: NextRequest) {
  const ct = req.headers.get('content-type') || '';
  let token: string | null = null;
  let buf: Buffer | null = null;
  let contentType = 'audio/mp4';
  let durationSeconds: number | null = null;

  try {
    if (ct.startsWith('multipart/form-data')) {
      const form = await req.formData();
      token = String(form.get('token') ?? '');
      const file = form.get('audio');
      if (file && file instanceof File) {
        contentType = file.type || contentType;
        buf = Buffer.from(await file.arrayBuffer());
      }
      const d = form.get('durationSeconds');
      if (typeof d === 'string' && d) durationSeconds = Number(d);
    } else {
      const body = (await req.json()) as {
        token?: string;
        audioBase64?: string;
        contentType?: string;
        durationSeconds?: number;
      };
      token = body.token ?? null;
      contentType = body.contentType || contentType;
      durationSeconds = body.durationSeconds ?? null;
      if (body.audioBase64) buf = Buffer.from(body.audioBase64, 'base64');
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!token || !buf) {
    return NextResponse.json({ error: 'token and audio required' }, { status: 400 });
  }
  if (buf.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: 'Recording too large (max 40 MB)' }, { status: 413 });
  }

  const guest = await getGuestByToken(token);
  if (!guest) return NextResponse.json({ error: 'Invalid token' }, { status: 404 });

  // Upload the audio
  const ext = extForContentType(contentType);
  const key = `toasts/${guest.site_id}/${guest.id}/${Date.now()}.${ext}`;
  let audioUrl: string;
  try {
    audioUrl = await uploadToR2(key, buf, contentType);
  } catch (err) {
    return NextResponse.json(
      { error: 'Upload failed', detail: String(err).slice(0, 200) },
      { status: 500 }
    );
  }

  // Persist row — starts in 'pending' and appears in moderation.
  const { data, error } = await sb()
    .from('voice_toasts')
    .insert({
      site_id: guest.site_id,
      guest_id: guest.id,
      guest_display_name: guest.display_name,
      audio_url: audioUrl,
      duration_seconds: durationSeconds,
      moderation_status: 'pending',
      is_highlight: false,
    })
    .select()
    .single();

  if (error) {
    console.error('[toasts] insert failed', error);
    return NextResponse.json({ error: 'Failed to save toast' }, { status: 500 });
  }

  return NextResponse.json({ toast: data });
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const siteId = req.nextUrl.searchParams.get('siteId');
  if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

  const { data: site } = await sb()
    .from('sites')
    .select('site_config')
    .eq('id', siteId)
    .maybeSingle();
  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  const ownerEmail = (site.site_config as Record<string, unknown>)?.creator_email;
  if (ownerEmail !== session.user.email) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const toasts = await listVoiceToasts(siteId);
    return NextResponse.json({ toasts });
  } catch (err) {
    if (isSoftEmptyError(err)) {
      return NextResponse.json({ toasts: [] });
    }
    return NextResponse.json(
      { error: 'List failed', detail: String(err).slice(0, 200) },
      { status: 500 }
    );
  }
}

/**
 * Optional: use Claude Haiku to clean up a raw transcript
 * (removes filler words, capitalizes names) — called from the
 * moderation UI on demand.
 */
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { toastId?: string; rawTranscript?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { toastId, rawTranscript } = body;
  if (!toastId || !rawTranscript) {
    return NextResponse.json({ error: 'toastId and rawTranscript required' }, { status: 400 });
  }

  try {
    const msg = await generate({
      tier: 'haiku',
      system: `You clean up dictated wedding toasts. Remove filler words (uh, like), fix capitalization of names, preserve the speaker's voice and meaning. Never paraphrase. Return ONLY the cleaned transcript with no quotes or preamble.`,
      messages: [{ role: 'user', content: rawTranscript.slice(0, 4000) }],
      maxTokens: 1200,
      temperature: 0.2,
    });
    const cleaned = textFrom(msg).trim();

    await sb()
      .from('voice_toasts')
      .update({ transcript: rawTranscript, transcript_cleaned: cleaned })
      .eq('id', toastId);

    return NextResponse.json({ cleaned, model: CLAUDE_HAIKU });
  } catch (err) {
    return NextResponse.json(
      { error: 'Cleanup failed', detail: String(err).slice(0, 200) },
      { status: 500 }
    );
  }
}
