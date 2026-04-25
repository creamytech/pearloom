'use client';

import { useSelectedSite } from '@/components/marketing/design/dash/hooks';
import { PaymentsPanel } from '@/components/dashboard/PaymentsPanel';

export function PaymentsDashboardClient() {
  const { site, loading } = useSelectedSite();

  if (loading) {
    return <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink-muted)' }}>Threading…</div>;
  }
  if (!site?.id) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink-soft)' }}>
        Pick a site from the sidebar first to view its payments.
      </div>
    );
  }

  return (
    <div style={{ padding: 'clamp(20px, 4vw, 40px)', maxWidth: 1200, margin: '0 auto' }}>
      <PaymentsPanel siteId={site.id} />
    </div>
  );
}
