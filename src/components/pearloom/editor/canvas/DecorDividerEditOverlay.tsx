'use client';

// ──────────────────────────────────────────────────────────────
// DecorDividerEditOverlay — wraps a DecorDivider with an edit
// affordance in edit mode. Hovering reveals a small chip with:
//
//   ✎ Edit    — jumps the inspector rail to the Theme tab so the
//                user can hop to the Decor Library to redraw
//   ×  Remove  — hides this divider via decorVisibility[divider-$k]
//
// Crucially, this overlay carries the `pl8-divider-edit-zone`
// class. A CSS rule in pearloom.css suppresses the parent
// section's chip when this zone is hovered, so the user never
// sees a misleading 'STORY' label while interacting with the
// separator above Story.
// ──────────────────────────────────────────────────────────────

import { type ReactNode } from 'react';
import type { StoryManifest } from '@/types';
import { useIsEditMode } from './EditorCanvasContext';

interface Props {
  blockKey: string;
  onEditField?: (patch: (m: StoryManifest) => StoryManifest) => void;
  children: ReactNode;
}

export function DecorDividerEditOverlay({ blockKey, onEditField, children }: Props) {
  const editMode = useIsEditMode();

  if (!editMode) return <>{children}</>;

  function handleRemove() {
    if (!onEditField) return;
    onEditField((m) => {
      const cur = (m as unknown as { decorVisibility?: Record<string, boolean> }).decorVisibility ?? {};
      const next = { ...cur, [`divider-${blockKey}`]: false };
      return { ...m, decorVisibility: next } as StoryManifest;
    });
  }

  function handleEdit() {
    // Jump the inspector to the Theme block's panel where the
    // Decor Library lives. Then scroll the Library section into
    // view so the user lands directly on the divider slot.
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('pearloom:inspector-focus', { detail: { blockKey: 'theme' } }));
    setTimeout(() => {
      const el = document.querySelector('[data-pl-decor-library]');
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 240);
  }

  return (
    <div
      className="pl8-divider-edit-zone"
      style={{ position: 'relative' }}
    >
      {children}
      <div
        className="pl8-divider-edit-chip"
        role="toolbar"
        aria-label="Divider actions"
        style={{
          position: 'absolute',
          top: 6,
          left: 10,
          zIndex: 30,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 2,
          padding: '3px 4px 3px 8px',
          borderRadius: 999,
          background: 'rgba(14,13,11,0.86)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          boxShadow: '0 6px 18px rgba(14,13,11,0.22)',
          color: 'rgba(251, 247, 238, 0.92)',
          fontFamily: 'var(--font-ui)',
          fontSize: 10.5,
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          opacity: 0,
          pointerEvents: 'none',
          transform: 'translateY(-3px)',
          transition: 'opacity 180ms cubic-bezier(0.22, 1, 0.36, 1), transform 180ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <span style={{ padding: '0 6px 0 2px' }}>Divider</span>
        <button
          type="button"
          onClick={handleEdit}
          aria-label="Edit divider in Decor Library"
          title="Open in Decor Library"
          style={chipBtn}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={handleRemove}
          aria-label="Hide this divider"
          title="Hide this divider"
          style={{ ...chipBtn, color: '#FCA5A5' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}

const chipBtn: React.CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: 999,
  border: 'none',
  background: 'transparent',
  color: 'inherit',
  cursor: 'pointer',
  display: 'grid',
  placeItems: 'center',
};
