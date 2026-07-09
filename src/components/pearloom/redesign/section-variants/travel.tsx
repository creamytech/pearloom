'use client';
 
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

import { useState, type CSSProperties } from 'react';
import type { Hotel, TravelVariantCtx } from './types';
import { VariantSectionHead } from './_section-head';
import { InlineEdit } from '../InlineEdit';
import { Icon } from '../../motifs';

/* Edit-context extension — per-hotel blurb writer. Indices align
   with manifest.travelInfo.hotels[] (ThemedSite maps them 1:1 and
   only mints the callback when the host has real hotels saved, so
   the canned demo pair stays read-only). Local extension keeps the
   shared types module untouched. */
export interface TravelVariantCtxEditable extends TravelVariantCtx {
  onEditHotelBlurb?: (idx: number, v: string) => void;
  onEditHotelName?: (idx: number, v: string) => void;
}

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

function headProps(ctx: TravelVariantCtxEditable) {
  return {
    eyebrow: ctx.C.eyebrow, title: ctx.C.title, italic: ctx.C.italic,
    editable: ctx.editable,
    onEditEyebrow: ctx.onEditEyebrow, onEditTitle: ctx.onEditTitle,
    eyebrowPlaceholder: ctx.eyebrowPlaceholder, titlePlaceholder: ctx.titlePlaceholder,
  };
}

/** Host-authored "Getting there" intro (manifest.travelInfo.directions).
 *  Every variant renders it right under the head — parity with the
 *  default rows layout so no layout pick silently drops it. */
function TravelIntro({ C }: { C: TravelVariantCtxEditable['C'] }) {
  if (!C.intro) return null;
  return (
    <div style={{ maxWidth: 560, marginInline: 'auto', textAlign: 'center', fontSize: 14.5, color: 'var(--t-ink-soft)', lineHeight: 1.6, marginBottom: 24 }}>
      {C.intro}
    </div>
  );
}

/** Shuttle callout (manifest.travelInfo.shuttle) — mirrors the
 *  default rows layout's card so the note survives every layout. */
function ShuttleCallout({ C }: { C: TravelVariantCtxEditable['C'] }) {
  if (!C.shuttle) return null;
  return (
    <div style={{
      maxWidth: 820, margin: '22px auto 0',
      padding: '14px 18px',
      borderRadius: 'var(--t-radius)',
      background: 'var(--t-card)',
      border: '1px solid var(--t-line)',
      display: 'flex', alignItems: 'center', gap: 12,
      textAlign: 'left',
    }}>
      <Icon name="clock" size={16} color="var(--t-accent-ink)" />
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: 10.5, fontWeight: 700, letterSpacing: 'var(--t-eyebrow-ls)',
          textTransform: 'uppercase', color: 'color-mix(in oklab, var(--t-accent-ink) 65%, var(--t-ink) 35%)', marginBottom: 2,
        }}>
          Shuttle
        </div>
        <div style={{ fontSize: 13, color: 'var(--t-ink-soft)', lineHeight: 1.5 }}>
          {C.shuttle}
        </div>
      </div>
    </div>
  );
}

/** Photo box that prefers a real URL, falls back to the tone
 *  gradient. Used by HotelCard + TravelTable. */
function HotelPhoto({ h, style }: { h: Hotel; style?: CSSProperties }) {
  const background = h.photoUrl
    ? `var(--t-card) center / cover no-repeat url("${h.photoUrl.replace(/"/g, '%22')}")`
    : TONE_BG[h.tone];
  return <div style={{ background, ...style }} />;
}

/** Card shell. Used to wrap the whole card in <a href> when a
 *  bookingUrl existed — replaced by the explicit StayActions
 *  "Book now" button (host request 2026-06-13): a silent
 *  card-link was undiscoverable, and a visible button can't nest
 *  inside another anchor. `disableLink` kept for call-site
 *  compatibility; it no longer changes anything. */
function HotelWrap({ children, style }: { h: Hotel; children: React.ReactNode; style: CSSProperties; disableLink?: boolean }) {
  const merged: CSSProperties = {
    ...style,
    textDecoration: 'none',
    color: 'inherit',
    transition: 'transform var(--pl-dur-fast) var(--pl-ease-emphasis), border-color var(--pl-dur-fast), box-shadow var(--pl-dur-fast)',
    display: 'block',
  };
  return <div style={merged}>{children}</div>;
}

