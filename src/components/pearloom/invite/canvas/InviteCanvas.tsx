'use client';

// ─────────────────────────────────────────────────────────────
// InviteCanvas — interactive free-form designer.
//
// Renders a CanvasScene as positioned HTML so each element is
// drag/resize/select-able. Pointer events drive movement; eight
// resize handles + a rotation handle live around the selection.
// Double-click a text element to edit it inline.
//
// Coordinate space: 1000×1400 canvas units. The component scales
// to its container width, keeping the design aspect locked.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CANVAS_HEIGHT, CANVAS_WIDTH, isBackground, isPhoto, isShape, isText,
  type CanvasElement, type CanvasScene,
} from '@/lib/invite-canvas/types';

interface Props {
  scene: CanvasScene;
  setScene: (next: CanvasScene) => void;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  /** When true, render snap guides + handles. False = clean preview. */
  editing?: boolean;
}

type DragMode =
  | { kind: 'idle' }
  | { kind: 'move'; id: string; startX: number; startY: number; origX: number; origY: number }
  | { kind: 'resize'; id: string; handle: ResizeHandle; startX: number; startY: number; origX: number; origY: number; origW: number; origH: number; aspect: number }
  | { kind: 'rotate'; id: string; cx: number; cy: number; startAngle: number; origRotation: number };

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const SNAP_THRESHOLD = 10; // canvas px

