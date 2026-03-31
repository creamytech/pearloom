'use client';

import type { LucideIcon } from 'lucide-react';

interface IconCircleProps {
  icon: LucideIcon;
  accent: string;
  size?: number;
  iconSize?: number;
}

export function IconCircle({ icon: Icon, accent, size = 40, iconSize = 18 }: IconCircleProps) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `${accent}33`,
        border: `1.5px solid ${accent}40`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Icon size={iconSize} style={{ color: accent }} />
    </div>
  );
}
