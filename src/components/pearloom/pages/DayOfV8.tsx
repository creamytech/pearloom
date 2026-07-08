'use client';

/* ========================================================================
   PEARLOOM — DAY-OF ROOM (v8 handoff port)
   ======================================================================== */

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { buildSitePath } from '@/lib/site-urls';
import { Icon, PhotoPlaceholder, PearloomGlyph } from '../motifs';
import { AmbientHour } from '../ambient';
import { DashEmpty } from '../dash/DashEmpty';

// Shared deep-link helper for day-of CTAs. EditorV8 reads ?focus=
// (block key) and ?anchor= (Theme-tab anchor) on mount and fires
// pearloom:design-jump so the host lands inside the right panel
// instead of the editor's default block.
function editorDeepLink(siteDomain: string | null | undefined, block?: string, anchor?: string): string {
  if (!siteDomain) return '/dashboard/event';
  const sp = new URLSearchParams();
  if (block) sp.set('focus', block);
  if (anchor) sp.set('anchor', anchor);
  const q = sp.toString();
  return `/editor/${encodeURIComponent(siteDomain)}${q ? `?${q}` : ''}`;
}
import { DashLayout } from '../dash/DashShell';
import { PLAtmosphere } from '../dash/PLChrome';
import { PageIntro } from '../dash/QuietDash';
import { BroadcastComposer } from '../dash/BroadcastComposer';
import { parseLocalDate } from '@/lib/date-utils';
import { buildSiteUrl } from '@/lib/site-urls';
import { useSelectedSite, siteDisplayName } from '@/components/marketing/design/dash/hooks';
import { useDashStats } from '@/components/marketing/v2/useDashStats';
import { isDashSurfaceApplicable } from '@/lib/event-os/dashboard-applicability';
import type { StoryManifest } from '@/types';

// ── shared editorial tokens + card chrome (zip DayOf) ──────────
const MONO = 'var(--pl-font-mono, ui-monospace, monospace)';
const DISPLAY = 'var(--font-display, "Fraunces", Georgia, serif)';

// The editorial hero palette — a FIXED deep-olive surface in both
// light + editorial-midnight, matching the shipped Home hero
// (cockpit.tsx). Interior cream/gold is intentionally literal.
const HERO_BG = 'linear-gradient(150deg, #37421F 0%, #2A331A 46%, #1E2513 100%)';
const HERO_GOLD = '#DDB768';
const HERO_CREAM = '#F7F2E6';
const HERO_SOFT = 'rgba(247,242,230,0.72)';
const HERO_LINEN =
  'repeating-linear-gradient(0deg, rgba(247,242,230,0.05) 0 1px, transparent 1px 5px), repeating-linear-gradient(90deg, rgba(247,242,230,0.05) 0 1px, transparent 1px 5px)';

/** Mono uppercase eyebrow — the zip's `<Eyebrow rule="none">`. */
function CardEyebrow({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: color ?? 'var(--ink-muted)' }}>
      {children}
    </div>
  );
}

/** The zip card header: a mono eyebrow, an optional right-aligned
 *  action/meta slot, and a Fraunces headline with one italic accent
 *  clause. A plain `<div>` (not `.display`) so the ≤640px `.display`
 *  clamp never inflates it on phones. */
function CardHead({
  eyebrow,
  title,
  accent,
  accentColor = 'var(--lavender-ink)',
  right,
  size = 22,
  margin = '8px 0 16px',
}: {
  eyebrow: React.ReactNode;
  title: React.ReactNode;
  accent?: React.ReactNode;
  accentColor?: string;
  right?: React.ReactNode;
  size?: number;
  margin?: string;
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <CardEyebrow>{eyebrow}</CardEyebrow>
        {right ? <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>{right}</div> : null}
      </div>
      <div style={{ fontFamily: DISPLAY, fontSize: size, fontWeight: 600, lineHeight: 1.16, color: 'var(--ink)', margin }}>
        {title}
        {accent ? <> <span style={{ fontStyle: 'italic', color: accentColor }}>{accent}</span></> : null}
      </div>
    </div>
  );
}

function useLiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function DayOfHero({
  rsvps,
  visits,
  today,
  registryClicks,
  totalGuests,
  daysUntil,
  dateLabel,
  headline,
  nowLabel,
  nextLabel,
}: {
  rsvps: number;
  visits: number;
  today: number;
  registryClicks: number;
  totalGuests: number | null;
  /** Whole days to the event: 0 = today, null = no date set. */
  daysUntil: number | null;
  /** Long date label, e.g. "Saturday, September 6". */
  dateLabel: string | null;
  /** Occasion-aware two-part headline (accent = italic clause). */
  headline: { a: string; b: string };
  /** The run-of-show event happening now — null when no schedule. */
  nowLabel: string | null;
  /** The next scheduled event, when one follows the current one. */
  nextLabel: string | null;
}) {
  const now = useLiveClock();
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  // Time-dependent chrome (the live clock, the trig-drawn AmbientHour)
  // is client-only so it can't diverge from the SSR paint. The
  // headline + metrics are deterministic from props and SSR fine.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // rAF (not a synchronous setState) — React-Compiler safe.
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const isEventDay = daysUntil === 0;
  // The gold mono eyebrow — "THE ROOM IS LIVE · SEP 6" on the day,
  // an honest countdown / recap / preview otherwise.
  const dateBit = dateLabel ? ` · ${dateLabel.toUpperCase()}` : '';
  const stateLabel =
    daysUntil === null
      ? `PREVIEW${dateBit}`
      : isEventDay
        ? `THE ROOM IS LIVE${dateBit}`
        : daysUntil > 0
          ? `${daysUntil} DAY${daysUntil === 1 ? '' : 'S'} TO GO${dateBit}`
          : `AFTER THE DAY${dateBit}`;
  // "Right now: …" — the current run-of-show line, honest when there
  // is no schedule to read from yet.
  const rightNow: React.ReactNode = nowLabel
    ? (
        <>
          Right now: <strong style={{ color: HERO_CREAM, fontWeight: 600 }}>{nowLabel}</strong>.
          {nextLabel ? <> Next up — {nextLabel}.</> : null}
        </>
      )
    : 'Add your run of show and the day will keep its own time here.';
  const metrics: [label: string, value: string, sub: string | null][] = [
    ['RSVPs in', totalGuests && totalGuests > 0 ? `${rsvps}/${totalGuests}` : String(rsvps), rsvps === 0 ? 'awaiting first reply' : `${rsvps} responded`],
    ['Visits today', String(today), today === 0 ? 'nothing yet today' : 'since midnight'],
    ['Site visits', String(visits), visits === 0 ? 'share your link' : 'all-time'],
    ['Registry clicks', String(registryClicks), registryClicks === 0 ? '—' : 'via your site'],
  ];
  return (
    <div
      className="pl8-dayof-hero"
      style={{ borderRadius: 18, overflow: 'hidden', background: HERO_BG, color: HERO_CREAM, position: 'relative', boxShadow: 'var(--shadow-md, 0 18px 48px -24px rgba(20,24,12,0.55))' }}
    >
      <div aria-hidden style={{ position: 'absolute', inset: 0, opacity: 0.5, pointerEvents: 'none', backgroundImage: HERO_LINEN, backgroundSize: '5px 5px' }} />
      {mounted && (
        <div aria-hidden style={{ position: 'absolute', top: -18, right: -10, opacity: 0.16, pointerEvents: 'none' }}>
          <AmbientHour size={168} color={HERO_CREAM} accent={HERO_GOLD} />
        </div>
      )}
      <div
        className="pl8-dayof-hero-grid"
        style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 'clamp(20px,3vw,36px)', alignItems: 'center', padding: 'clamp(22px,3vw,34px)' }}
      >
        {/* LEFT — the live state, the headline, "right now". */}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', color: HERO_GOLD }}>
            <span aria-hidden className={isEventDay ? 'pulse-dot' : undefined} style={{ width: 7, height: 7, borderRadius: 99, background: HERO_GOLD, flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{stateLabel}</span>
          </div>
          <div style={{ fontFamily: DISPLAY, fontSize: 'clamp(30px,4vw,46px)', fontWeight: 400, lineHeight: 1.02, letterSpacing: '-0.02em', color: HERO_CREAM, margin: '12px 0 0' }}>
            {headline.a} <span style={{ fontStyle: 'italic', color: HERO_GOLD }}>{headline.b}</span>
          </div>
          <div style={{ fontSize: 14, color: HERO_SOFT, lineHeight: 1.5, marginTop: 12, maxWidth: 460 }}>{rightNow}</div>
        </div>
        {/* RIGHT — the live pulse, real data (no fabricated numbers). */}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', color: HERO_GOLD, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>THE PULSE</span>
            {mounted && <span style={{ fontWeight: 400, letterSpacing: '0.04em', color: HERO_SOFT }}>· {timeStr}</span>}
          </div>
          <div className="pl8-dayof-hero-stats" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {metrics.map(([label, value, sub]) => (
              <div key={label} style={{ background: 'rgba(247,242,230,0.08)', border: '1px solid rgba(247,242,230,0.14)', borderRadius: 12, padding: '11px 13px' }}>
                <div style={{ fontFamily: MONO, fontSize: 8.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: HERO_SOFT }}>{label}</div>
                <div style={{ fontFamily: DISPLAY, fontSize: 25, lineHeight: 1.05, color: HERO_CREAM, marginTop: 5 }}>{value}</div>
                {sub ? <div style={{ fontSize: 10.5, color: 'rgba(247,242,230,0.55)', marginTop: 3 }}>{sub}</div> : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

type TimelineItem = { time: string; title: string; d?: string; status: 'done' | 'now' | 'next' | 'later' };

function parseTimeToMinutes(t: string): number | null {
  // Accept "4:00 PM", "16:00", "4:00PM"
  const m = t.trim().toUpperCase().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const ampm = m[3];
  if (ampm === 'PM' && h < 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return h * 60 + mm;
}

function deriveStatuses(items: { time: string }[]): TimelineItem['status'][] {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const withIdx = items.map((it, i) => ({ i, min: parseTimeToMinutes(it.time) ?? -1 }));
  // Find the "now" item: last one whose start is <= now.
  let currentIdx = -1;
  for (const e of withIdx) {
    if (e.min >= 0 && e.min <= nowMin) currentIdx = e.i;
  }
  return items.map((_, i) => {
    if (currentIdx === -1) return 'later';
    if (i < currentIdx) return 'done';
    if (i === currentIdx) return 'now';
    if (i === currentIdx + 1) return 'next';
    return 'later';
  });
}

function MomentTimeline({
  items,
  siteDomain,
  occasion,
}: {
  items: TimelineItem[];
  siteDomain?: string | null;
  occasion?: string | null;
}) {
  const heading =
    occasion === 'memorial' || occasion === 'funeral'
      ? 'The service'
      : occasion === 'bachelor-party' || occasion === 'bachelorette-party' || occasion === 'reunion'
        ? 'The itinerary'
        : "Today's rundown";
  // Path-based editor URL — /editor is route-grouped under
  // [siteSlug], so the legacy ?site=… form 404s. Without a site
  // selected we send the host to /dashboard/event so they can
  // pick which one they want before editing.
  const editHref = siteDomain ? `/editor/${encodeURIComponent(siteDomain)}` : '/dashboard/event';

  // Occasion-appropriate sample rows for the empty state — never
  // wedding cues ("Ceremony", "First dance") on a memorial or
  // birthday. These are illustrative placeholders, clearly framed
  // as examples, not real data.
  const examples =
    occasion === 'memorial' || occasion === 'funeral'
      ? ['2:00 — Gathering begins', '2:30 — Words & remembrances', '3:30 — Reception']
      : occasion === 'bachelor-party' || occasion === 'bachelorette-party' || occasion === 'reunion'
        ? ['Fri 6:00 — Welcome dinner', 'Sat 11:00 — Main activity', 'Sat 9:00 — Night out']
        : ['5:00 — Doors open', '6:00 — Dinner served', '8:00 — Toasts', '9:00 — Music & dancing'];

  if (items.length === 0) {
    return (
      <div className="card" style={{ padding: 26 }}>
        <CardHead eyebrow={heading} title="The day," accent="hour by hour." margin="8px 0 0" />
        <div style={{ marginTop: 16 }}>
          <DashEmpty
            eyebrow={heading}
            title="No schedule yet."
            body="Add events in the editor — Pearloom will show them here in order on the day, with a live now-marker."
            examples={examples}
            actions={[{ label: 'Add events', href: editorDeepLink(siteDomain, 'schedule'), icon: 'brush', primary: true }]}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 26 }}>
      <CardHead
        eyebrow={heading}
        title="The day,"
        accent="hour by hour."
        margin="8px 0 18px"
        right={
          <Link href={editHref} className="btn btn-outline btn-sm">
            <Icon name="brush" size={12} /> Nudge timeline
          </Link>
        }
      />
      <div>
        {items.map((m, i) => {
          const isNow = m.status === 'now';
          const isDone = m.status === 'done';
          const isNext = m.status === 'next';
          const last = i === items.length - 1;
          return (
            <div key={i} className="pl8-dayof-tlrow" style={{ display: 'flex', gap: 14, alignItems: 'stretch' }}>
              {/* Time — mono, in the accent when this hour is live. */}
              <div style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, color: isNow ? 'var(--peach-ink)' : 'var(--ink-muted)', width: 56, paddingTop: 12, flexShrink: 0, whiteSpace: 'nowrap' }}>
                {m.time}
              </div>
              {/* The two-strand rail — a dot per moment, a thread
                  between them (olive-filled once the moment is done). */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span
                  className={isNow ? 'pulse-dot' : undefined}
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 999,
                    marginTop: 12,
                    flexShrink: 0,
                    display: 'grid',
                    placeItems: 'center',
                    background: isDone ? 'var(--sage)' : isNow ? 'var(--card)' : 'transparent',
                    border: `2px solid ${isDone ? 'var(--sage)' : isNow ? 'var(--peach-ink)' : 'var(--line)'}`,
                    color: 'var(--cream)',
                  }}
                >
                  {isDone ? (
                    <Icon name="check" size={10} strokeWidth={3} color="var(--cream)" />
                  ) : isNow ? (
                    <span style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--peach-ink)' }} />
                  ) : null}
                </span>
                {!last && <span style={{ flex: 1, width: 2, minHeight: 18, background: isDone ? 'var(--sage)' : 'var(--line)', margin: '2px 0' }} />}
              </div>
              {/* The moment — title + who/where; the live hour lifts
                  into a soft peach panel. */}
              <div
                /* Done moments wear the line-screen (TASTE-PLAN
                   T.4) — the day prints itself as it happens. */
                className={isDone ? 'pl-hatch' : undefined}
                style={{ flex: 1, minWidth: 0, padding: isDone ? '10px 14px 12px' : '10px 0 12px', borderRadius: isDone ? 12 : 0, ...(isNow ? { background: 'var(--peach-bg)', borderRadius: 12, padding: '10px 14px', margin: '4px 0' } : {}) }}>
                <div style={{ fontSize: 14.5, fontWeight: 600, color: isDone ? 'var(--ink-soft)' : 'var(--ink)' }}>
                  {m.title}
                  {isNow && <span style={{ marginLeft: 8, fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--peach-ink)' }}>NOW</span>}
                  {isNext && <span style={{ marginLeft: 8, fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--ink-muted)' }}>UP NEXT</span>}
                </div>
                {'d' in m && m.d && <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 2 }}>{m.d}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type GuestPhoto = {
  id: string;
  photoUrl?: string;
  url?: string;
  uploaderName?: string;
  caption?: string;
  createdAt?: string;
};

function useGuestPhotos(siteId?: string | null): { items: GuestPhoto[]; loading: boolean } {
  const [items, setItems] = useState<GuestPhoto[]>([]);
  const [loading, setLoading] = useState<boolean>(Boolean(siteId));
  useEffect(() => {
    if (!siteId) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch(`/api/guest-photos?siteId=${encodeURIComponent(siteId)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.resolve({ photos: [] })))
      .then((data) => {
        if (cancelled) return;
        const photos = Array.isArray(data?.photos) ? data.photos : [];
        setItems(photos.slice(0, 9));
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [siteId]);
  return { items, loading };
}

function relativeTime(iso?: string): string {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return '';
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr`;
  const d = Math.floor(hr / 24);
  return `${d} d`;
}

function LiveReel({ siteDomain, occasion }: { siteDomain?: string | null; siteId?: string | null; occasion?: string | null }) {
  // guest_photos.site_id is the subdomain, not the uuid — fetch by
  // domain so approved photos actually show here.
  const { items, loading } = useGuestPhotos(siteDomain);
  // Path-based editor URL — /editor is route-grouped under
  // [siteSlug], so the legacy ?site=… form 404s. Without a site
  // selected we send the host to /dashboard/event so they can
  // pick which one they want before editing.
  const editHref = siteDomain ? `/editor/${encodeURIComponent(siteDomain)}` : '/dashboard/event';
  const heading = occasion === 'memorial' || occasion === 'funeral' ? 'What guests shared' : 'The live reel';
  return (
    <div className="card" style={{ padding: 24 }}>
      <CardHead
        eyebrow="Guest photos"
        title={heading}
        accentColor="var(--sage-deep)"
        right={
          <>
            {items.length > 0 && (
              <span className="pill pill-sage" style={{ fontSize: 11 }}>
                {items.length} shared
              </span>
            )}
            <Link href="/dashboard/gallery" className="btn btn-outline btn-sm">
              <Icon name="eye" size={12} /> Moderate
            </Link>
          </>
        }
      />
      {loading ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-soft)', fontSize: 13 }}>Loading…</div>
      ) : items.length === 0 ? (
        <div
          style={{
            padding: 24,
            background: 'var(--cream-2)',
            border: '1px dashed var(--line)',
            borderRadius: 12,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Nothing yet.</div>
          <div style={{ fontSize: 13, color: 'var(--ink-soft)', maxWidth: 360, margin: '0 auto 12px' }}>
            Turn on a guest photo wall in the editor — any photo uploaded lands here for quick moderation.
          </div>
          <Link href={editorDeepLink(siteDomain, 'gallery')} className="btn btn-outline btn-sm">
            <Icon name="brush" size={12} /> Set up photo wall
          </Link>
        </div>
      ) : (
        <div className="pl8-cols-3" style={{ gap: 10 }}>
          {items.map((it, i) => {
            const src = it.photoUrl || it.url;
            const tones = ['peach', 'sage', 'lavender', 'cream'] as const;
            const tone = tones[i % tones.length];
            return (
              <div key={it.id ?? i} style={{ borderRadius: 12, overflow: 'hidden', position: 'relative', aspectRatio: '4/5' }}>
                <PhotoPlaceholder tone={tone} aspect="auto" src={src} style={{ height: '100%' }} />
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '20px 10px 8px',
                    background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.65) 100%)',
                    color: 'white',
                    fontSize: 11,
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{it.uploaderName ?? 'Guest'}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ opacity: 0.85 }}>{it.caption || '—'}</span>
                    <span style={{ opacity: 0.7 }}>{relativeTime(it.createdAt)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

type GuestRow = { status?: string; attending?: boolean | null; mealPreference?: string | null };

function useGuestRollup(siteId?: string | null) {
  const [rows, setRows] = useState<GuestRow[]>([]);
  const [loading, setLoading] = useState<boolean>(Boolean(siteId));
  useEffect(() => {
    if (!siteId) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch(`/api/guests?siteId=${encodeURIComponent(siteId)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.resolve({ guests: [] })))
      .then((data) => {
        if (cancelled) return;
        setRows(Array.isArray(data?.guests) ? data.guests : []);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [siteId]);
  return { rows, loading };
}

function AttendanceCard({ siteId, occasion, siteDomain }: { siteId?: string | null; occasion?: string | null; siteDomain?: string | null }) {
  const { rows, loading } = useGuestRollup(siteId);
  // Path-based editor URL — /editor is route-grouped under
  // [siteSlug], so the legacy ?site=… form 404s. Without a site
  // selected we send the host to /dashboard/event so they can
  // pick which one they want before editing.
  const editHref = siteDomain ? `/editor/${encodeURIComponent(siteDomain)}` : '/dashboard/event';
  const heading = occasion === 'memorial' || occasion === 'funeral' ? 'Who’s attending' : 'Who’s coming';

  const buckets: Array<{ group: string; count: number; total: number; tone: 'sage' | 'peach' | 'lavender' | 'cream' }> = useMemo(() => {
    const total = rows.length;
    const yes = rows.filter((g) => g.status === 'attending' || g.attending === true).length;
    const no = rows.filter((g) => g.status === 'declined' || g.attending === false).length;
    const maybe = rows.filter((g) => g.status === 'maybe' || g.status === 'tentative').length;
    const pending = Math.max(0, total - yes - no - maybe);
    return [
      { group: 'Attending', count: yes, total, tone: 'sage' },
      { group: 'Maybe', count: maybe, total, tone: 'peach' },
      { group: 'Pending', count: pending, total, tone: 'lavender' },
      { group: 'Declined', count: no, total, tone: 'cream' },
    ];
  }, [rows]);

  // Kitchen line — RSVP meal answers among attending guests, the
  // count a caterer asks for on the morning of. Hidden when the
  // event never asked a meal question.
  const meals = useMemo(() => {
    const m = new Map<string, number>();
    for (const g of rows) {
      const coming = g.status === 'attending' || g.attending === true;
      const meal = (g.mealPreference ?? '').trim();
      if (coming && meal) m.set(meal, (m.get(meal) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);

  return (
    <div className="card" style={{ padding: 24 }}>
      <CardHead
        eyebrow="RSVPs"
        title={heading}
        accentColor="var(--sage-deep)"
        right={
          <Link href="/dashboard/rsvp" style={{ fontSize: 12, color: 'var(--peach-ink)', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            Open list <Icon name="arrow-right" size={12} color="var(--peach-ink)" />
          </Link>
        }
      />
      {loading ? (
        <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Loading…</div>
      ) : rows.length === 0 ? (
        <div
          style={{
            padding: 22,
            textAlign: 'center',
            background: 'var(--cream-2)',
            border: '1px dashed var(--line)',
            borderRadius: 12,
          }}
        >
          <div style={{ fontSize: 13, color: 'var(--ink-soft)', maxWidth: 340, margin: '0 auto 12px' }}>
            No guests yet. Share your link or import a CSV to start tracking responses.
          </div>
          <Link href={editorDeepLink(siteDomain, 'rsvp')} className="btn btn-outline btn-sm">
            <Icon name="brush" size={12} /> Open editor
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {buckets.map((r) => {
            const pct = r.total > 0 ? Math.round((r.count / r.total) * 100) : 0;
            return (
              <div key={r.group}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{r.group}</span>
                  <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                    {r.count} / {r.total}
                  </span>
                </div>
                <div style={{ height: 8, background: 'var(--cream-2)', borderRadius: 4, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      background:
                        r.tone === 'peach'
                          ? 'var(--peach-2)'
                          : r.tone === 'sage'
                            ? 'var(--sage-2)'
                            : r.tone === 'lavender'
                              ? 'var(--lavender-2)'
                              : 'var(--cream-3)',
                      transition: 'width .4s',
                    }}
                  />
                </div>
              </div>
            );
          })}
          {meals.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 8,
                flexWrap: 'wrap',
                paddingTop: 12,
                borderTop: '1px solid var(--line-soft)',
              }}
            >
              <span style={{ fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
                Kitchen
              </span>
              <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
                {meals.map(([meal, n]) => `${meal} ${n}`).join(' · ')}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type GuestbookEntry = {
  id: string;
  guestName?: string;
  message?: string;
  createdAt?: string;
  highlight?: boolean;
};

function useGuestbook(siteId?: string | null): { items: GuestbookEntry[]; loading: boolean } {
  const [items, setItems] = useState<GuestbookEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(Boolean(siteId));
  useEffect(() => {
    if (!siteId) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch(`/api/guestbook?siteId=${encodeURIComponent(siteId)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.resolve({ wishes: [] })))
      .then((data) => {
        if (cancelled) return;
        const wishes = Array.isArray(data?.wishes) ? data.wishes : [];
        setItems(wishes.slice(0, 6));
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [siteId]);
  return { items, loading };
}

function initials(name?: string): string {
  if (!name) return '?';
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase();
}

function GuestWall({ siteId, siteDomain, occasion }: { siteId?: string | null; siteDomain?: string | null; occasion?: string | null }) {
  const { items, loading } = useGuestbook(siteId);
  // Path-based editor URL — /editor is route-grouped under
  // [siteSlug], so the legacy ?site=… form 404s. Without a site
  // selected we send the host to /dashboard/event so they can
  // pick which one they want before editing.
  const editHref = siteDomain ? `/editor/${encodeURIComponent(siteDomain)}` : '/dashboard/event';
  const heading =
    occasion === 'memorial' || occasion === 'funeral'
      ? 'Notes of memory'
      : occasion === 'retirement'
        ? 'Notes from colleagues'
        : 'Notes from the crowd';
  return (
    <div className="card" style={{ padding: 24 }}>
      <CardHead
        eyebrow="Guestbook"
        title={heading}
        right={
          <Link href="/dashboard/submissions" className="btn btn-outline btn-sm">
            <Icon name="eye" size={12} /> Moderate
          </Link>
        }
      />
      {loading ? (
        <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Loading…</div>
      ) : items.length === 0 ? (
        <div
          style={{
            padding: 22,
            textAlign: 'center',
            background: 'var(--cream-2)',
            border: '1px dashed var(--line)',
            borderRadius: 12,
          }}
        >
          <div style={{ fontSize: 13, color: 'var(--ink-soft)', maxWidth: 340, margin: '0 auto 12px' }}>
            No notes yet. Add a guestbook block on your site — any message guests leave shows up here.
          </div>
          <Link href={editorDeepLink(siteDomain, 'faq')} className="btn btn-outline btn-sm">
            <Icon name="brush" size={12} /> Add guestbook
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((m, i) => {
            const tones = ['peach', 'lavender', 'sage', 'cream'] as const;
            const tone = tones[i % tones.length];
            const pin = Boolean(m.highlight);
            return (
              <div
                key={m.id ?? i}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '36px 1fr',
                  gap: 12,
                  padding: 12,
                  background: pin ? 'var(--peach-bg)' : 'var(--cream-2)',
                  border: pin ? '1px solid var(--peach-2)' : '1px solid var(--line-soft)',
                  borderRadius: 12,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background:
                      tone === 'peach'
                        ? 'var(--peach-2)'
                        : tone === 'lavender'
                          ? 'var(--lavender-2)'
                          : tone === 'sage'
                            ? 'var(--sage-2)'
                            : 'var(--cream-3)',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 700,
                    fontSize: 12,
                    color: 'var(--ink)',
                  }}
                >
                  {initials(m.guestName)}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{m.guestName ?? 'Guest'}</span>
                    <span style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{relativeTime(m.createdAt)}</span>
                    {pin && (
                      <span className="pill pill-peach" style={{ fontSize: 10, padding: '2px 7px' }}>
                        Pinned
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.5 }}>{m.message}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

type SongRequestRow = {
  id: string;
  guest_name?: string;
  song_title?: string;
  artist?: string | null;
  state?: string;
};

function useSongRequests(siteId?: string | null): { items: SongRequestRow[]; loading: boolean } {
  const [items, setItems] = useState<SongRequestRow[]>([]);
  const [loading, setLoading] = useState<boolean>(Boolean(siteId));
  useEffect(() => {
    if (!siteId) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch(`/api/song-requests?siteId=${encodeURIComponent(siteId)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.resolve({ songs: [] })))
      .then((data) => {
        if (cancelled) return;
        const songs = Array.isArray(data?.songs) ? (data.songs as SongRequestRow[]) : [];
        // Read-only day-of view: only what's pending or green-lit.
        // Hidden requests stay in Music's audit trail.
        setItems(songs.filter((s) => s.state === 'queued' || s.state === 'accepted'));
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [siteId]);
  return { items, loading };
}

function SongQueue({ siteId }: { siteId?: string | null }) {
  // Lightweight read of the collaborative playlist — the same
  // /api/song-requests rows the Music dashboard triages. This card
  // is read-only; accept/hide lives in Music.
  const { items, loading } = useSongRequests(siteId);
  const accepted = items.filter((s) => s.state === 'accepted');
  const queued = items.filter((s) => s.state === 'queued');
  const shown = [...queued, ...accepted].slice(0, 6);
  return (
    <div className="card" style={{ padding: 24, position: 'relative', overflow: 'hidden' }}>
      <CardHead
        eyebrow="The playlist"
        title="On the floor"
        accentColor="var(--sage-deep)"
        right={
          <Link href="/dashboard/music" style={{ fontSize: 12, color: 'var(--peach-ink)', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            Manage in Music <Icon name="arrow-right" size={12} color="var(--peach-ink)" />
          </Link>
        }
      />
      {loading ? (
        <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Loading…</div>
      ) : shown.length === 0 ? (
        <div
          style={{
            padding: 22,
            textAlign: 'center',
            background: 'var(--cream-2)',
            border: '1px dashed var(--line)',
            borderRadius: 12,
          }}
        >
          <div style={{ fontSize: 13, color: 'var(--ink-soft)', maxWidth: 340, margin: '0 auto 12px' }}>
            No song requests yet. Guests add songs from their Passport — they land here and in Music for triage.
          </div>
          <Link href="/dashboard/music" className="btn btn-outline btn-sm">
            <Icon name="music" size={12} /> Open Music
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {queued.length > 0 && (
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
              {queued.length} pending · {accepted.length} accepted
            </div>
          )}
          {shown.map((s) => (
            <div
              key={s.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 10,
                alignItems: 'center',
                padding: '9px 12px',
                background: 'var(--cream-2)',
                border: '1px solid var(--line-soft)',
                borderRadius: 10,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.song_title ?? 'Untitled'}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.artist ? `${s.artist} · ` : ''}from {s.guest_name ?? 'a guest'}
                </div>
              </div>
              <span
                className={s.state === 'accepted' ? 'pill pill-sage' : 'pill pill-peach'}
                style={{ fontSize: 10, padding: '2px 8px', flexShrink: 0 }}
              >
                {s.state === 'accepted' ? 'Accepted' : 'Pending'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type VoiceToastRow = {
  id: string;
  guest_display_name?: string | null;
  audio_url: string;
  duration_seconds?: number | null;
  moderation_status?: string;
  created_at?: string;
};

function useVoiceToasts(siteId?: string | null): { items: VoiceToastRow[]; loading: boolean } {
  const [items, setItems] = useState<VoiceToastRow[]>([]);
  const [loading, setLoading] = useState<boolean>(Boolean(siteId));
  useEffect(() => {
    if (!siteId) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch(`/api/toasts?siteId=${encodeURIComponent(siteId)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.resolve({ toasts: [] })))
      .then((data) => {
        if (cancelled) return;
        const toasts = Array.isArray(data?.toasts) ? (data.toasts as VoiceToastRow[]) : [];
        // A queue, not a feed — oldest first, so the run order matches
        // the order guests recorded. Hidden/rejected stay out of the room.
        const playable = toasts
          .filter((t) => t.audio_url && t.moderation_status !== 'rejected' && t.moderation_status !== 'hidden')
          .sort((a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime());
        setItems(playable);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [siteId]);
  return { items, loading };
}

function fmtDuration(s?: number | null): string {
  if (!s || !Number.isFinite(s) || s <= 0) return '';
  const m = Math.floor(s / 60);
  const ss = Math.round(s % 60).toString().padStart(2, '0');
  return `${m}:${ss}`;
}

function firstName(name?: string | null): string {
  const n = (name ?? '').trim();
  return n ? n.split(/\s+/)[0] : 'A guest';
}

function ToastJukebox({ siteId, occasion }: { siteId?: string | null; occasion?: string | null }) {
  // Playback queue for the voice toasts guests record from their
  // passports (/g/[token] → /api/toasts). One shared <audio>
  // element, one toast at a time — a host or DJ taps through the
  // queue over the speakers.
  const { items, loading } = useVoiceToasts(siteId);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const solemn = occasion === 'memorial' || occasion === 'funeral';
  const heading = solemn ? 'Words from guests' : 'Raise a glass';

  const startToast = (t: VoiceToastRow) => {
    const el = audioRef.current;
    if (!el) return;
    setActiveId(t.id);
    setProgress(0);
    el.src = t.audio_url;
    void el.play();
  };

  const toggleToast = (t: VoiceToastRow) => {
    const el = audioRef.current;
    if (!el) return;
    if (activeId === t.id) {
      if (el.paused) void el.play();
      else el.pause();
      return;
    }
    startToast(t);
  };

  const nextInQueue = (): VoiceToastRow | undefined => {
    const idx = items.findIndex((t) => t.id === activeId);
    return idx >= 0 ? items[idx + 1] : items[0];
  };

  const playNext = () => {
    const next = nextInQueue();
    if (next) startToast(next);
  };

  const replay = () => {
    const el = audioRef.current;
    if (!el || !activeId) return;
    el.currentTime = 0;
    void el.play();
  };

  const handleTimeUpdate = () => {
    const el = audioRef.current;
    if (!el) return;
    // MediaRecorder webm blobs sometimes report Infinity — fall
    // back to the duration the guest's recorder measured.
    const row = items.find((t) => t.id === activeId);
    const dur =
      Number.isFinite(el.duration) && el.duration > 0
        ? el.duration
        : row?.duration_seconds ?? 0;
    setProgress(dur > 0 ? Math.min(1, el.currentTime / dur) : 0);
  };

  const handleEnded = () => {
    // Run the queue — roll straight into the next toast; at the
    // end, rest quietly with the last one ready to replay.
    const idx = items.findIndex((t) => t.id === activeId);
    const next = idx >= 0 ? items[idx + 1] : undefined;
    if (next) startToast(next);
    else setProgress(0);
  };

  const hasNext = activeId !== null && items.findIndex((t) => t.id === activeId) < items.length - 1;

  return (
    <div className="card" style={{ padding: 24 }}>
      <audio
        ref={audioRef}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        style={{ display: 'none' }}
      />
      <CardHead
        eyebrow="Voice toasts"
        title={heading}
        accentColor="var(--peach-ink)"
        right={
          <>
            {items.length > 0 && (
              <span className="pill pill-sage" style={{ fontSize: 11 }}>
                {items.length} recorded
              </span>
            )}
            {activeId && (
              <>
                <button type="button" className="btn btn-outline btn-sm" onClick={replay}>
                  <Icon name="redo" size={12} /> Replay
                </button>
                {hasNext && (
                  <button type="button" className="btn btn-outline btn-sm" onClick={playNext}>
                    Next <Icon name="chev-right" size={12} />
                  </button>
                )}
              </>
            )}
          </>
        }
      />
      {loading ? (
        <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Loading…</div>
      ) : items.length === 0 ? (
        <div
          style={{
            padding: 22,
            textAlign: 'center',
            background: 'var(--cream-2)',
            border: '1px dashed var(--line)',
            borderRadius: 12,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Nothing yet.</div>
          <div style={{ fontSize: 13, color: 'var(--ink-soft)', maxWidth: 340, margin: '0 auto' }}>
            {solemn
              ? 'Words guests record from their passports gather here, ready to play when the room is.'
              : 'Toasts guests record from their passports land here.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((t, i) => {
            const isActive = t.id === activeId;
            const dur = fmtDuration(t.duration_seconds);
            return (
              <button
                type="button"
                key={t.id}
                onClick={() => toggleToast(t)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '28px 1fr auto',
                  gap: 10,
                  alignItems: 'center',
                  padding: '9px 12px',
                  background: isActive ? 'var(--peach-bg)' : 'var(--cream-2)',
                  border: isActive ? '1px solid var(--peach-2)' : '1px solid var(--line-soft)',
                  borderRadius: 10,
                  cursor: 'pointer',
                  textAlign: 'left',
                  font: 'inherit',
                  color: 'inherit',
                  width: '100%',
                }}
              >
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: isActive ? 'var(--peach-2)' : 'var(--cream-3)',
                    display: 'grid',
                    placeItems: 'center',
                    color: 'var(--ink)',
                    flexShrink: 0,
                  }}
                >
                  <Icon name={isActive && isPlaying ? 'pause' : 'play'} size={12} />
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {firstName(t.guest_display_name)}
                  </span>
                  {isActive ? (
                    /* Two-strand progress thread — olive over gold,
                       growing together as the toast plays. */
                    <span aria-hidden style={{ display: 'block', position: 'relative', height: 5, marginTop: 5 }}>
                      <span
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          height: 1,
                          width: `${Math.round(progress * 100)}%`,
                          background: 'var(--pl-olive, #5C6B3F)',
                          transition: 'width .25s linear',
                        }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          left: 0,
                          bottom: 0,
                          height: 1,
                          width: `${Math.round(progress * 100)}%`,
                          background: 'var(--gold, #C19A4B)',
                          transition: 'width .25s linear',
                        }}
                      />
                    </span>
                  ) : (
                    <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-soft)' }}>
                      {[dur, t.created_at ? relativeTime(t.created_at) : ''].filter(Boolean).join(' · ') || 'recorded from their passport'}
                    </span>
                  )}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    color: 'var(--ink-muted)',
                    flexShrink: 0,
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

type CrewVendorRow = {
  id: string;
  name: string;
  category: string;
  phone: string | null;
  arrivalTime: string | null;
  status: 'considering' | 'booked' | 'paid';
};

function useBookedVendors(siteId?: string | null): { items: CrewVendorRow[]; loading: boolean } {
  const [items, setItems] = useState<CrewVendorRow[]>([]);
  const [loading, setLoading] = useState<boolean>(Boolean(siteId));
  useEffect(() => {
    if (!siteId) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch(`/api/vendors/book?siteId=${encodeURIComponent(siteId)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.resolve({ vendors: [] })))
      .then((data) => {
        if (cancelled) return;
        const vendors = Array.isArray(data?.vendors) ? (data.vendors as CrewVendorRow[]) : [];
        // The day-of crew — only vendors actually hired, in the
        // order they arrive (unset call times sink to the end).
        const crew = vendors
          .filter((v) => v.status === 'booked' || v.status === 'paid')
          .sort(
            (a, b) =>
              (parseTimeToMinutes(a.arrivalTime ?? '') ?? 9999) -
              (parseTimeToMinutes(b.arrivalTime ?? '') ?? 9999),
          );
        setItems(crew);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [siteId]);
  return { items, loading };
}

// Crew initials tints — cycled per row, matching the zip call sheet.
const CREW_TINTS = ['var(--sage-deep)', 'var(--lavender-ink)', 'var(--peach-ink)', '#8A6A2E'] as const;

function WhoToCall({ siteId }: { siteId?: string | null }) {
  // The day-of call sheet, host side — every booked vendor with
  // their call time and a tap-to-dial number. Fed by the Vendor
  // Book (/dashboard/vendors → /api/vendors/book).
  const { items, loading } = useBookedVendors(siteId);

  return (
    <div className="card" style={{ padding: 22 }}>
      <CardHead
        eyebrow="Call sheet"
        title="Who to call"
        size={20}
        margin="8px 0 4px"
        right={
          items.length > 0 ? (
            <span className="pill pill-sage" style={{ fontSize: 11 }}>
              {items.length} on the day
            </span>
          ) : undefined
        }
      />
      {loading ? (
        <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 8 }}>Loading…</div>
      ) : items.length === 0 ? (
        <div
          style={{
            marginTop: 10,
            padding: 18,
            textAlign: 'center',
            background: 'var(--cream-2)',
            border: '1px dashed var(--line)',
            borderRadius: 12,
          }}
        >
          <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 5 }}>Nothing yet.</div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
            Vendors you book land here with their call times.
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 6 }}>
          {items.map((v, i) => {
            const arrival = v.arrivalTime ? `Arrives ${v.arrivalTime}` : 'Call time TBD';
            const tint = CREW_TINTS[i % CREW_TINTS.length];
            return (
              <div
                key={v.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 0',
                  borderTop: i ? '1px solid var(--line-soft)' : 'none',
                }}
              >
                <span
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 999,
                    flexShrink: 0,
                    display: 'grid',
                    placeItems: 'center',
                    background: 'var(--cream-3)',
                    border: '1px solid var(--line-soft)',
                    color: tint,
                    fontFamily: DISPLAY,
                    fontStyle: 'italic',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {initials(v.name)}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {v.name}
                  </span>
                  <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {v.category} · {arrival}
                  </span>
                </span>
                {v.phone ? (
                  <a
                    href={`tel:${v.phone.replace(/[^\d+]/g, '')}`}
                    title={`Call ${v.name}`}
                    aria-label={`Call ${v.name}`}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      flexShrink: 0,
                      border: '1px solid var(--line)',
                      background: 'var(--card)',
                      color: 'var(--ink-soft)',
                      display: 'grid',
                      placeItems: 'center',
                      textDecoration: 'none',
                    }}
                  >
                    <Icon name="phone" size={14} />
                  </a>
                ) : (
                  <span style={{ fontSize: 10.5, color: 'var(--ink-muted)', flexShrink: 0 }}>no number</span>
                )}
              </div>
            );
          })}
        </div>
      )}
      <div style={{ marginTop: 14, fontSize: 12.5 }}>
        <Link href="/dashboard/vendors" style={{ color: 'var(--peach-ink, #C6703D)', fontWeight: 600, textDecoration: 'none' }}>
          Open the vendor book →
        </Link>
      </div>
    </div>
  );
}

/* Point person — the zip's lavender call-out. Guests reach a named
   day-of contact (the planner / MOH / a parent), never the host
   mid-ceremony. Reads manifest.dayOfContact; renders nothing until a
   real contact exists (the host's account email is never a fallback). */
function PointPerson({ manifest }: { manifest: unknown }) {
  const doc = (manifest as { dayOfContact?: { name?: string; phone?: string } } | null | undefined)?.dayOfContact;
  const name = doc?.name?.trim();
  if (!name) return null;
  const phone = doc?.phone?.trim();
  return (
    <div className="card" style={{ padding: 22, background: 'var(--lavender-bg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <PearloomGlyph size={18} color="var(--lavender-ink)" />
        <CardEyebrow color="var(--lavender-ink)">Point person</CardEyebrow>
      </div>
      <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.5 }}>
        Guests reach <strong>{name}</strong> today, not you — so you&rsquo;re present for the day itself.
      </div>
      {phone ? (
        <a
          href={`tel:${phone.replace(/[^\d+]/g, '')}`}
          className="btn btn-outline btn-sm"
          style={{ marginTop: 12, textDecoration: 'none' }}
        >
          <Icon name="phone" size={12} /> Call {name}
        </a>
      ) : null}
    </div>
  );
}

/* Seating at a glance — closes the seating loop. The arranger
   (/dashboard/seating → PATCH /api/sites/seating) writes
   manifest.seatingPlan; until this card nothing ever read it
   back. On the day the host wants "how full is the room" without
   reopening the arranger. Renders nothing until a plan exists —
   the Seating tab in the Day sub-nav is the front door. */
function SeatingGlance({ manifest }: { manifest: unknown }) {
  const plan = (manifest as { seatingPlan?: StoryManifest['seatingPlan'] } | null | undefined)?.seatingPlan;
  const tables = (plan?.tables ?? []).filter((t) => t && t.id);

  const seatedPerTable = useMemo(() => {
    const m = new Map<string, number>();
    for (const tableId of Object.values(plan?.assignments ?? {})) {
      m.set(tableId, (m.get(tableId) ?? 0) + 1);
    }
    return m;
  }, [plan?.assignments]);

  if (tables.length === 0) return null;

  const capacity = tables.reduce((a, t) => a + (Number.isFinite(t.capacity) ? t.capacity : 0), 0);
  const seated = tables.reduce((a, t) => a + (seatedPerTable.get(t.id) ?? 0), 0);
  const SHOWN = 8;
  const shown = tables.slice(0, SHOWN);

  return (
    <div className="card" style={{ padding: 24 }}>
      <CardHead
        eyebrow="Seating"
        title="Seating at a glance"
        size={20}
        margin="8px 0 4px"
        right={
          <Link href="/dashboard/seating" style={{ fontSize: 12, color: 'var(--peach-ink)', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            Open the chart <Icon name="arrow-right" size={12} color="var(--peach-ink)" />
          </Link>
        }
      />
      <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', margin: '4px 0 14px' }}>
        {tables.length} table{tables.length === 1 ? '' : 's'} · {seated} of {capacity} seats spoken for
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
        {shown.map((t) => {
          const n = seatedPerTable.get(t.id) ?? 0;
          const full = t.capacity > 0 && n >= t.capacity;
          return (
            <div
              key={t.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                gap: 8,
                padding: '8px 12px',
                background: 'var(--cream-2)',
                border: '1px solid var(--line-soft)',
                borderRadius: 10,
                minWidth: 0,
              }}
            >
              <span style={{ fontSize: 12.5, fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {t.name || 'Table'}
              </span>
              <span style={{ fontSize: 11.5, color: full ? 'var(--sage-deep)' : 'var(--ink-soft)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                {n}/{t.capacity}
              </span>
            </div>
          );
        })}
      </div>
      {tables.length > SHOWN && (
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--ink-muted)' }}>
          + {tables.length - SHOWN} more table{tables.length - SHOWN === 1 ? '' : 's'} in the chart
        </div>
      )}
    </div>
  );
}

/* Print for the day — contextual doors to the two print-at-home
   sheets (welcome-table QR poster, per-guest passport cards).
   They live off-nav (⌘K / More tools) by design; the day-of room
   is where a host actually thinks "what goes on the tables". */
function PaperForTheDay({ occasion }: { occasion: string | null }) {
  const qr = isDashSurfaceApplicable('qr', occasion);
  const passport = isDashSurfaceApplicable('passport', occasion);
  if (!qr && !passport) return null;
  return (
    <div className="card" style={{ padding: '16px 24px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
      <span
        style={{
          fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'var(--ink-muted)',
        }}
      >
        Print for the day
      </span>
      {qr && (
        <Link href="/dashboard/qr-poster" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>
          Welcome-table poster →
        </Link>
      )}
      {passport && (
        <Link href="/dashboard/passport-cards" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>
          Guest passport cards →
        </Link>
      )}
    </div>
  );
}

/* Quiet section label that gives the two columns a clear identity
   ("Run the day" vs "The live room") so the page reads as two
   intents instead of a flat stack of cards. */
function DayOfBand({ label }: { label: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: 'var(--ink-muted)',
        margin: '2px 2px -4px',
      }}
    >
      <span aria-hidden style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--gold, #C19A4B)' }} />
      {label}
    </div>
  );
}

export function DayOfV8() {
  const { site } = useSelectedSite();
  const stats = useDashStats(site?.id, site?.domain);
  const siteName = site ? siteDisplayName(site) : 'Your celebration';
  const occasion = site?.occasion ?? null;
  const [shared, setShared] = useState(false);

  // Whole days until the event (0 = today, negative = past,
  // null = no date set). Drives the headline + the pulse strip so
  // the room never claims "it's happening" weeks early.
  const daysUntil = (() => {
    const d = parseLocalDate(site?.eventDate);
    if (!d) return null;
    const a = new Date();
    a.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return Math.round((d.getTime() - a.getTime()) / 86_400_000);
  })();

  // "Share with crew" — hands the live site link to vendors and the
  // wedding party. Native share sheet where it exists, clipboard
  // fallback with inline confirmation.
  const shareWithCrew = async () => {
    if (!site?.domain) return;
    const url = buildSiteUrl(site.domain, '', undefined, site.occasion);
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: siteName, url });
        return;
      }
    } catch {
      // user dismissed the sheet — fall through to nothing
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 2200);
    } catch {
      /* clipboard unavailable — leave the button as-is */
    }
  };

  // Pull events from the selected site's manifest (shaped by /api/sites).
  const events = (() => {
    const m = (site?.manifest ?? null) as { events?: Array<{ time?: string; name?: string; description?: string }> } | null;
    if (!m?.events || !Array.isArray(m.events)) return [] as TimelineItem[];
    const sorted = [...m.events].sort((a, b) => {
      const ta = parseTimeToMinutes(a.time ?? '') ?? 9999;
      const tb = parseTimeToMinutes(b.time ?? '') ?? 9999;
      return ta - tb;
    });
    const mapped: TimelineItem[] = sorted.map((e) => ({
      time: e.time ?? '—',
      title: e.name ?? 'Untitled',
      d: e.description ?? undefined,
      status: 'later' as const,
    }));
    const statuses = deriveStatuses(mapped);
    return mapped.map((it, i) => ({ ...it, status: statuses[i] }));
  })();

  const headline =
    occasion === 'memorial' || occasion === 'funeral'
      ? { a: 'A gathered', b: 'day.' }
      : occasion === 'bachelor-party' || occasion === 'bachelorette-party'
        ? { a: 'The', b: 'weekend.' }
        : occasion === 'reunion'
          ? { a: 'Everyone', b: 'together.' }
          : daysUntil !== null && daysUntil > 0
            ? { a: 'The day is', b: 'coming.' }
            : daysUntil !== null && daysUntil < 0
              ? { a: 'What a', b: 'day.' }
              : { a: "Today's the", b: 'day.' };

  // Hero support — a short date for the gold eyebrow ("· SEP 6") and
  // the current/next run-of-show lines for the "Right now:" copy.
  const heroDateLabel = (() => {
    const d = parseLocalDate(site?.eventDate);
    return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null;
  })();
  const nowIdx = events.findIndex((e) => e.status === 'now');
  const nowLabel = nowIdx >= 0 ? events[nowIdx].title : null;
  const nextLabel = nowIdx >= 0 && events[nowIdx + 1] ? events[nowIdx + 1].title : null;

  return (
    <DashLayout active="timeline" hideTopbar>
      {/* Botanical underlay — olive sprigs at low opacity. Matches the
          prototype's atmosphere layer; the DashLayout's sidebar already
          owns the cream + nav chrome. */}
      <PLAtmosphere />
      <div
        className="pl8-dayof-wrap"
        style={{ padding: '24px clamp(20px, 4vw, 40px) 60px', maxWidth: 1240, margin: '0 auto', position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 18 }}
      >
        {/* Quiet header (DASHBOARD-LAYOUT-PLAN rule 1): mono eyebrow +
            ONE display line + the two actions in a row. */}
        <PageIntro
          eyebrow={`${siteName} · Day-of room`}
          title={
            <>
              {headline.a} <span className="display-italic">{headline.b}</span>
            </>
          }
          actions={
            <>
              <button
                className="btn btn-outline btn-sm"
                onClick={shareWithCrew}
                disabled={!site?.domain}
                style={!site?.domain ? { opacity: 0.5, cursor: 'default' } : undefined}
              >
                <Icon name={shared ? 'check' : 'share'} size={13} /> {shared ? 'Link copied' : 'Share with crew'}
              </button>
              <Link
                href={site ? buildSitePath(site.domain, '', site.occasion) : '/'}
                className="btn btn-primary btn-sm"
              >
                <Icon name="eye" size={13} /> View the site
              </Link>
            </>
          }
          style={{ marginBottom: 0 }}
        />

        {/* The room-is-live hero — real pulse data, the current hour. */}
        <DayOfHero
          rsvps={stats.rsvps}
          visits={stats.visits}
          today={stats.today}
          registryClicks={stats.registryClicks}
          totalGuests={stats.invited}
          daysUntil={daysUntil}
          dateLabel={heroDateLabel}
          headline={headline}
          nowLabel={nowLabel}
          nextLabel={nextLabel}
        />

        {/* Run the day — the run of show anchors the page; the call
            sheet + point person ride a sticky rail (zip DayOf shape). */}
        <div className="pl8-dayof-primary" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 18, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
            <MomentTimeline items={events} siteDomain={site?.domain} occasion={occasion} />
            {site?.domain && <BroadcastComposer subdomain={site.domain} />}
            {/* Seating loop-closer — reads what /dashboard/seating
                saved; occasion gate mirrors the Seating tab's. */}
            {isDashSurfaceApplicable('seating', occasion) && (
              <SeatingGlance manifest={site?.manifest} />
            )}
            <LiveReel siteDomain={site?.domain} siteId={site?.id} occasion={occasion} />
          </div>
          <div className="pl8-dayof-rail" style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 20, minWidth: 0 }}>
            <WhoToCall siteId={site?.id} />
            <PointPerson manifest={site?.manifest} />
          </div>
        </div>

        {/* The live room — what guests are doing right now. */}
        <div>
          <DayOfBand label="The live room" />
          <div className="pl8-dayof-live" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18, marginTop: 14, alignItems: 'start' }}>
            <AttendanceCard siteId={site?.id} occasion={occasion} siteDomain={site?.domain} />
            {/* Song queue only where music fits the occasion — the
                registry gate hides it for memorials and the like. */}
            {isDashSurfaceApplicable('music', occasion) && <SongQueue siteId={site?.id} />}
            <ToastJukebox siteId={site?.id} occasion={occasion} />
            <GuestWall siteId={site?.id} siteDomain={site?.domain} occasion={occasion} />
          </div>
        </div>

        <PaperForTheDay occasion={occasion} />
      </div>
      {/* Collapse the hero + primary grids on narrow widths; the sticky
          rail becomes a normal stacked block. */}
      <style jsx global>{`
        @media (max-width: 900px) {
          .pl8-dayof-hero-grid { grid-template-columns: 1fr !important; }
          .pl8-dayof-primary { grid-template-columns: 1fr !important; }
          .pl8-dayof-rail { position: static !important; }
        }
        @media (max-width: 460px) {
          .pl8-dayof-hero-stats { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </DashLayout>
  );
}