export function InviteCanvas({ scene, setScene, selectedId, setSelectedId, editing = true }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [dragMode, setDragMode] = useState<DragMode>({ kind: 'idle' });
  const [snapGuide, setSnapGuide] = useState<{ vx?: number; vy?: number }>({});

  const ordered = useMemo(
    () => [...scene.elements].sort((a, b) => a.z - b.z),
    [scene.elements],
  );

  // Convert a pointer event's clientX/Y into canvas coords.
  const toCanvasCoords = useCallback((clientX: number, clientY: number) => {
    const stage = stageRef.current;
    if (!stage) return { x: 0, y: 0 };
    const rect = stage.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);

  // ── Pointer handlers ──
  function startMove(e: React.PointerEvent, id: string) {
    e.stopPropagation();
    if (!editing) return;
    const el = scene.elements.find((x) => x.id === id);
    if (!el || el.locked) return;
    setSelectedId(id);
    const { x, y } = toCanvasCoords(e.clientX, e.clientY);
    setDragMode({ kind: 'move', id, startX: x, startY: y, origX: el.x, origY: el.y });
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }

  function startResize(e: React.PointerEvent, id: string, handle: ResizeHandle) {
    e.stopPropagation();
    if (!editing) return;
    const el = scene.elements.find((x) => x.id === id);
    if (!el || el.locked) return;
    const { x, y } = toCanvasCoords(e.clientX, e.clientY);
    setDragMode({
      kind: 'resize', id, handle,
      startX: x, startY: y,
      origX: el.x, origY: el.y, origW: el.w, origH: el.h,
      aspect: el.h > 0 ? el.w / el.h : 1,
    });
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }

  function startRotate(e: React.PointerEvent, id: string) {
    e.stopPropagation();
    if (!editing) return;
    const el = scene.elements.find((x) => x.id === id);
    if (!el || el.locked) return;
    const { x, y } = toCanvasCoords(e.clientX, e.clientY);
    const cx = el.x + el.w / 2;
    const cy = el.y + el.h / 2;
    const startAngle = Math.atan2(y - cy, x - cx) * (180 / Math.PI);
    setDragMode({
      kind: 'rotate', id,
      cx, cy, startAngle, origRotation: el.rotation ?? 0,
    });
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (dragMode.kind === 'idle') return;
    const { x, y } = toCanvasCoords(e.clientX, e.clientY);

    if (dragMode.kind === 'move') {
      const el = scene.elements.find((s) => s.id === dragMode.id);
      if (!el) return;
      let nx = dragMode.origX + (x - dragMode.startX);
      let ny = dragMode.origY + (y - dragMode.startY);

      // Snap to canvas centre lines + edges.
      const guide: { vx?: number; vy?: number } = {};
      const cx = nx + el.w / 2;
      const cy = ny + el.h / 2;
      if (Math.abs(cx - CANVAS_WIDTH / 2) < SNAP_THRESHOLD) {
        nx = CANVAS_WIDTH / 2 - el.w / 2;
        guide.vx = CANVAS_WIDTH / 2;
      } else if (Math.abs(nx) < SNAP_THRESHOLD) {
        nx = 0;
        guide.vx = 0;
      } else if (Math.abs(nx + el.w - CANVAS_WIDTH) < SNAP_THRESHOLD) {
        nx = CANVAS_WIDTH - el.w;
        guide.vx = CANVAS_WIDTH;
      }
      if (Math.abs(cy - CANVAS_HEIGHT / 2) < SNAP_THRESHOLD) {
        ny = CANVAS_HEIGHT / 2 - el.h / 2;
        guide.vy = CANVAS_HEIGHT / 2;
      } else if (Math.abs(ny) < SNAP_THRESHOLD) {
        ny = 0;
        guide.vy = 0;
      } else if (Math.abs(ny + el.h - CANVAS_HEIGHT) < SNAP_THRESHOLD) {
        ny = CANVAS_HEIGHT - el.h;
        guide.vy = CANVAS_HEIGHT;
      }
      setSnapGuide(guide);
      setScene({
        ...scene,
        elements: scene.elements.map((s) => s.id === dragMode.id ? { ...s, x: nx, y: ny } : s),
      });
      return;
    }

    if (dragMode.kind === 'resize') {
      const dx = x - dragMode.startX;
      const dy = y - dragMode.startY;
      let nx = dragMode.origX;
      let ny = dragMode.origY;
      let nw = dragMode.origW;
      let nh = dragMode.origH;
      const minSize = 30;
      switch (dragMode.handle) {
        case 'e':  nw = Math.max(minSize, dragMode.origW + dx); break;
        case 'w':  nw = Math.max(minSize, dragMode.origW - dx); nx = dragMode.origX + dragMode.origW - nw; break;
        case 's':  nh = Math.max(minSize, dragMode.origH + dy); break;
        case 'n':  nh = Math.max(minSize, dragMode.origH - dy); ny = dragMode.origY + dragMode.origH - nh; break;
        case 'se': nw = Math.max(minSize, dragMode.origW + dx); nh = Math.max(minSize, dragMode.origH + dy); break;
        case 'ne': nw = Math.max(minSize, dragMode.origW + dx); nh = Math.max(minSize, dragMode.origH - dy); ny = dragMode.origY + dragMode.origH - nh; break;
        case 'sw': nw = Math.max(minSize, dragMode.origW - dx); nx = dragMode.origX + dragMode.origW - nw; nh = Math.max(minSize, dragMode.origH + dy); break;
        case 'nw': nw = Math.max(minSize, dragMode.origW - dx); nx = dragMode.origX + dragMode.origW - nw; nh = Math.max(minSize, dragMode.origH - dy); ny = dragMode.origY + dragMode.origH - nh; break;
      }
      // Shift = lock aspect (not exposed yet; relies on shiftKey on event).
      if (e.shiftKey && (dragMode.handle === 'se' || dragMode.handle === 'ne' || dragMode.handle === 'sw' || dragMode.handle === 'nw')) {
        nh = nw / dragMode.aspect;
      }
      setScene({
        ...scene,
        elements: scene.elements.map((s) => s.id === dragMode.id ? { ...s, x: nx, y: ny, w: nw, h: nh } : s),
      });
      return;
    }

    if (dragMode.kind === 'rotate') {
      const angle = Math.atan2(y - dragMode.cy, x - dragMode.cx) * (180 / Math.PI);
      const delta = angle - dragMode.startAngle;
      const next = (dragMode.origRotation + delta + 360) % 360;
      // Snap to 0/45/90/180/270 within ±5°.
      let snapped = next;
      for (const s of [0, 45, 90, 135, 180, 225, 270, 315, 360]) {
        if (Math.abs(next - s) < 5) { snapped = s % 360; break; }
      }
      setScene({
        ...scene,
        elements: scene.elements.map((s) => s.id === dragMode.id ? { ...s, rotation: snapped } : s),
      });
      return;
    }
  }

  function onPointerUp() {
    setDragMode({ kind: 'idle' });
    setSnapGuide({});
  }

  // Keyboard nudges for the selected element.
  useEffect(() => {
    if (!editing) return;
    function onKey(e: KeyboardEvent) {
      if (!selectedId) return;
      const tag = (document.activeElement?.tagName ?? '').toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (document.activeElement as HTMLElement | null)?.isContentEditable) return;
      const step = e.shiftKey ? 10 : 1;
      const map: Record<string, [number, number] | undefined> = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      };
      const delta = map[e.key];
      if (!delta) return;
      e.preventDefault();
      setScene({
        ...scene,
        elements: scene.elements.map((s) => s.id === selectedId
          ? { ...s, x: s.x + delta[0], y: s.y + delta[1] }
          : s),
      });
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editing, selectedId, scene, setScene]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        userSelect: dragMode.kind === 'idle' ? 'auto' : 'none',
      }}
    >
      <div
        ref={stageRef}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        // Deselect ONLY when the user clicks the empty stage
        // background, not when a click bubbles up from an element
        // (which would otherwise deselect immediately after the
        // element's own pointerdown selected it). We compare
        // event.target to the stage ref so descendant clicks pass
        // through unchanged.
        onPointerDown={(e) => {
          if (!editing) return;
          if (e.target === stageRef.current) setSelectedId(null);
        }}
        style={{
          width: 'min(640px, 100%)',
          aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
          position: 'relative',
          boxShadow: '0 24px 60px rgba(14, 13, 11, 0.18), 0 2px 6px rgba(0,0,0,0.06)',
          borderRadius: 6,
          overflow: 'hidden',
          background: '#FBF7EE',
          cursor: dragMode.kind === 'move' ? 'grabbing' : 'default',
        }}
      >
        {ordered.map((el) => (
          <ElementView
            key={el.id}
            element={el}
            selected={selectedId === el.id}
            onPointerDown={(e) => startMove(e, el.id)}
            onResizeStart={(e, h) => startResize(e, el.id, h)}
            onRotateStart={(e) => startRotate(e, el.id)}
            onTextEdit={(text) => {
              if (!isText(el)) return;
              setScene({
                ...scene,
                elements: scene.elements.map((s) => s.id === el.id ? { ...s, text } as CanvasElement : s),
              });
            }}
            editing={editing}
          />
        ))}
        {/* Snap guides */}
        {editing && snapGuide.vx !== undefined && (
          <div style={{
            position: 'absolute',
            left: `${(snapGuide.vx / CANVAS_WIDTH) * 100}%`,
            top: 0, bottom: 0, width: 1,
            background: '#C6703D', pointerEvents: 'none',
            zIndex: 9999,
          }} />
        )}
        {editing && snapGuide.vy !== undefined && (
          <div style={{
            position: 'absolute',
            top: `${(snapGuide.vy / CANVAS_HEIGHT) * 100}%`,
            left: 0, right: 0, height: 1,
            background: '#C6703D', pointerEvents: 'none',
            zIndex: 9999,
          }} />
        )}
      </div>
    </div>
  );
}

