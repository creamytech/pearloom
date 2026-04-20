'use client';

import { use, useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { SiteNav } from '@/components/site-nav';
import { ThemeProvider } from '@/components/theme-provider';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Download,
  ArrowLeft,
  Music,
  X,
  Mail,
  Calendar,
} from 'lucide-react';
import { LoomThreadIcon } from '@/components/icons/PearloomIcons';
import Link from 'next/link';
import { formatSiteDisplayUrl } from '@/lib/site-urls';
import { BlurFade, GrooveBlob } from '@/components/brand/groove';

// Force dynamic since we pull live RSVP data
export const dynamic = 'force-dynamic';

// ─── Types ────────────────────────────────────────────────────

interface Guest {
  id: string;
  name: string;
  email: string | null;
  status: 'attending' | 'declined' | 'pending';
  plus_one: boolean;
  plus_one_name: string | null;
  meal_preference: string | null;
  dietary_restrictions: string | null;
  song_request: string | null;
  message: string | null;
  responded_at: string | null;
  created_at: string | null;
  rsvp_preset: string | null;
  rsvp_answers: Record<string, string> | null;
}

type SortKey = 'name' | 'status' | 'responded_at';
type SortDir = 'asc' | 'desc';

// ─── Stat Card ────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  valueColor,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  valueColor: string;
}) {
  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '1rem',
        padding: '1.5rem',
        boxShadow: '0 2px 8px rgba(43,43,43,0.07)',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
      }}
    >
      <div style={{ flexShrink: 0 }}>{icon}</div>
      <div>
        <p
          style={{
            fontSize: '0.72rem',
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--pl-muted)',
            fontFamily: 'var(--pl-font-body)',
            marginBottom: '0.25rem',
          }}
        >
          {label}
        </p>
        <p
          style={{
            fontSize: '2rem',
            fontWeight: 700,
            fontFamily: 'var(--pl-font-heading)',
            color: valueColor,
            lineHeight: 1,
          }}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────

function StatusBadge({ status }: { status: Guest['status'] }) {
  const map: Record<
    Guest['status'],
    { label: string; bg: string; color: string; icon: React.ReactNode }
  > = {
    attending: {
      label: 'Attending',
      bg: 'rgba(163,177,138,0.15)',
      color: '#6a8c5a',
      icon: <CheckCircle2 size={11} />,
    },
    declined: {
      label: 'Declined',
      bg: 'rgba(220,80,80,0.10)',
      color: '#b54a4a',
      icon: <XCircle size={11} />,
    },
    pending: {
      label: 'Pending',
      bg: 'rgba(214,198,168,0.25)',
      color: '#9a7a3a',
      icon: <Clock size={11} />,
    },
  };

  const s = map[status] ?? map.pending;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3rem',
        padding: '0.25rem 0.65rem',
        borderRadius: 'var(--pl-radius-full)',
        background: s.bg,
        color: s.color,
        fontSize: '0.72rem',
        fontWeight: 600,
        letterSpacing: '0.03em',
        fontFamily: 'var(--pl-font-body)',
      }}
    >
      {s.icon}
      {s.label}
    </span>
  );
}

// ─── CSV Export ───────────────────────────────────────────────

function exportCsv(guests: Guest[], domain: string) {
  const headers = [
    'Name',
    'Email',
    'Status',
    'Plus One',
    'Plus One Name',
    'Meal Preference',
    'Dietary Restrictions',
    'Song Request',
    'Message',
    'Responded At',
  ];

  const rows = guests.map((g) => [
    g.name ?? '',
    g.email ?? '',
    g.status ?? '',
    g.plus_one ? 'Yes' : 'No',
    g.plus_one_name ?? '',
    g.meal_preference ?? '',
    g.dietary_restrictions ?? '',
    g.song_request ?? '',
    g.message ?? '',
    g.responded_at ? new Date(g.responded_at).toLocaleString() : '',
  ]);

  const csv = [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','),
    )
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rsvps-${domain}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Guest Table ──────────────────────────────────────────────

