'use client';

// ─────────────────────────────────────────────────────────────
// RsvpDashboard — Wave C rebuild.
// • Editorial layout (cream surface, design tokens)
// • Mobile-first via ResponsiveTable (no horizontal scroll)
// • StatTile row · filter pills · search · CSV export
// • All hex codes replaced with var(--pl-*) tokens
// ─────────────────────────────────────────────────────────────

import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Check, X, Clock, Download, Copy, Search,
  RefreshCw, Mail, QrCode,
} from 'lucide-react';
import {
  StatTile,
  PageCard,
  Button,
  ResponsiveTable,
  EmptyState,
  type Column,
} from '@/components/shell';
import { DashboardShell } from './DashboardShell';

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
  eventIds?: string[];
}

interface RsvpStats {
  attending: number;
  confirmed: number;
  declined: number;
  pending: number;
  total: number;
}

interface EventOption {
  id: string;
  name: string;
}

interface RsvpDashboardProps {
  siteId: string;
  initialStats: RsvpStats;
  initialGuests: Guest[];
  initialEvents?: EventOption[];
  userEmail: string;
}

type FilterStatus = 'all' | 'attending' | 'declined' | 'pending';

// ── Helpers ────────────────────────────────────────────────────

const STATUS_PILL: Record<Guest['status'], { label: string; bg: string; color: string; border: string }> = {
  attending: {
    label: 'Attending',
    bg: 'color-mix(in oklab, var(--pl-olive) 12%, transparent)',
    color: 'var(--pl-olive)',
    border: 'color-mix(in oklab, var(--pl-olive) 25%, transparent)',
  },
  declined: {
    label: 'Declined',
    bg: 'color-mix(in oklab, var(--pl-plum) 12%, transparent)',
    color: 'var(--pl-plum)',
    border: 'color-mix(in oklab, var(--pl-plum) 25%, transparent)',
  },
  pending: {
    label: 'Pending',
    bg: 'color-mix(in oklab, var(--pl-gold) 14%, transparent)',
    color: 'var(--pl-gold)',
    border: 'color-mix(in oklab, var(--pl-gold) 28%, transparent)',
  },
};

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

// ── StatusPill ────────────────────────────────────────────────

function StatusPill({ status }: { status: Guest['status'] }) {
  const cfg = STATUS_PILL[status];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '3px 10px 3px 9px',
        borderRadius: 3,
        fontFamily: 'var(--pl-font-mono)',
        fontSize: '0.52rem',
        fontWeight: 700,
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: cfg.color,
        }}
      />
      {cfg.label}
    </span>
  );
}

// ── Main ───────────────────────────────────────────────────────

