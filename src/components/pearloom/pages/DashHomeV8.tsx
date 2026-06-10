'use client';

/* ========================================================================
   PEARLOOM — DASHBOARD HOME (v8 handoff port)
   Wired to real data via existing dash hooks.
   ======================================================================== */

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useMemo, type CSSProperties } from 'react';
import { PearlDot, Heart, Icon, Pear, PostIt, Sparkle, Stamp } from '../motifs';
import { DashLayout } from '../dash/DashShell';
import { PLAtmosphere } from '../dash/PLChrome';
import { useSelectedSite, siteDisplayName } from '@/components/marketing/design/dash/hooks';
import { useDashStats, useDaysToGo } from '@/components/marketing/v2/useDashStats';
import { formatSiteDisplayUrl, normalizeOccasion } from '@/lib/site-urls';
import { getKickoffCards, getKickoffEyebrow, type KickoffCard } from '@/lib/event-os/dashboard-presets';
import { siteProgressPct } from '@/lib/site-progress';
import { parseLocalDate } from '@/lib/date-utils';
import { PACKS, getPackById, type Pack } from '@/lib/theme-store/packs';
import type { StoryManifest } from '@/types';

/* ─── MiniThemeThumb ────────────────────────────────────────────────
   A faithful port of the prototype's MiniThemeThumb: a tiny `.pl8-guest`
   scope with the pack's theme vars stamped on it, the matching texture
   layer, and a centered motif glyph. This is the same approach the
   theme-store PackPreview uses — real themed CSS, no screenshot — so
   the dashboard surfaces what each site actually looks like.
   ─────────────────────────────────────────────────────────────────── */

/** Pick a pack for a site. In priority order:
 *  1. Match by site index into a rotating, occasion-aware curated set
 *     (so a list of sites reads as varied as the prototype).
 *  2. Fallback to santorini-linen (the prototype's default).
 *
 *  We don't yet persist a per-site `themePackId`, so this is a
 *  visual-only derivation. The curated rotation keeps each site
 *  visually distinct without random churn between renders. */
function pickPackForSite(
  occasion: string | undefined,
  index: number,
): Pack {
  // Occasion-keyed rotations — same vibe as the prototype's
  // [santorini, tuscan, garden, coastal] sequence, but per
  // occasion family so memorial/birthday/etc don't all look like
  // a wedding site.
  const rotations: Record<string, readonly string[]> = {
    wedding: ['santorini-linen', 'tuscan-watercolor', 'pressed-garden', 'coastal-ink'],
    engagement: ['blush-bloom', 'english-rose', 'pressed-garden', 'tuscan-watercolor'],
    anniversary: ['antique-rosegold', 'pressed-garden', 'tuscan-watercolor', 'santorini-linen'],
    birthday: ['confetti-fete', 'citrus-pop', 'sunshine-day', 'pressed-garden'],
    memorial: ['ivory-minimal', 'mono-press', 'modern-editorial', 'eucalyptus-press'],
    funeral: ['ivory-minimal', 'mono-press', 'modern-editorial', 'eucalyptus-press'],
    'bridal-shower': ['english-rose', 'blush-bloom', 'pressed-garden', 'spring-blossom'],
    'baby-shower': ['blush-bloom', 'pressed-garden', 'spring-blossom', 'sunshine-day'],
    'bachelor-party': ['noir-matte', 'midnight-velvet', 'modern-editorial', 'obsidian-gold'],
    'bachelorette-party': ['confetti-fete', 'palm-springs', 'blush-bloom', 'citrus-pop'],
    reunion: ['cabana-stripe', 'pressed-garden', 'palm-springs', 'tuscan-watercolor'],
    graduation: ['modern-editorial', 'swiss-grid', 'pressed-garden', 'sunshine-day'],
  };
  const seq = rotations[occasion ?? 'wedding'] ?? rotations.wedding!;
  const picked = getPackById(seq[index % seq.length]!);
  if (picked) return picked;
  // Final safety net — first pack in PACKS is always santorini-linen.
  return PACKS[0]!;
}

