'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { invalidateSitesCache, useUserSites, type SiteSummary } from '@/components/marketing/design/dash/hooks';
import { DashLayout } from '../dash/DashShell';
import { Heart, Icon, Pear, PhotoPlaceholder, Sparkle } from '../motifs';
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

// Per-occasion accent so each card reads distinctly from the next.
// Memorial / funeral lean plum, birthdays warm gold, weddings the
// brand olive. Keeps the grid readable when a host has 4+ events.
function accentFor(occasion?: string): { ribbon: string; tint: string } {
  if (occasion === 'memorial' || occasion === 'funeral') {
    return { ribbon: 'var(--plum, #7A2D2D)', tint: 'var(--plum-mist, rgba(122,45,45,0.10))' };
  }
  if (occasion === 'birthday' || occasion === 'milestone-birthday' || occasion === 'first-birthday' || occasion === 'sweet-sixteen') {
    return { ribbon: 'var(--gold, #B8935A)', tint: 'var(--gold-mist, rgba(184,147,90,0.10))' };
  }
  return { ribbon: 'var(--peach-ink, #C6703D)', tint: 'var(--peach-bg, rgba(198,112,61,0.08))' };
}

function SiteCard({
  site,
  tone,
  nextPath,
  onDeleted,
}: {
  site: SiteSummary;
  tone: 'sage' | 'peach' | 'lavender' | 'cream';
  nextPath: string | null;
  onDeleted: (domain: string) => void;
}) {
  const date = site.eventDate ? new Date(site.eventDate) : null;
  const dateLabel = date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'Date TBD';
  const url = formatSiteDisplayUrl(site.domain, '', normalizeOccasion(site.occasion));
  const pickHref = nextPath
    ? `${nextPath}${nextPath.includes('?') ? '&' : '?'}site=${encodeURIComponent(site.domain)}`
    : null;
  const accent = accentFor(site.occasion);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--card)',
        border: `1px solid ${hovered ? accent.ribbon : 'var(--card-ring)'}`,
        borderRadius: 20,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: hovered
          ? '0 22px 50px -28px rgba(14,13,11,0.32)'
          : '0 4px 16px rgba(61,74,31,0.06)',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        transition: 'transform 240ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 240ms ease, border-color 200ms ease',
        position: 'relative',
      }}
    >
      {/* Hover-only quick actions menu (•••). Sits over the cover so
          it doesn't take real estate when idle. */}
      {hovered && (
        <SiteCardMenu
          site={site}
          onDeleted={() => onDeleted(site.domain)}
        />
      )}
      <div style={{ position: 'relative' }}>
        <PhotoPlaceholder tone={tone} aspect="16/9" src={site.coverPhoto ?? undefined} />
        {/* Floating brand mark when there's no cover photo — keeps
            the card from feeling empty before the host uploads. */}
        {!site.coverPhoto && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
            {site.occasion === 'memorial' || site.occasion === 'funeral'
              ? <Heart size={48} color={accent.ribbon} />
              : <Pear size={56} tone="sage" shadow={false} />}
          </div>
        )}
      </div>
      <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: accent.ribbon,
              background: accent.tint,
              padding: '3px 9px',
              borderRadius: 999,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Sparkle size={9} /> {occasionLabel(site.occasion)}
          </span>
          {site.published && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: 'var(--sage-deep)',
                background: 'var(--sage-tint)',
                padding: '3px 9px',
                borderRadius: 999,
              }}
            >
              ● Live
            </span>
          )}
        </div>
        <div className="display" style={{ fontSize: 26, margin: 0, lineHeight: 1.05 }}>
          {siteTitle(site)}
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{dateLabel}</div>
        {site.venue && (
          <div style={{ fontSize: 12, color: 'var(--ink-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Icon name="pin" size={12} /> {site.venue}
          </div>
        )}
        <div style={{ fontSize: 11, color: 'var(--ink-muted)', fontFamily: 'var(--font-ui)' }}>{url}</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 14 }}>
          {pickHref ? (
            <Link href={pickHref} className="btn btn-primary btn-sm">
              <Icon name="check" size={12} /> Use this site
            </Link>
          ) : (
            <Link href={`/editor/${encodeURIComponent(site.domain)}`} className="btn btn-primary btn-sm">
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
            title="View live"
          >
            <Icon name="arrow-ur" size={12} />
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Card menu (•••) ─────────────────────────────────────────────
// Hover-revealed kebab menu in the top-right of every site card.
// Houses the destructive "Delete site" action that's been missing
// from the dashboard since launch — confirmation prompt prevents
// accidental wipes. View-live + open-editor are also exposed here
// so heavy-keyboard users can run common actions without aiming
// for the inline buttons in the card body.
function SiteCardMenu({ site, onDeleted }: { site: SiteSummary; onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function handleDelete() {
    if (busy) return;
    const sure = window.confirm(
      `Delete "${site.domain}"? This removes the site, every guest record, every photo it owned. Cannot be undone.`,
    );
    if (!sure) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/sites/${encodeURIComponent(site.domain)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Delete failed (${res.status})`);
      }
      onDeleted();
      // Invalidate the dashboard cache so other tabs / routes see
      // the removal on their next render too.
      invalidateSitesCache();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        top: 12,
        right: 12,
        zIndex: 5,
      }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Site actions"
        style={{
          width: 32,
          height: 32,
          borderRadius: 999,
          border: 'none',
          background: 'rgba(14,13,11,0.78)',
          color: 'var(--cream, #FBF7EE)',
          cursor: 'pointer',
          display: 'grid',
          placeItems: 'center',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          boxShadow: '0 6px 14px rgba(14,13,11,0.30)',
        }}
      >
        <Icon name="more" size={14} />
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 38,
            right: 0,
            minWidth: 200,
            background: 'var(--card)',
            border: '1px solid var(--card-ring)',
            borderRadius: 12,
            padding: 6,
            boxShadow: '0 18px 40px rgba(14,13,11,0.18), 0 4px 10px rgba(14,13,11,0.10)',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            fontFamily: 'var(--font-ui)',
          }}
        >
          <Link
            href={`/editor/${encodeURIComponent(site.domain)}`}
            role="menuitem"
            onClick={() => setOpen(false)}
            style={menuItemStyle}
          >
            <Icon name="brush" size={13} /> Edit site
          </Link>
          <a
            href={`https://${formatSiteDisplayUrl(site.domain, '', normalizeOccasion(site.occasion))}`}
            target="_blank"
            rel="noreferrer"
            role="menuitem"
            onClick={() => setOpen(false)}
            style={menuItemStyle}
          >
            <Icon name="arrow-ur" size={13} /> View live
          </a>
          <Link
            href={`/dashboard/event/${encodeURIComponent(site.id)}`}
            role="menuitem"
            onClick={() => setOpen(false)}
            style={menuItemStyle}
          >
            <Icon name="layout" size={13} /> Open HQ
          </Link>
          <div style={{ height: 1, background: 'var(--line-soft)', margin: '4px 6px' }} />
          <button
            type="button"
            role="menuitem"
            disabled={busy}
            onClick={handleDelete}
            style={{
              ...menuItemStyle,
              color: '#7A2D2D',
              background: 'transparent',
              border: 'none',
              textAlign: 'left',
              fontFamily: 'inherit',
              fontSize: 13,
              cursor: busy ? 'wait' : 'pointer',
              opacity: busy ? 0.6 : 1,
            }}
          >
            <Icon name="close" size={13} /> {busy ? 'Deleting…' : 'Delete site'}
          </button>
        </div>
      )}
    </div>
  );
}

const menuItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '8px 10px',
  borderRadius: 8,
  textDecoration: 'none',
  color: 'var(--ink)',
  fontSize: 13,
  fontWeight: 500,
};

export function EventIndexPage() {
  const { sites, loading, refresh } = useUserSites();
  const params = useSearchParams();
  const nextPath = params?.get('next') ?? null;
  const tones = ['sage', 'peach', 'lavender', 'cream'] as const;
  const pickMode = Boolean(nextPath);
  // Local optimistic-removal set so a deleted card disappears the
  // moment the API returns 200, without waiting for the next
  // useUserSites refresh. The hook is invalidated in parallel so a
  // hard reload also reflects the deletion.
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const visibleSites = (sites ?? []).filter((s) => !removed.has(s.domain));
  const handleDeleted = (domain: string) => {
    setRemoved((prev) => {
      const next = new Set(prev);
      next.add(domain);
      return next;
    });
    void refresh();
  };

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
      <div style={{ padding: '0 clamp(20px, 4vw, 40px) 32px', maxWidth: 1240, margin: '0 auto' }}>
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
        {!loading && visibleSites.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 24,
            }}
          >
            {visibleSites.map((s, i) => (
              <SiteCard
                key={s.id}
                site={s}
                tone={tones[i % tones.length]}
                nextPath={nextPath}
                onDeleted={handleDeleted}
              />
            ))}
          </div>
        )}
        {!loading && sites && sites.length > 0 && visibleSites.length === 0 && (
          <div style={{ padding: 56, textAlign: 'center', color: 'var(--ink-soft)' }}>
            All cleared. <Link href="/wizard/new" style={{ color: 'var(--peach-ink)' }}>Begin a new thread</Link>.
          </div>
        )}
      </div>
    </DashLayout>
  );
}
