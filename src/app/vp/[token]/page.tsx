// ─────────────────────────────────────────────────────────────
// Pearloom / app/vp/[token]/page.tsx
//
// THE VENDOR CALL SHEET — /vp/{token}. The host mints the token
// from the Vendor Book ("Call sheet →") and texts the link to the
// florist / DJ / caterer. One printable sheet of paper: the event,
// YOUR arrival time writ large, the venue with a directions link,
// the day-of contact (tap-to-call), and the run of show.
//
// This is guest-facing chrome, not the themed site — it wears the
// house paper (the /a/[siteSlug] cream/ink language) in explicit
// hex so a vendor's dark-mode phone and a laser printer see the
// same sheet. No auth (the token is the credential), noindex,
// @media print strips the chrome to black-on-white.
//
// Data comes straight through the service role via
// src/lib/vendor-packet.ts — the privacy contract (no money, no
// notes, no other vendors, never the host's account email) lives
// there.
// ─────────────────────────────────────────────────────────────

import type { Metadata } from 'next';
import { cache } from 'react';
import {
  loadVendorPacketByToken,
  googleMapsUrl,
  type VendorPacket,
} from '@/lib/vendor-packet';
import { formatLocalDate } from '@/lib/date-utils';

export const dynamic = 'force-dynamic';

const loadPacket = cache(async (token: string): Promise<VendorPacket | null> => {
  try {
    return await loadVendorPacketByToken(token);
  } catch {
    // A vendor opening their call sheet should see the dead-link
    // state, never a 500 (e.g. Supabase unconfigured in dev).
    return null;
  }
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const packet = await loadPacket(token);
  return {
    // Deliberately generic — link previews in a vendor's inbox
    // shouldn't carry event details.
    title: packet ? 'Vendor call sheet · Pearloom' : 'Call sheet · Pearloom',
    robots: { index: false, follow: false },
  };
}

// ── Paper palette — explicit hex (print + dark-mode stable) ──
const PAPER = '#F5EFE2';
const CARD = '#FBF7EE';
const INK = '#0E0D0B';
const SOFT = '#6F6557';
const MUTED = '#8A7F6E';
const LINE = '#E2D9C6';
const GOLD = '#C19A4B';
const OLIVE = '#5C6B3F';

const MONO = 'var(--font-geist-mono, ui-monospace, monospace)';
const DISPLAY = 'var(--font-fraunces, "Fraunces", Georgia, serif)';
const BODY = 'var(--font-geist, system-ui, -apple-system, sans-serif)';

const eyebrowStyle: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: '0.64rem',
  fontWeight: 700,
  letterSpacing: '0.26em',
  textTransform: 'uppercase',
  color: SOFT,
  margin: 0,
};

const cardStyle: React.CSSProperties = {
  background: CARD,
  border: `1px solid ${LINE}`,
  borderRadius: 14,
  padding: '18px 20px',
};

const cardLabel: React.CSSProperties = {
  ...eyebrowStyle,
  fontSize: '0.6rem',
  color: MUTED,
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  marginBottom: 10,
};

/** 1px gold rule paired with every mono label (BRAND §4). */
function LabelRule() {
  return <span aria-hidden style={{ flex: 1, height: 1, background: GOLD, opacity: 0.55 }} />;
}

