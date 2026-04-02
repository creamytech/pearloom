'use client';
import React from 'react';
import type { StickerItem } from '@/types';
import * as Illustrations from '@/components/asset-library/SvgIllustrations';
import * as Accents from '@/components/asset-library/SvgAccents';
import * as Dividers from '@/components/asset-library/SvgDividers';

const MODULES = {
  illustrations: Illustrations as unknown as Record<string, React.ComponentType<{ size?: number; color?: string; width?: string | number; height?: number }>>,
  accents: Accents as unknown as Record<string, React.ComponentType<{ size?: number; color?: string }>>,
  dividers: Dividers as unknown as Record<string, React.ComponentType<{ width?: string | number; height?: number; color?: string }>>,
};

export function StickerLayer({ stickers, accentColor }: { stickers: StickerItem[]; accentColor?: string }) {
  if (!stickers?.length) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20, overflow: 'hidden' }}>
      {stickers.map(s => {
        const module = MODULES[s.type];
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
              pointerEvents: 'none',
            }}
          >
            <Comp size={s.size} color={s.color || accentColor || 'currentColor'} width={s.size} height={s.size} />
          </div>
        );
      })}
    </div>
  );
}
