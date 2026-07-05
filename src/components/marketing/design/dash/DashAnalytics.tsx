'use client';

// Analytics — the zip's "Analytics" screen (handoff kits/dashboard/
// ScreensExtra), ported onto the real product surface. Every number
// is live: /api/analytics/visit drives the four KPI tiles + the
// arrival sources, /api/analytics/section drives the engagement-by-
// section bars, and the guest roster (/api/guests) drives the RSVP
// funnel + conversion. No demo numbers; a failed read renders '—'
// and a soft banner (honesty rule), never a real-looking 0.
//
// Styling rides the .pl8 dashboard chrome tokens (--ink / --card /
// --line + the sage / peach / lavender / gold accents) — NOT the
// editor-only --pl-chrome-* family — so light + editorial-midnight
// both work. Big Fraunces stat numbers, mono editorial eyebrows,
// letterpress italic accent titles, calm CSS bars in olive/gold/
// sage. No stock photography.

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { EmptyShell } from './DashShell';
import { DashLayout } from '@/components/pearloom/dash/DashShell';
import { PageIntro } from '@/components/pearloom/dash/QuietDash';
import { siteDisplayName, useSelectedSite, useUserSites } from './hooks';
import { getAnalyticsCopy, getAnalyticsSectionsToWatch } from '@/lib/event-os/dashboard-presets';
import { normaliseRsvpStatus } from '@/lib/rsvp-status';

const MONO = 'var(--pl-font-mono, ui-monospace, monospace)';
const DISPLAY = 'var(--font-display, "Fraunces", Georgia, serif)';

// Shared card chrome — the house cockpit/day-of card (paper surface,
// hairline ring, 16px radius). The zip's `<Card>` in .pl8 clothes.
const card: CSSProperties = {
  background: 'var(--card)',
  border: '1px solid var(--card-ring, var(--line))',
  borderRadius: 16,
};

/** Mono uppercase editorial eyebrow — the zip's `<Eyebrow rule="none">`. */
function CardEyebrow({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: color ?? 'var(--ink-muted)' }}>
      {children}
    </div>
  );
}

/** Card header: mono eyebrow + a Fraunces letterpress line with one
 *  italic accent clause. A plain `<div>` (not `.display`) so the
 *  ≤640px `.display` clamp never inflates it on phones. */
function SectionHead({
  eyebrow,
  eyebrowColor,
  title,
  accent,
  accentColor = 'var(--lavender-ink)',
}: {
  eyebrow: ReactNode;
  eyebrowColor?: string;
  title: ReactNode;
  accent?: ReactNode;
  accentColor?: string;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <CardEyebrow color={eyebrowColor}>{eyebrow}</CardEyebrow>
      <div style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 600, lineHeight: 1.16, color: 'var(--ink)', margin: '8px 0 0' }}>
        {title}
        {accent ? <> <span style={{ fontStyle: 'italic', color: accentColor }}>{accent}</span></> : null}
      </div>
    </div>
  );
}

/** A big-number KPI tile — mono label, a 40px Fraunces numeral, and
 *  an accent-colored delta line. The number is the zip's signature
 *  letterpress figure. */