export default async function VendorPacketPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const packet = await loadPacket(token);

  if (!packet) {
    // On-brand dead-link state (mirrors /a/[siteSlug]'s fallback voice).
    return (
      <div
        style={{
          minHeight: '100vh', background: PAPER,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: BODY, color: SOFT, textAlign: 'center', padding: '2rem',
        }}
      >
        <div style={{ maxWidth: 420 }}>
          <p style={{ ...eyebrowStyle, margin: '0 0 14px' }}>Vendor call sheet</p>
          <h1
            style={{
              fontFamily: DISPLAY, fontStyle: 'italic', fontWeight: 400,
              fontSize: 'clamp(1.6rem, 4vw, 2.1rem)',
              color: INK, margin: '0 0 14px', lineHeight: 1.2,
            }}
          >
            This link isn&rsquo;t ready.
          </h1>
          <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.7 }}>
            The call sheet is invalid or hasn&rsquo;t been woven yet.
            <br />
            Ask your host for a fresh link.
          </p>
        </div>
      </div>
    );
  }

  const { event, venue, contact, vendor, schedule } = packet;
  const dateLine = event.date
    ? formatLocalDate(event.date, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : null;
  const mapsHref = googleMapsUrl(venue);
  const telHref = contact ? `tel:${contact.phone.replace(/[^\d+]/g, '')}` : null;
  const multiDay = schedule.some((e) => e.day > 1);

  return (
    <div className="vp-page" style={{ minHeight: '100vh', background: PAPER, fontFamily: BODY, color: INK }}>
      <main className="vp-sheet" style={{ maxWidth: 640, margin: '0 auto', padding: 'clamp(28px, 6vw, 56px) 22px 40px' }}>
        {/* ── Masthead ── */}
        <header style={{ marginBottom: 26 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <p style={eyebrowStyle}>Vendor call sheet</p>
            <LabelRule />
          </div>
          <h1
            style={{
              fontFamily: DISPLAY, fontStyle: 'italic', fontWeight: 420,
              fontSize: 'clamp(1.9rem, 6vw, 2.7rem)', lineHeight: 1.12,
              color: INK, margin: 0,
            }}
          >
            {event.name}
          </h1>
          {dateLine && (
            <p style={{ margin: '10px 0 0', fontSize: '0.95rem', color: SOFT }}>{dateLine}</p>
          )}
        </header>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* ── You ── */}
          <section style={cardStyle} aria-label="Your call">
            <div style={cardLabel}>You <LabelRule /></div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: DISPLAY, fontSize: '1.25rem', fontWeight: 560, lineHeight: 1.25 }}>
                  {vendor.name}
                </div>
                <div style={{ marginTop: 4, fontFamily: MONO, fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: OLIVE }}>
                  {vendor.category}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ ...eyebrowStyle, fontSize: '0.58rem', color: MUTED }}>Your arrival time</div>
                <div style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontSize: 'clamp(1.9rem, 7vw, 2.5rem)', lineHeight: 1.1, color: INK, marginTop: 2 }}>
                  {vendor.arrivalTime ?? 'To be set'}
                </div>
                {!vendor.arrivalTime && (
                  <div style={{ fontSize: '0.78rem', color: SOFT, marginTop: 2 }}>
                    Check with your host.
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ── The venue ── */}
          {(venue.name || venue.address) && (
            <section style={cardStyle} aria-label="The venue">
              <div style={cardLabel}>The venue <LabelRule /></div>
              {venue.name && (
                <div style={{ fontFamily: DISPLAY, fontSize: '1.1rem', fontWeight: 540 }}>{venue.name}</div>
              )}
              {venue.address && (
                <div style={{ marginTop: 4, fontSize: '0.92rem', lineHeight: 1.6, color: SOFT }}>{venue.address}</div>
              )}
              {mapsHref && (
                <a
                  className="vp-noprint"
                  href={mapsHref}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'inline-block', marginTop: 10, fontSize: '0.85rem', fontWeight: 600, color: OLIVE, textDecoration: 'none', borderBottom: `1px solid ${GOLD}` }}
                >
                  Directions →
                </a>
              )}
            </section>
          )}

          {/* ── Day-of contact ── */}
          {contact && telHref && (
            <section style={cardStyle} aria-label="Day-of contact">
              <div style={cardLabel}>Day-of contact <LabelRule /></div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ fontFamily: DISPLAY, fontSize: '1.1rem', fontWeight: 540 }}>{contact.name}</div>
                <a
                  href={telHref}
                  style={{ fontFamily: MONO, fontSize: '1rem', fontWeight: 600, color: INK, textDecoration: 'none', borderBottom: `1px solid ${GOLD}` }}
                >
                  {contact.phone}
                </a>
              </div>
              <p className="vp-noprint" style={{ margin: '8px 0 0', fontSize: '0.78rem', color: MUTED }}>
                Tap the number to call on the day.
              </p>
            </section>
          )}

          {/* ── The run of show ── */}
          {schedule.length > 0 && (
            <section style={{ ...cardStyle, paddingBottom: 12 }} aria-label="The run of show">
              <div style={cardLabel}>The run of show <LabelRule /></div>
              <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {schedule.map((e, i) => (
                  <li key={`${e.day}-${e.name}-${i}`}>
                    {multiDay && (i === 0 || schedule[i - 1].day !== e.day) && (
                      <div style={{ ...eyebrowStyle, fontSize: '0.56rem', color: MUTED, margin: `${i === 0 ? 0 : 12}px 0 8px` }}>
                        Day {e.day}
                      </div>
                    )}
                    <div
                      style={{
                        display: 'grid', gridTemplateColumns: '86px 1fr', gap: 12,
                        padding: '8px 0',
                        borderTop: i === 0 && !multiDay ? 'none' : `1px solid ${LINE}`,
                        alignItems: 'baseline',
                      }}
                    >
                      <span style={{ fontFamily: MONO, fontSize: '0.76rem', fontWeight: 600, color: OLIVE, whiteSpace: 'nowrap' }}>
                        {e.time ?? '—'}
                      </span>
                      <span style={{ fontSize: '0.92rem', lineHeight: 1.5 }}>
                        {e.name}
                        {e.venue && <span style={{ color: MUTED }}> · {e.venue}</span>}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>

        {/* ── Folio ── */}
        <footer style={{ marginTop: 34, textAlign: 'center' }}>
          <div aria-hidden style={{ width: 64, height: 1, background: GOLD, margin: '0 auto 12px', opacity: 0.7 }} />
          <p style={{ ...eyebrowStyle, fontSize: '0.56rem', color: MUTED }}>Prepared with Pearloom</p>
        </footer>
      </main>

      {/* Print: black-on-white, no chrome, hairlines kept. */}
      <style>{`
        @media print {
          .vp-page { background: #fff !important; }
          .vp-sheet { max-width: none; padding: 0; }
          .vp-sheet section { background: #fff !important; border-color: #bbb !important; break-inside: avoid; }
          .vp-noprint { display: none !important; }
          .vp-sheet a { color: #000 !important; border-bottom: none !important; text-decoration: none !important; }
        }
        @page { margin: 16mm; }
      `}</style>
    </div>
  );
}