/** Book now + group code — the actions a stay actually needs.
 *  Group code is tap-to-copy (guests paste it into the hotel's
 *  booking form). Renders nothing when the host set neither. */
export function StayActions({ h, compact }: { h: Hotel; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  if (!h.bookingUrl && !h.groupRate) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: compact ? 8 : 12 }}>
      {h.bookingUrl && (
        <a
          href={h.bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="pl-hit44"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: compact ? '6px 13px' : '8px 16px',
            borderRadius: 999,
            background: 'var(--t-rsvp, var(--t-ink))',
            color: 'var(--t-rsvp-ink, var(--t-paper))',
            fontSize: compact ? 11.5 : 12.5, fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          Book now →
        </a>
      )}
      {h.groupRate && (
        <button
          type="button"
          onClick={() => {
            try {
              void navigator.clipboard?.writeText(h.groupRate ?? '');
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1600);
            } catch { /* clipboard denied, the code is still readable */ }
          }}
          title="Tap to copy the group code"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: compact ? '5px 11px' : '7px 13px',
            borderRadius: 999,
            border: '1.5px dashed var(--t-gold, #C19A4B)',
            background: 'transparent',
            color: 'var(--t-ink)',
            fontSize: compact ? 11 : 11.5, fontWeight: 700,
            letterSpacing: '0.04em',
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          {copied ? '✓ Copied' : <>Group code · {h.groupRate}</>}
        </button>
      )}
    </div>
  );
}

