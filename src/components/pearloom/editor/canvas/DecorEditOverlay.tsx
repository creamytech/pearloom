'use client';

// ─────────────────────────────────────────────────────────────
// DecorEditOverlay — generalized canvas affordance for every AI
// art surface. Wraps the rendered art (stamp, divider, footer
// bouquet, hero flourish, confetti, sticker) and reveals on
// hover a small chip with two actions:
//
//   ⤥ Swap      — opens the DecorSwapModal so the host can pick
//                  any other piece in their asset library —
//                  uploads, AI marks, editorial scenes — and
//                  apply it to this surface. Same UX as swapping
//                  any other icon on the canvas.
//   × Hide       — toggles manifest.decorVisibility[key] off so
//                  the surface no longer renders
//
// Recolor + regenerate were moved out of the canvas entirely
// (they read as too aggressive for a click-on-art interaction).
// Hosts who want either now go through the Decor Library or
// Pear directly. Click-on-canvas → swap-from-library is the
// only canvas-side action now.
// ─────────────────────────────────────────────────────────────

import { useState, type ReactNode } from 'react';
import type { StoryManifest } from '@/types';
import { useIsEditMode } from './EditorCanvasContext';

export type DecorKind =
  | 'divider'
  | 'stamp'
  | 'flourish'      // hero accent
  | 'bouquet'       // footer bouquet
  | 'confetti'      // RSVP confetti burst
  | 'sticker';

interface Props {
  /** Visibility key written to manifest.decorVisibility on hide. */
  visibilityKey: string;
  /** Asset surface kind — drives the chip label + the inspector
   *  jump destination. */
  kind: DecorKind;
  /** Source URL of the current AI-painted asset, if any. Passed
   *  to the recolor flow. When undefined, the recolor chip is
   *  hidden (nothing to recolor yet). */
  url?: string | null;
  /** Manifest patcher from SiteV8Renderer's onEditField. */
  onEditField?: (patch: (m: StoryManifest) => StoryManifest) => void;
  /** Optional human label shown in the chip (e.g. "Story stamp"). */
  label?: string;
  children: ReactNode;
}

export function DecorEditOverlay({
  visibilityKey,
  kind,
  url,
  onEditField,
  label,
  children,
}: Props) {
  const editMode = useIsEditMode();
  const [hovering, setHovering] = useState(false);
  // Library tiles drag with ASSET_DRAG_MIME ('application/x-pearloom-asset')
  // OR text/uri-list. Drop onto a decor surface → write the URL
  // to the matching manifest path. Same applyDecorUrl mapping
  // DecorSwapModal uses; we just call out to it via the same event.
  const [dragOver, setDragOver] = useState(false);

  if (!editMode) return <>{children}</>;

  function handleHide() {
    if (!onEditField) return;
    onEditField((m) => {
      const cur = (m as unknown as { decorVisibility?: Record<string, boolean> }).decorVisibility ?? {};
      return {
        ...m,
        decorVisibility: { ...cur, [visibilityKey]: false },
      } as StoryManifest;
    });
  }

  function handleSwap() {
    if (typeof window === 'undefined') return;
    // Surface a swap request via a global event. DecorSwapModal
    // (mounted at the editor root) listens, opens the library,
    // and writes the picked URL back to the same manifest path
    // this overlay's visibilityKey corresponds to.
    window.dispatchEvent(new CustomEvent('pearloom:decor-swap', {
      detail: { kind, url, visibilityKey, label },
    }));
  }

  function handleDragOver(e: React.DragEvent) {
    if (!editMode || !onEditField) return;
    const types = e.dataTransfer.types;
    const accepts = types.includes('application/x-pearloom-asset') || types.includes('text/uri-list');
    if (!accepts) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOver(true);
  }
  function handleDrop(e: React.DragEvent) {
    if (!editMode || !onEditField) return;
    const url = e.dataTransfer.getData('application/x-pearloom-asset')
      || e.dataTransfer.getData('text/uri-list');
    setDragOver(false);
    if (!url) return;
    e.preventDefault();
    e.stopPropagation();
    // Reuse DecorSwapModal's path-mapping by dispatching a synthetic
    // swap event with the dropped URL — keeps a single source of
    // truth for "URL → manifest field" in DecorSwapModal.applyDecorUrl.
    // We piggyback by directly editing decorLibrary here mirroring
    // that mapping; no UI flash.
    onEditField((m) => {
      const next = { ...m } as StoryManifest;
      const lib: Record<string, unknown> = ((next as unknown as { decorLibrary?: Record<string, unknown> }).decorLibrary ?? {});
      if (visibilityKey.startsWith('stamp-')) {
        const section = visibilityKey.slice('stamp-'.length);
        const stamps = ((lib.sectionStamps as Record<string, string> | undefined) ?? {});
        lib.sectionStamps = { ...stamps, [section]: url };
      } else if (visibilityKey === 'footer-bouquet') {
        lib.footerBouquet = url;
      } else if (visibilityKey.startsWith('divider')) {
        lib.divider = url;
      } else if (visibilityKey === 'confetti') {
        lib.confetti = url;
      } else if (visibilityKey === 'flourish' || kind === 'flourish') {
        (next as unknown as { aiAccentUrl?: string }).aiAccentUrl = url;
      }
      (next as unknown as { decorLibrary?: Record<string, unknown> }).decorLibrary = lib;
      return next;
    });
  }
  return (
    <div
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setHovering(true)}
      onBlur={(e) => {
        const next = e.relatedTarget as Node | null;
        if (!next || !e.currentTarget.contains(next)) setHovering(false);
      }}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      style={{
        position: 'relative',
        outline: dragOver ? '2px dashed var(--peach-ink, #C6703D)' : undefined,
        outlineOffset: dragOver ? 4 : undefined,
        transition: 'outline-color var(--pl-dur-fast) var(--pl-ease-out)',
      }}
      data-pl-decor-edit
      className={kind === 'divider' ? 'pl8-divider-edit-zone' : undefined}
    >
      {children}
      <div
        style={{
          position: 'absolute',
          top: kind === 'divider' ? '50%' : 8,
          right: kind === 'divider' ? 16 : 8,
          transform: kind === 'divider' ? 'translateY(-50%)' : undefined,
          display: 'inline-flex',
          gap: 4,
          padding: 4,
          borderRadius: 999,
          background: 'rgba(14,13,11,0.92)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          boxShadow: '0 12px 32px rgba(14,13,11,0.32)',
          opacity: hovering ? 1 : 0,
          pointerEvents: hovering ? 'auto' : 'none',
          transition: 'opacity var(--pl-dur-fast) var(--pl-ease-out)',
          fontFamily: 'var(--font-ui)',
          zIndex: 30,
        }}
      >
        <button
          type="button"
          onClick={handleSwap}
          aria-label="Swap for another piece in your library"
          title="Swap for another piece in your library"
          style={chipStyle}
        >
          <SwapIcon /> Swap
        </button>
        <button
          type="button"
          onClick={handleHide}
          aria-label="Hide this on the canvas"
          title="Hide this on the canvas"
          style={chipStyle}
        >
          <CloseIcon /> Hide
        </button>
      </div>
    </div>
  );
}

const chipStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '6px 10px',
  borderRadius: 999,
  background: 'transparent',
  color: 'rgba(243,233,212,0.92)',
  border: 'none',
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

function SwapIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}
