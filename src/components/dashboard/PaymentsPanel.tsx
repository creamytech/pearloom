'use client';

// ──────────────────────────────────────────────────────────────
// PaymentsLedger  (zip Payments port)
//
// The couple-side ledger of every payment received: registry
// purchases, cash gifts, tips. Presentational only — the fetch,
// totals, StatStrip and the running-total rail live in the
// mounting PaymentsDashboardClient (usePayments). This component
// renders the left "The ledger" card of the zip's two-column
// Payments screen: a mono-eyebrow header strip + one row per
// payment (who / amount / when / status).
//
// Pearloom shows the couple's net after any platform fee when
// Stripe is the processor; in launch mode there is no fee and net
// equals gross (so the `hasFee` net sub-line stays hidden). Real
// data only — the empty state is honest ("Nothing yet. Begin a
// thread.").
// ──────────────────────────────────────────────────────────────

import Link from 'next/link';
import type { CSSProperties } from 'react';

const MONO = 'var(--pl-font-mono, ui-monospace, monospace)';
const DISPLAY = 'var(--font-display, "Fraunces", Georgia, serif)';

export interface Payment {
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

export interface Totals { gross: number; net: number; fee: number; count: number }

/* Paper card chrome — the shared cockpit/quiet-dash card look
   (var(--card) on a soft hairline). padding:0 + overflow:hidden so
   the header strip and rows own their own gutters, like the zip's
   `Card padding={0}`. */
const cardChrome: CSSProperties = {
  background: 'var(--card, var(--cream-2))',
  border: '1px solid var(--line-soft)',
  borderRadius: 16,
  overflow: 'hidden',
};

export function PaymentsLedger({ payments, hasFee }: { payments: Payment[]; hasFee: boolean }) {
  return (
    <section style={cardChrome}>
      {/* Header strip — mono eyebrow with a gold leading rule (BRAND §4). */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 20px', borderBottom: '1px solid var(--line-soft)' }}>
        <span aria-hidden style={{ width: 12, height: 1, background: 'var(--pl-gold, #C19A4B)', flexShrink: 0 }} />
        <span style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
          The ledger
        </span>
      </div>

      {payments.length === 0 ? (
        <div style={{ padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontSize: 19, color: 'var(--sage-deep)', fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1', marginBottom: 8 }}>
            Nothing yet. Begin a thread.
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.55, maxWidth: 360, margin: '0 auto 14px' }}>
            Gifts land here as guests claim registry items or send a little something.
          </div>
          <Link href="/dashboard/registry" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--peach-ink, #C6703D)', textDecoration: 'none' }}>
            Set up your registry →
          </Link>
        </div>
      ) : (
        <div>
          {payments.map((p, i) => (
            <div key={p.id} className="pl-pay-row" style={{ borderTop: i ? '1px solid var(--line-soft)' : 'none' }}>
              <div className="pl-pay-who" style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', overflowWrap: 'anywhere' }}>
                  {p.payerName || p.payerEmail}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', overflowWrap: 'anywhere' }}>
                  {labelFor(p.paymentType)}
                  {p.message ? ` · ${p.message.length > 46 ? `${p.message.slice(0, 46)}…` : p.message}` : ''}
                </div>
              </div>
              <div className="pl-pay-amt">
                <span style={{ fontFamily: DISPLAY, fontSize: 18, color: 'var(--ink)' }}>${formatPrice(p.amountCents / 100)}</span>
                {hasFee && p.status === 'paid' ? (
                  <span style={{ display: 'block', fontFamily: MONO, fontSize: 10.5, color: 'var(--ink-muted)', marginTop: 2 }}>
                    net ${formatPrice(p.netAmountCents / 100)}
                  </span>
                ) : null}
              </div>
              <span className="pl-pay-when" style={{ fontFamily: MONO, fontSize: 11.5, color: 'var(--ink-muted)' }}>
                {new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <span className="pl-pay-status">
                <StatusPill status={p.status} />
              </span>
            </div>
          ))}
        </div>
      )}

      {/* The row is a 4-column grid on desktop. On phones it folds to
          two columns: who + status on the first line, amount + date on
          the second — the four facts that answer "who sent what, when,
          did it land". */}
      <style jsx>{`
        :global(.pl-pay-row) {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(96px, auto) minmax(84px, auto) minmax(88px, auto);
          gap: 14px;
          align-items: center;
          padding: 14px 20px;
        }
        :global(.pl-pay-amt) { text-align: right; }
        :global(.pl-pay-when) { text-align: right; white-space: nowrap; }
        :global(.pl-pay-status) { justify-self: end; }
        @media (max-width: 600px) {
          :global(.pl-pay-row) { grid-template-columns: minmax(0, 1fr) auto; row-gap: 6px; }
          :global(.pl-pay-who) { grid-column: 1; grid-row: 1; }
          :global(.pl-pay-status) { grid-column: 2; grid-row: 1; }
          :global(.pl-pay-amt) { grid-column: 1; grid-row: 2; text-align: left; }
          :global(.pl-pay-when) { grid-column: 2; grid-row: 2; align-self: center; }
        }
      `}</style>
    </section>
  );
}

function StatusPill({ status }: { status: Payment['status'] }) {
  const map: Record<Payment['status'], { color: string; bg: string; label: string }> = {
    paid:     { color: 'var(--sage-deep, #3B6C3F)', bg: 'var(--sage-tint, rgba(74,138,76,0.15))', label: 'Paid' },
    pending:  { color: '#8A6A2E', bg: 'rgba(193,154,75,0.16)', label: 'Pending' },
    failed:   { color: 'var(--pl-plum, #9B3426)', bg: 'rgba(155,52,38,0.12)', label: 'Failed' },
    refunded: { color: 'var(--ink-muted, #6F6557)', bg: 'var(--cream-3, rgba(111,101,87,0.18))', label: 'Refunded' },
  };
  const s = map[status];
  return (
    <span
      style={{
        display: 'inline-block', padding: '3px 10px', borderRadius: 999,
        fontFamily: MONO, fontSize: 9, letterSpacing: '0.06em', textTransform: 'uppercase',
        fontWeight: 600, color: s.color, background: s.bg, whiteSpace: 'nowrap',
      }}
    >
      {s.label}
    </span>
  );
}

function labelFor(t: Payment['paymentType']): string {
  switch (t) {
    case 'registry': return 'Registry';
    case 'cash_gift': return 'Cash gift';
    case 'template_subscription': return 'Subscription';
    case 'tip': return 'Tip';
  }
}

function formatPrice(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
