'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useSelectedSite } from '@/components/marketing/design/dash/hooks';
import { RegistryItemsManager } from '@/components/dashboard/RegistryItemsManager';
import { RegistryClaimsFeed, useRegistryClaims, type ClaimRow } from '@/components/registry/RegistryClaimsFeed';
import { formatCents } from '@/lib/registry-funds';
import { DashLayout } from '@/components/pearloom/dash/DashShell';
import { PLAtmosphere, PLCard } from '@/components/pearloom/dash/PLChrome';
import { PageIntro, StatStrip, HintChip, RailCard, type StatStripItem } from '@/components/pearloom/dash/QuietDash';
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
  thankedAt?: string | null;
}

/* Honor-ledger side — "gave directly" pledges from the R2-lite
   fund card (/api/gift-pledges host view). Amounts are the
   guest's own claim, host-visible only. */
interface PledgeRow {
  id: string;
  guestName: string;
  amountCents: number | null;
  note: string | null;
  createdAt: string;
  itemName: string | null;
  thankedAt?: string | null;
}

function useItemLedger(siteId: string | undefined) {
  const [itemCount, setItemCount] = useState(0);
  const [itemClaims, setItemClaims] = useState<ItemClaim[]>([]);
  const [pledges, setPledges] = useState<PledgeRow[]>([]);

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
    void fetch(`/api/gift-pledges?siteId=${encodeURIComponent(siteId)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { pledges?: PledgeRow[] } | null) => {
        if (!cancelled && Array.isArray(d?.pledges)) setPledges(d.pledges);
      })
      .catch(() => { /* silent */ });
    return () => { cancelled = true; };
  }, [siteId]);

  return { itemCount, itemClaims, pledges };
}

export function RegistryDashboardClient() {
  const { site, loading } = useSelectedSite();
  const subdomain = site?.domain ?? '';
  // Read claims for the section header. Hides the whole panel
  // when there's nothing to show.
  const { rows: claimRows } = useRegistryClaims(subdomain || undefined);
  const { itemCount, itemClaims, pledges } = useItemLedger(site?.id);

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
    thankedAt: c.thankedAt ?? null,
  }));

  /* "Gave directly" pledges (honor ledger) shaped as ClaimRows —
     amount rides along, visible to the HOST only. */
  const pledgeRows: ClaimRow[] = pledges.map((p) => ({
    id: p.id,
    entry_url: '',
    claimer_name: p.guestName,
    claimer_email: '',
    message: p.note,
    quantity: 1,
    created_at: p.createdAt,
    kind: 'pledge',
    itemLabel: p.itemName ?? 'the fund',
    amountCents: p.amountCents,
    thankedAt: p.thankedAt ?? null,
  }));
  const pledgedCents = pledges.reduce((sum, p) => sum + (p.amountCents ?? 0), 0);

  /* Total gifts = link claims + item reservations/purchases +
     gave-directly pledges. */
  const totalGifts = claimsCount + itemClaims.length + pledges.length;

  /* ── The thank-you ledger stat — "Still to thank · N". ──────
     Counts every unthanked row across ALL kinds. Toggles inside
     the feed report through onThankedChange so the number moves
     without refetching three ledgers. */
  const [thankOverrides, setThankOverrides] = useState<Record<string, string | null>>({});
  const onThankedChange = useCallback((key: string, thankedAt: string | null) => {
    setThankOverrides((prev) => ({ ...prev, [key]: thankedAt }));
  }, []);
  const allRows: ClaimRow[] = [
    ...(claimRows ?? []).map((c) => ({
      ...c,
      thankedAt: c.thankedAt ?? (c as unknown as { thanked_at?: string | null }).thanked_at ?? null,
    })),
    ...itemClaimRows,
    ...pledgeRows,
  ];
  const stillToThank = allRows.filter((r) => {
    const key = `${r.kind ?? 'link'}-${r.id}`;
    const thanked = key in thankOverrides ? thankOverrides[key] : r.thankedAt ?? null;
    return !thanked;
  }).length;

  // Quiet StatStrip (plan rule 3) — Listed / Claimed / Still to
  // thank / Given directly as 40px chips; zeros collapse. The
  // dollar total (money, not a count) stays in the rail.
  const statItems: StatStripItem[] = [
    { label: 'Listed', value: entries.length + itemCount },
    { label: 'Claimed', value: claimsCount + itemClaims.length, tone: 'sage' },
    { label: 'Open', value: Math.max(0, entries.length + itemCount - claimsCount - itemClaims.length) },
    { label: 'Still to thank', value: stillToThank, tone: 'peach' },
    { label: 'Given directly', value: pledges.length, tone: 'gold' },
  ];

  return (
    <DashLayout active="registry" hideTopbar>
      <PLAtmosphere />
      {/* Quiet header (plan rule 1): one line + StatStrip; the
          "native items guests can claim…" prose is gone — the
          manager's own empty state explains it. */}
      <div style={{ padding: '16px clamp(20px, 4vw, 40px) 0', maxWidth: 1180, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <PageIntro
          eyebrow="Registry"
          title={
            <span>
              A list of{' '}
              <i style={{ color: 'var(--peach-ink, #C6703D)', fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1' }}>
                wishes
              </i>
              .
            </span>
          }
          meta={!loading && site?.id ? <StatStrip items={statItems} /> : undefined}
          style={{ marginBottom: 16 }}
        />
      </div>
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
          /* Quiet ledger (plan: "ledger feed leads; items manager
             second; sidebar copy → rail"). The gift feed opens the
             content column; the counts live in the header StatStrip;
             the rail keeps the money note + payments link. Collapses
             to one column on narrow widths (rail drops BELOW). */
          <div className="pd-registry" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px', gap: 22, alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
              {/* The ledger — every gift across kinds, with the
                  thank-you toggles. Hides itself when there are none. */}
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
                  {/* The how-it-works paragraph, as a HintChip (plan
                      rule 4) — one line, expands on the ? once. */}
                  <HintChip
                    storageKey="pl-hint-registry-thanks"
                    hint="Draft thank-you writes the note; Mark thanked stamps it."
                    detail={
                      <>
                        Every gift in one thread — reservations, purchases,
                        and &ldquo;I got this&rdquo; link claims. Tap{' '}
                        <strong style={{ color: 'var(--peach-ink, #C6703D)' }}>Draft thank-you</strong>{' '}
                        and Pear writes a personal note. When it&rsquo;s out the
                        door, stamp{' '}
                        <strong style={{ color: 'var(--sage-deep, #3D4A1F)' }}>Mark thanked</strong>.
                      </>
                    }
                    style={{ marginBottom: 12 }}
                  />
                  <RegistryClaimsFeed
                    subdomain={subdomain}
                    items={entries}
                    manifest={manifest}
                    extraClaims={[...itemClaimRows, ...pledgeRows]}
                    onThankedChange={onThankedChange}
                  />
                </PLCard>
              )}
              {/* The items manager — second (the feed is what a
                  returning host checks; listing is setup work). */}
              <PLCard tone="paper" noPadding style={{ padding: 22 }}>
                <RegistryItemsManager siteId={site.id} />
              </PLCard>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 86 }}>
              {/* The honor ledger + money honesty note (plan rule 7:
                  sidebar copy → quiet rail). Counts live in the
                  header StatStrip; only the dollar figure sits here. */}
              <RailCard title="The registry">
                {pledges.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '0 0 8px' }}>
                    <span style={{ fontSize: 13, color: 'var(--ink)' }}>Given directly</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--ink)' }}>
                      {pledgedCents > 0 ? formatCents(pledgedCents) : pledges.length}
                    </span>
                  </div>
                )}
                <div style={{ fontSize: 12, color: 'var(--ink-muted)', lineHeight: 1.5 }}>
                  Cash gifts go straight to your own Venmo / PayPal / Cash App —
                  Pearloom never touches the money. Amounts are as shared by guests.
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
              </RailCard>
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
