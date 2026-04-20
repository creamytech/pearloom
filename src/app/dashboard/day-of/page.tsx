'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / app/dashboard/day-of/page.tsx
//
// Event Ops hub — announcements composer, voice-toast moderation,
// and vendor bookings for a selected site. Wave C rewire: uses
// shared shell primitives (SiteSelector, PageCard) and design
// tokens instead of inline hex.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnnouncementsPanel } from '@/components/dashboard/AnnouncementsPanel';
import { VoiceToastsPanel } from '@/components/dashboard/VoiceToastsPanel';
import { VendorBookingsPanel } from '@/components/dashboard/VendorBookingsPanel';
import { SiteSelector } from '@/components/shell';
import type { SiteOption } from '@/components/shell';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

interface SiteSummary {
  id: string;
  domain: string;
  names?: [string, string];
}

export default function DayOfPage() {
  const [sites, setSites] = useState<SiteSummary[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/sites');
        if (!r.ok) return;
        const data = await r.json();
        const list: SiteSummary[] = (data.sites ?? []).map((s: { id: string; domain: string; names?: [string, string] }) => ({
          id: s.id,
          domain: s.domain,
          names: s.names,
        }));
        setSites(list);
        if (list.length > 0) setSelected(list[0].id);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const siteOptions: SiteOption[] = sites.map((s) => ({
    id: s.id,
    label: s.names?.filter(Boolean).join(' & ') || s.domain,
    subdomain: s.domain,
  }));

  const year = new Date().getFullYear();

  return (
    <DashboardShell eyebrow="Event ops">
            {/* Editorial masthead */}
            <header
              style={{
                position: 'relative',
                marginBottom: 40,
                paddingBottom: 32,
                borderBottom: '1px solid var(--pl-divider)',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  background:
                    'linear-gradient(90deg, var(--pl-gold) 0%, rgba(184,147,90,0) 40%)',
                }}
              />
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  gap: 28,
                  flexWrap: 'wrap',
                  paddingTop: 18,
                }}
              >
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div
                    style={{
                      fontFamily: 'var(--pl-font-mono)',
                      fontSize: '0.5rem',
                      fontWeight: 700,
                      letterSpacing: '0.28em',
                      textTransform: 'uppercase',
                      color: 'var(--pl-olive)',
                      marginBottom: 18,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <span
                      style={{
                        width: 22,
                        height: 1,
                        background: 'var(--pl-gold)',
                      }}
                    />
                    Day-of schedule · {year}
                  </div>
                  <h1
                    className="pl-display"
                    style={{
                      margin: 0,
                      fontSize: 'clamp(2.4rem, 5vw, 3.4rem)',
                      color: 'var(--pl-ink)',
                      lineHeight: 1.02,
                      letterSpacing: '-0.01em',
                      fontStyle: 'italic',
                      fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                    }}
                  >
                    Run the room.
                  </h1>
                  <p
                    style={{
                      margin: '16px 0 0',
                      maxWidth: '56ch',
                      color: 'var(--pl-ink-soft)',
                      fontSize: 'clamp(0.96rem, 1.2vw, 1.06rem)',
                      lineHeight: 1.6,
                    }}
                  >
                    Announcements · voice toasts · vendor bookings. One calm
                    room, three stations, all the night&apos;s moving parts.
                  </p>
                </div>

                {sites.length > 0 && (
                  <div style={{ minWidth: 260 }}>
                    <div
                      style={{
                        fontFamily: 'var(--pl-font-mono)',
                        fontSize: '0.46rem',
                        fontWeight: 700,
                        letterSpacing: '0.28em',
                        textTransform: 'uppercase',
                        color: 'var(--pl-olive)',
                        marginBottom: 8,
                      }}
                    >
                      Dossier · select site
                    </div>
                    <SiteSelector
                      options={siteOptions}
                      value={selected}
                      onChange={setSelected}
                    />
                  </div>
                )}
              </div>
            </header>

            {loading ? (
              <div
                style={{
                  padding: 56,
                  textAlign: 'center',
                  border: '1px dashed rgba(184,147,90,0.4)',
                  borderRadius: 'var(--pl-radius-xs)',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--pl-font-mono)',
                    fontSize: '0.5rem',
                    fontWeight: 700,
                    letterSpacing: '0.28em',
                    textTransform: 'uppercase',
                    color: 'var(--pl-gold)',
                    marginBottom: 10,
                  }}
                >
                  Loading · dossier
                </div>
                <div
                  style={{
                    fontFamily: 'var(--pl-font-display)',
                    fontStyle: 'italic',
                    fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                    fontSize: '1.2rem',
                    color: 'var(--pl-ink-soft)',
                  }}
                >
                  Gathering the call-sheet…
                </div>
              </div>
            ) : sites.length === 0 ? (
              <section
                style={{
                  position: 'relative',
                  padding: '64px 32px',
                  border: '1px dashed rgba(184,147,90,0.5)',
                  borderRadius: 'var(--pl-radius-xs)',
                  textAlign: 'center',
                  background:
                    'radial-gradient(ellipse at top, rgba(184,147,90,0.06), transparent 70%)',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: 10,
                    left: 12,
                    fontFamily: 'var(--pl-font-mono)',
                    fontSize: '0.46rem',
                    fontWeight: 700,
                    letterSpacing: '0.28em',
                    textTransform: 'uppercase',
                    color: 'var(--pl-gold)',
                  }}
                >
                  Empty call-sheet
                </span>
                <span
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 12,
                    fontFamily: 'var(--pl-font-mono)',
                    fontSize: '0.46rem',
                    fontWeight: 700,
                    letterSpacing: '0.28em',
                    textTransform: 'uppercase',
                    color: 'var(--pl-gold)',
                  }}
                >
                  № 00
                </span>
                <div
                  style={{
                    fontFamily: 'var(--pl-font-mono)',
                    fontSize: '0.5rem',
                    fontWeight: 700,
                    letterSpacing: '0.3em',
                    textTransform: 'uppercase',
                    color: 'var(--pl-olive)',
                    marginBottom: 14,
                  }}
                >
                  Prologue
                </div>
                <h3
                  style={{
                    margin: 0,
                    fontFamily: 'var(--pl-font-display)',
                    fontStyle: 'italic',
                    fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                    fontSize: '2rem',
                    color: 'var(--pl-ink)',
                    letterSpacing: '-0.01em',
                    lineHeight: 1.05,
                  }}
                >
                  No sites yet.
                </h3>
                <p
                  style={{
                    margin: '12px auto 22px',
                    maxWidth: '46ch',
                    color: 'var(--pl-ink-soft)',
                    fontSize: '0.98rem',
                    lineHeight: 1.6,
                  }}
                >
                  The day-of room comes alive once you have a site with guests,
                  vendors, and a date on the book.
                </p>
                <Link
                  href="/dashboard"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 22px',
                    background: 'var(--pl-ink)',
                    color: 'var(--pl-cream)',
                    borderRadius: 'var(--pl-radius-xs)',
                    textDecoration: 'none',
                    fontFamily: 'var(--pl-font-mono)',
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    letterSpacing: '0.24em',
                    textTransform: 'uppercase',
                    boxShadow: '0 0 0 3px rgba(184,147,90,0.18)',
                  }}
                >
                  Create a site →
                </Link>
              </section>
            ) : (
              <>
                {/* Station legend */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    marginBottom: 20,
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'var(--pl-font-mono)',
                      fontSize: '0.48rem',
                      fontWeight: 700,
                      letterSpacing: '0.28em',
                      textTransform: 'uppercase',
                      color: 'var(--pl-olive)',
                    }}
                  >
                    Three stations
                  </div>
                  <span
                    style={{
                      fontFamily: 'var(--pl-font-mono)',
                      fontSize: '0.5rem',
                      fontWeight: 700,
                      letterSpacing: '0.24em',
                      textTransform: 'uppercase',
                      color: 'var(--pl-muted)',
                    }}
                  >
                    № 01—03
                  </span>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(auto-fit, minmax(360px, 1fr))',
                    gap: 20,
                    alignItems: 'start',
                  }}
                >
                  <StationCard
                    index={1}
                    eyebrow="Push · guests"
                    title="Announcements"
                    accent="olive"
                  >
                    {selected && <AnnouncementsPanel siteId={selected} />}
                  </StationCard>
                  <StationCard
                    index={2}
                    eyebrow="Moderate · approve"
                    title="Voice toasts"
                    accent="gold"
                  >
                    {selected && <VoiceToastsPanel siteId={selected} />}
                  </StationCard>
                  <StationCard
                    index={3}
                    eyebrow="Deposits · timeline"
                    title="Vendor bookings"
                    accent="plum"
                  >
                    {selected && <VendorBookingsPanel siteId={selected} />}
                  </StationCard>
                </div>
              </>
            )}
    </DashboardShell>
  );
}

