'use client';

// ─────────────────────────────────────────────────────────────
// FirstThreadTour — three-step guided welcome for the editor.
//
// Fires once per browser when the user opens the editor for
// the first time on a given site. Spotlights three concrete
// affordances with a 1px peach-ink ring around the target and
// a dim-everywhere-else mask in between, so the user's eye
// goes where Pear is pointing.
//
// Steps (in keeping with BRAND.md §2's weaving metaphor):
//   1. "Welcome to your loom." — full-screen letter-press card,
//      no anchor, sets the tone.
//   2. "Click anywhere to edit." — anchored to the first
//      [data-pe-section] (typically the hero) so the user
//      sees the surface that's about to become editable.
//   3. "Press it when you're ready." — anchored to the
//      [data-tour-anchor="publish"] button in the topbar.
//
// Persisted in localStorage under PEARLOOM_FIRST_THREAD_KEY so
// it never bothers a returning user. A "skip" pill in the card
// jumps to completion.
// ─────────────────────────────────────────────────────────────

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const PEARLOOM_FIRST_THREAD_KEY = 'pearloom:first-thread:v1';
const SHOW_DELAY_MS = 1400;
// Skip on small viewports — the spotlight + card combo crowds
// out a phone screen, and the editor itself isn't the primary
// flow there anyway.
const MIN_VIEWPORT_PX = 720;

interface TourStep {
  id: string;
  /** CSS selector for the spotlit element. null = no spotlight (intro). */
  anchor: string | null;
  title: string;
  body: string;
  /** Where the card sits relative to the anchor. */
  cardSide?: 'below' | 'above' | 'left' | 'center';
}

