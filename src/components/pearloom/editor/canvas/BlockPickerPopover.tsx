'use client';

// ──────────────────────────────────────────────────────────────
// BlockPickerPopover — a compact picker that floats from the
// "+" button on a section's action menu (or the inline add-zone
// between sections).
//
// Lists every block that's currently HIDDEN (not in the active
// blockOrder for the site) — clicking unhides + inserts it at the
// requested position. If every block is already visible, shows an
// empty state.
//
// The picker is anchored to the trigger element via fixed
// positioning + getBoundingClientRect; auto-flips above the trigger
// if there's no room below.
// ──────────────────────────────────────────────────────────────

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface PickerBlock {
  key: string;
  label: string;
  description: string;
  icon?: string;
}

interface Props {
  anchor: HTMLElement | null;
  blocks: PickerBlock[];
  onPick: (key: string) => void;
  onClose: () => void;
}

export function BlockPickerPopover({ anchor, blocks, onPick, onClose }: Props) {
  const [pos, setPos] = useState<{ top: number; left: number; flipped: boolean }>({ top: 0, left: 0, flipped: false });
  const popRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    const popH = 420; // approx — refined after first render
    const flip = r.bottom + popH > window.innerHeight - 16;
    setPos({
      top: flip ? r.top - 8 : r.bottom + 8,
      left: Math.min(r.right - 320, window.innerWidth - 340),
      flipped: flip,
    });
  }, [anchor]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    function onDocClick(e: MouseEvent) {
      if (!popRef.current) return;
      if (popRef.current.contains(e.target as Node)) return;
      if (anchor && anchor.contains(e.target as Node)) return;
      onClose();
    }
    document.addEventListener('keydown', onKey);
    // Defer to next tick so the click that opened the popover
    // doesn't immediately close it.
    const t = setTimeout(() => document.addEventListener('mousedown', onDocClick), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDocClick);
    };
  }, [anchor, onClose]);

  if (!anchor || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={popRef}
      role="dialog"
      aria-label="Add a section"
      style={{
        position: 'fixed',
        top: pos.top,
        left: Math.max(16, pos.left),
        width: 320,
        maxHeight: 'min(60vh, 480px)',
        overflowY: 'auto',
        zIndex: 9000,
        background: 'var(--card, #FBF7EE)',
        border: '1px solid var(--card-ring, rgba(61,74,31,0.16))',
        borderRadius: 14,
        boxShadow: '0 24px 56px rgba(14,13,11,0.18)',
        padding: 12,
        transform: pos.flipped ? 'translateY(-100%)' : 'none',
        animation: 'pl8-popover-in 200ms cubic-bezier(0.22, 1, 0.36, 1) both',
      }}
    >
      <div
        style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'var(--peach-ink)',
          marginBottom: 10,
        }}
      >
        Add a section
      </div>
      {blocks.length === 0 ? (
        <div
          style={{
            padding: '20px 16px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div
            aria-hidden
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              background: 'var(--cream-2)',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--peach-ink, #C6703D)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
            All sections are showing.
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', lineHeight: 1.45 }}>
            Hide one with the eye in the outline, or × on its section chip — then drop it back in here.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {blocks.map((b) => (
            <button
              key={b.key}
              type="button"
              onClick={() => onPick(b.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px',
                border: 'none', background: 'transparent',
                borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                color: 'var(--ink)',
                transition: 'background-color 140ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cream-2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{b.label}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', lineHeight: 1.35, marginTop: 2 }}>
                  {b.description}
                </div>
              </div>
              <span aria-hidden style={{ color: 'var(--ink-muted)', fontSize: 14 }}>+</span>
            </button>
          ))}
        </div>
      )}
      <style jsx>{`
        @keyframes pl8-popover-in {
          from { opacity: 0; transform: ${pos.flipped ? 'translateY(-100%) translateY(8px)' : 'translateY(-8px)'}; }
          to   { opacity: 1; transform: ${pos.flipped ? 'translateY(-100%)' : 'translateY(0)'}; }
        }
      `}</style>
    </div>,
    document.body,
  );
}
