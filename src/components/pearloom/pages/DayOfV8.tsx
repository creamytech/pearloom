'use client';

/* ========================================================================
   PEARLOOM — DAY-OF ROOM (v8 handoff port)
   ======================================================================== */

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Icon, Pear, PhotoPlaceholder, Squiggle } from '../motifs';
import { DashLayout } from '../dash/DashShell';
import { useSelectedSite, siteDisplayName } from '@/components/marketing/design/dash/hooks';
import { useDashStats } from '@/components/marketing/v2/useDashStats';

function useLiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function PulseBar({
  rsvps,
  visits,
  today,
  registryClicks,
  totalGuests,
}: {
  rsvps: number;
  visits: number;
  today: number;
  registryClicks: number;
  totalGuests: number | null;
}) {
  const now = useLiveClock();
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const metrics = [
    {
      k: 'RSVPs in',
      v: String(rsvps),
      of: totalGuests && totalGuests > 0 ? String(totalGuests) : undefined,
      tone: 'peach',
      icon: 'check',
      trend: rsvps === 0 ? 'Waiting on first reply' : `${rsvps} guest${rsvps === 1 ? '' : 's'} responded`,
    },
    {
      k: 'Visits today',
      v: String(today),
      tone: 'sage',
      icon: 'eye',
      trend: visits === 0 ? 'Nothing yet' : `${visits} total`,
    },
    {
      k: 'Site visits',
      v: String(visits),
      tone: 'lavender',
      icon: 'image',
      trend: visits === 0 ? 'Share your link' : 'All-time',
    },
    {
      k: 'Registry clicks',
      v: String(registryClicks),
      tone: 'cream',
      icon: 'gift',
      trend: registryClicks === 0 ? '—' : 'via your site',
    },
  ] as const;
  return (
    <div
      className="pl8-dayof-pulse"
      style={{
        background: 'var(--ink)',
        color: 'var(--cream)',
        padding: '20px 32px',
        borderRadius: 24,
        marginBottom: 24,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', top: -60, right: -40, opacity: 0.08 }}>
        <Pear size={200} tone="cream" />
      </div>
      <div
        className="pl8-pulse-layout"
        style={{ position: 'relative' }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div
              className="pulse-dot"
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#B8D66A',
                boxShadow: '0 0 0 4px rgba(184,214,106,0.3)',
              }}
            />
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                opacity: 0.7,
              }}
            >
              Live · {dateStr}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <div className="display" style={{ fontSize: 56, color: 'var(--cream)', lineHeight: 1 }}>
              {timeStr}
            </div>
            <div className="display-italic" style={{ fontSize: 20, color: 'var(--peach-2)' }}>
              it&apos;s happening
            </div>
          </div>
        </div>
        <div className="pl8-pulse-metrics">
          {metrics.map((m) => (
            <div key={m.k}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background:
                      m.tone === 'sage'
                        ? 'var(--sage-2)'
                        : m.tone === 'peach'
                          ? 'var(--peach-2)'
                          : m.tone === 'lavender'
                            ? 'var(--lavender-2)'
                            : 'var(--cream-2)',
                    color: 'var(--ink)',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <Icon name={m.icon} size={14} />
                </div>
                <span style={{ fontSize: 11, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {m.k}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span className="display" style={{ fontSize: 30, color: 'var(--cream)' }}>
                  {m.v}
                </span>
                {'of' in m && m.of && <span style={{ fontSize: 13, opacity: 0.5 }}>/ {m.of}</span>}
              </div>
              <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>{m.trend}</div>
            </div>
          ))}
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
  const editHref = siteDomain ? `/editor?site=${encodeURIComponent(siteDomain)}` : '/editor';

  if (items.length === 0) {
    return (
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="clock" size={18} color="var(--gold)" />
            <h3 className="display" style={{ fontSize: 24, margin: 0 }}>
              {heading}
            </h3>
          </div>
        </div>
        <div
          style={{
            padding: 24,
            textAlign: 'center',
            background: 'var(--cream-2)',
            border: '1px dashed var(--line)',
            borderRadius: 14,
          }}
        >
          <div style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 6 }}>No schedule yet.</div>
          <div style={{ fontSize: 13, color: 'var(--ink-soft)', maxWidth: 360, margin: '0 auto 14px' }}>
            Add events in the editor — Pearloom will show them here, in order, on the day.
          </div>
          <Link href={editHref} className="btn btn-outline btn-sm">
            <Icon name="brush" size={12} /> Add events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="clock" size={18} color="var(--gold)" />
          <h3 className="display" style={{ fontSize: 24, margin: 0 }}>
            {heading}
          </h3>
        </div>
        <Link href={editHref} className="btn btn-outline btn-sm">
          <Icon name="brush" size={12} /> Nudge timeline
        </Link>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((m, i) => {
          const isNow = m.status === 'now';
          const isDone = m.status === 'done';
          return (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '48px 60px 1fr auto',
                gap: 14,
                alignItems: 'center',
                padding: '10px 8px',
                borderRadius: 12,
                background: isNow ? 'var(--peach-bg)' : 'transparent',
                border: isNow ? '1px solid var(--peach-2)' : '1px solid transparent',
              }}
            >
              <div style={{ display: 'grid', placeItems: 'center' }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: isNow ? 'var(--peach-2)' : isDone ? 'var(--sage-2)' : '#fff',
                    border: isDone || isNow ? 'none' : '2px solid var(--line)',
                    display: 'grid',
                    placeItems: 'center',
                    color: isDone || isNow ? 'var(--ink)' : 'var(--ink-muted)',
                    boxShadow: isNow ? '0 0 0 6px rgba(234,178,134,0.28)' : 'none',
                  }}
                >
                  {isDone ? (
                    <Icon name="check" size={14} />
                  ) : isNow ? (
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ink)' }} />
                  ) : null}
                </div>
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 18,
                  fontWeight: 600,
                  color: isDone ? 'var(--ink-muted)' : 'var(--ink)',
                }}
              >
                {m.time}
              </div>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 600, color: isDone ? 'var(--ink-soft)' : 'var(--ink)' }}>
                  {m.title}
                </div>
                {'d' in m && m.d && <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 2 }}>{m.d}</div>}
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-muted)',
                }}
              >
                {isNow && <span style={{ color: 'var(--peach-ink)' }}>Happening now</span>}
                {m.status === 'next' && 'Up next'}
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

