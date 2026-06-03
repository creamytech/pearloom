'use client';
/* eslint-disable no-restricted-syntax */
/* Travel section variants — map / table / carousel.
   The 'rows' default is implemented inline in ThemedSite. */

import type { CSSProperties } from 'react';
import type { Hotel, TravelVariantCtx } from './types';
import { VariantSectionHead } from './_section-head';

/* Tone → photo-placeholder background, same shape as gallery. */
const TONE_BG: Record<string, string> = {
  warm: 'linear-gradient(135deg, #e8d4b8 0%, #d4b08a 100%)',
  cream: 'linear-gradient(135deg, #f5ecd8 0%, #e3d4b2 100%)',
  sage: 'linear-gradient(135deg, #c8d4b4 0%, #9aab84 100%)',
  dusk: 'linear-gradient(135deg, #b8b0c4 0%, #8a82a0 100%)',
  peach: 'linear-gradient(135deg, #f4cdb4 0%, #e3a482 100%)',
  lavender: 'linear-gradient(135deg, #d4c8e0 0%, #b09cc8 100%)',
  gold: 'linear-gradient(135deg, #e8d090 0%, #c4a86a 100%)',
  ink: 'linear-gradient(135deg, #4a4438 0%, #2a2620 100%)',
  rose: 'linear-gradient(135deg, #f0c8c4 0%, #d49a96 100%)',
};

/* Tiny prop-spread helper for the editable head. */
function headProps(ctx: TravelVariantCtx) {
  return {
    eyebrow: ctx.C.eyebrow, title: ctx.C.title, italic: ctx.C.italic,
    editable: ctx.editable,
    onEditEyebrow: ctx.onEditEyebrow, onEditTitle: ctx.onEditTitle,
    eyebrowPlaceholder: ctx.eyebrowPlaceholder, titlePlaceholder: ctx.titlePlaceholder,
  };
}

/* ─── shared hotel card (used by map + carousel) ─── */
function HotelCard({ h, style }: { h: Hotel; style?: CSSProperties }) {
  return (
    <div className="pl8-hotel-row" style={{ background: 'var(--t-card)', border: '1px solid var(--t-line)', borderRadius: 'var(--t-radius)', padding: 14, ...style }}>
      <div style={{ aspectRatio: '16/10', background: TONE_BG[h.tone], borderRadius: 8, marginBottom: 10 }} />
      <div style={{ fontFamily: 'var(--t-display)', fontWeight: 600, fontSize: 15, color: 'var(--t-ink)', lineHeight: 1.15 }}>
        {h.name}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--t-ink-muted)', marginTop: 4 }}>
        {h.price} · {h.dist}
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--t-ink-soft)', lineHeight: 1.5, margin: '8px 0 10px' }}>
        {h.blurb || 'A short, friendly answer goes here.'}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {h.amenities.map((a) => (
          <span key={a} style={{ fontSize: 11, fontWeight: 600, color: 'var(--t-ink-soft)', background: 'var(--t-section)', padding: '3px 8px', borderRadius: 999 }}>
            {a}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── TravelMap ─── */
export function TravelMap({ ctx }: { ctx: TravelVariantCtx }) {
  const { C } = ctx;
  /* Wrapper padding is applied by the dispatch in ThemedSite — no
     local padding/background here, otherwise content sits in
     double padding (audit 2026-06-04). */
  return (
    <>
      <VariantSectionHead {...headProps(ctx)} />
      <div
        aria-hidden
        style={{
          position: 'relative',
          height: 150,
          maxWidth: 820,
          margin: '0 auto 22px',
          background: 'linear-gradient(135deg, #e8e0d0 0%, #d4c8b0 100%)',
          borderRadius: 'var(--t-radius)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute', inset: 0,
            backgroundImage:
              'repeating-linear-gradient(0deg, rgba(0,0,0,0.06) 0 1px, transparent 1px 22px), repeating-linear-gradient(90deg, rgba(0,0,0,0.06) 0 1px, transparent 1px 22px)',
          }}
        />
        <span style={{ position: 'absolute', left: '18%', top: '32%', width: 16, height: 16, borderRadius: '50%', background: 'var(--t-accent)', transform: 'translate(-50%, -50%)' }} />
        <span style={{ position: 'absolute', left: '52%', top: '64%', width: 16, height: 16, borderRadius: '50%', background: 'var(--t-accent)', transform: 'translate(-50%, -50%)' }} />
        <span style={{ position: 'absolute', left: '74%', top: '28%', width: 16, height: 16, borderRadius: '50%', background: 'var(--t-accent)', transform: 'translate(-50%, -50%)' }} />
      </div>
      <div style={{ maxWidth: 820, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {C.hotels.map((h, i) => <HotelCard key={i} h={h} />)}
      </div>
    </>
  );
}

/* ─── TravelTable ─── */
export function TravelTable({ ctx }: { ctx: TravelVariantCtx }) {
  const { C } = ctx;
  return (
    <>
      <VariantSectionHead {...headProps(ctx)} />
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        {C.hotels.map((h, i) => (
          <div
            key={i}
            className="pl8-hotel-row"
            style={{
              display: 'grid',
              gridTemplateColumns: '1.4fr auto auto auto',
              gap: '12px 18px',
              padding: '14px 0',
              borderBottom: '1px solid var(--t-line-soft)',
              alignItems: 'baseline',
            }}
          >
            <div>
              <div style={{ fontFamily: 'var(--t-display)', fontWeight: 600, fontSize: 15, color: 'var(--t-ink)' }}>{h.name}</div>
              {h.amenities.length > 0 && (
                <div style={{ fontSize: 11.5, color: 'var(--t-ink-muted)', marginTop: 3 }}>{h.amenities.join(' · ')}</div>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--t-ink-soft)', textAlign: 'right' }}>★ {h.rating}</div>
            <div style={{ fontSize: 12, color: 'var(--t-ink-soft)', textAlign: 'right' }}>{h.price}</div>
            <div style={{ fontSize: 12, color: 'var(--t-ink-soft)', textAlign: 'right' }}>{h.dist}</div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ─── TravelCarousel ─── */
export function TravelCarousel({ ctx }: { ctx: TravelVariantCtx }) {
  const { C } = ctx;
  /* Dispatch wraps in section padding; carousel needs to break out
     of the 40px horizontal pad to bleed to the edge — done by
     negative margin instead of nested wrapping. */
  return (
    <>
      <VariantSectionHead {...headProps(ctx)} />
      <div
        style={{
          display: 'flex',
          overflowX: 'auto',
          gap: 16,
          padding: '12px 40px',
          margin: '0 -40px',
          scrollSnapType: 'x mandatory',
        }}
      >
        {C.hotels.map((h, i) => (
          <HotelCard key={i} h={h} style={{ flex: '0 0 300px', scrollSnapAlign: 'start' }} />
        ))}
      </div>
    </>
  );
}
