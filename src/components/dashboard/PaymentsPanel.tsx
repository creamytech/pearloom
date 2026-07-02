'use client';

// ──────────────────────────────────────────────────────────────
// PaymentsPanel
//
// Couple-side ledger of every Stripe payment received: registry
// purchases, cash gifts, tips. Shows totals at the top and a
// reverse-chronological list below.
//
// Pearloom is the merchant of record — the couple's net amount is
// shown after our 3% platform fee. We pay the couple out
// off-platform (manual ACH) until/unless we move to Stripe Connect.
// ──────────────────────────────────────────────────────────────

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { StatStrip } from '@/components/pearloom/dash/QuietDash';

interface Payment {
  id: string;
  payerEmail: string;
  payerName: string | null;
  amountCents: number;
  currency: string;
  pearloomFeeCents: number;
  netAmountCents: number;
  paymentType: 'registry' | 'cash_gift' | 'template_subscription' | 'tip';
  registryItemId: string | null;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  message: string | null;
  createdAt: string;
}

interface Totals { gross: number; net: number; fee: number; count: number }

interface Props { siteId: string }

export function PaymentsPanel({ siteId }: Props) {
  // Tag the cached data with the siteId it came from so a
  // siteId prop change reads as "loading" without needing a
  // separate setLoading-in-effect cascade. `loading` is now
  // a derived render-time boolean (react-hooks/set-state-in-effect).
  const [data, setData] = useState<{ siteId: string; payments: Payment[]; totals: Totals } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/payments?siteId=${encodeURIComponent(siteId)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { payments: [], totals: { gross: 0, net: 0, fee: 0, count: 0 } }))
      .then((next) => {
        if (cancelled) return;
        setData({
          siteId,
          payments: next.payments ?? [],
          totals: next.totals ?? { gross: 0, net: 0, fee: 0, count: 0 },
        });
      });
    return () => { cancelled = true; };
  }, [siteId]);

  const loading = data?.siteId !== siteId;
  const payments = !loading ? data!.payments : [];
  const totals = !loading ? data!.totals : { gross: 0, net: 0, fee: 0, count: 0 };

  // No internal header — the mounting page (PaymentsDashboardClient's
  // PLHead) owns the "Gifts & payments" title.
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Quiet StatStrip (plan rule 3, plan-2 §2 payments) — the
          three 120px KPI cards showing $0.00 pre-launch collapse to
          one short chip; with money moving they read as 40px chips. */}
      <StatStrip
        items={[
          { label: 'received', value: totals.gross, display: `$${formatPrice(totals.gross / 100)}`, tone: 'sage' },
          { label: 'your net', value: totals.net, display: `$${formatPrice(totals.net / 100)}`, tone: 'gold' },
          { label: totals.count === 1 ? 'gift' : 'gifts', value: totals.count },
        ]}
      />

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-muted)' }}>Threading…</div>
      ) : payments.length === 0 ? (
        <div
          style={{
            padding: 48, textAlign: 'center', borderRadius: 16,
            background: 'var(--cream-2, #F5EFE2)',
            border: '1px dashed var(--line, rgba(61,74,31,0.18))',
            color: 'var(--ink-soft)', fontSize: 14,
          }}
        >
          Nothing yet. Payments will appear here as guests claim registry items or send cash gifts.
          <div style={{ marginTop: 12 }}>
            <Link href="/dashboard/registry" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink, #1F2418)' }}>
              Set up your registry →
            </Link>
          </div>
        </div>
      ) : (
        <div
          style={{
            background: 'var(--card, #FBF7EE)',
            border: '1px solid var(--card-ring, rgba(61,74,31,0.14))',
            borderRadius: 14, overflow: 'hidden',
          }}
        >
          <table className="pl-payments-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <thead style={{ background: 'var(--cream-2, #F5EFE2)' }}>
              <tr>
                <Th>From</Th>
                <Th>Type</Th>
                <Th align="right">Amount</Th>
                <Th align="right">Net to you</Th>
                <Th>Status</Th>
                <Th>Message</Th>
                <Th>When</Th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} style={{ borderTop: '1px solid var(--line, rgba(61,74,31,0.08))' }}>
                  <Td>
                    <div style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{p.payerName || p.payerEmail}</div>
                    {p.payerName && (
                      <div style={{ fontSize: 11, color: 'var(--ink-muted)', overflowWrap: 'anywhere' }}>{p.payerEmail}</div>
                    )}
                  </Td>
                  <Td>
                    <span style={typeStyle(p.paymentType)}>{labelFor(p.paymentType)}</span>
                  </Td>
                  <Td align="right">${formatPrice(p.amountCents / 100)}</Td>
                  <Td align="right">${formatPrice(p.netAmountCents / 100)}</Td>
                  <Td><StatusPill status={p.status} /></Td>
                  <Td>
                    {p.message ? (
                      <span title={p.message} style={{ fontStyle: 'italic', color: 'var(--ink-soft)' }}>
                        {p.message.length > 40 ? `${p.message.slice(0, 40)}…` : p.message}
                      </span>
                    ) : '—'}
                  </Td>
                  <Td>
                    <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                      {new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* Phones keep From / Amount / Status / When — the columns
          that answer "who sent what, did it land". Type (2),
          Net (4) and Message (6) hide below 760px; same media-query
          pattern as the guests roster. */}
      <style jsx>{`
        @media (max-width: 760px) {
          :global(.pl-payments-table th:nth-child(2)),
          :global(.pl-payments-table td:nth-child(2)),
          :global(.pl-payments-table th:nth-child(4)),
          :global(.pl-payments-table td:nth-child(4)),
          :global(.pl-payments-table th:nth-child(6)),
          :global(.pl-payments-table td:nth-child(6)) {
            display: none;
          }
        }
        /* Phone widths — the four surviving columns share ~350px,
           so the 14px cell gutters give their width back to content. */
        @media (max-width: 480px) {
          :global(.pl-payments-table th),
          :global(.pl-payments-table td) {
            padding-left: 8px;
            padding-right: 8px;
          }
        }
      `}</style>
    </div>
  );
}

