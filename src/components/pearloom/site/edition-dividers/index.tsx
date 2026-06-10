'use client';

// ─────────────────────────────────────────────────────────────
// edition-dividers — the rule between sections that gives an
// Edition its visual rhythm. Picked by the active Edition's
// `divider` field; mounted in ThemedSiteRenderer via
// EditionDivider which dispatches by style id.
//
// Each divider is full-width, ~24-72px tall depending on style,
// and is decorative. They should be the only chrome between
// sections so consecutive sections feel like consecutive
// chapters of the same edition.
//
// Scroll-reveal: each divider wraps itself in a useScrollReveal
// hook that toggles data-pl-revealed="true" via
// IntersectionObserver the first time the divider enters the
// viewport. The actual animation lives in pearloom.css off the
// data attribute — keep this file purely structural.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';
import type { DividerStyle } from '@/lib/site-editions/types';

// useScrollReveal — toggles data-pl-revealed="true" on the
// returned ref the first time it intersects the viewport. We
// inline it here (rather than promote to /lib) because the
// dividers are the only consumers and the body is six lines.
function useScrollReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // SSR / no-IO browser fallback: reveal immediately so the
    // divider never gets stuck pre-animation.
    if (typeof IntersectionObserver === 'undefined') {
      el.dataset.plRevealed = 'true';
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset.plRevealed = 'true';
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.4, rootMargin: '0px 0px -10% 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

// ── Almanac — Single hairline thread ─────────────────────────
// Reveals by fading in + drawing the 1px stroke from center-out
// via background-size animation off [data-pl-revealed].
function ThreadDivider() {
  const ref = useScrollReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      aria-hidden
      className="pl8-divider"
      data-pl-divider-style="thread"
      style={{
        margin: 'clamp(40px, 6vw, 64px) auto',
        width: 'min(640px, 80%)',
        height: 1,
        background:
          'linear-gradient(to right, transparent 0%, var(--ink-muted, #6F6557) 30%, var(--ink-muted, #6F6557) 70%, transparent 100%)',
        opacity: 0.35,
      }}
    />
  );
}

// ── Cinema — Sprocket-style row ──────────────────────────────
// Reveals by staggered opacity pulse across each sprocket
// (--pl-sprocket-i sets the per-child delay).
function SprocketDivider() {
  const ref = useScrollReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      aria-hidden
      className="pl8-divider"
      data-pl-divider-style="sprocket"
      style={{
        margin: 'clamp(48px, 7vw, 72px) auto',
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        gap: 8,
      }}
    >
      {Array.from({ length: 24 }).map((_, i) => (
        <span
          key={i}
          className="pl8-divider-sprocket-tooth"
          style={
            {
              width: 6,
              height: 4,
              background: 'var(--ink, #0E0D0B)',
              opacity: 0.32,
              '--pl-sprocket-i': i,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

// ── Postcard Box — Thread-stitch dashed ──────────────────────
// Reveals by self-tracing left → right via clip-path inset.
function StitchDivider() {
  const ref = useScrollReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      aria-hidden
      className="pl8-divider"
      data-pl-divider-style="stitch"
      style={{
        margin: 'clamp(40px, 6vw, 64px) auto',
        width: 'min(720px, 88%)',
        height: 1,
        backgroundImage:
          'repeating-linear-gradient(to right, var(--peach-ink, #C6703D) 0, var(--peach-ink, #C6703D) 6px, transparent 6px, transparent 12px)',
        opacity: 0.55,
      }}
    />
  );
}

// ── Linen Folder — Centered gold hairline ────────────────────
// Reveals by scale-from-center, width 0 → 80px.
function GoldHairlineDivider() {
  const ref = useScrollReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      aria-hidden
      className="pl8-divider"
      data-pl-divider-style="gold-hairline"
      style={{
        margin: 'clamp(48px, 7vw, 72px) auto',
        width: 80,
        height: 1,
        background: 'var(--gold, #C19A4B)',
      }}
    />
  );
}

// ── Quiet — Whitespace only ──────────────────────────────────
// Intentional restraint: no animation. The pause IS the divider.
function WhitespaceDivider() {
  return (
    <div
      aria-hidden
      className="pl8-divider"
      data-pl-divider-style="whitespace"
      style={{
        margin: 'clamp(64px, 9vw, 96px) auto',
        height: 0,
      }}
    />
  );
}

// ── Dispatcher ───────────────────────────────────────────────
const DIVIDERS: Record<DividerStyle, () => React.ReactElement> = {
  thread: ThreadDivider,
  sprocket: SprocketDivider,
  stitch: StitchDivider,
  'gold-hairline': GoldHairlineDivider,
  whitespace: WhitespaceDivider,
};

export function EditionDivider({ style }: { style: DividerStyle }) {
  const Component = DIVIDERS[style] ?? DIVIDERS.thread;
  return <Component />;
}
