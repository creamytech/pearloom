'use client';


/* ─────────────────────────────────────────────────────────────
   MobileSheet + MobileBottomBar — phone chrome for the redesign
   editor. Below 768px the three-column grid collapses to a
   full-width canvas; the rails re-mount inside these.

   Two modes:

   MODAL (sections) — backdrop, body lock, full height.

   SEE-THROUGH (props / theme) — the host's complaint, 2026-06-12:
   "you can't see your changes till you put the drawer away." NO
   backdrop and no body lock: the live canvas stays visible above
   the sheet, still scrollable, and repaints as every control
   changes. Three rest stops (2026-07-09, owner: "expand the
   panels to full screen"):

     open — near-full (~88dvh): real working room for the rich
            control decks; a slim strip of canvas stays visible
            so "I'm editing THIS" never gets lost. The props
            sheet opens here.
     half — the classic half sheet (min(48vh, 460px) visible):
            watching the canvas repaint is the point of the
            Design sheet, so IT opens here.
     peek — a slim bar; full-canvas look without losing panel
            state ("See my site").

   The header doubles as a drag handle — drag between the stops,
   release snaps to the nearest one (a fling biases one stop in
   its direction; a fast downward fling from peek closes). The
   buttons are the discoverable path; the drag is the power path.

   ── POSITION OWNERSHIP (2026-07-03 rebuild) ─────────────────
   The sheet's position used to have THREE writers — React state
   (open/peek → transform strings), the drag handler (imperative
   transform), and the keyboard lift (imperative bottom/maxHeight)
   — and they fought: a focusin/focusout cycle could clear React's
   own inline `bottom: 0` (el.style.bottom = '' wipes the shared
   style attribute; React never re-writes an "unchanged" prop),
   leaving the sheet statically positioned at the TOP of the
   screen; a drag could strand a mid-height transform React knew
   nothing about; switching to the Sections sheet while peeked
   kept the peek transform on a modal that has no peek.

   Now ONE writer owns every position property: SheetController
   (below). React renders position styles exactly once, as
   constants (translateY(102%), bottom 0) — since they never
   change between renders, React never touches them again, and the
   controller is free to mutate transform / transition / bottom /
   maxHeight / pointerEvents without ever being overwritten or
   wiping React's values. React state expresses INTENT only
   (open? + snap: 'open' | 'half' | 'peek'); an effect routes
   intent into controller.snapTo(); drag and keyboard-lift route
   through the same controller. After ANY gesture sequence the
   sheet is at a named snap point ('open' | 'half' | 'peek' |
   'closed'), published on data-pl-sheet-state /
   data-pl-sheet-settled for tests.

   Visual language borrowed from EditorThemeShop's bottom drawer
   (grab handle, rounded 22px top, slide-up). prefers-reduced-
   motion is honoured by the .pl-redesign * reduced-motion
   kill-switch in animations.css AND by the controller's instant
   snaps (it checks the media query per snap so settle callbacks
   fire promptly).
   ───────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from '../motifs';
import type { SaveState } from './bridge';

const SHEET_MS = 360;
const PEEK_BAR = 54;
/* The half stop's visible height — the classic half sheet, kept as
   the middle snap. The CSS string drives the transform; the px
   twin drives the drag geometry (both must describe the same
   height or releases snap somewhere the transform isn't). */
const HALF_VISIBLE_CSS = 'min(48vh, 460px)';
const halfVisiblePx = () => Math.min(window.innerHeight * 0.48, 460);
/* Finger travel before a header touch becomes a drag (px) — under
   this it stays a tap so the header's buttons keep working. */
const DRAG_SLOP = 6;
/* Release velocity (px/ms) past which the fling direction wins over
   the nearest-state snap; from peek, a downward fling closes. */
const FLICK = 0.55;

/* ─── SheetController — the ONE writer of sheet position ───────
   Owns transform, transition, bottom, maxHeight and pointerEvents
   on the sheet element. Everything else (React renders, drag
   handlers, the keyboard lift) expresses intent through it. */