/** Render a single motif glyph used in the mini swatch. Mirrors the
 *  prototype's <Motif kind=… size=26/>. We use simple inline SVG
 *  glyphs so we don't need to import MotifScatter (which is
 *  primarily a positional scatterer). */
function MiniMotif({ pack, size = 26 }: { pack: Pack; size?: number }) {
  const color = 'var(--t-accent-ink, var(--t-ink, #2A2A28))';
  const gold = 'var(--t-gold, #C19A4B)';
  switch (pack.motif) {
    case 'olive':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
          <path d="M16 4 C 12 10 12 16 16 28 C 20 16 20 10 16 4 Z" fill="none" stroke={color} strokeWidth="1.2" />
          <ellipse cx="11" cy="14" rx="2.2" ry="1.2" fill={color} opacity={0.78} transform="rotate(-30 11 14)" />
          <ellipse cx="21" cy="14" rx="2.2" ry="1.2" fill={color} opacity={0.78} transform="rotate(30 21 14)" />
          <circle cx="16" cy="20" r="1.6" fill={gold} />
        </svg>
      );
    case 'bloom':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
          <circle cx="16" cy="10" r="3.4" fill={color} opacity={0.62} />
          <circle cx="10" cy="17" r="3" fill={color} opacity={0.5} />
          <circle cx="22" cy="17" r="3" fill={color} opacity={0.5} />
          <circle cx="16" cy="22" r="3.2" fill={color} opacity={0.55} />
          <circle cx="16" cy="16" r="2" fill={gold} />
        </svg>
      );
    case 'pressed':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
          <path d="M16 5 L16 27" stroke={color} strokeWidth="1.1" />
          <path d="M10 11 Q 16 8 16 14" stroke={color} strokeWidth="1.1" fill="none" />
          <path d="M22 11 Q 16 8 16 14" stroke={color} strokeWidth="1.1" fill="none" />
          <path d="M9 18 Q 16 15 16 21" stroke={color} strokeWidth="1.1" fill="none" />
          <path d="M23 18 Q 16 15 16 21" stroke={color} strokeWidth="1.1" fill="none" />
          <circle cx="16" cy="25" r="1.6" fill={gold} />
        </svg>
      );
    case 'laurel':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
          <path d="M9 6 Q 12 16 16 26" stroke={color} strokeWidth="1.1" fill="none" />
          <path d="M23 6 Q 20 16 16 26" stroke={color} strokeWidth="1.1" fill="none" />
          <ellipse cx="12" cy="13" rx="1.6" ry="0.9" fill={color} opacity={0.75} transform="rotate(-22 12 13)" />
          <ellipse cx="20" cy="13" rx="1.6" ry="0.9" fill={color} opacity={0.75} transform="rotate(22 20 13)" />
          <ellipse cx="13" cy="19" rx="1.6" ry="0.9" fill={color} opacity={0.7} transform="rotate(-18 13 19)" />
          <ellipse cx="19" cy="19" rx="1.6" ry="0.9" fill={color} opacity={0.7} transform="rotate(18 19 19)" />
        </svg>
      );
    case 'sun':
    case 'citrus':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
          <circle cx="16" cy="16" r="6" fill={gold} opacity={0.85} />
          {Array.from({ length: 8 }).map((_, i) => {
            const a = (i * Math.PI) / 4;
            const x1 = 16 + Math.cos(a) * 9;
            const y1 = 16 + Math.sin(a) * 9;
            const x2 = 16 + Math.cos(a) * 13;
            const y2 = 16 + Math.sin(a) * 13;
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="1.1" />;
          })}
        </svg>
      );
    case 'shell':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
          <path d="M16 6 L4 24 L28 24 Z" fill="none" stroke={color} strokeWidth="1.2" />
          <path d="M16 10 L16 24" stroke={color} strokeWidth="0.8" opacity={0.6} />
          <path d="M12 14 L13 24" stroke={color} strokeWidth="0.8" opacity={0.6} />
          <path d="M20 14 L19 24" stroke={color} strokeWidth="0.8" opacity={0.6} />
        </svg>
      );
    case 'deco':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
          <rect x="8" y="8" width="16" height="16" fill="none" stroke={color} strokeWidth="1.2" />
          <rect x="12" y="12" width="8" height="8" fill="none" stroke={gold} strokeWidth="1.2" />
          <line x1="8" y1="16" x2="4" y2="16" stroke={color} strokeWidth="1.1" />
          <line x1="24" y1="16" x2="28" y2="16" stroke={color} strokeWidth="1.1" />
          <line x1="16" y1="8" x2="16" y2="4" stroke={color} strokeWidth="1.1" />
          <line x1="16" y1="24" x2="16" y2="28" stroke={color} strokeWidth="1.1" />
        </svg>
      );
    case 'none':
    default:
      // No motif — show a single accent circle (matches the
      // prototype's MiniThemeThumb fallback when motif === 'none').
      return (
        <span
          style={{
            display: 'inline-block',
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: 'var(--t-accent, #2A2A28)',
          }}
        />
      );
  }
}

