'use client';

// Analytics — real /api/analytics/visit + /api/analytics/section.
// Visit counts drive the 4 KPI tiles and the bar chart; section
// stats drive the scroll-depth list. No demo numbers.

import { useEffect, useMemo, useState } from 'react';
import { Swirl } from '@/components/brand/groove';
import { PD, DISPLAY_STYLE, MONO_STYLE } from '../DesignAtoms';
import { Panel, SectionTitle, EmptyShell, btnInk, btnGhost } from './DashShell';
import { DashLayout } from '@/components/pearloom/dash/DashShell';
import { siteDisplayName, useSelectedSite, useUserSites } from './hooks';
import { getAnalyticsCopy, getAnalyticsSectionsToWatch } from '@/lib/event-os/dashboard-presets';
import { normaliseRsvpStatus } from '@/lib/rsvp-status';

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
  // Single state object tagged with the siteId it came from.
  // `loading` is derived (no setLoading-in-effect cascade) and
  // a tagged null result models the "no site selected" branch.
  type Funnel = { invited: number; opened: number; started: number; replied: number; coming: number };
  type Source = { label: string; count: number; pct: number };
  type Result = {
    siteId: string | null;
    visit: VisitStats | null;
    sections: SectionStat[] | null;
    funnel: Funnel | null;
    sources: Source[] | null;
    error: string | null;
  };
  const [result, setResult] = useState<Result | null>(null);
  // Pear's-reading card — dismissable for this visit (local state
  // only; the note re-derives on next load anyway).
  const [readingDismissed, setReadingDismissed] = useState(false);

  useEffect(() => {
    // No site selected: bail without setState. The derived
    // `loading` below already handles undefined site.id as
    // "not loading" (empty state UI is owned by the caller).
    if (!site?.id) return;
    // site_analytics + section_analytics rows are keyed by the
    // site's SUBDOMAIN (what the published-site beacon writes), so
    // the three analytics endpoints get the domain; the guest
    // roster stays id-keyed.
    const slug = site.domain;
    let cancelled = false;
    // A failed fetch resolves to null — NOT a zeroed shape — so a
    // broken read renders as '—' + a soft banner instead of a
    // real-looking 0 (honesty rule).
    const grab = (url: string) =>
      fetch(url, { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
    Promise.all([
      grab(`/api/analytics/visit?siteId=${encodeURIComponent(slug)}`),
      grab(`/api/analytics/section?siteId=${encodeURIComponent(slug)}`),
      grab(`/api/analytics/sources?siteId=${encodeURIComponent(slug)}`),
      // Guest roster drives the real RSVP funnel + conversion (owner-gated).
      grab(`/api/guests?siteId=${encodeURIComponent(site.id)}`),
    ]).then(([v, s, src, g]) => {
      if (cancelled) return;
      let funnel: Funnel | null = null;
      if (g) {
        const guests = (g.guests ?? []) as { status?: string; inviteOpenedAt?: string | null; replyStartedAt?: string | null }[];
        const invited = guests.length;
        let opened = 0; let started = 0; let replied = 0; let coming = 0;
        for (const gu of guests) {
          const key = normaliseRsvpStatus(gu.status);
          const isReplied = key !== 'pending';
          if (key === 'yes') coming += 1;
          if (isReplied) replied += 1;
          // A reply implies the earlier stages even if the ping was
          // missed; keeps the funnel monotonic + honest.
          if (gu.inviteOpenedAt || gu.replyStartedAt || isReplied) opened += 1;
          if (gu.replyStartedAt || isReplied) started += 1;
        }
        funnel = { invited, opened, started, replied, coming };
      }
      const failed = v === null || s === null || src === null || g === null;
      setResult({
        siteId: site.id,
        visit: v
          ? {
              visits: Number(v.visits ?? 0),
              today: Number(v.today ?? 0),
              mobile: Number(v.mobile ?? 0),
              desktop: Number(v.desktop ?? 0),
            }
          : null,
        sections: s ? ((s.sections ?? []) as SectionStat[]) : null,
        funnel,
        sources: src ? ((src.sources ?? []) as Source[]) : null,
        error: failed ? 'Some numbers couldn’t load just now — showing what we have. Refresh to retry.' : null,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [site?.id, site?.domain]);

  const loading = site?.id ? (result?.siteId !== site.id) : false;
  const visit = result?.visit ?? null;
  const sections = result?.sections ?? null;
  const funnel = result?.funnel ?? null;
  const sources = result?.sources ?? null;
  const error = result?.error ?? null;
  const conversionPct = funnel && funnel.invited > 0 ? Math.round((funnel.replied / funnel.invited) * 100) : 0;

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
      <DashLayout active="analytics" title="Analytics" subtitle="Publish a site first — analytics light up once guests visit.">
        <EmptyShell message="Publish a site first — analytics light up once guests visit." />
      </DashLayout>
    );
  }
  if (!site) {
    return (
      <DashLayout active="analytics" title="Analytics" subtitle="Pick a site to see its analytics.">
        <EmptyShell message="Pick a site from the top-right menu to see its analytics." />
      </DashLayout>
    );
  }

  const siteName = siteDisplayName(site);
  const copy = getAnalyticsCopy(site?.occasion);
  const watchSections = getAnalyticsSectionsToWatch(site?.occasion);

  // Client-side CSV of everything already on screen — visits,
  // funnel, sources, section engagement. No round trip; the data
  // is the component state.
  const exportCsv = () => {
    const rows: (string | number)[][] = [['Metric', 'Value']];
    rows.push(['Site', siteName]);
    if (visit) {
      rows.push(['Visits (all time)', visit.visits]);
      rows.push(['Visits today', visit.today]);
      rows.push(['Mobile visits', visit.mobile]);
      rows.push(['Desktop visits', visit.desktop]);
    }
    if (funnel) {
      rows.push(['Guests invited', funnel.invited]);
      rows.push(['Invites opened', funnel.opened]);
      rows.push(['Replies started', funnel.started]);
      rows.push(['Replied', funnel.replied]);
      rows.push(['Coming', funnel.coming]);
    }
    if (sources && sources.length > 0) {
      rows.push([]);
      rows.push(['Source', 'Visits', 'Share %']);
      for (const s of sources) rows.push([s.label, s.count, s.pct]);
    }
    if (sections && sections.length > 0) {
      rows.push([]);
      rows.push(['Section', 'Views', 'Avg time (s)']);
      for (const s of sections) {
        rows.push([humanSectionId(s.sectionId), s.views, Math.round(s.avgDurationMs / 100) / 10]);
      }
    }
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `pearloom-analytics-${site.domain ?? 'site'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashLayout
      active="analytics"
      eyebrow="Analytics"
      title={
        <span>
          <i style={{ color: PD.olive, fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1' }}>
            {copy.title}
          </i>
          {' '}
          <i style={{ color: PD.gold, fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1' }}>
            {copy.italic}
          </i>
        </span>
      }
      subtitle={copy.body}
      actions={
        <button className="pl8-btnfx" style={btnGhost} onClick={exportCsv}>Export CSV</button>
      }
    >

      <main style={{ padding: '0 clamp(20px, 4vw, 40px) 32px', maxWidth: 1240, margin: '0 auto' }}>
        {error && (
          <Panel bg="#F1D7CE" style={{ padding: 14, marginBottom: 16, fontSize: 13, color: PD.terra }}>
            {error}
          </Panel>
        )}

        {/* KPIs */}
        <div
          className="pd-analytics-kpi pl8-dash-stagger"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}
        >
          {[
            {
              l: 'Site visits · all time',
              v: loading || !visit ? '—' : visit.visits.toLocaleString(),
              delta: visit?.today ? `${visit.today} today` : 'Since launch',
              c: PD.olive,
            },
            {
              l: 'Today',
              v: loading || !visit ? '—' : visit.today.toLocaleString(),
              delta: 'Since midnight',
              c: PD.gold,
            },
            {
              l: 'Mobile share',
              v: loading || !visit ? '—' : `${mobileShare}%`,
              delta: visit
                ? `${visit.mobile} mobile · ${visit.desktop} desktop`
                : '',
              c: PD.plum,
            },
            {
              l: 'RSVP conversion',
              v: loading || !funnel ? '—' : (funnel.invited > 0 ? `${conversionPct}%` : '—'),
              delta: funnel && funnel.invited > 0
                ? `${funnel.replied} of ${funnel.invited} invited`
                : funnel ? 'No guests yet' : '',
              c: PD.terra,
            },
          ].map((k) => (
            <Panel key={k.l} bg={PD.paperCard} style={{ padding: '18px 20px' }}>
              <div style={{ ...MONO_STYLE, fontSize: 9, opacity: 0.55, marginBottom: 8 }}>
                {k.l.toUpperCase()}
              </div>
              {/* keyed remount when the real number lands so it fades
                  in over the '—' instead of snapping. */}
              <div
                key={loading ? 'loading' : 'loaded'}
                className={loading ? undefined : 'pl8-content-fade-in'}
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

        {/* RSVP funnel + (still quiet · how they arrived) — v2
            Analytics row, all from real guest + referrer data. */}
        <div
          className="pd-analytics-charts"
          style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20, marginBottom: 20 }}
        >
          <Panel bg={PD.paper3} style={{ padding: 28 }}>
            <SectionTitle
              eyebrow="FROM SENT TO REPLIED"
              title="The RSVP"
              italic="funnel."
              accent={PD.olive}
            />
            {funnel && funnel.invited > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {([
                  { s: 'Invited', n: funnel.invited, c: PD.ink },
                  { s: 'Opened', n: funnel.opened, c: PD.olive },
                  { s: 'Started a reply', n: funnel.started, c: PD.gold },
                  { s: 'Replied', n: funnel.replied, c: PD.terra },
                ] as const).map((f, i, arr) => {
                  const pct = Math.round((f.n / funnel.invited) * 100);
                  return (
                    <div key={f.s}>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{f.s}</span>
                        <span style={{ ...MONO_STYLE, fontSize: 11.5, opacity: 0.7 }}>{f.n} · {pct}%</span>
                      </div>
                      <div style={{ height: 14, background: PD.paperCard, borderRadius: 8, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: f.c, borderRadius: 8, transition: 'width var(--pl-dur-slow) var(--pl-ease-out)' }} />
                      </div>
                      {i < arr.length - 1 && (
                        <div style={{ ...MONO_STYLE, fontSize: 9.5, opacity: 0.55, marginTop: 4, textAlign: 'right' }}>
                          ↓ {arr[i].n - arr[i + 1].n} dropped
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ fontSize: 13.5, color: PD.inkSoft, lineHeight: 1.55, maxWidth: 520 }}>
                {loading
                  ? 'Threading…'
                  : funnel
                    ? 'No guests yet — the funnel fills in as you add guests and replies land.'
                    : 'The guest list couldn’t be read just now — refresh to retry.'}
              </div>
            )}
          </Panel>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Panel bg={PD.paperCard} style={{ padding: 24, border: `1px solid ${PD.gold}` }}>
              <div style={{ ...MONO_STYLE, fontSize: 9, color: PD.terra, marginBottom: 8 }}>STILL QUIET</div>
              <div style={{ ...DISPLAY_STYLE, fontSize: 38, lineHeight: 1 }}>
                {loading || !funnel
                  ? '—'
                  : `${Math.max(0, funnel.invited - funnel.replied)} ${(funnel.invited - funnel.replied) === 1 ? 'guest' : 'guests'}`}
              </div>
              <div style={{ fontSize: 12.5, color: PD.inkSoft, margin: '8px 0 14px', lineHeight: 1.5 }}>
                haven&rsquo;t replied yet.
              </div>
              <a href="/dashboard/rsvp" className="pl8-btnfx" style={{ ...btnInk, width: '100%', textAlign: 'center', display: 'block', textDecoration: 'none', boxSizing: 'border-box' }}>
                See who in Guests →
              </a>
            </Panel>
            <Panel bg={PD.paper3} style={{ padding: 24 }}>
              <SectionTitle eyebrow="HOW THEY ARRIVED" title="Where" italic="they came from." accent={PD.gold} />
              {sources && sources.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {sources.map((s) => {
                    const c = s.label === 'Direct' ? PD.olive : s.label === 'Email' ? PD.gold : s.label === 'Social' ? PD.plum : PD.terra;
                    return (
                      <div key={s.label}>
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 12.5 }}>{s.label}</span>
                          <span style={{ ...MONO_STYLE, fontSize: 11, color: c }}>{s.pct}%</span>
                        </div>
                        <div style={{ height: 8, background: PD.paperCard, borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ width: `${s.pct}%`, height: '100%', background: c, borderRadius: 99 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ fontSize: 12.5, color: PD.inkSoft, lineHeight: 1.5 }}>
                  {loading
                    ? 'Threading…'
                    : sources
                      ? 'No visits with a known source yet.'
                      : 'Sources couldn’t be read just now — refresh to retry.'}
                </div>
              )}
            </Panel>
          </div>
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
            {watchSections.length > 0 && (
              <div
                style={{
                  ...MONO_STYLE,
                  fontSize: 10,
                  color: PD.inkSoft,
                  marginTop: -10,
                  marginBottom: 14,
                  opacity: 0.75,
                }}
              >
                KEEP AN EYE ON: {watchSections.map((s) => humanSectionId(s)).join(' · ')}
              </div>
            )}
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
                          transition: 'width var(--pl-dur-slow) var(--pl-ease-out)',
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

          {!readingDismissed && (
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
              <button
                className="pl8-btnfx"
                style={{ ...btnGhost, color: PD.paper, borderColor: 'rgba(244,236,216,0.22)' }}
                onClick={() => setReadingDismissed(true)}
              >
                Dismiss
              </button>
            </div>
          </Panel>
          )}
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
    </DashLayout>
  );
}