/* ─── shared hotel card (used by map + carousel) ─── */
function HotelCard({ h, style, idx, ctx }: { h: Hotel; style?: CSSProperties; idx?: number; ctx?: TravelVariantCtxEditable }) {
  const blurbStyle: CSSProperties = { fontSize: 12.5, color: 'var(--t-ink-soft)', lineHeight: 1.5, margin: '8px 0 10px' };
  const canEditBlurb = !!(ctx?.editable && ctx.onEditHotelBlurb && typeof idx === 'number');
  const canEditName = !!(ctx?.editable && ctx.onEditHotelName && typeof idx === 'number');
  return (
    <HotelWrap
      h={h}
      disableLink={canEditBlurb}
      style={{
        background: 'var(--t-card)',
        border: '1px solid var(--t-line)',
        borderRadius: 'var(--t-radius)',
        padding: 14,
        ...style,
      }}
    >
      <HotelPhoto h={h} style={{ aspectRatio: '16/10', borderRadius: 8, marginBottom: 10 }} />
      {canEditName ? (
        <InlineEdit
          as="div"
          value={h.name}
          onChange={(v) => ctx!.onEditHotelName!(idx!, v)}
          editable
          placeholder="Hotel name"
          className="pl8-inline-ghost"
          style={{ fontFamily: 'var(--t-display)', fontWeight: 600, fontSize: 15, color: 'var(--t-ink)', lineHeight: 1.15 }}
        />
      ) : (
        <div style={{ fontFamily: 'var(--t-display)', fontWeight: 600, fontSize: 15, color: 'var(--t-ink)', lineHeight: 1.15 }}>
          {h.name}
        </div>
      )}
      <div style={{ fontSize: 11.5, color: 'var(--t-ink-muted)', marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        {h.rating > 0 && <span>★ {h.rating.toFixed(1)}</span>}
        {h.price && <span>{h.price}</span>}
        {h.dist && <span>{h.dist}</span>}
      </div>
      {canEditBlurb ? (
        <InlineEdit
          as="div"
          value={h.blurb}
          onChange={(v) => ctx!.onEditHotelBlurb!(idx!, v)}
          editable
          multiline
          placeholder="Add a note about this stay…"
          className="pl8-inline-ghost"
          style={blurbStyle}
        />
      ) : h.blurb ? (
        <div style={blurbStyle}>
          {h.blurb}
        </div>
      ) : null}
      {h.amenities.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {h.amenities.map((a) => (
            <span key={a} style={{ fontSize: 11, fontWeight: 600, color: 'var(--t-ink-soft)', background: 'var(--t-section)', padding: '3px 8px', borderRadius: 999 }}>
              {a}
            </span>
          ))}
        </div>
      )}
      <StayActions h={h} />
    </HotelWrap>
  );
}

/* ─── TravelMap ─── */

/** Project venue + hotel coordinates onto the stylized map panel.
 *  Real geometry, editorial rendering: equirectangular projection
 *  (lng scaled by cos(lat) so distances read true), normalized to
 *  the panel with a comfortable margin. Needs the venue pin OR
 *  ≥2 hotel coords to be meaningful; otherwise returns null and
 *  the decorative three-dot map renders as before. */
function projectPins(C: TravelVariantCtxEditable['C']): {
  venue?: { x: number; y: number; name: string };
  hotels: Array<{ x: number; y: number; idx: number }>;
} | null {
  const pts: Array<{ lat: number; lng: number }> = [];
  if (C.venuePin) pts.push(C.venuePin);
  const hotelPts = C.hotels
    .map((h, idx) => (typeof h.lat === 'number' && typeof h.lng === 'number' ? { lat: h.lat, lng: h.lng, idx } : null))
    .filter((p): p is { lat: number; lng: number; idx: number } => p !== null);
  pts.push(...hotelPts);
  if (pts.length < 2) return null;

  const meanLat = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
  const kx = Math.cos((meanLat * Math.PI) / 180);
  const xs = pts.map((p) => p.lng * kx);
  const ys = pts.map((p) => p.lat);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const spanX = Math.max(maxX - minX, 1e-6);
  const spanY = Math.max(maxY - minY, 1e-6);
  /* 14–86% keeps pins clear of the panel edges; north is up. */
  const px = (lng: number) => 14 + (((lng * kx) - minX) / spanX) * 72;
  const py = (lat: number) => 86 - ((lat - minY) / spanY) * 72;

  return {
    venue: C.venuePin ? { x: px(C.venuePin.lng), y: py(C.venuePin.lat), name: C.venuePin.name } : undefined,
    hotels: hotelPts.map((p) => ({ x: px(p.lng), y: py(p.lat), idx: p.idx })),
  };
}

export function TravelMap({ ctx }: { ctx: TravelVariantCtxEditable }) {
  const { C } = ctx;
  const pins = projectPins(C);
  return (
    <>
      <VariantSectionHead {...headProps(ctx)} />
      <TravelIntro C={C} />
      <div
        aria-hidden
        style={{
          position: 'relative',
          height: pins ? 190 : 150,
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
        {pins ? (
          <>
            {/* The venue — a gold-ringed home pin with its name. */}
            {pins.venue && (
              <span
                style={{
                  position: 'absolute',
                  left: `${pins.venue.x}%`,
                  top: `${pins.venue.y}%`,
                  transform: 'translate(-50%, -50%)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  zIndex: 2,
                }}
              >
                <span
                  style={{
                    width: 18, height: 18, borderRadius: '50%',
                    background: 'var(--t-gold)',
                    border: '2.5px solid var(--t-paper)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.22)',
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 10.5, fontWeight: 700, color: 'var(--t-ink)',
                    background: 'var(--t-paper)',
                    padding: '2px 8px', borderRadius: 999,
                    border: '1px solid var(--t-line)',
                    whiteSpace: 'nowrap', maxWidth: 150,
                    overflow: 'hidden', textOverflow: 'ellipsis',
                  }}
                >
                  {pins.venue.name}
                </span>
              </span>
            )}
            {/* Hotel pins — numbered to match the cards below. */}
            {pins.hotels.map((p) => (
              <span
                key={p.idx}
                style={{
                  position: 'absolute',
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  width: 20, height: 20, borderRadius: '50%',
                  background: 'var(--t-accent)',
                  border: '2px solid var(--t-paper)',
                  transform: 'translate(-50%, -50%)',
                  display: 'grid', placeItems: 'center',
                  fontSize: 10, fontWeight: 700, color: 'var(--t-paper)',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
                  zIndex: 1,
                }}
              >
                {p.idx + 1}
              </span>
            ))}
          </>
        ) : (
          [0, 1, 2].map((i) => (
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
          ))
        )}
      </div>
      <div style={{ maxWidth: 820, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {C.hotels.map((h, i) => (
          <div key={i} style={{ position: 'relative' }}>
            {/* Number badge tying the card to its map pin. */}
            {pins?.hotels.some((p) => p.idx === i) && (
              <span
                aria-hidden
                style={{
                  position: 'absolute', top: -8, left: -8, zIndex: 1,
                  width: 22, height: 22, borderRadius: '50%',
                  background: 'var(--t-accent)', color: 'var(--t-paper)',
                  border: '2px solid var(--t-paper)',
                  display: 'grid', placeItems: 'center',
                  fontSize: 10.5, fontWeight: 700,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.16)',
                }}
              >
                {i + 1}
              </span>
            )}
            <HotelCard h={h} idx={i} ctx={ctx} />
          </div>
        ))}
      </div>
      <ShuttleCallout C={C} />
    </>
  );
}

/* ─── TravelTable — proper card rows with thumbnails ─── */
export function TravelTable({ ctx }: { ctx: TravelVariantCtxEditable }) {
  const { C } = ctx;
  return (
    <>
      <VariantSectionHead {...headProps(ctx)} />
      <TravelIntro C={C} />
      {/* Mobile stack: below 500px the 88px-photo / text / rating
          three-column row collapses to a 64px inline photo + text,
          with the rating/price meta wrapping onto its own full-width
          row. !important beats the inline grid styles. */}
      <style>{`
        @media (max-width: 500px) {
          .pl8-hotel-row { grid-template-columns: 64px minmax(0, 1fr) !important; gap: 10px !important; }
          .pl8-hotel-row > div:first-child { width: 64px !important; height: 64px !important; }
          .pl8-hotel-row .pl8-hotel-meta {
            grid-column: 1 / -1;
            flex-direction: row !important;
            align-items: center !important;
            justify-content: flex-start !important;
            gap: 10px !important;
            min-width: 0 !important;
          }
        }
      `}</style>
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
              /* pl8-vrow: inner grid inside HotelWrap's card — the
                 scrapbook kit's polaroid tilt/tape (sized for the default
                 rows layout's standalone cards) keys off :not(.pl8-vrow). */
              className="pl8-hotel-row pl8-vrow"
              style={{
                display: 'grid',
                gridTemplateColumns: '88px 1fr auto',
                gap: 14,
                alignItems: 'center',
                maxWidth: '100%',
                minWidth: 0,
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
                  <div style={{ fontSize: 11.5, color: 'var(--t-ink-muted)', marginTop: 4, overflow: 'hidden' }}>
                    {h.amenities.slice(0, 3).join(' · ')}
                  </div>
                )}
                {h.dist && (
                  <div style={{ fontSize: 11, color: 'var(--t-ink-soft)', marginTop: 4 }}>
                    {h.dist}
                  </div>
                )}
                <StayActions h={h} compact />
              </div>
              <div className="pl8-hotel-meta" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, minWidth: 70 }}>
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
      <ShuttleCallout C={C} />
    </>
  );
}

/* ─── TravelCarousel ─── */
export function TravelCarousel({ ctx }: { ctx: TravelVariantCtxEditable }) {
  const { C } = ctx;
  return (
    <>
      <VariantSectionHead {...headProps(ctx)} />
      <TravelIntro C={C} />
      {/* The scroller bleeds to the section edge via a negative
          margin that EXACTLY matches the travel section's own
          horizontal padding (clamp(16px, 5vw, 40px)). A hardcoded
          -40px over-bled past the viewport on phones (~+21px page
          overflow at 390) where the section padding is only ~19px. */}
      <div
        style={{
          display: 'flex',
          overflowX: 'auto',
          gap: 16,
          padding: '12px clamp(16px, 5vw, 40px)',
          margin: '0 calc(-1 * clamp(16px, 5vw, 40px))',
          scrollSnapType: 'x mandatory',
        }}
      >
        {C.hotels.map((h, i) => (
          <HotelCard key={i} h={h} idx={i} ctx={ctx} style={{ flex: '0 0 300px', scrollSnapAlign: 'start' }} />
        ))}
      </div>
      <ShuttleCallout C={C} />
    </>
  );
}
