'use client';

// ─────────────────────────────────────────────────────────────
// useBackgroundManifest — speculative manifest pre-warm. Once
// the host has the required inputs (photos + names + occasion
// + vibes + palette), this hook fires /api/generate/stream in
// the background and caches the final manifest in
// sessionStorage. When the host taps "Generate" at the end of
// the wizard, the cached result lands instantly instead of
// waiting 60-120s for a fresh pass.
//
// Risks + mitigations:
//   • Wasted work if the host changes inputs after the cook
//     completes — we hash the inputs into a signature and abort
//     any in-flight cook when the signature changes.
//   • Stale cache if the host abandons the wizard and returns
//     hours later — sessionStorage scopes to the tab so this is
//     mostly fine; a TTL field rejects results > 1 hour old.
//   • Photos can be MB-heavy — we strip base64 from the cached
//     manifest before persisting (the manifest already does
//     this via stripArtForStorage on save, but the wizard's
//     speculative copy goes through this hook so we strip here).
//
// Returns: { ready, cooking, manifest, signature }. The wizard's
// generate handler should:
//   1. Compute the current signature from `st`.
//   2. If `ready` && signature matches, use `manifest` directly
//      (skip the foreground fetch entirely).
//   3. Otherwise, run the normal foreground generate.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import type { StoryManifest } from '@/types';

/** Subset of wizard state that materially affects the generated
 *  manifest. Anything in this object is hashed into the
 *  signature; if any of these change, the cached manifest is
 *  invalidated. */
export interface ManifestCookContext {
  photoIds: string[];
  names: [string, string];
  occasion: string;
  category?: string;
  vibes: string[];
  paletteColors: string[];
  templateId?: string | null;
  layout?: string;
  eventDate?: string;
  eventVenue?: string;
}

/** The body the wizard would otherwise build inline for the
 *  foreground generate call. Passed through opaquely so the
 *  hook never has to know the full shape. */
export interface ManifestCookBody {
  /** Stable inputs for the signature. */
  ctx: ManifestCookContext;
  /** Full body to POST to /api/generate/stream. Must include
   *  `photos`, `clusters`, etc. */
  body: Record<string, unknown>;
}

interface CookedEntry {
  signature: string;
  manifest: StoryManifest;
  /** epoch ms — used for TTL invalidation. */
  cookedAt: number;
}

const SIGNATURE_PREFIX = 'pearloom:cook:manifest:';
const TTL_MS = 60 * 60 * 1000; // 1 hour

/** Build a stable signature for a cook context. Sort photos to
 *  preserve order-insensitivity (the manifest doesn't care which
 *  photo came first as long as the set is the same). */
export function buildManifestSignature(ctx: ManifestCookContext): string {
  const photos = [...ctx.photoIds].sort().join(',');
  const vibes = [...ctx.vibes].sort().join(',');
  const palette = ctx.paletteColors.join(',');
  return [
    ctx.occasion,
    ctx.category ?? '',
    ctx.names.join('+'),
    photos,
    vibes,
    palette,
    ctx.templateId ?? '',
    ctx.layout ?? '',
    ctx.eventDate ?? '',
    ctx.eventVenue ?? '',
  ].join('|');
}

/** Check sessionStorage for a cooked manifest matching the
 *  signature. Returns null if missing, expired, or signature
 *  mismatch. Exposed so the wizard's submit handler can read it
 *  even when the hook isn't actively running (e.g. resuming
 *  after a tab swap). */
export function readCookedManifest(signature: string): StoryManifest | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(SIGNATURE_PREFIX + signature);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CookedEntry;
    if (entry.signature !== signature) return null;
    if (Date.now() - entry.cookedAt > TTL_MS) return null;
    return entry.manifest;
  } catch {
    return null;
  }
}

/** Strip MB-heavy base64 art from a manifest before persisting.
 *  Mirrors the editor's stripArtForStorage pattern but scoped
 *  to the wizard's speculative copy. We treat the manifest as
 *  Record<string, unknown> for the strip (the StoryManifest
 *  shape doesn't matter to JSON.stringify) and cast on the way
 *  back out. */
