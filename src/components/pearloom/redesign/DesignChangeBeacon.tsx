'use client';

/* ─────────────────────────────────────────────────────────────
   DesignChangeBeacon — makes a committed design change visible
   and understood.

   Listens for `pearloom:design-change` (announceDesignChange in
   design-feedback.ts) and, for ~1.5s:

     · CHIP — names what changed over the canvas top edge
       ("Paper · Linen", "Spacing · Airy"). Always shown; the
       one thing every change gets.
     · THREAD PASS — whole-canvas changes (theme, colors, kit…)
       get a two-strand olive + gold thread growing from the
       center across the canvas top: the weaving motion language,
       600-900ms, then gone.
     · LAYER PULSE — scoped changes (motifs, pattern, footer,
       menu) get a gold hairline pulse over the affected layer's
       box. If that layer is off-screen, the canvas scrolls once
       to reveal one instance.

   prefers-reduced-motion: the thread pass and pulse are skipped
   entirely (and the reveal-scroll jumps instead of gliding); the
   chip still appears/disappears without animation so the host
   still learns WHAT changed.

   Mounted once by EditorRedesign; overlays portal to <body> so
   canvas overflow can never clip them. All per-frame work is
   imperative (refs + rAF) — no render per frame.
   ───────────────────────────────────────────────────────────── */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  DESIGN_CHANGE_EVENT,
  beaconPlanFor,
  beaconText,
  type DesignChangeDetail,
} from './design-feedback';

const CHIP_MS = 1600;
const PULSE_MS = 900;

interface ActiveBeacon {
  id: number;
  text: string;
  /** 'canvas' → thread pass · 'scoped' → layer pulse. */
  mode: 'canvas' | 'scoped';
  reduced: boolean;
  /** Fixed-position anchor for the chip + thread (the visible
   *  canvas region at announce time). */
  anchor: { left: number; top: number; width: number };
}

function canvasRegion(): { left: number; top: number; width: number; bottom: number } | null {
  const container = document.querySelector<HTMLElement>('[data-pl-canvas-scroll]');
  if (!container) return null;
  const r = container.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, bottom: r.bottom };
}

