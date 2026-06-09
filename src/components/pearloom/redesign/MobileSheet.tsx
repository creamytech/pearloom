'use client';

/* eslint-disable no-restricted-syntax */
/* ─────────────────────────────────────────────────────────────
   MobileSheet + MobileBottomBar — phone chrome for the redesign
   editor. Below 768px the three-column grid collapses to a
   full-width canvas; the rails re-mount inside these.

   Visual language borrowed from EditorThemeShop's bottom drawer
   (grab handle, rounded 22px top, backdrop, slide-up): the sheet
   rises with translateY on var(--pl-ease-emphasis) 360ms, the
   backdrop fades. prefers-reduced-motion is honoured by the
   .pl-redesign * reduced-motion kill-switch in animations.css
   (both components mount inside the .pl-redesign root) — with
   transitions off the sheet appears/disappears instantly.
   ───────────────────────────────────────────────────────────── */

import { useEffect, useState, type ReactNode } from 'react';
import { Icon, Pear } from '../motifs';

const SHEET_MS = 360;

export function MobileSheet({
  open,
  onClose,
  height = '75vh',
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  /** Sheet height — 75vh for rails, 80vh for the section editor. */
  height?: string;
  /** Accessible dialog name. */
  label: string;
  children: ReactNode;
}) {
  /* Keep children mounted while the sheet animates out so the
     exit slide doesn't show an empty shell. */
  const [render, setRender] = useState(open);
  useEffect(() => {
    if (open) { setRender(true); return; }
    const t = setTimeout(() => setRender(false), SHEET_MS + 40);
    return () => clearTimeout(t);
  }, [open]);

  /* Body-scroll lock while open. The editor shell is already
     overflow:hidden, but the lock also stops iOS rubber-banding
     the page behind the backdrop. */
  useEffect(() => {
    if (!open || typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  /* Escape closes. */
  useEffect(() => {
    if (!open || typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 70,
        pointerEvents: open ? 'auto' : 'none',
        visibility: open || render ? 'visible' : 'hidden',
      }}
    >
      {/* Backdrop — fades in sync with the sheet rise. */}
      <div
        onClick={onClose}
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(40,40,30,0.32)',
          opacity: open ? 1 : 0,
          transition: `opacity 280ms var(--pl-ease-emphasis)`,
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height,
          background: 'var(--card)',
          borderRadius: '22px 22px 0 0',
          boxShadow: '0 -20px 60px rgba(40,40,30,0.22)',
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition: `transform ${SHEET_MS}ms var(--pl-ease-emphasis)`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Grab handle + close hit area. */}
        <div style={{ padding: '10px 0 6px', flexShrink: 0 }} onClick={onClose}>
          <div style={{ width: 40, height: 4, borderRadius: 999, background: 'var(--line)', margin: '0 auto' }} />
        </div>
        {/* Single-cell grid so flex-column rails (PropertyRail /
            ThemeRail / DesignAdvisor inline) stretch to the full
            sheet height and keep their internal scroll regions. */}
        <div style={{ flex: 1, minHeight: 0, display: 'grid' }}>
          {(open || render) && children}
        </div>
      </div>
    </div>
  );
}

/* ─── Bottom bar — Sections · Theme · Pear ───────────────────── */

export type MobileSheetId = 'sections' | 'theme' | 'props' | 'pear';

export function MobileBottomBar({
  activeSheet,
  onSections,
  onTheme,
  onPear,
}: {
  activeSheet: MobileSheetId | null;
  onSections: () => void;
  onTheme: () => void;
  onPear: () => void;
}) {
  return (
    <nav
      aria-label="Editor tools"
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
      <BottomBarButton label="Sections" icon="list" on={activeSheet === 'sections' || activeSheet === 'props'} onClick={onSections} />
      <BottomBarButton label="Theme" icon="palette" on={activeSheet === 'theme'} onClick={onTheme} />
      <BottomBarButton label="Pear" icon="pear" on={activeSheet === 'pear'} onClick={onPear} />
    </nav>
  );
}

function BottomBarButton({
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
        fontFamily: 'var(--font-ui)',
      }}
    >
      {icon === 'pear'
        ? <Pear size={20} tone="sage" shadow={false} sparkle={on} />
        : <Icon name={icon} size={17} color={on ? 'var(--ink)' : 'var(--ink-soft)'} />}
      <span style={{ fontSize: 10, fontWeight: on ? 700 : 600, letterSpacing: '0.02em' }}>{label}</span>
    </button>
  );
}
