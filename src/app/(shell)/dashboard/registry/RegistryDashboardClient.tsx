'use client';

import { useSelectedSite } from '@/components/marketing/design/dash/hooks';
import { RegistryItemsManager } from '@/components/dashboard/RegistryItemsManager';
import { DashLayout } from '@/components/pearloom/dash/DashShell';

export function RegistryDashboardClient() {
  const { site, loading } = useSelectedSite();

  return (
    <DashLayout
      active="registry"
      title="Registry"
      subtitle="Native items guests can claim — and pay for — without leaving your Pearloom site."
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
            Pick a site from the sidebar first to manage its registry.
          </div>
        ) : (
          <RegistryItemsManager siteId={site.id} />
        )}
      </div>
    </DashLayout>
  );
}
