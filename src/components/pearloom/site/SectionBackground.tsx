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
  const overrides = (manifest as unknown as { sectionBackgrounds?: Record<string, string> }).sectionBackgrounds;
  const kindRaw = (overrides?.[sectionId] as SectionBgKind | undefined) ?? defaultKind;
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
    const a = (manifest as unknown as { atmosphere?: { kind?: string; intensity?: string; accent?: string } }).atmosphere;
    return (
      <LivingAtmosphere
        kind={(a?.kind as AtmosphereKind | undefined) ?? 'motes'}
        intensity={(a?.intensity as AtmosphereIntensity | undefined) ?? 'subtle'}
        accent={a?.accent ?? accent}
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