function LiveReel({ siteDomain, siteId, occasion }: { siteDomain?: string | null; siteId?: string | null; occasion?: string | null }) {
  const { items, loading } = useGuestPhotos(siteId);
  const editHref = siteDomain ? `/editor?site=${encodeURIComponent(siteDomain)}` : '/editor';
  const heading = occasion === 'memorial' || occasion === 'funeral' ? 'What guests shared' : 'The live reel';
  return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="image" size={18} color="var(--gold)" />
          <h3 className="display" style={{ fontSize: 24, margin: 0 }}>
            {heading}
          </h3>
          {items.length > 0 && (
            <span className="pill pill-sage" style={{ fontSize: 11 }}>
              {items.length} shared
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <Link href="/dashboard/submissions" className="btn btn-outline btn-sm">
            <Icon name="eye" size={12} /> Moderate
          </Link>
          <Link href="/dashboard/gallery" className="btn btn-outline btn-sm">See all</Link>
        </div>
      </div>
      {loading ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-soft)', fontSize: 13 }}>Threading…</div>
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
          <Link href={editHref} className="btn btn-outline btn-sm">
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

function RequestsCard({ siteDomain, occasion }: { siteDomain?: string | null; occasion?: string | null }) {
  const editHref = siteDomain ? `/editor?site=${encodeURIComponent(siteDomain)}` : '/editor';
  // Nothing real here yet — vendor / crew messaging isn't wired. Show
  // an honest empty state so the page doesn't lie about its state.
  const copy =
    occasion === 'memorial' || occasion === 'funeral'
      ? { title: 'Coordinator notes', body: 'Heads-up from the funeral director, celebrant, or venue will land here.' }
      : occasion === 'bachelor-party' || occasion === 'bachelorette-party'
        ? { title: 'Crew check-ins', body: 'Reservation confirmations and activity check-ins from the group.' }
        : { title: 'Needs your nod', body: 'Vendor check-ins — DJ, catering, photographer — land here as they come.' };
  return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Icon name="bell" size={18} color="var(--gold)" />
        <h3 className="display" style={{ fontSize: 24, margin: 0 }}>
          {copy.title}
        </h3>
      </div>
      <div
        style={{
          padding: 22,
          textAlign: 'center',
          background: 'var(--cream-2)',
          border: '1px dashed var(--line)',
          borderRadius: 12,
        }}
      >
        <div style={{ fontSize: 13, color: 'var(--ink-soft)', maxWidth: 360, margin: '0 auto 12px' }}>
          {copy.body} Nothing right now.
        </div>
        <Link href={editHref} className="btn btn-outline btn-sm">
          <Icon name="brush" size={12} /> Add vendors
        </Link>
      </div>
    </div>
  );
}

type GuestRow = { status?: string; attending?: boolean | null };

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
  const editHref = siteDomain ? `/editor?site=${encodeURIComponent(siteDomain)}` : '/editor';
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

  return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="users" size={18} color="var(--gold)" />
          <h3 className="display" style={{ fontSize: 24, margin: 0 }}>
            {heading}
          </h3>
        </div>
        <Link href="/dashboard/rsvp" style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
          Open list →
        </Link>
      </div>
      {loading ? (
        <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Threading…</div>
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
          <Link href={editHref} className="btn btn-outline btn-sm">
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
  const editHref = siteDomain ? `/editor?site=${encodeURIComponent(siteDomain)}` : '/editor';
  const heading =
    occasion === 'memorial' || occasion === 'funeral'
      ? 'Notes of memory'
      : occasion === 'retirement'
        ? 'Notes from colleagues'
        : 'Notes from the crowd';
  return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="mail" size={18} color="var(--gold)" />
          <h3 className="display" style={{ fontSize: 24, margin: 0 }}>
            {heading}
          </h3>
        </div>
        <Link href="/dashboard/submissions" className="btn btn-outline btn-sm">
          <Icon name="eye" size={12} /> Moderate
        </Link>
      </div>
      {loading ? (
        <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Threading…</div>
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
          <Link href={editHref} className="btn btn-outline btn-sm">
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

function SongQueue({ siteDomain }: { siteDomain?: string | null }) {
  // Song requests aren't wired to an API yet. Rather than lie with
  // fake data, invite the user to connect Spotify in the editor.
  const editHref = siteDomain ? `/editor?site=${encodeURIComponent(siteDomain)}` : '/editor';
  return (
    <div className="card" style={{ padding: 24, position: 'relative', overflow: 'hidden' }}>
      <Squiggle variant={2} width={180} style={{ position: 'absolute', top: 20, right: 20, opacity: 0.3 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, position: 'relative' }}>
        <Icon name="music" size={18} color="var(--gold)" />
        <h3 className="display" style={{ fontSize: 24, margin: 0 }}>
          On the floor
        </h3>
      </div>
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
          Connect a Spotify playlist in the editor. Guest song requests — from the RSVP form — will queue up here.
        </div>
        <Link href={editHref} className="btn btn-outline btn-sm">
          <Icon name="brush" size={12} /> Set up playlist
        </Link>
      </div>
    </div>
  );
}

export function DayOfV8() {
  const { site } = useSelectedSite();
  const stats = useDashStats(site?.id);
  const siteName = site ? siteDisplayName(site) : 'Your celebration';
  const occasion = site?.occasion ?? null;

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
          : { a: "Today's the", b: 'day.' };

  return (
    <DashLayout active="timeline" hideTopbar>
      <div className="pl8-dayof-wrap" style={{ padding: 32 }}>
        <div className="pl8-dayof-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: 'var(--peach-ink)',
                textTransform: 'uppercase',
                marginBottom: 6,
              }}
            >
              {siteName} · Day-of room
            </div>
            <h1 className="display" style={{ fontSize: 42, margin: 0 }}>
              {headline.a} <span className="display-italic">{headline.b}</span>
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline btn-sm">
              <Icon name="share" size={13} /> Share with crew
            </button>
            <Link href={site ? `/sites/${site.domain}` : '/'} className="btn btn-primary btn-sm">
              <Icon name="eye" size={13} /> View the site
            </Link>
          </div>
        </div>

        <PulseBar
          rsvps={stats.rsvps}
          visits={stats.visits}
          today={stats.today}
          registryClicks={stats.registryClicks}
          totalGuests={null}
        />

        <div className="pl8-dayof-main" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 22 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <MomentTimeline items={events} siteDomain={site?.domain} occasion={occasion} />
            <LiveReel siteDomain={site?.domain} siteId={site?.id} occasion={occasion} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <RequestsCard siteDomain={site?.domain} occasion={occasion} />
            <AttendanceCard siteId={site?.id} occasion={occasion} siteDomain={site?.domain} />
            {/* Song queue is wedding / birthday / bachelor-ish only — hide for solemn occasions */}
            {occasion !== 'memorial' && occasion !== 'funeral' && <SongQueue siteDomain={site?.domain} />}
            <GuestWall siteId={site?.id} siteDomain={site?.domain} occasion={occasion} />
          </div>
        </div>
      </div>
    </DashLayout>
  );
}
