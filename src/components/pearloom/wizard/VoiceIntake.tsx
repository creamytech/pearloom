'use client';

// ─────────────────────────────────────────────────────────────
// VoiceIntake — say the details instead of typing them.
//
// From the synthesis (§3, R2): pair the transcription route with
// wizard extraction. It exists for two hosts the persona work
// actually walked — the 60-year-old planning an anniversary and
// the quinceañera dad — for whom a form on a phone is the barrier,
// not the concept. Speaking a sentence is not a novelty here; it's
// the difference between starting and giving up.
//
// NO NEW API SURFACE. This composes two things that already exist:
// /api/voice-dna/transcribe (Whisper) and lib/doorway/extract
// (pure, deterministic, already parsing names / date / venue /
// occasion out of free text for the paste doorway). A transcript
// is just text.
//
// It NEVER overwrites what the host already typed — a misheard
// word must not eat a correct answer — and it shows the transcript
// so they can see what was heard rather than being surprised by a
// silently filled field.
//
// Signed-out hosts don't see it: the transcribe route requires a
// session, and offering a button that 401s would be worse than
// offering nothing.
// ─────────────────────────────────────────────────────────────

import { useRef, useState } from 'react';
import { extractDeterministic, type DoorwayPrefill } from '@/lib/doorway/extract';
import { trackEvent } from '@/lib/analytics/beacon';

interface Props {
  /** Applied fill-only by the caller. */
  onPrefill: (prefill: DoorwayPrefill) => void;
  /** Current year — passed in so extraction stays pure/testable. */
  nowYear: number;
  /** Hidden entirely when the host isn't signed in. */
  enabled?: boolean;
}

type Phase = 'idle' | 'recording' | 'working' | 'done' | 'error';

export function VoiceIntake({ onPrefill, nowYear, enabled = true }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [filled, setFilled] = useState<string[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  if (!enabled) return null;

  async function start() {
    setError(null);
    setTranscript('');
    setFilled([]);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        void send(new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' }));
      };
      recorderRef.current = rec;
      rec.start();
      setPhase('recording');
      trackEvent('voice_intake_started');
    } catch {
      // Denied permission or no microphone — the wizard's fields are
      // right there, so this is a quiet fallback, not a failure.
      setError('Pearloom couldn’t reach your microphone. You can type the details instead.');
      setPhase('error');
    }
  }

  function stop() {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setPhase('working');
  }

  async function send(audio: Blob) {
    try {
      const form = new FormData();
      form.append('audio', audio, 'intake.webm');
      const res = await fetch('/api/voice-dna/transcribe', { method: 'POST', body: form });
      const json = (await res.json()) as { text?: string; transcript?: string; error?: string };
      if (!res.ok) {
        setError(json.error || 'That didn’t come through. Try again, or type it in.');
        setPhase('error');
        return;
      }
      const text = (json.text ?? json.transcript ?? '').trim();
      if (!text) {
        setError('We couldn’t make out any words. Try again, or type it in.');
        setPhase('error');
        return;
      }
      setTranscript(text);

      /* The same deterministic parser the paste doorway uses. A
         transcript is just text, so nothing new was needed. */
      const { prefill, filled: got, empty } = extractDeterministic({ text, nowYear });
      if (empty) {
        setFilled([]);
        setPhase('done');
        trackEvent('voice_intake_done', { filled: 0 });
        return;
      }
      onPrefill(prefill);
      setFilled(got as string[]);
      setPhase('done');
      trackEvent('voice_intake_done', { filled: got.length });
    } catch {
      setError('That didn’t come through. Check your connection, or type it in.');
      setPhase('error');
    }
  }

  const label = FIELD_LABELS;

  return (
    <div
      style={{
        border: '1px solid var(--line-soft, rgba(14,13,11,0.10))',
        borderRadius: 12,
        padding: 14,
        background: 'var(--cream-2, #F5EFE2)',
      }}
    >
      <p style={{ margin: '0 0 10px', fontSize: 13.5, lineHeight: 1.55 }}>
        <strong style={{ fontWeight: 600 }}>Rather say it out loud?</strong>{' '}
        <span style={{ color: 'var(--ink-soft)' }}>
          Tell Pearloom the names, the date and the place in one sentence —
          we&rsquo;ll fill in what we catch. Nothing you&rsquo;ve already typed gets changed.
        </span>
      </p>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {phase !== 'recording' ? (
          <button type="button" onClick={start} className="btn btn-outline btn-sm" disabled={phase === 'working'}>
            {phase === 'working' ? 'One moment…' : phase === 'done' ? 'Say something else' : 'Say it instead'}
          </button>
        ) : (
          <button type="button" onClick={stop} className="btn btn-primary btn-sm">
            Done speaking
          </button>
        )}
        {phase === 'recording' && (
          <span aria-live="polite" style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
            Listening…
          </span>
        )}
      </div>

      {transcript && (
        <p style={{ marginTop: 10, fontSize: 13, lineHeight: 1.5, color: 'var(--ink-soft)' }}>
          <span style={{ opacity: 0.7 }}>Heard:</span> &ldquo;{transcript}&rdquo;
        </p>
      )}

      {phase === 'done' && (
        <p aria-live="polite" style={{ marginTop: 6, fontSize: 13, color: 'var(--ink-soft)' }}>
          {filled.length === 0
            ? 'Nothing we could use from that — the fields below still work.'
            : `Filled in ${filled.map((f) => label[f] ?? f).join(', ')}. Check it over before you go on.`}
        </p>
      )}

      {error && (
        <p role="alert" style={{ marginTop: 8, fontSize: 13, color: 'var(--pl-plum, #7A2D2D)' }}>
          {error}
        </p>
      )}
    </div>
  );
}

/** Plain words for the fields we filled — never the internal keys. */
const FIELD_LABELS: Record<string, string> = {
  names: 'the names',
  eventDate: 'the date',
  venueName: 'the place',
  location: 'the town',
  occasion: 'what you’re celebrating',
  scheduleHints: 'a few schedule notes',
};

export default VoiceIntake;