function MiniThemeThumb({
  occasion,
  index = 0,
  packId,
}: {
  occasion?: string;
  index?: number;
  /** Explicit pack id (when a site persists `themePackId`). */
  packId?: string;
}) {
  const pack = packId ? getPackById(packId) ?? pickPackForSite(occasion, index) : pickPackForSite(occasion, index);
  const scopeStyle: CSSProperties = {
    ...(pack.themeRef as unknown as CSSProperties),
    position: 'relative',
    width: '100%',
    height: '100%',
    background: 'var(--t-section, var(--t-paper))',
    display: 'grid',
    placeItems: 'center',
    overflow: 'hidden',
  };
  return (
    <div
      className="pl8-guest"
      data-pl-texture={pack.texture}
      data-pl-pattern={pack.pattern}
      data-pl-kit={pack.kit}
      data-pl-density="comfortable"
      style={scopeStyle}
      aria-hidden
    >
      <div className="pl8-pattern-layer" data-pl-pattern={pack.pattern} aria-hidden />
      <div style={{ position: 'relative', zIndex: 2, opacity: 0.92 }}>
        <MiniMotif pack={pack} size={26} />
      </div>
    </div>
  );
}

function Section({
  title,
  icon = 'sparkles',
  right,
  children,
}: {
  title: string;
  icon?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600 }}>
          <Icon name={icon} size={15} color="var(--gold)" />
          {title}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function kickoffIcon(kind: KickoffCard['icon']) {
  switch (kind) {
    case 'pear':
      return <Pear size={44} tone="ink" shadow={false} sparkle />;
    case 'image':
      return (
        <svg width="44" height="44" viewBox="0 0 48 48" fill="none" stroke="#3D4A1F" strokeWidth={1.6}>
          <rect x="6" y="14" width="28" height="22" rx="2" fill="#fff" />
          <rect x="12" y="10" width="28" height="22" rx="2" fill="#fff" />
          <circle cx="28" cy="18" r="2.5" fill="#D4A95D" />
          <path d="M14 26l6-6 6 6 4-4 10 10H14z" fill="#8B9C5A" />
        </svg>
      );
    case 'grid':
      return (
        <svg width="44" height="44" viewBox="0 0 48 48" fill="none" stroke="#3D4A1F" strokeWidth={1.6}>
          <rect x="6" y="10" width="36" height="24" rx="2" fill="#fff" />
          <path d="M6 16h36" />
          <circle cx="10" cy="13" r="1" fill="#3D4A1F" />
          <circle cx="14" cy="13" r="1" fill="#3D4A1F" />
          <rect x="10" y="20" width="12" height="10" fill="#C4B5D9" />
          <rect x="26" y="20" width="12" height="10" fill="#F0C9A8" />
        </svg>
      );
    case 'heart':
      return <Heart size={40} color="var(--peach-ink)" />;
    default:
      return <Icon name={kind} size={28} color="var(--ink)" />;
  }
}

