'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/dashboard/SiteAnalytics.tsx
// Premium analytics view for a published site.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Eye, TrendingUp, Users, CalendarHeart, Download,
  RefreshCw, ArrowUpRight, ImageIcon, Clock,
} from 'lucide-react';
import type { RsvpResponse } from '@/types';

interface Stats {
  visits: number;
  today: number;
  mobile: number;
  desktop: number;
}

interface ActivityItem {
  id: string;
  type: 'rsvp' | 'photo' | 'visit';
  label: string;
  time: string;
}

interface SiteAnalyticsProps {
  siteId: string;
  /** ISO date string of the wedding — for countdown */
  weddingDate?: string;
  /** RSVP responses from parent, if available */
  rsvps?: RsvpResponse[];
  /** Photo count if available */
  photoCount?: number;
  /** Recent activity feed items */
  recentActivity?: ActivityItem[];
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  delay,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay }}
      style={{
        background: '#fff',
        borderRadius: '1rem',
        padding: '1.25rem',
        border: '1px solid rgba(0,0,0,0.05)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
        display: 'flex', flexDirection: 'column', gap: '0.5rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: 'var(--eg-muted)',
        }}>
          {label}
        </span>
        <div style={{
          width: '30px', height: '30px', borderRadius: '0.5rem',
          background: `${color}14`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={14} color={color} />
        </div>
      </div>
      <div style={{
        fontSize: '2rem', fontWeight: 700, color: 'var(--eg-fg)',
        fontFamily: 'var(--eg-font-heading)', lineHeight: 1,
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: '0.7rem', color: 'var(--eg-muted)' }}>
          {sub}
        </div>
      )}
    </motion.div>
  );
}

function activityIcon(type: ActivityItem['type']) {
  if (type === 'rsvp') return <Users size={13} color="var(--eg-accent)" />;
  if (type === 'photo') return <ImageIcon size={13} color="#6366f1" />;
  return <Eye size={13} color="var(--eg-muted)" />;
}

