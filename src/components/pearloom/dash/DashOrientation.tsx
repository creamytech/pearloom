'use client';

/* ========================================================================
   DashOrientation — a one-time, four-stop first-visit walkthrough of the
   dashboard's geography, drawn with the brand's gold thread.

   • Shows once per device (localStorage 'pl-orientation-done'), and never
     for established hosts — accounts that already own 2+ sites get the
     key stamped silently.
   • Desktop (sidebar visible, >960px): a floating glass caption card sits
     beside each of four sidebar items (My sites → Guests → Day → Memory);
     a gold-hairline ring rests over the item and a short two-strand
     olive + gold thread draws from the card toward it (the DashSubNav
     active-underline language). Items are found via the data-orient
     attributes NavLink stamps in DashShell.
   • Mobile (≤960px, sidebar in a drawer): one centered glass sheet with a
     vertical two-strand thread connecting the four rows.
   • Skip / Esc / backdrop tap / completing all set the key — dismissal is
     always permanent. The backdrop is a light ink wash, never a blackout.
   • Honours prefers-reduced-motion: no thread draw, no entry fade —
     everything lands instantly.
   ======================================================================== */

import { useEffect, useState } from 'react';
import { useUserSites } from '@/components/marketing/design/dash/hooks';

const DONE_KEY = 'pl-orientation-done';

type OrientId = 'site' | 'guests' | 'day' | 'memory';

interface OrientStop {
  id: OrientId;
  title: string;
  body: string;
}

const STOPS: OrientStop[] = [
  {
    id: 'site',
    title: 'Your site lives here',
    body: 'Every site you’ve woven, open one to edit, press, and share.',
  },
  {
    id: 'guests',
    title: 'Your guests gather here',
    body: 'The roster, the replies, and your messages, all in one room.',
  },
  {
    id: 'day',
    title: 'The day itself runs from here',
    body: 'Timeline and seating for the day you’ve been planning.',
  },
  {
    id: 'memory',
    title: 'And afterwards, the memories',
    body: 'Keepsakes and the memory book, gathered once the day is done.',
  },
];

function readDone(): boolean {
  try {
    return window.localStorage.getItem(DONE_KEY) === '1';
  } catch {
    return false;
  }
}

function markDone(): void {
  try {
    window.localStorage.setItem(DONE_KEY, '1');
  } catch {
    /* Private mode — the walkthrough simply won't persist its state. */
  }
}

interface AnchorRect {
  top: number;
  left: number;
  right: number;
  width: number;
  height: number;
  /** Viewport height captured at measure time so render never reads window. */
  vh: number;
}

const CARD_WIDTH = 296;
/** Gap between the sidebar item's right edge and the card's left edge —
 *  the lane the two-strand thread draws across. */
const THREAD_LANE = 34;

