'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/dashboard/RsvpDashboard.tsx
// Real-time RSVP guest management dashboard for couples.
// ─────────────────────────────────────────────────────────────

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Check, X, Clock, Download, Copy, Search,
  ChevronUp, ChevronDown, RefreshCw, QrCode, Mail,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────

interface Guest {
  id: string;
  name: string;
  email?: string;
  status: 'attending' | 'declined' | 'pending';
  plusOne: boolean;
  plusOneName?: string;
  mealPreference?: string;
  dietaryRestrictions?: string;
  message?: string;
  respondedAt?: string;
}

interface RsvpStats {
  attending: number;
  confirmed: number;
  declined: number;
  pending: number;
  total: number;
}

interface RsvpDashboardProps {
  siteId: string;
  initialStats: RsvpStats;
  initialGuests: Guest[];
  userEmail: string;
}

type SortKey = 'name' | 'status' | 'respondedAt';
type SortDir = 'asc' | 'desc';
type FilterStatus = 'all' | 'attending' | 'declined' | 'pending';

// ── Constants & Helpers ────────────────────────────────────────

const MOCK_GUESTS: Guest[] = [
  {
    id: 'mock-1', name: 'Emma Thompson', email: 'emma@example.com',
    status: 'attending', plusOne: true, plusOneName: 'James Thompson',
    mealPreference: 'Chicken', dietaryRestrictions: 'None',
    respondedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'mock-2', name: 'Michael Chen', email: 'mchen@example.com',
    status: 'attending', plusOne: false,
    mealPreference: 'Fish', dietaryRestrictions: 'Shellfish allergy',
    respondedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'mock-3', name: 'Sophia Rodriguez', email: 'sophia.r@example.com',
    status: 'declined', plusOne: false,
    respondedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'mock-4', name: 'Oliver Williams', email: 'o.williams@example.com',
    status: 'pending', plusOne: true,
  },
  {
    id: 'mock-5', name: 'Ava Johnson', email: 'ava.j@example.com',
    status: 'attending', plusOne: false,
    mealPreference: 'Vegan', dietaryRestrictions: 'Gluten-free',
    respondedAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

const MOCK_STATS: RsvpStats = {
  attending: 4, confirmed: 3, declined: 1, pending: 1, total: 5,
};

const STATUS_CONFIG = {
  attending: {
    label: 'Attending',
    icon: Check,
    color: '#A3B18A',
    bg: 'rgba(163,177,138,0.12)',
    border: 'rgba(163,177,138,0.25)',
    dot: '#A3B18A',
  },
  declined: {
    label: 'Declined',
    icon: X,
    color: '#E07070',
    bg: 'rgba(224,112,112,0.10)',
    border: 'rgba(224,112,112,0.22)',
    dot: '#E07070',
  },
  pending: {
    label: 'Pending',
    icon: Clock,
    color: '#D4A96A',
    bg: 'rgba(212,169,106,0.10)',
    border: 'rgba(212,169,106,0.22)',
    dot: '#D4A96A',
  },
} as const;

function formatDate(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function buildCsv(guests: Guest[]): string {
  const header = ['Name', 'Email', 'Status', 'Plus One', 'Plus One Name',
    'Meal Preference', 'Dietary Notes', 'Message', 'Response Date'];
  const rows = guests.map(g => [
    g.name,
    g.email || '',
    g.status,
    g.plusOne ? 'Yes' : 'No',
    g.plusOneName || '',
    g.mealPreference || '',
    g.dietaryRestrictions || '',
    g.message || '',
    formatDate(g.respondedAt),
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
  return [header.join(','), ...rows].join('\n');
}

// ── Sub-components ─────────────────────────────────────────────

function StatCard({
  icon: Icon, label, value, color, delay,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      style={{
        flex: '1 1 0',
        minWidth: 0,
        background: 'rgba(214,198,168,0.05)',
        border: '1px solid rgba(214,198,168,0.1)',
        borderRadius: '1rem',
        padding: '1.25rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: `${color}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={16} color={color} />
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--pl-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: '2.25rem', fontWeight: 700, color: 'var(--pl-ink-soft)', lineHeight: 1 }}>
        {value}
      </div>
    </motion.div>
  );
}

function StatusBadge({ status }: { status: Guest['status'] }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      padding: '0.2rem 0.65rem', borderRadius: '999px',
      fontSize: '0.75rem', fontWeight: 600,
      color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`,
    }}>
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronUp size={12} style={{ opacity: 0.25 }} />;
  return sortDir === 'asc'
    ? <ChevronUp size={12} style={{ color: '#A3B18A' }} />
    : <ChevronDown size={12} style={{ color: '#A3B18A' }} />;
}

// ── Main Component ─────────────────────────────────────────────

export function RsvpDashboard({
  siteId,
  initialStats,
  initialGuests,
}: RsvpDashboardProps) {
  const useMock = false; // Never show mock data — show empty state instead
  const [guests, setGuests] = useState<Guest[]>(initialGuests);
  const [stats, setStats] = useState<RsvpStats>(initialStats);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [sortKey, setSortKey] = useState<SortKey>('respondedAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshed, setRefreshed] = useState(false);
  const [copiedEmails, setCopiedEmails] = useState(false);
  const [exportedCsv, setExportedCsv] = useState(false);

  // ── Refresh ────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    if (!siteId) return;
    setRefreshing(true);
    try {
      const [statsRes, guestsRes] = await Promise.all([
        fetch(`/api/rsvp-stats?siteId=${siteId}`),
        fetch(`/api/guests?siteId=${siteId}`),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (guestsRes.ok) {
        const data = await guestsRes.json();
        setGuests(data.guests || []);
      }
      setRefreshed(true);
      setTimeout(() => setRefreshed(false), 2000);
    } catch {
      // silently fail
    } finally {
      setRefreshing(false);
    }
  }, [siteId]);

  // ── Sort / Filter ──────────────────────────────────────────

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const filtered = useMemo(() => {
    let list = [...guests];
    if (filter !== 'all') list = list.filter(g => g.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(g =>
        g.name.toLowerCase().includes(q) ||
        (g.email || '').toLowerCase().includes(q) ||
        (g.mealPreference || '').toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      let va: string, vb: string;
      if (sortKey === 'name') { va = a.name; vb = b.name; }
      else if (sortKey === 'status') { va = a.status; vb = b.status; }
      else {
        va = a.respondedAt || ''; vb = b.respondedAt || '';
      }
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [guests, filter, search, sortKey, sortDir]);

  // ── Exports ────────────────────────────────────────────────

  const exportCsv = () => {
    const csv = buildCsv(guests);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rsvp-responses.csv';
    a.click();
    URL.revokeObjectURL(url);
    setExportedCsv(true);
    setTimeout(() => setExportedCsv(false), 2000);
  };

  const copyEmails = () => {
    const emails = guests
      .filter(g => g.status === 'attending' && g.email)
      .map(g => g.email!)
      .join(', ');
    navigator.clipboard.writeText(emails).catch(() => {});
    setCopiedEmails(true);
    setTimeout(() => setCopiedEmails(false), 2000);
  };

  // ── Styles ─────────────────────────────────────────────────

  const root: React.CSSProperties = {
    minHeight: '100vh',
    background: '#1C1916',
    color: 'var(--pl-ink-soft)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    padding: '2rem',
  };

  const headingStyle: React.CSSProperties = {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: 'var(--pl-ink-soft)',
    margin: 0,
    letterSpacing: '-0.02em',
  };

  const subStyle: React.CSSProperties = {
    fontSize: '0.9rem',
    color: 'var(--pl-muted)',
    margin: 0,
  };

  const thStyle: React.CSSProperties = {
    padding: '0.75rem 1rem',
    textAlign: 'left',
    fontSize: '0.7rem',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--pl-muted)',
    background: 'rgba(214,198,168,0.03)',
    userSelect: 'none',
    cursor: 'pointer',
  };

  const tdStyle: React.CSSProperties = {
    padding: '0.875rem 1rem',
    fontSize: '0.85rem',
    color: 'var(--pl-ink-soft)',
    borderTop: '1px solid rgba(214,198,168,0.06)',
    verticalAlign: 'middle',
  };

  const pillBase: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center',
    padding: '0.35rem 0.9rem', borderRadius: '999px',
    fontSize: '0.78rem', fontWeight: 600,
    cursor: 'pointer', transition: 'all 0.15s ease', border: '1px solid transparent',
  };

  const btnStyle: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
    padding: '0.5rem 1.1rem', borderRadius: '0.6rem',
    fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
    background: 'rgba(214,198,168,0.08)',
    border: '1px solid rgba(214,198,168,0.15)',
    color: 'var(--pl-ink-soft)',
    transition: 'all 0.15s ease',
  };

  const accentBtnStyle: React.CSSProperties = {
    ...btnStyle,
    background: '#A3B18A',
    color: '#1C1916',
    border: '1px solid #A3B18A',
  };

  // Search-filtered guests (before status filter) — used for pill badge counts
  const searchFilteredGuests = useMemo(() => {
    if (!search.trim()) return guests;
    const q = search.toLowerCase();
    return guests.filter(g =>
      g.name.toLowerCase().includes(q) ||
      (g.email || '').toLowerCase().includes(q) ||
      (g.mealPreference || '').toLowerCase().includes(q)
    );
  }, [guests, search]);

  const filterPills: Array<{ key: FilterStatus; label: string; count: number }> = [
    { key: 'all', label: 'All', count: searchFilteredGuests.length },
    { key: 'attending', label: 'Attending', count: searchFilteredGuests.filter(g => g.status === 'attending').length },
    { key: 'declined', label: 'Declined', count: searchFilteredGuests.filter(g => g.status === 'declined').length },
    { key: 'pending', label: 'Pending', count: searchFilteredGuests.filter(g => g.status === 'pending').length },
  ];

  const isEmpty = guests.length === 0;

  return (
    <div style={root}>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <h1 style={headingStyle}>RSVP Dashboard</h1>
            <p style={subStyle}>
              {guests.length === 0
                ? 'Share your site to start collecting responses'
                : `Managing responses for site ${siteId || '—'}`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button
              style={btnStyle}
              onClick={refresh}
              disabled={refreshing}
              aria-label="Refresh data"
            >
              <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
              {refreshed ? 'Updated!' : 'Refresh'}
            </button>
            <button style={btnStyle} onClick={copyEmails} aria-label="Copy attending guest emails">
              <Mail size={14} />
              {copiedEmails ? 'Copied!' : 'Copy Emails'}
            </button>
            <button style={accentBtnStyle} onClick={exportCsv}>
              <Download size={14} />
              {exportedCsv ? 'Exported!' : 'Export CSV'}
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <StatCard icon={Users} label="Total Invited" value={stats.total || guests.length} color="#A3B18A" delay={0} />
          <StatCard icon={Check} label="Attending" value={stats.attending} color="#A3B18A" delay={0.05} />
          <StatCard icon={X} label="Declined" value={stats.declined} color="#E07070" delay={0.1} />
          <StatCard icon={Clock} label="Awaiting Reply" value={stats.pending} color="#D4A96A" delay={0.15} />
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{
            position: 'relative', flex: '1 1 220px', maxWidth: 340,
          }}>
            <Search size={14} style={{
              position: 'absolute', left: '0.75rem', top: '50%',
              transform: 'translateY(-50%)', color: 'var(--pl-muted)',
            }} />
            <input
              type="text"
              placeholder="Search guests…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '0.6rem 0.75rem 0.6rem 2.25rem',
                background: 'rgba(214,198,168,0.05)',
                border: '1px solid rgba(214,198,168,0.12)',
                borderRadius: '0.6rem',
                color: 'var(--pl-ink-soft)', fontSize: '0.84rem',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Filter pills */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {filterPills.map(({ key, label, count }) => {
              const active = filter === key;
              return (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  style={{
                    ...pillBase,
                    background: active ? '#A3B18A' : 'rgba(214,198,168,0.06)',
                    color: active ? '#1C1916' : 'rgba(214,198,168,0.7)',
                    border: `1px solid ${active ? '#A3B18A' : 'rgba(214,198,168,0.12)'}`,
                  }}
                >
                  {label}
                  <span style={{
                    marginLeft: '0.35rem', fontSize: '0.7rem',
                    background: active ? 'rgba(28,25,22,0.2)' : 'rgba(214,198,168,0.1)',
                    borderRadius: '999px', padding: '0.05rem 0.45rem',
                  }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Table */}
        {isEmpty ? (
          <EmptyState />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            style={{
              background: 'rgba(214,198,168,0.03)',
              border: '1px solid rgba(214,198,168,0.1)',
              borderRadius: '1rem',
              overflow: 'hidden',
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                <thead>
                  <tr>
                    {([
                      { key: 'name' as SortKey, label: 'Name' },
                      { key: null, label: 'Email' },
                      { key: 'status' as SortKey, label: 'Status' },
                      { key: null, label: 'Meal' },
                      { key: null, label: 'Plus-ones' },
                      { key: null, label: 'Dietary Notes' },
                      { key: 'respondedAt' as SortKey, label: 'Response Date' },
                    ] as Array<{ key: SortKey | null; label: string }>).map(col => (
                      <th
                        key={col.label}
                        style={{ ...thStyle, ...(col.key ? {} : { cursor: 'default' }) }}
                        onClick={() => col.key && handleSort(col.key)}
                        aria-sort={
                          col.key && col.key === sortKey
                            ? sortDir === 'asc' ? 'ascending' : 'descending'
                            : undefined
                        }
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          {col.label}
                          {col.key && <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence initial={false}>
                    {filtered.map((guest, i) => (
                      <motion.tr
                        key={guest.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: i * 0.02 }}
                        style={{
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLTableRowElement).style.background =
                            'rgba(214,198,168,0.04)';
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLTableRowElement).style.background = '';
                        }}
                      >
                        <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--pl-ink-soft)' }}>
                          {guest.name}
                        </td>
                        <td style={tdStyle}>
                          {guest.email
                            ? <a href={`mailto:${guest.email}`} style={{ color: 'var(--pl-muted)', textDecoration: 'none' }}>{guest.email}</a>
                            : <span style={{ color: 'var(--pl-divider)' }}>—</span>}
                        </td>
                        <td style={tdStyle}>
                          <StatusBadge status={guest.status} />
                        </td>
                        <td style={tdStyle}>
                          {guest.mealPreference || <span style={{ color: 'var(--pl-divider)' }}>—</span>}
                        </td>
                        <td style={tdStyle}>
                          {guest.plusOne
                            ? <span style={{ color: '#A3B18A' }}>+1{guest.plusOneName ? ` (${guest.plusOneName})` : ''}</span>
                            : <span style={{ color: 'var(--pl-divider)' }}>—</span>}
                        </td>
                        <td style={tdStyle}>
                          {guest.dietaryRestrictions || <span style={{ color: 'var(--pl-divider)' }}>—</span>}
                        </td>
                        <td style={{ ...tdStyle, color: 'var(--pl-muted)', fontSize: '0.8rem' }}>
                          {formatDate(guest.respondedAt)}
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ ...tdStyle, textAlign: 'center', padding: '2.5rem', color: 'var(--pl-muted)' }}>
                        No guests match your filters
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div style={{
              padding: '0.75rem 1.25rem',
              borderTop: '1px solid rgba(214,198,168,0.06)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              fontSize: '0.75rem', color: 'var(--pl-muted)',
            }}>
              <span>Showing {filtered.length} of {guests.length} guests</span>
            </div>
          </motion.div>
        )}
      </div>

      <style>{`
        
        input::placeholder { color: rgba(214,198,168,0.3); }
        input:focus { border-color: rgba(163,177,138,0.4) !important; }
      `}</style>
    </div>
  );
}

// ── Empty State ────────────────────────────────────────────────

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'rgba(214,198,168,0.03)',
        border: '1px solid rgba(214,198,168,0.1)',
        borderRadius: '1rem',
        padding: '4rem 2rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.25rem',
        textAlign: 'center',
      }}
    >
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: 'rgba(163,177,138,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Users size={28} color="#A3B18A" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <h2 style={{ margin: 0, color: 'var(--pl-ink-soft)', fontSize: '1.25rem', fontWeight: 600 }}>
          No RSVPs yet
        </h2>
        <p style={{ margin: 0, color: 'var(--pl-muted)', fontSize: '0.9rem', maxWidth: 380 }}>
          Share your wedding site or QR code so guests can start responding. Their answers will appear here in real time.
        </p>
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.65rem 1.25rem',
        background: 'rgba(163,177,138,0.08)',
        border: '1px solid rgba(163,177,138,0.18)',
        borderRadius: '0.75rem',
        color: '#A3B18A', fontSize: '0.85rem', fontWeight: 600,
      }}>
        <QrCode size={16} />
        Share your QR code to start collecting RSVPs
      </div>
    </motion.div>
  );
}
