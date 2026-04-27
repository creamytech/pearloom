'use client';

// ─────────────────────────────────────────────────────────────
// EditableIcon — wraps a motif Icon with click-to-swap chrome
// in edit mode. Hover reveals a small ✎ chip; click opens the
// asset library scoped to icons. Picked icon writes to
// manifest.iconOverrides[purpose] which the renderer reads on
// next render.
//
// purpose is a stable namespace (e.g. 'travel.address',
// 'rsvp.send') so multiple sites of the same icon stay in sync.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Icon } from '../../motifs';
import { useEditorCanvas } from './EditorCanvasContext';
import type { StoryManifest } from '@/types';

interface Props {
  /** Default icon name from the motifs catalog. */
  name: string;
  /** Manifest namespace key — overrides override this default. */
  purpose: string;
  size?: number;
  color?: string;
  /** Optional className for the wrapper. */
  className?: string;
}

export function EditableIcon({ name, purpose, size = 16, color, className }: Props) {
  const { editMode, onEditField } = useEditorCanvas();
  const [hovering, setHovering] = useState(false);

  function open() {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('pearloom:icon-swap', {
      detail: { purpose, currentName: name },
    }));
  }

  function clear() {
    if (!onEditField) return;
    onEditField((m) => {
      const cur = (m as unknown as { iconOverrides?: Record<string, string> }).iconOverrides ?? {};
      const next = { ...cur };
      delete next[purpose];
      return { ...m, iconOverrides: next } as StoryManifest;
    });
  }

  if (!editMode) {
    return <Icon name={name} size={size} color={color} />;
  }

  return (
    <span
      className={className}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        cursor: 'pointer',
      }}
    >
      <Icon name={name} size={size} color={color} />
      {hovering && (
        <span
          style={{
            position: 'absolute',
            top: '-100%',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'inline-flex',
            gap: 2,
            padding: 2,
            borderRadius: 999,
            background: 'rgba(14,13,11,0.92)',
            boxShadow: '0 8px 20px rgba(14,13,11,0.32)',
            zIndex: 10,
            pointerEvents: 'auto',
          }}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); open(); }}
            title="Swap icon"
            style={{
              width: 22, height: 22, borderRadius: 999,
              background: 'transparent',
              color: 'rgba(243,233,212,0.95)',
              border: 'none',
              cursor: 'pointer',
              display: 'grid', placeItems: 'center',
              fontSize: 11,
            }}
          >
            ✎
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); clear(); }}
            title="Reset to default"
            style={{
              width: 22, height: 22, borderRadius: 999,
              background: 'transparent',
              color: 'rgba(243,233,212,0.65)',
              border: 'none',
              cursor: 'pointer',
              display: 'grid', placeItems: 'center',
              fontSize: 12,
            }}
          >
            ↺
          </button>
        </span>
      )}
    </span>
  );
}
