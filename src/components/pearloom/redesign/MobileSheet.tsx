'use client';


/* ─────────────────────────────────────────────────────────────
   MobileSheet + MobileBottomBar — phone chrome for the redesign
   editor. Below 768px the three-column grid collapses to a
   full-width canvas; the rails re-mount inside these.

   Two modes:

   MODAL (sections) — backdrop, body lock, full height.

   SEE-THROUGH (props / theme) — the host's complaint, 2026-06-12:
   "you can't see your changes till you put the drawer away." The
   sheet is HALF height with NO backdrop and no body lock: the
   live canvas stays visible above it, still scrollable, and
   repaints as every control changes. A "See my site" peek toggle
   drops the sheet to a slim bar for a full-canvas look without
   losing the panel's state.

   Visual language borrowed from EditorThemeShop's bottom drawer
   (grab handle, rounded 22px top, slide-up). prefers-reduced-
   motion is honoured by the .pl-redesign * reduced-motion
   kill-switch in animations.css.
   ───────────────────────────────────────────────────────────── */

import { useEffect, useState, type ReactNode } from 'react';
import { Icon } from '../motifs';

const SHEET_MS = 360;
const PEEK_BAR = 54;

export function MobileSheet({
  open,
  onClose,
  height = '75vh',
  label,
  children,
  seeThrough = false,
}: {
  open: boolean;
  onClose: () => void;
  /** Sheet height — see-through panels ride lower (~48vh) so the
   *  canvas above stays readable. */
  height?: string;
  /** Accessible dialog name. */
  label: string;
  children: ReactNode;
  /** Non-modal: no backdrop, no body lock, canvas interactive,
   *  peek toggle. For panels whose edits should be SEEN live. */
  seeThrough?: boolean;
}) {
  /* Keep children mounted while the sheet animates out so the
     exit slide doesn't show an empty shell. Mount synchronously
     during render (the "derive from previous render" pattern);
     unmount on a timer once the slide finishes. */
  const [render, setRender] = useState(open);
  if (open && !render) setRender(true);
  useEffect(() => {
    if (open) return;
    const t = setTimeout(() => setRender(false), SHEET_MS + 40);
    return () => clearTimeout(t);
  }, [open]);

  /* Peek — sheet drops to a slim bar so the whole canvas shows.
     Resets every time the sheet opens (render-time adjustment). */
  const [peek, setPeek] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setPeek(false);
  }

  /* Body-scroll lock while open — MODAL mode only. See-through
     deliberately leaves the page alive so the host can scroll
     their site while the panel is up. */
  useEffect(() => {
    if (!open || seeThrough || typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open, seeThrough]);

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
        /* See-through: the wrapper never eats taps — the canvas
           above the sheet stays fully interactive. */
        pointerEvents: seeThrough ? 'none' : (open ? 'auto' : 'none'),
        visibility: open || render ? 'visible' : 'hidden',
      }}
    >
      {/* Backdrop — modal mode only. */}
      {!seeThrough && (
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
      )}
      <div
        role="dialog"
        aria-modal={!seeThrough}
        aria-label={label}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height,
          pointerEvents: 'auto',
          background: 'var(--pl-glass)',
        backgroundImage: 'var(--pl-glass-sheen)',
          backdropFilter: 'var(--pl-glass-blur, blur(18px) saturate(1.4))',
          WebkitBackdropFilter: 'var(--pl-glass-blur, blur(18px) saturate(1.4))',
          borderTop: '1px solid var(--pl-glass-border)',
          borderRadius: '22px 22px 0 0',
          boxShadow: '0 -20px 60px rgba(40,40,30,0.22)',
          transform: open
            ? (peek ? `translateY(calc(100% - ${PEEK_BAR}px - env(safe-area-inset-bottom, 0px)))` : 'translateY(0)')
            : 'translateY(100%)',
          transition: `transform ${SHEET_MS}ms var(--pl-ease-emphasis)`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {seeThrough ? (
          /* See-through header — peek toggle + label + Done. The
             whole bar is the peek toggle while peeked, so getting
             back to the controls is one tap anywhere. */
          <div
            onClick={peek ? () => setPeek(false) : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 12px 6px',
              flexShrink: 0,
              cursor: peek ? 'pointer' : 'default',
            }}
          >
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setPeek((p) => !p); }}
              aria-pressed={peek}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 999,
                border: '1px solid var(--line)',
                background: 'var(--cream-2)',
                color: 'var(--ink-soft)',
                fontSize: 11.5,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
                flexShrink: 0,
              }}
            >
              <Icon name={peek ? 'arrow-up' : 'eye'} size={12} color="var(--ink-soft)" />
              {peek ? 'Back to editing' : 'See my site'}
            </button>
            <span
              style={{
                flex: 1,
                minWidth: 0,
                textAlign: 'center',
                fontFamily: 'var(--font-mono, ui-monospace, monospace)',
                fontSize: 9.5,
                fontWeight: 700,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--ink-muted)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              style={{
                padding: '6px 14px',
                borderRadius: 999,
                border: 'none',
                background: 'var(--ink)',
                color: 'var(--cream)',
                fontSize: 11.5,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
                flexShrink: 0,
              }}
            >
              Done
            </button>
          </div>
        ) : (
          /* Modal grab handle + close hit area (unchanged). */
          <div style={{ padding: '10px 0 6px', flexShrink: 0 }} onClick={onClose}>
            <div style={{ width: 40, height: 4, borderRadius: 999, background: 'var(--line)', margin: '0 auto' }} />
          </div>
        )}
        {/* Single-cell grid so flex-column rails (PropertyRail /
            ThemeRail) stretch to the full sheet height and keep
            their internal scroll regions. */}
        <div style={{ flex: 1, minHeight: 0, display: 'grid' }}>
          {(open || render) && children}
        </div>
      </div>
    </div>
  );
}

/* ─── Bottom bar — Sections · Theme ──────────────────────────── */

export type MobileSheetId = 'sections' | 'theme' | 'props';

export function MobileBottomBar({
  activeSheet,
  onSections,
  onTheme,
}: {
  activeSheet: MobileSheetId | null;
  onSections: () => void;
  onTheme: () => void;
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
      <Icon name={icon} size={17} color={on ? 'var(--ink)' : 'var(--ink-soft)'} />
      <span style={{ fontSize: 10, fontWeight: on ? 700 : 600, letterSpacing: '0.02em' }}>{label}</span>
    </button>
  );
}
