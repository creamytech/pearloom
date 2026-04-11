'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / wizard/useSpeechRecognition.ts
//
// Thin wrapper around the Web Speech API's SpeechRecognition.
// Powers the mic button on the wizard's natural-language entry
// textarea so users can say "October wedding in Cape Cod for
// Alex and Jordan" instead of typing.
//
// Fails gracefully on unsupported browsers — the hook simply
// returns `supported: false` and the caller hides the mic.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';

// The Web Speech API is still vendor-prefixed in some browsers
// and not in @types/dom, so we shape it ourselves.
interface SpeechRecognitionEventLike {
  results: ArrayLike<{
    0: { transcript: string };
    isFinal: boolean;
    length: number;
  }> & { length: number };
  resultIndex: number;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export interface UseSpeechRecognitionResult {
  /** Whether the current browser can do speech recognition. */
  supported: boolean;
  /** Whether we're actively listening right now. */
  listening: boolean;
  /** Latest error message from the recognizer, if any. */
  error: string | null;
  /**
   * Start listening. Calls `onTranscript(text)` for every partial
   * AND final result so the caller can render interim text.
   */
  start: (onTranscript: (text: string, isFinal: boolean) => void) => void;
  /** Stop listening. */
  stop: () => void;
}

export function useSpeechRecognition(lang = 'en-US'): UseSpeechRecognitionResult {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    setSupported(!!getRecognitionCtor());
    return () => {
      try {
        recRef.current?.abort();
      } catch { /* noop */ }
      recRef.current = null;
    };
  }, []);

  const start = useCallback(
    (onTranscript: (text: string, isFinal: boolean) => void) => {
      const Ctor = getRecognitionCtor();
      if (!Ctor) {
        setError('Speech recognition isn\u2019t supported in this browser.');
        return;
      }

      try {
        // Tear down any in-flight instance first so starts are idempotent
        if (recRef.current) {
          try { recRef.current.abort(); } catch { /* noop */ }
          recRef.current = null;
        }

        const rec = new Ctor();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = lang;

        rec.onstart = () => {
          setListening(true);
          setError(null);
        };
        rec.onend = () => {
          setListening(false);
          recRef.current = null;
        };
        rec.onerror = (e) => {
          const code = e?.error || 'speech-error';
          if (code === 'no-speech' || code === 'aborted') {
            // Silent abort — user just stopped speaking.
            return;
          }
          if (code === 'not-allowed' || code === 'service-not-allowed') {
            setError('Mic access was blocked. Check browser permissions.');
          } else {
            setError('Couldn\u2019t hear you — try again?');
          }
          setListening(false);
        };

        rec.onresult = (event) => {
          // Re-assemble the full transcript from the results
          // array so the caller always gets the full text so far.
          let full = '';
          let isFinal = true;
          const results = event.results;
          for (let i = 0; i < results.length; i++) {
            const r = results[i];
            full += r[0].transcript;
            if (!r.isFinal) isFinal = false;
          }
          onTranscript(full, isFinal);
        };

        recRef.current = rec;
        rec.start();
      } catch (err) {
        console.warn('[speech] Failed to start recognition:', err);
        setError('Couldn\u2019t start listening.');
        setListening(false);
      }
    },
    [lang],
  );

  const stop = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch { /* noop */ }
    setListening(false);
  }, []);

  return { supported, listening, error, start, stop };
}
