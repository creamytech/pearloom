'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DashLayout } from '@/components/pearloom/dash/DashShell';
import { PageIntro } from '@/components/pearloom/dash/QuietDash';
import { DashEmpty } from '@/components/pearloom/dash/DashEmpty';
import { DashSkeleton } from '@/components/pearloom/dash/DashSkeleton';
import { Icon } from '@/components/pearloom/motifs';

interface PrintJob {
  id: string;
  site_id: string;
  batch_id: string;
  product: string;
  kind: string;
  size: string | null;
  front_url: string;
  recipient_name: string | null;
  status: string;
  status_detail: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  cost_cents: number | null;
  currency: string | null;
  created_at: string;
  mailed_at: string | null;
  delivered_at: string | null;
}

interface Batch {
  batchId: string;
  siteSlug: string;
  product: string;
  kind: string;
  frontUrl: string;
  createdAt: string;
  jobs: PrintJob[];
  costCents: number;
  statusCounts: Record<string, number>;
}

// Display-only mirror of the server price sheet — the GET on
// /api/print/checkout replaces this with the live table, and the
// POST recomputes everything server-side regardless.
interface PriceSheet {
  postcard: Record<string, number>;
  letter: number;
}

interface CheckoutInfo {
  creditRemainingCents: number;
  legacyCreditCents: number;
  prices: PriceSheet;
}

const STATUS_TONE: Record<string, string> = {
  pending: '#A14A2C',
  submitted: '#5C6B3F',
  rendered: '#5C6B3F',
  mailed: '#5C6B3F',
  delivered: '#3D4A1F',
  failed: '#7A2D2D',
  cancelled: '#7A2D2D',
};

const dollars = (cents: number) => `$${(cents / 100).toFixed(2)}`;

// ── Handoff chrome (ScreensShop Print) ────────────────────────
const MONO = 'var(--pl-font-mono, ui-monospace, monospace)';
const DISPLAY = 'var(--font-display, "Fraunces", Georgia, serif)';

// The tinted header band + icon per card kind — the handoff's four
// editorial tints, keyed off the real batch.kind so a sheet of
// batches reads as a set. Unknown kinds fall back to gold.
const KIND_TINT: Record<string, { bg: string; ink: string; icon: string; label: string }> = {
  'save-the-date': { bg: 'var(--sage-tint)', ink: 'var(--sage-deep)', icon: 'send', label: 'Save the date' },
  invitation: { bg: 'var(--peach-bg)', ink: 'var(--peach-ink)', icon: 'ticket', label: 'Invitation' },
  thankyou: { bg: 'var(--lavender-bg)', ink: 'var(--lavender-ink)', icon: 'heart-icon', label: 'Thank-you' },
};
const KIND_FALLBACK = { bg: 'rgba(193,154,75,0.16)', ink: '#8A6A2E', icon: 'mail', label: 'Mailing' };
function kindTint(kind: string) {
  return KIND_TINT[kind] ?? KIND_FALLBACK;
}

// The single glass tag over the header band — the most-advanced
// status the batch has reached, with its real count. Never invents
// a number; falls back to the total card count.
function headlineStatus(b: Batch): { label: string } {
  const order: Array<[string, string]> = [
    ['delivered', 'Delivered'],
    ['mailed', 'Mailed'],
    ['submitted', 'Submitted'],
    ['rendered', 'Rendered'],
    ['pending', 'Pending'],
    ['failed', 'Failed'],
  ];
  for (const [k, label] of order) {
    const n = b.statusCounts[k] ?? 0;
    if (n > 0) return { label: `${label} · ${n}` };
  }
  return { label: `${b.jobs.length} ${b.jobs.length === 1 ? 'card' : 'cards'}` };
}