function KickoffCards({ occasion, siteDomain }: { occasion?: string | null; siteDomain?: string | null }) {
  // Kickoff card hrefs ship as '/editor' (no slug) because the
  // preset is shared across sites. At render time we rewrite to
  // /editor/{slug} when a site is known so the host lands in the
  // editor in one click; otherwise we send them to the site
  // picker so they can choose first.
  const cards = getKickoffCards(occasion).map((c) => {
    if (c.href !== '/editor') return c;
    return { ...c, href: siteDomain ? `/editor/${encodeURIComponent(siteDomain)}` : '/dashboard/event' };
  });
  const eyebrow = getKickoffEyebrow(occasion);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 0 12px' }}>
        <Sparkle size={14} />
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>{eyebrow}</span>
      </div>
      <div className="pl8-kickoff pl-cascade-row">
        {cards.map((c, i) => (
          <div
            key={c.title}
            className="card pl8-kickoff-card"
            style={{
              padding: 20,
              background:
                c.tone === 'lavender'
                  ? 'var(--lavender-bg)'
                  : c.tone === 'peach'
                    ? 'var(--peach-bg)'
                    : 'var(--sage-tint)',
              border: 'none',
              display: 'flex',
              gap: 16,
              alignItems: 'flex-start',
              transition:
                'transform 260ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 260ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = '0 14px 28px rgba(61,74,31,0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = '';
              e.currentTarget.style.boxShadow = '';
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background:
                  c.tone === 'lavender'
                    ? '#C4B5D9'
                    : c.tone === 'peach'
                      ? '#F0C9A8'
                      : c.tone === 'sage'
                        ? '#CBD29E'
                        : 'var(--cream-2)',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              {kickoffIcon(c.icon)}
            </div>
            <div style={{ flex: 1 }}>
              <div
                className="display"
                style={{
                  fontSize: 20,
                  marginBottom: 4,
                  color:
                    c.tone === 'lavender'
                      ? 'var(--lavender-ink)'
                      : c.tone === 'peach'
                        ? 'var(--peach-ink)'
                        : 'var(--ink)',
                }}
              >
                {c.title}
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.4, marginBottom: 12 }}>{c.body}</div>
              <Link href={c.href} className="btn btn-outline btn-sm">
                {c.cta}
              </Link>
            </div>
          </div>
        ))}
      </div>
      <style jsx>{`
        @keyframes pl8-kickoff-in {
          from { opacity: 0; transform: translateY(10px) scale(0.985); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes pl8-kickoff-in {
            from { opacity: 0; } to { opacity: 1; }
          }
        }
      `}</style>
    </div>
  );
}