export function SiteAnalytics({
  siteId,
  weddingDate,
  rsvps = [],
  photoCount = 0,
  recentActivity = [],
}: SiteAnalyticsProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/visit?siteId=${siteId}`);
      const data = await res.json();
      setStats(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, [siteId]);

  // Days until wedding
  const daysUntil = (() => {
    if (!weddingDate) return null;
    const diff = new Date(weddingDate).getTime() - Date.now();
    return diff > 0 ? Math.ceil(diff / (1000 * 60 * 60 * 24)) : null;
  })();

  // RSVP breakdown
  const attending = rsvps.filter((r) => r.status === 'attending').length;
  const declined = rsvps.filter((r) => r.status === 'declined').length;
  const pending = rsvps.filter((r) => r.status === 'pending').length;
  const total = rsvps.length;
  const attendingPct = total > 0 ? (attending / total) * 100 : 0;

  // CSV export
  const exportCsv = () => {
    if (!rsvps.length) return;
    const header = 'Name,Email,Status,Plus One,Plus One Name,Meal,Song Request,Responded';
    const rows = rsvps.map((r) => [
      r.guestName, r.email, r.status,
      r.plusOne ? 'Yes' : 'No',
      r.plusOneName || '',
      r.mealPreference || '',
      r.songRequest || '',
      r.respondedAt,
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rsvps-${siteId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'var(--eg-muted)',
        }}>
          Site Analytics
        </span>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {rsvps.length > 0 && (
            <button
              onClick={exportCsv}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.35rem',
                padding: '0.4rem 0.85rem', borderRadius: '0.5rem',
                border: '1px solid rgba(0,0,0,0.08)', background: '#fff',
                cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600,
                color: 'var(--eg-fg)', fontFamily: 'var(--eg-font-body)',
                transition: 'background 0.15s',
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = '#f8f8f8'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = '#fff'; }}
            >
              <Download size={12} />
              Download CSV
            </button>
          )}
          <button
            onClick={fetchStats}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--eg-muted)', display: 'flex', padding: '4px',
            }}
          >
            <RefreshCw
              size={13}
              style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}
            />
          </button>
        </div>
      </div>

      {/* 4 stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
        <StatCard
          icon={Eye}
          label="Total Visits"
          value={loading ? '—' : (stats?.visits ?? 0).toLocaleString()}
          sub={stats?.today ? `+${stats.today} today` : undefined}
          color="#6366f1"
          delay={0}
        />
        <StatCard
          icon={Users}
          label="RSVPs Received"
          value={total}
          sub={total > 0 ? `${attending} attending` : 'None yet'}
          color="var(--eg-accent)"
          delay={0.06}
        />
        <StatCard
          icon={ImageIcon}
          label="Photos Shared"
          value={photoCount}
          color="#f59e0b"
          delay={0.12}
        />
        <StatCard
          icon={daysUntil !== null ? CalendarHeart : TrendingUp}
          label={daysUntil !== null ? 'Days Until Wedding' : 'Today\'s Visits'}
          value={daysUntil !== null ? daysUntil : (loading ? '—' : (stats?.today ?? 0))}
          sub={daysUntil !== null ? 'keep the countdown going' : undefined}
          color="#ec4899"
          delay={0.18}
        />
      </div>

      {/* RSVP breakdown bar */}
      {total > 0 && (
        <div style={{
          background: '#fff', borderRadius: '1rem', padding: '1.25rem',
          border: '1px solid rgba(0,0,0,0.05)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
            <span style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--eg-muted)' }}>
              RSVP Breakdown
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--eg-muted)' }}>
              {attending} attending · {declined} declined · {pending} pending
            </span>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.06)', borderRadius: '100px', height: '7px', overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${attendingPct}%` }}
              transition={{ duration: 0.9, ease: 'easeOut', delay: 0.2 }}
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, var(--eg-accent), #8FA876)',
                borderRadius: '100px',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.85rem' }}>
            {[
              { label: 'Attending', count: attending, color: 'var(--eg-accent)' },
              { label: 'Declined', count: declined, color: '#ef4444' },
              { label: 'Pending', count: pending, color: '#f59e0b' },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color }} />
                <span style={{ fontSize: '0.72rem', color: 'var(--eg-muted)' }}>
                  {item.count} {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent activity feed */}
      {recentActivity.length > 0 && (
        <div style={{
          background: '#fff', borderRadius: '1rem', padding: '1.25rem',
          border: '1px solid rgba(0,0,0,0.05)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
        }}>
          <span style={{
            display: 'block', marginBottom: '1rem',
            fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--eg-muted)',
          }}>
            Recent Activity
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {recentActivity.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.65rem 0',
                  borderBottom: i < recentActivity.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                }}
              >
                <div style={{
                  width: '26px', height: '26px', borderRadius: '0.45rem',
                  background: 'rgba(0,0,0,0.03)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {activityIcon(item.type)}
                </div>
                <span style={{ flex: 1, fontSize: '0.8rem', color: 'var(--eg-fg)' }}>{item.label}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--eg-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Clock size={11} />
                  {item.time}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Mobile split bar */}
      {stats && stats.visits > 0 && (
        <div style={{
          background: '#fff', borderRadius: '1rem', padding: '1.25rem',
          border: '1px solid rgba(0,0,0,0.05)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
            <span style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--eg-muted)' }}>
              Device Split
            </span>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--eg-muted)' }}>
                {Math.round((stats.mobile / stats.visits) * 100)}% mobile
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--eg-muted)' }}>
                {Math.round((stats.desktop / stats.visits) * 100)}% desktop
              </span>
            </div>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.06)', borderRadius: '100px', height: '5px', overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.round((stats.mobile / stats.visits) * 100)}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              style={{ height: '100%', background: 'linear-gradient(90deg, #f59e0b, #fbbf24)', borderRadius: '100px' }}
            />
          </div>
        </div>
      )}

      {!loading && stats?.visits === 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.02)', borderRadius: '0.75rem' }}>
          <ArrowUpRight size={14} color="var(--eg-accent)" />
          <p style={{ fontSize: '0.78rem', color: 'var(--eg-muted)' }}>
            No visits yet — share your site link to get started.
          </p>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
