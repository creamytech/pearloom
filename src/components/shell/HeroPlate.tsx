'use client';

// ─────────────────────────────────────────────────────────────
// HeroPlate — the pressed plate (TASTE-PLAN T.3). One focal
// surface per route: a fixed deep-olive ground (dark in both
// themes, like a press plate), linen underlay, gold mono eyebrow,
// big Fraunces display, soft supporting line, optional letterpress
// figures and actions. Generalized from Home's HeroBanner
// (cockpit.tsx) — that richer instance (countdown, cover photo)
// stays where it is; every other route mounts THIS in place of its
// quiet header so the screen has a hierarchy: one plate, then
// paper.
//
// Rules: one per route, never two; utility surfaces (settings,
// help) stay plateless; figures are REAL numbers only — zeros
// don't render (the cockpit honesty rule).
// ─────────────────────────────────────────────────────────────

import { CSSProperties, ReactNode } from 'react';

const PLATE_BG = 'linear-gradient(150deg, #37421F 0%, #2A331A 46%, #1E2513 100%)';
const PLATE_GOLD = '#DDB768';
const PLATE_CREAM = '#F7F2E6';
const PLATE_SOFT = 'rgba(247,242,230,0.72)';
const PLATE_LINEN =
  'repeating-linear-gradient(0deg, rgba(247,242,230,0.05) 0 1px, transparent 1px 5px), repeating-linear-gradient(90deg, rgba(247,242,230,0.05) 0 1px, transparent 1px 5px)';
const MONO = 'var(--pl-font-mono, ui-monospace, monospace)';
const DISPLAY = 'var(--font-display, "Fraunces", Georgia, serif)';

export interface HeroPlateFigure {
  label: string;
  /** Pre-formatted display value ("124", "$8,200"). */
  value: string;
  /** Zero-collapse: pass the raw number when you have one — 0 hides
   *  the figure (real numbers only on the plate). */
  raw?: number;
}

export function HeroPlate({
  eyebrow,
  title,
  sub,
  figures,
  actions,
  style,
}: {
  /** Mono-caps gold line, e.g. "GUESTS · 12 DAYS TO GO". */
  eyebrow?: ReactNode;
  /** The display line. Italic accents welcome:
   *  <>The guest <i>list.</i></> */
  title: ReactNode;
  /** One soft supporting line (or a couple of short lines). */
  sub?: ReactNode;
  /** Letterpress figures row — real numbers only. */
  figures?: HeroPlateFigure[];
  /** Buttons row. On the plate, light buttons read best. */
  actions?: ReactNode;
  style?: CSSProperties;
}) {
  const figs = (figures ?? []).filter((f) => f.raw === undefined || f.raw > 0);
  return (
    <section
      style={{
        borderRadius: 'var(--r-md, 20px)',
        overflow: 'hidden',
        background: PLATE_BG,
        color: PLATE_CREAM,
        position: 'relative',
        boxShadow: 'var(--shadow-md, 0 18px 48px -24px rgba(20,24,12,0.55))',
        ...style,
      }}
    >
      <div
        aria-hidden
        style={{ position: 'absolute', inset: 0, opacity: 0.5, pointerEvents: 'none', backgroundImage: PLATE_LINEN, backgroundSize: '5px 5px' }}
      />
      <div style={{ position: 'relative', padding: 'clamp(22px, 2.6vw, 34px) clamp(22px, 3vw, 38px)' }}>
        {eyebrow && (
          <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.2em', textTransform: 'uppercase', color: PLATE_GOLD, marginBottom: 12 }}>
            {eyebrow}
          </div>
        )}
        <h1
          style={{
            fontFamily: DISPLAY,
            fontSize: 'clamp(30px, 4vw, 46px)',
            fontOpticalSizing: 'auto',
            lineHeight: 1.02,
            fontWeight: 400,
            letterSpacing: '-0.02em',
            color: PLATE_CREAM,
            margin: 0,
          }}
        >
          {title}
        </h1>
        {sub && (
          <div style={{ fontSize: 14, color: PLATE_SOFT, marginTop: 10, lineHeight: 1.5, maxWidth: 560 }}>
            {sub}
          </div>
        )}
        {figs.length > 0 && (
          <div style={{ display: 'flex', gap: 30, marginTop: 20, flexWrap: 'wrap' }}>
            {figs.map((f) => (
              <div key={f.label}>
                <div style={{ fontFamily: DISPLAY, fontSize: 30, lineHeight: 1, color: PLATE_CREAM }}>{f.value}</div>
                <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '0.2em', textTransform: 'uppercase', color: PLATE_GOLD, marginTop: 6 }}>
                  {f.label}
                </div>
              </div>
            ))}
          </div>
        )}
        {actions && (
          <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            {actions}
          </div>
        )}
      </div>
    </section>
  );
}

/** A light button that reads on the plate — quiet cream outline. */
export function PlateAction({
  href,
  onClick,
  children,
  primary = false,
  target,
}: {
  href?: string;
  onClick?: () => void;
  children: ReactNode;
  /** Primary = cream-solid; default = outline. */
  primary?: boolean;
  target?: string;
}) {
  const styleBase: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 15px',
    borderRadius: 999,
    fontSize: 12.5,
    fontWeight: 650,
    cursor: 'pointer',
    textDecoration: 'none',
    fontFamily: 'inherit',
    background: primary ? PLATE_CREAM : 'rgba(247,242,230,0.08)',
    color: primary ? '#2A331A' : PLATE_CREAM,
    border: primary ? '1px solid transparent' : '1px solid rgba(247,242,230,0.22)',
  };
  if (href) {
    return (
      <a href={href} target={target} rel={target === '_blank' ? 'noreferrer' : undefined} style={styleBase}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} style={styleBase}>
      {children}
    </button>
  );
}