export function PrintOrdersClient({
  siteFilter,
  orderBanner,
}: {
  siteFilter: string | null;
  orderBanner?: 'success' | 'cancelled' | null;
}) {
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutInfo, setCheckoutInfo] = useState<CheckoutInfo | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const url = siteFilter ? `/api/print/orders?site=${encodeURIComponent(siteFilter)}` : '/api/print/orders';
        const res = await fetch(url);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || 'Could not load print orders.');
        setJobs(data.jobs ?? []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [siteFilter, refreshTick]);

  // Price sheet + remaining legacy credit (server-computed).
  useEffect(() => {
    let cancelled = false;
    fetch('/api/print/checkout')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: CheckoutInfo | null) => {
        if (!cancelled && data) setCheckoutInfo(data);
      })
      .catch(() => { /* composer falls back to no-credit display */ });
    return () => { cancelled = true; };
  }, [refreshTick]);

  const batches = useMemo<Batch[]>(() => {
    const byBatch = new Map<string, Batch>();
    for (const j of jobs) {
      let b = byBatch.get(j.batch_id);
      if (!b) {
        b = {
          batchId: j.batch_id,
          siteSlug: j.site_id,
          product: j.product,
          kind: j.kind,
          frontUrl: j.front_url,
          createdAt: j.created_at,
          jobs: [],
          costCents: 0,
          statusCounts: {},
        };
        byBatch.set(j.batch_id, b);
      }
      b.jobs.push(j);
      b.costCents += j.cost_cents ?? 0;
      b.statusCounts[j.status] = (b.statusCounts[j.status] ?? 0) + 1;
    }
    return Array.from(byBatch.values()).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [jobs]);

  const onFulfilled = useCallback(() => setRefreshTick((t) => t + 1), []);

  return (
    <DashLayout
      /* Print is keepsake fulfillment — "memory" is the closest real
         sidebar id (the shell has no print/sites entry). */
      active="memory"
      hideTopbar
    >
      {/* Quiet header (plan rule 1): one line; the tracking prose
          lives in the empty state. Batches lead; composer second. */}
      <div style={{ padding: '16px var(--pl-dash-pad) 0', maxWidth: 'var(--pl-dash-maxw)', margin: '0 auto' }}>
        <PageIntro eyebrow="Pearloom Print" title="Print orders." style={{ marginBottom: 14 }} />
      </div>
      <div style={{ padding: '0 var(--pl-dash-pad) 32px', maxWidth: 'var(--pl-dash-maxw)', margin: '0 auto' }}>

        {/* Intro banner (handoff Print) — the same weave, now on real
            paper. Links to the Studio, where the print jobs originate. */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: 18,
            marginBottom: 18,
            background: 'var(--cream-2)',
            border: '1px solid var(--line-soft)',
            borderRadius: 16,
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              width: 40,
              height: 40,
              borderRadius: 11,
              background: 'var(--card)',
              border: '1px solid var(--line)',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--pl-gold)',
              flexShrink: 0,
            }}
          >
            <Icon name="sparkles" size={18} color="var(--pl-gold)" />
          </span>
          <span style={{ flex: 1, minWidth: 220, fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.5 }}>
            Everything carries your Studio palette and type — the same weave, now on real paper. Printed, stamped, and
            mailed for you.
          </span>
          <Link href="/dashboard/invite" className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>
            Open the Studio
          </Link>
        </div>

        {orderBanner === 'success' && (
          <div role="status" style={{
            padding: '12px 16px', marginBottom: 16, borderRadius: 12,
            background: 'rgba(92,107,63,0.10)', color: '#5C6B3F',
            fontSize: 13, fontWeight: 600,
          }}>
            ✓ Payment received — your cards are headed to print. Each one shows up below as it&apos;s submitted and mailed.
          </div>
        )}
        {orderBanner === 'cancelled' && (
          <div role="status" style={{
            padding: '12px 16px', marginBottom: 16, borderRadius: 12,
            background: 'rgba(161,74,44,0.10)', color: '#A14A2C',
            fontSize: 13, fontWeight: 600,
          }}>
            Checkout cancelled — nothing was charged and nothing was mailed.
          </div>
        )}

        {/* Batches lead (plan: "Batches lead; composer second") —
            the ledger is what the host came to check. */}
        {loading ? (
          <DashSkeleton kind="list" count={4} label="Threading print orders" />
        ) : error ? (
          <div style={{ padding: 14, background: 'rgba(122,45,45,0.08)', color: '#7A2D2D', borderRadius: 12 }}>{error}</div>
        ) : batches.length === 0 ? (
          <DashEmpty
            size="page"
            eyebrow="Pearloom Print"
            title="Nothing in the mail yet"
            body="When you send save-the-dates or invites through the Studio, every postcard shows up here with delivery tracking."
            actions={[{ label: 'Open the Studio', href: '/dashboard/invite' }]}
          />
        ) : (
          <div
            className="pl8-dash-stagger"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))',
              gap: 16,
              marginBottom: 20,
            }}
          >
            {batches.map((b) => (
              <BatchCard key={b.batchId} batch={b} />
            ))}
          </div>
        )}

        <NewBatchComposer
          siteFilter={siteFilter}
          checkoutInfo={checkoutInfo}
          onFulfilled={onFulfilled}
        />
      </div>
    </DashLayout>
  );
}

