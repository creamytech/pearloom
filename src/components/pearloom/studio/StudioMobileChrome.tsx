'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / studio/StudioMobileChrome.tsx
//
// Phone chrome for the Studio (stationery editor). Below 768px
// the fixed three-rail grid collapses to topbar + card canvas;
// the rails re-mount inside MobileSheet bottom drawers driven
// by this fixed bottom bar — the same pattern the redesign
// editor ships (see redesign/MobileSheet.tsx + EditorRedesign).
//
//   Drafts → DraftsRail (Pear's drafts + asset palette)
//   Design → RemixRail opened on its Design tab
//   Words  → RemixRail opened on its Copy tab
//
// The editor's MobileBottomBar hardcodes Sections · Theme · Pear,
// so the bar here is Studio's own — visually identical (fixed
// bottom nav, 56px + safe-area-inset-bottom, icon-over-label
// buttons), with Studio's three tools.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { Icon } from '../motifs';

export type StudioSheetId = 'drafts' | 'design' | 'words';

/** Live viewport size for fit-to-width card scaling. Only
 *  listens while `active` (the mobile branch); returns {0,0}
 *  on the server / desktop so callers fall back to scale 1. */
export function useViewportSize(active: boolean): { w: number; h: number } {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    if (!active || typeof window === 'undefined') return;
    const update = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [active]);
  return active ? size : { w: 0, h: 0 };
}

export function StudioMobileBar({
  activeSheet,
  onDrafts,
  onDesign,
  onWords,
}: {
  activeSheet: StudioSheetId | null;
  onDrafts: () => void;
  onDesign: () => void;
  onWords: () => void;
}) {
  return (
    <nav
      aria-label="Studio tools"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 60,
        height: 'calc(56px + env(safe-area-inset-bottom))',
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: 'var(--cream)',
        borderTop: '1px solid var(--line-soft)',
        display: 'flex',
        alignItems: 'stretch',
      }}
    >
      <BarButton label="Drafts" icon="layers" on={activeSheet === 'drafts'} onClick={onDrafts} />
      <BarButton label="Design" icon="palette" on={activeSheet === 'design'} onClick={onDesign} />
      <BarButton label="Words" icon="text" on={activeSheet === 'words'} onClick={onWords} />
    </nav>
  );
}

function BarButton({
  label, icon, on, onClick,
}: {
  label: string;
  icon: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        color: on ? 'var(--ink)' : 'var(--ink-soft)',
        fontFamily: 'inherit',
      }}
    >
      <Icon name={icon} size={17} color={on ? 'var(--ink)' : 'var(--ink-soft)'} />
      <span style={{ fontSize: 10, fontWeight: on ? 700 : 600, letterSpacing: '0.02em' }}>{label}</span>
    </button>
  );
}

/** Fit-to-width card wrapper for modal/preview contexts where the
 *  420×588 (or 540×380) artwork must read whole on a phone. The
 *  outer box reserves the SCALED footprint so flex/grid layouts
 *  around it stay honest; the inner div renders the card at full
 *  size and transforms down. scale ≥ 1 renders children bare so
 *  desktop output stays byte-identical. */
export function ScaledCardBox({
  baseW, baseH, scale, radius = 0, children,
}: {
  baseW: number;
  baseH: number;
  scale: number;
  radius?: number;
  children: React.ReactNode;
}) {
  if (scale >= 1) return <>{children}</>;
  return (
    <div style={{ width: baseW * scale, height: baseH * scale, overflow: 'hidden', borderRadius: radius, flexShrink: 0 }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: baseW, height: baseH }}>
        {children}
      </div>
    </div>
  );
}
