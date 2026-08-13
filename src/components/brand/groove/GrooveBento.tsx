'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / brand/groove/GrooveBento.tsx
//
// Asymmetric feature grid — the groove equivalent of
// Aceternity UI's Bento Grid, rebuilt on our tokens.
//
// Three-row desktop layout: large hero tile + two medium tiles
// + three small tiles. Mobile collapses to a single column.
// Each cell animates in on scroll via <BlurFade>, hovers with
// a lift + gradient wash. Use for marketing feature sections
// and dashboard empty states.
// ─────────────────────────────────────────────────────────────

import type { CSSProperties, ReactNode } from 'react';
import { BlurFade } from './BlurFade';

export interface GrooveBentoCell {
  id: string;
  /** Column span on desktop: 1 | 2 | 3 — supports 3-col grids. */
  colSpan?: 1 | 2 | 3;
  /** Row span on desktop: 1 | 2. */
  rowSpan?: 1 | 2;
  /** Card tint — maps to a groove palette soft wash. */
  tone?: 'cream' | 'butter' | 'sage' | 'rose' | 'terra' | 'plum';
  /** Optional eyebrow mono label. */
  eyebrow?: string;
  /** Big italic title. */
  title: ReactNode;
  /** Body copy — 1-2 sentences. */
  body?: ReactNode;
  /** Any decorative illustration / photo / blob / chart. */
  decoration?: ReactNode;
  /** If set, the tile is a link/button. */
  onClick?: () => void;
  /** Any extra content below the body. */
  footer?: ReactNode;
}

interface GrooveBentoProps {
  cells: GrooveBentoCell[];
  /** Visible columns on desktop. Mobile always collapses to 1. */
  columns?: 3 | 4;
  style?: CSSProperties;
  className?: string;
}

const TONE_WASH: Record<NonNullable<GrooveBentoCell['tone']>, string> = {
  cream:  'var(--pl-groove-cream)',
  butter: 'color-mix(in oklab, var(--pl-groove-butter) 22%, var(--pl-groove-cream))',
  sage:   'color-mix(in oklab, var(--pl-groove-sage) 20%, var(--pl-groove-cream))',
  rose:   'color-mix(in oklab, var(--pl-groove-rose) 24%, var(--pl-groove-cream))',
  terra:  'color-mix(in oklab, var(--pl-groove-terra) 16%, var(--pl-groove-cream))',
  plum:   'color-mix(in oklab, var(--pl-groove-plum) 14%, var(--pl-groove-cream))',
};

const TONE_ACCENT: Record<NonNullable<GrooveBentoCell['tone']>, string> = {
  cream:  'var(--pl-groove-terra)',
  butter: 'var(--pl-groove-terra)',
  sage:   'var(--pl-groove-sage)',
  rose:   'var(--pl-groove-plum)',
  terra:  'var(--pl-groove-terra)',
  plum:   'var(--pl-groove-plum)',
};

export function GrooveBento({ cells, columns = 3, style, className }: GrooveBentoProps) {
  return (
    <div
      className={className}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gridAutoRows: 'minmax(220px, auto)',
        gap: 18,
        ...style,
      }}
    >
      {cells.map((cell, i) => {
        const tone = cell.tone ?? 'cream';
        const accent = TONE_ACCENT[tone];
        const isInteractive = !!cell.onClick;
        return (
          <BlurFade key={cell.id} delay={0.05 + i * 0.06} distance={18}>
            <div
              role={isInteractive ? 'button' : undefined}
              tabIndex={isInteractive ? 0 : undefined}
              onClick={cell.onClick}
              onKeyDown={
                isInteractive
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        cell.onClick?.();
                      }
                    }
                  : undefined
              }
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 18,
                padding: 'clamp(20px, 3vw, 28px)',
                gridColumn: cell.colSpan ? `span ${cell.colSpan}` : undefined,
                gridRow: cell.rowSpan ? `span ${cell.rowSpan}` : undefined,
                borderRadius: 28,
                background: TONE_WASH[tone],
                border: `1px solid color-mix(in oklab, ${accent} 22%, transparent)`,
                color: 'var(--pl-groove-ink)',
                overflow: 'hidden',
                cursor: isInteractive ? 'pointer' : undefined,
                boxShadow:
                  '0 1px 2px rgba(43,30,20,0.04), 0 14px 40px rgba(139,74,106,0.05)',
                transition:
                  'transform var(--pl-dur-base) var(--pl-groove-ease-bloom),' +
                  ' box-shadow var(--pl-dur-base) var(--pl-ease-out),' +
                  ' border-color var(--pl-dur-fast) var(--pl-ease-out)',
              }}
              onMouseEnter={(e) => {
                if (!isInteractive) return;
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow =
                  '0 4px 10px rgba(43,30,20,0.05), 0 24px 56px rgba(139,74,106,0.14)';
                e.currentTarget.style.borderColor =
                  `color-mix(in oklab, ${accent} 48%, transparent)`;
              }}
              onMouseLeave={(e) => {
                if (!isInteractive) return;
                e.currentTarget.style.transform = '';
                e.currentTarget.style.boxShadow =
                  '0 1px 2px rgba(43,30,20,0.04), 0 14px 40px rgba(139,74,106,0.05)';
                e.currentTarget.style.borderColor =
                  `color-mix(in oklab, ${accent} 22%, transparent)`;
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {cell.eyebrow && (
                  <span
                    style={{
                      fontFamily: 'var(--pl-font-mono)',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      letterSpacing: '0.2em',
                      textTransform: 'uppercase',
                      color: accent,
                    }}
                  >
                    {cell.eyebrow}
                  </span>
                )}
                <h3
                  className="pl-display"
                  style={{
                    margin: 0,
                    fontStyle: 'italic',
                    fontSize: 'clamp(1.3rem, 2.4vw, 1.9rem)',
                    lineHeight: 1.1,
                    letterSpacing: '-0.01em',
                    fontVariationSettings: '"opsz" 96, "SOFT" 80, "WONK" 1',
                    color: 'var(--pl-groove-ink)',
                  }}
                >
                  {cell.title}
                </h3>
                {cell.body && (
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.95rem',
                      lineHeight: 1.55,
                      color: 'color-mix(in oklab, var(--pl-groove-ink) 76%, transparent)',
                    }}
                  >
                    {cell.body}
                  </p>
                )}
              </div>

              {cell.decoration && (
                <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
                  {cell.decoration}
                </div>
              )}
              {cell.footer && <div>{cell.footer}</div>}
            </div>
          </BlurFade>
        );
      })}
    </div>
  );
}
