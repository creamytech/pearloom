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
   losing the panel's state. The header doubles as a drag handle —
   drag between expanded and peek, release snaps to the nearer
   state, a fast downward fling from peek closes (the button is
   the discoverable path; the drag is the power path).

   Visual language borrowed from EditorThemeShop's bottom drawer
   (grab handle, rounded 22px top, slide-up). prefers-reduced-
   motion is honoured by the .pl-redesign * reduced-motion
   kill-switch in animations.css.
   ───────────────────────────────────────────────────────────── */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from '../motifs';
import type { SaveState } from './bridge';

const SHEET_MS = 360;
const PEEK_BAR = 54;
/* Finger travel before a header touch becomes a drag (px) — under
   this it stays a tap so the header's buttons keep working. */
const DRAG_SLOP = 6;
/* Release velocity (px/ms) past which the fling direction wins over
   the nearest-state snap; from peek, a downward fling closes. */
const FLICK = 0.55;

export function MobileSheet({
  open,
  onClose,
  height = '75vh',
  label,
  children,
  seeThrough = false,
  onPrev,
  onNext,
  prevDisabled = false,
  nextDisabled = false,
}: {
  open: boolean;
  onClose: () => void;
  /** Sheet height — see-through panels ride lower (~48vh) so the
   *  canvas above stays readable. */
  height?: string;
  /** Accessible dialog name — doubles as the header title (the
   *  props sheet passes the ACTIVE SECTION's display label, so
   *  the peek bar names what's being edited). */
  label: string;
  children: ReactNode;
  /** Non-modal: no backdrop, no body lock, canvas interactive,
   *  peek toggle. For panels whose edits should be SEEN live. */
  seeThrough?: boolean;
  /** Section stepper (see-through header) — chevrons flanking the
   *  title so the host can walk sections without reopening the
   *  Sections sheet. Omit both to keep the plain title. */
  onPrev?: () => void;
  onNext?: () => void;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
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

  /* ── Drag-to-resize (see-through only) ───────────────────────
     The peek button stays the discoverable path; the header is
     also a drag handle. During the drag the transform follows the
     finger imperatively (no re-render, no transition); on release
     we re-enable the transition, write the snap target, and hand
     the same value back to React via setPeek so its next diff is
     a no-op. Refs, not state — pointer handlers are events, and
     a per-move re-render would repaint the whole rail. Reduced
     motion: animations.css kills transitions under .pl-redesign
     with !important, so snaps land instantly there. */
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startY: number;
    startOffset: number;
    peekOffset: number;
    dragging: boolean;
    fromPeek: boolean;
    lastY: number;
    lastT: number;
    velocity: number;
  } | null>(null);
  /* True from the moment a header touch crosses the slop until the
     next pointerdown — lets button onClicks ignore drag-tail clicks. */
  const dragMovedRef = useRef(false);

  const peekTransform = `translateY(calc(100% - ${PEEK_BAR}px - env(safe-area-inset-bottom, 0px)))`;
  const sheetTransition = `transform ${SHEET_MS}ms var(--pl-ease-emphasis)`;

  const onHeaderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!seeThrough || !open) return;
    const el = sheetRef.current;
    if (!el) return;
    dragMovedRef.current = false;
    /* offsetHeight is the untransformed layout height; its bottom
       padding is the resolved env(safe-area-inset-bottom). */
    const padBottom = parseFloat(getComputedStyle(el).paddingBottom) || 0;
    const peekOffset = Math.max(el.offsetHeight - PEEK_BAR - padBottom, 0);
    dragRef.current = {
      pointerId: e.pointerId,
      startY: e.clientY,
      startOffset: peek ? peekOffset : 0,
      peekOffset,
      dragging: false,
      fromPeek: peek,
      lastY: e.clientY,
      lastT: e.timeStamp,
      velocity: 0,
    };
  };
  const onHeaderPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    const el = sheetRef.current;
    if (!d || !el || e.pointerId !== d.pointerId) return;
    const dy = e.clientY - d.startY;
    if (!d.dragging) {
      if (Math.abs(dy) < DRAG_SLOP) return;
      d.dragging = true;
      dragMovedRef.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      el.style.transition = 'none';
    }
    const dt = e.timeStamp - d.lastT;
    if (dt > 0) d.velocity = (e.clientY - d.lastY) / dt;
    d.lastY = e.clientY;
    d.lastT = e.timeStamp;
    const offset = Math.min(Math.max(d.startOffset + dy, 0), d.peekOffset);
    el.style.transform = `translateY(${offset}px)`;
  };
  const onHeaderPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    dragRef.current = null;
    const el = sheetRef.current;
    if (!el || !d.dragging) return;
    el.style.transition = sheetTransition;
    /* A fast downward fling from the peek bar dismisses the sheet —
       leave the transform where the finger dropped it; React writes
       translateY(100%) on the close render and it slides out from
       there. */
    if (d.fromPeek && d.velocity > FLICK) {
      onClose();
      return;
    }
    const offset = Math.min(Math.max(d.startOffset + (e.clientY - d.startY), 0), d.peekOffset);
    let nextPeek = offset > d.peekOffset / 2;
    if (d.velocity > FLICK) nextPeek = true;
    else if (d.velocity < -FLICK) nextPeek = false;
    /* Write the exact strings React renders for this state — the
       DOM lands on target whether or not setPeek changes anything. */
    el.style.transform = nextPeek ? peekTransform : 'translateY(0)';
    setPeek(nextPeek);
  };

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

  /* ── Keyboard-aware sheet (see-through only) ─────────────────
     On phones the software keyboard shrinks the VISUAL viewport
     while the layout viewport (and this fixed wrapper) stays put —
     a bottom-anchored sheet ends up half-buried under the
     keyboard, hiding the focused control. Track visualViewport
     and lift the sheet by the keyboard inset, clamping its height
     to what remains visible. Imperative style writes via the ref
     (no per-resize re-render) — same pattern the drag handler
     uses; React never diffs these properties back because the
     rendered values (bottom: 0, no maxHeight) don't change.
     Guards: SSR + browsers without visualViewport no-op. */
  useEffect(() => {
    if (!open || !seeThrough || typeof window === 'undefined') return;
    const vv = window.visualViewport;
    /* The sheet node lives for this whole effect (open stays true) —
       capture it once so the cleanup resets the SAME element. */
    const el = sheetRef.current;
    if (!vv || !el) return;
    const apply = () => {
      const inset = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
      /* Treat sub-keyboard jitter (URL-bar collapse etc.) as zero
         so the sheet doesn't hover a few px off the bottom edge. */
      if (inset > 40) {
        el.style.bottom = `${inset}px`;
        el.style.maxHeight = `${Math.max(Math.round(vv.height) - 12, 160)}px`;
      } else {
        el.style.bottom = '';
        el.style.maxHeight = '';
      }
    };
    apply();
    vv.addEventListener('resize', apply);
    vv.addEventListener('scroll', apply);
    return () => {
      vv.removeEventListener('resize', apply);
      vv.removeEventListener('scroll', apply);
      el.style.bottom = '';
      el.style.maxHeight = '';
    };
  }, [open, seeThrough]);

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
        ref={sheetRef}
        role="dialog"
        aria-modal={!seeThrough}
        aria-label={label}
        /* Scope hook for the mobile input-zoom CSS in pearloom.css —
           form controls + contenteditables inside the sheet get a
           16px floor so iOS Safari never zooms on focus. */
        data-pl-mobile-sheet=""
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
            ? (peek ? peekTransform : 'translateY(0)')
            : 'translateY(100%)',
          transition: sheetTransition,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {seeThrough ? (
          /* See-through header — peek toggle + label + Done, and the
             DRAG HANDLE: drag between expanded and the peek bar;
             release snaps to the nearer state; a fast downward
             fling from peek closes. The whole bar is the peek
             toggle while peeked, so getting back to the controls
             is one tap anywhere. Pointer handlers live HERE only —
             the panel body below scrolls. */
          <div
            onClick={peek ? () => { if (!dragMovedRef.current) setPeek(false); } : undefined}
            onPointerDown={onHeaderPointerDown}
            onPointerMove={onHeaderPointerMove}
            onPointerUp={onHeaderPointerEnd}
            onPointerCancel={onHeaderPointerEnd}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 12px 6px',
              flexShrink: 0,
              cursor: peek ? 'pointer' : 'grab',
              /* The header is a vertical drag surface — without
                 this, mobile browsers claim the gesture for page
                 scroll before pointermove ever fires. */
              touchAction: 'none',
            }}
          >
            {/* Grab notch — the drag affordance. */}
            <div
              aria-hidden
              style={{
                position: 'absolute',
                top: 4,
                left: '50%',
                width: 36,
                height: 4,
                marginLeft: -18,
                borderRadius: 999,
                background: 'var(--line)',
              }}
            />
            <button
              type="button"
              className="pl-hit44"
              onClick={(e) => {
                e.stopPropagation();
                if (dragMovedRef.current) return;
                setPeek((p) => !p);
              }}
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
            {/* Title + optional section stepper — small chevrons let
                the host walk sections without reopening the Sections
                sheet. Disabled at the ends; taps that were really
                drag-tails are ignored, same as the buttons above. */}
            <span
              style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
              }}
            >
              {onPrev && (
                <SheetStepButton
                  dir="prev"
                  disabled={prevDisabled}
                  onClick={() => { if (!dragMovedRef.current) onPrev(); }}
                />
              )}
              <span
                style={{
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
              {onNext && (
                <SheetStepButton
                  dir="next"
                  disabled={nextDisabled}
                  onClick={() => { if (!dragMovedRef.current) onNext(); }}
                />
              )}
            </span>
            <button
              type="button"
              className="pl-hit44"
              onClick={(e) => {
                e.stopPropagation();
                if (dragMovedRef.current) return;
                onClose();
              }}
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

/* SheetStepButton — one chevron in the see-through header's section
   stepper. 28px visual; the .pl-hit44 expander (pearloom.css) grows
   the tap target to ≥44px on coarse pointers. stopPropagation keeps
   the tap from toggling peek / starting a header drag decision. */
function SheetStepButton({ dir, disabled, onClick }: {
  dir: 'prev' | 'next';
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="pl-hit44"
      disabled={disabled}
      aria-label={dir === 'prev' ? 'Previous section' : 'Next section'}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{
        width: 28,
        height: 28,
        padding: 0,
        borderRadius: 8,
        border: 'none',
        background: 'transparent',
        display: 'grid',
        placeItems: 'center',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.3 : 1,
        flexShrink: 0,
      }}
    >
      <Icon name={dir === 'prev' ? 'chev-left' : 'chev-right'} size={13} color="var(--ink-soft)" />
    </button>
  );
}

/* ─── Golden-thread strip ────────────────────────────────────────
   The ONE next-best-action, phone edition. Desktop shows it as a
   topbar chip; at 390px the topbar is full, so it rides as a slim
   dismissible glass chip directly above the bottom bar (glass
   because it FLOATS over the live canvas — BRAND §9). Cleared
   above the bar's save chip; EditorRedesign hides it while any
   sheet is open and in preview mode. */

export function MobileNextStepStrip({ label, hint, onFollow, onDismiss }: {
  label: string;
  hint?: string;
  onFollow: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 'calc(56px + env(safe-area-inset-bottom) + 32px)',
        zIndex: 60,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
        padding: '0 12px',
      }}
    >
      <div
        className="pl-rd-pop-in"
        style={{
          pointerEvents: 'auto',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 2,
          maxWidth: '100%',
          padding: '3px 5px 3px 6px',
          borderRadius: 999,
          background: 'var(--pl-glass)',
          backgroundImage: 'var(--pl-glass-sheen)',
          backdropFilter: 'var(--pl-glass-blur, blur(18px) saturate(1.4))',
          WebkitBackdropFilter: 'var(--pl-glass-blur, blur(18px) saturate(1.4))',
          border: '1px solid var(--pl-glass-border)',
          boxShadow: '0 10px 30px rgba(40,40,30,0.16)',
        }}
      >
        <button
          type="button"
          className="pl-hit44"
          onClick={onFollow}
          title={hint}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            minWidth: 0,
            padding: '7px 6px 7px 8px',
            borderRadius: 999,
            border: 'none',
            background: 'transparent',
            color: 'var(--ink)',
            fontSize: 12,
            fontWeight: 700,
            fontFamily: 'var(--font-ui)',
            cursor: 'pointer',
          }}
        >
          <span
            aria-hidden
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--gold, #C19A4B)',
              flexShrink: 0,
            }}
          />
          <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Next: {label}
          </span>
          <Icon name="arrow-right" size={11} color="var(--ink-soft)" />
        </button>
        <button
          type="button"
          className="pl-hit44"
          onClick={onDismiss}
          aria-label="Dismiss for this session"
          style={{
            width: 26,
            height: 26,
            padding: 0,
            borderRadius: 999,
            border: 'none',
            background: 'var(--cream-2)',
            color: 'var(--ink-soft)',
            display: 'grid',
            placeItems: 'center',
            fontSize: 13,
            fontWeight: 700,
            lineHeight: 1,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}

/* ─── Bottom bar — Sections · Theme · Preview · Publish ──────── */

export type MobileSheetId = 'sections' | 'theme' | 'props';

export function MobileBottomBar({
  activeSheet,
  onSections,
  onTheme,
  onPreview,
  onPublish,
  saveState = 'saved',
}: {
  activeSheet: MobileSheetId | null;
  onSections: () => void;
  onTheme: () => void;
  /** Flips the editor to Preview — the bar unmounts there and the
   *  floating "Back to editing" pill takes over as the exit. */
  onPreview: () => void;
  /** Opens the publish flow (bridge.openPublish). Omit for
   *  non-owner roles — the button hides, same as the topbar's. */
  onPublish?: () => void;
  /** Bridge save state, mirrored as a small dot + word riding the
   *  bar's right edge (same field the topbar reads). */
  saveState?: SaveState;
}) {
  const saving = saveState === 'saving' || saveState === 'unsaved';
  const saveLabel = saveState === 'error' ? 'Save failed' : saving ? 'Saving…' : 'Saved';
  const saveColor = saveState === 'error' ? 'var(--peach-ink)'
    : saving ? 'var(--gold, #C19A4B)'
    : 'var(--sage-deep, #5C6B3F)';
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
      {/* Save state — a quiet glass chip riding the bar's right
          edge. aria-hidden: the topbar's aria-live save region is
          the announcer; this is the thumb-range echo. */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: -25,
          right: 10,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '4px 9px',
          borderRadius: 999,
          background: 'var(--pl-glass)',
          backgroundImage: 'var(--pl-glass-sheen)',
          backdropFilter: 'var(--pl-glass-blur, blur(18px) saturate(1.4))',
          WebkitBackdropFilter: 'var(--pl-glass-blur, blur(18px) saturate(1.4))',
          border: '1px solid var(--pl-glass-border)',
          pointerEvents: 'none',
        }}
      >
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: saveColor,
            animation: saving ? 'pl-dot-pulse 1.4s ease-in-out infinite' : 'none',
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontFamily: 'var(--font-mono, ui-monospace, monospace)',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: saveState === 'error' ? 'var(--peach-ink)' : 'var(--ink-muted)',
          }}
        >
          {saveLabel}
        </span>
      </div>
      <BottomBarButton label="Sections" icon="list" on={activeSheet === 'sections' || activeSheet === 'props'} onClick={onSections} />
      <BottomBarButton label="Theme" icon="palette" on={activeSheet === 'theme'} onClick={onTheme} />
      <BottomBarButton label="Preview" icon="eye" on={false} onClick={onPreview} />
      {onPublish && <BottomBarButton label="Publish" icon="arrow-up" on={false} onClick={onPublish} />}
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
        position: 'relative',
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
      {/* Active state — the brand's two-strand thread (olive over
          gold), always mounted, drawn in via scaleX like DashSubNav
          so activation weaves the mark instead of popping it. */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: '50%',
          bottom: 6,
          width: 26,
          marginLeft: -13,
          height: 2,
          borderRadius: 2,
          background: 'var(--sage-deep, var(--pl-olive, #5C6B3F))',
          opacity: on ? 1 : 0,
          transform: on ? 'scaleX(1)' : 'scaleX(0.4)',
          transformOrigin: 'center',
          transition: 'opacity 180ms var(--pl-ease-out, ease), transform 240ms var(--pl-ease-emphasis, cubic-bezier(0.16,1,0.3,1))',
        }}
      />
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: '50%',
          bottom: 3,
          width: 22,
          marginLeft: -11,
          height: 1,
          borderRadius: 2,
          background: 'var(--gold, #C19A4B)',
          opacity: on ? 0.65 : 0,
          transform: on ? 'scaleX(1)' : 'scaleX(0.4)',
          transformOrigin: 'center',
          transition: 'opacity 180ms var(--pl-ease-out, ease) 40ms, transform 240ms var(--pl-ease-emphasis, cubic-bezier(0.16,1,0.3,1)) 40ms',
        }}
      />
    </button>
  );
}

