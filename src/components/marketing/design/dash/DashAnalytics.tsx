'use client';

// Analytics — real /api/analytics/visit + /api/analytics/section.
// Visit counts drive the 4 KPI tiles and the bar chart; section
// stats drive the scroll-depth list. No demo numbers.

import { useEffect, useMemo, useState } from 'react';
import { Swirl } from '@/components/brand/groove';
import { PD, DISPLAY_STYLE, MONO_STYLE } from '../DesignAtoms';
import { DashShell, Topbar, Panel, SectionTitle, EmptyShell, btnInk, btnGhost } from './DashShell';
import { siteDisplayName, useSelectedSite, useUserSites } from './hooks';

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

function humanSectionId(id: string): string {
  return id
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function DashAnalytics() {
  const { site, loading: sitesLoading } = useSelectedSite();
  const { sites } = useUserSites();
  const [visit, setVisit] = useState<VisitStats | null>(null);
  const [sections, setSections] = useState<SectionStat[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!site?.id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`/api/analytics/visit?siteId=${encodeURIComponent(site.id)}`, { cache: 'no-store' })
        .then((r) => r.json())
        .catch(() => ({ visits: 0, today: 0, mobile: 0, desktop: 0 })),
      fetch(`/api/analytics/section?siteId=${encodeURIComponent(site.id)}`, { cache: 'no-store' })
        .then((r) => r.json())
        .catch(() => ({ sections: [] })),
    ])
      .then(([v, s]) => {
        if (cancelled) return;
        setVisit({
          visits: Number(v?.visits ?? 0),
          today: Number(v?.today ?? 0),
          mobile: Number(v?.mobile ?? 0),
          desktop: Number(v?.desktop ?? 0),
        });
        setSections((s?.sections ?? []) as SectionStat[]);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [site?.id]);

  const mobileShare = useMemo(() => {
    if (!visit || visit.visits === 0) return 0;
    return Math.round((visit.mobile / visit.visits) * 100);
  }, [visit]);

  // Scroll depth: top 8 sections by views, normalised so top = 100%.
  const depth = useMemo(() => {
    if (!sections) return [];
    const top = sections.slice(0, 8);
    const max = top.reduce((m, s) => Math.max(m, s.views), 0);
    return top.map((s, i) => ({
      s: humanSectionId(s.sectionId),
      pct: max > 0 ? Math.round((s.views / max) * 100) : 0,
      c: i < 3 ? PD.olive : i < 5 ? PD.gold : i < 7 ? PD.terra : PD.plum,
    }));
  }, [sections]);

  if (!sitesLoading && (!sites || sites.length === 0)) {
    return (
      <DashShell>
        <EmptyShell message="Publish a site first — analytics light up once guests visit." />
      </DashShell>
    );
  }
  if (!site) {
    return (
      <DashShell>
        <EmptyShell message="Pick a site from the top-right menu to see its analytics." />
      </DashShell>
    );
  }

  const siteName = siteDisplayName(site);

  return (
    <DashShell>
      <Topbar
        subtitle={`ANALYTICS · ${siteName.toUpperCase()}`}
        title={
          <span>
            Quiet{' '}
            <i style={{ color: PD.olive, fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1' }}>
              numbers
            </i>
            , warm{' '}
            <i style={{ color: PD.gold, fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1' }}>
              readings
            </i>
            .
          </span>
        }
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={btnGhost}>Export CSV</button>
            <button style={btnInk}>✦ Ask Pear to summarize</button>
          </div>
        }
      >
        Privacy-respecting signals — visits, devices, and the sections your guests dwell on. No
        creepy trackers.
      </Topbar>

      <main style={{ padding: '20px 40px 60px' }}>
        {error && (
          <Panel bg="#F1D7CE" style={{ padding: 14, marginBottom: 16, fontSize: 13, color: PD.terra }}>
            {error}
          </Panel>
        )}

        {/* KPIs */}
        <div
          className="pd-analytics-kpi"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}
        >
          {[
            {
              l: 'Site visits · all time',
              v: loading ? '—' : (visit?.visits ?? 0).toLocaleString(),
              delta: visit?.today ? `${visit.today} today` : 'Since launch',
              c: PD.olive,
            },
            {
              l: 'Today',
              v: loading ? '—' : (visit?.today ?? 0).toLocaleString(),
              delta: 'Since midnight',
              c: PD.gold,
            },
            {
              l: 'Mobile share',
              v: loading ? '—' : `${mobileShare}%`,
              delta: visit
                ? `${visit.mobile} mobile · ${visit.desktop} desktop`
                : '',
              c: PD.plum,
            },
            {
              l: 'Sections tracked',
              v: loading ? '—' : (sections?.length ?? 0).toLocaleString(),
              delta: sections && sections.length > 0 ? 'On the live site' : 'Nothing yet',
              c: PD.terra,
            },
          ].map((k) => (
            <Panel key={k.l} bg={PD.paperCard} style={{ padding: '18px 20px' }}>
              <div style={{ ...MONO_STYLE, fontSize: 9, opacity: 0.55, marginBottom: 8 }}>
                {k.l.toUpperCase()}
              </div>
              <div
                style={{
                  ...DISPLAY_STYLE,
                  fontSize: 40,
                  lineHeight: 1,
                  fontWeight: 400,
                  letterSpacing: '-0.025em',
                }}
              >
                {k.v}
              </div>
              <div style={{ fontSize: 11.5, color: k.c, marginTop: 8, fontWeight: 500 }}>
                {k.delta}
              </div>
            </Panel>
          ))}
        </div>

        {/* Two panels */}
        <div
          className="pd-analytics-charts"
          style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 20, marginBottom: 20 }}
        >
          <Panel bg={PD.paper3} style={{ padding: 28 }}>
            <SectionTitle
              eyebrow="DEVICES"
              title="Where they&rsquo;re"
              italic="reading from."
              accent={PD.olive}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <DeviceBar label="Mobile" n={visit?.mobile ?? 0} total={visit?.visits ?? 0} c={PD.olive} />
              <DeviceBar label="Desktop" n={visit?.desktop ?? 0} total={visit?.visits ?? 0} c={PD.gold} />
            </div>
            <div
              style={{
                marginTop: 20,
                padding: '12px 14px',
                background: PD.paperCard,
                borderRadius: 12,
                fontSize: 13,
                color: PD.inkSoft,
                lineHeight: 1.5,
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
              }}
            >
              <span
                style={{
                  fontSize: 16,
                  color: PD.terra,
                  fontFamily: '"Fraunces", Georgia, serif',
                }}
              >
                ✦
              </span>
              <span>
                <b>Pear&rsquo;s take.</b>{' '}
                {visit && visit.visits > 0
                  ? mobileShare >= 60
                    ? 'Most guests are on their phones. Keep headlines short and photos full-bleed.'
                    : mobileShare <= 30
                    ? 'Desktop-heavy — your long story sections are working.'
                    : 'An even split. Layouts that read both ways will carry you.'
                  : 'Nothing to read yet. Analytics fill in as guests visit.'}
              </span>
            </div>
          </Panel>

          <Panel bg={PD.paperDeep} style={{ padding: 28 }}>
            <SectionTitle
              eyebrow="TODAY"
              title="Visits"
              italic="in the last 24h."
              accent={PD.gold}
            />
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div
                style={{
                  ...DISPLAY_STYLE,
                  fontSize: 120,
                  lineHeight: 1,
                  letterSpacing: '-0.04em',
                  color: PD.ink,
                }}
              >
                {loading ? '…' : (visit?.today ?? 0).toLocaleString()}
              </div>
            </div>
            <div
              style={{
                marginTop: 20,
                fontSize: 13,
                color: PD.inkSoft,
                lineHeight: 1.5,
                fontFamily: 'var(--pl-font-body)',
              }}
            >
              {visit && visit.visits > 0
                ? `${((visit.today / visit.visits) * 100).toFixed(1)}% of your all-time visits happened today.`
                : 'Pearloom records a visit the first time each visitor opens the site — no repeat inflation.'}
            </div>
          </Panel>
        </div>

        {/* Scroll depth */}
        <div
          className="pd-analytics-scroll"
          style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20 }}
        >
          <Panel bg={PD.paper} style={{ padding: 28 }}>
            <SectionTitle
              eyebrow="WHAT PEOPLE READ"
              title="Engagement"
              italic="by section."
              accent={PD.plum}
            />
            {depth.length === 0 ? (
              <div style={{ fontSize: 13.5, color: PD.inkSoft, lineHeight: 1.55, maxWidth: 520 }}>
                No section views yet. Sections start showing up here once guests scroll past them on
                your published site.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {depth.map((r) => (
                  <div
                    key={r.s}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '140px 1fr 54px',
                      gap: 14,
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{r.s}</div>
                    <div
                      style={{
                        height: 12,
                        background: PD.paper3,
                        borderRadius: 99,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${r.pct}%`,
                          height: '100%',
                          background: r.c,
                          borderRadius: 99,
                          transition: 'width 600ms',
                        }}
                      />
                    </div>
                    <div
                      style={{
                        ...MONO_STYLE,
                        fontSize: 11,
                        textAlign: 'right',
                        color: r.c,
                        fontWeight: 500,
                      }}
                    >
                      {r.pct}%
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel
            bg={PD.ink}
            style={{
              padding: 28,
              color: PD.paper,
              border: 'none',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ position: 'absolute', bottom: -40, right: -30, opacity: 0.4 }} aria-hidden>
              <Swirl size={180} color={PD.butter} strokeWidth={2} />
            </div>
            <div style={{ ...MONO_STYLE, fontSize: 10, color: PD.butter, marginBottom: 8 }}>
              PEAR&rsquo;S READING
            </div>
            <div
              style={{
                ...DISPLAY_STYLE,
                fontSize: 22,
                lineHeight: 1.3,
                fontStyle: 'italic',
                fontWeight: 400,
                marginBottom: 18,
                position: 'relative',
                fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
              }}
            >
              {depth.length === 0
                ? '"Your site&rsquo;s quiet for now. Every visit tells us a little more."'
                : depth.length >= 4 && depth[3].pct < 50
                ? '"Guests drop off around the middle sections. Want me to tighten them?"'
                : '"Your top sections are holding attention. Keep the thread going."'}
            </div>
            <div style={{ display: 'flex', gap: 8, position: 'relative', flexWrap: 'wrap' }}>
              <button style={{ ...btnInk, background: PD.paper, color: PD.ink }}>Ask Pear why</button>
              <button
                style={{ ...btnGhost, color: PD.paper, borderColor: 'rgba(244,236,216,0.22)' }}
              >
                Dismiss
              </button>
            </div>
          </Panel>
        </div>
      </main>

      <style jsx>{`
        @media (max-width: 1100px) {
          :global(.pd-analytics-kpi) {
            grid-template-columns: 1fr 1fr !important;
          }
          :global(.pd-analytics-charts),
          :global(.pd-analytics-scroll) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </DashShell>
  );
}

function DeviceBar({ label, n, total, c }: { label: string; n: number; total: number; c: string }) {
  const pct = total > 0 ? Math.round((n / total) * 100) : 0;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
        <span style={{ ...DISPLAY_STYLE, fontSize: 28, color: PD.ink }}>{n.toLocaleString()}</span>
        <span style={{ ...MONO_STYLE, fontSize: 10, color: c }}>{pct}%</span>
      </div>
      <div style={{ height: 6, background: PD.paperCard, borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: c, borderRadius: 99 }} />
      </div>
      <div
        style={{
          ...MONO_STYLE,
          fontSize: 10,
          opacity: 0.55,
          marginTop: 6,
        }}
      >
        {label.toUpperCase()}
      </div>
    </div>
  );
}
