'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { invalidateSitesCache, useUserSites, type SiteSummary } from '@/components/marketing/design/dash/hooks';
import { DashLayout, crestTint } from '../dash/DashShell';
import { parseLocalDate } from '@/lib/date-utils';
import { DashEmpty } from '../dash/DashEmpty';
import { DashSkeleton } from '../dash/DashSkeleton';
import { Heart, Icon, PearloomGlyph } from '../motifs';
import { formatSiteDisplayUrl, normalizeOccasion } from '@/lib/site-urls';
import { getTheme } from '../site/themes';
import { isDashSurfaceApplicable } from '@/lib/event-os/dashboard-applicability';
import { useDialog } from '@/components/ui/confirm-dialog';
import type { SiteStat } from '@/app/api/dashboard/sites-stats/route';
import { COVER_FOCUS } from '@/lib/cover-crop';

const MONO = 'var(--pl-font-mono, ui-monospace, monospace)';

// Real per-site stats (coming / invited / visits) for the SiteCard
// stat row. Module-cached with a short TTL: flipping between dashboard
// tabs doesn't refetch, but RSVPs landing / a freshly created site
// don't stay stale for the whole SPA session either. Stale-while-
// revalidate: paint the cached copy instantly, refresh in the effect.
// Fails soft — a card with no stat just shows the em-dash "still
// threading" convention, never a fabricated count.
let _statsCache: { at: number; stats: Record<string, SiteStat> } | null = null;
const STATS_TTL_MS = 60_000;
function useSitesStats(): Record<string, SiteStat> {
  const [stats, setStats] = useState<Record<string, SiteStat>>(_statsCache?.stats ?? {});
  useEffect(() => {
    if (_statsCache && Date.now() - _statsCache.at < STATS_TTL_MS) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/dashboard/sites-stats', { cache: 'no-store' });
        if (!r.ok) return;
        const d = await r.json();
        if (!cancelled && d?.stats) { _statsCache = { at: Date.now(), stats: d.stats }; setStats(d.stats); }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);
  return stats;
}

const fmtVisits = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n % 1000 >= 100 ? 1 : 0)}k` : String(n));

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

// ── Site card — the zip's ScreensSite SiteCard ─────────────────
// Cover (real coverPhoto, else an occasion-tinted paper tile with
// the Pear glyph — the SiteCrest/crestTint pattern) · glass Live/
// Draft chip · title + date · occasion·theme in a colored italic ·
// a real RSVP/Visits stat row · where · a Pear note · Open editor /
// Preview. Every value is host data; nothing is invented.
function SiteCard({
  site,
  nextPath,
  stat,
  onDeleted,
}: {
  site: SiteSummary;
  nextPath: string | null;
  stat?: SiteStat;
  onDeleted: (domain: string) => void;
}) {
  const date = parseLocalDate(site.eventDate);
  const dateLabel = date
    ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Date TBD';
  const url = formatSiteDisplayUrl(site.domain, '', normalizeOccasion(site.occasion));
  const pickHref = nextPath
    ? `${nextPath}${nextPath.includes('?') ? '&' : '?'}site=${encodeURIComponent(site.domain)}`
    : null;
  const tint = crestTint(site.occasion);
  const [hovered, setHovered] = useState(false);
  // Real theme name for the "occasion · theme" line — resolved from
  // the manifest's themeId; falls back to occasion only.
  const themeId = (site.manifest as { themeId?: string } | undefined)?.themeId;
  const themeName = themeId ? getTheme(themeId).name : null;
  const isMemorial = site.occasion === 'memorial' || site.occasion === 'funeral';

  // Where — venue if the host set one (pinned), else the live URL.
  const where = site.venue ?? url;
  const whereIcon = site.venue ? 'pin' : 'link';

  // Pear's note — the assistant's voice, not a fabricated metric:
  // an unpublished site has a draft ready; a published one is set.
  const note = site.published
    ? { text: 'Pear thinks everything’s set', bg: 'var(--sage-tint)', ink: 'var(--sage-deep)' }
    : { text: 'Pear has a draft ready', bg: 'var(--peach-bg)', ink: 'var(--peach-ink)' };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--card)',
        border: `1px solid ${hovered ? tint.fg : 'var(--card-ring)'}`,
        borderRadius: 16,
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
      {/* Cover — real photo, or the occasion-tinted crest tile. */}
      <div
        style={{
          height: 158,
          position: 'relative',
          background: tint.bg,
          borderBottom: '1px solid var(--line)',
          overflow: 'hidden',
        }}
      >
        {site.coverPhoto ? (
          <img
            src={site.coverPhoto}
            alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: COVER_FOCUS, display: 'block' }}
          />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
            {isMemorial
              ? <Heart size={44} color={tint.fg} />
              : <PearloomGlyph size={48} color={tint.fg} />}
          </div>
        )}
        {/* Glass Live/Draft chip (real published state). */}
        <span
          className="pl-glass-surface"
          style={{
            position: 'absolute', top: 12, left: 12,
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 10px', borderRadius: 999,
            fontFamily: MONO,
            fontSize: 9.5, letterSpacing: '0.12em', textTransform: 'uppercase',
            color: 'var(--ink)',
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: 99, background: site.published ? 'var(--sage)' : 'var(--pl-gold)' }} />
          {site.published ? 'Live' : 'Draft'}
        </span>
        {/* Quick actions (•••) — real edit / view / delete. Always
            rendered so the actions are reachable on touch too. */}
        <SiteCardMenu site={site} onDeleted={() => onDeleted(site.domain)} />
      </div>

      <div style={{ padding: '15px 18px 16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* Title + date baseline row. */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          <div
            className="display"
            style={{ fontSize: 20, lineHeight: 1.05, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {siteTitle(site)}
          </div>
          <span style={{ fontFamily: MONO, fontSize: 10.5, color: 'var(--ink-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>{dateLabel}</span>
        </div>
        {/* Occasion · theme — a colored italic keyed to the occasion. */}
        <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 13.5, color: tint.fg, marginTop: 3 }}>
          {occasionLabel(site.occasion)}{themeName ? ` · ${themeName}` : ''}
        </div>
        {/* Stat row — real coming/invited + lifetime visits. The frame
            renders immediately with an em dash (the "still threading"
            convention) and the real numbers fade in; no placeholder
            number, no layout jump a second after paint. */}
        <div style={{ display: 'flex', gap: 26, margin: '13px 0', paddingTop: 12, borderTop: '1px solid var(--line-soft)' }}>
          {([
            ['RSVPs', stat ? `${stat.coming} / ${stat.invited}` : '—'],
            ['Visits', stat ? fmtVisits(stat.visits) : '—'],
          ] as const).map(([l, v]) => (
            <div key={l}>
              <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.12em', color: 'var(--ink-muted)' }}>{l.toUpperCase()}</div>
              <div
                key={stat ? 'v' : 'p'}
                className={stat ? 'pl8-content-fade-in' : undefined}
                style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: stat ? 'var(--ink)' : 'var(--ink-muted)', marginTop: 2 }}
              >
                {v}
              </div>
            </div>
          ))}
        </div>
        {/* Where — venue (pinned) or the live address. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--ink-muted)', marginBottom: 12 }}>
          <span style={{ color: site.venue ? 'var(--ink-soft)' : 'var(--ink-muted)', display: 'inline-flex', flexShrink: 0 }}>
            <Icon name={whereIcon} size={12} />
          </span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{where}</span>
        </div>
        {/* Pear's note. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 11px', borderRadius: 9, background: note.bg, marginBottom: 14 }}>
          <PearloomGlyph size={14} color={note.ink} />
          <span style={{ fontSize: 12, color: 'var(--ink)' }}>{note.text}</span>
        </div>
        {/* Actions. */}
        <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
          {pickHref ? (
            <Link href={pickHref} className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
              <Icon name="check" size={12} /> Use this site
            </Link>
          ) : (
            <Link href={`/editor/${encodeURIComponent(site.domain)}`} className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
              <Icon name="layout" size={13} /> Open editor
            </Link>
          )}
          <a
            href={`https://${url}`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-outline btn-sm"
            aria-label={`Preview ${siteTitle(site)}`}
            title="Preview"
          >
            Preview
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Start-a-new-site tile (zip NewSiteTile) ────────────────────
// The dashed tile at the end of the grid. Tapping it reveals the
// occasion picker; each occasion deep-links the wizard with its
// ?occasion= prefill, so Pear starts on the right foot.
const NEW_OCCASIONS: Array<[label: string, icon: string, occasion: string | null]> = [
  ['Wedding', 'heart-icon', 'wedding'],
  ['Birthday', 'sparkles', 'birthday'],
  ['Anniversary', 'gift', 'anniversary'],
  ['Memorial', 'pin', 'memorial'],
  ['Shower', 'image', 'baby-shower'],
  ['Something else', 'plus', null],
];

