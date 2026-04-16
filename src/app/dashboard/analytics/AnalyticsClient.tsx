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
            {/* Editorial header */}
            <div
              style={{
                marginBottom: 32,
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                gap: 24,
                flexWrap: 'wrap',
                paddingBottom: 24,
                borderBottom: '1px solid var(--pl-divider)',
              }}
            >
              <div>
                <div className="pl-overline" style={{ marginBottom: 14 }}>
                  Grow · Analytics
                </div>
                <h1
                  className="pl-display"
                  style={{
                    margin: 0,
                    fontSize: 'clamp(1.8rem, 3.2vw, 2.4rem)',
                    color: 'var(--pl-ink)',
                    lineHeight: 1.05,
                    letterSpacing: '-0.02em',
                  }}
                >
                  Who&apos;s{' '}
                  <em
                    style={{
                      color: 'var(--pl-olive)',
                      fontStyle: 'italic',
                      fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                    }}
                  >
                    reading
                  </em>
                  .
                </h1>
                <p
                  style={{
                    margin: '8px 0 0',
                    color: 'var(--pl-muted)',
                    fontSize: '0.95rem',
                    lineHeight: 1.55,
                    maxWidth: '56ch',
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
                      background: 'var(--pl-ink)',
                      color: 'var(--pl-cream)',
                      borderRadius: 'var(--pl-radius-full)',
                      textDecoration: 'none',
                      fontSize: '0.86rem',
                      fontWeight: 600,
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

                {/* Section breakdown */}
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
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                      }}
                    >
                      {topSections.map((s) => {
                        const pct =
                          maxViews > 0 ? (s.views / maxViews) * 100 : 0;
                        return (
                          <div
                            key={s.sectionId}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 6,
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: 12,
                                fontSize: '0.88rem',
                                color: 'var(--pl-ink)',
                              }}
                            >
                              <span
                                style={{
                                  fontFamily: 'var(--pl-font-display)',
                                  fontWeight: 500,
                                  letterSpacing: '-0.005em',
                                }}
                              >
                                {prettySectionId(s.sectionId)}
                              </span>
                              <span
                                style={{
                                  color: 'var(--pl-muted)',
                                  fontFamily: 'var(--pl-font-mono)',
                                  fontSize: '0.76rem',
                                  letterSpacing: '0.05em',
                                }}
                              >
                                {s.views.toLocaleString()} views ·{' '}
                                {formatDuration(s.avgDurationMs)}
                              </span>
                            </div>
                            <div
                              style={{
                                height: 6,
                                background: 'var(--pl-cream-deep)',
                                borderRadius: 999,
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  width: `${pct}%`,
                                  height: '100%',
                                  background:
                                    'linear-gradient(90deg, var(--pl-olive), var(--pl-gold))',
                                  borderRadius: 999,
                                  transition:
                                    'width var(--pl-dur-slow) var(--pl-ease-out)',
                                }}
                              />
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
                    fontSize: '0.78rem',
                    color: 'var(--pl-muted)',
                    fontStyle: 'italic',
                    fontFamily: 'var(--pl-font-display)',
                    fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                    maxWidth: '60ch',
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
