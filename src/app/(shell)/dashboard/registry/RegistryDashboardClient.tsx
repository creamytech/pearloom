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
          /* v2 Registry — gift manager (left) + a sticky sidebar:
             registry stats (real counts) over the thank-yous /
             claims feed. Collapses to one column on narrow widths. */
          <div className="pd-registry" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px', gap: 22, alignItems: 'flex-start' }}>
            <PLCard tone="paper" noPadding style={{ padding: 22 }}>
              <RegistryItemsManager siteId={site.id} />
            </PLCard>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 86 }}>
              {/* Registry stats — real listed / claimed / still-open. */}
              <PLCard tone="paper" title="The registry">
                {([['Listed', entries.length], ['Claimed', claimsCount], ['Still open', Math.max(0, entries.length - claimsCount)]] as const).map(([l, v]) => (
                  <div key={l} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '5px 0' }}>
                    <span style={{ fontSize: 13, color: 'var(--ink)' }}>{l}</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--ink)' }}>{v}</span>
                  </div>
                ))}
                <div style={{ fontSize: 12, color: 'var(--ink-muted)', lineHeight: 1.5, marginTop: 6 }}>
                  Cash funds settle straight to your account. No fees on gifts.
                </div>
              </PLCard>
              {/* Thank-yous / recent claims — the editor's component,
                  in the sidebar. Hides itself when there are none. */}
              {claimsCount > 0 && (
                <PLCard
                  tone="peach"
                  title="Thank-yous"
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
                  <div style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.55, marginBottom: 14 }}>
                    Guests who tapped &ldquo;I got this.&rdquo; Tap{' '}
                    <strong style={{ color: 'var(--peach-ink, #C6703D)' }}>Draft thank-you</strong>{' '}
                    and Pear writes a personal note.
                  </div>
                  <RegistryClaimsFeed
                    subdomain={subdomain}
                    items={entries}
                    manifest={manifest}
                  />
                </PLCard>
              )}
            </div>
          </div>
        )}
      </div>
      <style jsx>{`
        @media (max-width: 1000px) {
          :global(.pd-registry) {
            grid-template-columns: 1fr !important;
          }
          :global(.pd-registry > div:last-child) {
            position: static !important;
          }
        }
      `}</style>
    </DashLayout>
  );
}