function NewSiteTile() {
  const [picking, setPicking] = useState(false);
  return (
    <div
      style={{
        minHeight: 396,
        borderRadius: 16,
        border: '1.5px dashed var(--line)',
        background: picking ? 'var(--card)' : 'transparent',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 24,
        boxSizing: 'border-box',
        transition: 'background 180ms ease',
      }}
    >
      {!picking ? (
        <button
          type="button"
          onClick={() => setPicking(true)}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          <span style={{ width: 52, height: 52, borderRadius: 999, border: '1.5px solid var(--peach-ink)', display: 'grid', placeItems: 'center', color: 'var(--peach-ink)' }}>
            <Icon name="plus" size={22} />
          </span>
          <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 19, color: 'var(--ink)' }}>Start a new one</span>
          <span style={{ fontSize: 12.5, color: 'var(--ink-muted)', maxWidth: 200, textAlign: 'center', lineHeight: 1.5 }}>
            Start from the occasion and Pear drafts the first weave.
          </span>
        </button>
      ) : (
        <>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.16em', color: 'var(--ink-muted)' }}>WHAT ARE WE CELEBRATING?</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: '100%' }}>
            {NEW_OCCASIONS.map(([label, icon, occasion]) => (
              <Link
                key={label}
                href={occasion ? `/wizard/new?occasion=${occasion}` : '/wizard/new'}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 12px', borderRadius: 10,
                  background: 'var(--cream-3)', border: '1px solid var(--line)',
                  textDecoration: 'none', textAlign: 'left',
                  transition: 'border-color 160ms ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--peach-ink)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--line)'; }}
              >
                <span style={{ color: 'var(--peach-ink)', display: 'inline-flex' }}><Icon name={icon} size={15} /></span>
                <span style={{ fontSize: 12.5, color: 'var(--ink)', fontWeight: 500 }}>{label}</span>
              </Link>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setPicking(false)}
            style={{ fontSize: 11.5, color: 'var(--ink-muted)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Cancel
          </button>
        </>
      )}
    </div>
  );
}

