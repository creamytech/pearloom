'use client';

// ─────────────────────────────────────────────────────────────
// useBackgroundCook — speculative pre-warm hook for the wizard.
//
// Strategy: while the host fills in the wizard, kick off the
// slow stuff in the background so the final "Generate" tap
// completes instantly (or near-instantly).
//
// Two streams cook in parallel:
//
//   1. Decor library (4 slots, ~60-120s upstream image gen) —
//      runs as soon as we know occasion + palette. Result lands
//      in sessionStorage and the editor reads it on first paint.
//      Re-runs when the signature changes (host changed palette).
//
//   2. (Future) Manifest pre-warm — once photos + names +
//      occasion + palette are set, kick the chapter pass in the
//      background. Hold the partial result; if the host doesn't
//      change params before pressing Generate, return the
//      cached manifest. Risk: if they DO change, the work is
//      wasted. Parked until Pear v3.
//
// The hook returns a small status object the UI can use to
// render a "Pear is preparing things" pill.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';

interface CookSignature {
  occasion: string;
  paletteHex: string[];
  venue?: string;
  vibe?: string;
}

export interface BackgroundCookStatus {
  /** True while at least one background task is running. */
  cooking: boolean;
  /** True once the decor library has finished cooking and
   *  is cached in sessionStorage. */
  decorReady: boolean;
  /** Last error string, surfaced for diagnostics. The wizard
   *  itself doesn't show this — it just falls back to the
   *  normal foreground generation if the warm-up failed. */
  error: string | null;
}

const DECOR_CACHE_PREFIX = 'pearloom:cook:decor:';

/** Stable cache key for a given cook context. The signature must
 *  include every field that materially changes the output —
 *  swap palette and the decor needs a re-run. */
function decorCacheKey(sig: CookSignature): string {
  const palette = sig.paletteHex.join(',');
  return `${DECOR_CACHE_PREFIX}${sig.occasion}|${palette}|${sig.venue ?? ''}|${sig.vibe ?? ''}`;
}

/** Read a cached decor library, if one exists for this signature. */
export function readCookedDecor(sig: CookSignature): unknown | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(decorCacheKey(sig));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function useBackgroundCook(sig: CookSignature | null): BackgroundCookStatus {
  const [status, setStatus] = useState<BackgroundCookStatus>({
    cooking: false,
    decorReady: false,
    error: null,
  });
  // Track the signature we've already kicked off so changing
  // panels doesn't re-fire. Also track in-flight aborts so a
  // signature change cancels the previous cook before starting
  // the next.
  const lastSignatureRef = useRef<string | null>(null);
  const inflightRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!sig) return;
    if (!sig.occasion || !sig.paletteHex.length) return;
    const key = decorCacheKey(sig);
    if (lastSignatureRef.current === key) return;

    // Cancel any previous in-flight cook before re-arming.
    if (inflightRef.current) {
      inflightRef.current.abort();
      inflightRef.current = null;
    }

    // Cache hit — already cooked, just flip the readiness flag
    // and bail. Saves a redundant API call on wizard back-nav.
    if (readCookedDecor(sig)) {
      lastSignatureRef.current = key;
      setStatus((s) => ({ ...s, cooking: false, decorReady: true, error: null }));
      return;
    }

    lastSignatureRef.current = key;
    setStatus({ cooking: true, decorReady: false, error: null });

    const ctrl = new AbortController();
    inflightRef.current = ctrl;

    (async () => {
      try {
        const res = await fetch('/api/decor/library', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: ctrl.signal,
          body: JSON.stringify({
            occasion: sig.occasion,
            paletteHex: sig.paletteHex,
            venue: sig.venue,
            vibe: sig.vibe,
            // Run all four slots: divider + sectionStamps +
            // confetti + footerBouquet.
            slots: ['divider', 'sectionStamps', 'confetti', 'footerBouquet'],
          }),
        });
        if (!res.ok) {
          throw new Error(`Decor cook failed (${res.status})`);
        }
        const data = await res.json();
        try {
          window.sessionStorage.setItem(key, JSON.stringify(data));
        } catch {
          // Quota or private mode — non-fatal.
        }
        setStatus({ cooking: false, decorReady: true, error: null });
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') return;
        setStatus({
          cooking: false,
          decorReady: false,
          error: e instanceof Error ? e.message : 'Cook failed',
        });
      } finally {
        if (inflightRef.current === ctrl) inflightRef.current = null;
      }
    })();

    return () => {
      ctrl.abort();
    };
  }, [sig]);

  return status;
}
