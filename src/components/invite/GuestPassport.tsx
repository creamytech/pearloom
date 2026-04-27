'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/invite/GuestPassport.tsx
//
// Unified per-guest landing assembled from the scattered pieces
// that already exist in the manifest + supabase: their RSVP state,
// seat assignment, meal, dress code, hotel block, song request,
// plus-one, and a 'photos of you' wall post-event. The guest
// bookmarks this like a wedding boarding pass.
//
// Used by /i/[token] when the guest already RSVP'd. Before they
// reply they still see InviteReveal with the RSVP form.
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { StoryManifest, WeddingEvent } from '@/types';

interface PriorRsvp {
  status: 'attending' | 'declined' | 'pending';
  email?: string;
  plusOne: boolean;
  plusOneName?: string;
  mealPreference?: string;
  dietaryRestrictions?: string;
  songRequest?: string;
  mailingAddress?: string;
  message?: string;
  selectedEvents: string[];
  respondedAt?: string;
}

interface SeatAssignment {
  tableName?: string;
  tableNumber?: number | string;
  seatNumber?: number | string;
}

interface Props {
  manifest: StoryManifest | null;
  token: string;
  guestName: string;
  guestId?: string;
  coupleNames: [string, string];
  rsvp: PriorRsvp;
  onEditRsvp: () => void;
}

// v8 palette (migrated from editorial). Variable names kept so
// internal references still resolve; every value points at v8.
const CREAM = '#FDFAF0';       // v8 paper
const CREAM_DEEP = '#FBF7EE';  // v8 cream-2
const INK = '#18181B';
const INK_SOFT = '#4A5642';    // sage-deep-soft
const MUTED = '#6F6557';
const GOLD = '#C19A4B';        // warmer peach-gold
const GOLD_RULE = 'rgba(193,154,75,0.28)';
const CRIMSON = '#C6563D';     // v8 peach-ink
const OLIVE = '#5C6B3F';       // v8 sage-deep

const FONT_DISPLAY = 'var(--pl-font-heading, "Fraunces", Georgia, serif)';
const FONT_BODY = 'var(--pl-font-body, system-ui, -apple-system, sans-serif)';
const FONT_MONO = 'var(--pl-font-mono, ui-monospace, "Geist Mono", monospace)';