const STEPS: TourStep[] = [
  {
    id: 'welcome',
    anchor: null,
    title: 'Welcome to your loom.',
    body: "Pear has woven a first draft. Now we'll walk you through how to make it yours — three steps, under a minute.",
    cardSide: 'center',
  },
  {
    id: 'edit',
    anchor: '[data-pe-section]',
    title: 'Click anything to edit.',
    body: 'Headlines, dates, photos, the whole story. There are no separate "edit modes" — every word on the canvas is editable.',
    cardSide: 'below',
  },
  {
    id: 'publish',
    anchor: '[data-tour-anchor="publish"]',
    title: 'Press it when you’re ready.',
    body: 'Save & publish prints your site to its final URL. You can come back any time to thread in more.',
    cardSide: 'left',
  },
];

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function FirstThreadTour({ siteSlug }: { siteSlug: string }) {
  const [stepIdx, setStepIdx] = useState(-1); // -1 = not yet shown
  const [anchorRect, setAnchorRect] = useState<Rect | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  // Decide whether to fire once on mount. Skips when:
  //   - The user has already seen this tour (localStorage)
  //   - The viewport is too small for a meaningful spotlight
  //   - localStorage is unavailable (private mode) — fail safe
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.innerWidth < MIN_VIEWPORT_PX) return;
    try {
      if (localStorage.getItem(PEARLOOM_FIRST_THREAD_KEY)) return;
    } catch {
      return;
    }
    const t = setTimeout(() => setStepIdx(0), SHOW_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  // Whenever the step changes, re-resolve the anchor element and
  // recalc its rect. Re-runs on resize + scroll so the spotlight
  // tracks the element if the user scrolls before clicking next.
  useLayoutEffect(() => {
    if (stepIdx < 0) return;
    const step = STEPS[stepIdx];
    if (!step.anchor) {
      setAnchorRect(null);
      return;
    }
    function update() {
      const el = document.querySelector(step.anchor as string) as HTMLElement | null;
      if (!el) {
        setAnchorRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setAnchorRect({
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
      });
      // Bring the anchor into view so the spotlight is on-screen.
      const inView = r.top >= 0 && r.bottom <= window.innerHeight;
      if (!inView) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [stepIdx]);

  if (stepIdx < 0) return null;
  const step = STEPS[stepIdx];
  const isLast = stepIdx === STEPS.length - 1;

  function complete() {
    try {
      localStorage.setItem(PEARLOOM_FIRST_THREAD_KEY, '1');
    } catch {
      // Private mode — tour will fire again next session, that's fine.
    }
    setStepIdx(-2); // unmount
  }

  function next() {
    if (isLast) complete();
    else setStepIdx((i) => i + 1);
  }

  // Card position derived from anchor + chosen side.
  const cardStyle: React.CSSProperties = (() => {
    const PAD = 16;
    const CARD_W = 360;
    if (!anchorRect || step.cardSide === 'center') {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: Math.min(CARD_W, window.innerWidth - 48),
      };
    }
    if (step.cardSide === 'below') {
      return {
        top: anchorRect.top + anchorRect.height + PAD,
        left: Math.max(
          PAD,
          Math.min(
            anchorRect.left + anchorRect.width / 2 - CARD_W / 2,
            window.innerWidth - CARD_W - PAD,
          ),
        ),
        width: CARD_W,
      };
    }
    if (step.cardSide === 'above') {
      return {
        top: Math.max(PAD, anchorRect.top - PAD - 200),
        left: Math.max(
          PAD,
          Math.min(
            anchorRect.left + anchorRect.width / 2 - CARD_W / 2,
            window.innerWidth - CARD_W - PAD,
          ),
        ),
        width: CARD_W,
      };
    }
    // left
    return {
      top: Math.max(PAD, anchorRect.top + anchorRect.height / 2 - 80),
      left: Math.max(PAD, anchorRect.left - CARD_W - PAD),
      width: CARD_W,
    };
  })();

  return (
    <div
      role="dialog"
      aria-label="Editor walkthrough"
      aria-modal="false"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9990,
        pointerEvents: 'none',
      }}
    >
      {/* Mask: dim everywhere except the spotlight box. SVG mask
          gives a soft 12px-radius window with a glowing peach
          hairline so it reads as Pear pointing rather than
          aggressive lockdown. */}
      <SpotlightMask rect={anchorRect} />

      {/* Card — pearl background, letterpress title, two paragraphs
          of body, dot indicator + skip + next. */}
      <div
        ref={cardRef}
        style={{
          position: 'absolute',
          background: 'var(--cream-card, #FBF7EE)',
          color: 'var(--ink, #0E0D0B)',
          borderRadius: 14,
          padding: '20px 22px 16px',
          boxShadow:
            '0 24px 60px rgba(14,13,11,0.32), 0 0 0 1px rgba(184,147,90,0.30)',
          fontFamily: 'var(--font-ui)',
          pointerEvents: 'auto',
          ...cardStyle,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--peach-ink, #C6703D)',
            marginBottom: 8,
          }}
        >
          The first thread · {stepIdx + 1} of {STEPS.length}
        </div>
        <h2
          style={{
            fontFamily: 'var(--font-display, "Fraunces", serif)',
            fontSize: 24,
            fontWeight: 600,
            lineHeight: 1.12,
            margin: '0 0 10px',
            letterSpacing: '-0.01em',
          }}
        >
          {step.title}
        </h2>
        <p
          style={{
            fontSize: 13.5,
            lineHeight: 1.55,
            color: 'var(--ink-soft, #3A332C)',
            margin: '0 0 16px',
          }}
        >
          {step.body}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', gap: 5 }} aria-hidden>
            {STEPS.map((_, i) => (
              <span
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  background:
                    i === stepIdx
                      ? 'var(--peach-ink, #C6703D)'
                      : 'rgba(14,13,11,0.18)',
                  transition: 'background 180ms ease',
                }}
              />
            ))}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={complete}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--ink-muted, #6F6557)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                padding: '6px 8px',
                fontFamily: 'inherit',
              }}
            >
              Skip
            </button>
            <button
              type="button"
              onClick={next}
              className="pl-pearl-accent"
              style={{
                padding: '8px 16px',
                borderRadius: 999,
                fontSize: 12.5,
                fontWeight: 700,
                fontFamily: 'inherit',
                cursor: 'pointer',
                border: 'none',
              }}
            >
              {isLast ? 'Begin a thread' : 'Next'}
            </button>
          </div>
        </div>
      </div>
      {/* Force-mount this so the localStorage write happens on the
          right siteSlug — it doesn't, currently, scope by slug, but
          we keep the prop for a future "tour per template" pass. */}
      <span style={{ display: 'none' }} aria-hidden>
        {siteSlug}
      </span>
    </div>
  );
}

function SpotlightMask({ rect }: { rect: Rect | null }) {
  // No anchor → solid scrim only (intro / outro steps).
  if (!rect) {
    return (
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(14,13,11,0.46)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
          transition: 'background 220ms ease',
        }}
      />
    );
  }
  // Spotlight cutout via clip-path with two rectangles in
  // even-odd fill rule. The hole tracks the anchor; a 1px
  // peach-ink ring sits exactly on the cutout boundary.
  const PAD = 8;
  const RADIUS = 12;
  const x = rect.left - PAD;
  const y = rect.top - PAD;
  const w = rect.width + PAD * 2;
  const h = rect.height + PAD * 2;
  return (
    <>
      <svg
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          transition: 'opacity 180ms ease',
        }}
      >
        <defs>
          <mask id="pl-tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect
              x={x}
              y={y}
              width={w}
              height={h}
              rx={RADIUS}
              ry={RADIUS}
              fill="black"
            />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(14,13,11,0.55)"
          mask="url(#pl-tour-mask)"
        />
      </svg>
      {/* 1px peach-ink ring on the cutout edge. */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: y,
          left: x,
          width: w,
          height: h,
          borderRadius: RADIUS,
          boxShadow:
            '0 0 0 1.5px var(--peach-ink, #C6703D), 0 0 28px rgba(198,112,61,0.45)',
          pointerEvents: 'none',
          transition: 'top 220ms ease, left 220ms ease, width 220ms ease, height 220ms ease',
        }}
      />
    </>
  );
}
