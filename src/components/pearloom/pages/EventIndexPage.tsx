'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useUserSites, type SiteSummary } from '@/components/marketing/design/dash/hooks';
import { DashLayout } from '../dash/DashShell';
import { Icon, PhotoPlaceholder } from '../motifs';
import { formatSiteDisplayUrl, normalizeOccasion } from '@/lib/site-urls';

function occasionLabel(o?: string) {
  if (!o) return 'Event';
  return o.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function siteTitle(s: SiteSummary) {
  const [a, b] = s.names ?? [];
  if (a && b) return `${a} & ${b}`;
  if (a) return a;
  return s.domain;
}

function SiteCard({
  site,
  tone,
  nextPath,
}: {
  site: SiteSummary;
  tone: 'sage' | 'peach' | 'lavender' | 'cream';
  nextPath: string | null;
}) {
  const date = site.eventDate ? new Date(site.eventDate) : null;
  const dateLabel = date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'Date TBD';
  const url = formatSiteDisplayUrl(site.domain, '', normalizeOccasion(site.occasion));
  const pickHref = nextPath
    ? `${nextPath}${nextPath.includes('?') ? '&' : '?'}site=${encodeURIComponent(site.domain)}`
    : null;

  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--card-ring)',
        borderRadius: 20,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 4px 16px rgba(61,74,31,0.06)',
      }}
    >
      <PhotoPlaceholder tone={tone} aspect="16/9" src={site.coverPhoto ?? undefined} />
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--peach-ink)',
            }}
          >
            {occasionLabel(site.occasion)}
          </span>
          {site.published && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.06em',
                color: 'var(--sage-deep)',
                background: 'var(--sage-tint)',
                padding: '2px 8px',
                borderRadius: 999,
              }}
            >
              Published
            </span>
          )}
        </div>
        <div className="display" style={{ fontSize: 22, margin: 0 }}>
          {siteTitle(site)}
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{dateLabel}</div>
        {site.venue && (
          <div style={{ fontSize: 12, color: 'var(--ink-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Icon name="pin" size={12} /> {site.venue}
          </div>
        )}
        <div style={{ fontSize: 11, color: 'var(--ink-muted)', fontFamily: 'var(--font-ui)' }}>{url}</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 10 }}>
          {pickHref ? (
            <Link href={pickHref} className="btn btn-primary btn-sm">
              <Icon name="check" size={12} /> Use this site
            </Link>
          ) : (
            <Link href={`/editor?site=${encodeURIComponent(site.domain)}`} className="btn btn-primary btn-sm">
              <Icon name="brush" size={12} /> Edit
            </Link>
          )}
          {!pickHref && (
            <Link href={`/dashboard/event/${encodeURIComponent(site.id)}`} className="btn btn-outline btn-sm">
              <Icon name="layout" size={12} /> Open HQ
            </Link>
          )}
          <a
            href={`https://${url}`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-outline btn-sm"
            style={{ marginLeft: 'auto' }}
            aria-label={`View ${siteTitle(site)} live`}
          >
            <Icon name="arrow-ur" size={12} />
          </a>
        </div>
      </div>
    </div>
  );
}

export function EventIndexPage() {
  const { sites, loading } = useUserSites();
  const params = useSearchParams();
  const nextPath = params?.get('next') ?? null;
  const tones = ['sage', 'peach', 'lavender', 'cream'] as const;
  const pickMode = Boolean(nextPath);

  return (
    <DashLayout
      active="sites"
      title={pickMode ? 'Pick a site' : 'My sites'}
      subtitle={
        pickMode
          ? "Choose which event you're working on — the next step will open with that site selected."
          : "Every event you're weaving — the drafts, the published ones, and the keepsakes coming next."
      }
      ctaText={pickMode ? undefined : 'Start a new one'}
      ctaHref={pickMode ? undefined : '/wizard/new'}
    >
      <div style={{ padding: '0 32px 40px', maxWidth: 1240 }}>
        {loading && (
          <div style={{ color: 'var(--ink-soft)', padding: 40, textAlign: 'center' }}>Threading your sites…</div>
        )}
        {!loading && (!sites || sites.length === 0) && (
          <div
            style={{
              padding: 56,
              textAlign: 'center',
              background: 'var(--card)',
              border: '1px dashed var(--line)',
              borderRadius: 20,
            }}
          >
            <div className="display" style={{ fontSize: 28, marginBottom: 10 }}>
              Nothing yet.
            </div>
            <div style={{ fontSize: 14, color: 'var(--ink-soft)', maxWidth: 420, margin: '0 auto 20px' }}>
              Begin a thread — Pear will draft a site in about twenty seconds. You pick the occasion, the names, and the
              feeling.
            </div>
            <Link href="/wizard/new" className="btn btn-primary">
              <Icon name="sparkles" size={14} /> Begin a thread
            </Link>
          </div>
        )}
        {!loading && sites && sites.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 20,
            }}
          >
            {sites.map((s, i) => (
              <SiteCard key={s.id} site={s} tone={tones[i % tones.length]} nextPath={nextPath} />
            ))}
          </div>
        )}
      </div>
    </DashLayout>
  );
}
