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
}

export function VoiceToastRecorder({
  token,
  accent = '#5C6B3F',
  headingFont = 'Playfair Display',
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

  return (
    <section
      style={{
        marginTop: '2rem',
        padding: '1.5rem',
        background: '#FFFFFF',
        borderRadius: '0.75rem',
        border: `1px solid ${accent}33`,
      }}
    >
      <h3 style={{ fontFamily: headingFont, fontSize: '1.15rem', margin: 0, marginBottom: '0.35rem' }}>
        Leave them a toast
      </h3>
      <p style={{ fontSize: '0.9rem', opacity: 0.75, marginTop: 0, marginBottom: '1rem', lineHeight: 1.5 }}>
        Record up to two minutes. Your words could end up in the film they watch every anniversary.
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
              Send to the couple
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
          Thank you — your toast was sent. The couple will review before adding it to the film.
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

function primaryBtn(accent: string): React.CSSProperties {
  return {
    padding: '0.75rem 1.5rem',
    background: accent,
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '999px',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
  };
}

function secondaryBtn(): React.CSSProperties {
  return {
    padding: '0.75rem 1.5rem',
    background: 'transparent',
    color: '#2B2B2B',
    border: '1px solid #EEE8DC',
    borderRadius: '999px',
    fontSize: '0.9rem',
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