// ── Element renderer + handles ──

interface ElementViewProps {
  element: CanvasElement;
  selected: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onResizeStart: (e: React.PointerEvent, handle: ResizeHandle) => void;
  onRotateStart: (e: React.PointerEvent) => void;
  onTextEdit: (next: string) => void;
  editing: boolean;
}

function ElementView({
  element, selected, onPointerDown, onResizeStart, onRotateStart, onTextEdit, editing,
}: ElementViewProps) {
  const [editingText, setEditingText] = useState(false);
  const editableRef = useRef<HTMLDivElement | null>(null);

  if (element.hidden) return null;

  const wrapStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${(element.x / CANVAS_WIDTH) * 100}%`,
    top: `${(element.y / CANVAS_HEIGHT) * 100}%`,
    width: `${(element.w / CANVAS_WIDTH) * 100}%`,
    height: `${(element.h / CANVAS_HEIGHT) * 100}%`,
    transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
    transformOrigin: 'center center',
    zIndex: element.z,
    cursor: editing && !element.locked ? (editingText ? 'text' : 'grab') : 'default',
    pointerEvents: editing ? 'auto' : 'none',
  };

  const inner = (() => {
    if (isBackground(element)) {
      return (
        <div style={{
          position: 'absolute', inset: 0,
          background: element.imageUrl
            ? `${element.color} url(${element.imageUrl}) center / cover no-repeat`
            : element.color,
          pointerEvents: 'none',
        }}>
          {element.textPlate && (
            <div style={{
              position: 'absolute',
              top: `${(element.textPlate.y / CANVAS_HEIGHT) * 100}%`,
              left: 0, right: 0,
              height: `${(element.textPlate.h / CANVAS_HEIGHT) * 100}%`,
              background: element.color,
              opacity: element.textPlate.opacity,
            }} />
          )}
        </div>
      );
    }
    if (isPhoto(element)) {
      const radius = element.shape === 'circle' ? '50%'
        : element.shape === 'rounded' ? `${element.cornerRadius ?? 14}px`
        : element.shape === 'arch' ? '50% 50% 0 0 / 50% 50% 0 0'
        : 0;
      const isPolaroid = element.shape === 'polaroid';
      const z = element.zoom ?? 1;
      const ox = element.offsetX ?? 0;
      const oy = element.offsetY ?? 0;
      const filterCss = element.filter && element.filter !== 'none' ? FILTER_CSS[element.filter] : undefined;
      return (
        <div style={{
          position: 'absolute', inset: 0,
          padding: isPolaroid ? '14px 14px 56px' : 0,
          background: isPolaroid ? '#FFFFFF' : 'transparent',
          boxShadow: isPolaroid ? '0 6px 18px rgba(14,13,11,0.18)' : 'none',
        }}>
          <div style={{
            position: 'absolute',
            top: isPolaroid ? 14 : 0,
            left: isPolaroid ? 14 : 0,
            right: isPolaroid ? 14 : 0,
            bottom: isPolaroid ? 56 : 0,
            overflow: 'hidden',
            borderRadius: radius as string | number,
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={element.src}
              alt=""
              style={{
                width: `${z * 100}%`,
                height: `${z * 100}%`,
                objectFit: 'cover',
                position: 'absolute',
                left: `calc(50% + ${ox * 100}% - ${z * 50}%)`,
                top: `calc(50% + ${oy * 100}% - ${z * 50}%)`,
                filter: filterCss,
                pointerEvents: 'none',
              }}
              draggable={false}
            />
          </div>
        </div>
      );
    }
    if (isShape(element)) {
      if (element.shape === 'line') {
        return (
          <div style={{
            position: 'absolute', inset: 0,
            background: element.fill ?? '#0E0D0B',
            borderRadius: element.cornerRadius ?? 1,
          }} />
        );
      }
      if (element.shape === 'ellipse') {
        return (
          <div style={{
            position: 'absolute', inset: 0,
            background: element.fill ?? '#0E0D0B',
            borderRadius: '50%',
            border: element.stroke ? `${element.strokeWidth ?? 1.5}px solid ${element.stroke}` : 'none',
          }} />
        );
      }
      // rect
      return (
        <div style={{
          position: 'absolute', inset: 0,
          background: element.fill ?? 'transparent',
          border: element.stroke ? `${element.strokeWidth ?? 1.5}px solid ${element.stroke}` : 'none',
          borderRadius: element.cornerRadius ?? 0,
        }} />
      );
    }
    if (isText(element)) {
      const align: React.CSSProperties = {
        position: 'absolute', inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: element.textAlign === 'center' ? 'center' : element.textAlign === 'right' ? 'flex-end' : 'flex-start',
        fontFamily: element.fontFamily,
        fontSize: `${(element.fontSize / CANVAS_HEIGHT) * 100}cqh`,
        fontWeight: element.fontWeight,
        fontStyle: element.italic ? 'italic' : 'normal',
        letterSpacing: `${element.tracking ?? 0}em`,
        lineHeight: element.lineHeight ?? 1.05,
        color: element.color,
        textAlign: element.textAlign,
        textShadow: element.letterpress ? '0 1px 0 rgba(255,255,255,0.4), inset 0 -1px 0 rgba(0,0,0,0.18)' : undefined,
        whiteSpace: 'pre-wrap',
        overflowWrap: 'break-word',
        padding: '0 4px',
        containerType: 'size',
      };
      return (
        <div style={align}>
          <div
            ref={editableRef}
            contentEditable={editingText}
            suppressContentEditableWarning
            onBlur={(e) => {
              setEditingText(false);
              const next = e.currentTarget.innerText.trim();
              if (next !== element.text) onTextEdit(next);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                editableRef.current?.blur();
              }
            }}
            style={{
              outline: editingText ? '1.5px solid #C6703D' : 'none',
              outlineOffset: 2,
              minWidth: 20,
              cursor: editingText ? 'text' : 'inherit',
            }}
          >
            {element.text || ' '}
          </div>
        </div>
      );
    }
    return null;
  })();

  // Hit area: full element box, except backgrounds which are
  // never directly draggable from the canvas.
  return (
    <div
      style={wrapStyle}
      onPointerDown={element.locked ? undefined : onPointerDown}
      onDoubleClick={(e) => {
        if (!editing || element.locked) return;
        e.stopPropagation();
        if (isText(element)) {
          setEditingText(true);
          setTimeout(() => editableRef.current?.focus(), 0);
        }
      }}
    >
      {inner}
      {selected && editing && !element.locked && (
        <>
          <div style={{
            position: 'absolute', inset: -2,
            border: '1.5px solid #C6703D',
            pointerEvents: 'none',
            transform: element.rotation ? `rotate(${-(element.rotation)}deg)` : undefined,
            transformOrigin: 'center center',
          }} />
          {/* 8 resize handles */}
          {(['nw','n','ne','e','se','s','sw','w'] as ResizeHandle[]).map((h) => (
            <ResizeKnob key={h} handle={h} onPointerDown={(e) => onResizeStart(e, h)} />
          ))}
          {/* Rotation handle */}
          <div
            onPointerDown={onRotateStart}
            style={{
              position: 'absolute',
              left: '50%',
              top: -32,
              transform: 'translateX(-50%)',
              width: 16, height: 16, borderRadius: 999,
              background: '#FFFFFF',
              border: '1.5px solid #C6703D',
              cursor: 'grab',
              boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
            }}
          />
        </>
      )}
    </div>
  );
}

function ResizeKnob({ handle, onPointerDown }: { handle: ResizeHandle; onPointerDown: (e: React.PointerEvent) => void }) {
  const pos: Record<ResizeHandle, React.CSSProperties> = {
    nw: { left: -6, top: -6, cursor: 'nwse-resize' },
    n:  { left: '50%', top: -6, transform: 'translateX(-50%)', cursor: 'ns-resize' },
    ne: { right: -6, top: -6, cursor: 'nesw-resize' },
    e:  { right: -6, top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' },
    se: { right: -6, bottom: -6, cursor: 'nwse-resize' },
    s:  { left: '50%', bottom: -6, transform: 'translateX(-50%)', cursor: 'ns-resize' },
    sw: { left: -6, bottom: -6, cursor: 'nesw-resize' },
    w:  { left: -6, top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' },
  };
  return (
    <div
      onPointerDown={onPointerDown}
      style={{
        position: 'absolute',
        width: 12, height: 12,
        background: '#FFFFFF',
        border: '1.5px solid #C6703D',
        borderRadius: 2,
        ...pos[handle],
      }}
    />
  );
}

const FILTER_CSS: Record<Exclude<import('@/lib/invite-canvas/types').PhotoFilter, 'none'>, string> = {
  sepia:   'sepia(0.62) saturate(0.9)',
  film:    'saturate(0.92) contrast(1.05) brightness(1.02)',
  dreamy:  'blur(0.6px) brightness(1.06) saturate(0.92)',
  mono:    'saturate(0)',
  vintage: 'sepia(0.32) saturate(0.7) hue-rotate(-8deg) contrast(0.96)',
  noir:    'saturate(0) contrast(1.4) brightness(0.92)',
  sunwash: 'brightness(1.12) saturate(0.88) hue-rotate(-6deg)',
};
