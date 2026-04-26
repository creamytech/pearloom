'use client';

// ──────────────────────────────────────────────────────────────
// FocalPointPicker — drag-a-dot to set the cover photo's focal
// point. The published hero variant uses this as
// background-position so the most-important part of the photo
// stays visible across phone / tablet / desktop crops.
//
// Wix / Squarespace both have a feature like this; ours is
// minimal but matches their feel — click anywhere in the preview
// to move the dot, or drag it.
// ──────────────────────────────────────────────────────────────

import { useRef, useState, type CSSProperties } from 'react';

interface Props {
  imageUrl: string;
  /** Current focal point as { x, y } percentages (0-100). */
  value?: { x: number; y: number };
  onChange: (next: { x: number; y: number }) => void;
  onReset?: () => void;
}

export function FocalPointPicker({ imageUrl, value, onChange, onReset }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const point = value ?? { x: 50, y: 50 };

  function setFromEvent(clientX: number, clientY: number) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    onChange({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    });
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(true);
    setFromEvent(e.clientX, e.clientY);
    const move = (ev: PointerEvent) => setFromEvent(ev.clientX, ev.clientY);
    const up = () => {
      setDragging(false);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up, { once: true });
  }

  const dotStyle: CSSProperties = {
    position: 'absolute',
    left: `${point.x}%`,
    top: `${point.y}%`,
    width: 22,
    height: 22,
    borderRadius: 999,
    background: 'var(--peach-ink, #C6703D)',
    border: '3px solid #fff',
    boxShadow: '0 0 0 1px rgba(14,13,11,0.2), 0 6px 14px rgba(14,13,11,0.32)',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none',
    transition: dragging ? 'none' : 'left 140ms ease, top 140ms ease',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div
        ref={ref}
        onPointerDown={onPointerDown}
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16/10',
          borderRadius: 10,
          overflow: 'hidden',
          backgroundImage: `url(${imageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          cursor: dragging ? 'grabbing' : 'crosshair',
          touchAction: 'none',
          border: '1px solid var(--line-soft)',
        }}
      >
        {/* Crosshair lines through the focal point — shows the user
            exactly which area of the photo will stay visible. */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `${point.x}%`,
            width: 1,
            background: 'rgba(255, 255, 255, 0.5)',
            pointerEvents: 'none',
          }}
        />
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: `${point.y}%`,
            height: 1,
            background: 'rgba(255, 255, 255, 0.5)',
            pointerEvents: 'none',
          }}
        />
        <div style={dotStyle} />
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 11,
          color: 'var(--ink-muted)',
        }}
      >
        <span>
          Focal: {Math.round(point.x)}%, {Math.round(point.y)}%
        </span>
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            style={{
              padding: '3px 8px',
              fontSize: 10.5,
              borderRadius: 6,
              background: 'transparent',
              border: '1px solid var(--line)',
              color: 'var(--ink-muted)',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Center
          </button>
        )}
      </div>
    </div>
  );
}
