'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/guest-experience/VoiceToastRecorder.tsx
//
// Guest-facing voice toast recorder on /g/{token}.
// Uses the browser MediaRecorder API — no third-party SDK.
// Uploads to /api/toasts as JSON + base64 once recording stops.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';

type Phase = 'idle' | 'recording' | 'review' | 'uploading' | 'done' | 'error';

interface Props {
  token: string;
  accent?: string;
  headingFont?: string;
  /** Site occasion — solemn occasions get gentler copy. */
  occasion?: string | null;
}

// Occasion-keyed microcopy. Solemn voices (memorial / funeral) never
// hear "toast"; couple-shaped events keep the original "the couple"
// key; everything else addresses the hosts generically.
function copyFor(occasion?: string | null) {
  const solemn = occasion === 'memorial' || occasion === 'funeral';
  if (solemn) {
    return {
      eyebrow: 'In remembrance',
      headLead: 'Leave a few',
      headWord: 'words',
      blurb: 'Record up to two minutes. Your voice will be kept alongside their memories.',
      send: 'Send your words',
      done: 'Thank you, your words were sent. The family will listen before sharing them.',
    };
  }
  const coupleShaped =
    !occasion ||
    occasion === 'wedding' ||
    occasion === 'engagement' ||
    occasion === 'anniversary' ||
    occasion === 'vow-renewal';
  if (coupleShaped) {
    return {
      eyebrow: 'For the film',
      headLead: 'Leave them a',
      headWord: 'toast',
      blurb: 'Record up to two minutes. Your words could end up in the film they watch every anniversary.',
      send: 'Send to the couple',
      done: 'Thank you, your toast was sent. The couple will review before adding it to the film.',
    };
  }
  return {
    eyebrow: 'For the film',
    headLead: 'Record a',
    headWord: 'toast',
    blurb: 'Record up to two minutes. Your words could end up in the keepsake film from the day.',
    send: 'Send your toast',
    done: 'Thank you, your toast was sent. Your hosts will review before adding it to the film.',
  };
}

export function VoiceToastRecorder({
  token,
  accent = '#5C6B3F',
  headingFont = 'Playfair Display',
  occasion = null,
}: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl, cleanup]);

  const start = async () => {
    setError(null);
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const preferred = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg',
      ];
      const mimeType = preferred.find(
        (t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)
      );

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        blobRef.current = blob;
        setBlobUrl(URL.createObjectURL(blob));
        setPhase('review');
        cleanup();
      };
      recorder.start();
      recorderRef.current = recorder;
      setPhase('recording');
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (e) {
      setError('Microphone access denied. Please enable it and try again.');
      setPhase('error');
      console.error(e);
    }
  };

  const stop = () => {
    recorderRef.current?.stop();
  };

  const resetToIdle = () => {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    blobRef.current = null;
    setBlobUrl(null);
    setSeconds(0);
    setPhase('idle');
  };

  const upload = async () => {
    const blob = blobRef.current;
    if (!blob) return;
    setPhase('uploading');
    try {
      const base64 = await blobToBase64(blob);
      const res = await fetch('/api/toasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          audioBase64: base64,
          contentType: blob.type || 'audio/webm',
          durationSeconds: seconds,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Upload failed');
        setPhase('error');
      } else {
        setPhase('done');
      }
    } catch (e) {
      setError(String(e));
      setPhase('error');
    }
  };

  const mm = Math.floor(seconds / 60).toString().padStart(2, '0');
  const ss = (seconds % 60).toString().padStart(2, '0');
  const copy = copyFor(occasion);

  return (
    <section
      style={{
        marginTop: 32,
        padding: '24px 24px',
        background: 'var(--card, #FBF7EE)',
        borderRadius: 'var(--pl-card-radius, 14px)',
        border: '1px solid rgba(14,13,11,0.08)',
        boxShadow: 'var(--pl-card-shadow, 0 4px 14px rgba(75,65,52,0.08))',
      }}
    >
      {/* Peach editorial eyebrow */}
      <div
        className="eyebrow"
        style={{
          fontSize: 10.5,
          textTransform: 'uppercase',
          letterSpacing: '0.22em',
          fontWeight: 700,
          color: '#C6703D',
          marginBottom: 8,
        }}
      >
        {copy.eyebrow}
      </div>
      <h3
        style={{
          fontFamily: headingFont,
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: '-0.01em',
          margin: 0,
          marginBottom: 6,
          color: 'var(--ink, #0E0D0B)',
          lineHeight: 1.15,
        }}
      >
        {copy.headLead}{' '}
        <span style={{ fontStyle: 'italic', fontWeight: 400, color: '#C6703D' }}>{copy.headWord}</span>
      </h3>
      <p
        style={{
          fontFamily: headingFont,
          fontStyle: 'italic',
          fontSize: 14.5,
          color: 'var(--ink-soft, #3A332C)',
          marginTop: 0,
          marginBottom: 18,
          lineHeight: 1.55,
        }}
      >
        {copy.blurb}
      </p>

      {phase === 'idle' && (
        <button type="button" onClick={() => void start()} style={primaryBtn(accent)}>
          Start recording
        </button>
      )}

      {phase === 'recording' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#B94A4A', display: 'inline-block', animation: 'pulse 1s infinite' }} />
            <span style={{ fontFamily: 'monospace', fontSize: '1.1rem' }}>{mm}:{ss}</span>
          </div>
          <button type="button" onClick={stop} style={primaryBtn(accent)}>
            Stop
          </button>
          <style>{`@keyframes pulse { 50% { opacity: 0.35; } }`}</style>
        </div>
      )}

      {phase === 'review' && blobUrl && (
        <div>
          <audio controls src={blobUrl} style={{ width: '100%', marginBottom: '0.75rem' }} />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" onClick={() => void upload()} style={primaryBtn(accent)}>
              {copy.send}
            </button>
            <button type="button" onClick={resetToIdle} style={secondaryBtn()}>
              Record again
            </button>
          </div>
        </div>
      )}

      {phase === 'uploading' && <div style={{ opacity: 0.75, fontSize: '0.9rem' }}>Uploading…</div>}

      {phase === 'done' && (
        <div style={{ fontSize: '0.95rem', color: '#2B2B2B' }}>
          {copy.done}
        </div>
      )}

      {phase === 'error' && (
        <div>
          <div style={{ color: '#B94A4A', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
            {error ?? 'Something went wrong.'}
          </div>
          <button type="button" onClick={resetToIdle} style={secondaryBtn()}>
            Try again
          </button>
        </div>
      )}
    </section>
  );
}

function primaryBtn(_accent: string): React.CSSProperties {
  // Prototype primary affordance — peach pill, not host accent.
  return {
    padding: '12px 26px',
    background: '#C6703D',
    color: '#FBF7EE',
    border: 'none',
    borderRadius: 999,
    fontSize: 13.5,
    fontWeight: 700,
    letterSpacing: '0.02em',
    cursor: 'pointer',
  };
}

function secondaryBtn(): React.CSSProperties {
  return {
    padding: '12px 26px',
    background: 'transparent',
    color: 'var(--ink, #0E0D0B)',
    border: '1px solid rgba(14,13,11,0.16)',
    borderRadius: 999,
    fontSize: 13.5,
    fontWeight: 600,
    cursor: 'pointer',
  };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const res = String(reader.result || '');
      const idx = res.indexOf(',');
      resolve(idx >= 0 ? res.slice(idx + 1) : res);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