function stripBase64(manifest: StoryManifest): StoryManifest {
  const m = manifest as unknown as Record<string, unknown>;
  const next: Record<string, unknown> = { ...m };
  const vibeSkin = next.vibeSkin;
  if (vibeSkin && typeof vibeSkin === 'object') {
    const vs: Record<string, unknown> = { ...(vibeSkin as Record<string, unknown>) };
    for (const key of Object.keys(vs)) {
      const v = vs[key];
      if (typeof v === 'string' && v.startsWith('data:')) {
        delete vs[key];
      }
    }
    next.vibeSkin = vs;
  }
  return next as unknown as StoryManifest;
}

export interface BackgroundManifestStatus {
  /** True while a cook is in flight. */
  cooking: boolean;
  /** True once a manifest is cached for the current signature. */
  ready: boolean;
  /** The cached manifest, or null until ready. */
  manifest: StoryManifest | null;
  /** Stable signature for the most-recent cook. */
  signature: string | null;
  /** Last error string. The wizard ignores these — failed
   *  speculative cooks fall through to foreground generation. */
  error: string | null;
}

export function useBackgroundManifest(input: ManifestCookBody | null): BackgroundManifestStatus {
  const [status, setStatus] = useState<BackgroundManifestStatus>({
    cooking: false,
    ready: false,
    manifest: null,
    signature: null,
    error: null,
  });
  const lastSignatureRef = useRef<string | null>(null);
  const inflightRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!input) return;
    const signature = buildManifestSignature(input.ctx);
    if (lastSignatureRef.current === signature) return;

    // Cancel any previous in-flight cook before re-arming.
    if (inflightRef.current) {
      inflightRef.current.abort();
      inflightRef.current = null;
    }

    // Cache hit — reuse + flip ready immediately.
    const cached = readCookedManifest(signature);
    if (cached) {
      lastSignatureRef.current = signature;
      setStatus({
        cooking: false,
        ready: true,
        manifest: cached,
        signature,
        error: null,
      });
      return;
    }

    lastSignatureRef.current = signature;
    setStatus({ cooking: true, ready: false, manifest: null, signature, error: null });

    const ctrl = new AbortController();
    inflightRef.current = ctrl;

    (async () => {
      try {
        const res = await fetch('/api/generate/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: ctrl.signal,
          body: JSON.stringify(input.body),
        });
        if (!res.ok || !res.body) {
          throw new Error(`Pre-warm failed (${res.status})`);
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let finalManifest: StoryManifest | null = null;
        let streamError: string | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split('\n\n');
          buffer = frames.pop() ?? '';
          for (const frame of frames) {
            const line = frame.split('\n').find((l) => l.startsWith('data: '));
            if (!line) continue;
            try {
              const ev = JSON.parse(line.slice(6)) as { type?: string; manifest?: StoryManifest; message?: string };
              if (ev.type === 'complete' && ev.manifest) {
                finalManifest = ev.manifest;
              } else if (ev.type === 'error') {
                streamError = ev.message ?? 'Pre-warm error';
              }
            } catch {
              // ignore frame-parse errors
            }
          }
        }
        if (streamError) throw new Error(streamError);
        if (!finalManifest) throw new Error('No manifest from pre-warm');

        // Persist + commit. Strip base64 art so sessionStorage
        // doesn't blow past quota.
        const lean = stripBase64(finalManifest);
        try {
          const entry: CookedEntry = { signature, manifest: lean, cookedAt: Date.now() };
          window.sessionStorage.setItem(SIGNATURE_PREFIX + signature, JSON.stringify(entry));
        } catch {
          // Quota — non-fatal.
        }
        setStatus({
          cooking: false,
          ready: true,
          manifest: lean,
          signature,
          error: null,
        });
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') return;
        setStatus({
          cooking: false,
          ready: false,
          manifest: null,
          signature,
          error: e instanceof Error ? e.message : 'Pre-warm failed',
        });
      } finally {
        if (inflightRef.current === ctrl) inflightRef.current = null;
      }
    })();

    return () => {
      ctrl.abort();
    };
  }, [input]);

  return status;
}
