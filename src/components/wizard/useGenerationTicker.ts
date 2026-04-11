'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / wizard/useGenerationTicker.ts
//
// Drives the rotating "what's happening right now" ticker that
// sits above the live preview during site generation. The server
// only emits ~4 progress events across a 60-90s generation, which
// is not enough to feel alive. This hook:
//
//   1. Reads the current server `pass` (0..7)
//   2. Picks a pool of phase-specific action messages
//   3. Rotates through them on a 2.4s interval so the UI never
//      feels frozen between real server updates
//   4. Interpolates live data from the partial manifest
//      (photo count, chapter titles, color count, etc.)
//
// The result: even when nothing has changed on the server, the
// ticker keeps advancing with plausible-specific messages that
// match the current phase. Feels magical without needing a real
// per-chapter stream from Gemini.
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react';
import type { StoryManifest } from '@/types';

interface TickerContext {
  /** Current server pass number (0..7). */
  pass: number;
  /** Latest partial manifest snapshot. */
  manifest: StoryManifest | null;
  /** Number of photos the user uploaded — used in the warm-up phase. */
  photoCount: number;
  /** Names collected from the wizard, for personalized copy. */
  names: [string, string] | undefined;
}

/**
 * Phase-specific message pool. Each phase gets a handful of
 * messages that the ticker cycles through. Messages can be
 * dynamic — callers pass a `TickerContext` so the text can
 * reference real photo counts, chapter titles, etc.
 */
type MessageFn = (ctx: TickerContext) => string;

const PHASE_MESSAGES: Record<number, MessageFn[]> = {
  // ── Pass 0 — warm-up, reading photos ──
  0: [
    (c) => `Reading ${c.photoCount} of your memories`,
    (c) => `Looking at ${c.photoCount} photos for the story`,
    () => 'Peeking at your details',
    (c) => `Sorting ${c.photoCount} photos by date and place`,
    () => 'Gathering your memories',
  ],
  // ── Pass 1 — core storytelling (longest pass) ──
  1: [
    () => 'Writing your first chapter',
    () => 'Finding the emotional arc',
    (c) => c.names?.[0]
      ? `Telling ${c.names[0]}${c.names?.[1] ? ` & ${c.names[1]}` : ''}\u2019s story`
      : 'Telling your story',
    () => 'Naming the moments',
    () => 'Drafting the middle chapters',
    () => 'Writing the closing line',
    () => 'Dialing in the voice',
  ],
  // ── Pass 2 — chapter critique ──
  2: [
    () => 'Reading each chapter again',
    () => 'Polishing the titles',
    () => 'Tightening the language',
    () => 'Making sure every chapter earns its place',
    () => 'Checking the emotional beats',
  ],
  // ── Pass 3 — couple DNA extraction ──
  3: [
    () => 'Learning what makes you you',
    () => 'Pulling out your unique details',
    () => 'Finding your recurring motifs',
    () => 'Turning your story into a design brief',
  ],
  // ── Pass 4 — poetry pass ──
  4: [
    () => 'Writing the tagline',
    () => 'Crafting a short phrase to hold it all',
    () => 'Polishing the welcome line',
    () => 'Finding a divider quote',
  ],
  // ── Pass 5 — visual design & SVG art ──
  5: [
    (c) => c.manifest?.vibeSkin?.palette?.accent
      ? `Painting everything in ${paletteName(c.manifest.vibeSkin.palette.accent)}`
      : 'Mixing your color palette',
    () => 'Pairing your fonts',
    () => 'Drawing a custom medallion for your story',
    () => 'Sketching the corner flourishes',
    () => 'Weaving your motifs into the borders',
    () => 'Designing the hero illustration',
    () => 'Placing stars along the section dividers',
  ],
  // ── Pass 6 — theme reconciliation ──
  6: [
    () => 'Harmonizing every color',
    () => 'Making sure the palette flows',
    () => 'Locking in the typography',
  ],
  // ── Pass 7 — final polish ──
  7: [
    () => 'Uploading your photos to forever',
    () => 'Stamping a logo for the header',
    () => 'Adding the finishing touches',
    () => 'Almost ready...',
  ],
};

/** Rough color-name bucket for showing "Painting in Sage…" etc. */
function paletteName(accent: string): string {
  if (!accent || typeof accent !== 'string') return 'your palette';
  // Parse hex → hue range → name bucket.
  const m = accent.match(/^#([0-9a-fA-F]{6})$/);
  if (!m) return 'your palette';
  const r = parseInt(m[1].slice(0, 2), 16);
  const g = parseInt(m[1].slice(2, 4), 16);
  const b = parseInt(m[1].slice(4, 6), 16);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return l > 200 ? 'ivory' : l > 120 ? 'stone' : 'charcoal';
  const d = max - min;
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  h = h * 360;
  if (h < 15 || h >= 345) return 'rose';
  if (h < 45) return 'terracotta';
  if (h < 70) return 'gold';
  if (h < 150) return 'sage';
  if (h < 200) return 'teal';
  if (h < 250) return 'navy';
  if (h < 300) return 'plum';
  return 'berry';
}

const ROTATION_MS = 2400;

export interface GenerationTickerState {
  /** The current ticker message to display. */
  message: string;
  /** A stable key for AnimatePresence transitions. */
  key: string;
  /** Short phase headline ("Writing your story", etc.). */
  phaseLabel: string;
}

const PHASE_LABELS: Record<number, string> = {
  0: 'Gathering your memories',
  1: 'Writing your story',
  2: 'Refining every word',
  3: 'Learning your DNA',
  4: 'Weaving the poetry',
  5: 'Designing your world',
  6: 'Harmonizing colors',
  7: 'Final polish',
};

export function useGenerationTicker(ctx: TickerContext): GenerationTickerState {
  const [index, setIndex] = useState(0);

  // Advance the ticker on an interval independent of server events.
  useEffect(() => {
    setIndex(0);
    const id = window.setInterval(() => {
      setIndex((i) => i + 1);
    }, ROTATION_MS);
    return () => window.clearInterval(id);
  }, [ctx.pass]);

  const phaseLabel = PHASE_LABELS[Math.min(ctx.pass, 7)] || PHASE_LABELS[0];

  const message = useMemo(() => {
    const pool = PHASE_MESSAGES[Math.min(ctx.pass, 7)] || PHASE_MESSAGES[0];
    if (!pool || pool.length === 0) return phaseLabel;
    const fn = pool[index % pool.length];
    try {
      return fn(ctx);
    } catch {
      return phaseLabel;
    }
  }, [ctx, index, phaseLabel]);

  return {
    message,
    key: `${ctx.pass}-${index}`,
    phaseLabel,
  };
}
