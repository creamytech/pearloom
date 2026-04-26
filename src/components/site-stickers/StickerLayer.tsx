'use client';
import React, { useRef, useCallback } from 'react';
import type { StickerItem } from '@/types';
import * as Illustrations from '@/components/asset-library/SvgIllustrations';
import * as Accents from '@/components/asset-library/SvgAccents';
import * as Dividers from '@/components/asset-library/SvgDividers';

const MODULES = {
  illustrations: Illustrations as unknown as Record<string, React.ComponentType<{ size?: number; color?: string; width?: string | number; height?: number }>>,
  accents: Accents as unknown as Record<string, React.ComponentType<{ size?: number; color?: string }>>,
  dividers: Dividers as unknown as Record<string, React.ComponentType<{ width?: string | number; height?: number; color?: string }>>,
};

interface StickerLayerProps {
  stickers: StickerItem[];
  accentColor?: string;
  editMode?: boolean;
  onMove?: (index: number, x: number, y: number) => void;
  onDelete?: (index: number) => void;
}

export function StickerLayer({ stickers, accentColor, editMode, onMove, onDelete }: StickerLayerProps) {
  if (!stickers?.length) return null;
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDragStart = useCallback((e: React.PointerEvent, stickerIndex: number) => {
    if (!editMode || !onMove || !containerRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();

    const onMove_ = (ev: PointerEvent) => {
      const x = ((ev.clientX - rect.left) / rect.width) * 100;
      const y = ((ev.clientY - rect.top) / rect.height) * 100;
      onMove(stickerIndex, Math.max(0, Math.min(100, x)), Math.max(0, Math.min(100, y)));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove_);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove_);
    window.addEventListener('pointerup', onUp);
  }, [editMode, onMove]);

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', inset: 0, pointerEvents: editMode ? 'auto' : 'none', zIndex: 20, overflow: 'hidden' }}
    >
      {stickers.map((s, i) => {
        if (s.type === 'ai' || s.type === 'text' || !s.type || !s.name) return null;
        // Type narrowing: after the guard above, s.type ∈ {illustrations, accents, dividers}.
        const module = MODULES[s.type as 'illustrations' | 'accents' | 'dividers'];
        const Comp = module?.[s.name] as React.ComponentType<{ size?: number; color?: string; width?: string | number; height?: number }> | undefined;
        if (!Comp) return null;
        return (
          <div
            key={s.id}
            style={{
              position: 'absolute',
              left: `${s.x}%`,
              top: `${s.y}%`,
              transform: `translate(-50%, -50%) rotate(${s.rotation}deg)`,
              opacity: s.opacity,
              pointerEvents: editMode ? 'auto' : 'none',
              cursor: editMode ? 'grab' : 'default',
              userSelect: 'none',
            }}
            onPointerDown={(e) => handleDragStart(e, i)}
          >
            <Comp size={s.size} color={s.color || accentColor || 'currentColor'} width={s.size} height={s.size} />
            {/* Delete button — edit mode only */}
            {editMode && onDelete && (
              <button
                onPointerDown={e => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onDelete(i); }}
                style={{
                  position: 'absolute', top: '-8px', right: '-8px',
                  width: '18px', height: '18px', borderRadius: '50%',
                  background: '#18181B', color: '#fff', border: 'none',
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '10px', fontWeight: 700,
                  lineHeight: 1, boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                  zIndex: 1,
                }}
                title="Remove sticker"
              >
                ×
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
