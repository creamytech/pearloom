'use client';

import { useSelectedSite } from '@/components/marketing/design/dash/hooks';
import { PaymentsPanel } from '@/components/dashboard/PaymentsPanel';
import { DashLayout } from '@/components/pearloom/dash/DashShell';

export function PaymentsDashboardClient() {
  const { site, loading } = useSelectedSite();

  return (
    <DashLayout
      active="payments"
      title="Gifts & payments"
      subtitle="Stripe payments received through your Pearloom site — your guests' gifts, in real time."
    >
      <div style={{ padding: 'clamp(20px, 4vw, 40px)', maxWidth: 1200, margin: '0 auto' }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink-muted)' }}>Threading…</div>
        ) : !site?.id ? (
          <div
            style={{
              padding: '40px 24px',
              textAlign: 'center',
              color: 'var(--ink-soft)',
              border: '1px dashed var(--line-soft)',
              borderRadius: 16,
              background: 'var(--cream-2)',
            }}
          >
            Pick a site from the sidebar first to view its payments.
          </div>
        ) : (
          <PaymentsPanel siteId={site.id} />
        )}
      </div>
    </DashLayout>
  );
}
