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

import { useEffect, useState } from 'react';

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
  const [payments, setPayments] = useState<Payment[]>([]);
  const [totals, setTotals] = useState<Totals>({ gross: 0, net: 0, fee: 0, count: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/payments?siteId=${encodeURIComponent(siteId)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { payments: [], totals: { gross: 0, net: 0, fee: 0, count: 0 } }))
      .then((data) => {
        setPayments(data.payments ?? []);
        setTotals(data.totals ?? { gross: 0, net: 0, fee: 0, count: 0 });
      })
      .finally(() => setLoading(false));
  }, [siteId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <header>
        <h2 style={{ fontFamily: 'var(--pl-font-display, Georgia, serif)', fontSize: 28, margin: 0 }}>
          Gifts & payments
        </h2>
        <div style={{ fontSize: 13, color: 'var(--ink-muted)', marginTop: 4 }}>
          Every payment that came through your site, with totals.
        </div>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
        }}
      >
        <Stat label="Total received" value={`$${formatPrice(totals.gross / 100)}`} sub={`${totals.count} ${totals.count === 1 ? 'gift' : 'gifts'}`} />
        <Stat label="Your net" value={`$${formatPrice(totals.net / 100)}`} sub="After platform fee" />
        <Stat label="Platform fee" value={`$${formatPrice(totals.fee / 100)}`} sub="3% of gross" muted />
      </div>

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
        </div>
      ) : (
        <div
          style={{
            background: 'var(--card, #FBF7EE)',
            border: '1px solid var(--card-ring, rgba(61,74,31,0.14))',
            borderRadius: 14, overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
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
                    <div style={{ fontWeight: 600 }}>{p.payerName || p.payerEmail}</div>
                    {p.payerName && (
                      <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{p.payerEmail}</div>
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
    </div>
  );
}

function Stat({ label, value, sub, muted }: { label: string; value: string; sub?: string; muted?: boolean }) {
  return (
    <div
      style={{
        background: 'var(--card, #FBF7EE)',
        border: '1px solid var(--card-ring, rgba(61,74,31,0.14))',
        borderRadius: 12, padding: 16,
        opacity: muted ? 0.85 : 1,
      }}
    >
      <div style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--ink-muted)', fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--pl-font-display, Georgia, serif)', fontSize: 28, marginTop: 6, color: 'var(--ink)' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 2 }}>{sub}</div>}
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
