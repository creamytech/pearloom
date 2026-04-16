'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / dashboard/VendorBookingsPanel.tsx
//
// Host-side view of vendor inquiries / bookings. Lists bookings,
// shows status, and offers a "Pay deposit" action that redirects
// to a Stripe Checkout session.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';

interface Booking {
  id: string;
  status: string;
  total_cents: number | null;
  deposit_cents: number | null;
  pearloom_fee_cents: number | null;
  notes: string | null;
  created_at: string;
  vendor: {
    name: string;
    category: string;
    city: string | null;
    slug: string;
  } | null;
}

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  inquiry: { bg: '#F0EBE0', fg: '#6B7F5E' },
  proposal_sent: { bg: '#FDF6E3', fg: '#C4A96A' },
  accepted: { bg: '#E9F1E1', fg: '#6B7F5E' },
  deposit_paid: { bg: '#DFEAD6', fg: '#3F5233' },
  paid: { bg: '#DFEAD6', fg: '#3F5233' },
  completed: { bg: '#D4E5C6', fg: '#334A24' },
  cancelled: { bg: '#FFE5E5', fg: '#B94A4A' },
};

function dollars(cents: number | null): string {
  if (cents === null || cents === undefined) return '—';
  return `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function VendorBookingsPanel({ siteId }: { siteId: string }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/marketplace/bookings?siteId=${siteId}`);
      const data = await r.json();
      if (!r.ok) setError(data.error ?? 'Failed to load');
      else setBookings(data.bookings ?? []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => { void load(); }, [load]);

  const payDeposit = async (bookingId: string) => {
    setCheckingOut(bookingId);
    try {
      const r = await fetch(`/api/marketplace/bookings/${bookingId}/checkout`, {
        method: 'POST',
      });
      const data = await r.json();
      if (r.ok && data.url) {
        window.location.href = data.url as string;
      } else {
        setError(data.error ?? 'Checkout failed');
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setCheckingOut(null);
    }
  };

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{
          margin: 0,
          fontFamily: 'Playfair Display, serif',
          fontSize: '1.25rem',
        }}>
          Vendor bookings
        </h3>
        <a
          href="/marketplace?tab=vendors"
          style={{
            fontSize: '0.75rem',
            color: '#6B7F5E',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          Browse vendors →
        </a>
      </div>

      {error && <div style={{ padding: '0.6rem', color: '#B94A4A', fontSize: '0.85rem' }}>{error}</div>}
      {loading && <div style={{ opacity: 0.6, fontSize: '0.9rem' }}>Loading…</div>}
      {!loading && bookings.length === 0 && (
        <div style={{
          padding: '1.5rem',
          background: '#FFFFFF',
          border: '1px dashed #EEE8DC',
          borderRadius: '0.75rem',
          textAlign: 'center',
        }}>
          <p style={{ margin: 0, marginBottom: '0.5rem', fontSize: '0.9rem', color: '#3D3530' }}>
            No bookings yet.
          </p>
          <p style={{ margin: 0, fontSize: '0.78rem', color: '#9A9488' }}>
            Start inquiries from the marketplace or let the Director agent suggest vendors.
          </p>
        </div>
      )}

      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {bookings.map((b) => {
          const status = STATUS_COLORS[b.status] ?? STATUS_COLORS.inquiry;
          const canPay = (b.status === 'inquiry' || b.status === 'proposal_sent' || b.status === 'accepted')
            && (b.deposit_cents ?? b.total_cents ?? 0) >= 100;
          return (
            <li key={b.id} style={{
              padding: '1rem 1.25rem',
              background: '#FFFFFF',
              border: '1px solid #EEE8DC',
              borderRadius: '0.75rem',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '0.5rem',
                marginBottom: '0.5rem',
                flexWrap: 'wrap',
              }}>
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {b.vendor?.name ?? 'Vendor'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#9A9488', textTransform: 'capitalize' }}>
                    {b.vendor?.category ?? '—'}
                    {b.vendor?.city ? ` · ${b.vendor.city}` : ''}
                  </div>
                </div>
                <span style={{
                  padding: '0.2rem 0.6rem',
                  borderRadius: '999px',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                  background: status.bg,
                  color: status.fg,
                  alignSelf: 'flex-start',
                }}>
                  {b.status.replace('_', ' ')}
                </span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.5rem',
                fontSize: '0.78rem',
                color: '#3D3530',
                marginBottom: b.notes ? '0.6rem' : '0.8rem',
              }}>
                <div>
                  <div style={metaLabel}>Total</div>
                  <div style={metaValue}>{dollars(b.total_cents)}</div>
                </div>
                <div>
                  <div style={metaLabel}>Deposit</div>
                  <div style={metaValue}>{dollars(b.deposit_cents)}</div>
                </div>
                <div>
                  <div style={metaLabel}>Platform fee</div>
                  <div style={metaValue}>{dollars(b.pearloom_fee_cents)}</div>
                </div>
              </div>

              {b.notes && (
                <p style={{
                  fontSize: '0.82rem',
                  lineHeight: 1.5,
                  margin: '0 0 0.75rem',
                  opacity: 0.85,
                }}>
                  {b.notes}
                </p>
              )}

              {canPay && (
                <button
                  type="button"
                  onClick={() => void payDeposit(b.id)}
                  disabled={checkingOut === b.id}
                  style={{
                    padding: '0.5rem 1.1rem',
                    background: checkingOut === b.id ? '#CFC9BC' : '#A3B18A',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '999px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: checkingOut === b.id ? 'not-allowed' : 'pointer',
                  }}
                >
                  {checkingOut === b.id ? 'Opening Stripe…' : `Pay deposit ${dollars(b.deposit_cents ?? b.total_cents)}`}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const metaLabel: React.CSSProperties = {
  fontSize: '0.6rem',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: '#9A9488',
  marginBottom: '0.15rem',
};
const metaValue: React.CSSProperties = {
  fontSize: '0.85rem',
  fontWeight: 600,
};