// ── Weekend banner (zip WeekendBanner) ─────────────────────────
// The one place the ⌘K-only Weekend builder is discoverable.
// Wedding-arc sites only (the builder weaves rehearsal → ceremony
// → brunch) and hidden in pick mode.
function WeekendBanner() {
  return (
    <Link
      href="/dashboard/weekend"
      style={{
        display: 'flex', alignItems: 'center', gap: 18,
        padding: '20px 26px', flexWrap: 'wrap',
        borderRadius: 16,
        background: 'var(--cream-2)',
        border: '1px solid var(--line-soft)',
        textDecoration: 'none', color: 'var(--ink)',
        marginTop: 28,
      }}
    >
      <span style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--card)', border: '1px solid var(--line)', display: 'grid', placeItems: 'center', color: 'var(--lavender-ink)', flexShrink: 0 }}>
        <Icon name="calendar" size={20} />
      </span>
      <div style={{ flex: 1, minWidth: 220 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, color: 'var(--ink)' }}>Planning a whole weekend?</div>
        <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>
          One date, one base name, Pear weaves a linked site for every event, rehearsal to brunch.
        </div>
      </div>
      <span className="btn btn-outline btn-sm" style={{ pointerEvents: 'none', flexShrink: 0 }}>
        Weekend builder <Icon name="arrow-right" size={13} />
      </span>
    </Link>
  );
}

