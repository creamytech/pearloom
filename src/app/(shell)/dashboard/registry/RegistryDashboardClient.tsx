'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSelectedSite } from '@/components/marketing/design/dash/hooks';
import { RegistryItemsManager } from '@/components/dashboard/RegistryItemsManager';
import { RegistryClaimsFeed, useRegistryClaims, type ClaimRow } from '@/components/registry/RegistryClaimsFeed';
import { DashLayout } from '@/components/pearloom/dash/DashShell';
import { PLAtmosphere, PLCard } from '@/components/pearloom/dash/PLChrome';
import type { StoryManifest } from '@/types';

/* Native-item side of the ledger — the items the host listed plus
   every reservation / paid purchase on them. Complements
   useRegistryClaims (link-out store claims) so the stats + feed
   count ONE combined registry, not two silos. */
interface ItemClaim {
  id: string;
  itemId: string;
  itemName: string;
  payerName: string | null;
  payerEmail: string;
  quantity: number;
  amountCents: number;
  status: string;
  message: string | null;
  createdAt: string;
  kind: 'reserved' | 'paid';
}

function useItemLedger(siteId: string | undefined) {
  const [itemCount, setItemCount] = useState(0);
  const [itemClaims, setItemClaims] = useState<ItemClaim[]>([]);

  useEffect(() => {
    if (!siteId) return;
    let cancelled = false;
    void fetch(`/api/registry-items?siteId=${encodeURIComponent(siteId)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { items?: unknown[] } | null) => {
        if (!cancelled && Array.isArray(d?.items)) setItemCount(d.items.length);
      })
      .catch(() => { /* silent */ });
    void fetch(`/api/registry-items/claims?siteId=${encodeURIComponent(siteId)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { claims?: ItemClaim[] } | null) => {
        if (!cancelled && Array.isArray(d?.claims)) setItemClaims(d.claims);
      })
      .catch(() => { /* silent */ });
    return () => { cancelled = true; };
  }, [siteId]);

  return { itemCount, itemClaims };
}

export function RegistryDashboardClient() {
  const { site, loading } = useSelectedSite();
  const subdomain = site?.domain ?? '';
  // Read claims for the section header. Hides the whole panel
  // when there's nothing to show.
  const { rows: claimRows } = useRegistryClaims(subdomain || undefined);
  const { itemCount, itemClaims } = useItemLedger(site?.id);

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

  /* One ledger — native-item reservations / purchases shaped as
     ClaimRows (kind chip + item label) so RegistryClaimsFeed can
     merge them with the link claims chronologically. */
  const itemClaimRows: ClaimRow[] = itemClaims.map((c) => ({
    id: c.id,
    entry_url: '',
    claimer_name: c.payerName,
    claimer_email: c.payerEmail,
    message: c.message,
    quantity: c.quantity,
    created_at: c.createdAt,
    kind: c.kind,
    itemLabel: c.itemName,
  }));

  /* Total gifts = link claims + item reservations/purchases. */
  const totalGifts = claimsCount + itemClaims.length;

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
                {/* Combined counts — link-out entries + native items,
                    link claims + item reservations/purchases. */}
                {([['Listed', entries.length + itemCount], ['Claimed', totalGifts], ['Still open', Math.max(0, entries.length + itemCount - totalGifts)]] as const).map(([l, v]) => (
                  <div key={l} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '5px 0' }}>
                    <span style={{ fontSize: 13, color: 'var(--ink)' }}>{l}</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--ink)' }}>{v}</span>
                  </div>
                ))}
                <div style={{ fontSize: 12, color: 'var(--ink-muted)', lineHeight: 1.5, marginTop: 6 }}>
                  Cash funds settle straight to your account. No fees on gifts.
                </div>
                <Link
                  href="/dashboard/payments"
                  style={{
                    display: 'inline-block',
                    marginTop: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--peach-ink, #C6703D)',
                    textDecoration: 'none',
                  }}
                >
                  See payments →
                </Link>
              </PLCard>
              {/* Thank-yous / recent claims — the editor's component,
                  in the sidebar. Hides itself when there are none. */}
              {totalGifts > 0 && (
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
                      {totalGifts} · new
                    </span>
                  }
                >
                  <div style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.55, marginBottom: 14 }}>
                    Every gift in one thread — reservations, purchases,
                    and &ldquo;I got this&rdquo; link claims. Tap{' '}
                    <strong style={{ color: 'var(--peach-ink, #C6703D)' }}>Draft thank-you</strong>{' '}
                    and Pear writes a personal note.
                  </div>
                  <RegistryClaimsFeed
                    subdomain={subdomain}
                    items={entries}
                    manifest={manifest}
                    extraClaims={itemClaimRows}
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