function EventSites({
  sites,
  loading,
}: {
  sites: Array<{ id: string; domain: string; published?: boolean; coverPhoto?: string | null; names?: [string, string] | null; occasion?: string; manifest?: unknown }>;
  loading: boolean;
}) {
  const statusFor = (s: { published?: boolean; updatedAt?: unknown }) =>
    s.published ? 'Published' : 'Draft';
  const statusColor: Record<string, { bg: string; fg: string }> = {
    Published: { bg: 'var(--sage-tint)', fg: 'var(--sage-deep)' },
    'In progress': { bg: 'var(--peach-bg)', fg: 'var(--peach-ink)' },
    Draft: { bg: 'var(--cream-2)', fg: 'var(--ink-soft)' },
    'Not started': { bg: 'var(--card)', fg: 'var(--ink-muted)' },
  };
  return (
    <Section
      title="Your event sites"
      icon="layout"
      right={
        <Link href="/dashboard/event" style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
          View all sites
        </Link>
      }
    >
      <div className="pl-cascade-row" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading && (
          <div style={{ padding: 14, textAlign: 'center', color: 'var(--ink-muted)', fontSize: 13 }}>
            Loading your sites…
          </div>
        )}
        {!loading && sites.length === 0 && (
          <div
            style={{
              padding: 22,
              textAlign: 'center',
              background: 'var(--cream-2)',
              borderRadius: 12,
              color: 'var(--ink-soft)',
              fontSize: 13,
            }}
          >
            <Pear size={42} tone="sage" />
            <div style={{ marginTop: 8 }}>No sites yet — let&apos;s make one.</div>
          </div>
        )}
        {sites.slice(0, 4).map((s, idx) => {
          const name =
            siteDisplayName({
              id: s.id,
              domain: s.domain,
              names: s.names,
              occasion: s.occasion,
            } as Parameters<typeof siteDisplayName>[0]) ?? s.domain;
          const prettyUrl = formatSiteDisplayUrl(s.domain, '', normalizeOccasion(s.occasion));
          const status = statusFor(s);
          const c = statusColor[status];
          const progress = siteProgressPct(s.manifest as StoryManifest | null | undefined);
          return (
            <Link
              key={s.id}
              href={`/dashboard/event?site=${encodeURIComponent(s.id)}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '54px 1fr auto',
                alignItems: 'center',
                gap: 12,
                padding: 10,
                borderRadius: 12,
                background: 'var(--cream-2)',
              }}
            >
              {/* Themed mini swatch — real `.pl8-guest` scope so the
                  thumbnail renders the same texture / palette / motif
                  vocabulary as the site itself. No screenshots, no
                  cover-photo dependency. */}
              <div style={{ width: 54, height: 44, borderRadius: 8, flexShrink: 0, overflow: 'hidden' }}>
                <MiniThemeThumb occasion={s.occasion} index={idx} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>{name}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4 }}>
                  {prettyUrl}
                </div>
                {/* Progress hairline — fills proportionally so the
                    host can read "how done is this site?" without
                    opening the editor. Dashboard mirrors the same
                    fill scoring as the editor's Outline pips. */}
                <div
                  aria-label={`${progress}% complete`}
                  title={`${progress}% complete — fields filled across hero, story, schedule, RSVP, and more`}
                  style={{
                    position: 'relative',
                    height: 3,
                    borderRadius: 2,
                    background: 'rgba(14,13,11,0.08)',
                    overflow: 'hidden',
                    maxWidth: 220,
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: `${progress}%`,
                      background: progress >= 75
                        ? 'var(--sage-deep, #5C6B3F)'
                        : progress >= 35
                          ? 'var(--gold, #C19A4B)'
                          : 'var(--peach-ink, #C6703D)',
                      transition: 'width 320ms cubic-bezier(0.22, 1, 0.36, 1)',
                    }}
                  />
                </div>
              </div>
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: 999,
                  background: c.bg,
                  color: c.fg,
                  fontSize: 11.5,
                  fontWeight: 600,
                }}
              >
                {status}
              </span>
            </Link>
          );
        })}
      </div>
      <div style={{ textAlign: 'center', marginTop: 12 }}>
        <Link href="/wizard/new" className="btn btn-outline btn-sm">
          + Create new site
        </Link>
      </div>
    </Section>
  );
}

function Milestones({ eventDate }: { eventDate?: string | null }) {
  const rows = useMemo(() => {
    const out: Array<{ d: string; task: string; due: string; big?: boolean }> = [];
    const today = new Date();
    // parseLocalDate avoids reading bare YYYY-MM-DD as UTC (off-by-one in PT/MT/CT/ET).
    const base = parseLocalDate(eventDate);
    const addRow = (daysFromNow: number, task: string, big = false) => {
      const dt = new Date(today);
      dt.setDate(dt.getDate() + daysFromNow);
      const d = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const due =
        daysFromNow === 0 ? 'today' : daysFromNow === 1 ? 'tomorrow' : `in ${daysFromNow} days`;
      out.push({ d, task, due, big });
    };
    addRow(11, 'Send invitations');
    addRow(18, 'RSVP deadline');
    addRow(26, 'Menu selection');
    addRow(34, 'Finalize seating chart');
    if (base) {
      const diff = Math.round((base.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diff >= 0)
        out.push({
          d: base.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          task: 'The big day!',
          due: '',
          big: true,
        });
    }
    return out;
  }, [eventDate]);
  // No event date set yet — the fake "Send invitations in 11
  // days / RSVP deadline in 18 days" rows misled hosts into
  // thinking real deadlines existed. Skip the card entirely
  // until there's a real anchor date to count from.
  if (!eventDate) return null;
  return (
    <Section
      title="Upcoming milestones"
      icon="clock"
      right={
        <Link href="/dashboard/day-of" style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
          View timeline
        </Link>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {rows.map((r, i) => (
          <div
            key={`${r.task}-${i}`}
            style={{
              display: 'grid',
              gridTemplateColumns: '56px 18px 1fr auto',
              gap: 10,
              alignItems: 'center',
              padding: '10px 0',
              borderBottom: '1px solid var(--line-soft)',
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--ink-muted)', fontWeight: 500 }}>{r.d}</div>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                border: '2px solid var(--ink-muted)',
                background: r.big ? 'var(--ink)' : 'transparent',
                borderColor: r.big ? 'var(--ink)' : 'var(--ink-muted)',
              }}
            />
            <div style={{ fontSize: 13.5, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
              {r.task}
              {r.big && <PearlDot size={10} />}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>{r.due}</div>
          </div>
        ))}
      </div>
    </Section>
  );
}

interface GuestTasksProps {
  /** Real RSVP-stats passed in from the dashboard data loader.
   *  When the host hasn't imported any guests yet, pass
   *  all zeros and the component renders an empty-state card
   *  instead of fake percentages. */
  invited?: number;
  responded?: number;
  yes?: number;
  no?: number;
  awaiting?: number;
  needRsvp?: number;
  needMeal?: number;
  needSong?: number;
}

function GuestTasks({ invited = 0, responded = 0, yes = 0, no = 0, awaiting = 0, needRsvp = 0, needMeal = 0, needSong = 0 }: GuestTasksProps) {
  const stats = [
    { label: 'Invited', val: invited },
    { label: 'Responded', val: responded },
    { label: 'Yes', val: yes },
    { label: 'No', val: no },
    { label: 'Awaiting', val: awaiting },
  ];
  const tasks = [
    { label: 'Need to RSVP', count: needRsvp },
    { label: 'Need meal selection', count: needMeal },
    { label: 'Need to submit song request', count: needSong },
  ].filter((t) => t.count > 0);
  const hasAny = invited > 0 || responded > 0;
  return (
    <Section
      title="Guest tasks & RSVPs"
      icon="users"
      right={
        <Link href="/dashboard/rsvp" style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
          View guests
        </Link>
      }
    >
      {hasAny ? (
        <>
          <div className="pl8-cols-5" style={{ gap: 6, marginBottom: 14 }}>
            {stats.map((s) => (
              <div key={s.label} style={{ background: 'var(--cream-2)', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 10.5, color: 'var(--ink-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>{s.label}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600 }}>{s.val}</div>
              </div>
            ))}
          </div>
          {tasks.length > 0 && (
            <>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 600, marginBottom: 6 }}>Outstanding tasks</div>
              {tasks.map((t) => (
                <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 6px' }}>
                  <div style={{ width: 14, height: 14, borderRadius: 5, border: '1.5px solid var(--line)', flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: 13 }}>{t.label}</div>
                  <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{t.count}</span>
                </div>
              ))}
            </>
          )}
        </>
      ) : (
        <div
          style={{
            padding: 16,
            textAlign: 'center',
            background: 'var(--cream-2)',
            borderRadius: 12,
            border: '1px dashed var(--line)',
          }}
        >
          <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 10 }}>
            No guests yet. Import your list to start tracking RSVPs.
          </div>
          <Link href="/dashboard/rsvp" className="btn btn-outline btn-sm">
            <Icon name="users" size={13} /> Add guests
          </Link>
        </div>
      )}
      <div style={{ marginTop: 10 }}>
        <Link href="/dashboard/rsvp" className="btn btn-outline btn-sm">
          <Icon name="mail" size={13} /> Message guests
        </Link>
      </div>
    </Section>
  );
}

/* Moments / LinkedCelebrations / PearAssistant sections were removed
   in the 2026-04-30 simplification audit (Moments had no real data,
   LinkedCelebrations duplicated /dashboard/connections, PearAssistant
   was a context-less duplicate of DesignAdvisor). The dashboard now
   renders only data-grounded cards: Kickoff + Sites + Milestones +
   Guests. See CLAUDE-PRODUCT.md §10 (2026-04-30 entry) for the
   rationale. */

function HelpBand() {
  return (
    <div
      style={{
        margin: '20px 32px 0',
        padding: '18px 24px',
        background: 'var(--lavender-bg)',
        borderRadius: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        position: 'relative',
        overflow: 'hidden',
        flexWrap: 'wrap',
      }}
    >
      <Pear size={50} tone="sage" sparkle />
      <div style={{ flex: 1, minWidth: 220 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>
          Need a hand? Pear&apos;s here.
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
          Explore helpful tips and tools to keep everything running smoothly.
        </div>
      </div>
      {[
        { icon: 'flag' as const, label: 'Getting started', sub: 'Set up your site\nin minutes', href: '/dashboard/help' },
        { icon: 'bell' as const, label: 'Help center', sub: 'Browse guides\nand tutorials', href: '/dashboard/help' },
        { icon: 'mail' as const, label: 'Live support', sub: 'Chat with our\nfriendly team', href: '/dashboard/help' },
      ].map((it) => (
        <Link key={it.label} href={it.href} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              background: 'var(--card)',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Icon name={it.icon} size={16} color="var(--ink-soft)" />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{it.label}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-muted)', whiteSpace: 'pre-line' }}>{it.sub}</div>
          </div>
        </Link>
      ))}
      <Stamp size={70} tone="lavender" text="YOU'VE GOT THIS" icon="heart" rotation={-10} />
    </div>
  );
}

export function DashHomeV8() {
  const { data: session } = useSession();
  const { sites, site, loading } = useSelectedSite();
  const stats = useDashStats(site?.id);
  const daysToGo = useDaysToGo(site?.eventDate ?? undefined);
  const first = (session?.user?.name || session?.user?.email || 'there').split(/[\s@]/)[0];
  const activeName = site ? siteDisplayName(site) : 'your celebration';

  return (
    <DashLayout
      active="dashboard"
      title={`Welcome back, ${first}`}
      subtitle={
        <>
          Here&apos;s what&apos;s happening with{' '}
          <span style={{ color: 'var(--lavender-ink)', fontWeight: 500 }}>{activeName}</span>
          {daysToGo !== null && daysToGo !== undefined ? (
            <> — {daysToGo} days to go.</>
          ) : (
            <>.</>
          )}
        </>
      }
      ctaText="Create new event"
      ctaHref="/wizard/new"
    >
      <PLAtmosphere />
      <div data-welcome-notes style={{ position: 'absolute', top: 60, right: 160, zIndex: 2, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <PostIt tone="lavender" width={160} rotation={-6}>
          Every detail,
          <br />
          together.
          <span style={{ fontFamily: 'var(--font-script)', color: 'var(--ink-muted)', fontSize: 18 }}> ~</span>
        </PostIt>
        <Stamp size={80} tone="peach" text="MADE FOR MEANINGFUL MOMENTS" icon="pear" rotation={10} />
      </div>

      {/* Canonical dashboard container — matches DashSites,
          DashAnalytics, DashGuests, KeepsakesPage, EventIndexPage,
          etc. Bottom 32 (not 24) keeps the HelpBand spacing
          consistent with sibling pages. */}
      <div style={{ padding: '0 clamp(20px, 4vw, 40px) 32px', maxWidth: 1240, margin: '0 auto' }}>
        <KickoffCards occasion={site?.occasion} siteDomain={site?.domain} />
        <div className="pl8-dash-threecol pl8-dash-stagger" style={{ marginTop: 24 }}>
          <EventSites sites={sites ?? []} loading={loading} />
          <Milestones eventDate={site?.eventDate ?? null} />
          <GuestTasks
            invited={stats.invited}
            responded={stats.rsvps}
            yes={stats.yes}
            no={stats.no}
            awaiting={stats.awaiting}
            needRsvp={stats.awaiting}
            needMeal={stats.needMeal}
            needSong={stats.needSong}
          />
        </div>
        {/* Second-row cards removed in the simplification audit:
            - Moments was 4 placeholder photo tones (no real data)
            - LinkedCelebrations duplicated /dashboard/connections
            - PearAssistant was a context-less chat duplicating
              DesignAdvisor in the editor
            Home page now only renders things grounded in real
            site data: Kickoff + Sites + Milestones + Guests. */}
      </div>
      <HelpBand />
      <div style={{ height: 40 }} />
    </DashLayout>
  );
}
