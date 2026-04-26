'use client';

// ──────────────────────────────────────────────────────────────
// CanvasContextMenu — a single global context-menu portal that
// any canvas surface can populate via the
// `pearloom:context-menu-open` custom event.
//
// Listeners (sections, photos, stickers) call:
//
//   window.dispatchEvent(new CustomEvent('pearloom:context-menu-open', {
//     detail: { x, y, items: ContextMenuItem[] }
//   }));
//
// and the menu opens at (x, y). Click outside, Escape, or any item
// click closes it. One menu instance per canvas — mounted at the
// CanvasStage level — so we don't pay for N portals.
// ──────────────────────────────────────────────────────────────

import { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../../motifs';

export interface ContextMenuItem {
  /** Stable id for keys + analytics. */
  id: string;
  label: string;
  /** Icon name from motifs. */
  icon?: string;
  /** Optional keyboard hint shown right-aligned ('⌘C', 'Del'). */
  shortcut?: string;
  onSelect: () => void;
  /** Flagged danger items render in plum and sit at the bottom. */
  danger?: boolean;
  /** Inserts a divider above the item (useful before destructive items). */
  divider?: boolean;
  /** Disabled items render greyed and skip onSelect. */
  disabled?: boolean;
}

interface OpenDetail {
  x: number;
  y: number;
  items: ContextMenuItem[];
  /** Optional title shown above the items. */
  title?: string;
}

export function CanvasContextMenu() {
  const [state, setState] = useState<OpenDetail | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onOpen(e: Event) {
      const detail = (e as CustomEvent<OpenDetail>).detail;
      if (!detail || !Array.isArray(detail.items) || detail.items.length === 0) return;
      setState(detail);
    }
    function onClose() { setState(null); }
    window.addEventListener('pearloom:context-menu-open', onOpen as EventListener);
    window.addEventListener('pearloom:context-menu-close', onClose as EventListener);
    return () => {
      window.removeEventListener('pearloom:context-menu-open', onOpen as EventListener);
      window.removeEventListener('pearloom:context-menu-close', onClose as EventListener);
    };
  }, []);

  // Outside-click + Escape close
  useEffect(() => {
    if (!state) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setState(null);
    }
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (ref.current.contains(e.target as Node)) return;
      setState(null);
    }
    document.addEventListener('keydown', onKey);
    // Defer one tick so the right-click that opened us doesn't close.
    const t = setTimeout(() => document.addEventListener('mousedown', onDoc), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDoc);
    };
  }, [state]);

  // Auto-flip when near a viewport edge.
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  useLayoutEffect(() => {
    if (!state) return;
    const w = ref.current?.offsetWidth ?? 220;
    const h = ref.current?.offsetHeight ?? 280;
    const left = state.x + w + 8 > window.innerWidth ? state.x - w : state.x;
    const top = state.y + h + 8 > window.innerHeight ? state.y - h : state.y;
    setPos({ top: Math.max(8, top), left: Math.max(8, left) });
  }, [state]);

  if (!state || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={ref}
      role="menu"
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        zIndex: 9500,
        minWidth: 220,
        maxWidth: 280,
        background: 'var(--cream, #FBF7EE)',
        border: '1px solid var(--card-ring, rgba(61,74,31,0.16))',
        borderRadius: 12,
        boxShadow: '0 24px 56px rgba(14,13,11,0.22), 0 0 0 6px rgba(0,0,0,0.04)',
        padding: 4,
        fontFamily: 'var(--font-ui)',
        animation: 'pl8-context-in 160ms cubic-bezier(0.22, 1, 0.36, 1) both',
      }}
    >
      {state.title && (
        <div
          style={{
            padding: '7px 10px 5px',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--ink-muted)',
          }}
        >
          {state.title}
        </div>
      )}
      {state.items.map((item, i) => {
        const showDivider = item.divider && i > 0;
        return (
          <div key={item.id}>
            {showDivider && (
              <div
                aria-hidden
                style={{
                  height: 1,
                  background: 'var(--line-soft)',
                  margin: '4px 6px',
                }}
              />
            )}
            <button
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                if (item.disabled) return;
                item.onSelect();
                setState(null);
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '7px 10px',
                background: 'transparent',
                border: 'none',
                borderRadius: 8,
                cursor: item.disabled ? 'not-allowed' : 'pointer',
                textAlign: 'left',
                fontSize: 13,
                fontFamily: 'inherit',
                color: item.danger ? '#7A2D2D' : 'var(--ink)',
                opacity: item.disabled ? 0.4 : 1,
                transition: 'background-color 140ms ease',
              }}
              onMouseEnter={(e) => {
                if (item.disabled) return;
                e.currentTarget.style.background = item.danger
                  ? 'rgba(122, 45, 45, 0.08)'
                  : 'var(--cream-2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              {item.icon && (
                <span aria-hidden style={{ display: 'inline-grid', placeItems: 'center', width: 14, height: 14, color: 'inherit' }}>
                  <Icon name={item.icon} size={13} />
                </span>
              )}
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.shortcut && (
                <span
                  style={{
                    fontSize: 10.5,
                    color: 'var(--ink-muted)',
                    letterSpacing: '0.04em',
                  }}
                >
                  {item.shortcut}
                </span>
              )}
            </button>
          </div>
        );
      })}
      <style jsx>{`
        @keyframes pl8-context-in {
          from { opacity: 0; transform: scale(0.96) translateY(-2px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>,
    document.body,
  );
}
