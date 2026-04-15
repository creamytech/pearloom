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
} from 'lucide-react';
import { LoomThreadIcon } from '@/components/icons/PearloomIcons';
import Link from 'next/link';
import { formatSiteDisplayUrl } from '@/lib/site-urls';

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
        borderRadius: '999px',
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
                  style={{
                    borderBottom:
                      i < sorted.length - 1
                        ? '1px solid rgba(0,0,0,0.04)'
                        : 'none',
                  }}
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
              style={{
                padding: '1rem 1.25rem',
                borderBottom: '1px solid rgba(0,0,0,0.05)',
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
                      borderRadius: '999px',
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
                      borderRadius: '999px',
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
                      borderRadius: '999px',
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
    </>
  );
}

// ─── Meal Summary ─────────────────────────────────────────────

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
            borderRadius: '999px',
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
              borderRadius: '999px',
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
      }}
    >
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
            borderRadius: '999px',
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

      <h1
        style={{
          fontFamily: 'var(--pl-font-heading)',
          fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
          fontWeight: 700,
          color: 'var(--pl-ink)',
          marginBottom: '2rem',
          letterSpacing: '-0.02em',
        }}
      >
        Guest RSVPs
      </h1>

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
          accent: '#A3B18A',
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