type SheetSnap = 'open' | 'half' | 'peek' | 'closed';
/** The stops a host can rest at — React intent vocabulary. */
type SheetRestSnap = 'open' | 'half' | 'peek';

const SNAP_TRANSFORM: Record<SheetSnap, string> = {
  open: 'translateY(0px)',
  half: `translateY(calc(100% - ${HALF_VISIBLE_CSS}))`,
  peek: `translateY(calc(100% - ${PEEK_BAR}px - env(safe-area-inset-bottom, 0px)))`,
  /* 102% — a hair past the edge so the top shadow clears too. */
  closed: 'translateY(102%)',
};
/* height rides along so the modal↔see-through height swap eases
   instead of snapping while the sheet is up. */
const SHEET_TRANSITION = `transform ${SHEET_MS}ms var(--pl-ease-emphasis), height ${SHEET_MS}ms var(--pl-ease-emphasis)`;

class SheetController {
  private el: HTMLElement;
  /** The snap the sheet is at (or animating toward). */
  target: SheetSnap = 'closed';
  dragging = false;
  /** Fires once the sheet settles on a snap (timer-based — the
   *  reduced-motion kill-switch in animations.css can suppress
   *  transitionend, so a timer is the reliable signal). */
  onSettle: ((snap: SheetSnap) => void) | null = null;
  private settleTimer: ReturnType<typeof setTimeout> | null = null;
  private peekOffset = 0;
  private halfOffset = 0;

  constructor(el: HTMLElement) {
    this.el = el;
    /* Assert the full position contract once — React rendered the
       same constants, so both sides agree at t=0. */
    el.style.transform = SNAP_TRANSFORM.closed;
    el.style.bottom = '0px';
    el.style.pointerEvents = 'none';
    el.dataset.plSheetState = 'closed';
    el.dataset.plSheetSettled = '1';
  }

  dispose() {
    if (this.settleTimer) clearTimeout(this.settleTimer);
    this.settleTimer = null;
    this.onSettle = null;
  }

  private reducedMotion(): boolean {
    return typeof window !== 'undefined'
      && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  }

  /** Animate (or, reduced-motion, jump) to a named snap. During an
   *  active drag only 'closed' interrupts (Escape / route change);
   *  other requests are dropped — the release resolves the drag. */
  snapTo(snap: SheetSnap, opts: { instant?: boolean } = {}) {
    if (this.dragging) {
      if (snap !== 'closed') return;
      this.dragging = false;
    }
    const el = this.el;
    const instant = opts.instant || this.reducedMotion();
    this.target = snap;
    el.dataset.plSheetState = snap;
    el.dataset.plSheetSettled = '0';
    /* The dying sheet must not eat taps — and the live one must. */
    el.style.pointerEvents = snap === 'closed' ? 'none' : 'auto';
    /* Reflow so the browser takes the CURRENT position (possibly a
       mid-drag px transform, possibly a freshly-mounted node) as
       the transition start instead of batching it away. */
    void el.getBoundingClientRect();
    el.style.transition = instant ? 'none' : SHEET_TRANSITION;
    el.style.transform = SNAP_TRANSFORM[snap];
    this.armSettle(instant ? 0 : SHEET_MS + 40);
  }

  private armSettle(ms: number) {
    if (this.settleTimer) clearTimeout(this.settleTimer);
    this.settleTimer = setTimeout(() => {
      this.settleTimer = null;
      this.el.dataset.plSheetSettled = '1';
      /* Restore the standing transition so React-driven height
         changes (sheet-id swaps) ease even between snaps. */
      this.el.style.transition = this.reducedMotion() ? 'none' : SHEET_TRANSITION;
      this.onSettle?.(this.target);
    }, ms);
  }

