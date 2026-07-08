'use client';

// ──────────────────────────────────────────────────────────────
// PaymentsDashboardClient  (zip Payments port)
//
// The money ledger — every gift / registry purchase / cash gift
// received, a running total, and the honest "Pearloom never
// touches the money" note. Restyled to the zip's two-column
// Payments screen (docs handoff): the ledger card leads the
// content column, a sticky 300px rail carries the running total +
// the money note. Mirrors RegistryDashboardClient's house
// composition (DashLayout + PLAtmosphere + PageIntro + StatStrip +
// RailCard).
//
// The `/api/payments` fetch is preserved verbatim — lifted here
// into usePayments so the header StatStrip and the rail read one
// call. Real data only; empty inputs render honest states.
// ──────────────────────────────────────────────────────────────

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSelectedSite } from '@/components/marketing/design/dash/hooks';
import { EmptyShell } from '@/components/marketing/design/dash/DashShell';
import { PaymentsLedger, type Payment, type Totals } from '@/components/dashboard/PaymentsPanel';
import { DashLayout } from '@/components/pearloom/dash/DashShell';
import { PLAtmosphere, PLCard } from '@/components/pearloom/dash/PLChrome';
import { PageIntro, StatStrip, RailCard, type StatStripItem } from '@/components/pearloom/dash/QuietDash';

const DISPLAY = 'var(--font-display, "Fraunces", Georgia, serif)';
const LETTERPRESS = '"opsz" 144, "SOFT" 80, "WONK" 1';

const EMPTY_TOTALS: Totals = { gross: 0, net: 0, fee: 0, count: 0 };

/* Tag the cached data with the siteId it came from so a siteId
   change reads as "loading" without a setState-in-effect cascade —
   `ready` is a render-time boolean (react-hooks/set-state-in-effect,
   React-Compiler safe). Same shape the old PaymentsPanel used. */
function usePayments(siteId: string | undefined) {
  const [data, setData] = useState<{ siteId: string; payments: Payment[]; totals: Totals } | null>(null);

  useEffect(() => {
    if (!siteId) return;
    let cancelled = false;
    void fetch(`/api/payments?siteId=${encodeURIComponent(siteId)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { payments: [], totals: EMPTY_TOTALS }))
      .then((next: { payments?: Payment[]; totals?: Totals }) => {
        if (cancelled) return;
        setData({ siteId, payments: next.payments ?? [], totals: next.totals ?? EMPTY_TOTALS });
      })
      .catch(() => {
        if (!cancelled) setData({ siteId, payments: [], totals: EMPTY_TOTALS });
      });
    return () => { cancelled = true; };
  }, [siteId]);

  const ready = !!siteId && data?.siteId === siteId;
  return {
    payments: ready ? data!.payments : [],
    totals: ready ? data!.totals : EMPTY_TOTALS,
    ready,
  };
}

function money(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function PaymentsDashboardClient() {
  const { site, loading } = useSelectedSite();
  const { payments, totals, ready } = usePayments(site?.id);
  const hasFee = totals.fee > 0;

  // Quiet StatStrip (plan rule 3) — received / your net (only when a
  // platform fee applies) / gifts as 40px chips; zeros collapse.
  const statItems: StatStripItem[] = [
    { label: 'received', value: totals.gross, display: money(totals.gross), tone: 'sage' },
    ...(hasFee ? [{ label: 'your net', value: totals.net, display: money(totals.net), tone: 'gold' as const }] : []),
    { label: totals.count === 1 ? 'gift' : 'gifts', value: totals.count },
  ];

  const showLedger = !loading && !!site?.id && ready;

  return (
    <DashLayout active="guests" hideTopbar>
      <PLAtmosphere />

      {/* Quiet header (plan rule 1): mono eyebrow + one letterpress line
          + the StatStrip. */}
      <div style={{ padding: '16px clamp(20px, 4vw, 40px) 0', maxWidth: 1180, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <PageIntro
          eyebrow="Gifts & payments"
          title={
            <span>
              Every gift, in one{' '}
              <i style={{ color: 'var(--peach-ink, #C6703D)', fontVariationSettings: LETTERPRESS }}>ledger</i>.
            </span>
          }
          meta={showLedger ? <StatStrip items={statItems} /> : undefined}
          style={{ marginBottom: 16 }}
        />
      </div>

      <div
        style={{
          padding: '0 clamp(20px, 4vw, 40px) 60px',
          maxWidth: 1180,
          margin: '0 auto',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {loading || (site?.id && !ready) ? (
          <PLCard tone="paper" style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontSize: 18, color: 'var(--sage-deep)', fontVariationSettings: LETTERPRESS }}>
              Threading…
            </div>
          </PLCard>
        ) : !site?.id ? (
          <EmptyShell
            inline
            cta={null}
            message="Pick a celebration first — the switcher in the sidebar shows its gifts and payments."
          />
        ) : (
          /* Zip Payments shape: the ledger card leads the content
             column; the sticky rail carries the running total + the
             money note. Collapses to one column on narrow widths. */
          <div className="pd-payments" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 22, alignItems: 'flex-start' }}>
            <div style={{ minWidth: 0 }}>
              <PaymentsLedger payments={payments} hasFee={hasFee} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 86 }}>
              {/* The zip's rail card — the running total as a big
                  Fraunces number, then the after-fee net when it
                  applies. Real, tallied from paid rows. */}
              <RailCard title="Received">
                <div style={{ fontFamily: DISPLAY, fontSize: 36, lineHeight: 1, color: 'var(--ink)' }}>
                  {money(totals.gross)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 4 }}>
                  {totals.count === 0
                    ? 'Nothing received yet'
                    : `across ${totals.count} ${totals.count === 1 ? 'gift' : 'gifts'}`}
                </div>
                {hasFee ? (
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '8px 0 0', marginTop: 10, borderTop: '1px solid var(--line-soft)' }}>
                    <span style={{ fontSize: 13, color: 'var(--sage-deep)' }}>Your net</span>
                    <span style={{ fontFamily: DISPLAY, fontSize: 22, color: 'var(--ink)' }}>{money(totals.net)}</span>
                  </div>
                ) : null}
              </RailCard>

              {/* The honest money note — where the zip has it. */}
              <div style={{ background: 'var(--cream-2)', border: '1px solid var(--line-soft)', borderRadius: 16, padding: '16px 18px' }}>
                <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.55 }}>
                  Gifts settle straight to you — Pearloom keeps the ledger, never the money. Amounts are as shared by your guests.
                </div>
                <Link
                  href="/dashboard/registry"
                  style={{ display: 'inline-block', marginTop: 10, fontSize: 12, fontWeight: 700, color: 'var(--peach-ink, #C6703D)', textDecoration: 'none' }}
                >
                  Manage your registry →
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @media (max-width: 1000px) {
          :global(.pd-payments) {
            grid-template-columns: 1fr !important;
          }
          :global(.pd-payments > div:last-child) {
            position: static !important;
          }
        }
      `}</style>
    </DashLayout>
  );
}
