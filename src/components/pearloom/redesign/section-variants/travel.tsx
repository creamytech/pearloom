'use client';
/* eslint-disable no-restricted-syntax */
/* Travel section variants — map / table / carousel.
   The 'rows' default is implemented inline in ThemedSite.

   Round CC follow-up fixes:
   - Hotel cards now use h.photoUrl when set (Google Places photos)
     and fall back to the tone gradient when missing.
   - HotelCard / TravelTable rows wrap in <a href> when h.bookingUrl
     is set, so guests can tap through.
   - TravelTable rebuilt as proper card rows (thumbnail + content)
     instead of an invisible-borders list — the previous version
     painted text in --t-ink on a section that bled through with
     no row surface, which read as gold-on-dark on certain themes. */

import type { CSSProperties } from 'react';
import type { Hotel, TravelVariantCtx } from './types';
import { VariantSectionHead } from './_section-head';

/* Tone → photo-placeholder background. Only used when a hotel has
   no real photoUrl. */
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

function headProps(ctx: TravelVariantCtx) {
  return {
    eyebrow: ctx.C.eyebrow, title: ctx.C.title, italic: ctx.C.italic,
    editable: ctx.editable,
    onEditEyebrow: ctx.onEditEyebrow, onEditTitle: ctx.onEditTitle,
    eyebrowPlaceholder: ctx.eyebrowPlaceholder, titlePlaceholder: ctx.titlePlaceholder,
  };
}

/** Photo box that prefers a real URL, falls back to the tone
 *  gradient. Used by HotelCard + TravelTable. */
function HotelPhoto({ h, style }: { h: Hotel; style?: CSSProperties }) {
  const background = h.photoUrl
    ? `var(--t-card) center / cover no-repeat url("${h.photoUrl.replace(/"/g, '%22')}")`
    : TONE_BG[h.tone];
  return <div style={{ background, ...style }} />;
}

/** Wrap a card in <a href> when bookingUrl is present, plain
 *  <div> otherwise. Keeps styling consistent across modes. */
function HotelWrap({ h, children, style }: { h: Hotel; children: React.ReactNode; style: CSSProperties }) {
  const merged: CSSProperties = {
    ...style,
    textDecoration: 'none',
    color: 'inherit',
    transition: 'transform var(--pl-dur-fast) var(--pl-ease-emphasis), border-color var(--pl-dur-fast), box-shadow var(--pl-dur-fast)',
    display: 'block',
  };
  if (h.bookingUrl) {
    return (
      <a href={h.bookingUrl} target="_blank" rel="noopener noreferrer" style={merged}>
        {children}
      </a>
    );
  }
  return <div style={merged}>{children}</div>;
}

/* ─── shared hotel card (used by map + carousel) ─── */
function HotelCard({ h, style }: { h: Hotel; style?: CSSProperties }) {
  return (
    <HotelWrap
      h={h}
      style={{
        background: 'var(--t-card)',
        border: '1px solid var(--t-line)',
        borderRadius: 'var(--t-radius)',
        padding: 14,
        ...style,
      }}
    >
      <HotelPhoto h={h} style={{ aspectRatio: '16/10', borderRadius: 8, marginBottom: 10 }} />
      <div style={{ fontFamily: 'var(--t-display)', fontWeight: 600, fontSize: 15, color: 'var(--t-ink)', lineHeight: 1.15 }}>
        {h.name}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--t-ink-muted)', marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        {h.rating > 0 && <span>★ {h.rating.toFixed(1)}</span>}
        {h.price && <span>{h.price}</span>}
        {h.dist && <span>{h.dist}</span>}
      </div>
      {h.blurb && (
        <div style={{ fontSize: 12.5, color: 'var(--t-ink-soft)', lineHeight: 1.5, margin: '8px 0 10px' }}>
          {h.blurb}
        </div>
      )}
      {h.amenities.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {h.amenities.map((a) => (
            <span key={a} style={{ fontSize: 11, fontWeight: 600, color: 'var(--t-ink-soft)', background: 'var(--t-section)', padding: '3px 8px', borderRadius: 999 }}>
              {a}
            </span>
          ))}
        </div>
      )}
    </HotelWrap>
  );
}

/* ─── TravelMap ─── */
export function TravelMap({ ctx }: { ctx: TravelVariantCtx }) {
  const { C } = ctx;
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
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              position: 'absolute',
              left: `${[18, 52, 74][i]}%`,
              top: `${[32, 64, 28][i]}%`,
              width: 16, height: 16, borderRadius: '50%',
              background: 'var(--t-accent)',
              transform: 'translate(-50%, -50%)',
              border: '2px solid var(--t-paper)',
            }}
          />
        ))}
      </div>
      <div style={{ maxWidth: 820, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {C.hotels.map((h, i) => <HotelCard key={i} h={h} />)}
      </div>
    </>
  );
}

/* ─── TravelTable — proper card rows with thumbnails ─── */
export function TravelTable({ ctx }: { ctx: TravelVariantCtx }) {
  const { C } = ctx;
  return (
    <>
      <VariantSectionHead {...headProps(ctx)} />
      <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {C.hotels.map((h, i) => (
          <HotelWrap
            key={i}
            h={h}
            style={{
              background: 'var(--t-card)',
              border: '1px solid var(--t-line)',
              borderRadius: 'var(--t-radius)',
              padding: 12,
            }}
          >
            <div
              className="pl8-hotel-row"
              style={{
                display: 'grid',
                gridTemplateColumns: '88px 1fr auto',
                gap: 14,
                alignItems: 'center',
              }}
            >
              <HotelPhoto h={h} style={{ width: 88, height: 88, borderRadius: 8 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontFamily: 'var(--t-display)', fontWeight: 600, fontSize: 15,
                  color: 'var(--t-ink)', lineHeight: 1.2,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {h.name}
                </div>
                {h.amenities.length > 0 && (
                  <div style={{ fontSize: 11.5, color: 'var(--t-ink-muted)', marginTop: 4 }}>
                    {h.amenities.slice(0, 3).join(' · ')}
                  </div>
                )}
                {h.dist && (
                  <div style={{ fontSize: 11, color: 'var(--t-ink-soft)', marginTop: 4 }}>
                    {h.dist}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, minWidth: 70 }}>
                {h.rating > 0 && (
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t-accent-ink)', fontFamily: 'var(--t-display)' }}>
                    ★ {h.rating.toFixed(1)}
                  </div>
                )}
                {h.price && (
                  <div style={{ fontSize: 12, color: 'var(--t-ink-soft)', fontWeight: 600 }}>
                    {h.price}
                  </div>
                )}
              </div>
            </div>
          </HotelWrap>
        ))}
      </div>
    </>
  );
}

/* ─── TravelCarousel ─── */
export function TravelCarousel({ ctx }: { ctx: TravelVariantCtx }) {
  const { C } = ctx;
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
