'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / brand/groove/PillNav.tsx
//
// Horizontal pill-shaped segmented nav. Active segment glows
// with a groove gradient. Used for marketing section anchors,
// dashboard tab switchers that don't warrant the full sidebar.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';

interface PillNavItem {
  id: string;
  label: string;
}

interface PillNavProps {
  items: PillNavItem[];
  activeId?: string;
  onSelect?: (id: string) => void;
  size?: 'sm' | 'md';
}

export function PillNav({ items, activeId, onSelect, size = 'md' }: PillNavProps) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const padY = size === 'sm' ? 6 : 9;
  const padX = size === 'sm' ? 14 : 20;
  const font = size === 'sm' ? '0.82rem' : '0.92rem';

  return (
    <div
      role="tablist"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: 4,
        background: 'color-mix(in oklab, var(--pl-groove-ink) 8%, transparent)',
        borderRadius: 'var(--pl-groove-radius-pill)',
        border: '1px solid color-mix(in oklab, var(--pl-groove-ink) 12%, transparent)',
      }}
    >
      {items.map((item) => {
        const isActive = activeId === item.id;
        const isHover = hoverId === item.id && !isActive;
        return (
          <button
            key={item.id}
            role="tab"
            aria-selected={isActive}
            onMouseEnter={() => setHoverId(item.id)}
            onMouseLeave={() => setHoverId(null)}
            onClick={() => onSelect?.(item.id)}
            style={{
              padding: `${padY}px ${padX}px`,
              background: isActive
                ? 'var(--pl-groove-blob-sunrise)'
                : isHover
                ? 'color-mix(in oklab, var(--pl-groove-ink) 6%, transparent)'
                : 'transparent',
              border: 'none',
              borderRadius: 'var(--pl-groove-radius-pill)',
              color: isActive ? '#fff' : 'var(--pl-groove-ink)',
              fontFamily: 'var(--pl-font-body)',
              fontSize: font,
              fontWeight: 600,
              letterSpacing: '-0.005em',
              cursor: 'pointer',
              boxShadow: isActive
                ? '0 4px 12px rgba(139,74,106,0.28)'
                : 'none',
              transition:
                'background var(--pl-dur-fast) var(--pl-ease-out),' +
                ' box-shadow var(--pl-dur-fast) var(--pl-ease-out),' +
                ' color var(--pl-dur-fast) var(--pl-ease-out)',
            }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