  /** Begin a header drag. Returns the px geometry the move handler
   *  needs. The controller freezes its transition; every move is a
   *  px transform write; the release picks the snap. */
  dragStart(): { startOffset: number; peekOffset: number } {
    const el = this.el;
    const padBottom = parseFloat(getComputedStyle(el).paddingBottom) || 0;
    this.peekOffset = Math.max(el.offsetHeight - PEEK_BAR - padBottom, 0);
    /* px twin of SNAP_TRANSFORM.half — clamped inside the drag
       range so a short sheet can't put half below peek. */
    this.halfOffset = Math.min(Math.max(el.offsetHeight - halfVisiblePx(), 0), this.peekOffset);
    this.dragging = true;
    if (this.settleTimer) { clearTimeout(this.settleTimer); this.settleTimer = null; }
    el.dataset.plSheetSettled = '0';
    el.style.transition = 'none';
    /* If the grab landed mid-animation, freeze at the CURRENT
       painted offset so the sheet doesn't jump to the old target
       under the finger. matrix(a,b,c,d,tx,ty) — ty is index 5. */
    const raw = getComputedStyle(el).transform;
    const parsed = /^matrix\(([^)]+)\)$/.exec(raw);
    const ty = parsed ? parseFloat(parsed[1].split(',')[5]) : NaN;
    const current = Number.isFinite(ty) ? Math.min(Math.max(ty, 0), this.peekOffset) : 0;
    el.style.transform = `translateY(${current}px)`;
    return { startOffset: current, peekOffset: this.peekOffset };
  }

  dragMove(offset: number) {
    if (!this.dragging) return;
    this.el.style.transform = `translateY(${Math.min(Math.max(offset, 0), this.peekOffset)}px)`;
  }

  /** Resolve a drag: nearest of the three rest stops, biased one
   *  stop in a fling's direction; a fast downward fling FROM the
   *  peek stop closes. Returns the chosen snap so the component
   *  can sync React intent / call onClose. */
  dragEnd(offset: number, velocity: number, origin: SheetRestSnap): SheetSnap {
    if (!this.dragging) return this.target;
    this.dragging = false;
    const stops: Array<{ snap: SheetRestSnap; at: number }> = [
      { snap: 'open', at: 0 },
      { snap: 'half', at: this.halfOffset },
      { snap: 'peek', at: this.peekOffset },
    ];
    let idx = 0;
    for (let i = 1; i < stops.length; i++) {
      if (Math.abs(offset - stops[i].at) < Math.abs(offset - stops[idx].at)) idx = i;
    }
    if (velocity > FLICK) {
      if (idx === stops.length - 1) {
        /* Below peek there's only closed — and only a grab that
           STARTED at peek earns it (matches the two-stop rule). */
        if (origin === 'peek') { this.snapTo('closed'); return 'closed'; }
      } else {
        idx += 1;
      }
    } else if (velocity < -FLICK) {
      idx = Math.max(0, idx - 1);
    }
    const snap = stops[idx].snap;
    this.snapTo(snap);
    return snap;
  }

  /** Pointer cancel — glide back to wherever we were headed. */
  dragCancel() {
    if (!this.dragging) return;
    this.dragging = false;
    this.snapTo(this.target);
  }

  /** Keyboard lift — the software keyboard shrinks the visual
   *  viewport while this fixed-position sheet stays put; lift it by
   *  the keyboard inset and clamp its height to what remains. The
   *  controller owns `bottom`, so clearing NEVER writes '' (the
   *  historical bug: '' wiped the inline bottom:0 and the sheet
   *  fell back to static position at the top of the screen). */
  setKeyboardInset(inset: number, maxHeight: number | null) {
    this.el.style.bottom = inset > 0 ? `${inset}px` : '0px';
    this.el.style.maxHeight = inset > 0 && maxHeight ? `${maxHeight}px` : '';
  }
}

