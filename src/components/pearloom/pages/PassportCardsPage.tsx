'use client';

// PassportCardsPage — bulk-printable sheet of per-guest cards.
// Each card carries a QR that scans to that guest's /g/[token]
// Passport. Designed for 4-up on A4 card stock.
//
// Styling ports the design-handoff "Passport" screen (ScreensShop):
// a two-column layout — a grid of editorial passport cards (tinted
// header band with the couple's mono line + Pear glyph, an italic
// display name, guest facts as mono-labelled fields, the real QR) —
// beside a sticky action rail (generate / print). Every value is
// host data; the QR is a real code to the guest's private view.

import Link from 'next/link';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { DashLayout } from '../dash/DashShell';
import { PageIntro, HintChip } from '../dash/QuietDash';
import { Icon, PearloomGlyph } from '../motifs';
import { useSelectedSite } from '@/components/marketing/design/dash/hooks';

const MONO = 'var(--pl-font-mono, ui-monospace, monospace)';
const DISPLAY = 'var(--font-display, "Fraunces", Georgia, serif)';

// The four editorial tints from the handoff, cycled by card index so
// a sheet of cards reads as a set rather than a stack of identical
// panels. Header band background + the accent ink used for the mono
// line, the Pear glyph, and the "Your passport" kicker.
const TINTS: Array<{ bg: string; ink: string }> = [
  { bg: 'var(--sage-tint)', ink: 'var(--sage-deep)' },
  { bg: 'var(--lavender-bg)', ink: 'var(--lavender-ink)' },
  { bg: 'var(--peach-bg)', ink: 'var(--peach-ink)' },
  { bg: 'rgba(193,154,75,0.16)', ink: '#8A6A2E' },
];

interface CardGuest {
  id: string;
  name: string;
  token: string;
  homeCity?: string | null;
  relationship?: string | null;
  side?: string | null;
  passportUrl: string;
  qrDataUrl?: string;
}

