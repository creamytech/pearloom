'use client';

import { useSelectedSite } from '@/components/marketing/design/dash/hooks';
import { PaymentsPanel } from '@/components/dashboard/PaymentsPanel';
import { DashLayout } from '@/components/pearloom/dash/DashShell';
import { PLHead, PLCard } from '@/components/pearloom/dash/PLChrome';

export function PaymentsDashboardClient() {
  const { site, loading } = useSelectedSite();

  return (
    <DashLayout active="guests" hideTopbar>
      <div style={{ padding: 'clamp(20px, 3vw, 32px) clamp(20px, 4vw, 40px) 60px', maxWidth: 1180, margin: '0 auto' }}>
        <PLHead
          align="center"
          pre="Receiving gifts"
          title="Gifts &"
          italic="payments"
          sub="Stripe payments received through your Pearloom site — your guests' gifts, in real time."
          style={{ marginBottom: 28 }}
        />

        {loading ? (
          <PLCard style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ color: 'var(--ink-muted)', fontSize: 13.5 }}>Threading…</div>
          </PLCard>
        ) : !site?.id ? (
          <PLCard tone="peach" style={{ textAlign: 'center', padding: '32px 24px' }}>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: 20,
              fontWeight: 600,
              color: 'var(--ink)',
              marginBottom: 6,
            }}>
              Pick a site first
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
              Choose a celebration from the sidebar to view its payments.
            </div>
          </PLCard>
        ) : (
          <PaymentsPanel siteId={site.id} />
        )}
      </div>
    </DashLayout>
  );
}