function StationCard({
  index,
  eyebrow,
  title,
  accent,
  children,
}: {
  index: number;
  eyebrow: string;
  title: string;
  accent: 'olive' | 'gold' | 'plum';
  children: React.ReactNode;
}) {
  const accentColor =
    accent === 'olive'
      ? 'var(--pl-olive)'
      : accent === 'gold'
        ? 'var(--pl-gold)'
        : 'var(--pl-plum)';
  return (
    <article
      style={{
        position: 'relative',
        background: 'var(--pl-cream-card)',
        border: '1px solid var(--pl-divider)',
        borderRadius: 'var(--pl-radius-xs)',
        overflow: 'hidden',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: accentColor,
        }}
      />
      <header
        style={{
          padding: '20px 22px 16px',
          borderBottom: '1px solid var(--pl-divider)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: 'var(--pl-font-mono)',
              fontSize: '0.46rem',
              fontWeight: 700,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: 'var(--pl-olive)',
              marginBottom: 6,
            }}
          >
            {eyebrow}
          </div>
          <h2
            style={{
              margin: 0,
              fontFamily: 'var(--pl-font-display)',
              fontStyle: 'italic',
              fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
              fontSize: '1.5rem',
              letterSpacing: '-0.01em',
              color: 'var(--pl-ink)',
            }}
          >
            {title}
          </h2>
        </div>
        <span
          style={{
            fontFamily: 'var(--pl-font-mono)',
            fontSize: '0.54rem',
            fontWeight: 700,
            letterSpacing: '0.22em',
            color: accentColor,
          }}
        >
          № {String(index).padStart(2, '0')}
        </span>
      </header>
      {children}
    </article>
  );
}
