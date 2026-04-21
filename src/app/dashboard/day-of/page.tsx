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
import { CurvedText } from '@/components/brand/groove';

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
                    aria-hidden
                    style={{
                      color: 'var(--pl-groove-terra)',
                      marginBottom: 2,
                      marginLeft: -6,
                    }}
                  >
                    <CurvedText
                      variant="wave"
                      width={280}
                      amplitude={10}
                      fontFamily='var(--pl-font-body)'
                      fontSize={14}
                      fontWeight={500}
                      letterSpacing={1.4}
                      aria-label="The day-of room"
                    >
                      ✦  The day-of room  ✦
                    </CurvedText>
                  </div>
                  <h1
                    style={{
                      margin: 0,
                      fontFamily: 'var(--pl-font-body)',
                      fontWeight: 700,
                      fontSize: 'clamp(2rem, 4.2vw, 2.8rem)',
                      color: 'var(--pl-groove-ink)',
                      lineHeight: 1.1,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    Run the room
                  </h1>
                  <p
                    style={{
                      margin: '14px 0 0',
                      maxWidth: '56ch',
                      color: 'color-mix(in oklab, var(--pl-groove-ink) 70%, transparent)',
                      fontSize: 'clamp(0.96rem, 1.2vw, 1.06rem)',
                      lineHeight: 1.6,
                    }}
                  >
                    Announcements, voice toasts, and vendor bookings — one
                    calm room with all the night&apos;s moving parts in sight.
                  </p>
                </div>

                {sites.length > 0 && (
                  <div style={{ minWidth: 260 }}>
                    <div
                      style={{
                        fontFamily: 'var(--pl-font-body)',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        color: 'var(--pl-groove-terra)',
                        marginBottom: 8,
                      }}
                    >
                      Select a site
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
                  padding: '72px 40px 64px',
                  borderRadius: 'var(--pl-groove-radius-blob)',
                  textAlign: 'center',
                  background:
                    'radial-gradient(ellipse at top, color-mix(in oklab, var(--pl-groove-butter) 22%, var(--pl-groove-cream)) 0%, var(--pl-groove-cream) 70%)',
                  border: '1px solid color-mix(in oklab, var(--pl-groove-terra) 22%, transparent)',
                  overflow: 'hidden',
                }}
              >
                <div
                  aria-hidden
                  style={{
                    position: 'absolute',
                    top: '-80px',
                    right: '-60px',
                    width: 300,
                    height: 300,
                    borderRadius: '42% 58% 70% 30% / 45% 30% 70% 55%',
                    background: 'var(--pl-groove-rose)',
                    opacity: 0.22,
                    filter: 'blur(60px)',
                    animation: 'pl-groove-blob-morph 20s ease-in-out infinite',
                    pointerEvents: 'none',
                  }}
                />
                <h3
                  style={{
                    position: 'relative',
                    margin: 0,
                    fontFamily: 'var(--pl-font-body)',
                    fontWeight: 700,
                    fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                    color: 'var(--pl-groove-ink)',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.15,
                  }}
                >
                  Nothing to run yet
                </h3>
                <p
                  style={{
                    position: 'relative',
                    margin: '14px auto 28px',
                    maxWidth: '48ch',
                    color: 'color-mix(in oklab, var(--pl-groove-ink) 70%, transparent)',
                    fontSize: '1rem',
                    lineHeight: 1.6,
                  }}
                >
                  The day-of room comes alive once you have a site with
                  guests, vendors, and a date on the book.
                </p>
                <Link
                  href="/dashboard"
                  style={{
                    position: 'relative',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '14px 26px',
                    minHeight: 48,
                    background: 'var(--pl-groove-blob-sunrise)',
                    color: '#fff',
                    borderRadius: 'var(--pl-groove-radius-pill)',
                    textDecoration: 'none',
                    fontFamily: 'var(--pl-font-body)',
                    fontSize: '0.96rem',
                    fontWeight: 600,
                    letterSpacing: '-0.005em',
                    boxShadow:
                      '0 6px 18px rgba(139,74,106,0.24), 0 2px 6px rgba(43,30,20,0.08)',
                  }}
                >
                  Begin a new site →
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
