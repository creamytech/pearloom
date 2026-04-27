'use client';

// ─────────────────────────────────────────────────────────────
// IconSwapModal — listens for pearloom:icon-swap events from
// EditableIcon. Opens a modal grid of all motif icons, lets the
// host pick one, writes the choice to manifest.iconOverrides.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import type { StoryManifest } from '@/types';
import { Icon } from '../motifs';

const ICON_CATALOG = [
  // Navigation + arrows
  'arrow-right', 'arrow-left', 'arrow-up', 'arrow-down',
  'chev-right', 'chev-left', 'chev-down', 'chev-up',
  // UI
  'plus', 'minus', 'close', 'check', 'dot', 'more', 'drag',
  'search', 'filter', 'settings', 'sliders', 'eye', 'eye-off',
  'lock', 'undo', 'redo',
  // Content
  'image', 'gallery', 'mic', 'play', 'video', 'mail', 'send',
  'pencil', 'brush', 'type', 'palette', 'globe', 'link', 'upload',
  'download', 'compass', 'pin', 'clock', 'calendar', 'gift',
  'home', 'layout', 'grid', 'layers', 'section',
  // Brand-aware
  'leaf', 'heart-icon', 'sparkles', 'moon',
  'bell', 'users', 'user-plus',
];

interface SwapEvent {
  purpose: string;
  currentName: string;
}

interface Props {
  onEditField: (patch: (m: StoryManifest) => StoryManifest) => void;
}

export function IconSwapModal({ onEditField }: Props) {
  const [pending, setPending] = useState<SwapEvent | null>(null);

  useEffect(() => {
    function onEvt(e: Event) {
      const detail = (e as CustomEvent<SwapEvent>).detail;
      if (!detail) return;
      setPending(detail);
    }
    window.addEventListener('pearloom:icon-swap', onEvt);
    return () => window.removeEventListener('pearloom:icon-swap', onEvt);
  }, []);

  useEffect(() => {
    if (!pending) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setPending(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pending]);

  function pick(name: string) {
    if (!pending) return;
    onEditField((m) => {
      const cur = (m as unknown as { iconOverrides?: Record<string, string> }).iconOverrides ?? {};
      return { ...m, iconOverrides: { ...cur, [pending.purpose]: name } } as StoryManifest;
    });
    setPending(null);
  }

  if (!pending) return null;

  return (
    <div
      role="dialog"
      aria-label="Swap icon"
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(14,13,11,0.55)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 350,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) setPending(null); }}
    >
      <div
        style={{
          width: 'min(560px, 100%)',
          maxHeight: '80vh',
          background: 'var(--paper)',
          borderRadius: 16,
          padding: 20,
          boxShadow: '0 32px 60px rgba(14,13,11,0.4)',
          fontFamily: 'var(--font-ui)',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div className="eyebrow" style={{ color: 'var(--peach-ink)', marginBottom: 6 }}>
              Swap icon
            </div>
            <h2 className="display" style={{ fontSize: 20, margin: 0 }}>
              Pick a glyph
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setPending(null)}
            aria-label="Close"
            style={{
              width: 28, height: 28, borderRadius: 999,
              background: 'transparent',
              border: '1.5px solid var(--line)',
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(56px, 1fr))',
          gap: 6,
        }}>
          {ICON_CATALOG.map((n) => {
            const on = pending.currentName === n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => pick(n)}
                title={n}
                style={{
                  aspectRatio: '1 / 1',
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: 10,
                  background: on ? 'var(--cream-2)' : 'var(--card)',
                  border: on ? '1.5px solid var(--ink)' : '1.5px solid var(--line)',
                  cursor: 'pointer',
                  color: 'var(--ink)',
                  transition: 'background 160ms ease, transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.06)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = ''; }}
              >
                <Icon name={n} size={20} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
