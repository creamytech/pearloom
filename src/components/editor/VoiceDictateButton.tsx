'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/VoiceDictateButton.tsx
//
// Mic chip that appears next to every text input/textarea inside
// the mobile editor. Uses the Web Speech API to capture spoken
// text and append it to the field. No hosted speech service —
// browser-native, free, and works offline on most devices.
//
// Tap once → start; speech transcribes live; tap again or stop
// after silence → commit. Falls back gracefully on browsers
// without SpeechRecognition (the chip simply doesn't render).
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Loader2 } from 'lucide-react';

interface Props {
  /** Current value of the field — we append onto it. */
  value: string;
  /** Commit a new value (caller decides how to coalesce / save). */
  onChange: (next: string) => void;
  /** Optional placement nudge so the chip can hug a corner. */
  position?: 'inline' | 'floating';
  /** Locale hint — defaults to the browser's language. */
  lang?: string;
  /** Pass-through size for tighter rows. */
  size?: 'sm' | 'md';
}

// Cross-vendor shim type. Avoids needing @types/dom-speech-recognition.
type SR = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};

function getRecognitionCtor(): null | (new () => SR) {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SR;
    webkitSpeechRecognition?: new () => SR;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function VoiceDictateButton({
  value,
  onChange,
  position = 'inline',
  lang,
  size = 'md',
}: Props) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SR | null>(null);
  // Buffer the value at the moment dictation starts so we append, not replace.
  const baseRef = useRef<string>('');
  const interimRef = useRef<string>('');

  useEffect(() => {
    setSupported(!!getRecognitionCtor());
  }, []);

  const stop = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
  }, []);

  const start = useCallback(() => {
    if (listening) {
      stop();
      return;
    }
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setError('Voice not supported in this browser');
      setTimeout(() => setError(null), 2400);
      return;
    }
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang =
      lang ||
      (typeof navigator !== 'undefined' ? navigator.language : 'en-US') ||
      'en-US';
    baseRef.current = value;
    interimRef.current = '';

    rec.onresult = (e) => {
      let finalText = '';
      let interimText = '';
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interimText += r[0].transcript;
      }
      const join = (base: string, dictated: string) => {
        if (!dictated) return base;
        const trimmedBase = base.trimEnd();
        const sep = trimmedBase.length > 0 && !/[\s\n]$/.test(trimmedBase) ? ' ' : '';
        return trimmedBase + sep + dictated.trimStart();
      };
      if (finalText) {
        baseRef.current = join(baseRef.current, finalText);
        interimRef.current = '';
        onChange(baseRef.current);
      } else {
        interimRef.current = interimText;
        onChange(join(baseRef.current, interimText));
      }
    };
    rec.onend = () => {
      setListening(false);
      recRef.current = null;
      // Final commit so caller sees only the stable value.
      onChange(baseRef.current);
    };
    rec.onerror = (ev) => {
      setError(
        ev.error === 'not-allowed'
          ? 'Microphone permission denied'
          : ev.error === 'no-speech'
            ? 'Didn\u2019t catch that — try again'
            : 'Voice input error',
      );
      setListening(false);
      recRef.current = null;
      setTimeout(() => setError(null), 2800);
    };
    try {
      rec.start();
      recRef.current = rec;
      setListening(true);
      setError(null);
    } catch (err) {
      setError((err as Error).message || 'Couldn\u2019t start mic');
      setTimeout(() => setError(null), 2400);
    }
  }, [listening, stop, onChange, value, lang]);

  // Stop on unmount so we never leak an active recognition session.
  useEffect(() => {
    return () => {
      try {
        recRef.current?.abort();
      } catch {
        /* ignore */
      }
    };
  }, []);

  if (!supported) return null;

  const dim = size === 'sm' ? 28 : 36;
  const iconSize = size === 'sm' ? 12 : 14;

  return (
    <motion.button
      type="button"
      onClick={start}
      data-pl-chip="true"
      aria-label={listening ? 'Stop voice input' : 'Start voice input'}
      title={
        error
          ? error
          : listening
            ? 'Stop dictating'
            : 'Tap to dictate'
      }
      whileTap={{ scale: 0.94 }}
      animate={
        listening
          ? { boxShadow: ['0 0 0 0 rgba(193,154,75,0.45)', '0 0 0 6px rgba(193,154,75,0)', '0 0 0 0 rgba(193,154,75,0)'] }
          : {}
      }
      transition={listening ? { repeat: Infinity, duration: 1.4 } : {}}
      style={{
        position: position === 'floating' ? 'absolute' : 'relative',
        ...(position === 'floating'
          ? { right: 6, top: '50%', transform: 'translateY(-50%)' }
          : {}),
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: dim,
        height: dim,
        borderRadius: '50%',
        border: error
          ? '1px solid var(--pl-plum, #7A2D2D)'
          : listening
            ? '1px solid var(--pl-gold, #C19A4B)'
            : '1px solid var(--pl-divider, #D8CFB8)',
        background: error
          ? 'color-mix(in oklab, var(--pl-plum, #7A2D2D) 14%, transparent)'
          : listening
            ? 'color-mix(in oklab, var(--pl-gold, #C19A4B) 22%, transparent)'
            : 'var(--pl-cream-card, #FBF7EE)',
        color: error
          ? 'var(--pl-plum, #7A2D2D)'
          : listening
            ? 'var(--pl-gold, #C19A4B)'
            : 'var(--pl-ink-soft, #4A5642)',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      {error ? (
        <MicOff size={iconSize} strokeWidth={2} />
      ) : listening ? (
        <Loader2
          size={iconSize}
          strokeWidth={2}
          style={{ animation: 'pl-spin 1.2s linear infinite' }}
        />
      ) : (
        <Mic size={iconSize} strokeWidth={2} />
      )}
    </motion.button>
  );
}
