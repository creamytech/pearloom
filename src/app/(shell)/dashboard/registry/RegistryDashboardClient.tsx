'use client';

import { useSelectedSite } from '@/components/marketing/design/dash/hooks';
import { RegistryItemsManager } from '@/components/dashboard/RegistryItemsManager';
import { RegistryClaimsFeed, useRegistryClaims } from '@/components/registry/RegistryClaimsFeed';
import { DashLayout } from '@/components/pearloom/dash/DashShell';
import { PLAtmosphere, PLCard } from '@/components/pearloom/dash/PLChrome';
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

  const claimsCount = claimRows?.length ?? 0;

  return (
    <DashLayout
      active="registry"
      eyebrow="Registry"
      title={
        <span>
          A list of{' '}
          <i
            style={{
              color: 'var(--peach-ink, #C6703D)',
              fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
            }}
          >
            wishes
          </i>
          .
        </span>
      }
      subtitle="Native items guests can claim — and pay for — without leaving your Pearloom site."
    >
      <PLAtmosphere />
      <div
        style={{
          padding: '0 clamp(20px, 4vw, 40px) 60px',
          maxWidth: 1180,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {loading ? (
          <PLCard tone="paper" style={{ padding: 60, textAlign: 'center' }}>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                fontSize: 18,
                color: 'var(--sage-deep)',
                fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
              }}
            >
              Threading…
            </div>
          </PLCard>
        ) : !site?.id ? (
          <PLCard tone="sage" style={{ padding: '40px 24px', textAlign: 'center' }}>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                fontSize: 22,
                color: 'var(--sage-deep)',
                fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                marginBottom: 8,
              }}
            >
              Pick a celebration first.
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--ink-soft)', maxWidth: 420, margin: '0 auto', lineHeight: 1.55 }}>
              Open the celebration switcher in the sidebar to manage its registry.
            </div>
          </PLCard>
        ) : (
          <>
            {/* Recent claims feed — same component the editor's
                Registry panel uses, just wrapped in PLCard chrome so
                it inherits the warmth of the rest of the dash.
                Hides itself when there are no claims. */}
            {claimsCount > 0 && (
              <PLCard
                tone="peach"
                title="Recent claims"
                icon="gift"
                extra={
                  <span
                    style={{
                      fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                      fontSize: 10.5,
                      fontWeight: 700,
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      color: 'var(--peach-ink, #C6703D)',
                      padding: '4px 10px',
                      borderRadius: 999,
                      background: 'rgba(255,255,255,0.55)',
                    }}
                  >
                    {claimsCount} · new
                  </span>
                }
              >
                <div
                  style={{
                    fontSize: 13.5,
                    color: 'var(--ink-soft)',
                    lineHeight: 1.55,
                    marginBottom: 14,
                  }}
                >
                  Guests who tapped &ldquo;I got this&rdquo; on your registry. Tap{' '}
                  <strong style={{ color: 'var(--peach-ink, #C6703D)' }}>Draft thank-you</strong>{' '}
                  to have Pear write a personal note.
                </div>
                <RegistryClaimsFeed
                  subdomain={subdomain}
                  items={entries}
                  manifest={manifest}
                />
              </PLCard>
            )}
            <PLCard tone="paper" noPadding style={{ padding: 22 }}>
              <RegistryItemsManager siteId={site.id} />
            </PLCard>
          </>
        )}
      </div>
    </DashLayout>
  );
}
