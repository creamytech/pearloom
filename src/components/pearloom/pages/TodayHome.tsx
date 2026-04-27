'use client';

// ─────────────────────────────────────────────────────────────
// TodayHome — focused "what do I need to do today?" dashboard.
//
// Replaces the old kitchen-sink DashHomeV8. Three zones:
//   1. Today card — the next moment on the timeline + primary CTA
//   2. Review alerts — top 3 urgent insights from /api/guests/intelligence
//   3. Quick actions — Open editor / Send invite / View site / Print
// Anything else lives in its dedicated tab. No more dashboard-as-launcher.
// ─────────────────────────────────────────────────────────────

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { DashLayout } from '../dash/DashShell';
import { Icon } from '../motifs';
import { useSelectedSite } from '@/components/marketing/design/dash/hooks';
import { buildSiteUrl, formatSiteDisplayUrl } from '@/lib/site-urls';
import type { GuestInsight } from '@/app/api/guests/intelligence/route';

interface QuickAction {
  label: string;
  href: string;
  icon: string;
  blurb: string;
}

export function TodayHome() {
  const { site } = useSelectedSite();
  const [insights, setInsights] = useState<GuestInsight[] | null>(null);

  useEffect(() => {
    if (!site?.domain) return;
    let cancelled = false;
    fetch(`/api/guests/intelligence?siteId=${encodeURIComponent(site.domain)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data: { insights?: GuestInsight[] } | null) => {
        if (!cancelled && data?.insights) setInsights(data.insights);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [site?.domain]);

  const eventDateLabel = site?.eventDate
    ? new Date(site.eventDate).toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
      })
    : null;
  const daysUntil = site?.eventDate
    ? Math.max(0, Math.round((new Date(site.eventDate).getTime() - Date.now()) / 86_400_000))
    : null;
  const namesStr = (site?.names ?? []).filter(Boolean).join(' & ') || 'Your celebration';
  const occasion = site?.occasion ?? 'wedding';
  const editorHref = site?.domain ? `/editor/${site.domain}` : '/dashboard/event';
  const liveHref = site?.domain ? buildSiteUrl(site.domain, '', undefined, occasion) : '#';
  const liveDisplay = site?.domain ? formatSiteDisplayUrl(site.domain, '', occasion) : '';

  const urgent = useMemo(() => {
    if (!insights) return [];
    const order: Record<GuestInsight['severity'], number> = { urgent: 0, attention: 1, info: 2 };
    return [...insights].sort((a, b) => order[a.severity] - order[b.severity]).slice(0, 3);
  }, [insights]);

  const quickActions: QuickAction[] = [
    { label: 'Open editor', href: editorHref, icon: 'pencil', blurb: 'Tweak the site' },
    { label: 'Send invite', href: '/dashboard/invite', icon: 'mail', blurb: 'Save-the-date or invitation' },
    { label: 'View site', href: liveHref, icon: 'eye', blurb: liveDisplay || 'Open published page' },
    { label: 'Print orders', href: '/dashboard/print', icon: 'send', blurb: 'Mail to your guests' },
  ];

  return (
    <DashLayout active="home" title="Welcome back" subtitle="Today's the only thing that matters here.">
      <div style={{ padding: 'clamp(20px, 4vw, 40px)', maxWidth: 1100, margin: '0 auto' }}>
        {/* ── Today card ── */}
        <div
          style={{
            background: 'var(--cream-2)',
            border: '1px solid var(--line-soft)',
            borderRadius: 20,
            padding: 'clamp(24px, 3vw, 36px)',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 20,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flex: 1, minWidth: 280 }}>
            <div className="eyebrow" style={{ color: 'var(--peach-ink)', marginBottom: 8 }}>
              {daysUntil === null ? 'Your celebration' : daysUntil === 0 ? 'Today' : `${daysUntil} days until`}
            </div>
            <h1
              className="display"
              style={{
                fontSize: 'clamp(32px, 4vw, 48px)',
                margin: '0 0 12px',
                lineHeight: 1.05,
                fontWeight: 500,
                letterSpacing: '-0.02em',
              }}
            >
              {namesStr}
            </h1>
            {eventDateLabel ? (
              <p style={{ fontSize: 16, color: 'var(--ink-soft)', margin: 0 }}>
                {eventDateLabel}{site?.venue ? ` · ${site.venue}` : ''}
              </p>
            ) : (
              <p style={{ fontSize: 15, color: 'var(--ink-soft)', margin: 0, fontStyle: 'italic' }}>
                Set a date in the editor to anchor your timeline.
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link
              href={editorHref}
              className="pl-pearl-accent"
              style={{
                padding: '11px 22px',
                borderRadius: 999,
                fontSize: 13.5,
                fontWeight: 700,
                cursor: 'pointer',
                border: 'none',
                fontFamily: 'var(--font-ui)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Icon name="pencil" size={13} /> Open the editor
            </Link>
            {site?.domain && (
              <a
                href={liveHref}
                target="_blank"
                rel="noreferrer"
                style={{
                  padding: '10px 20px',
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 600,
                  background: 'transparent',
                  color: 'var(--ink)',
                  border: '1.5px solid var(--line)',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  fontFamily: 'var(--font-ui)',
                }}
              >
                <Icon name="eye" size={13} /> View live
              </a>
            )}
          </div>
        </div>

        {/* ── Urgent review alerts ── */}
        {urgent.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div className="eyebrow" style={{ color: 'var(--peach-ink)', marginBottom: 10 }}>
              Pear&rsquo;s review · top 3
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {urgent.map((insight, i) => (
                <UrgentRow key={`${insight.kind}-${i}`} insight={insight} />
              ))}
            </div>
            <Link
              href={`/dashboard/guest-review${site?.domain ? `?site=${encodeURIComponent(site.domain)}` : ''}`}
              style={{
                marginTop: 10,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12.5,
                color: 'var(--peach-ink)',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              See full review →
            </Link>
          </div>
        )}

        {/* ── Quick actions ── */}
        <div className="eyebrow" style={{ color: 'var(--peach-ink)', marginBottom: 10 }}>
          Quick actions
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 10,
        }}>
          {quickActions.map((a) => (
            <Link
              key={a.label}
              href={a.href}
              className="pl8-card-lift"
              style={{
                padding: '18px 18px',
                background: 'var(--cream-2)',
                border: '1px solid var(--line-soft)',
                borderRadius: 14,
                textDecoration: 'none',
                color: 'var(--ink)',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                fontFamily: 'var(--font-ui)',
              }}
            >
              <Icon name={a.icon} size={16} color="var(--peach-ink, #C6703D)" />
              <span style={{ fontSize: 14, fontWeight: 700 }}>{a.label}</span>
              <span style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>{a.blurb}</span>
            </Link>
          ))}
        </div>
      </div>
    </DashLayout>
  );
}

const SEVERITY_TONE: Record<GuestInsight['severity'], { bg: string; fg: string }> = {
  info:      { bg: 'rgba(92,107,63,0.08)',  fg: '#3D4A1F' },
  attention: { bg: 'rgba(184,147,90,0.14)', fg: '#5C4F2E' },
  urgent:    { bg: 'rgba(122,45,45,0.12)',  fg: '#7A2D2D' },
};

function UrgentRow({ insight }: { insight: GuestInsight }) {
  const tone = SEVERITY_TONE[insight.severity];
  return (
    <div
      className="pl8-card-lift"
      style={{
        background: tone.bg,
        border: `1px solid ${tone.fg}22`,
        borderRadius: 12,
        padding: '14px 16px',
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        fontFamily: 'var(--font-ui)',
      }}
    >
      <span aria-hidden style={{
        width: 10, height: 10, borderRadius: 999,
        background: tone.fg, flexShrink: 0,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)', marginBottom: 2 }}>
          {insight.title}
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
          {insight.detail}
        </div>
      </div>
    </div>
  );
}