// ── New batch composer ────────────────────────────────────────
//
// Configures a print batch and hands off to /api/print/checkout.
// All figures here are estimates rendered from the SERVER's price
// sheet (GET /api/print/checkout); the POST recomputes the exact
// total + credit server-side before any money or mail moves.

type ComposerKind = 'save-the-date' | 'invitation' | 'thankyou';
type ComposerProduct = 'postcard' | 'letter';
type ComposerSize = '4x6' | '6x9' | '6x11';

const KIND_OPTIONS: Array<{ value: ComposerKind; label: string }> = [
  { value: 'save-the-date', label: 'Save the date' },
  { value: 'invitation', label: 'Invitation' },
  { value: 'thankyou', label: 'Thank-you card' },
];

function NewBatchComposer({
  siteFilter,
  checkoutInfo,
  onFulfilled,
}: {
  siteFilter: string | null;
  checkoutInfo: CheckoutInfo | null;
  onFulfilled: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [siteSlug, setSiteSlug] = useState(siteFilter ?? '');
  const [kind, setKind] = useState<ComposerKind>('save-the-date');
  const [product, setProduct] = useState<ComposerProduct>('postcard');
  const [size, setSize] = useState<ComposerSize>('4x6');
  const [svg, setSvg] = useState<string | null>(null);
  const [svgName, setSvgName] = useState<string | null>(null);
  const [addr, setAddr] = useState({ name: '', line1: '', line2: '', city: '', state: '', zip: '' });
  const [addressCount, setAddressCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fulfilledNote, setFulfilledNote] = useState<string | null>(null);

  // Recipient estimate — guests with a mailing address on file.
  useEffect(() => {
    if (!open || !siteSlug.trim()) { setAddressCount(null); return; }
    let cancelled = false;
    const t = setTimeout(() => {
      fetch(`/api/guests?siteSlug=${encodeURIComponent(siteSlug.trim())}`, { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { guests?: Array<{ mailingAddress?: { line1?: string } | null }> } | null) => {
          if (cancelled) return;
          if (!data?.guests) { setAddressCount(null); return; }
          setAddressCount(data.guests.filter((g) => !!g.mailingAddress?.line1).length);
        })
        .catch(() => { if (!cancelled) setAddressCount(null); });
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [open, siteSlug]);

  const prices = checkoutInfo?.prices;
  const perCardCents = prices
    ? (product === 'letter' ? prices.letter : (prices.postcard[size] ?? prices.postcard['4x6']))
    : null;
  const count = addressCount ?? 0;
  const totalCents = perCardCents != null ? perCardCents * count : null;
  const creditRemaining = checkoutInfo?.creditRemainingCents ?? 0;
  const creditApplied = totalCents != null ? Math.min(creditRemaining, totalCents) : 0;
  const dueCents = totalCents != null ? totalCents - creditApplied : null;
  const fullyCovered = dueCents === 0 && (totalCents ?? 0) > 0;

  const ready = !!siteSlug.trim() && !!svg && !!addr.name && !!addr.line1 && !!addr.city && !!addr.state && !!addr.zip && count > 0;

  async function startCheckout() {
    if (busy || !ready) return;
    setBusy(true);
    setError(null);
    setFulfilledNote(null);
    try {
      const res = await fetch('/api/print/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteSlug: siteSlug.trim(),
          kind,
          product,
          size: product === 'postcard' ? size : undefined,
          svg,
          returnAddress: {
            name: addr.name,
            address_line1: addr.line1,
            address_line2: addr.line2 || undefined,
            address_city: addr.city,
            address_state: addr.state,
            address_zip: addr.zip,
            address_country: 'US',
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? `Checkout failed (${res.status})`);
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl as string;
        return;
      }
      if (data.fulfilled) {
        setFulfilledNote(
          `✓ Ordered with your legacy print credit — ${data.submitted} card${data.submitted === 1 ? '' : 's'} submitted${data.failed ? ` · ${data.failed} failed` : ''}.`,
        );
        onFulfilled();
        return;
      }
      throw new Error('Unexpected response from checkout.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start checkout.');
    } finally {
      setBusy(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid var(--line)',
    background: 'var(--paper)',
    color: 'var(--ink)',
    fontSize: 13,
    fontFamily: 'inherit',
    width: '100%',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)',
    letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4, display: 'block',
  };

  return (
    <div
      style={{
        background: 'var(--cream-2, #FBF7EE)',
        borderRadius: 16,
        border: '1px solid var(--line-soft, rgba(14,13,11,0.06))',
        padding: 18,
        marginBottom: 20,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div className="eyebrow" style={{ color: 'var(--peach-ink)', marginBottom: 4 }}>
            Pearloom Print
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>
            Mail a new batch
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 2 }}>
            {prices
              ? `Postcards from ${dollars(prices.postcard['4x6'])} · enveloped invitations ${dollars(prices.letter)} — printed, stamped, and mailed.`
              : 'Printed, stamped, and mailed for you.'}
            {creditRemaining > 0 && (
              <span style={{ color: '#5C6B3F', fontWeight: 600 }}>
                {' '}Legacy credit available: {dollars(creditRemaining)}.
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          style={{
            padding: '8px 16px',
            borderRadius: 999,
            background: open ? 'transparent' : 'var(--ink)',
            color: open ? 'var(--ink)' : 'var(--cream)',
            border: open ? '1.5px solid var(--line)' : 'none',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'var(--font-ui)',
            flexShrink: 0,
          }}
        >
          {open ? 'Close' : 'Begin a batch'}
        </button>
      </div>

      {open && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line-soft)', display: 'grid', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
            <div>
              <label style={labelStyle} htmlFor="pl-print-site">Site</label>
              <input id="pl-print-site" style={inputStyle} value={siteSlug}
                onChange={(e) => setSiteSlug(e.target.value)} placeholder="your-site-slug" />
            </div>
            <div>
              <label style={labelStyle} htmlFor="pl-print-kind">Card</label>
              <select id="pl-print-kind" style={inputStyle} value={kind}
                onChange={(e) => setKind(e.target.value as ComposerKind)}>
                {KIND_OPTIONS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle} htmlFor="pl-print-product">Format</label>
              <select id="pl-print-product" style={inputStyle} value={product}
                onChange={(e) => setProduct(e.target.value as ComposerProduct)}>
                <option value="postcard">Postcard</option>
                <option value="letter">Enveloped invitation</option>
              </select>
            </div>
            {product === 'postcard' && (
              <div>
                <label style={labelStyle} htmlFor="pl-print-size">Size</label>
                <select id="pl-print-size" style={inputStyle} value={size}
                  onChange={(e) => setSize(e.target.value as ComposerSize)}>
                  <option value="4x6">4×6{prices ? ` — ${dollars(prices.postcard['4x6'])}` : ''}</option>
                  <option value="6x9">6×9{prices ? ` — ${dollars(prices.postcard['6x9'])}` : ''}</option>
                  <option value="6x11">6×11{prices ? ` — ${dollars(prices.postcard['6x11'])}` : ''}</option>
                </select>
              </div>
            )}
          </div>

          <div>
            <label style={labelStyle} htmlFor="pl-print-svg">Artwork (SVG from the Studio)</label>
            <input
              id="pl-print-svg"
              type="file"
              accept=".svg,image/svg+xml"
              style={{ ...inputStyle, padding: '7px 10px' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) { setSvg(null); setSvgName(null); return; }
                f.text().then((text) => { setSvg(text); setSvgName(f.name); });
              }}
            />
            {svgName && <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 4 }}>{svgName} attached</div>}
          </div>

          <div>
            <div style={{ ...labelStyle, marginBottom: 6 }}>Return address</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
              <input style={inputStyle} placeholder="Name" value={addr.name} aria-label="Return address name"
                onChange={(e) => setAddr((a) => ({ ...a, name: e.target.value }))} />
              <input style={inputStyle} placeholder="Address line 1" value={addr.line1} aria-label="Return address line 1"
                onChange={(e) => setAddr((a) => ({ ...a, line1: e.target.value }))} />
              <input style={inputStyle} placeholder="Line 2 (optional)" value={addr.line2} aria-label="Return address line 2"
                onChange={(e) => setAddr((a) => ({ ...a, line2: e.target.value }))} />
              <input style={inputStyle} placeholder="City" value={addr.city} aria-label="Return address city"
                onChange={(e) => setAddr((a) => ({ ...a, city: e.target.value }))} />
              <input style={inputStyle} placeholder="State" value={addr.state} aria-label="Return address state"
                onChange={(e) => setAddr((a) => ({ ...a, state: e.target.value }))} />
              <input style={inputStyle} placeholder="ZIP" value={addr.zip} aria-label="Return address ZIP"
                onChange={(e) => setAddr((a) => ({ ...a, zip: e.target.value }))} />
            </div>
          </div>

          {/* ── The bill ── */}
          <div style={{
            background: 'var(--paper)', borderRadius: 12, padding: '12px 14px',
            display: 'grid', gap: 6, fontSize: 13, color: 'var(--ink)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--ink-soft)' }}>
                {addressCount == null
                  ? 'Recipients with mailing addresses'
                  : `${count} recipient${count === 1 ? '' : 's'} with mailing addresses`}
                {perCardCents != null && ` × ${dollars(perCardCents)} per card`}
              </span>
              <span style={{ fontWeight: 600 }}>{totalCents != null ? dollars(totalCents) : '—'}</span>
            </div>
            {creditApplied > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#5C6B3F' }}>
                <span>Legacy credit: {dollars(creditApplied)} applied</span>
                <span style={{ fontWeight: 600 }}>−{dollars(creditApplied)}</span>
              </div>
            )}
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              paddingTop: 6, borderTop: '1px solid var(--line-soft)', fontWeight: 700,
            }}>
              <span>Due today</span>
              <span>{dueCents != null ? dollars(dueCents) : '—'}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>
              Final total is confirmed at checkout from your live guest list — you&apos;re only ever charged for cards we can actually mail.
            </div>
          </div>

          {error && (
            <div role="alert" style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(122,45,45,0.08)', color: '#7A2D2D', fontSize: 12.5 }}>
              {error}
            </div>
          )}
          {fulfilledNote && (
            <div role="status" style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(92,107,63,0.10)', color: '#5C6B3F', fontSize: 12.5 }}>
              {fulfilledNote}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={startCheckout}
              disabled={busy || !ready}
              style={{
                padding: '10px 18px',
                borderRadius: 999,
                background: 'var(--ink)',
                color: 'var(--cream)',
                border: 'none',
                fontSize: 13,
                fontWeight: 700,
                cursor: busy || !ready ? 'not-allowed' : 'pointer',
                opacity: busy || !ready ? 0.55 : 1,
                fontFamily: 'var(--font-ui)',
              }}
            >
              {busy
                ? 'Threading…'
                : fullyCovered
                  ? 'Order with credit'
                  : dueCents != null && dueCents > 0
                    ? `Continue to payment — ${dollars(dueCents)}`
                    : 'Continue to payment'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function BatchCard({ batch }: { batch: Batch }) {
  const [open, setOpen] = useState(false);
  const total = batch.jobs.length;
  const submitted = batch.statusCounts.submitted ?? 0;
  const mailed = batch.statusCounts.mailed ?? 0;
  const delivered = batch.statusCounts.delivered ?? 0;
  const failed = batch.statusCounts.failed ?? 0;
  const inFlight = total - delivered - failed;

  const tint = kindTint(batch.kind);
  const tag = headlineStatus(batch);
  // A fully-delivered batch wears the gold "feature" edge — the
  // handoff's completed-object signal.
  const complete = delivered === total && total > 0;
  const sentLabel = new Date(batch.createdAt).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <div
      className="pl8-card-lift"
      style={{
        background: 'var(--card)',
        borderRadius: 16,
        border: `1px solid ${complete ? 'var(--pl-gold)' : 'var(--card-ring, var(--line))'}`,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Tinted header band — the real card front, or the kind glyph;
          a glass status tag rides the top-left corner. */}
      <div
        style={{
          height: 128,
          background: tint.bg,
          borderBottom: '1px solid var(--line)',
          display: 'grid',
          placeItems: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {batch.frontUrl ? (
          <img
            src={batch.frontUrl}
            alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <Icon name={tint.icon} size={34} color={tint.ink} />
        )}
        <span
          className="pl-glass-surface"
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            padding: '3px 9px',
            borderRadius: 999,
            fontFamily: MONO,
            fontSize: 9,
            letterSpacing: '0.06em',
            color: 'var(--ink)',
          }}
        >
          {tag.label}
        </span>
      </div>

      {/* Body — kind heading, italic sub, status pills, cost + toggle. */}
      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ fontFamily: DISPLAY, fontSize: 18, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.15 }}>
          {batch.siteSlug}
        </div>
        <div style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontSize: 13, color: tint.ink, marginTop: 2 }}>
          {tint.label} · {batch.product} · {total} {total === 1 ? 'card' : 'cards'}
        </div>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.04em', color: 'var(--ink-muted)', marginTop: 6 }}>
          Sent {sentLabel}
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
          {delivered > 0 && <Pill label={`${delivered} delivered`} tone={STATUS_TONE.delivered} />}
          {mailed > 0 && <Pill label={`${mailed} mailed`} tone={STATUS_TONE.mailed} />}
          {submitted > 0 && <Pill label={`${submitted} submitted`} tone={STATUS_TONE.submitted} />}
          {inFlight - submitted - mailed > 0 && <Pill label={`${inFlight - submitted - mailed} pending`} tone={STATUS_TONE.pending} />}
          {failed > 0 && <Pill label={`${failed} failed`} tone={STATUS_TONE.failed} />}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 'auto', paddingTop: 14 }}>
          <span style={{ fontFamily: MONO, fontSize: 12.5, color: 'var(--ink-muted)' }}>
            {dollars(batch.costCents)}
          </span>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            style={{
              padding: '7px 14px',
              borderRadius: 999,
              background: 'transparent',
              color: 'var(--ink)',
              border: '1.5px solid var(--line)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-ui)',
            }}
          >
            {open ? 'Hide' : 'Recipients'}
          </button>
        </div>
      </div>
      {open && (
        <div style={{ padding: '0 18px 16px' }}>
          <div style={{ paddingTop: 14, borderTop: '1px solid var(--line-soft)', display: 'grid', gap: 6 }}>
            {batch.jobs.map((j) => (
              <div key={j.id} style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) auto auto',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 8,
                background: 'var(--paper)',
                fontSize: 12,
              }}>
                <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{j.recipient_name || 'Recipient'}</span>
                <span style={{ color: STATUS_TONE[j.status] ?? 'var(--ink-soft)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {j.status}
                </span>
                {j.tracking_number ? (
                  <a href={j.tracking_url || `https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1=${j.tracking_number}`}
                     target="_blank" rel="noreferrer"
                     style={{ color: 'var(--peach-ink)', fontSize: 11, textDecoration: 'none', fontFamily: 'monospace' }}>
                    {j.tracking_number}
                  </a>
                ) : (
                  <span style={{ color: 'var(--ink-muted)', fontSize: 11 }}>—</span>
                )}
                {j.status_detail && (
                  <span style={{ gridColumn: '1 / -1', fontSize: 11, color: '#7A2D2D' }}>
                    {j.status_detail}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Pill({ label, tone }: { label: string; tone: string }) {
  return (
    <span style={{
      padding: '4px 10px',
      borderRadius: 999,
      background: `${tone}14`,
      color: tone,
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
    }}>
      {label}
    </span>
  );
}