function formatDateLong(iso?: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso.includes('T') ? iso : iso + 'T12:00:00');
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function GuestPassport({
  manifest,
  token,
  guestName,
  guestId,
  coupleNames,
  rsvp,
  onEditRsvp,
}: Props) {
  const attending = rsvp.status === 'attending';
  const events = useMemo<WeddingEvent[]>(() => manifest?.events ?? [], [manifest]);
  const attendingEvents = events.filter((e) => rsvp.selectedEvents.includes(e.id));
  const displayEvents = attendingEvents.length > 0 ? attendingEvents : events;
  const firstName = guestName.split(' ')[0] || 'there';
  const displayCouple = coupleNames.filter(Boolean).join(' & ') || 'The Couple';

  // Seat lookup — hits /api/seating/lookup with the guestId.
  const [seat, setSeat] = useState<SeatAssignment | null>(null);
  useEffect(() => {
    if (!guestId || !attending) return;
    fetch(`/api/seating/lookup?guestId=${encodeURIComponent(guestId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.seat) setSeat(d.seat);
      })
      .catch(() => {
        /* seat lookup is optional */
      });
  }, [guestId, attending]);

  // Guest photos — hits /api/gallery filtered by this guest's id.
  const [guestPhotos, setGuestPhotos] = useState<string[]>([]);
  const siteId = manifest?.coupleId || manifest?.subdomain;
  useEffect(() => {
    if (!siteId) return;
    fetch(`/api/gallery?siteId=${encodeURIComponent(String(siteId))}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const photos = (d?.photos as Array<{ url: string }>) || [];
        setGuestPhotos(photos.slice(0, 12).map((p) => p.url));
      })
      .catch(() => {
        /* gallery is optional */
      });
  }, [siteId]);

  const hotels = manifest?.travelInfo?.hotels || [];
  const dressCode =
    events.find((e) => e.dressCode)?.dressCode || manifest?.logistics?.dresscode;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: CREAM,
        color: INK,
        fontFamily: FONT_BODY,
        position: 'relative',
      }}
    >
      {/* Paper grain */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage: 'radial-gradient(rgba(14,13,11,0.025) 1px, transparent 1px)',
          backgroundSize: '3px 3px',
          pointerEvents: 'none',
          mixBlendMode: 'multiply',
        }}
      />

      <motion.main
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: 'relative',
          maxWidth: 680,
          margin: '0 auto',
          padding: 'clamp(36px, 8vw, 72px) clamp(20px, 5vw, 40px) 120px',
        }}
      >
        {/* Masthead */}
        <header style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              fontFamily: FONT_MONO,
              fontSize: '0.62rem',
              letterSpacing: '0.26em',
              textTransform: 'uppercase',
              color: MUTED,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span style={{ width: 18, height: 1, background: GOLD }} />
            Your wedding pass
            <span style={{ width: 18, height: 1, background: GOLD }} />
          </div>
        </header>

        {/* Name + status */}
        <section style={{ textAlign: 'center', marginBottom: 36 }}>
          <p
            style={{
              fontFamily: FONT_DISPLAY,
              fontStyle: 'italic',
              fontSize: '1.05rem',
              color: MUTED,
              margin: '0 0 6px',
            }}
          >
            Hello {firstName},
          </p>
          <h1
            style={{
              fontFamily: FONT_DISPLAY,
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: 'clamp(2rem, 5vw, 2.8rem)',
              color: INK,
              margin: 0,
              lineHeight: 1.1,
              letterSpacing: '-0.014em',
            }}
          >
            {displayCouple}
          </h1>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 18,
              padding: '6px 14px',
              borderRadius: 'var(--pl-radius-full)',
              background: attending
                ? `color-mix(in oklab, ${OLIVE} 14%, transparent)`
                : rsvp.status === 'declined'
                  ? `color-mix(in oklab, ${CRIMSON} 14%, transparent)`
                  : `color-mix(in oklab, ${GOLD} 14%, transparent)`,
              border: `1px solid ${
                attending ? OLIVE : rsvp.status === 'declined' ? CRIMSON : GOLD
              }`,
              fontFamily: FONT_MONO,
              fontSize: '0.66rem',
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              color: attending ? OLIVE : rsvp.status === 'declined' ? CRIMSON : GOLD,
              fontWeight: 700,
            }}
          >
            {attending
              ? rsvp.plusOne
                ? 'You\u2019re coming, +1'
                : 'You\u2019re coming'
              : rsvp.status === 'declined'
                ? 'Not attending'
                : 'Awaiting response'}
          </div>
        </section>

        {/* Quick-glance stats */}
        {attending && (
          <section
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: 0,
              padding: '20px 0',
              margin: '0 0 32px',
              borderTop: `1px solid ${GOLD_RULE}`,
              borderBottom: `1px solid ${GOLD_RULE}`,
            }}
          >
            <StatCell label="Seat" value={seat?.tableName || (seat?.tableNumber != null ? `Table ${seat.tableNumber}` : 'TBA')} />
            <StatCell label="Meal" value={rsvp.mealPreference || 'Your choice'} divider />
            {rsvp.plusOne && (
              <StatCell
                label="Plus one"
                value={rsvp.plusOneName || 'Confirmed'}
                divider
              />
            )}
            {dressCode && <StatCell label="Dress code" value={dressCode} divider />}
          </section>
        )}

        {/* Events you're attending */}
        {attending && displayEvents.length > 0 && (
          <Section title="Your schedule">
            {displayEvents.map((e) => (
              <EventRow key={e.id} event={e} />
            ))}
          </Section>
        )}

        {/* Seating */}
        {attending && seat && (
          <Section title="Your seat">
            <div
              style={{
                padding: '18px 20px',
                background: CREAM_DEEP,
                border: `1px solid ${GOLD_RULE}`,
                borderRadius: 'var(--pl-radius-xs)',
              }}
            >
              <p
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontStyle: 'italic',
                  fontSize: '1.4rem',
                  color: INK,
                  margin: '0 0 6px',
                }}
              >
                {seat.tableName || `Table ${seat.tableNumber ?? ''}`.trim()}
              </p>
              {seat.seatNumber != null && (
                <p
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: '0.7rem',
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    color: MUTED,
                    margin: 0,
                  }}
                >
                  Seat {seat.seatNumber}
                </p>
              )}
            </div>
          </Section>
        )}

        {/* Hotels */}
        {attending && hotels.length > 0 && (
          <Section title="Stay nearby">
            {hotels.slice(0, 3).map((h, i) => (
              <div
                key={(h as { name?: string }).name || i}
                style={{
                  padding: '14px 0',
                  borderBottom:
                    i < Math.min(hotels.length, 3) - 1 ? `1px solid ${GOLD_RULE}` : 'none',
                }}
              >
                <p
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontStyle: 'italic',
                    fontSize: '1.05rem',
                    color: INK,
                    margin: '0 0 2px',
                  }}
                >
                  {(h as { name?: string }).name || 'Hotel'}
                </p>
                <p style={{ fontSize: '0.86rem', color: MUTED, margin: 0 }}>
                  {(h as { address?: string }).address || ''}
                </p>
                {(h as { bookingUrl?: string }).bookingUrl && (
                  <a
                    href={(h as { bookingUrl?: string }).bookingUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    style={{
                      fontFamily: FONT_MONO,
                      fontSize: '0.6rem',
                      letterSpacing: '0.24em',
                      textTransform: 'uppercase',
                      color: GOLD,
                      textDecoration: 'none',
                      fontWeight: 700,
                      marginTop: 4,
                      display: 'inline-block',
                    }}
                  >
                    Book now →
                  </a>
                )}
              </div>
            ))}
          </Section>
        )}

        {/* Song request echo */}
        {attending && rsvp.songRequest && (
          <Section title="Your song request">
            <p
              style={{
                fontFamily: FONT_DISPLAY,
                fontStyle: 'italic',
                fontSize: '1.2rem',
                color: INK,
                margin: 0,
              }}
            >
              &ldquo;{rsvp.songRequest}&rdquo;
            </p>
            <p
              style={{
                fontFamily: FONT_MONO,
                fontSize: '0.62rem',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: MUTED,
                marginTop: 8,
              }}
            >
              We&rsquo;ll do our best to play it.
            </p>
          </Section>
        )}

        {/* Guest photos wall */}
        {guestPhotos.length > 0 && (
          <Section title="Moments from the day">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 4,
              }}
            >
              {guestPhotos.map((url) => (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={url}
                  src={url}
                  alt=""
                  loading="lazy"
                  style={{
                    width: '100%',
                    aspectRatio: '1 / 1',
                    objectFit: 'cover',
                    display: 'block',
                    borderRadius: 'var(--pl-radius-xs)',
                  }}
                />
              ))}
            </div>
          </Section>
        )}

        {/* Actions */}
        <section
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            marginTop: 40,
            borderTop: `1px solid ${GOLD_RULE}`,
            paddingTop: 24,
          }}
        >
          <button
            type="button"
            onClick={onEditRsvp}
            style={{
              flex: 1,
              minWidth: 180,
              padding: '14px 18px',
              background: 'transparent',
              color: INK,
              border: `1px solid ${INK}`,
              borderRadius: 'var(--pl-radius-xs)',
              fontFamily: FONT_MONO,
              fontSize: '0.66rem',
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Edit my response
          </button>
          <a
            href={`/api/invite/ics?token=${encodeURIComponent(token)}`}
            style={{
              flex: 1,
              minWidth: 180,
              padding: '14px 18px',
              background: INK,
              color: CREAM,
              border: `1px solid ${INK}`,
              borderRadius: 'var(--pl-radius-xs)',
              fontFamily: FONT_MONO,
              fontSize: '0.66rem',
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              fontWeight: 700,
              textDecoration: 'none',
              textAlign: 'center',
            }}
          >
            Add to calendar
          </a>
        </section>

        {/* Colophon */}
        <footer
          style={{
            marginTop: 48,
            textAlign: 'center',
            fontFamily: FONT_MONO,
            fontSize: '0.58rem',
            letterSpacing: '0.24em',
            textTransform: 'uppercase',
            color: MUTED,
          }}
        >
          Bookmark this page · it updates automatically
        </footer>
      </motion.main>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: 36 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 14,
        }}
      >
        <span style={{ flex: 1, height: 1, background: GOLD_RULE }} />
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: '0.6rem',
            letterSpacing: '0.26em',
            textTransform: 'uppercase',
            color: MUTED,
          }}
        >
          {title}
        </span>
        <span style={{ flex: 1, height: 1, background: GOLD_RULE }} />
      </div>
      {children}
    </section>
  );
}