interface Payload {
  site: { domain: string; names: string[]; occasion: string; date: string | null; venue: string | null };
  guests: Array<Omit<CardGuest, 'qrDataUrl'>>;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// Up to two mono-labelled facts per card, pulled from whatever the
// host actually has on file (never fabricated — a guest with no
// side/relationship/city simply shows fewer fields).
function guestFacts(g: CardGuest): Array<{ label: string; value: string }> {
  const out: Array<{ label: string; value: string }> = [];
  if (g.side) out.push({ label: 'Side', value: g.side });
  if (g.relationship) out.push({ label: 'Relation', value: g.relationship });
  if (g.homeCity) out.push({ label: 'From', value: g.homeCity });
  return out.slice(0, 2);
}

export function PassportCardsPage() {
  const { site } = useSelectedSite();
  const [data, setData] = useState<Payload | null>(null);
  const [guests, setGuests] = useState<CardGuest[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!site?.id) return;
    let cancelled = false;

    setLoading(true);
    (async () => {
      try {
        const r = await fetch(`/api/passport-cards?siteId=${encodeURIComponent(site.id)}`, { cache: 'no-store' });
        if (!r.ok) throw new Error('failed');
        const d = (await r.json()) as Payload;
        if (cancelled) return;
        setData(d);

        // Generate a QR for each guest in parallel.
        const withQr = await Promise.all(
          d.guests.map(async (g) => ({
            ...g,
            qrDataUrl: await QRCode.toDataURL(g.passportUrl, {
              margin: 1,
              width: 360,
              errorCorrectionLevel: 'M',
              color: { dark: '#0E0D0B', light: '#00000000' },
            }).catch(() => ''),
          })),
        );
        if (!cancelled) setGuests(withQr);
      } catch {
        if (!cancelled) {
          setData(null);
          setGuests([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [site?.id]);

  function print() {
    if (typeof window !== 'undefined') window.print();
  }

  const names = data?.site?.names?.filter(Boolean).join(' & ') ?? '';
  const dateLabel = fmtDate(data?.site?.date ?? null);
  // The mono header line — the couple/host names, uppercased, with a
  // Pearloom mark. Falls back to a plain "PEARLOOM" when unnamed.
  const headerLine = names ? `PEARLOOM · ${names.toUpperCase()}` : 'PEARLOOM';

  return (
    <DashLayout active="passport-cards" hideTopbar>
      <div style={{ padding: '20px clamp(20px, 4vw, 40px) 32px', maxWidth: 1240, margin: '0 auto' }}>
        {/* Quiet header (DASHBOARD-LAYOUT-PLAN rule 1): one line; the
            print action rides the sticky rail (handoff Passport). */}
        <div className="pl8-no-print" style={{ marginBottom: 18 }}>
          <PageIntro
            eyebrow="Print"
            title="Passport cards"
            meta={
              <HintChip
                storageKey="pl-hint-passport-cards"
                hint="One card per guest, their name, their QR, their view of the site."
                detail="Each card carries a QR that scans to that guest's private passport view of your site. Print 4-up on card stock for the welcome bag."
              />
            }
            style={{ marginBottom: 0 }}
          />
        </div>

        {/* Two-column: the sheet of cards + a sticky action rail.
            On phones the rail drops below (grid rules in the jsx). */}
        <div
          className="pl8-passport-layout"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 300px',
            gap: 18,
            alignItems: 'start',
          }}
        >
          <div className="pl8-passport-main" style={{ minWidth: 0 }}>
            {loading && (
              <div style={{ color: 'var(--ink-soft)', fontSize: 13 }}>Threading QR codes…</div>
            )}

            {!loading && guests.length === 0 && (
              <div
                style={{
                  padding: 40,
                  textAlign: 'center',
                  background: 'var(--card)',
                  border: '1px dashed var(--line)',
                  borderRadius: 18,
                }}
              >
                <PearloomGlyph size={30} color="var(--lavender-ink)" />
                <div style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontSize: 22, color: 'var(--ink)', marginTop: 10 }}>
                  No guests on this site yet.
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 6, maxWidth: 420, marginInline: 'auto', lineHeight: 1.5 }}>
                  Add guests on the Guests page. Each one gets a unique passport QR here that scans to their own
                  view of your site.
                </div>
                <div style={{ marginTop: 16 }}>
                  <Link href="/dashboard/rsvp" className="btn btn-outline btn-sm">
                    <Icon name="users" size={12} /> Open the Guests page
                  </Link>
                </div>
              </div>
            )}

            {guests.length > 0 && (
              <div
                className="pl8-passport-sheet"
                style={{
                  background: 'var(--cream-3)',
                  padding: 'clamp(16px, 3vw, 26px)',
                  borderRadius: 16,
                  border: '1px solid var(--line-soft)',
                }}
              >
                <div
                  className="pl8-passport-grid"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                    gap: 16,
                  }}
                >
                  {guests.map((g, i) => {
                    const tint = TINTS[i % TINTS.length];
                    const facts = guestFacts(g);
                    return (
                      <article
                        key={g.id}
                        className="pl8-passport-card"
                        style={{
                          borderRadius: 14,
                          overflow: 'hidden',
                          border: '1px solid var(--line)',
                          background: 'var(--card)',
                          boxShadow: '0 2px 8px rgba(40,28,12,0.06)',
                          breakInside: 'avoid',
                        }}
                      >
                        {/* Tinted header band — mono host line + Pear mark. */}
                        <div
                          style={{
                            background: tint.bg,
                            padding: '14px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 10,
                          }}
                        >
                          <span
                            style={{
                              fontFamily: MONO,
                              fontSize: 8.5,
                              letterSpacing: '0.2em',
                              color: tint.ink,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {headerLine}
                          </span>
                          <PearloomGlyph size={16} color={tint.ink} />
                        </div>
                        {/* Body — name + facts, and the real QR. */}
                        <div style={{ padding: 16, display: 'flex', gap: 14, alignItems: 'center' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontFamily: MONO,
                                fontSize: 8.5,
                                letterSpacing: '0.14em',
                                textTransform: 'uppercase',
                                color: tint.ink,
                                marginBottom: 4,
                              }}
                            >
                              Your passport
                            </div>
                            <div
                              style={{
                                fontFamily: DISPLAY,
                                fontStyle: 'italic',
                                fontSize: 20,
                                color: 'var(--ink)',
                                lineHeight: 1.1,
                              }}
                            >
                              {g.name}
                            </div>
                            {facts.length > 0 ? (
                              <div style={{ display: 'flex', gap: 14, marginTop: 10 }}>
                                {facts.map((f) => (
                                  <div key={f.label}>
                                    <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
                                      {f.label}
                                    </div>
                                    <div style={{ fontSize: 12.5, color: 'var(--ink)', fontWeight: 600 }}>{f.value}</div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              (names || dateLabel) && (
                                <div style={{ marginTop: 10 }}>
                                  {names && (
                                    <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>for {names}</div>
                                  )}
                                  {dateLabel && (
                                    <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.08em', color: 'var(--ink-muted)', marginTop: 3 }}>
                                      {dateLabel}
                                    </div>
                                  )}
                                </div>
                              )
                            )}
                            <div
                              style={{
                                fontFamily: MONO,
                                fontSize: 9,
                                letterSpacing: '0.02em',
                                color: 'var(--ink-muted)',
                                marginTop: 10,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {g.passportUrl.replace(/^https?:\/\//, '')}
                            </div>
                          </div>
                          <div
                            style={{
                              width: 100,
                              height: 100,
                              flexShrink: 0,
                              borderRadius: 8,
                              background: 'var(--cream)',
                              border: '1px solid var(--line)',
                              display: 'grid',
                              placeItems: 'center',
                              padding: 6,
                              boxSizing: 'border-box',
                            }}
                          >
                            {g.qrDataUrl ? (
                              <img
                                src={g.qrDataUrl}
                                alt={`QR to ${g.name}'s passport`}
                                style={{ width: '100%', height: '100%' }}
                              />
                            ) : (
                              <span style={{ fontFamily: MONO, fontSize: 10, color: 'var(--ink-muted)' }}>QR</span>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Sticky action rail (handoff Passport). Hidden when printing. */}
          <aside
            className="pl8-no-print pl8-passport-rail"
            style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 16 }}
          >
            <div
              style={{
                background: 'var(--card)',
                border: '1px solid var(--card-ring, var(--line))',
                borderRadius: 16,
                padding: 22,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontFamily: MONO,
                  fontSize: 9.5,
                  fontWeight: 600,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-muted)',
                }}
              >
                <span aria-hidden style={{ width: 12, height: 1, background: 'var(--pl-gold)', flexShrink: 0 }} />
                Passport cards
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.5, margin: '12px 0 14px' }}>
                A personal card for every guest, their name, a fact or two, and a QR that greets them by name at the
                door.
              </div>
              {guests.length > 0 && (
                <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.06em', color: 'var(--ink-muted)', marginBottom: 12 }}>
                  {guests.length} {guests.length === 1 ? 'card' : 'cards'} · 4 per page
                </div>
              )}
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={print}
                disabled={!guests.length}
                style={{ width: '100%', justifyContent: 'center', marginBottom: 8 }}
              >
                <Icon name="sparkles" size={13} /> Print / save as PDF
              </button>
            </div>
          </aside>
        </div>
      </div>

      {/* Phone-width: rail drops below the sheet; the sheet itself goes
          single-column so the name column and the QR both fit. Print
          keeps a 2-up sheet — the paper page box is wider than 700px. */}
      <style jsx global>{`
        @media (max-width: 860px) {
          .pl8-passport-layout {
            grid-template-columns: 1fr !important;
          }
          .pl8-passport-rail {
            position: static !important;
          }
        }
        @media (max-width: 520px) {
          .pl8-passport-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media print {
          .pl8-no-print { display: none !important; }
          .pl8-passport-layout { display: block !important; }
          .pl8-passport-sheet { background: #fff !important; border: none !important; padding: 0 !important; }
          .pl8-passport-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </DashLayout>
  );
}