function StatusPill({ status }: { status: Payment['status'] }) {
  const map: Record<Payment['status'], { color: string; bg: string; label: string }> = {
    paid:     { color: '#3B6C3F', bg: 'rgba(74,138,76,0.15)', label: 'Paid' },
    pending:  { color: '#8A6A2B', bg: 'rgba(196,154,111,0.18)', label: 'Pending' },
    failed:   { color: '#9B3426', bg: 'rgba(155,52,38,0.12)',  label: 'Failed' },
    refunded: { color: '#6F6557', bg: 'rgba(111,101,87,0.18)', label: 'Refunded' },
  };
  const s = map[status];
  return (
    <span
      style={{
        display: 'inline-block', padding: '2px 10px', borderRadius: 999,
        fontSize: 11, fontWeight: 600, color: s.color, background: s.bg,
      }}
    >
      {s.label}
    </span>
  );
}

function typeStyle(t: Payment['paymentType']): React.CSSProperties {
  const map: Record<Payment['paymentType'], string> = {
    registry: 'var(--peach-ink)',
    cash_gift: 'var(--sage-deep)',
    template_subscription: 'var(--ink)',
    tip: 'var(--peach-ink)',
  };
  return {
    fontSize: 11, fontWeight: 700, color: map[t], textTransform: 'uppercase', letterSpacing: '0.1em',
  };
}

function labelFor(t: Payment['paymentType']): string {
  switch (t) {
    case 'registry': return 'Registry';
    case 'cash_gift': return 'Cash gift';
    case 'template_subscription': return 'Subscription';
    case 'tip': return 'Tip';
  }
}

function Th({ children, align }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th
      style={{
        padding: '10px 14px', textAlign: align ?? 'left',
        fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
        color: 'var(--ink-muted)', fontWeight: 600,
      }}
    >
      {children}
    </th>
  );
}

function Td({ children, align }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return <td style={{ padding: '12px 14px', textAlign: align ?? 'left', verticalAlign: 'top' }}>{children}</td>;
}

function formatPrice(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