export function DashOrientation() {
  const { sites } = useUserSites();
  // Lazy init: SSR renders as dismissed (output is null during hydration
  // anyway — sites is null until the client fetch resolves).
  const [dismissed, setDismissed] = useState<boolean>(
    () => typeof window === 'undefined' || readDone(),
  );
  const [isMobile, setIsMobile] = useState<boolean>(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 960px)').matches,
  );
  const [reduced, setReduced] = useState<boolean>(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<AnchorRect | null>(null);
  // The step whose thread has been given permission to draw. Lags one
  // frame behind `step` so the strands mount at scaleX(0) and transition
  // to full width (rAF, not sync setState — React Compiler friendly).
  const [drawnStep, setDrawnStep] = useState(-1);

  // Established hosts (2+ sites) skip the tour entirely, forever.
  const established = sites !== null && sites.length >= 2;
  const show = !dismissed && sites !== null && !established;

  useEffect(() => {
    if (established && !readDone()) markDone();
  }, [established]);

  // Track the drawer breakpoint + reduced-motion preference live.
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 960px)');
    const rq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMq = () => setIsMobile(mq.matches);
    const onRq = () => setReduced(rq.matches);
    mq.addEventListener('change', onMq);
    rq.addEventListener('change', onRq);
    return () => {
      mq.removeEventListener('change', onMq);
      rq.removeEventListener('change', onRq);
    };
  }, []);

  // Esc ends it permanently, same as Skip / backdrop.
  useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        markDone();
        setDismissed(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [show]);

  // Measure the current stop's sidebar item (desktop only) + re-measure
  // on resize. Measurement happens inside rAF, never during render.
  useEffect(() => {
    if (!show || isMobile) return;
    let raf = 0;
    const measure = () => {
      const el = document.querySelector<HTMLElement>(`[data-orient="${STOPS[step].id}"]`);
      if (!el) {
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setRect({
        top: r.top,
        left: r.left,
        right: r.right,
        width: r.width,
        height: r.height,
        vh: window.innerHeight,
      });
    };
    raf = requestAnimationFrame(measure);
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, [show, isMobile, step]);

  // Give the new step's thread its draw cue one painted frame later so
  // the scaleX(0) → scaleX(1) transition actually runs.
  useEffect(() => {
    if (!show || isMobile) return;
    let r2 = 0;
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => setDrawnStep(step));
    });
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
    };
  }, [show, isMobile, step]);

  if (!show) return null;

  const dismiss = () => {
    markDone();
    setDismissed(true);
  };

  const stop = STOPS[step];
  const last = step === STOPS.length - 1;
  const entryAnim = reduced ? undefined : 'pl-enter-fade-in 220ms ease both';

  /* ── Shared bits ─────────────────────────────────────────────── */

  const eyebrow = (text: string) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
      }}
    >
      {/* Leading 1px gold rule — the mono-label pairing from BRAND §4. */}
      <span aria-hidden style={{ width: 14, height: 1, background: 'var(--gold, #c19a4b)' }} />
      <span
        style={{
          fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
          fontSize: 9.5,
          fontWeight: 700,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'var(--ink-muted)',
        }}
      >
        {text}
      </span>
    </div>
  );

  const primaryBtn = (label: string, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      autoFocus
      style={{
        appearance: 'none',
        border: 'none',
        cursor: 'pointer',
        background: 'var(--ink)',
        color: 'var(--cream)',
        borderRadius: 999,
        padding: '7px 18px',
        fontSize: 13,
        fontWeight: 600,
        fontFamily: 'inherit',
      }}
    >
      {label}
    </button>
  );

  const skipBtn = (
    <button
      type="button"
      onClick={dismiss}
      style={{
        appearance: 'none',
        border: 'none',
        cursor: 'pointer',
        background: 'transparent',
        color: 'var(--ink-muted)',
        fontSize: 12.5,
        fontWeight: 500,
        padding: '7px 8px',
        fontFamily: 'inherit',
      }}
    >
      Skip
    </button>
  );

  /* ── Mobile: one centered glass sheet ────────────────────────── */

  if (isMobile) {
    return (
      <div
        onClick={dismiss}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 95,
          background: 'rgba(14,13,11,0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}
      >
        <div
          role="dialog"
          aria-label="Getting around"
          className="pl-glass-surface"
          onClick={(e) => e.stopPropagation()}
          style={{
            width: 'min(92vw, 360px)',
            borderRadius: 18,
            padding: '22px 22px 18px',
            animation: entryAnim,
          }}
        >
          {eyebrow('Getting around')}
          <div style={{ position: 'relative', paddingLeft: 26, margin: '14px 0 18px' }}>
            {/* Vertical two-strand thread — olive with a gold echo. */}
            <span
              aria-hidden
              style={{
                position: 'absolute',
                left: 4,
                top: 10,
                bottom: 10,
                width: 2,
                borderRadius: 2,
                background: 'var(--sage-deep, var(--pl-olive, #5c6b3f))',
              }}
            />
            <span
              aria-hidden
              style={{
                position: 'absolute',
                left: 8,
                top: 14,
                bottom: 14,
                width: 1,
                borderRadius: 2,
                background: 'var(--gold, #c19a4b)',
                opacity: 0.65,
              }}
            />
            {STOPS.map((s) => (
              <div key={s.id} style={{ position: 'relative', padding: '7px 0' }}>
                {/* Gold pearl dot on the thread. */}
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    left: -26,
                    top: 14,
                    width: 9,
                    height: 9,
                    borderRadius: 999,
                    background: 'var(--gold, #c19a4b)',
                    boxShadow: '0 0 0 3px var(--cream)',
                  }}
                />
                <div className="display-italic" style={{ fontSize: 17, lineHeight: 1.25, color: 'var(--ink)' }}>
                  {s.title}
                </div>
                <div style={{ fontSize: 12.5, lineHeight: 1.45, color: 'var(--ink-soft)', marginTop: 2 }}>
                  {s.body}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            {primaryBtn('Got it', dismiss)}
          </div>
        </div>
      </div>
    );
  }

  /* ── Desktop: caption card beside the sidebar item ───────────── */

  const anchorY = rect ? rect.top + rect.height / 2 : 220;
  const vh = rect?.vh ?? 800;
  const cardLeft = rect ? rect.right + THREAD_LANE : 300;
  const cardTop = Math.max(120, Math.min(anchorY, vh - 140));
  const drawn = drawnStep === step;
  const moveTransition = reduced
    ? undefined
    : 'top 300ms var(--pl-ease-out, ease), left 300ms var(--pl-ease-out, ease), width 300ms var(--pl-ease-out, ease), height 300ms var(--pl-ease-out, ease)';

  return (
    <div
      onClick={dismiss}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 95,
        background: 'rgba(14,13,11,0.18)',
        animation: entryAnim,
      }}
    >
      {rect && (
        <>
          {/* Soft highlight ring over the sidebar item — gold hairline
              plus a faint sage tint, radius matching the nav pill. */}
          <div
            aria-hidden
            style={{
              position: 'fixed',
              top: rect.top - 3,
              left: rect.left - 3,
              width: rect.width + 6,
              height: rect.height + 6,
              borderRadius: 12,
              border: '1px solid var(--gold, #c19a4b)',
              background: 'rgba(139,156,90,0.10)' /* faint --sage wash */,
              pointerEvents: 'none',
              transition: moveTransition,
            }}
          />
          {/* Two-strand thread — olive 2px with a gold 1px echo, drawing
              from the card toward the item (DashSubNav's underline
              language, turned sideways). */}
          <span
            aria-hidden
            style={{
              position: 'fixed',
              top: anchorY - 1,
              left: rect.right + 7,
              width: THREAD_LANE - 13,
              height: 2,
              borderRadius: 2,
              background: 'var(--sage-deep, var(--pl-olive, #5c6b3f))',
              transform: drawn || reduced ? 'scaleX(1)' : 'scaleX(0)',
              transformOrigin: 'right',
              transition: reduced
                ? undefined
                : 'transform 300ms var(--pl-ease-emphasis, cubic-bezier(0.16,1,0.3,1)), top 300ms var(--pl-ease-out, ease), left 300ms var(--pl-ease-out, ease)',
              pointerEvents: 'none',
            }}
          />
          <span
            aria-hidden
            style={{
              position: 'fixed',
              top: anchorY + 2,
              left: rect.right + 9,
              width: THREAD_LANE - 17,
              height: 1,
              borderRadius: 2,
              background: 'var(--gold, #c19a4b)',
              opacity: 0.65,
              transform: drawn || reduced ? 'scaleX(1)' : 'scaleX(0)',
              transformOrigin: 'right',
              transition: reduced
                ? undefined
                : 'transform 300ms var(--pl-ease-emphasis, cubic-bezier(0.16,1,0.3,1)) 40ms, top 300ms var(--pl-ease-out, ease), left 300ms var(--pl-ease-out, ease)',
              pointerEvents: 'none',
            }}
          />
        </>
      )}

      <div
        role="dialog"
        aria-label="Getting around"
        className="pl-glass-surface"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          left: cardLeft,
          top: cardTop,
          transform: 'translateY(-50%)',
          width: CARD_WIDTH,
          borderRadius: 16,
          padding: '18px 20px 16px',
          transition: moveTransition,
        }}
      >
        {eyebrow(`Getting around · ${step + 1} of 4`)}
        <div className="display-italic" style={{ fontSize: 21, lineHeight: 1.2, color: 'var(--ink)' }}>
          {stop.title}
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--ink-soft)', marginTop: 6 }}>
          {stop.body}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 6,
            marginTop: 14,
          }}
        >
          {skipBtn}
          {primaryBtn(last ? 'Begin' : 'Next', () => {
            if (last) dismiss();
            else setStep(step + 1);
          })}
        </div>
      </div>
    </div>
  );
}
