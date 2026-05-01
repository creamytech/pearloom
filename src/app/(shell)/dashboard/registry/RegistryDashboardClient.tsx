'use client';

import { useSelectedSite } from '@/components/marketing/design/dash/hooks';
import { RegistryItemsManager } from '@/components/dashboard/RegistryItemsManager';
import { RegistryClaimsFeed, useRegistryClaims } from '@/components/registry/RegistryClaimsFeed';
import { DashLayout } from '@/components/pearloom/dash/DashShell';
import type { StoryManifest } from '@/types';

export function RegistryDashboardClient() {
  const { site, loading } = useSelectedSite();
  const subdomain = site?.domain ?? '';
  // Read claims for the section header. Hides the whole panel
  // when there's nothing to show.
  const { rows: claimRows } = useRegistryClaims(subdomain || undefined);

  // Pull manifest off the site summary so RegistryClaimsFeed has
  // access to couple names + occasion + entries for the
  // "Draft thank-you" Pear flow.
  const manifest = (site?.manifest as StoryManifest | undefined) ?? ({} as StoryManifest);
  const entries = (() => {
    const reg = (manifest as unknown as { registry?: unknown }).registry;
    if (Array.isArray(reg)) return reg as Array<{ url?: string; name?: string; label?: string }>;
    if (reg && typeof reg === 'object') {
      const r = reg as { entries?: Array<{ url?: string; name?: string; label?: string }> };
      return Array.isArray(r.entries) ? r.entries : [];
    }
    return [];
  })();

  return (
    <DashLayout
      active="registry"
      title="Registry"
      subtitle="Native items guests can claim — and pay for — without leaving your Pearloom site."
    >
      <div style={{ padding: '0 clamp(20px, 4vw, 40px) 32px', maxWidth: 1240, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
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
          <>
            {/* Recent claims feed — same component the editor's
                Registry panel uses, just wrapped in dashboard chrome
                instead of PanelSection. Hides itself when there are
                no claims. Hosts who only ever open the dashboard
                (not the editor) can still see + thank claimers. */}
            {claimRows && claimRows.length > 0 && (
              <section
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--line-soft)',
                  borderRadius: 16,
                  padding: 24,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{
                      fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                      fontSize: 10.5,
                      fontWeight: 700,
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      color: 'var(--peach-ink, #C6703D)',
                      marginBottom: 4,
                    }}>
                      Recent claims · {claimRows.length}
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
                      Guests who tapped &ldquo;I got this&rdquo; on your registry. Tap{' '}
                      <strong style={{ color: 'var(--peach-ink, #C6703D)' }}>Draft thank-you</strong>{' '}
                      to have Pear write a personal note.
                    </div>
                  </div>
                </div>
                <RegistryClaimsFeed
                  subdomain={subdomain}
                  items={entries}
                  manifest={manifest}
                />
              </section>
            )}
            <RegistryItemsManager siteId={site.id} />
          </>
        )}
      </div>
    </DashLayout>
  );
}