function Kpi({ label, value, delta, color }: { label: string; value: string; delta: string; color: string }) {
  return (
    <div style={{ ...card, padding: '18px 20px' }}>
      <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: DISPLAY, fontSize: 40, lineHeight: 1, fontWeight: 400, letterSpacing: '-0.025em', color: 'var(--ink)' }}>{value}</div>
      <div style={{ fontSize: 11.5, color, marginTop: 8, fontWeight: 500 }}>{delta}</div>
    </div>
  );
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
  const hasFunnel = Boolean(funnel && funnel.invited > 0);

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
      c: i < 3 ? 'var(--sage)' : i < 5 ? 'var(--pl-gold)' : i < 7 ? 'var(--peach-ink)' : 'var(--lavender-ink)',
    }));
  }, [sections]);

  // ONE empty state (plan rule 5): the card carries the sentence;
  // the header never restates it.
  if (!sitesLoading && (!sites || sites.length === 0)) {
    return (
      <DashLayout active="analytics" hideTopbar>
        <div style={{ padding: '16px clamp(20px, 4vw, 40px) 0', maxWidth: 1240, margin: '0 auto' }}>
          <PageIntro eyebrow="Analytics" title="The reading of the room." />
        </div>
        <EmptyShell message="Publish a site first — analytics light up once guests visit." cta={{ label: 'Create a site →', href: '/wizard/new' }} />
      </DashLayout>
    );
  }
  if (!site) {
    return (
      <DashLayout active="analytics" hideTopbar>
        <div style={{ padding: '16px clamp(20px, 4vw, 40px) 0', maxWidth: 1240, margin: '0 auto' }}>
          <PageIntro eyebrow="Analytics" title="The reading of the room." />
        </div>
        <EmptyShell message="Pick a celebration from the sidebar to see its analytics." />
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

  // The four big-number KPI tiles (zip row 1). Honesty rule holds:
  // a failed/awaited read shows '—', never a real-looking 0.
  const dash = '—';
  const kpis: { label: string; value: string; delta: string; color: string }[] = [
    {
      label: 'Site visits · all time',
      value: visit ? visit.visits.toLocaleString() : dash,
      delta: visit ? `${visit.today.toLocaleString()} today` : loading ? 'Threading…' : 'no visits yet',
      color: 'var(--sage-deep)',
    },
    {
      label: 'Today',
      value: visit ? visit.today.toLocaleString() : dash,
      delta: 'Since midnight',
      color: 'var(--pl-gold)',
    },
    {
      label: 'Mobile share',
      value: visit ? `${mobileShare}%` : dash,
      delta: visit ? `${visit.mobile.toLocaleString()} mobile · ${visit.desktop.toLocaleString()} desktop` : dash,
      color: 'var(--lavender-ink)',
    },
    {
      label: 'RSVP conversion',
      value: hasFunnel ? `${conversionPct}%` : dash,
      delta: hasFunnel ? `${funnel!.replied} of ${funnel!.invited} invited` : loading ? 'Threading…' : 'no guests yet',
      color: 'var(--peach-ink)',
    },
  ];

  const quietCount = funnel ? Math.max(0, funnel.invited - funnel.replied) : 0;

  return (
    <DashLayout active="analytics" hideTopbar>
      {/* Quiet header (house convention): occasion title in ONE line;
          the KPI tiles below carry the numbers. */}
      <div style={{ padding: '16px clamp(20px, 4vw, 40px) 0', maxWidth: 1240, margin: '0 auto' }}>
        <PageIntro
          eyebrow={siteName ? `Analytics · ${siteName}` : 'Analytics'}
          title={<span>{copy.title} <i style={{ color: 'var(--lavender-ink)' }}>{copy.italic}</i></span>}
          actions={
            <button type="button" className="btn btn-outline btn-sm" onClick={exportCsv}>Export CSV</button>
          }
          style={{ marginBottom: 16 }}
        />
      </div>

      <main style={{ padding: '0 clamp(20px, 4vw, 40px) 40px', maxWidth: 1240, margin: '0 auto' }}>
        {error && (
          <div style={{ ...card, background: 'var(--peach-bg)', border: '1px solid var(--peach)', padding: 14, marginBottom: 16, fontSize: 13, color: 'var(--peach-ink)' }}>
            {error}
          </div>
        )}

        {/* Row 1 — the four big-number KPI tiles. */}
        <div
          className="pd-analytics-kpi"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}
        >
          {kpis.map((k) => (
            <Kpi key={k.label} label={k.label} value={k.value} delta={k.delta} color={k.color} />
          ))}
        </div>

        {/* Row 2 — RSVP funnel + (still quiet · how they arrived),
            all from real guest + referrer data. */}
        <div
          className="pd-analytics-charts"
          style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20, marginBottom: 20 }}
        >
          <div style={{ ...card, padding: 28 }}>
            <SectionHead eyebrow="From sent to replied" title="The RSVP" accent="funnel." />
            {hasFunnel ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {([
                  { s: 'Invited', n: funnel!.invited, c: 'var(--ink)' },
                  { s: 'Opened', n: funnel!.opened, c: 'var(--sage)' },
                  { s: 'Started a reply', n: funnel!.started, c: 'var(--pl-gold)' },
                  { s: 'Replied', n: funnel!.replied, c: 'var(--peach-ink)' },
                ] as const).map((f, i, arr) => {
                  const pct = Math.round((f.n / funnel!.invited) * 100);
                  return (
                    <div key={f.s}>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{f.s}</span>
                        <span style={{ fontFamily: MONO, fontSize: 11.5, color: 'var(--ink-muted)' }}>{f.n} · {pct}%</span>
                      </div>
                      <div style={{ height: 14, background: 'var(--cream-3)', borderRadius: 8, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: f.c, borderRadius: 8, transition: 'width var(--pl-dur-slow) var(--pl-ease-out)' }} />
                      </div>
                      {i < arr.length - 1 && (
                        <div style={{ fontFamily: MONO, fontSize: 9.5, color: 'var(--ink-muted)', marginTop: 4, textAlign: 'right' }}>
                          ↓ {arr[i].n - arr[i + 1].n} dropped
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.55, maxWidth: 520 }}>
                {loading
                  ? 'Threading…'
                  : funnel
                    ? 'Nothing yet. The funnel fills in as you add guests and replies land.'
                    : 'The guest list couldn’t be read just now — refresh to retry.'}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Still quiet — the accent (peach) callout. */}
            <div style={{ ...card, background: 'var(--peach-bg)', border: '1px solid var(--peach)', padding: 24 }}>
              <CardEyebrow color="var(--peach-ink)">Still quiet</CardEyebrow>
              <div style={{ fontFamily: DISPLAY, fontSize: 38, lineHeight: 1, color: 'var(--ink)', marginTop: 8 }}>
                {loading || !funnel ? dash : `${quietCount} ${quietCount === 1 ? 'guest' : 'guests'}`}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', margin: '8px 0 14px', lineHeight: 1.5 }}>
                haven&rsquo;t replied yet.
              </div>
              <a href="/dashboard/rsvp" className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center', textDecoration: 'none', boxSizing: 'border-box' }}>
                See who in Guests →
              </a>
            </div>
            {/* How they arrived — referrer sources. */}
            <div style={{ ...card, padding: 24 }}>
              <div style={{ marginBottom: 14 }}>
                <CardEyebrow>How they arrived</CardEyebrow>
              </div>
              {sources && sources.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {sources.map((s) => {
                    const c =
                      s.label === 'Direct' ? 'var(--sage)'
                        : s.label === 'Email' ? 'var(--pl-gold)'
                          : s.label === 'Social' ? 'var(--lavender-ink)'
                            : 'var(--peach-ink)';
                    return (
                      <div key={s.label}>
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 12.5, color: 'var(--ink)' }}>{s.label}</span>
                          <span style={{ fontFamily: MONO, fontSize: 11, color: c }}>{s.pct}%</span>
                        </div>
                        <div style={{ height: 8, background: 'var(--cream-3)', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ width: `${s.pct}%`, height: '100%', background: c, borderRadius: 99 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
                  {loading
                    ? 'Threading…'
                    : sources
                      ? 'Nothing yet. Sources appear once visits arrive with a known referrer.'
                      : 'Sources couldn’t be read just now — refresh to retry.'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row 3 — engagement by section + Pear's reading. */}
        <div
          className="pd-analytics-scroll"
          style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20 }}
        >
          <div style={{ ...card, padding: 28 }}>
            <SectionHead
              eyebrow="What people read"
              eyebrowColor="var(--lavender-ink)"
              title="Engagement"
              accent="by section."
            />
            {watchSections.length > 0 && (
              <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginTop: -8, marginBottom: 14 }}>
                Keep an eye on: {watchSections.map((s) => humanSectionId(s)).join(' · ')}
              </div>
            )}
            {depth.length === 0 ? (
              <div style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.55, maxWidth: 520 }}>
                Nothing yet. Sections start showing up here once guests scroll past them on your
                published site.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {depth.map((r) => (
                  <div
                    key={r.s}
                    className="pd-analytics-depthrow"
                    style={{ display: 'grid', gridTemplateColumns: '140px 1fr 54px', gap: 14, alignItems: 'center' }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{r.s}</div>
                    <div style={{ height: 12, background: 'var(--cream-3)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ width: `${r.pct}%`, height: '100%', background: r.c, borderRadius: 99, transition: 'width var(--pl-dur-slow) var(--pl-ease-out)' }} />
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: 11, textAlign: 'right', color: r.c, fontWeight: 500 }}>{r.pct}%</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!readingDismissed && (
            <div style={{ ...card, background: 'var(--ink)', color: 'var(--cream)', border: 'none', padding: 28, position: 'relative', overflow: 'hidden' }}>
              <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--pl-gold)', marginBottom: 8 }}>
                Pear&rsquo;s reading
              </div>
              <div
                style={{
                  fontFamily: DISPLAY,
                  fontSize: 22,
                  lineHeight: 1.3,
                  fontStyle: 'italic',
                  fontWeight: 400,
                  marginBottom: 18,
                  fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                }}
              >
                {depth.length === 0
                  ? '“Your site’s quiet for now. Every visit tells us a little more.”'
                  : depth.length >= 4 && depth[3].pct < 50
                    ? '“Guests drop off around the middle sections. Want me to tighten them?”'
                    : '“Your top sections are holding attention. Keep the thread going.”'}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <a
                  href="/dashboard/director"
                  className="btn btn-sm"
                  style={{ background: 'var(--cream)', color: 'var(--ink)', border: 'none', textDecoration: 'none' }}
                >
                  Ask Pear why
                </a>
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{ background: 'transparent', color: 'var(--cream)', border: '1px solid rgba(247,242,230,0.28)' }}
                  onClick={() => setReadingDismissed(true)}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <style jsx>{`
        @media (max-width: 1100px) {
          :global(.pd-analytics-charts),
          :global(.pd-analytics-scroll) {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 860px) {
          :global(.pd-analytics-kpi) {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        /* Phones: give the depth bars their width back — the fixed
           140px label column left the bars a sliver at 390px. */
        @media (max-width: 480px) {
          :global(.pd-analytics-depthrow) {
            grid-template-columns: 96px 1fr 40px !important;
            gap: 8px !important;
          }
        }
      `}</style>
    </DashLayout>
  );
}
