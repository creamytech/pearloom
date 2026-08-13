'use client';
 
/* Shared plumbing for the Event-OS block sections (itinerary,
   costSplitter, activityVote, toastSignup, adviceWall, program,
   livestream, obituary, packingList, honorList).

   ThemedSite's renderKind dispatch passes every block the SAME
   minimal props bag (BlockSectionProps) so design agents can flesh
   out variants inside these files without ever touching the hub
   files (ThemedSite / PropertyRail / SectionRail / layouts).

   Contract for every block section:
     - Reads real manifest data (paths documented per file).
     - Empty + editable  → <BlockEmpty /> callout inside the frame.
     - Empty + published → return null (guests never see scaffolding).
     - The FIRST variant id in layouts.ts is implemented here; other
       variant ids fall through to it until a design agent lands them. */

import type { CSSProperties, ReactNode } from 'react';
import type { StoryManifest } from '@/types';

export interface BlockSectionProps {
  manifest: StoryManifest;
  /** Density padding multiplier (ThemedSite ctx.pad — cozy 0.74 /
   *  comfortable 1 / spacious 1.32). */
  pad: number;
  /** Editor canvas (true) vs published site (false). */
  editable: boolean;
  /** Active layout variant id — resolved by ThemedSite via
   *  readVariant(manifest, section) against the layouts.ts registry. */
  variant: string;
  /** manifest.copy.<key> writer — editor only; undefined when
   *  published. Empty commits clear the override. */
  onEditCopy?: (key: string, v: string) => void;
}

/** Read a manifest.copy override with a default. */
export function blockCopy(manifest: StoryManifest, key: string, fallback: string): string {
  const copy = (manifest as unknown as { copy?: Record<string, string> }).copy;
  const v = copy?.[key];
  return typeof v === 'string' && v.trim() ? v : fallback;
}

/** Standard outer section frame — single source of padding +
 *  background so variants stay content-only (mirrors how the core
 *  section blocks own their frame in ThemedSite). */
export function BlockFrame({
  pad, children, background = 'var(--t-paper)', style,
}: {
  pad: number;
  children: ReactNode;
  background?: string;
  style?: CSSProperties;
}) {
  return (
    <div style={{ position: 'relative', padding: `${56 * pad}px clamp(16px, 4vw, 32px)`, background, overflow: 'hidden', ...style }}>
      <div style={{ maxWidth: 880, margin: '0 auto', position: 'relative' }}>
        {children}
      </div>
    </div>
  );
}

/** Edit-mode empty callout. Published callers must return null
 *  instead of mounting this. */
export function BlockEmpty({ hint }: { hint?: string }) {
  return (
    <div
      style={{
        padding: '26px 18px',
        borderRadius: 12,
        border: '1.5px dashed var(--t-line)',
        background: 'var(--t-card)',
        textAlign: 'center',
        color: 'var(--t-ink-muted)',
        fontSize: 13.5,
        lineHeight: 1.55,
      }}
    >
      {/* BRAND §7 empty-state key. */}
      <div style={{ fontFamily: 'var(--t-display)', fontStyle: 'italic', fontSize: 17, color: 'var(--t-ink-soft)', marginBottom: 4 }}>
        Nothing here yet.
      </div>
      <div>{hint ?? 'Open the panel to begin.'}</div>
    </div>
  );
}

/** Tiny uppercase chip — used by skeletons for time pills / role
 *  tags so the default layouts read coherent without bespoke CSS. */
export function BlockChip({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 9px',
        borderRadius: 999,
        background: 'var(--t-accent-bg, var(--t-section))',
        color: 'var(--t-accent-ink, var(--t-ink))',
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}
