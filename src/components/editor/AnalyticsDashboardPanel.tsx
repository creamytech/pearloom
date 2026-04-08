'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/AnalyticsDashboardPanel.tsx
// Enhanced analytics dashboard with views chart, RSVP ring,
// section rankings, activity feed, and share stats.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState, useMemo } from 'react';
import { SidebarSection } from './EditorSidebar';
import {
  BarChart2, Smartphone, Monitor, Users, TrendingUp,
  RefreshCw, Layers, Share2, Clock, Eye,
  UserCheck, UserX, UserMinus, MessageSquare, MapPin,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────

interface VisitStats {
  visits: number;
  today: number;
  mobile: number;
  desktop: number;
}

interface RsvpStats {
  attending: number;
  confirmed?: number;
  declined: number;
  pending: number;
  total: number;
}

interface SectionStat {
  sectionId: string;
  views: number;
  avgDurationMs: number;
}

interface DailyView {
  date: string;   // YYYY-MM-DD
  label: string;  // "Mon", "Apr 2", etc.
  count: number;
}

interface ActivityEvent {
  id: string;
  type: 'rsvp_attending' | 'rsvp_declined' | 'guestbook' | 'page_view';
  message: string;
  timestamp: string; // ISO
}

interface ShareStats {
  linkCopied: number;
  socialShares: number;
  totalShares: number;
}

// ── Glass card wrapper ───────────────────────────────────────

function GlassCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      padding: '14px 14px',
      borderRadius: '16px',
      background: 'rgba(255,255,255,0.045)',
      backdropFilter: 'blur(24px) saturate(1.5)',
      WebkitBackdropFilter: 'blur(24px) saturate(1.5)',
      border: '1px solid rgba(255,255,255,0.08)',
      ...style,
    }}>
      {children}
    </div>
  );
}

// ── Stat card ────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  const c = color || '#A3B18A';
  return (
    <div style={{
      padding: '10px 12px', borderRadius: '10px',
      background: `${c}0d`, border: `1px solid ${c}22`,
      display: 'flex', alignItems: 'center', gap: '10px',
    }}>
      <div style={{
        width: '32px', height: '32px', borderRadius: '8px',
        background: `${c}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={15} color={c} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '0.68rem', color: 'var(--pl-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>{label}</div>
        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>{value}</div>
        {sub && <div style={{ fontSize: '0.65rem', color: 'var(--pl-muted)', marginTop: '1px' }}>{sub}</div>}
      </div>
    </div>
  );
}

// ── Progress bar ─────────────────────────────────────────────

function ProgressBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ fontSize: '0.7rem', color: 'var(--pl-ink-soft)', width: '64px', flexShrink: 0 }}>{label}</div>
      <div style={{ flex: 1, height: '5px', borderRadius: '3px', background: 'rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`, borderRadius: '3px',
          background: color, transition: 'width 0.6s ease',
        }} />
      </div>
      <div style={{ fontSize: '0.7rem', color: 'var(--pl-ink-soft)', width: '30px', textAlign: 'right' }}>{value}</div>
    </div>
  );
}

// ── RSVP Progress Ring (SVG) ─────────────────────────────────

