'use client';
import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, RotateCw } from 'lucide-react';
import type { StickerItem } from '@/types';
import * as Illustrations from '@/components/asset-library/SvgIllustrations';
import * as Accents from '@/components/asset-library/SvgAccents';
import * as Dividers from '@/components/asset-library/SvgDividers';

const MODULES = {
  illustrations: Illustrations as unknown as Record<string, React.ComponentType<{ size?: number; color?: string; width?: string | number; height?: number }>>,
  accents: Accents as unknown as Record<string, React.ComponentType<{ size?: number; color?: string }>>,
  dividers: Dividers as unknown as Record<string, React.ComponentType<{ width?: string | number; height?: number; color?: string }>>,
};

interface StickerOverlayProps {
  stickers: StickerItem[];
  onChange: (stickers: StickerItem[]) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function StickerOverlay({ stickers, onChange, containerRef }: StickerOverlayProps) {
  const updateSticker = useCallback((id: string, updates: Partial<StickerItem>) => {
    onChange(stickers.map(s => s.id === id ? { ...s, ...updates } : s));
  }, [stickers, onChange]);

  const removeSticker = useCallback((id: string) => {
    onChange(stickers.filter(s => s.id !== id));
  }, [stickers, onChange]);

  return (
    <div
      style={{
        position: 'absolute', inset: 0, zIndex: 40,
        pointerEvents: 'none',
      }}
    >
      {stickers.map(s => {
        const module = MODULES[s.type];
        const Comp = module?.[s.name] as React.ComponentType<{ size?: number; color?: string; width?: string | number; height?: number }> | undefined;
        if (!Comp) return null;

        return (
          <motion.div
            key={s.id}
            drag
            dragMomentum={false}
            dragConstraints={containerRef}
            onDragEnd={(_e, info) => {
              const container = containerRef.current;
              if (!container) return;
              const rect = container.getBoundingClientRect();
              // Calculate new position in % relative to container
              const currentX = (s.x / 100) * rect.width;
              const currentY = (s.y / 100) * rect.height;
              const newX = Math.max(0, Math.min(100, ((currentX + info.offset.x) / rect.width) * 100));
              const newY = Math.max(0, Math.min(100, ((currentY + info.offset.y) / rect.height) * 100));
              updateSticker(s.id, { x: newX, y: newY });
            }}
            style={{
              position: 'absolute',
              left: `${s.x}%`,
              top: `${s.y}%`,
              transform: `translate(-50%, -50%) rotate(${s.rotation}deg)`,
              opacity: s.opacity,
              pointerEvents: 'auto',
              cursor: 'grab',
              userSelect: 'none',
            }}
            whileDrag={{ cursor: 'grabbing', scale: 1.1, zIndex: 50 }}
          >
            <div style={{ position: 'relative' }}>
              <Comp size={s.size} color={s.color || '#71717A'} width={s.size} height={s.size} />
              {/* Controls */}
              <button
                onClick={(e) => { e.stopPropagation(); removeSticker(s.id); }}
                style={{
                  position: 'absolute', top: -8, right: -8,
                  width: 18, height: 18, borderRadius: '50%',
                  background: 'rgba(220,80,80,0.9)', border: 'none',
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: '#fff', zIndex: 10,
                  pointerEvents: 'auto',
                }}
              >
                <X size={10} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); updateSticker(s.id, { rotation: (s.rotation + 15) % 360 }); }}
                style={{
                  position: 'absolute', bottom: -8, right: -8,
                  width: 18, height: 18, borderRadius: '50%',
                  background: '#18181B', border: 'none',
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: '#fff', zIndex: 10,
                  pointerEvents: 'auto',
                }}
              >
                <RotateCw size={10} />
              </button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
