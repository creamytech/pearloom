'use client';

/* ========================================================================
   DecorSlot — wraps any decor primitive and respects host-controlled
   visibility, position, and scale.

   Reads:
     • manifest.decorVisibility[id]   — show/hide (default: visible)
     • manifest.decorPlacements[id]   — { dx, dy, scale }

   Editor mode:
     • Hover → show × (hide), ↻ (reset placement), and bottom-right
       resize handle.
     • Drag the slot body → updates dx/dy in real time, throttled
       commit on pointerup (so we don't spam onSave 60 times/sec).
     • Drag the corner handle → updates scale (0.5 to 2.0).

   The wrapper itself never gates layout — even when visible:false,
   the editor renders a small "↻ restore" pill so the host can put
   the element back. Published view shows nothing.
   ======================================================================== */

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { StoryManifest } from '@/types';

interface Placement {
  dx?: number;
  dy?: number;
  scale?: number;
}

interface Props {
  manifest: StoryManifest;
  /** Stable ID for this decor element — manifest key. */
  id: string;
  /** Optional human-readable label. */
  label?: string;
  /** True only inside the editor canvas. */
  editMode?: boolean;
  /** Fired when the host hides/shows this slot. */
  onToggleVisibility?: (id: string, visible: boolean) => void;
  /** Fired when the host drags or resizes the slot. */
  onPlacementChange?: (id: string, next: Placement | null) => void;
  /** Constrain drag/resize to the parent. Default true. */
  bounded?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 2.5;

export function DecorSlot({
  manifest,
  id,
  label,
  editMode,
  onToggleVisibility,
  onPlacementChange,
  className = '',
  style,
  children,
}: Props) {
  const visibility = (manifest as unknown as { decorVisibility?: Record<string, boolean> }).decorVisibility;
  const placements = (manifest as unknown as { decorPlacements?: Record<string, Placement> }).decorPlacements;
  const visible = visibility?.[id] !== false;
  const stored: Placement = placements?.[id] ?? {};

  // Local drag/resize state — committed to manifest on pointerup so
  // we don't trigger 60 onChange()s per second during a drag.
  const [drag, setDrag] = useState<Placement>(stored);
  const dragRef = useRef<Placement>(stored);
  // Sync from manifest when external changes happen.
  useEffect(() => {
    setDrag(stored);
    dragRef.current = stored;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stored.dx, stored.dy, stored.scale]);

  const [hovered, setHovered] = useState(false);
  const [interacting, setInteracting] = useState<'move' | 'resize' | null>(null);
  const startRef = useRef<{ x: number; y: number; baseDx: number; baseDy: number; baseScale: number } | null>(null);

  function commit() {
    const next = dragRef.current;
    if (next.dx === 0 && next.dy === 0 && (next.scale === 1 || next.scale == null)) {
      onPlacementChange?.(id, null);
    } else {
      onPlacementChange?.(id, next);
    }
  }

  function startMove(e: React.PointerEvent) {
    if (!editMode || !onPlacementChange) return;
    e.preventDefault();
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setInteracting('move');
    startRef.current = {
      x: e.clientX,
      y: e.clientY,
      baseDx: drag.dx ?? 0,
      baseDy: drag.dy ?? 0,
      baseScale: drag.scale ?? 1,
    };
  }

  function startResize(e: React.PointerEvent) {
    if (!editMode || !onPlacementChange) return;
    e.preventDefault();
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setInteracting('resize');
    startRef.current = {
      x: e.clientX,
      y: e.clientY,
      baseDx: drag.dx ?? 0,
      baseDy: drag.dy ?? 0,
      baseScale: drag.scale ?? 1,
    };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!interacting || !startRef.current) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    if (interacting === 'move') {
      const next: Placement = {
        dx: startRef.current.baseDx + dx,
        dy: startRef.current.baseDy + dy,
        scale: startRef.current.baseScale,
      };
      setDrag(next);
      dragRef.current = next;
    } else if (interacting === 'resize') {
      // Resize tracks the diagonal — corner handle pulls scale.
      const delta = (dx + dy) / 240;
      const nextScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, startRef.current.baseScale + delta));
      const next: Placement = {
        dx: startRef.current.baseDx,
        dy: startRef.current.baseDy,
        scale: Math.round(nextScale * 100) / 100,
      };
      setDrag(next);
      dragRef.current = next;
    }
  }

  function onPointerEnd() {
    if (!interacting) return;
    setInteracting(null);
    startRef.current = null;
    commit();
  }

  function reset() {
    setDrag({});
    dragRef.current = {};
    onPlacementChange?.(id, null);
  }

  if (!visible) {
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

  // Effective placement combining stored (committed) and drag (live).
  const dxNow = drag.dx ?? 0;
  const dyNow = drag.dy ?? 0;
  const scaleNow = drag.scale ?? 1;
  const transform = `translate(${dxNow}px, ${dyNow}px) scale(${scaleNow})`;

  // Published view — no chrome, just the transform applied.
  if (!editMode) {
    return (
      <div
        className={className}
        style={{ transform, transformOrigin: 'center', ...style }}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        display: 'inline-block',
        transform,
        transformOrigin: 'center',
        cursor: interacting === 'move' ? 'grabbing' : 'grab',
        outline: hovered || interacting ? '1px dashed var(--peach-ink, #C6703D)' : 'none',
        outlineOffset: 4,
        userSelect: 'none',
        touchAction: 'none',
        ...style,
      }}
      onPointerDown={startMove}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
      {(hovered || interacting) && (
        <>
          {/* Hide */}
          {onToggleVisibility && (
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onToggleVisibility(id, false);
              }}
              aria-label={`Hide ${label ?? id}`}
              title={`Hide ${label ?? id}`}
              style={CHIP_STYLE(0)}
            >
              ×
            </button>
          )}
          {/* Reset */}
          {(dxNow !== 0 || dyNow !== 0 || scaleNow !== 1) && (
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                reset();
              }}
              aria-label="Reset placement"
              title="Reset position + scale"
              style={CHIP_STYLE(1)}
            >
              ↻
            </button>
          )}
          {/* Resize corner */}
          <span
            role="button"
            aria-label="Resize"
            title="Drag to resize"
            onPointerDown={startResize}
            style={{
              position: 'absolute',
              right: -10,
              bottom: -10,
              width: 16,
              height: 16,
              borderRadius: 4,
              background: 'var(--peach-ink, #C6703D)',
              cursor: 'nwse-resize',
              boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
              border: '2px solid var(--card, #fff)',
            }}
          />
          {/* Live coords on drag */}
          {interacting && (
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: -28,
                transform: 'translateX(-50%)',
                background: 'var(--ink, #18181B)',
                color: 'var(--cream, #FDFAF0)',
                padding: '3px 8px',
                borderRadius: 6,
                fontSize: 10,
                fontFamily: 'ui-monospace, monospace',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
              }}
            >
              {interacting === 'resize' ? `${(scaleNow * 100).toFixed(0)}%` : `${dxNow.toFixed(0)},${dyNow.toFixed(0)}`}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CHIP_STYLE(slot: 0 | 1): CSSProperties {
  return {
    position: 'absolute',
    top: 4,
    right: 4 + slot * 28,
    width: 22,
    height: 22,
    borderRadius: '50%',
    border: '1px solid var(--card-ring, rgba(0,0,0,0.12))',
    background: 'var(--card, #fff)',
    color: 'var(--ink-soft)',
    fontSize: 13,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
    zIndex: 5,
    fontFamily: 'inherit',
  };
}
