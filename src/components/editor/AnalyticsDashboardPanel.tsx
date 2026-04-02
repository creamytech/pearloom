'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/AnalyticsDashboardPanel.tsx
// Editor panel showing visit stats, RSVP conversions, and
// device breakdown from /api/analytics/visit + /api/rsvp.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { SidebarSection } from './EditorSidebar';
import { BarChart2, Smartphone, Monitor, Users, TrendingUp, RefreshCw } from 'lucide-react';

interface VisitStats {
  visits: number;
  today: number;
  mobile: number;
  desktop: number;
}

interface RsvpStats {
  attending: number;
  declined: number;
  pending: number;
  total: number;
}

// ── Stat card ─────────────────────────────────────────────────
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
        <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>{label}</div>
        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>{value}</div>
        {sub && <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.38)', marginTop: '1px' }}>{sub}</div>}
      </div>
    </div>
  );
}

// ── Progress bar ──────────────────────────────────────────────
function ProgressBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', width: '64px', flexShrink: 0 }}>{label}</div>
      <div style={{ flex: 1, height: '5px', borderRadius: '3px', background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`, borderRadius: '3px',
          background: color, transition: 'width 0.6s ease',
        }} />
      </div>
      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', width: '30px', textAlign: 'right' }}>{value}</div>
    </div>
  );
}

interface AnalyticsDashboardPanelProps {
  siteId: string;
}

export function AnalyticsDashboardPanel({ siteId }: AnalyticsDashboardPanelProps) {
  const [visits, setVisits] = useState<VisitStats | null>(null);
  const [rsvp, setRsvp] = useState<RsvpStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (quiet = false) => {
    if (!siteId) return;
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    try {
      const [vRes, gRes] = await Promise.all([
        fetch(`/api/analytics/visit?siteId=${encodeURIComponent(siteId)}`),
        fetch(`/api/guests?siteId=${encodeURIComponent(siteId)}`),
      ]);
      if (vRes.ok) {
        setVisits(await vRes.json());
      }
      if (gRes.ok) {
        const { guests = [] } = await gRes.json();
        const attending = guests.filter((g: { status: string }) => g.status === 'attending').length;
        const declined = guests.filter((g: { status: string }) => g.status === 'declined').length;
        const pending = guests.filter((g: { status: string }) => g.status === 'pending').length;
        setRsvp({ attending, declined, pending, total: guests.length });
      }
    } catch {
      // Silent fail — show zeros
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, [siteId]); // eslint-disable-line react-hooks/exhaustive-deps

  const rsvpConversionRate = rsvp && visits && visits.visits > 0
    ? Math.round((rsvp.attending / visits.visits) * 100)
    : null;

  const devicePct = visits && visits.visits > 0
    ? Math.round((visits.mobile / visits.visits) * 100)
    : 0;

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>
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
          textTransform: 'uppercase', color: 'rgba(214,198,168,0.5)',
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
            <div style={{ fontSize: '0.67rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: '2px' }}>
              Device Split
            </div>
            <ProgressBar label={<><Smartphone size={9} style={{ display: 'inline' }} /> Mobile</>  as unknown as string} value={visits.mobile} total={visits.visits} color="#e87ab8" />
            <ProgressBar label={<><Monitor size={9} style={{ display: 'inline' }} /> Desktop</>  as unknown as string} value={visits.desktop} total={visits.visits} color="#A3B18A" />
            <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>
              {devicePct}% of visitors are on mobile
            </div>
          </div>
        )}
      </SidebarSection>

      {/* ── RSVP Stats ── */}
      <SidebarSection title="RSVPs" defaultOpen>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <StatCard icon={Users} label="Total responses" value={rsvp?.total ?? 0} color="#D6C6A8" />
        </div>

        {rsvp && rsvp.total > 0 && (
          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <ProgressBar label="Attending" value={rsvp.attending} total={rsvp.total} color="#A3B18A" />
            <ProgressBar label="Declined" value={rsvp.declined} total={rsvp.total} color="#f87171" />
            <ProgressBar label="Pending" value={rsvp.pending} total={rsvp.total} color="#D6C6A8" />
          </div>
        )}

        {rsvpConversionRate !== null && (
          <div style={{
            marginTop: '10px', padding: '8px 10px', borderRadius: '8px',
            background: 'rgba(163,177,138,0.07)', border: '1px solid rgba(163,177,138,0.15)',
            fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5,
          }}>
            <span style={{ color: '#A3B18A', fontWeight: 800 }}>{rsvpConversionRate}%</span> of visitors have RSVPed
          </div>
        )}
      </SidebarSection>

      <style>{`@keyframes pl-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
