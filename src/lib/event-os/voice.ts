// ─────────────────────────────────────────────────────────────
// Pearloom / lib/event-os/voice.ts
//
// Voiceover synthesis for the post-event film pipeline.
// Uses the ElevenLabs HTTP API directly (no SDK) to keep the
// bundle lean. Each scene's MP3 is uploaded to R2 and its URL
// is written back into the film job's metadata.scenes[].
//
// If ELEVENLABS_API_KEY is not set, synthesizeVoice* returns
// null and the caller is expected to mark the scene as
// "text-only" — the film pipeline still completes gracefully.
// ─────────────────────────────────────────────────────────────

import { env } from '@/lib/env';
import { uploadToR2 } from '@/lib/r2';

const ELEVEN_API = 'https://api.elevenlabs.io/v1';

export interface SynthResult {
  url: string;
  durationSeconds: number | null;
  contentType: string;
}

/**
 * Synthesize a single line of VO. Returns null when TTS isn't
 * configured, so the caller can fall back to text-only scenes.
 */
export async function synthesizeVoiceLine(opts: {
  text: string;
  keyPrefix: string;        // e.g. `film/{jobId}/scene-01`
  voiceId?: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
}): Promise<SynthResult | null> {
  const apiKey = env.ELEVENLABS_API_KEY;
  if (!apiKey) return null;

  const voiceId = opts.voiceId || env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
  const modelId = opts.modelId || 'eleven_multilingual_v2';

  const res = await fetch(`${ELEVEN_API}/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
    },
    body: JSON.stringify({
      text: opts.text,
      model_id: modelId,
      voice_settings: {
        stability: opts.stability ?? 0.55,
        similarity_boost: opts.similarityBoost ?? 0.75,
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`ElevenLabs ${res.status}: ${detail.slice(0, 200)}`);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  const key = `${opts.keyPrefix}.mp3`;
  const url = await uploadToR2(key, buf, 'audio/mpeg');

  return {
    url,
    contentType: 'audio/mpeg',
    // ElevenLabs doesn't return duration — a downstream worker can
    // probe the file with ffprobe. Estimate from word count as a hint.
    durationSeconds: estimateDuration(opts.text),
  };
}

function estimateDuration(text: string): number {
  const words = text.trim().split(/\s+/).length;
  // ~160 wpm for calm narration
  return Math.max(1, Math.round((words / 160) * 60));
}
