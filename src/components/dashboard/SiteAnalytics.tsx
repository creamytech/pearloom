'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/dashboard/SiteAnalytics.tsx
// Shows visit stats for a published site in the dashboard.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, Smartphone, Monitor, TrendingUp, RefreshCw } from 'lucide-react';

interface Stats {
  visits: number;
  today: number;
  mobile: number;
  desktop: number;
}

interface SiteAnalyticsProps {
  siteId: string;
}

export function SiteAnalytics({ siteId }: SiteAnalyticsProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/visit?siteId=${siteId}`);
      const data = await res.json();
      setStats(data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchStats(); }, [siteId]);

  const mobilePercent = stats && stats.visits > 0
    ? Math.round((stats.mobile / stats.visits) * 100) : 0;

  const tiles = [
    { icon: Eye,        label: 'Total Views',   value: stats?.visits  ?? 0, color: '#6366f1' },
    { icon: TrendingUp, label: 'Today',          value: stats?.today   ?? 0, color: '#10b981' },
    { icon: Smartphone, label: 'Mobile',         value: stats?.mobile  ?? 0, color: '#f59e0b' },
    { icon: Monitor,    label: 'Desktop',        value: stats?.desktop ?? 0, color: '#8b5cf6' },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <span style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--eg-muted)' }}>
          Site Analytics
        </span>
        <button
          onClick={fetchStats}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--eg-muted)', display: 'flex', padding: '4px' }}
        >
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* Stat tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
        {tiles.map(({ icon: Icon, label, value, color }) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{
              background: '#fff', borderRadius: '0.75rem', padding: '1rem',
              border: '1px solid rgba(0,0,0,0.05)', textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            }}
          >
            <Icon size={16} color={color} style={{ margin: '0 auto 0.5rem', display: 'block' }} />
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--eg-fg)', fontFamily: 'var(--eg-font-heading)', lineHeight: 1 }}>
              {loading ? '—' : value.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--eg-muted)', marginTop: '0.3rem' }}>
              {label}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Mobile vs Desktop bar */}
      {stats && stats.visits > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--eg-muted)' }}>📱 {mobilePercent}% mobile</span>
            <span style={{ fontSize: '0.65rem', color: 'var(--eg-muted)' }}>{100 - mobilePercent}% desktop 🖥</span>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.06)', borderRadius: '100px', height: '5px', overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${mobilePercent}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              style={{ height: '100%', background: 'linear-gradient(90deg, #f59e0b, #fbbf24)', borderRadius: '100px' }}
            />
          </div>
        </div>
      )}

      {!loading && stats?.visits === 0 && (
        <p style={{ fontSize: '0.75rem', color: 'var(--eg-muted)', textAlign: 'center', padding: '0.5rem 0' }}>
          No visits yet — share your link to get started!
        </p>
      )}
    </div>
  );
}
