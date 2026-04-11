'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / wizard/useTypewriter.ts
//
// Animates a string char-by-char to make text feel like it's
// being written live during generation. Skips the animation
// entirely when:
//   • animation is disabled via `enabled: false`
//   • the `text` hasn't actually changed since last run
//   • the new text is a strict prefix of the current text (just
//     a trim, don't restart)
//
// The goal isn't to simulate a real LLM stream — the chapter
// arrives fully formed from the server — but to make the preview
// feel alive so the user watches their story *appear*.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';

export interface TypewriterOptions {
  /** Characters per tick. Higher = faster. Default 3. */
  charsPerTick?: number;
  /** Tick interval in ms. Default 22. */
  tickMs?: number;
  /** Skip the animation and show the full text immediately. */
  enabled?: boolean;
  /**
   * Optional stable key — if this changes we force a fresh run
   * even if the text string happens to match. Useful when the
   * same text is shown for a different chapter.
   */
  resetKey?: string | number;
}

export function useTypewriter(
  text: string | undefined,
  options: TypewriterOptions = {},
): string {
  const {
    charsPerTick = 3,
    tickMs = 22,
    enabled = true,
    resetKey,
  } = options;

  const [displayed, setDisplayed] = useState(() => (enabled ? '' : text ?? ''));
  const lastTextRef = useRef<string>('');
  const lastKeyRef = useRef<string | number | undefined>(resetKey);

  useEffect(() => {
    const target = text ?? '';

    // Short-circuit: animation disabled or empty target.
    if (!enabled || target.length === 0) {
      setDisplayed(target);
      lastTextRef.current = target;
      lastKeyRef.current = resetKey;
      return;
    }

    // Short-circuit: identical text and same key → no re-type.
    if (lastTextRef.current === target && lastKeyRef.current === resetKey) {
      return;
    }

    // If the new text is a strict extension of what's currently
    // displayed, continue typing forward instead of resetting.
    const startIdx = target.startsWith(displayed) ? displayed.length : 0;

    lastTextRef.current = target;
    lastKeyRef.current = resetKey;

    let i = startIdx;
    if (startIdx === 0) setDisplayed('');

    const id = window.setInterval(() => {
      i += charsPerTick;
      if (i >= target.length) {
        setDisplayed(target);
        window.clearInterval(id);
        return;
      }
      setDisplayed(target.slice(0, i));
    }, tickMs);

    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, enabled, resetKey]);

  return displayed;
}
