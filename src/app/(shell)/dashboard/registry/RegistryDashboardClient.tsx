'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useSelectedSite } from '@/components/marketing/design/dash/hooks';
import { EmptyShell } from '@/components/marketing/design/dash/DashShell';
import { RegistryItemsManager } from '@/components/dashboard/RegistryItemsManager';
import { RegistryClaimsFeed, useRegistryClaims, type ClaimRow } from '@/components/registry/RegistryClaimsFeed';
import { formatCents } from '@/lib/registry-funds';
import { DashLayout } from '@/components/pearloom/dash/DashShell';
import { PLAtmosphere, PLCard } from '@/components/pearloom/dash/PLChrome';
import { HintChip, RailCard } from '@/components/pearloom/dash/QuietDash';
import type { StoryManifest } from '@/types';
import { HeroPlate } from '@/components/shell';

const MONO = 'var(--pl-font-mono, ui-monospace, monospace)';
const DISPLAY = 'var(--font-display, "Fraunces", Georgia, serif)';

/* Paper card chrome — the shared cockpit/quiet-dash card look
   (var(--card) on a soft hairline). Matches the zip's Card. */
const cardChrome: CSSProperties = {
  background: 'var(--card)',
  border: '1px solid var(--line-soft)',
  borderRadius: 16,
  padding: 22,
};

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

/* ── Editorial card header ──────────────────────────────────────
   Mono eyebrow with a gold leading rule + an optional gold "N due"
   pill on the trailing edge (the zip Registry's Thank-yous card).
   The pill's dark ink reads on gold in both themes. */
function CardHeader({ eyebrow, badge }: { eyebrow: string; badge?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontFamily: MONO,
          fontSize: 9.5,
          fontWeight: 600,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'var(--ink-muted)',
        }}
      >
        <span aria-hidden style={{ width: 12, height: 1, background: 'var(--pl-gold, #C19A4B)', flexShrink: 0 }} />
        {eyebrow}
      </div>
      {badge ? (
        <span
          style={{
            fontFamily: MONO,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            background: 'var(--pl-gold, #C19A4B)',
            color: '#2A2410',
            borderRadius: 999,
            padding: '2px 10px',
            whiteSpace: 'nowrap',
          }}
        >
          {badge}
        </span>
      ) : null}
    </div>
  );
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

  // Combined one-registry counts (link entries + native items).
  const listed = entries.length + itemCount;
  const claimed = claimsCount + itemClaims.length;
  const open = Math.max(0, listed - claimed);

  /* The zip's rail "The registry" card — Listed / Claimed / Still
     open as big Fraunces numbers. Real, combined counts. */
  const registryRows: Array<[string, number]> = [
    ['Listed', listed],
    ['Claimed', claimed],
    ['Still open', open],
  ];

  return (
    <DashLayout active="registry" hideTopbar>
      <PLAtmosphere />
      {/* The pressed plate (TASTE-PLAN T.3) — the route's ONE focal
          surface; the panels below stay quiet paper. Figures are
          real counts; zeros never render. */}
      <div style={{ padding: '16px clamp(20px, 4vw, 40px) 0', maxWidth: 1180, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <HeroPlate
          eyebrow="Registry"
          title={
            <span>
              A list of{' '}
              <i style={{ fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1' }}>wishes</i>.
            </span>
          }
          figures={!loading && site?.id ? [
            { label: 'Listed', value: String(listed), raw: listed },
            { label: 'Claimed', value: String(claimed), raw: claimed },
            { label: 'Still to thank', value: String(stillToThank), raw: stillToThank },
            { label: 'Given directly', value: String(pledges.length), raw: pledges.length },
          ] : undefined}
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
                fontFamily: DISPLAY,
                fontStyle: 'italic',
                fontSize: 18,
                color: 'var(--sage-deep)',
                fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
              }}
            >
              Loading…
            </div>
          </PLCard>
        ) : !site?.id ? (
          <EmptyShell
            inline
            cta={null}
            message="Pick a celebration first — the switcher in the sidebar opens its registry."
          />
        ) : (
          /* Zip Registry shape: the gift grid leads the content
             column with the thank-you ledger beneath it; the sticky
             rail carries the "The registry" stats + money note.
             Collapses to one column on narrow widths (rail below). */
          <div className="pd-registry" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px', gap: 22, alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
              {/* The gift grid (zip's hero) — real items, real photos
                  (tinted-tile fallback), add / edit / chip-in. */}
              <section style={cardChrome}>
                <RegistryItemsManager siteId={site.id} />
              </section>

              {/* The thank-you ledger — every gift across kinds with
                  the thank-you toggles. Hides itself when empty. */}
              {totalGifts > 0 && (
                <section style={cardChrome}>
                  <CardHeader eyebrow="Thank-yous" badge={stillToThank > 0 ? `${stillToThank} due` : undefined} />
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
                </section>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 86 }}>
              {/* The zip's rail "The registry" card — Listed / Claimed
                  / Still open as big display numbers, then the
                  honest money note + payments link. */}
              <RailCard title="The registry">
                {registryRows.map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '5px 0' }}>
                    <span style={{ fontSize: 13, color: 'var(--ink)' }}>{label}</span>
                    <span style={{ fontFamily: DISPLAY, fontSize: 22, color: 'var(--ink)' }}>{value}</span>
                  </div>
                ))}
                {pledges.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'space-between',
                      padding: '5px 0',
                      marginTop: 4,
                      borderTop: '1px solid var(--line-soft)',
                    }}
                  >
                    <span style={{ fontSize: 13, color: 'var(--sage-deep)' }}>Given directly</span>
                    <span style={{ fontFamily: DISPLAY, fontSize: 22, color: 'var(--ink)' }}>
                      {pledgedCents > 0 ? formatCents(pledgedCents) : pledges.length}
                    </span>
                  </div>
                )}
                <div style={{ fontSize: 12, color: 'var(--ink-muted)', lineHeight: 1.5, marginTop: 8 }}>
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
