'use client';

// ─────────────────────────────────────────────────────────────
// DecorEditOverlay — generalized canvas affordance for every AI
// art surface. Wraps the rendered art (stamp, divider, footer
// bouquet, hero flourish, confetti, sticker) and reveals on
// hover a small chip with three actions:
//
//   ✎ Recolor   — opens the recolor flow (gpt-image-2 edit pass
//                  with a target palette pulled from the theme)
//   ⟳ Regenerate — jumps the inspector to the Decor Library
//                  scoped to this asset's slot so the host can
//                  redraft from scratch
//   × Hide       — toggles manifest.decorVisibility[key] off so
//                  the surface no longer renders
//
// Replaces the divider-specific DecorDividerEditOverlay which
// only handled one surface. Same UX language across every AI
// art surface so the editor reads as one consistent system.
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

const DECOR_LIBRARY_ANCHOR = '[data-pl-decor-library]';

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

  function handleRegenerate() {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('pearloom:inspector-focus', { detail: { blockKey: 'theme' } }));
    setTimeout(() => {
      const el = document.querySelector(DECOR_LIBRARY_ANCHOR);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 240);
  }

  function handleRecolor() {
    if (typeof window === 'undefined' || !url) return;
    // Surface a recolor request via a global event so the
    // inspector picks it up and opens the recolor modal scoped
    // to this exact asset. Implementation in DecorRecolorModal
    // (mounted at the editor root).
    window.dispatchEvent(new CustomEvent('pearloom:decor-recolor', {
      detail: { kind, url, visibilityKey, label },
    }));
  }

  return (
    <div
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      style={{ position: 'relative' }}
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
          transition: 'opacity 200ms cubic-bezier(0.22, 1, 0.36, 1)',
          fontFamily: 'var(--font-ui)',
          zIndex: 30,
        }}
      >
        {url && (
          <button
            type="button"
            onClick={handleRecolor}
            title="Recolor with theme palette"
            style={chipStyle}
          >
            <ColorIcon /> Recolor
          </button>
        )}
        <button
          type="button"
          onClick={handleRegenerate}
          title="Open the Decor Library"
          style={chipStyle}
        >
          <RefreshIcon /> Regenerate
        </button>
        <button
          type="button"
          onClick={handleHide}
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

function ColorIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="13.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="10.5" r="2.5" /><circle cx="13.5" cy="14.5" r="2.5" />
      <path d="M3 21l4-4M3 21h6" />
    </svg>
  );
}
function RefreshIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
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