export function DesignChangeBeacon() {
  const [beacon, setBeacon] = useState<ActiveBeacon | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const pulseRef = useRef<HTMLDivElement | null>(null);
  const seq = useRef(0);

  /* Event intake — resolve the plan + target, then flip state once.
     Everything positional is measured here (event time), not in
     render. */
  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<DesignChangeDetail>).detail;
      if (!detail?.kind) return;
      const region = canvasRegion();
      if (!region) return;
      const plan = beaconPlanFor(detail.kind);
      const root = document.querySelector<HTMLElement>('[data-pl-canvas-scroll] .pl8-guest');

      let mode: 'canvas' | 'scoped' = 'canvas';
      targetRef.current = null;
      if (plan.scope === 'scoped' && plan.selector && root) {
        const el = root.querySelector<HTMLElement>(plan.selector);
        if (el) {
          targetRef.current = el;
          mode = 'scoped';
        }
      }
      const reduced = typeof window.matchMedia === 'function'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      seq.current += 1;
      setBeacon({
        id: seq.current,
        text: beaconText(detail.kind, detail.label),
        mode,
        reduced,
        anchor: { left: region.left, top: region.top, width: region.width },
      });
    };
    window.addEventListener(DESIGN_CHANGE_EVENT, onChange);
    return () => window.removeEventListener(DESIGN_CHANGE_EVENT, onChange);
  }, []);

  /* Per-beacon lifecycle — reveal-scroll + rAF pulse tracking +
     the clear timer. */
  useEffect(() => {
    if (!beacon) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let raf = 0;

    if (beacon.mode === 'scoped' && targetRef.current) {
      const target = targetRef.current;
      const container = document.querySelector<HTMLElement>('[data-pl-canvas-scroll]');

      /* Off-screen? Reveal one instance, once. */
      if (container) {
        const cr = container.getBoundingClientRect();
        const tr = target.getBoundingClientRect();
        const visible = tr.bottom > cr.top + 40 && tr.top < cr.bottom - 40;
        if (!visible) {
          target.scrollIntoView({
            behavior: beacon.reduced ? 'auto' : 'smooth',
            block: 'center',
          });
        }
      }

      /* Track the target's box each frame (it may glide during the
         reveal scroll) — imperative style writes, zero re-renders. */
      if (!beacon.reduced) {
        const track = () => {
          const el = pulseRef.current;
          if (el && targetRef.current) {
            const tr = targetRef.current.getBoundingClientRect();
            const region = canvasRegion();
            const top = region ? Math.max(tr.top, region.top) : tr.top;
            const bottom = region ? Math.min(tr.bottom, region.bottom) : tr.bottom;
            el.style.left = `${tr.left}px`;
            el.style.top = `${top}px`;
            el.style.width = `${tr.width}px`;
            el.style.height = `${Math.max(0, bottom - top)}px`;
          }
          raf = window.requestAnimationFrame(track);
        };
        raf = window.requestAnimationFrame(track);
        timers.push(setTimeout(() => window.cancelAnimationFrame(raf), PULSE_MS + 600));
      }
    }

    timers.push(setTimeout(() => setBeacon(null), CHIP_MS));
    return () => {
      timers.forEach(clearTimeout);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [beacon]);

  if (!beacon || typeof document === 'undefined') return null;

  const { anchor, reduced } = beacon;
  const chip = (
    <div
      key={`chip-${beacon.id}`}
      className={reduced ? undefined : 'pl-rd-beacon-chip'}
      role="status"
      style={{
        position: 'fixed',
        top: anchor.top + 14,
        left: anchor.left + anchor.width / 2,
        transform: 'translateX(-50%)',
        zIndex: 340,
        pointerEvents: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '6px 13px',
        borderRadius: 999,
        background: 'var(--pl-glass, rgba(251,247,238,0.82))',
        backgroundImage: 'var(--pl-glass-sheen)',
        backdropFilter: 'var(--pl-glass-blur, blur(14px) saturate(1.3))',
        WebkitBackdropFilter: 'var(--pl-glass-blur, blur(14px) saturate(1.3))',
        border: '1px solid var(--pl-glass-border, rgba(14,13,11,0.12))',
        boxShadow: 'var(--pl-glass-shadow, 0 8px 24px rgba(14,13,11,0.14))',
        fontFamily: 'var(--font-mono, ui-monospace, monospace)',
        fontSize: 9.5,
        fontWeight: 700,
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        color: 'var(--pl-ink, #2A2418)',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        aria-hidden
        style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--pl-gold, #C19A4B)', flexShrink: 0 }}
      />
      {beacon.text}
    </div>
  );

  /* Two-strand thread pass — whole-canvas changes only. */
  const thread = beacon.mode === 'canvas' && !reduced ? (
    <div
      key={`thread-${beacon.id}`}
      aria-hidden
      className="pl-rd-beacon-thread"
      style={{
        position: 'fixed',
        top: anchor.top + 44,
        left: anchor.left + anchor.width / 2,
        width: Math.min(440, anchor.width * 0.6),
        marginLeft: -Math.min(440, anchor.width * 0.6) / 2,
        zIndex: 339,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
      }}
    >
      <span style={{ display: 'block', height: 1, background: 'var(--pl-olive, #5C6B3F)', transformOrigin: '50% 50%' }} />
      <span style={{ display: 'block', height: 1, background: 'var(--pl-gold, #C19A4B)', transformOrigin: '50% 50%' }} />
    </div>
  ) : null;

  /* Layer pulse — scoped changes. Position is written by the rAF
     tracker; render it parked off-screen so there's no flash at
     0,0 before the first frame. */
  const pulse = beacon.mode === 'scoped' && !reduced ? (
    <div
      key={`pulse-${beacon.id}`}
      ref={pulseRef}
      aria-hidden
      className="pl-rd-beacon-pulse"
      style={{
        position: 'fixed',
        top: -9999,
        left: -9999,
        zIndex: 338,
        pointerEvents: 'none',
        borderRadius: 10,
        border: '1px solid var(--pl-gold, #C19A4B)',
      }}
    />
  ) : null;

  return createPortal(
    <>
      {chip}
      {thread}
      {pulse}
    </>,
    document.body,
  );
}
