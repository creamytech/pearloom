'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / dashboard/analytics/AnalyticsClient.tsx
// Editorial analytics hub. Pulls from /api/analytics/visit and
// /api/analytics/section. Mirrors the marketing aesthetic — no
// generic chart junk, just the numbers that matter for a host.
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Smartphone,
  Monitor,
  Eye,
  Clock,
} from 'lucide-react';
import {
  PageCard,
  SiteSelector,
  EmptyState,
  StatTile,
  SkeletonStack,
} from '@/components/shell';
import type { SiteOption } from '@/components/shell';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { BlurFade, CurvedText, GrooveBlob } from '@/components/brand/groove';

interface SiteSummary {
  id: string;
  domain: string;
  names?: [string, string];
}

interface VisitStats {
  visits: number;
  today: number;
  mobile: number;
  desktop: number;
}

interface SectionStat {
  sectionId: string;
  views: number;
  avgDurationMs: number;
}

export default function AnalyticsClient() {
  const [sites, setSites] = useState<SiteSummary[]>([]);
  const [loadingSites, setLoadingSites] = useState(true);
  const [selected, setSelected] = useState<string>('');
  const [visitStats, setVisitStats] = useState<VisitStats | null>(null);
  const [sectionStats, setSectionStats] = useState<SectionStat[] | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/sites');
        if (!r.ok) return;
        const data = await r.json();
        const list: SiteSummary[] = (data.sites ?? []).map(
          (s: { id: string; domain: string; names?: [string, string] }) => ({
            id: s.id,
            domain: s.domain,
            names: s.names,
          }),
        );
        setSites(list);
        if (list.length > 0) setSelected(list[0].id);
      } finally {
        setLoadingSites(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoadingStats(true);
    setVisitStats(null);
    setSectionStats(null);
    Promise.all([
      fetch(`/api/analytics/visit?siteId=${selected}`).then((r) => r.json()),
      fetch(`/api/analytics/section?siteId=${selected}`).then((r) => r.json()),
    ])
      .then(([visit, section]) => {
        setVisitStats(visit);
        setSectionStats(section.sections ?? []);
      })
      .catch(() => {
        setVisitStats({ visits: 0, today: 0, mobile: 0, desktop: 0 });
        setSectionStats([]);
      })
      .finally(() => setLoadingStats(false));
  }, [selected]);

  const siteOptions: SiteOption[] = sites.map((s) => ({
    id: s.id,
    label: s.names?.filter(Boolean).join(' & ') || s.domain,
    subdomain: s.domain,
  }));

  const mobileShare = useMemo(() => {
    if (!visitStats || visitStats.visits === 0) return 0;
    return Math.round((visitStats.mobile / visitStats.visits) * 100);
  }, [visitStats]);

  const topSections = useMemo(
    () => (sectionStats ?? []).slice(0, 6),
    [sectionStats],
  );
  const maxViews = useMemo(
    () => topSections.reduce((m, s) => Math.max(m, s.views), 0),
    [topSections],
  );

  return (
    <DashboardShell eyebrow="Grow · Analytics">
            <div style={{ position: 'relative' }}>
              <GrooveBlob
                palette="sunrise"
                size={380}
                blur={80}
                opacity={0.26}
                style={{ position: 'absolute', top: '-80px', right: '-80px', zIndex: 0, pointerEvents: 'none' }}
              />
              <BlurFade>
              <div
                style={{
                  position: 'relative',
                  zIndex: 1,
                  marginBottom: 32,
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  gap: 24,
                  flexWrap: 'wrap',
                  paddingBottom: 24,
                  borderBottom: '1px solid color-mix(in oklab, var(--pl-groove-terra) 20%, transparent)',
                }}
              >
                <div>
                  <div
                    aria-hidden
                    style={{
                      marginBottom: 4,
                      marginLeft: -6,
                      color: 'var(--pl-groove-terra)',
                    }}
                  >
                    <CurvedText
                      variant="wave"
                      width={280}
                      amplitude={10}
                      fontFamily='var(--pl-font-body)'
                      fontSize={14}
                      fontWeight={500}
                      letterSpacing={1.5}
                      aria-label="Grow · Analytics"
                    >
                      ✦  Grow · Analytics  ✦
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
                    Who&rsquo;s reading.
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
                    Gentle, privacy-respecting signals — visits, devices, and the
                    sections your guests dwell on. No creepy trackers.
                  </p>
                </div>

                {sites.length > 0 && (
                  <div style={{ minWidth: 240 }}>
                    <SiteSelector
                      options={siteOptions}
                      value={selected}
                      onChange={setSelected}
                    />
                  </div>
                )}
              </div>
              </BlurFade>
            </div>

            {loadingSites ? (
              <SkeletonStack rows={3} />
            ) : sites.length === 0 ? (
              <EmptyState
                size="hero"
                eyebrow="No sites yet"
                title="Create a site to start collecting signals"
                description="Analytics light up once your site is live and guests start dropping by."
                actions={
                  <Link
                    href="/dashboard"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 18px',
                      background: 'var(--pl-groove-blob-sunrise)',
                      color: '#fff',
                      borderRadius: 'var(--pl-groove-radius-pill)',
                      textDecoration: 'none',
                      fontSize: '0.86rem',
                      fontWeight: 600,
                      boxShadow: '0 6px 18px rgba(139,74,106,0.24), 0 2px 6px rgba(43,30,20,0.08)',
                    }}
                  >
                    Create a site
                  </Link>
                }
              />
            ) : (
              <>
                {/* Stat tiles */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 14,
                    marginBottom: 28,
                  }}
                >
                  <StatTile
                    label="Total visits"
                    value={loadingStats ? '—' : (visitStats?.visits ?? 0).toLocaleString()}
                    icon={<Eye size={14} />}
                    accent="olive"
                    hint={
                      visitStats
                        ? `${visitStats.today} today`
                        : 'All time'
                    }
                  />
                  <StatTile
                    label="Today"
                    value={loadingStats ? '—' : (visitStats?.today ?? 0).toLocaleString()}
                    icon={<Clock size={14} />}
                    accent="gold"
                    hint="Since midnight"
                  />
                  <StatTile
                    label="Mobile share"
                    value={loadingStats ? '—' : `${mobileShare}%`}
                    icon={<Smartphone size={14} />}
                    accent="plum"
                    hint={
                      visitStats
                        ? `${visitStats.mobile} mobile · ${visitStats.desktop} desktop`
                        : ''
                    }
                  />
                  <StatTile
                    label="Desktop"
                    value={loadingStats ? '—' : (visitStats?.desktop ?? 0).toLocaleString()}
                    icon={<Monitor size={14} />}
                    accent="none"
                    hint="Larger screens"
                  />
                </div>

                {/* Section breakdown — ranked editorial ledger */}
                <PageCard
                  title="Top sections"
                  eyebrow="Engagement · By block"
                  description="The blocks your guests lingered on the longest."
                  padding="md"
                  accent="olive"
                >
                  {loadingStats ? (
                    <SkeletonStack rows={4} />
                  ) : topSections.length === 0 ? (
                    <EmptyState
                      size="default"
                      icon={<BarChart3 size={20} />}
                      eyebrow="Nothing yet"
                      title="No section data"
                      description="As soon as guests land, the top blocks will surface here."
                    />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {/* Mono column rule header */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '28px 1fr auto auto',
                        alignItems: 'center',
                        columnGap: 16,
                        paddingBottom: 10,
                        marginBottom: 6,
                        borderBottom: '1px solid color-mix(in oklab, var(--pl-groove-terra) 28%, transparent)',
                        fontFamily: 'var(--pl-font-body)',
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        letterSpacing: '0.04em',
                        color: 'color-mix(in oklab, var(--pl-groove-ink) 55%, transparent)',
                      }}>
                        <span>#</span>
                        <span>Section</span>
                        <span style={{ textAlign: 'right' }}>Views</span>
                        <span style={{ textAlign: 'right', minWidth: 72 }}>Avg dwell</span>
                      </div>

                      {topSections.map((s, i) => {
                        const pct = maxViews > 0 ? (s.views / maxViews) * 100 : 0;
                        const isTop = i === 0;
                        return (
                          <div
                            key={s.sectionId}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 6,
                              padding: '10px 0 12px',
                              borderBottom: i < topSections.length - 1 ? '1px dotted color-mix(in oklab, var(--pl-groove-ink) 10%, transparent)' : 'none',
                            }}
                          >
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: '28px 1fr auto auto',
                              alignItems: 'baseline',
                              columnGap: 16,
                            }}>
                              {/* Rank */}
                              <span style={{
                                fontFamily: 'var(--pl-font-body)',
                                fontSize: '0.86rem',
                                fontWeight: 700,
                                color: isTop ? 'var(--pl-groove-plum)' : 'color-mix(in oklab, var(--pl-groove-ink) 50%, transparent)',
                              }}>
                                {String(i + 1).padStart(2, '0')}
                              </span>
                              {/* Section name */}
                              <span style={{
                                fontFamily: 'var(--pl-font-body)',
                                fontWeight: 600,
                                fontSize: '0.98rem',
                                lineHeight: 1.15,
                                letterSpacing: '-0.005em',
                                color: 'var(--pl-groove-ink)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}>
                                {prettySectionId(s.sectionId)}
                              </span>
                              {/* Views */}
                              <span style={{
                                fontFamily: 'var(--pl-font-mono)',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                color: 'var(--pl-groove-ink)',
                                textAlign: 'right',
                              }}>
                                {s.views.toLocaleString()}
                              </span>
                              {/* Dwell */}
                              <span style={{
                                fontFamily: 'var(--pl-font-mono)',
                                fontSize: '0.62rem',
                                fontWeight: 600,
                                letterSpacing: '0.12em',
                                color: 'color-mix(in oklab, var(--pl-groove-ink) 55%, transparent)',
                                textAlign: 'right',
                                minWidth: 72,
                              }}>
                                {formatDuration(s.avgDurationMs)}
                              </span>
                            </div>
                            {/* Meter — soft groove rail, filled portion thicker */}
                            <div style={{
                              marginLeft: 44,
                              position: 'relative',
                              height: 2,
                              background: 'color-mix(in oklab, var(--pl-groove-ink) 6%, transparent)',
                              overflow: 'visible',
                              borderRadius: 'var(--pl-radius-full)',
                            }}>
                              <div style={{
                                position: 'absolute',
                                left: 0, top: -1,
                                width: `${pct}%`,
                                height: 4,
                                borderRadius: 'var(--pl-radius-full)',
                                background: isTop
                                  ? 'linear-gradient(90deg, var(--pl-groove-terra), var(--pl-groove-plum))'
                                  : 'var(--pl-groove-sage)',
                                transition: 'width 0.7s cubic-bezier(0.22, 1, 0.36, 1)',
                              }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </PageCard>

                {/* Note */}
                <p
                  style={{
                    marginTop: 24,
                    fontSize: '0.82rem',
                    color: 'color-mix(in oklab, var(--pl-groove-ink) 60%, transparent)',
                    fontFamily: 'var(--pl-font-body)',
                    maxWidth: '60ch',
                    lineHeight: 1.55,
                  }}
                >
                  Pearloom analytics are host-only and aggregate. We never
                  fingerprint individual guests.
                </p>
              </>
            )}
    </DashboardShell>
  );
}

function formatDuration(ms: number): string {
  if (!ms || ms < 1000) return '0s avg';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s avg`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem ? `${m}m ${rem}s avg` : `${m}m avg`;
}

function prettySectionId(id: string): string {
  return id
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