// ── Card menu (•••) ─────────────────────────────────────────────
// Kebab menu over the cover. Houses the destructive "Delete site"
// action (confirmation-gated) plus edit + view-live shortcuts.
function SiteCardMenu({ site, onDeleted }: { site: SiteSummary; onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const dialog = useDialog();

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
    const sure = await dialog.confirm({
      title: `Delete "${site.domain}"?`,
      message:
        'This removes the site, every guest record, every photo it owned. It can\'t be undone.',
      confirmLabel: 'Delete site',
      cancelLabel: 'Keep it',
      variant: 'danger',
    });
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
      invalidateSitesCache();
    } catch (err) {
      await dialog.alert({
        title: 'Delete failed',
        message: err instanceof Error ? err.message : 'Something went wrong.',
        variant: 'error',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={ref} style={{ position: 'absolute', top: 10, right: 10, zIndex: 5 }}>
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
        className="pl-glass-surface"
        style={{
          width: 30,
          height: 30,
          borderRadius: 999,
          border: 'none',
          color: 'var(--ink)',
          cursor: 'pointer',
          display: 'grid',
          placeItems: 'center',
          padding: 0,
        }}
      >
        <Icon name="more" size={14} />
      </button>
      {open && (
        <div
          role="menu"
          className="pl8-pop-in"
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
            className="pl8-menu-item"
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
            className="pl8-menu-item"
            style={menuItemStyle}
          >
            <Icon name="arrow-ur" size={13} /> View live
          </a>
          <div style={{ height: 1, background: 'var(--line-soft)', margin: '4px 6px' }} />
          <button
            type="button"
            role="menuitem"
            disabled={busy}
            onClick={handleDelete}
            className="pl8-menu-item"
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
  const siteStats = useSitesStats();
  const params = useSearchParams();
  const nextPath = params?.get('next') ?? null;
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

  const showWeekend = !loading && !pickMode && visibleSites.length > 0 &&
    visibleSites.some((s) => isDashSurfaceApplicable('weekend', s.occasion));

  return (
    <DashLayout
      active="sites"
      eyebrow={pickMode ? 'Pick a site' : 'Your sites'}
      title={pickMode ? 'Pick a site' : 'My sites'}
      subtitle={pickMode
        ? 'Choose which celebration this connects to.'
        : 'Every celebration you’re weaving.'}
    >
      <main style={{ padding: '0 clamp(20px, 4vw, 40px) 40px', maxWidth: 1240, margin: '0 auto' }}>
        {loading && <DashSkeleton kind="card-grid" count={3} label="Threading your sites" />}

        {!loading && (!sites || sites.length === 0) && (
          <DashEmpty
            size="page"
            tone="pear"
            eyebrow="No sites yet"
            title="No sites yet."
            body="Pear will draft a complete site in about twenty seconds, you pick the occasion, the names, and the feeling. Edit anything afterwards."
            examples={['Wedding · Scott & Shauna', 'Birthday · 30 in Lisbon', 'Memorial · In loving memory', 'Reunion · Class of 2010']}
            actions={[
              { label: 'Create your site', href: '/wizard/new', icon: 'sparkles', primary: true },
              { label: 'Browse templates', href: '/templates' },
            ]}
          />
        )}

        {!loading && visibleSites.length > 0 && (
          <div
            className="pl8-dash-stagger"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))',
              gap: 20,
            }}
          >
            {visibleSites.map((s) => (
              <SiteCard
                key={s.id}
                site={s}
                nextPath={nextPath}
                stat={siteStats[s.id]}
                onDeleted={handleDeleted}
              />
            ))}
            {/* The new-site tile joins the grid — but never in pick
                mode, where the host is attaching an existing site. */}
            {!pickMode && <NewSiteTile />}
          </div>
        )}

        {!loading && sites && sites.length > 0 && visibleSites.length === 0 && (
          <div style={{ padding: 56, textAlign: 'center', color: 'var(--ink-soft)' }}>
            All cleared. <Link href="/wizard/new" style={{ color: 'var(--peach-ink)' }}>Begin a new thread</Link>.
          </div>
        )}

        {showWeekend && <WeekendBanner />}
      </main>
    </DashLayout>
  );
}