export function RsvpDashboard({
  siteId,
  initialStats,
  initialGuests,
  initialEvents = [],
}: RsvpDashboardProps) {
  const [guests, setGuests] = useState<Guest[]>(initialGuests);
  const [stats, setStats] = useState<RsvpStats>(initialStats);
  const [events] = useState<EventOption[]>(initialEvents);
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshed, setRefreshed] = useState(false);
  const [copiedEmails, setCopiedEmails] = useState(false);
  const [exportedCsv, setExportedCsv] = useState(false);

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

  const filtered = useMemo(() => {
    let list = [...guests];
    if (filter !== 'all') list = list.filter(g => g.status === filter);
    if (eventFilter !== 'all') {
      list = list.filter(g => Array.isArray(g.eventIds) && g.eventIds.includes(eventFilter));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(g =>
        g.name.toLowerCase().includes(q) ||
        (g.email || '').toLowerCase().includes(q) ||
        (g.mealPreference || '').toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => (b.respondedAt || '').localeCompare(a.respondedAt || ''));
    return list;
  }, [guests, filter, eventFilter, search]);

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

  const responseRate = stats.total > 0
    ? Math.round(((stats.attending + stats.declined) / stats.total) * 100)
    : 0;

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

  // ── Columns for ResponsiveTable ───────────────────────────────

  const columns: Column<Guest>[] = [
    {
      key: 'name',
      label: 'Guest',
      render: (g) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontWeight: 600, color: 'var(--pl-ink)' }}>{g.name}</span>
          {g.email && (
            <a
              href={`mailto:${g.email}`}
              style={{ color: 'var(--pl-muted)', textDecoration: 'none', fontSize: '0.78rem' }}
            >
              {g.email}
            </a>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (g) => <StatusPill status={g.status} />,
    },
    {
      key: 'meal',
      label: 'Meal',
      render: (g) => (
        <span style={{ color: g.mealPreference ? 'var(--pl-ink)' : 'var(--pl-divider)' }}>
          {g.mealPreference || '—'}
        </span>
      ),
      hideMobile: true,
    },
    {
      key: 'plusOne',
      label: '+1',
      render: (g) =>
        g.plusOne ? (
          <span style={{ color: 'var(--pl-olive)', fontWeight: 600 }}>
            +1{g.plusOneName ? ` · ${g.plusOneName}` : ''}
          </span>
        ) : (
          <span style={{ color: 'var(--pl-divider)' }}>—</span>
        ),
      hideMobile: true,
    },
    {
      key: 'dietary',
      label: 'Dietary',
      render: (g) => (
        <span style={{ color: g.dietaryRestrictions ? 'var(--pl-ink-soft)' : 'var(--pl-divider)' }}>
          {g.dietaryRestrictions || '—'}
        </span>
      ),
      hideMobile: true,
    },
    {
      key: 'respondedAt',
      label: 'Replied',
      align: 'right',
      render: (g) => (
        <span
          style={{
            color: 'var(--pl-muted)',
            fontFamily: 'var(--pl-font-mono)',
            fontSize: '0.78rem',
          }}
        >
          {formatDate(g.respondedAt)}
        </span>
      ),
    },
  ];

  return (
    <DashboardShell eyebrow="Guests · RSVP">
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 32,
        }}
      >
        {/* Editorial masthead */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Mono ruled header strip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{
              fontFamily: 'var(--pl-font-mono)',
              fontSize: '0.52rem', fontWeight: 700,
              letterSpacing: '0.32em', textTransform: 'uppercase',
              color: 'var(--pl-olive)',
            }}>
              The Ledger · Guests
            </span>
            <span style={{ flex: 1, height: 1, background: 'rgba(184,147,90,0.45)' }} />
            <span style={{
              fontFamily: 'var(--pl-font-mono)',
              fontSize: '0.52rem', fontWeight: 700,
              letterSpacing: '0.28em', textTransform: 'uppercase',
              color: 'rgba(14,13,11,0.55)',
            }}>
              {guests.length} invited
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: 24,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ maxWidth: 600 }}>
              <h1 style={{
                margin: 0,
                fontFamily: 'var(--pl-font-display)',
                fontStyle: 'italic',
                fontWeight: 400,
                fontSize: 'clamp(2.4rem, 5.2vw, 3.6rem)',
                lineHeight: 1.02,
                letterSpacing: '-0.01em',
                color: 'var(--pl-ink)',
              }}>
                Who&apos;s coming
              </h1>
              <p style={{
                margin: '12px 0 0',
                fontFamily: 'var(--pl-font-body)',
                fontSize: '0.85rem',
                lineHeight: 1.55,
                color: 'var(--pl-ink-soft)',
                maxWidth: 440,
              }}>
                {guests.length === 0
                  ? 'Share your site to start collecting responses — they\u2019ll post here as they arrive.'
                  : `A live register of every reply received. ${responseRate}% of invited have responded.`}
              </p>
            </div>

            {/* Response-rate ratio block — editorial "by the numbers" */}
            {guests.length > 0 && (
              <div style={{
                display: 'flex', alignItems: 'stretch',
                border: '1px solid rgba(184,147,90,0.40)',
                borderRadius: 10,
                overflow: 'hidden',
                background: 'var(--pl-cream-card)',
              }}>
                <div style={{
                  padding: '10px 16px',
                  borderRight: '1px solid rgba(14,13,11,0.08)',
                  display: 'flex', flexDirection: 'column', gap: 2, minWidth: 72, alignItems: 'center',
                }}>
                  <span style={{
                    fontFamily: 'var(--pl-font-mono)', fontSize: '0.46rem', fontWeight: 700,
                    letterSpacing: '0.26em', textTransform: 'uppercase', color: 'rgba(14,13,11,0.50)',
                  }}>Replied</span>
                  <span style={{
                    fontFamily: 'var(--pl-font-display)', fontStyle: 'italic',
                    fontSize: '1.6rem', lineHeight: 1, color: 'var(--pl-ink)',
                  }}>{stats.attending + stats.declined}</span>
                </div>
                <div style={{
                  padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 2, minWidth: 72, alignItems: 'center',
                  background: 'rgba(184,147,90,0.06)',
                }}>
                  <span style={{
                    fontFamily: 'var(--pl-font-mono)', fontSize: '0.46rem', fontWeight: 700,
                    letterSpacing: '0.26em', textTransform: 'uppercase', color: 'var(--pl-gold)',
                  }}>Rate</span>
                  <span style={{
                    fontFamily: 'var(--pl-font-display)', fontStyle: 'italic',
                    fontSize: '1.6rem', lineHeight: 1, color: 'var(--pl-gold)',
                  }}>{responseRate}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Action row — mono-labeled editorial buttons under a hairline */}
          <div style={{
            paddingTop: 16,
            borderTop: '1px solid rgba(14,13,11,0.08)',
            display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end',
          }}>
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={refreshing}
              leftIcon={<RefreshCw size={13} style={{ animation: refreshing ? 'pl-spin 1s linear infinite' : 'none' }} />}
            >
              {refreshed ? 'Updated' : 'Refresh'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={copyEmails}
              leftIcon={copiedEmails ? <Check size={13} /> : <Mail size={13} />}
            >
              {copiedEmails ? 'Copied' : 'Copy emails'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={exportCsv}
              leftIcon={<Download size={13} />}
            >
              {exportedCsv ? 'Exported' : 'Export CSV'}
            </Button>
          </div>
        </div>

        {/* Stats row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 14,
          }}
        >
          <StatTile
            accent="olive"
            icon={<Users size={14} />}
            label="Total invited"
            value={stats.total || guests.length}
            hint="across all events"
          />
          <StatTile
            accent="olive"
            icon={<Check size={14} />}
            label="Attending"
            value={stats.attending}
            trend={stats.attending > 0 ? { dir: 'up', label: `${responseRate}% responded` } : undefined}
            hint="confirmed yes"
          />
          <StatTile
            accent="plum"
            icon={<X size={14} />}
            label="Declined"
            value={stats.declined}
            hint="sent regrets"
          />
          <StatTile
            accent="gold"
            icon={<Clock size={14} />}
            label="Pending"
            value={stats.pending}
            hint="awaiting reply"
          />
        </div>

        {/* Controls */}
        <div
          style={{
            display: 'flex',
            gap: 14,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 340 }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--pl-muted)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              placeholder="Search guests…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                background: 'var(--pl-cream-card)',
                border: '1px solid var(--pl-divider)',
                borderRadius: 'var(--pl-radius-md)',
                color: 'var(--pl-ink)',
                fontSize: '0.88rem',
                fontFamily: 'inherit',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color var(--pl-dur-fast) var(--pl-ease-out)',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--pl-olive)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--pl-divider)';
              }}
            />
          </div>

          {events.length > 1 && (
            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              aria-label="Filter by event"
              style={{
                padding: '9px 14px',
                background: 'var(--pl-cream-card)',
                border: '1px solid var(--pl-divider)',
                borderRadius: 'var(--pl-radius-md)',
                color: 'var(--pl-ink)',
                fontSize: '0.86rem',
                fontFamily: 'inherit',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="all">All events</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.name}</option>
              ))}
            </select>
          )}

          {/* Filter tabs — editorial mono with gold underline */}
          <div style={{
            display: 'flex',
            gap: 2,
            flexWrap: 'wrap',
            borderBottom: '1px solid rgba(14,13,11,0.08)',
          }}>
            {filterPills.map(({ key, label, count }) => {
              const active = filter === key;
              return (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  style={{
                    position: 'relative',
                    display: 'inline-flex',
                    alignItems: 'baseline',
                    gap: 8,
                    padding: '9px 16px 11px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'var(--pl-font-mono)',
                    fontSize: '0.54rem',
                    fontWeight: 700,
                    letterSpacing: '0.24em',
                    textTransform: 'uppercase',
                    color: active ? 'var(--pl-ink)' : 'rgba(14,13,11,0.45)',
                    transition: 'color 0.18s cubic-bezier(0.22,1,0.36,1)',
                  }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = 'var(--pl-ink-soft)'; }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = 'rgba(14,13,11,0.45)'; }}
                >
                  <span>{label}</span>
                  <span style={{
                    fontSize: '0.48rem',
                    color: active ? 'var(--pl-gold)' : 'rgba(14,13,11,0.35)',
                    letterSpacing: '0.12em',
                  }}>
                    {String(count).padStart(2, '0')}
                  </span>
                  {active && (
                    <motion.span
                      layoutId="rsvp-tab-underline"
                      style={{
                        position: 'absolute',
                        left: 12, right: 12, bottom: -1,
                        height: 2,
                        background: 'var(--pl-gold)',
                        borderRadius: 1,
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Table or empty */}
        {isEmpty ? (
          <PageCard padding="none" variant="ghost">
            <EmptyState
              size="hero"
              icon={<QrCode size={28} />}
              eyebrow="No RSVPs yet"
              title="Share your site to start collecting"
              description="Send your link or share your QR code with guests. Their responses will appear here in real time."
            />
          </PageCard>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            <PageCard padding="none" accent="olive">
              <ResponsiveTable
                columns={columns}
                rows={filtered}
                getRowKey={(g) => g.id}
                mobileTitle={(g) => g.name}
                mobileSubtitle={(g) => g.email || formatDate(g.respondedAt)}
                empty={
                  <div
                    style={{
                      padding: 40,
                      textAlign: 'center',
                      color: 'var(--pl-muted)',
                      fontSize: '0.92rem',
                    }}
                  >
                    No guests match your filters.
                  </div>
                }
              />
              <div
                style={{
                  padding: '14px 22px',
                  background: 'var(--pl-cream-deep)',
                  borderTop: '1px solid var(--pl-divider)',
                  fontFamily: 'var(--pl-font-mono)',
                  fontSize: '0.66rem',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'var(--pl-muted)',
                }}
              >
                Showing {filtered.length} of {guests.length} guests
              </div>
            </PageCard>
          </motion.div>
        )}
      </div>
    </DashboardShell>
  );
}

// Suppress unused imports
void Copy;
