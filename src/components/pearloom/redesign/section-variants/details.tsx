'use client';
 
/* Per-section layout variants for the Details section. The 'tiles'
   default ships inline in ThemedSite.tsx; this file adds three
   alternatives the canvas dispatches via readVariant(manifest,
   'details'). Each variant takes ctx: DetailsVariantCtx and renders
   a shared <SectionHead /> followed by its own layout body. */

import { useState, type CSSProperties } from 'react';
import type { DetailsVariantCtx } from './types';
import { Icon } from '../../motifs';
import { VariantSectionHead } from './_section-head';

function headProps(ctx: DetailsVariantCtx) {
  return {
    eyebrow: ctx.C.eyebrow, title: ctx.C.title, italic: ctx.C.italic,
    editable: ctx.editable,
    onEditEyebrow: ctx.onEditEyebrow, onEditTitle: ctx.onEditTitle,
    eyebrowPlaceholder: ctx.eyebrowPlaceholder, titlePlaceholder: ctx.titlePlaceholder,
  };
}

/* ─── DetailsIconRow — flex row of circular icon medallions, each
   stacked above a mono label + display value + optional subline. ─ */

export function DetailsIconRow({ ctx }: { ctx: DetailsVariantCtx }) {
  const { C } = ctx;
  return (
    <>
      <VariantSectionHead {...headProps(ctx)} />
      <div
        style={{
          maxWidth: 760,
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: 36,
        }}
      >
        {C.items.map((d) => (
          <div key={d.l} style={{ textAlign: 'center', minWidth: 120 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: 'var(--t-accent-bg)',
                color: 'var(--t-accent-ink)',
                display: 'grid',
                placeItems: 'center',
                margin: '0 auto 10px',
              }}
            >
              <Icon name={d.icon} size={20} />
            </div>
            <div
              style={{
                fontSize: 10,
                fontFamily: 'var(--t-mono)',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'var(--t-ink-muted)',
                marginBottom: 4,
              }}
            >
              {d.l}
            </div>
            <div
              style={{
                fontFamily: 'var(--t-display)',
                fontWeight: 'var(--t-display-wght)' as CSSProperties['fontWeight'],
                fontSize: 16,
                color: 'var(--t-ink)',
              }}
            >
              {d.v}
            </div>
            {d.s && (
              <div style={{ fontSize: 11.5, color: 'var(--t-ink-soft)', marginTop: 2 }}>{d.s}</div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

/* ─── DetailsAccordion — a REAL accordion (2026-07-02). Rows with
   a subline collapse/expand; the expanded body is the subline's
   home. Rows without a subline render flat (no lying chevron —
   the old version drew a decorative ⌄ on rows that never opened).
   No height animation, so prefers-reduced-motion needs no branch. */

export function DetailsAccordion({ ctx }: { ctx: DetailsVariantCtx }) {
  const { C } = ctx;
  /* First expandable row starts open so the variant reads as an
     accordion at a glance (editor and published alike). */
  const [open, setOpen] = useState<number | null>(() => {
    const i = C.items.findIndex((d) => (d.s ?? '').trim());
    return i >= 0 ? i : null;
  });
  return (
    <>
      <VariantSectionHead {...headProps(ctx)} />
      <div style={{ maxWidth: 620, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {C.items.map((d, i) => {
          const expandable = !!(d.s ?? '').trim();
          const isOpen = expandable && open === i;
          const head = (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'var(--t-accent-bg)',
                    color: 'var(--t-accent-ink)',
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon name={d.icon} size={14} />
                </div>
                <div style={{ minWidth: 0, textAlign: 'left' }}>
                  <div
                    style={{
                      fontSize: 10,
                      fontFamily: 'var(--t-mono)',
                      letterSpacing: '0.22em',
                      textTransform: 'uppercase',
                      color: 'var(--t-ink-muted)',
                      marginBottom: 2,
                    }}
                  >
                    {d.l}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--t-display)',
                      fontWeight: 'var(--t-display-wght)' as CSSProperties['fontWeight'],
                      fontSize: 14.5,
                      color: 'var(--t-ink)',
                    }}
                  >
                    {d.v}
                  </div>
                </div>
              </div>
              {expandable && (
                <span
                  aria-hidden
                  style={{
                    display: 'inline-flex',
                    color: 'var(--t-ink-muted)',
                    paddingLeft: 12,
                    flexShrink: 0,
                    transform: isOpen ? 'rotate(180deg)' : 'none',
                  }}
                >
                  <Icon name="chev-down" size={14} />
                </span>
              )}
            </>
          );
          const cardStyle: CSSProperties = {
            background: 'var(--t-card)',
            border: '1px solid var(--t-line)',
            borderRadius: 'var(--t-radius)',
            overflow: 'hidden',
          };
          const headStyle: CSSProperties = {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            padding: '14px 16px',
            background: 'transparent',
            border: 'none',
            font: 'inherit',
            color: 'inherit',
          };
          return (
            <div key={`${i}-${d.l}`} style={cardStyle}>
              {expandable ? (
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : i)}
                  style={{ ...headStyle, cursor: 'pointer' }}
                >
                  {head}
                </button>
              ) : (
                <div style={headStyle}>{head}</div>
              )}
              {isOpen && (
                <div
                  style={{
                    padding: '0 16px 14px 60px',
                    fontSize: 13,
                    lineHeight: 1.6,
                    color: 'var(--t-ink-soft)',
                  }}
                >
                  {d.s}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ─── DetailsLedger — a quiet ruled label/value list for the
   almanac / quiet editions: mono small-caps label, hairline rule,
   display value right-aligned, subline beneath. No icon chrome at
   all — the variant for hosts who find circles too loud. ──── */

export function DetailsLedger({ ctx }: { ctx: DetailsVariantCtx }) {
  const { C } = ctx;
  return (
    <>
      <VariantSectionHead {...headProps(ctx)} />
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        {C.items.map((d, i) => (
          <div
            key={`${i}-${d.l}`}
            style={{
              padding: '13px 2px',
              borderTop: i === 0 ? 'none' : '1px solid var(--t-line-soft)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 18 }}>
              <span
                style={{
                  fontFamily: 'var(--t-mono)',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: 'var(--t-ink-muted)',
                  whiteSpace: 'nowrap',
                }}
              >
                {d.l}
              </span>
              <span
                style={{
                  fontFamily: 'var(--t-display)',
                  fontWeight: 'var(--t-display-wght)' as CSSProperties['fontWeight'],
                  fontSize: 16,
                  color: 'var(--t-ink)',
                  textAlign: 'right',
                }}
              >
                {d.v}
              </span>
            </div>
            {(d.s ?? '').trim() && (
              <div style={{ marginTop: 3, fontSize: 12, lineHeight: 1.55, color: 'var(--t-ink-soft)', textAlign: 'right' }}>
                {d.s}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

/* ─── DetailsBento — 2-col grid, first item spans both columns on
   the accent surface; remaining items live on card surfaces. ── */

export function DetailsBento({ ctx }: { ctx: DetailsVariantCtx }) {
  const { C } = ctx;
  return (
    <>
      <VariantSectionHead {...headProps(ctx)} />
      {/* pl8-details-bento: the hero tile's `span 2` forces two
          implicit tracks even when auto-fit resolves to one, so
          pearloom.css stacks this grid to a single column on
          phones (one-word-per-line tiles otherwise). */}
      <div
        className="pl8-details-bento"
        style={{
          maxWidth: 640,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 12,
        }}
      >
        {C.items.map((d, i) => {
          const isHero = i === 0;
          return (
            <div
              key={d.l}
              style={{
                gridColumn: isHero ? 'span 2' : 'auto',
                padding: 18,
                borderRadius: 'var(--t-radius)',
                border: '1px solid var(--t-line)',
                background: isHero ? 'var(--t-accent-bg)' : 'var(--t-card)',
                color: isHero ? 'var(--t-accent-ink)' : 'var(--t-ink)',
              }}
            >
              <Icon name={d.icon} size={28} color={isHero ? 'var(--t-accent-ink)' : 'var(--t-ink)'} />
              <div
                style={{
                  fontFamily: 'var(--t-display)',
                  fontWeight: 'var(--t-display-wght)' as CSSProperties['fontWeight'],
                  fontSize: 22,
                  marginTop: 8,
                  color: isHero ? 'var(--t-accent-ink)' : 'var(--t-ink)',
                }}
              >
                {d.v}
              </div>
              <div
                style={{
                  fontSize: 11.5,
                  color: isHero ? 'var(--t-accent-ink)' : 'var(--t-ink-soft)',
                  opacity: isHero ? 0.85 : 1,
                  marginTop: 4,
                }}
              >
                {d.l}
                {d.s && <> · {d.s}</>}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