export function MobileSheet({
  open,
  onClose,
  height = '75vh',
  label,
  children,
  seeThrough = false,
  defaultSnap = 'open',
  contentKey,
  onPrev,
  onNext,
  prevDisabled = false,
  nextDisabled = false,
}: {
  open: boolean;
  onClose: () => void;
  /** Sheet height — see-through panels ride near-full (the 'open'
   *  stop); the half/peek stops translate the sheet down so the
   *  canvas shows through. */
  height?: string;
  /** The rest stop a see-through sheet opens at (and returns to on
   *  a content swap): 'open' (near-full — content panels) or
   *  'half' (the classic half sheet — the Design sheet, whose
   *  point is watching the canvas repaint). */
  defaultSnap?: 'open' | 'half';
  /** Accessible dialog name — doubles as the header title (the
   *  props sheet passes the ACTIVE SECTION's display label, so
   *  the peek bar names what's being edited). */
  label: string;
  children: ReactNode;
  /** Non-modal: no backdrop, no body lock, canvas interactive,
   *  peek toggle. For panels whose edits should be SEEN live. */
  seeThrough?: boolean;
  /** Identity of what the sheet is showing (sheet id + active
   *  section). When it changes while open — the host tapped a
   *  different section on the canvas, stepped with the chevrons,
   *  or switched sheets on the bottom bar — the content swaps IN
   *  PLACE (no close/reopen) and a peeked sheet rises back to
   *  open: picking something new is intent to edit it. Also kills
   *  the old bug where switching to the Sections modal while
   *  peeked kept the peek transform on a sheet with no peek. */
  contentKey?: string;
  /** Section stepper (see-through header) — chevrons flanking the
   *  title so the host can walk sections without reopening the
   *  Sections sheet. Omit both to keep the plain title. */
  onPrev?: () => void;
  onNext?: () => void;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
}) {
  /* ── React state = INTENT only ───────────────────────────────
     open (prop) + snap ('open' | 'half' | 'peek'). The controller
     owns the actual position; the effect below routes intent into
     it. */
  const [snap, setSnap] = useState<SheetRestSnap>(defaultSnap);
  /* The last stop that showed the CONTROLS — where the peek bar's
     tap (and the "Back to editing" button) returns to. Render-time
     adjustment, same pattern as prevOpen below. */
  const [lastRest, setLastRest] = useState<'open' | 'half'>(defaultSnap);
  if (snap !== 'peek' && snap !== lastRest) setLastRest(snap);

  /* Keep children mounted while the sheet animates out so the
     exit slide doesn't show an empty shell. Mount synchronously
     during render (the "derive from previous render" pattern);
     unmount when the controller reports the close settled. */
  const [render, setRender] = useState(open);
  if (open && !render) setRender(true);

  /* Reset to the sheet's default stop on every (re)open — a peek
     (or a dragged height) is a transient way of looking at the
     site, not a persistent preference. */
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open && snap !== defaultSnap) setSnap(defaultSnap);
  }
  /* Content swap while open → back to the (new) content's default
     stop (see contentKey doc): picking something new is intent to
     edit it, and props/theme carry different defaults. */
  const [prevKey, setPrevKey] = useState(contentKey);
  if (contentKey !== prevKey) {
    setPrevKey(contentKey);
    if (open && snap !== defaultSnap) setSnap(defaultSnap);
  }

  /* ── The controller — created with the element, disposed with
     it. A callback ref (not useEffect) so it exists before any
     effect or pointer handler needs it. */
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const ctrlRef = useRef<SheetController | null>(null);
  const attachSheet = useCallback((el: HTMLDivElement | null) => {
    if (el) {
      sheetRef.current = el;
      ctrlRef.current = new SheetController(el);
    } else {
      ctrlRef.current?.dispose();
      ctrlRef.current = null;
      sheetRef.current = null;
    }
  }, []);

  /* Unmount children once the exit settles (timer-driven inside
     the controller — reliable under the reduced-motion CSS
     kill-switch, unlike transitionend). */
  useEffect(() => {
    const ctrl = ctrlRef.current;
    if (!ctrl) return;
    ctrl.onSettle = (settledSnap) => {
      if (settledSnap === 'closed') setRender(false);
    };
    return () => { if (ctrlRef.current) ctrlRef.current.onSettle = null; };
  }, [render]);

  /* Intent → position. The ONLY place open/snap reach the DOM.
     While a drag is live the controller ignores non-close snaps —
     the release resolves them — so a selection change mid-drag
     can't restart animations under the finger. */
  useEffect(() => {
    ctrlRef.current?.snapTo(open ? snap : 'closed');
  }, [open, snap, render]);

  /* ── Drag (see-through only) — pure gesture bookkeeping; every
     position write goes through the controller. */
  const dragRef = useRef<{
    pointerId: number;
    startY: number;
    startOffset: number;
    peekOffset: number;
    started: boolean;
    origin: SheetRestSnap;
    lastY: number;
    lastT: number;
    velocity: number;
  } | null>(null);
  /* True from the moment a header touch crosses the slop until the
     next pointerdown — lets button onClicks ignore drag-tail clicks. */
  const dragMovedRef = useRef(false);

  const onHeaderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!seeThrough || !open) return;
    dragMovedRef.current = false;
    dragRef.current = {
      pointerId: e.pointerId,
      startY: e.clientY,
      startOffset: 0,
      peekOffset: 0,
      started: false,
      origin: snap,
      lastY: e.clientY,
      lastT: e.timeStamp,
      velocity: 0,
    };
  };
  const onHeaderPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    const ctrl = ctrlRef.current;
    if (!d || !ctrl || e.pointerId !== d.pointerId) return;
    const dy = e.clientY - d.startY;
    if (!d.started) {
      if (Math.abs(dy) < DRAG_SLOP) return;
      d.started = true;
      dragMovedRef.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      const g = ctrl.dragStart();
      /* Anchor to where the sheet actually is (it may have been
         grabbed mid-animation), not where intent said it was. */
      d.startOffset = g.startOffset;
      d.peekOffset = g.peekOffset;
      d.startY = e.clientY;
    }
    const dt = e.timeStamp - d.lastT;
    if (dt > 0) d.velocity = (e.clientY - d.lastY) / dt;
    d.lastY = e.clientY;
    d.lastT = e.timeStamp;
    ctrl.dragMove(d.startOffset + (e.clientY - d.startY));
  };
  const onHeaderPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    const ctrl = ctrlRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    dragRef.current = null;
    if (!ctrl || !d.started) return;
    const offset = Math.min(Math.max(d.startOffset + (e.clientY - d.startY), 0), d.peekOffset);
    const resolved = ctrl.dragEnd(offset, d.velocity, d.origin);
    /* Sync React intent with the controller's resolution — its
       next effect run is a no-op (controller already there). */
    if (resolved === 'closed') onClose();
    else setSnap(resolved as SheetRestSnap);
  };
  const onHeaderPointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    dragRef.current = null;
    ctrlRef.current?.dragCancel();
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
     FOCUS-GATED (2026-07-02 field report): mobile browsers emit
     visualViewport deltas for URL-bar collapse, overscroll, and
     stale keyboard transitions — an ungated lift left the sheet
     stranded ~500px up the screen while idle. The lift applies
     ONLY while a form control inside the sheet holds focus (the
     only moment a keyboard can be covering it), needs a real
     keyboard-sized inset (>120px), and always clears on blur.
     All writes route through the controller (setKeyboardInset),
     which owns `bottom`/`maxHeight` outright — clearing restores
     bottom: 0px explicitly, never '' (the '' write was the
     stranded-at-top-of-screen bug: it wiped React's inline
     bottom:0 and React never re-writes an unchanged prop). */
  useEffect(() => {
    if (!open || !seeThrough || typeof window === 'undefined') return;
    const vv = window.visualViewport;
    const el = sheetRef.current;
    const ctrl = ctrlRef.current;
    if (!vv || !el || !ctrl) return;
    let focused = false;
    const apply = () => {
      if (!focused) { ctrl.setKeyboardInset(0, null); return; }
      const inset = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
      if (inset > 120) {
        ctrl.setKeyboardInset(inset, Math.max(Math.round(vv.height) - 12, 160));
      } else {
        ctrl.setKeyboardInset(0, null);
      }
    };
    const onFocusIn = (e: FocusEvent) => {
      const t = e.target as HTMLElement | null;
      focused = !!t && !!t.closest('input, textarea, select, [contenteditable]');
      apply();
    };
    const onFocusOut = () => {
      focused = false;
      /* Blur fires before the keyboard finishes retracting — clear
         immediately; a follow-up vv resize is a no-op once unfocused. */
      ctrl.setKeyboardInset(0, null);
    };
    el.addEventListener('focusin', onFocusIn);
    el.addEventListener('focusout', onFocusOut);
    vv.addEventListener('resize', apply);
    vv.addEventListener('scroll', apply);
    return () => {
      el.removeEventListener('focusin', onFocusIn);
      el.removeEventListener('focusout', onFocusOut);
      vv.removeEventListener('resize', apply);
      vv.removeEventListener('scroll', apply);
      ctrl.setKeyboardInset(0, null);
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
        ref={attachSheet}
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
          height,
          /* POSITION CONTRACT: bottom / transform / transition /
             pointerEvents / maxHeight belong to SheetController.
             The values below are constants — identical on every
             render — so React never patches them and never fights
             the controller's imperative writes. Everything else
             (height above, colors, layout) stays React's. */
          bottom: 0,
          transform: SNAP_TRANSFORM.closed,
          pointerEvents: 'none',
          /* OPAQUE paper, not glass. The sheet floats over a LIVE
             site whose theme can be editorial midnight while the
             editor chrome is in light mode — frosted glass then
             tints the wrong palette and the canvas's display text
             reads straight through the header ("out of place",
             user report). "See-through" means the canvas ABOVE the
             half-height sheet stays visible, never through the
             panel itself. Card paper carries both theme values, so
             the header/controls are readable over any site. */
          background: 'var(--card, var(--cream))',
          borderTop: '1px solid var(--line-soft, var(--line))',
          borderRadius: '22px 22px 0 0',
          boxShadow: '0 -20px 60px rgba(40,40,30,0.22)',
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
            onClick={snap === 'peek' ? () => { if (!dragMovedRef.current) setSnap(lastRest); } : undefined}
            onPointerDown={onHeaderPointerDown}
            onPointerMove={onHeaderPointerMove}
            onPointerUp={onHeaderPointerEnd}
            onPointerCancel={onHeaderPointerCancel}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 12px 6px',
              flexShrink: 0,
              cursor: snap === 'peek' ? 'pointer' : 'grab',
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
                setSnap((s) => (s === 'peek' ? lastRest : 'peek'));
              }}
              aria-pressed={snap === 'peek'}
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
              <Icon name={snap === 'peek' ? 'arrow-up' : 'eye'} size={12} color="var(--ink-soft)" />
              {snap === 'peek' ? 'Back to editing' : 'See my site'}
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
  /* Hide while the software keyboard is up (a text control holds
     focus — inline-editing the canvas is the common case). The
     strip is fixed to the LAYOUT viewport; when the keyboard
     shrinks the visual viewport it would otherwise ride up and
     sit mid-canvas over the very words being edited (2026-07-03
     field screenshot: strip across the hero names). */
  const [kbFocus, setKbFocus] = useState(false);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const isText = (t: EventTarget | null) =>
      t instanceof HTMLElement && !!t.closest('input, textarea, select, [contenteditable]');
    const onFocusIn = (e: FocusEvent) => { if (isText(e.target)) setKbFocus(true); };
    const onFocusOut = () => setKbFocus(false);
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);
  if (kbFocus) return null;
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
      <BottomBarButton label="Design" icon="palette" on={activeSheet === 'theme'} onClick={onTheme} />
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
