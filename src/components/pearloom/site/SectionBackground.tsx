'use client';

/* ========================================================================
   SectionBackground — per-section background-style overlay.

   Drops into the start of any <section> as the first child. Reads
   `manifest.sectionBackgrounds[sectionId]` and renders one of:

     'paper'      — the cream paper grain (default, no extra layer).
     'wash'       — single-color radial gradient wash.
     'mesh'       — multi-color subtle gradient mesh (premium).
     'atmosphere' — animates the same atmosphere as the hero.
     'none'       — flat, no overlay.

   Renders absolutely positioned so it never affects layout, with
   pointer-events: none. Sits underneath all other section content
   via z-index: 0.
   ======================================================================== */

import type { StoryManifest } from '@/types';
import { LivingAtmosphere, type AtmosphereKind, type AtmosphereIntensity } from './LivingAtmosphere';

interface Props {
  manifest?: StoryManifest;
  sectionId: string;
  /** Default when manifest has no entry for this section. */
  defaultKind?: SectionBgKind;
}

export type SectionBgKind = 'paper' | 'wash' | 'mesh' | 'atmosphere' | 'none';

export function SectionBackground({ manifest, sectionId, defaultKind = 'paper' }: Props) {
  if (!manifest) return null;
  // Resolve background kind. Two paths exist for legacy reasons:
  //   1. manifest.blockStyles[sectionId].background — canonical
  //      per-block override. Accepts the SectionBgKind vocabulary
  //      ('paper' | 'wash' | 'mesh' | 'atmosphere' | 'none') OR
  //      a raw CSS color (handled upstream in BlockStyleWrapper).
  //   2. manifest.sectionBackgrounds[sectionId] — legacy field
  //      AtmospherePanel writes to. Still consulted as a fallback
  //      so existing populated sites keep their overrides.
  // Audit #14 (2026-05-30): canonical write target is blockStyles;
  // sectionBackgrounds reads continue for backward compat.
  const fromBlock = (manifest as unknown as {
    blockStyles?: Record<string, { background?: string }>;
  }).blockStyles?.[sectionId]?.background;
  const fromLegacy = (manifest as unknown as { sectionBackgrounds?: Record<string, string> })
    .sectionBackgrounds?.[sectionId];
  const fromBlockKind: SectionBgKind | null =
    fromBlock === 'paper' || fromBlock === 'wash' || fromBlock === 'mesh' || fromBlock === 'atmosphere' || fromBlock === 'none'
      ? fromBlock
      : null;
  const kindRaw = (fromBlockKind ?? (fromLegacy as SectionBgKind | undefined)) ?? defaultKind;
  const accent = (manifest as unknown as { theme?: { colors?: { accent?: string; background?: string } } }).theme?.colors?.accent;

  if (kindRaw === 'paper' || kindRaw === 'none') return null;

  if (kindRaw === 'wash') {
    return (
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 50% 0%, ${withAlpha(accent ?? '#C6703D', 0.10)} 0%, transparent 60%)`,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
    );
  }

  if (kindRaw === 'mesh') {
    return (
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(circle at 14% 18%, ${withAlpha(accent ?? '#C6703D', 0.16)} 0%, transparent 36%),
            radial-gradient(circle at 86% 26%, ${withAlpha('#A88BC8', 0.12)} 0%, transparent 38%),
            radial-gradient(circle at 60% 88%, ${withAlpha('#A8BA72', 0.13)} 0%, transparent 42%)
          `,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
    );
  }

  if (kindRaw === 'atmosphere') {
    const globalA = (manifest as unknown as { atmosphere?: { kind?: string; intensity?: string; accent?: string } }).atmosphere;
    // Per-section override beats the global atmosphere — this lets
    // (e.g.) the schedule section play "stars" while the hero plays
    // "motes" without changing the global setting.
    const sectionA = (manifest as unknown as { sectionAtmosphere?: Record<string, { kind?: string; intensity?: string }> })
      .sectionAtmosphere?.[sectionId];
    const k = (sectionA?.kind ?? globalA?.kind) as AtmosphereKind | undefined;
    const i = (sectionA?.intensity ?? globalA?.intensity) as AtmosphereIntensity | undefined;
    return (
      <LivingAtmosphere
        kind={k ?? 'motes'}
        intensity={i ?? 'subtle'}
        accent={globalA?.accent ?? accent}
        style={{ pointerEvents: 'none', zIndex: 0 }}
      />
    );
  }

  return null;
}

function withAlpha(color: string, alpha: number): string {
  if (color.startsWith('#') && (color.length === 7 || color.length === 4)) {
    const hex = color.length === 4
      ? '#' + color.slice(1).split('').map((c) => c + c).join('')
      : color;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}
