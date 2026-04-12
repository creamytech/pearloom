'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/editor/PhotoReposition.tsx
// Drag-to-reposition a photo within its frame
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useCallback, useEffect } from 'react';
import { Move, X } from 'lucide-react';

export interface PhotoRepositionProps {
  src: string;
  alt?: string;
  onPositionChange: (x: number, y: number) => void; // 0–100 percentage values
  initialX?: number; // default 50
  initialY?: number; // default 50
  width?: string;    // CSS width, default '100%'
  height?: string;   // CSS height, default '200px'
}

export function PhotoReposition({
  src,
  alt = '',
  onPositionChange,
  initialX = 50,
  initialY = 50,
  width = '100%',
  height = '200px',
}: PhotoRepositionProps) {
  const [repositionMode, setRepositionMode] = useState(false);
  const [posX, setPosX] = useState(initialX);
  const [posY, setPosY] = useState(initialY);
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; posX: number; posY: number } | null>(null);

  // Clamp helper
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!repositionMode) return;
    e.preventDefault();
    dragStartRef.current = { mouseX: e.clientX, mouseY: e.clientY, posX, posY };
    setIsDragging(true);
  }, [repositionMode, posX, posY]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;

      // Convert pixel delta to percentage offset relative to container size
      const dxPct = (dx / rect.width) * 100;
      const dyPct = (dy / rect.height) * 100;

      // Moving the anchor in the *opposite* direction of drag feels natural
      const newX = clamp(dragStartRef.current.posX - dxPct, 0, 100);
      const newY = clamp(dragStartRef.current.posY - dyPct, 0, 100);

      setPosX(newX);
      setPosY(newY);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
      // Commit the new position
      onPositionChange(posX, posY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  // posX/posY in handleMouseUp needs to be fresh — use a ref trick:
  // We actually call onPositionChange via useEffect below when drag ends
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging]);

  // Emit after each drag ends
  useEffect(() => {
    if (!isDragging && dragStartRef.current === null) {
      // Only emit when drag has actually moved (avoid call on mount)
      // We check against initialX/initialY
      if (posX !== initialX || posY !== initialY) {
        onPositionChange(posX, posY);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging]);

  const handleDoubleClick = () => {
    if (repositionMode) setRepositionMode(false);
  };

  const enterReposition = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRepositionMode(true);
  };

  const exitReposition = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRepositionMode(false);
    onPositionChange(posX, posY);
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      style={{
        position: 'relative',
        width,
        height,
        overflow: 'hidden',
        borderRadius: '8px',
        cursor: repositionMode ? (isDragging ? 'grabbing' : 'crosshair') : 'default',
        userSelect: 'none',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        draggable={false}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: `${posX}% ${posY}%`,
          display: 'block',
          transition: isDragging ? 'none' : 'object-position 0.2s ease',
          pointerEvents: 'none',
        }}
      />

      {/* Reposition overlay */}
      {repositionMode && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.28)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: '6px',
        }}>
          {/* Crosshair */}
          <div style={{
            width: '32px', height: '32px',
            border: '2px solid #18181B',
            borderRadius: '50%',
            position: 'relative',
            boxShadow: '0 0 10px rgba(0,0,0,0.06)',
          }}>
            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: '#18181B', transform: 'translateY(-50%)' }} />
            <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1px', background: '#18181B', transform: 'translateX(-50%)' }} />
          </div>
          <span style={{
            fontSize: '0.65rem', fontWeight: 700, color: '#fff',
            letterSpacing: '0.05em', textShadow: '0 1px 4px rgba(0,0,0,0.08)',
          }}>
            Drag to reposition
          </span>
          <span style={{ fontSize: '0.6rem', color: '#3F3F46', textShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            {Math.round(posX)}% · {Math.round(posY)}%
          </span>

          {/* Exit button (top-right) */}
          <button
            onClick={exitReposition}
            style={{
              position: 'absolute', top: '6px', right: '6px',
              width: '22px', height: '22px', borderRadius: '50%',
              background: 'rgba(0,0,0,0.65)', border: '1px solid #71717A',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff',
            }}
          >
            <X size={10} />
          </button>
        </div>
      )}

      {/* Reposition toggle button (shown when NOT in reposition mode) */}
      {!repositionMode && (
        <button
          onClick={enterReposition}
          title="Reposition photo"
          style={{
            position: 'absolute', bottom: '6px', right: '6px',
            display: 'flex', alignItems: 'center', gap: '4px',
            padding: '4px 8px', borderRadius: '6px',
            background: 'rgba(0,0,0,0.08)', border: '1px solid #71717A',
            color: '#fff', cursor: 'pointer', fontSize: '0.6rem', fontWeight: 700,
            backdropFilter: 'blur(6px)',
            transition: 'background 0.15s',
          }}
          onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.8)'; }}
          onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.08)'; }}
        >
          <Move size={9} /> Reposition
        </button>
      )}
    </div>
  );
}
