'use client';

/* ════════════════════════════════════════════════════════════════
   PEARLOOM FX — Pear's hands on the loom.

   Every AI operation in the editor gets a physical body: a gold
   two-strand thread draws from Pear's corner to the section she's
   working on, a pearl shuttle pulses at the tip while the model
   thinks, and when the change lands the section "weave-settles"
   (soft blur → sharp + a gold hairline bloom). Theme-level changes
   fire a full-canvas dye sweep instead — new color washing down
   the page like dye through cloth.

   One event powers everything:

     window.dispatchEvent(new CustomEvent('pearloom:pear-working', {
       detail: { section?: string, kind?: 'text' | 'theme',
                 phase: 'start' | 'done' | 'error' }
     }))

   Dispatch via the `pearWorking()` helper so call sites stay
   typo-proof. The overlay mounts once inside the editor canvas
   wrapper, is pointer-events:none, and honours reduced motion
   (instant highlight, no travel).
   ════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from 'react';

export type PearFxKind = 'text' | 'theme';
export type PearFxPhase = 'start' | 'done' | 'error';

export const PEAR_WORKING_EVENT = 'pearloom:pear-working';

export function pearWorking(phase: PearFxPhase, section?: string, kind: PearFxKind = 'text') {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent(PEAR_WORKING_EVENT, { detail: { section, kind, phase } }));
  } catch {
    /* FX must never break the edit itself. */
  }
}

/* Settle pulse on the target section — class added for the length
   of the keyframe, then removed so it can re-fire. */
function settle(el: HTMLElement) {
  el.classList.remove('pl-rd-weave-settle');
  // Force reflow so re-adding restarts the animation.
  void el.offsetWidth;
  el.classList.add('pl-rd-weave-settle');
  window.setTimeout(() => el.classList.remove('pl-rd-weave-settle'), 1100);
}

interface ThreadState {
  d: string;          // svg path
  length: number;     // path length for dash animation
  tip: { x: number; y: number };
  key: number;        // remount key so re-dispatch restarts draw
}

export function PearLoomFx() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [thread, setThread] = useState<ThreadState | null>(null);
  const [retracting, setRetracting] = useState(false);
  const [sweep, setSweep] = useState(0); // increments to re-fire dye sweep
  const activeSection = useRef<string | null>(null);
  const keyRef = useRef(0);

  useEffect(() => {
    const reduced = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const findTarget = (section?: string): HTMLElement | null => {
      if (!section) return null;
      // Section ids live on TSection wrappers (one editor per page).
      return (document.getElementById(section)
        ?? document.querySelector(`[data-section-id="${CSS.escape(section)}"]`)) as HTMLElement | null;
    };

    const onEvent = (e: Event) => {
      const { section, kind = 'text', phase } = (e as CustomEvent).detail ?? {};
      const wrap = wrapRef.current;
      if (!wrap) return;

      if (phase === 'start') {
        activeSection.current = section ?? null;
        if (reduced) return; // settle-only on done
        const target = findTarget(section);
        // No resolvable section → no thread. A thread that points
        // at nothing (the old fallback aimed at screen center) reads
        // as a glitch, not as Pear working — the busy state on the
        // chip that fired the call carries the feedback instead.
        if (!target) return;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        // Origin: Pear's corner (bottom-right, where Pear's chrome sits).
        const x0 = vw - 96;
        const y0 = vh - 64;
        const t = target.getBoundingClientRect();
        // The section may extend past the viewport — aim at the
        // visible part of it so the shuttle is always on screen.
        const x1 = Math.min(vw - 24, Math.max(24, t.left + t.width / 2));
        const y1 = Math.min(vh - 80, Math.max(64, t.top + 24));
        // A relaxed S-curve — thread, not laser.
        const mx = (x0 + x1) / 2;
        const d = `M ${x0} ${y0} C ${x0 - 120} ${y0 - 40}, ${mx + 80} ${y1 + 120}, ${x1} ${y1}`;
        // Length estimate (chord × 1.35) is plenty for dash purposes.
        const length = Math.hypot(x1 - x0, y1 - y0) * 1.35 + 160;
        keyRef.current += 1;
        setRetracting(false);
        setThread({ d, length, tip: { x: x1, y: y1 }, key: keyRef.current });
        return;
      }

      // done | error
      const target = findTarget(section ?? activeSection.current ?? undefined);
      if (phase === 'done') {
        if (target) settle(target);
        if (kind === 'theme') {
          if (!reduced) setSweep((n) => n + 1);
          // Theme settles the whole canvas, not one section.
          const canvas = wrap.parentElement;
          if (canvas instanceof HTMLElement && !target) settle(canvas);
        }
      }
      // Retract the thread (or fade on error) then clear.
      if (thread || phase === 'done' || phase === 'error') {
        setRetracting(true);
        window.setTimeout(() => { setThread(null); setRetracting(false); }, 520);
      }
      activeSection.current = null;
    };

    window.addEventListener(PEAR_WORKING_EVENT, onEvent);
    return () => window.removeEventListener(PEAR_WORKING_EVENT, onEvent);
  }, [thread]);

  return (
    <div
      ref={wrapRef}
      aria-hidden
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 130, overflow: 'hidden' }}
    >
      {thread && (
        <svg
          key={thread.key}
          width="100%"
          height="100%"
          style={{ position: 'absolute', inset: 0, opacity: retracting ? 0 : 1, transition: 'opacity 480ms var(--pl-ease-out, ease-out)' }}
        >
          {/* Two strands — olive under, gold over: the brand's
              thread atom (BRAND.md §3). */}
          <path
            d={thread.d}
            fill="none"
            stroke="var(--pl-olive, #5C6B3F)"
            strokeWidth={2}
            strokeLinecap="round"
            opacity={0.45}
            strokeDasharray={thread.length}
            strokeDashoffset={thread.length}
            className="pl-rd-thread-draw"
          />
          <path
            d={thread.d}
            fill="none"
            stroke="var(--pl-gold, #C19A4B)"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeDasharray={`6 ${thread.length}`}
            className="pl-rd-thread-shimmer"
            style={{ ['--pl-rd-thread-len' as string]: `${thread.length}px` }}
          />
          <path
            d={thread.d}
            fill="none"
            stroke="var(--pl-gold, #C19A4B)"
            strokeWidth={1.4}
            strokeLinecap="round"
            opacity={0.9}
            strokeDasharray={thread.length}
            strokeDashoffset={thread.length}
            className="pl-rd-thread-draw"
            style={{ animationDelay: '90ms' }}
          />
          {/* The pearl shuttle — pulses at the tip while Pear works. */}
          <circle
            cx={thread.tip.x}
            cy={thread.tip.y}
            r={5}
            fill="var(--pl-gold, #C19A4B)"
            stroke="var(--pl-cream, #FDFAF0)"
            strokeWidth={2}
            className="pl-rd-shuttle"
          />
        </svg>
      )}
      {sweep > 0 && (
        <div key={sweep} className="pl-rd-dye-sweep" />
      )}
    </div>
  );
}
