'use client';

import { useSelectedSite } from '@/components/marketing/design/dash/hooks';
import { PaymentsPanel } from '@/components/dashboard/PaymentsPanel';
import { DashLayout } from '@/components/pearloom/dash/DashShell';
import { PLCard } from '@/components/pearloom/dash/PLChrome';
import { PageIntro } from '@/components/pearloom/dash/QuietDash';

export function PaymentsDashboardClient() {
  const { site, loading } = useSelectedSite();

  return (
    <DashLayout active="guests" hideTopbar>
      <div style={{ padding: '16px clamp(20px, 4vw, 40px) 60px', maxWidth: 1180, margin: '0 auto' }}>
        {/* Quiet header (plan rule 1): one line; the Stripe prose
            is gone — the panel's empty state explains itself. */}
        <PageIntro
          eyebrow="Receiving gifts"
          title="Gifts & payments."
          style={{ marginBottom: 18 }}
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