function StatCell({
  label,
  value,
  divider,
}: {
  label: string;
  value: string;
  divider?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        padding: '0 12px',
        borderLeft: divider ? `1px solid ${GOLD_RULE}` : 'none',
      }}
    >
      <span
        style={{
          fontFamily: FONT_DISPLAY,
          fontStyle: 'italic',
          fontSize: 'clamp(1rem, 2.2vw, 1.2rem)',
          color: INK,
          lineHeight: 1.15,
          textAlign: 'center',
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontFamily: FONT_MONO,
          fontSize: '0.56rem',
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
          color: MUTED,
        }}
      >
        {label}
      </span>
    </div>
  );
}

function EventRow({ event }: { event: WeddingEvent }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(80px, 110px) 1fr',
        gap: 16,
        padding: '14px 0',
        borderBottom: `1px solid ${GOLD_RULE}`,
      }}
    >
      <div
        style={{
          fontFamily: FONT_MONO,
          fontSize: '0.64rem',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: GOLD,
          fontWeight: 700,
        }}
      >
        {event.time || formatDateLong(event.date).split(',')[0]}
      </div>
      <div>
        <p
          style={{
            fontFamily: FONT_DISPLAY,
            fontStyle: 'italic',
            fontSize: '1.05rem',
            color: INK,
            margin: '0 0 2px',
          }}
        >
          {event.name}
        </p>
        <p style={{ fontSize: '0.82rem', color: MUTED, margin: 0 }}>
          {event.venue}
          {event.address ? ` · ${event.address}` : ''}
        </p>
      </div>
    </div>
  );
}