/* ─── Preview exit pill ──────────────────────────────────────────
   Phone preview hides ALL editor chrome (the bottom bar unmounts,
   the compact topbar has no mode pills) so the site reads exactly
   as guests will see it — this floating glass pill is the one
   obvious way back. Glass because it FLOATS over a live site
   (BRAND §9); wrapper handles centering so the pop-in keyframe's
   fill-mode never fights an inline transform. */

export function PreviewExitPill({ onClick }: { onClick: () => void }) {
  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 'calc(18px + env(safe-area-inset-bottom))',
        zIndex: 60,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <button
        type="button"
        onClick={onClick}
        className="pl-rd-pop-in"
        style={{
          pointerEvents: 'auto',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          padding: '10px 18px',
          borderRadius: 999,
          background: 'var(--pl-glass)',
          backgroundImage: 'var(--pl-glass-sheen)',
          backdropFilter: 'var(--pl-glass-blur, blur(18px) saturate(1.4))',
          WebkitBackdropFilter: 'var(--pl-glass-blur, blur(18px) saturate(1.4))',
          border: '1px solid var(--pl-glass-border)',
          boxShadow: '0 10px 30px rgba(40,40,30,0.18)',
          color: 'var(--ink)',
          fontSize: 12.5,
          fontWeight: 700,
          fontFamily: 'var(--font-ui)',
          cursor: 'pointer',
        }}
      >
        <Icon name="brush" size={13} color="var(--ink)" />
        Back to editing
      </button>
    </div>
  );
}
