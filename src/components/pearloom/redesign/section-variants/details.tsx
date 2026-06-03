'use client';
/* eslint-disable no-restricted-syntax */
/* Per-section layout variants for the Details section. The 'tiles'
   default ships inline in ThemedSite.tsx; this file adds three
   alternatives the canvas dispatches via readVariant(manifest,
   'details'). Each variant takes ctx: DetailsVariantCtx and renders
   a shared <SectionHead /> followed by its own layout body. */

import type { CSSProperties } from 'react';
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

/* ─── DetailsAccordion — vertical stack of rows; icon + label/value
   on the left, chevron glyph on the right. ──────────────── */

export function DetailsAccordion({ ctx }: { ctx: DetailsVariantCtx }) {
  const { C } = ctx;
  return (
    <>
      <VariantSectionHead {...headProps(ctx)} />
      <div style={{ maxWidth: 620, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {C.items.map((d) => (
          <div
            key={d.l}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              background: 'var(--t-card)',
              border: '1px solid var(--t-line)',
              borderRadius: 'var(--t-radius)',
            }}
          >
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
              <div style={{ minWidth: 0 }}>
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
            <span
              aria-hidden
              style={{
                fontSize: 14,
                color: 'var(--t-ink-muted)',
                lineHeight: 1,
                paddingLeft: 12,
              }}
            >
              ⌄
            </span>
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
      <div
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
