'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/seating/GuestChip.tsx
// Small draggable chip representing a guest for the seating chart
// ─────────────────────────────────────────────────────────────

import type { Guest } from '@/types';

export interface GuestChipProps {
  guest: Guest;
  isAssigned?: boolean;
  isDragging?: boolean;
  mealIcon?: boolean;
  compact?: boolean; // for inside seat circles
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, guestId: string) => void;
}

/** Derive a stable color from a name string */
function colorFromName(name: string): string {
  const COLORS = [
    '#A3B18A', // olive
    '#8FA876', // dark olive
    '#D6C6A8', // gold
    '#6D597A', // plum
    '#C8A47A', // terracotta
    '#7A9BB3', // blue-grey
    '#B38A8A', // muted rose
    '#8AB38A', // sage
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function mealEmoji(pref?: string): string | null {
  if (!pref) return null;
  const p = pref.toLowerCase();
  if (p.includes('chicken') || p.includes('meat') || p.includes('beef')) return '🍗';
  if (p.includes('fish') || p.includes('seafood')) return '🐟';
  if (p.includes('vegan') || p.includes('plant') || p.includes('vegetarian')) return '🥗';
  return null;
}

export function GuestChip({
  guest,
  isAssigned = false,
  isDragging = false,
  mealIcon = true,
  compact = false,
  onClick,
  draggable = true,
  onDragStart,
}: GuestChipProps) {
  const bg = colorFromName(guest.name);
  const emoji = mealIcon ? mealEmoji(guest.mealPreference) : null;
  const isPlusOne = guest.plusOne;

  if (compact) {
    // Tiny circle avatar for inside seat slots
    return (
      <div
        title={guest.name}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.5rem',
          fontWeight: 700,
          color: '#fff',
          cursor: 'default',
          position: 'relative',
          userSelect: 'none',
        }}
      >
        {initials(guest.name)}
        {emoji && (
          <span
            style={{
              position: 'absolute',
              bottom: '-2px',
              right: '-2px',
              fontSize: '0.45rem',
              lineHeight: 1,
              background: 'var(--pl-ink)',
              borderRadius: '50%',
              padding: '1px',
            }}
          >
            {emoji}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart ? (e) => onDragStart(e, guest.id) : undefined}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.35rem 0.6rem 0.35rem 0.4rem',
        borderRadius: '2rem',
        background: isDragging ? 'rgba(255,255,255,0.98)' : 'var(--pl-ink)',
        border: isAssigned ? '1.5px solid var(--pl-olive)' : '1.5px solid var(--pl-divider)',
        cursor: draggable ? (isDragging ? 'grabbing' : 'grab') : 'default',
        opacity: isDragging ? 0.7 : 1,
        transform: isDragging ? 'scale(1.04)' : 'scale(1)',
        boxShadow: isDragging
          ? '0 8px 24px rgba(43,43,43,0.15)'
          : '0 1px 4px rgba(43,43,43,0.06)',
        transition: 'box-shadow 0.15s, transform 0.15s, opacity 0.15s',
        userSelect: 'none',
        maxWidth: '100%',
        flexShrink: 0,
      }}
    >
      {/* Avatar circle */}
      <div
        style={{
          width: isPlusOne ? '1.5rem' : '1.75rem',
          height: isPlusOne ? '1.5rem' : '1.75rem',
          borderRadius: '50%',
          background: bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: isPlusOne ? '0.55rem' : '0.6rem',
          fontWeight: 700,
          color: '#fff',
          flexShrink: 0,
          position: 'relative',
        }}
      >
        {initials(guest.name)}
        {emoji && (
          <span
            style={{
              position: 'absolute',
              bottom: '-3px',
              right: '-3px',
              fontSize: '0.55rem',
              lineHeight: 1,
              background: 'var(--pl-ink)',
              borderRadius: '50%',
              padding: '1px',
            }}
          >
            {emoji}
          </span>
        )}
      </div>

      {/* Name */}
      <span
        style={{
          fontSize: isPlusOne ? '0.72rem' : '0.78rem',
          color: isAssigned ? 'var(--pl-ink)' : 'var(--pl-muted)',
          fontFamily: 'var(--pl-font-body)',
          fontWeight: isAssigned ? 500 : 400,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '9rem',
        }}
      >
        {guest.name}
      </span>

      {/* Status indicator */}
      {isAssigned && (
        <span
          style={{
            width: '0.4rem',
            height: '0.4rem',
            borderRadius: '50%',
            background: 'var(--pl-olive)',
            flexShrink: 0,
          }}
        />
      )}
    </div>
  );
}