function GuestTable({ guests, domain }: { guests: Guest[]; domain: string }) {
  const [sortKey, setSortKey] = useState<SortKey>('responded_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortKey(key);
        setSortDir('asc');
      }
    },
    [sortKey],
  );

  const sorted = [...guests].sort((a, b) => {
    let av: string;
    let bv: string;

    if (sortKey === 'responded_at') {
      av = a.responded_at ?? a.created_at ?? '';
      bv = b.responded_at ?? b.created_at ?? '';
    } else {
      av = (a[sortKey] as string) ?? '';
      bv = (b[sortKey] as string) ?? '';
    }

    const cmp = av.localeCompare(bv);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const thBtnStyle = (key: SortKey): React.CSSProperties => ({
    padding: '0.75rem 1rem',
    fontSize: '0.72rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: sortKey === key ? 'var(--pl-olive)' : 'var(--pl-muted)',
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    fontFamily: 'var(--pl-font-body)',
    background: 'transparent',
    border: 'none',
    textAlign: 'left',
    display: 'block',
    width: '100%',
  });

  const staticThStyle: React.CSSProperties = {
    padding: '0.75rem 1rem',
    fontSize: '0.72rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--pl-muted)',
    fontFamily: 'var(--pl-font-body)',
  };

  const arrow = (key: SortKey) =>
    sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  return (
    <>
      <div
        style={{
          background: '#ffffff',
          borderRadius: '1rem',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(43,43,43,0.07)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid rgba(0,0,0,0.05)',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--pl-font-heading)',
              fontSize: '1.1rem',
              fontWeight: 600,
              color: 'var(--pl-ink)',
            }}
          >
            Guest List
          </p>
          <button
            onClick={() => exportCsv(guests, domain)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              background: 'var(--pl-ink)',
              color: '#ffffff',
              fontSize: '0.8rem',
              fontWeight: 500,
              fontFamily: 'var(--pl-font-body)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>

        {/* Desktop table */}
        <div className="rsvp-desktop-table">
          <table
            style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid rgba(0,0,0,0.05)',
                  background: '#F5F1E8',
                }}
              >
                <th style={{ padding: 0 }}>
                  <button
                    style={thBtnStyle('name')}
                    onClick={() => handleSort('name')}
                  >
                    Name{arrow('name')}
                  </button>
                </th>
                <th style={staticThStyle}>Email</th>
                <th style={{ padding: 0 }}>
                  <button
                    style={thBtnStyle('status')}
                    onClick={() => handleSort('status')}
                  >
                    Status{arrow('status')}
                  </button>
                </th>
                <th style={staticThStyle}>Plus One</th>
                <th style={staticThStyle}>Meal Pref</th>
                <th style={staticThStyle}>Song Request</th>
                <th style={{ padding: 0 }}>
                  <button
                    style={thBtnStyle('responded_at')}
                    onClick={() => handleSort('responded_at')}
                  >
                    Responded{arrow('responded_at')}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((g, i) => (
                <tr
                  key={g.id}
                  onClick={() => setSelectedGuest(g)}
                  style={{
                    borderBottom:
                      i < sorted.length - 1
                        ? '1px solid rgba(0,0,0,0.04)'
                        : 'none',
                    cursor: 'pointer',
                    transition: 'background var(--pl-dur-fast) var(--pl-ease-out)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'color-mix(in oklab, var(--pl-olive) 4%, transparent)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
                >
                  <td
                    style={{
                      padding: '0.9rem 1rem',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      color: 'var(--pl-ink)',
                      fontFamily: 'var(--pl-font-body)',
                    }}
                  >
                    {g.name}
                  </td>
                  <td
                    style={{
                      padding: '0.9rem 1rem',
                      fontSize: '0.82rem',
                      color: 'var(--pl-muted)',
                      fontFamily: 'var(--pl-font-body)',
                      maxWidth: '180px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {g.email ?? <span style={{ opacity: 0.3 }}>—</span>}
                  </td>
                  <td style={{ padding: '0.9rem 1rem' }}>
                    <StatusBadge status={g.status ?? 'pending'} />
                  </td>
                  <td
                    style={{
                      padding: '0.9rem 1rem',
                      fontSize: '0.82rem',
                      color: 'var(--pl-muted)',
                      fontFamily: 'var(--pl-font-body)',
                    }}
                  >
                    {g.plus_one ? (
                      <span style={{ color: 'var(--pl-ink)', fontWeight: 500 }}>
                        {g.plus_one_name ? g.plus_one_name : 'Yes'}
                      </span>
                    ) : (
                      <span style={{ opacity: 0.3 }}>—</span>
                    )}
                  </td>
                  <td
                    style={{
                      padding: '0.9rem 1rem',
                      fontSize: '0.82rem',
                      color: 'var(--pl-muted)',
                      fontFamily: 'var(--pl-font-body)',
                    }}
                  >
                    {g.meal_preference ?? (
                      <span style={{ opacity: 0.3 }}>—</span>
                    )}
                  </td>
                  <td
                    style={{
                      padding: '0.9rem 1rem',
                      fontSize: '0.82rem',
                      color: 'var(--pl-muted)',
                      fontFamily: 'var(--pl-font-body)',
                      maxWidth: '160px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {g.song_request ?? (
                      <span style={{ opacity: 0.3 }}>—</span>
                    )}
                    <PresetAnswerChips guest={g} />
                  </td>
                  <td
                    style={{
                      padding: '0.9rem 1rem',
                      fontSize: '0.78rem',
                      color: 'var(--pl-muted)',
                      fontFamily: 'var(--pl-font-body)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {g.responded_at ? (
                      new Date(g.responded_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    ) : (
                      <span style={{ opacity: 0.3 }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="rsvp-mobile-cards">
          {sorted.map((g) => (
            <div
              key={g.id}
              onClick={() => setSelectedGuest(g)}
              style={{
                padding: '1rem 1.25rem',
                borderBottom: '1px solid rgba(0,0,0,0.05)',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.5rem',
                }}
              >
                <p
                  style={{
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    color: 'var(--pl-ink)',
                    fontFamily: 'var(--pl-font-body)',
                  }}
                >
                  {g.name}
                </p>
                <StatusBadge status={g.status ?? 'pending'} />
              </div>
              {g.email && (
                <p
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--pl-muted)',
                    fontFamily: 'var(--pl-font-body)',
                    marginBottom: '0.35rem',
                  }}
                >
                  {g.email}
                </p>
              )}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  marginTop: '0.5rem',
                }}
              >
                {g.plus_one && (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      color: 'var(--pl-muted)',
                      background: 'rgba(0,0,0,0.04)',
                      borderRadius: 'var(--pl-radius-full)',
                      padding: '0.15rem 0.6rem',
                      fontFamily: 'var(--pl-font-body)',
                    }}
                  >
                    +1{g.plus_one_name ? ` ${g.plus_one_name}` : ''}
                  </span>
                )}
                {g.meal_preference && (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      color: 'var(--pl-muted)',
                      background: 'rgba(0,0,0,0.04)',
                      borderRadius: 'var(--pl-radius-full)',
                      padding: '0.15rem 0.6rem',
                      fontFamily: 'var(--pl-font-body)',
                    }}
                  >
                    {g.meal_preference}
                  </span>
                )}
                {g.song_request && (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      color: 'var(--pl-muted)',
                      background: 'rgba(163,177,138,0.12)',
                      borderRadius: 'var(--pl-radius-full)',
                      padding: '0.15rem 0.6rem',
                      fontFamily: 'var(--pl-font-body)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    <Music size={10} />
                    {g.song_request}
                  </span>
                )}
              </div>
              <PresetAnswerChips guest={g} />
              {g.responded_at && (
                <p
                  style={{
                    fontSize: '0.72rem',
                    color: 'var(--pl-muted)',
                    opacity: 0.6,
                    marginTop: '0.5rem',
                    fontFamily: 'var(--pl-font-body)',
                  }}
                >
                  {new Date(g.responded_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .rsvp-desktop-table { display: block; }
        .rsvp-mobile-cards  { display: none; }
        @media (max-width: 680px) {
          .rsvp-desktop-table { display: none; }
          .rsvp-mobile-cards  { display: block; }
        }
      `}</style>

      {selectedGuest && (
        <GuestDetailDrawer
          guest={selectedGuest}
          onClose={() => setSelectedGuest(null)}
        />
      )}
    </>
  );
}

// ─── Guest Detail Drawer ──────────────────────────────────────
// Opens when a host clicks a row. Shows every field Pearloom has
// recorded for this guest: legacy wedding columns, preset
// answers, contact, and timeline.

function GuestDetailDrawer({
  guest,
  onClose,
}: {
  guest: Guest;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  // Merge legacy columns + preset answers into one ordered list.
  const rows: { label: string; value: React.ReactNode; mono?: boolean }[] = [];
  if (guest.plus_one) {
    rows.push({
      label: 'Plus one',
      value: guest.plus_one_name ? guest.plus_one_name : 'Yes',
    });
  }
  if (guest.meal_preference) rows.push({ label: 'Meal', value: guest.meal_preference });
  if (guest.dietary_restrictions) rows.push({ label: 'Dietary', value: guest.dietary_restrictions });
  if (guest.song_request) rows.push({ label: 'Song request', value: guest.song_request });
  if (guest.message) rows.push({ label: 'Message', value: guest.message });

  // Preset answers not already covered by legacy columns.
  const answers = guest.rsvp_answers;
  if (answers && typeof answers === 'object') {
    for (const [kind, value] of Object.entries(answers)) {
      if (typeof value !== 'string' || !value.trim()) continue;
      if (['meal', 'dietary', 'song-request', 'comments'].includes(kind)) continue;
      rows.push({
        label: PRESET_LABEL[kind] ?? kind,
        value: humanizeAnswer(kind, value),
      });
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 'var(--z-modal)',
        background: 'rgba(14,13,11,0.42)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        justifyContent: 'flex-end',
        animation: 'pl-enter-fade-in var(--pl-dur-base) var(--pl-ease-out)',
      }}
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Details for ${guest.name}`}
        style={{
          width: 'min(440px, 100%)',
          height: '100%',
          background: 'var(--pl-cream)',
          borderLeft: '1px solid var(--pl-divider)',
          overflowY: 'auto',
          padding: '32px 28px 48px',
          boxShadow: 'var(--pl-shadow-xl)',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: 18,
            right: 18,
            width: 32,
            height: 32,
            borderRadius: 'var(--pl-radius-full)',
            border: '1px solid var(--pl-divider)',
            background: 'var(--pl-cream-card)',
            color: 'var(--pl-ink)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={14} />
        </button>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div
            className="pl-overline"
            style={{ color: 'var(--pl-olive)', marginBottom: 8 }}
          >
            Guest response
          </div>
          <h2
            className="pl-display"
            style={{
              margin: 0,
              fontStyle: 'italic',
              fontSize: 'clamp(1.6rem, 3vw, 2rem)',
              color: 'var(--pl-ink)',
              lineHeight: 1.05,
            }}
          >
            {guest.name}
          </h2>
          <div style={{ marginTop: 12 }}>
            <StatusBadge status={guest.status ?? 'pending'} />
          </div>
        </div>

        {/* Contact */}
        {guest.email && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              borderRadius: 'var(--pl-radius-sm)',
              background: 'var(--pl-cream-card)',
              border: '1px solid var(--pl-divider)',
              marginBottom: 12,
              fontSize: '0.88rem',
              color: 'var(--pl-ink)',
              wordBreak: 'break-all',
            }}
          >
            <Mail size={13} color="var(--pl-muted)" />
            <a
              href={`mailto:${guest.email}`}
              style={{ color: 'inherit', textDecoration: 'none' }}
            >
              {guest.email}
            </a>
          </div>
        )}

        {/* Timeline */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            borderRadius: 'var(--pl-radius-sm)',
            background: 'var(--pl-cream-card)',
            border: '1px solid var(--pl-divider)',
            marginBottom: 24,
            fontSize: '0.82rem',
            color: 'var(--pl-muted)',
          }}
        >
          <Calendar size={13} color="var(--pl-muted)" />
          {guest.responded_at ? (
            <>
              Replied{' '}
              <span style={{ color: 'var(--pl-ink)', fontWeight: 500 }}>
                {new Date(guest.responded_at).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </span>
            </>
          ) : guest.created_at ? (
            <>
              Invited{' '}
              <span style={{ color: 'var(--pl-ink)', fontWeight: 500 }}>
                {new Date(guest.created_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>{' '}
              · awaiting reply
            </>
          ) : (
            <>No timestamp on record</>
          )}
        </div>

        {/* Preset label */}
        {guest.rsvp_preset && (
          <div
            style={{
              fontFamily: 'var(--pl-font-mono)',
              fontSize: '0.62rem',
              fontWeight: 700,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'var(--pl-olive)',
              marginBottom: 10,
            }}
          >
            {guest.rsvp_preset} preset
          </div>
        )}

        {/* Answers */}
        {rows.length === 0 ? (
          <div
            style={{
              padding: '32px 16px',
              textAlign: 'center',
              color: 'var(--pl-muted)',
              fontStyle: 'italic',
              border: '1px dashed var(--pl-divider)',
              borderRadius: 'var(--pl-radius-lg)',
              background: 'var(--pl-cream-card)',
            }}
          >
            Nothing beyond status recorded yet.
          </div>
        ) : (
          <dl style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {rows.map((row, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  padding: '12px 14px',
                  borderRadius: 'var(--pl-radius-sm)',
                  background: 'var(--pl-cream-card)',
                  border: '1px solid var(--pl-divider)',
                }}
              >
                <dt
                  style={{
                    fontFamily: 'var(--pl-font-mono)',
                    fontSize: '0.58rem',
                    fontWeight: 700,
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    color: 'var(--pl-olive)',
                  }}
                >
                  {row.label}
                </dt>
                <dd
                  style={{
                    margin: 0,
                    color: 'var(--pl-ink)',
                    fontSize: '0.95rem',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </aside>
    </div>
  );
}

// ─── Meal Summary ─────────────────────────────────────────────

// ─── Preset answer chips ─────────────────────────────────────
// Renders readable labels + values for the non-wedding RSVP
// presets (bachelor, shower, memorial, reunion, milestone,
// cultural, casual). Legacy wedding columns render elsewhere;
// this surfaces everything that lives in rsvp_answers JSONB.

const PRESET_LABEL: Record<string, string> = {
  'cost-acknowledge': 'Cost OK',
  'bed-preference':   'Bed',
  'room-preference':  'Room',
  'attending-days':   'Days',
  'allergies-med':    'Allergies / meds',
  'gift-status':      'Gift',
  'advice':           'Advice',
  'memory-share':     'Memory',
  'tshirt-size':      'T-shirt',
  'photo-upload':     'Photo',
  'plus-one':         'Plus one',
  'dietary':          'Dietary',
  'song-request':     'Song',
  'comments':         'Note',
  'meal':             'Meal',
  'attending':        'Attending',
};

function humanizeAnswer(kind: string, value: string): string {
  if (kind === 'cost-acknowledge') return value === 'yes' ? 'Yes' : '—';
  if (kind === 'attending-days') return value.split(',').filter(Boolean).join(' · ');
  if (value.length > 60) return value.slice(0, 57) + '…';
  return value;
}

function PresetAnswerChips({ guest }: { guest: Guest }) {
  // Only render when there are preset answers beyond the legacy columns.
  const answers = guest.rsvp_answers;
  if (!answers || typeof answers !== 'object') return null;
  const entries = Object.entries(answers).filter(
    ([kind, value]) =>
      typeof value === 'string' &&
      value.trim().length > 0 &&
      // Don't duplicate the chips already rendered from legacy columns.
      !['meal', 'dietary', 'song-request', 'comments'].includes(kind),
  );
  if (entries.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.4rem' }}>
      {entries.map(([kind, value]) => (
        <span
          key={kind}
          title={`${PRESET_LABEL[kind] ?? kind}: ${value}`}
          style={{
            fontSize: '0.7rem',
            color: 'var(--pl-ink-soft)',
            background: 'color-mix(in oklab, var(--pl-olive) 10%, transparent)',
            border: '1px solid color-mix(in oklab, var(--pl-olive) 22%, transparent)',
            borderRadius: 'var(--pl-radius-full)',
            padding: '0.1rem 0.55rem',
            fontFamily: 'var(--pl-font-body)',
            display: 'inline-flex',
            alignItems: 'baseline',
            gap: 6,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--pl-font-mono)',
              fontSize: '0.58rem',
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--pl-olive)',
            }}
          >
            {PRESET_LABEL[kind] ?? kind}
          </span>
          <span>{humanizeAnswer(kind, value as string)}</span>
        </span>
      ))}
    </div>
  );
}

function MealSummary({ guests }: { guests: Guest[] }) {
  const counts: Record<string, number> = {};
  for (const g of guests) {
    const pref = g.meal_preference?.trim() || 'No preference';
    counts[pref] = (counts[pref] ?? 0) + 1;
  }

  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '1rem',
        padding: '1.25rem 1.5rem',
        boxShadow: '0 2px 8px rgba(43,43,43,0.07)',
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.4rem',
      }}
    >
      <p
        style={{
          fontSize: '0.72rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--pl-muted)',
          fontFamily: 'var(--pl-font-body)',
          marginRight: '0.25rem',
          flexShrink: 0,
        }}
      >
        Meal Preferences
      </p>
      {entries.map(([label, count], i) => (
        <span
          key={label}
          style={{
            fontSize: '0.85rem',
            color: 'var(--pl-ink)',
            fontFamily: 'var(--pl-font-body)',
          }}
        >
          <strong style={{ fontWeight: 600 }}>{label}</strong>{' '}
          <span style={{ color: 'var(--pl-muted)' }}>{count}</span>
          {i < entries.length - 1 && (
            <span style={{ color: 'var(--pl-divider)', margin: '0 0.4rem' }}>·</span>
          )}
        </span>
      ))}
    </div>
  );
}

// ─── Song Playlist ────────────────────────────────────────────

function SongPlaylist({ guests }: { guests: Guest[] }) {
  const songs = guests
    .map((g) => g.song_request?.trim())
    .filter((s): s is string => !!s);

  if (songs.length === 0) return null;

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '1rem',
        padding: '1.5rem',
        boxShadow: '0 2px 8px rgba(43,43,43,0.07)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          marginBottom: '1rem',
        }}
      >
        <LoomThreadIcon size={20} color="var(--pl-olive)" />
        <h2
          style={{
            fontFamily: 'var(--pl-font-heading)',
            fontSize: '1.15rem',
            fontWeight: 600,
            color: 'var(--pl-ink)',
          }}
        >
          Your Playlist
        </h2>
        <span
          style={{
            fontSize: '0.72rem',
            color: 'var(--pl-muted)',
            background: 'rgba(0,0,0,0.04)',
            borderRadius: 'var(--pl-radius-full)',
            padding: '0.15rem 0.6rem',
            fontFamily: 'var(--pl-font-body)',
          }}
        >
          {songs.length} {songs.length === 1 ? 'song' : 'songs'}
        </span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {songs.map((song, i) => (
          <span
            key={i}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.35rem 0.85rem',
              borderRadius: 'var(--pl-radius-full)',
              background: 'rgba(163,177,138,0.12)',
              border: '1px solid rgba(163,177,138,0.25)',
              color: 'var(--pl-ink)',
              fontSize: '0.82rem',
              fontFamily: 'var(--pl-font-body)',
            }}
          >
            <Music size={12} color="var(--pl-olive)" />
            {song}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Copy Link ────────────────────────────────────────────────

function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginTop: '0.75rem',
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}
    >
      <code
        style={{
          fontSize: '0.82rem',
          background: 'rgba(0,0,0,0.05)',
          padding: '0.3rem 0.75rem',
          borderRadius: '0.5rem',
          color: 'var(--pl-ink)',
          fontFamily: 'monospace',
        }}
      >
        {url}
      </code>
      <button
        onClick={copy}
        style={{
          padding: '0.3rem 0.75rem',
          borderRadius: '0.5rem',
          background: copied ? 'var(--pl-olive)' : 'var(--pl-ink)',
          color: '#ffffff',
          fontSize: '0.78rem',
          fontWeight: 500,
          fontFamily: 'var(--pl-font-body)',
          border: 'none',
          cursor: 'pointer',
          transition: 'background 0.2s ease',
        }}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

// ─── Inner page content — receives resolved domain ────────────

function RsvpPageContent({ domain }: { domain: string }) {
  const [guests, setGuests] = useState<Guest[] | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    supabase
      .from('guests')
      .select('*')
      .eq('site_id', domain)
      .order('responded_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error('Failed to fetch RSVPs:', error);
          setGuests([]);
        } else {
          setGuests(data ?? []);
        }
      });
  }, [domain]);

  // We don't have the manifest here, so emit the legacy `/sites/{domain}`
  // URL. The proxy rewrites either form transparently.
  const siteUrl = formatSiteDisplayUrl(domain);
  const list = guests ?? [];

  const attending = list.filter((r) => r.status === 'attending');
  const declined = list.filter((r) => r.status === 'declined');
  const pending = list.filter(
    (r) => r.status === 'pending' || (r.status !== 'attending' && r.status !== 'declined'),
  );

  const hasMealPrefs = list.some((g) => g.meal_preference);
  const hasSongRequests = list.some((g) => g.song_request);

  return (
    <main
      style={{
        maxWidth: '1000px',
        margin: '0 auto',
        paddingTop: '8rem',
        paddingBottom: '4rem',
        paddingLeft: '1.5rem',
        paddingRight: '1.5rem',
        fontFamily: 'var(--pl-font-body)',
        position: 'relative',
      }}
    >
      <GrooveBlob
        palette="orchard"
        size={480}
        blur={80}
        opacity={0.2}
        style={{ position: 'absolute', top: '-100px', right: '-80px', zIndex: 0, pointerEvents: 'none' }}
      />

      {/* ── Header row ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <Link
          href="/dashboard"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: 'var(--pl-muted)',
            fontSize: '0.88rem',
            fontFamily: 'var(--pl-font-body)',
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          <ArrowLeft size={15} />
          Dashboard
        </Link>

        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0.3rem 0.9rem',
            borderRadius: 'var(--pl-radius-full)',
            background: 'rgba(163,177,138,0.12)',
            border: '1px solid rgba(163,177,138,0.25)',
            fontSize: '0.78rem',
            color: 'var(--pl-muted)',
            fontFamily: 'var(--pl-font-body)',
            letterSpacing: '0.02em',
          }}
        >
          {siteUrl}
        </span>

        <button
          onClick={() => exportCsv(list, domain)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            background: 'var(--pl-ink)',
            color: '#ffffff',
            fontSize: '0.82rem',
            fontWeight: 500,
            fontFamily: 'var(--pl-font-body)',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <Download size={14} />
          Export CSV
        </button>
      </div>

      <BlurFade>
      <h1
        style={{
          fontFamily: 'var(--pl-font-display)',
          fontStyle: 'italic',
          fontSize: 'clamp(2rem, 4.5vw, 3rem)',
          fontWeight: 400,
          color: 'var(--pl-groove-ink)',
          marginBottom: '2rem',
          letterSpacing: '-0.02em',
          fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
          position: 'relative',
          zIndex: 1,
        }}
      >
        Guest RSVPs
      </h1>
      </BlurFade>

      {/* ── Stats row ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
        className="rsvp-stats-grid"
      >
        <StatCard
          label="Total Invited"
          value={list.length}
          icon={<Users size={28} color="var(--pl-muted)" />}
          valueColor="var(--pl-ink)"
        />
        <StatCard
          label="Attending"
          value={attending.length}
          icon={<CheckCircle2 size={28} color="#6a8c5a" />}
          valueColor="#6a8c5a"
        />
        <StatCard
          label="Declined"
          value={declined.length}
          icon={<XCircle size={28} color="#b54a4a" />}
          valueColor="#b54a4a"
        />
        <StatCard
          label="Awaiting Reply"
          value={pending.length}
          icon={<Clock size={28} color="#9a7a3a" />}
          valueColor="#9a7a3a"
        />
      </div>

      <style>{`
        @media (min-width: 640px) {
          .rsvp-stats-grid {
            grid-template-columns: repeat(4, 1fr) !important;
          }
        }
        .rsvp-desktop-table { display: block; }
        .rsvp-mobile-cards  { display: none; }
        @media (max-width: 680px) {
          .rsvp-desktop-table { display: none; }
          .rsvp-mobile-cards  { display: block; }
        }
      `}</style>

      {/* ── Meal preference summary ── */}
      {hasMealPrefs && (
        <div style={{ marginBottom: '1.5rem' }}>
          <MealSummary guests={list} />
        </div>
      )}

      {/* ── Guest table or empty state ── */}
      {guests === null ? (
        /* Loading skeleton */
        <div
          style={{
            background: '#ffffff',
            borderRadius: '1rem',
            padding: '3rem 2rem',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(43,43,43,0.07)',
            marginBottom: '1.5rem',
            color: 'var(--pl-muted)',
            fontFamily: 'var(--pl-font-body)',
            fontSize: '0.9rem',
          }}
        >
          Loading guests...
        </div>
      ) : list.length === 0 ? (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '1rem',
            padding: '4rem 2rem',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(43,43,43,0.07)',
            marginBottom: '1.5rem',
          }}
        >
          <Users
            size={48}
            color="var(--pl-muted)"
            style={{ margin: '0 auto 1rem', opacity: 0.3, display: 'block' }}
          />
          <p
            style={{
              color: 'var(--pl-muted)',
              fontFamily: 'var(--pl-font-body)',
              fontSize: '1rem',
              marginBottom: '0.25rem',
            }}
          >
            No RSVPs yet. Share your site to start collecting responses.
          </p>
          <CopyLink url={`https://${siteUrl}`} />
        </div>
      ) : (
        <div style={{ marginBottom: '1.5rem' }}>
          <GuestTable guests={list} domain={domain} />
        </div>
      )}

      {/* ── Song playlist ── */}
      {hasSongRequests && <SongPlaylist guests={list} />}
    </main>
  );
}

// ─── Page Entry Point ─────────────────────────────────────────

export default function RsvpManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = use(searchParams);
  const domain = typeof params.domain === 'string' ? params.domain : undefined;

  if (!domain) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#F5F1E8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p
          style={{ color: 'var(--pl-muted)', fontFamily: 'var(--pl-font-body)' }}
        >
          No domain provided. Go back to your dashboard to view RSVPs.
        </p>
      </div>
    );
  }

  return (
    <ThemeProvider
      theme={{
        name: 'pearloom-ivory',
        fonts: { heading: 'Playfair Display', body: 'Inter' },
        colors: {
          background: '#F5F1E8',
          foreground: '#2B2B2B',
          accent: '#5C6B3F',
          accentLight: '#EEE8DC',
          muted: '#9A9488',
          cardBg: '#ffffff',
        },
        borderRadius: '1rem',
      }}
    >
      <SiteNav names={['Pearloom', 'Dashboard']} pages={[]} />
      <RsvpPageContent domain={domain} />
    </ThemeProvider>
  );
}