function RsvpRing({ attending, declined, pending, total }: RsvpStats) {
  const size = 120;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const attendPct = total > 0 ? attending / total : 0;
  const declinePct = total > 0 ? declined / total : 0;
  // pending fills the remainder

  const attendLen = circumference * attendPct;
  const declineLen = circumference * declinePct;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {/* Background track */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeWidth}
          />
          {/* Pending arc (underneath) */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke="#D6C6A8"
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={0}
            strokeLinecap="round"
            opacity={0.3}
          />
          {/* Declined arc */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke="#f87171"
            strokeWidth={strokeWidth}
            strokeDasharray={`${attendLen + declineLen} ${circumference - attendLen - declineLen}`}
            strokeDashoffset={0}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.8s ease' }}
          />
          {/* Attending arc (on top) */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke="var(--pl-olive, #A3B18A)"
            strokeWidth={strokeWidth}
            strokeDasharray={`${attendLen} ${circumference - attendLen}`}
            strokeDashoffset={0}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.8s ease' }}
          />
        </svg>
        {/* Center text */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>
            {total > 0 ? Math.round((attending / total) * 100) : 0}%
          </div>
          <div style={{ fontSize: '0.58rem', color: 'var(--pl-muted)', marginTop: '2px' }}>
            responded
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
        <RsvpLegendItem icon={UserCheck} color="var(--pl-olive, #A3B18A)" label="Attending" count={attending} />
        <RsvpLegendItem icon={UserX} color="#f87171" label="Declined" count={declined} />
        <RsvpLegendItem icon={UserMinus} color="#D6C6A8" label="Pending" count={pending} />
        <div style={{
          marginTop: '4px', paddingTop: '6px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          fontSize: '0.65rem', color: 'var(--pl-muted)',
        }}>
          {total} total invited
        </div>
      </div>
    </div>
  );
}

function RsvpLegendItem({ icon: Icon, color, label, count }: {
  icon: React.ElementType; color: string; label: string; count: number;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{
        width: '8px', height: '8px', borderRadius: '50%',
        background: color, flexShrink: 0,
      }} />
      <Icon size={11} color={color} style={{ flexShrink: 0 }} />
      <span style={{ fontSize: '0.7rem', color: 'var(--pl-ink-soft)', flex: 1 }}>{label}</span>
      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff' }}>{count}</span>
    </div>
  );
}

// ── Views Over Time Bar Chart ────────────────────────────────

function ViewsBarChart({ dailyViews }: { dailyViews: DailyView[] }) {
  const maxCount = Math.max(...dailyViews.map(d => d.count), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {/* Bar area */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: '3px',
        height: '90px', padding: '0 2px',
      }}>
        {dailyViews.map((day, i) => {
          const heightPct = Math.max((day.count / maxCount) * 100, 2);
          const isToday = i === dailyViews.length - 1;
          return (
            <div
              key={day.date}
              title={`${day.date}: ${day.count} views`}
              style={{
                flex: 1,
                height: `${heightPct}%`,
                borderRadius: '4px 4px 1px 1px',
                background: isToday
                  ? 'var(--pl-olive, #A3B18A)'
                  : 'rgba(163,177,138,0.35)',
                transition: 'height 0.6s ease, background 0.3s ease',
                cursor: 'default',
                position: 'relative',
                minHeight: '2px',
              }}
            />
          );
        })}
      </div>
      {/* X-axis labels */}
      <div style={{ display: 'flex', gap: '3px', padding: '0 2px' }}>
        {dailyViews.map((day, i) => (
          <div key={day.date} style={{
            flex: 1,
            fontSize: '0.52rem',
            color: i === dailyViews.length - 1 ? 'var(--pl-olive, #A3B18A)' : 'var(--pl-muted)',
            textAlign: 'center',
            fontWeight: i === dailyViews.length - 1 ? 700 : 400,
          }}>
            {i % 2 === 0 || i === dailyViews.length - 1 ? day.label : ''}
          </div>
        ))}
      </div>
      {/* Summary line */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: '0.62rem', color: 'var(--pl-muted)', marginTop: '2px',
      }}>
        <span>Last 14 days</span>
        <span style={{ color: '#fff', fontWeight: 700 }}>
          {dailyViews.reduce((s, d) => s + d.count, 0).toLocaleString()} total
        </span>
      </div>
    </div>
  );
}

// ── Most Viewed Sections ─────────────────────────────────────

