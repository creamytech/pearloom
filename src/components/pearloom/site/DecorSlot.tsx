'use client';

/* ========================================================================
   DecorSlot — wraps any decor primitive and respects host-controlled
   visibility. Reads `manifest.decorVisibility[id]`; when explicitly
   set to `false`, the slot renders nothing. Default: visible.

   In edit mode, the slot also exposes a small floating "hide" handle
   on hover so the host can dismiss any decor element without leaving
   the page (the editor wires the toggle through onToggleVisibility).

   Resize / move handles are deliberately NOT here yet — show/hide is
   the most-requested control and ships first.
   ======================================================================== */

import { useState, type CSSProperties, type ReactNode } from 'react';
import type { StoryManifest } from '@/types';

interface Props {
  manifest: StoryManifest;
  /** Stable ID for this decor element. Used as the key in
   *  manifest.decorVisibility. Pick something stable like
   *  'hero-stamp' or 'divider-3'. */
  id: string;
  /** Optional human-readable label shown on hover in editor mode. */
  label?: string;
  /** When true, the editor wires the dismissible handle. */
  editMode?: boolean;
  /** Toggle callback. Editor sets manifest.decorVisibility[id]. */
  onToggleVisibility?: (id: string, visible: boolean) => void;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

export function DecorSlot({
  manifest,
  id,
  label,
  editMode,
  onToggleVisibility,
  className = '',
  style,
  children,
}: Props) {
  const visibility = (manifest as unknown as { decorVisibility?: Record<string, boolean> }).decorVisibility;
  // undefined | true → visible. false → hidden.
  const visible = visibility?.[id] !== false;
  const [hovered, setHovered] = useState(false);

  if (!visible) {
    // In edit mode, render a thin restore strip so the host can
    // un-hide what they hid earlier.
    if (editMode && onToggleVisibility) {
      return (
        <button
          type="button"
          onClick={() => onToggleVisibility(id, true)}
          className={className}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            background: 'rgba(14,13,11,0.04)',
            border: '1px dashed var(--line, rgba(0,0,0,0.12))',
            borderRadius: 999,
            fontSize: 11,
            color: 'var(--ink-muted)',
            cursor: 'pointer',
            ...style,
          }}
        >
          ↻ {label ?? id}
        </button>
      );
    }
    return null;
  }

  if (!editMode) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{ position: 'relative', ...style }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
      {hovered && onToggleVisibility && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisibility(id, false);
          }}
          aria-label={`Hide ${label ?? id}`}
          title={`Hide ${label ?? id}`}
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            width: 22,
            height: 22,
            borderRadius: '50%',
            border: '1px solid var(--card-ring, rgba(0,0,0,0.12))',
            background: 'var(--card, #fff)',
            color: 'var(--ink-soft)',
            fontSize: 14,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
            zIndex: 5,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}