function TopSectionsList({ sections }: { sections: SectionStat[] }) {
  const top5 = sections.slice(0, 5);
  const maxViews = top5[0]?.views || 1;

  const sectionLabels: Record<string, string> = {
    hero: 'Hero',
    story: 'Our Story',
    events: 'Events',
    rsvp: 'RSVP',
    registry: 'Registry',
    gallery: 'Gallery',
    'wedding-party': 'Wedding Party',
    travel: 'Travel',
    faq: 'FAQ',
  };

  const rankColors = ['var(--pl-olive, #A3B18A)', '#C4A96A', '#D6C6A8', 'rgba(163,177,138,0.5)', 'rgba(163,177,138,0.3)'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {top5.map((sec, i) => {
        const pct = Math.round((sec.views / maxViews) * 100);
        const label = sectionLabels[sec.sectionId]
          || sec.sectionId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const barColor = rankColors[i] || rankColors[rankColors.length - 1];

        return (
          <div key={sec.sectionId} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Rank badge */}
              <div style={{
                width: '18px', height: '18px', borderRadius: '6px',
                background: i === 0 ? 'rgba(163,177,138,0.18)' : 'rgba(255,255,255,0.04)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.6rem', fontWeight: 800,
                color: i === 0 ? 'var(--pl-olive, #A3B18A)' : 'var(--pl-muted)',
                flexShrink: 0,
              }}>
                {i + 1}
              </div>
              <span style={{
                flex: 1, fontSize: '0.72rem', color: '#fff',
                fontWeight: i === 0 ? 700 : 500,
              }}>
                {label}
              </span>
              <span style={{
                fontSize: '0.68rem', fontWeight: 700,
                color: i === 0 ? 'var(--pl-olive, #A3B18A)' : 'var(--pl-muted)',
              }}>
                {sec.views.toLocaleString()}
              </span>
            </div>
            {/* Bar indicator */}
            <div style={{
              height: '4px', borderRadius: '2px',
              background: 'rgba(0,0,0,0.05)', overflow: 'hidden',
              marginLeft: '26px',
            }}>
              <div style={{
                height: '100%', width: `${pct}%`, borderRadius: '2px',
                background: barColor,
                transition: 'width 0.6s ease',
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Recent Activity Feed ─────────────────────────────────────

function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  const getIcon = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'rsvp_attending': return { Icon: UserCheck, color: 'var(--pl-olive, #A3B18A)' };
      case 'rsvp_declined': return { Icon: UserX, color: '#f87171' };
      case 'guestbook': return { Icon: MessageSquare, color: '#C4A96A' };
      case 'page_view': return { Icon: MapPin, color: '#6D597A' };
      default: return { Icon: Eye, color: 'var(--pl-muted)' };
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60_000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (events.length === 0) {
    return (
      <div style={{
        padding: '12px 14px', borderRadius: '10px',
        background: 'rgba(163,177,138,0.06)', border: '1px solid rgba(163,177,138,0.12)',
        fontSize: '0.7rem', color: 'var(--pl-ink-soft)', lineHeight: 1.6,
      }}>
        Activity will appear here as visitors interact with your site.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
      {events.map((ev, i) => {
        const { Icon, color } = getIcon(ev.type);
        const isLast = i === events.length - 1;
        return (
          <div key={ev.id} style={{ display: 'flex', gap: '10px', position: 'relative' }}>
            {/* Timeline line */}
            {!isLast && (
              <div style={{
                position: 'absolute', left: '9px', top: '22px', bottom: '0',
                width: '1px', background: 'rgba(255,255,255,0.06)',
              }} />
            )}
            {/* Icon */}
            <div style={{
              width: '20px', height: '20px', borderRadius: '6px',
              background: `${typeof color === 'string' && color.startsWith('#') ? color : '#A3B18A'}12`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, marginTop: '2px', zIndex: 1,
            }}>
              <Icon size={10} color={color} />
            </div>
            {/* Content */}
            <div style={{ flex: 1, paddingBottom: isLast ? '0' : '12px' }}>
              <div style={{ fontSize: '0.7rem', color: '#fff', lineHeight: 1.45 }}>
                {ev.message}
              </div>
              <div style={{ fontSize: '0.58rem', color: 'var(--pl-muted)', marginTop: '1px' }}>
                {formatTime(ev.timestamp)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Share Stats Card ─────────────────────────────────────────

function ShareStatsCard({ stats }: { stats: ShareStats }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '12px 14px', borderRadius: '12px',
        background: 'rgba(109,89,122,0.08)', border: '1px solid rgba(109,89,122,0.14)',
      }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px',
          background: 'rgba(109,89,122,0.14)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Share2 size={16} color="#6D597A" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>
            {stats.totalShares.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.62rem', color: 'var(--pl-muted)', marginTop: '2px' }}>
            total shares
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <div style={{
          flex: 1, padding: '8px 10px', borderRadius: '8px',
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff' }}>{stats.linkCopied}</div>
          <div style={{ fontSize: '0.56rem', color: 'var(--pl-muted)', marginTop: '1px' }}>Link copied</div>
        </div>
        <div style={{
          flex: 1, padding: '8px 10px', borderRadius: '8px',
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff' }}>{stats.socialShares}</div>
          <div style={{ fontSize: '0.56rem', color: 'var(--pl-muted)', marginTop: '1px' }}>Social shares</div>
        </div>
      </div>
    </div>
  );
}

// ── Mock data generators ─────────────────────────────────────
// These produce realistic-looking data shaped for the component.
// Replace with real API calls when endpoints are available.

function generateMockDailyViews(totalVisits: number): DailyView[] {
  const days: DailyView[] = [];
  const now = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);

    // Create a plausible distribution with some variance
    const basePerDay = totalVisits > 0 ? Math.max(1, Math.round(totalVisits / 20)) : 0;
    const variance = Math.round(basePerDay * 0.6);
    const dayCount = i === 0
      ? Math.round(basePerDay * 0.8) // today (partial)
      : Math.max(0, basePerDay + Math.round((Math.sin(i * 1.7) + Math.cos(i * 0.9)) * variance));

    days.push({
      date: dateStr,
      label: i === 0 ? 'Today' : dayNames[d.getDay()],
      count: dayCount,
    });
  }
  return days;
}

function generateMockActivity(): ActivityEvent[] {
  const events: ActivityEvent[] = [
    { id: 'a1', type: 'rsvp_attending', message: 'Sarah & James RSVP\'d attending', timestamp: new Date(Date.now() - 12 * 60_000).toISOString() },
    { id: 'a2', type: 'guestbook', message: 'New guestbook message from Tom', timestamp: new Date(Date.now() - 45 * 60_000).toISOString() },
    { id: 'a3', type: 'page_view', message: 'Site viewed from New York', timestamp: new Date(Date.now() - 2 * 3600_000).toISOString() },
    { id: 'a4', type: 'rsvp_attending', message: 'Emily RSVP\'d attending (+1)', timestamp: new Date(Date.now() - 3.5 * 3600_000).toISOString() },
    { id: 'a5', type: 'page_view', message: 'Site viewed from Los Angeles', timestamp: new Date(Date.now() - 5 * 3600_000).toISOString() },
    { id: 'a6', type: 'rsvp_declined', message: 'Michael RSVP\'d declined', timestamp: new Date(Date.now() - 8 * 3600_000).toISOString() },
    { id: 'a7', type: 'guestbook', message: 'New guestbook message from Rachel', timestamp: new Date(Date.now() - 14 * 3600_000).toISOString() },
    { id: 'a8', type: 'page_view', message: 'Site viewed from Chicago', timestamp: new Date(Date.now() - 22 * 3600_000).toISOString() },
    { id: 'a9', type: 'rsvp_attending', message: 'David & Maria RSVP\'d attending', timestamp: new Date(Date.now() - 28 * 3600_000).toISOString() },
    { id: 'a10', type: 'page_view', message: 'Site viewed from London', timestamp: new Date(Date.now() - 36 * 3600_000).toISOString() },
  ];
  return events;
}

function generateMockShareStats(): ShareStats {
  return { linkCopied: 24, socialShares: 11, totalShares: 35 };
}

// ── Main Component ───────────────────────────────────────────

interface AnalyticsDashboardPanelProps {
  siteId: string;
}

export function AnalyticsDashboardPanel({ siteId }: AnalyticsDashboardPanelProps) {
  const [visits, setVisits] = useState<VisitStats | null>(null);
  const [rsvp, setRsvp] = useState<RsvpStats | null>(null);
  const [sections, setSections] = useState<SectionStat[] | null>(null);
  const [activity] = useState<ActivityEvent[]>(generateMockActivity);
  const [shareStats] = useState<ShareStats>(generateMockShareStats);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (quiet = false) => {
    if (!siteId) return;
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    try {
      const [vRes, rsvpRes, sRes] = await Promise.all([
        fetch(`/api/analytics/visit?siteId=${encodeURIComponent(siteId)}`),
        fetch(`/api/rsvp-stats?siteId=${encodeURIComponent(siteId)}`),
        fetch(`/api/analytics/section?siteId=${encodeURIComponent(siteId)}`),
      ]);
      if (vRes.ok) {
        setVisits(await vRes.json());
      }
      if (rsvpRes.ok) {
        const data = await rsvpRes.json();
        setRsvp({
          attending: data.attending ?? 0,
          confirmed: data.confirmed ?? data.attending ?? 0,
          declined: data.declined ?? 0,
          pending: data.pending ?? 0,
          total: data.total ?? 0,
        });
      }
      if (sRes.ok) {
        const { sections: sectionData } = await sRes.json();
        setSections(sectionData || []);
      }
    } catch {
      // Silent fail — show zeros
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, [siteId]); // eslint-disable-line react-hooks/exhaustive-deps

  const dailyViews = useMemo(
    () => generateMockDailyViews(visits?.visits ?? 0),
    [visits?.visits],
  );

  const rsvpConversionRate = rsvp && visits && visits.visits > 0
    ? Math.round((rsvp.attending / visits.visits) * 100)
    : null;

  const devicePct = visits && visits.visits > 0
    ? Math.round((visits.mobile / visits.visits) * 100)
    : 0;

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--pl-muted)', fontSize: '0.8rem' }}>
        Loading analytics…
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '4px 0' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: 'var(--pl-muted)',
        }}>
          <BarChart2 size={11} /> Site Analytics
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.28)', padding: '3px',
            display: 'flex', alignItems: 'center',
          }}
          title="Refresh"
        >
          <RefreshCw size={12} style={{ animation: refreshing ? 'pl-spin 0.8s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* ── Visit Stats ── */}
      <SidebarSection title="Visitors" defaultOpen>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <StatCard icon={TrendingUp} label="Total visits" value={(visits?.visits ?? 0).toLocaleString()} color="#A3B18A" />
          <StatCard icon={BarChart2} label="Today" value={visits?.today ?? 0} color="#D6C6A8" />
        </div>

        {/* Device breakdown */}
        {visits && visits.visits > 0 && (
          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: '0.67rem', color: 'var(--pl-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: '2px' }}>
              Device Split
            </div>
            <ProgressBar label={<><Smartphone size={9} style={{ display: 'inline' }} /> Mobile</>  as unknown as string} value={visits.mobile} total={visits.visits} color="#e87ab8" />
            <ProgressBar label={<><Monitor size={9} style={{ display: 'inline' }} /> Desktop</>  as unknown as string} value={visits.desktop} total={visits.visits} color="#A3B18A" />
            <div style={{ fontSize: '0.68rem', color: 'var(--pl-muted)', marginTop: '2px' }}>
              {devicePct}% of visitors are on mobile
            </div>
          </div>
        )}
      </SidebarSection>

      {/* ── Views Over Time ── */}
      <SidebarSection title="Views Over Time" defaultOpen>
        <GlassCard>
          <ViewsBarChart dailyViews={dailyViews} />
        </GlassCard>
      </SidebarSection>

      {/* ── RSVP Progress ── */}
      <SidebarSection title="RSVP Progress" defaultOpen>
        <GlassCard>
          <RsvpRing
            attending={rsvp?.attending ?? 0}
            declined={rsvp?.declined ?? 0}
            pending={rsvp?.pending ?? 0}
            total={rsvp?.total ?? 0}
          />
        </GlassCard>

        {rsvpConversionRate !== null && (
          <div style={{
            marginTop: '10px', padding: '8px 10px', borderRadius: '8px',
            background: 'rgba(163,177,138,0.07)', border: '1px solid rgba(163,177,138,0.15)',
            fontSize: '0.7rem', color: 'var(--pl-ink-soft)', lineHeight: 1.5,
          }}>
            <span style={{ color: '#A3B18A', fontWeight: 800 }}>{rsvpConversionRate}%</span> of visitors have RSVPed
          </div>
        )}
      </SidebarSection>

      {/* ── Most Viewed Sections ── */}
      <SidebarSection title="Most Viewed Sections" defaultOpen>
        <GlassCard>
          {(!sections || sections.length === 0) ? (
            <div style={{
              fontSize: '0.7rem', color: 'var(--pl-ink-soft)', lineHeight: 1.6,
            }}>
              Section analytics will appear once your site gets visitors.
            </div>
          ) : (
            <TopSectionsList sections={sections} />
          )}
        </GlassCard>
      </SidebarSection>

      {/* ── Recent Activity Feed ── */}
      <SidebarSection title="Recent Activity" defaultOpen>
        <GlassCard>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px',
            fontSize: '0.6rem', color: 'var(--pl-muted)', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>
            <Clock size={9} /> Live feed
          </div>
          <ActivityFeed events={activity} />
        </GlassCard>
      </SidebarSection>

      {/* ── Share Stats ── */}
      <SidebarSection title="Share Stats" defaultOpen>
        <GlassCard>
          <ShareStatsCard stats={shareStats} />
        </GlassCard>
      </SidebarSection>

      <style>{`@keyframes pl-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
