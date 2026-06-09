'use client';

// ─────────────────────────────────────────────────────────────
// StudioMailFlow — "Mail it for you" inside the Send overlay.
//
// The paid Pearloom Print path: pick a format, give a return
// address, see the bill, and hand off to /api/print/checkout.
// The card artwork is serialized from the live Studio state via
// studio-card-svg.ts (the same palette/layout/motif the canvas
// renders), so what the host sees on the desk is what lands in
// the mail.
//
// Money rules (mirrors PrintOrdersClient's composer): every
// figure here is a display estimate from the server's price
// sheet (GET /api/print/checkout); the POST recomputes the
// exact total + legacy credit server-side before any charge.
// Stripe's success_url lands on /dashboard/print, which owns
// the post-payment banner + per-card tracking.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { StationeryType } from './studio-constants';
import { Pear, Icon } from '../motifs';

type MailProduct = 'postcard' | 'letter';
type MailSize = '4x6' | '6x9' | '6x11';

interface PriceSheet {
  postcard: Record<string, number>;
  letter: number;
}

interface CheckoutInfo {
  creditRemainingCents: number;
  legacyCreditCents: number;
  prices: PriceSheet;
}

/** StationeryType → the checkout's kind vocabulary. */
const KIND_BY_TYPE: Record<StationeryType, 'save-the-date' | 'invitation' | 'thankyou'> = {
  std: 'save-the-date',
  invite: 'invitation',
  thanks: 'thankyou',
};

const dollars = (cents: number) => `$${(cents / 100).toFixed(2)}`;

interface Props {
  siteSlug: string;
  type: StationeryType;
  /** Guests with a COMPLETE mailing address (line1 + city +
   *  state + zip) — the same set the checkout prices. */
  mailableCount: number | null;
  /** Prefill for the return-address name ("Emma & James"). */
  defaultName: string;
  /** Serializes the live card design to print SVG. Async — it
   *  inlines the couple photo / AI motif as data URIs first. */
  buildSvg: () => Promise<string>;
  onBack: () => void;
}

export function StudioMailFlow({ siteSlug, type, mailableCount, defaultName, buildSvg, onBack }: Props) {
  const [info, setInfo] = useState<CheckoutInfo | null>(null);
  const [product, setProduct] = useState<MailProduct>('postcard');
  const [size, setSize] = useState<MailSize>('4x6');
  const [addr, setAddr] = useState({ name: defaultName, line1: '', line2: '', city: '', state: '', zip: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  // Server price sheet + remaining legacy credit.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/print/checkout')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: CheckoutInfo | null) => {
        if (!cancelled && data) setInfo(data);
      })
      .catch(() => { /* bill shows em-dashes until prices load */ });
    return () => { cancelled = true; };
  }, []);

  const prices = info?.prices;
  const perCardCents = prices
    ? (product === 'letter' ? prices.letter : (prices.postcard[size] ?? prices.postcard['4x6']))
    : null;
  const count = mailableCount ?? 0;
  const totalCents = perCardCents != null ? perCardCents * count : null;
  const creditRemaining = info?.creditRemainingCents ?? 0;
  const creditApplied = totalCents != null ? Math.min(creditRemaining, totalCents) : 0;
  const dueCents = totalCents != null ? totalCents - creditApplied : null;
  const fullyCovered = dueCents === 0 && (totalCents ?? 0) > 0;

  const addressComplete = !!addr.name.trim() && !!addr.line1.trim() && !!addr.city.trim() && !!addr.state.trim() && !!addr.zip.trim();
  const ready = addressComplete && count > 0 && !done;

  async function startCheckout() {
    if (busy || !ready) return;
    setBusy(true);
    setError(null);
    try {
      const svg = await buildSvg();
      const res = await fetch('/api/print/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteSlug,
          kind: KIND_BY_TYPE[type],
          product,
          size: product === 'postcard' ? size : undefined,
          svg,
          returnAddress: {
            name: addr.name.trim(),
            address_line1: addr.line1.trim(),
            address_line2: addr.line2.trim() || undefined,
            address_city: addr.city.trim(),
            address_state: addr.state.trim(),
            address_zip: addr.zip.trim(),
            address_country: 'US',
          },
        }),
      });
      const data = await res.json().catch(() => ({} as Record<string, unknown>));
      if (!res.ok) {
        if (res.status === 503) {
          throw new Error("Mailing isn't configured yet — your design is safe, and the home Print / PDF path still works.");
        }
        if (res.status === 402) {
          throw new Error('Payment is needed before these can be mailed — try again in a moment.');
        }
        throw new Error((data as { error?: string }).error ?? `Checkout failed (${res.status}).`);
      }
      if ((data as { checkoutUrl?: string }).checkoutUrl) {
        // Stripe owns the rest — success_url returns to
        // /dashboard/print where the order shows live tracking.
        window.location.href = (data as { checkoutUrl: string }).checkoutUrl;
        return;
      }
      if ((data as { fulfilled?: boolean }).fulfilled) {
        const d = data as { submitted?: number; failed?: number };
        const n = d.submitted ?? count;
        setDone(`Pressed and on its way — ${n} card${n === 1 ? '' : 's'} covered by your print credit${d.failed ? ` · ${d.failed} failed` : ''}.`);
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
    background: 'var(--card)',
    color: 'var(--ink)',
    fontSize: 12.5,
    fontFamily: 'inherit',
    width: '100%',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 10.5, fontWeight: 700, color: 'var(--ink-soft)',
    letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4, display: 'block',
  };
  const chip = (active: boolean): React.CSSProperties => ({
    padding: '10px 12px',
    borderRadius: 10,
    background: active ? 'var(--ink)' : 'var(--card)',
    color: active ? 'var(--cream)' : 'var(--ink)',
    border: '1px solid ' + (active ? 'var(--ink)' : 'var(--line-soft)'),
    textAlign: 'left',
    display: 'flex', flexDirection: 'column', gap: 2,
    cursor: 'pointer',
    fontFamily: 'inherit',
    flex: 1,
  });

  // ── Success state — credit covered the whole batch ──────────
  if (done) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div role="status" style={{
          padding: '14px 16px', borderRadius: 12,
          background: 'rgba(92,107,63,0.10)', color: 'var(--sage-deep, #5C6B3F)',
          fontSize: 13, fontWeight: 600, lineHeight: 1.5,
        }}>
          ✓ {done}
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
          Each card shows up on the Print orders page as it&apos;s submitted, mailed, and delivered.
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/dashboard/print" style={{
            textDecoration: 'none', padding: '9px 16px', borderRadius: 999,
            background: 'var(--ink)', color: 'var(--cream)', fontSize: 12.5, fontWeight: 700,
          }}>
            Track your order
          </Link>
          <button type="button" onClick={onBack} style={{
            padding: '9px 14px', borderRadius: 999, background: 'transparent',
            color: 'var(--ink)', border: '1px solid var(--line)', fontSize: 12.5,
            fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Back to send
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <button
        type="button"
        onClick={onBack}
        style={{
          alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: 0, background: 'transparent', border: 'none', cursor: 'pointer',
          fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', fontFamily: 'inherit',
        }}
      >
        <Icon name="chev-left" size={11} />
        Back to digital send
      </button>

      {/* Format */}
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>Format</div>
          <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>Printed, stamped, and mailed for you</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {([
            { p: 'postcard' as const, s: '4x6' as const, label: 'Postcard 4×6', price: prices?.postcard['4x6'] },
            { p: 'postcard' as const, s: '6x9' as const, label: 'Postcard 6×9', price: prices?.postcard['6x9'] },
            { p: 'letter' as const, s: null, label: 'Enveloped 5×7', price: prices?.letter },
          ]).map((opt) => {
            const active = product === opt.p && (opt.p === 'letter' || size === opt.s);
            return (
              <button
                key={opt.label}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setProduct(opt.p);
                  if (opt.s) setSize(opt.s);
                }}
                style={chip(active)}
              >
                <div style={{ fontSize: 12, fontWeight: 700 }}>{opt.label}</div>
                <div style={{ fontSize: 10.5, opacity: active ? 0.75 : 0.6 }}>
                  {opt.price != null ? `${dollars(opt.price)} / card` : '— / card'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Return address */}
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>Return address</div>
          <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>Printed on every envelope corner</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
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

      {/* The bill */}
      <div style={{
        background: 'var(--card)', borderRadius: 12, padding: '12px 14px',
        border: '1px solid var(--line-soft)',
        display: 'grid', gap: 6, fontSize: 12.5, color: 'var(--ink)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--ink-soft)' }}>
            {mailableCount == null
              ? 'Recipients with mailing addresses'
              : `${count} recipient${count === 1 ? '' : 's'} with full mailing addresses`}
            {perCardCents != null && ` × ${dollars(perCardCents)}`}
          </span>
          <span style={{ fontWeight: 600 }}>{totalCents != null ? dollars(totalCents) : '—'}</span>
        </div>
        {creditApplied > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--sage-deep, #5C6B3F)' }}>
            <span>Legacy print credit applied</span>
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
        <div style={{ fontSize: 10.5, color: 'var(--ink-muted)', lineHeight: 1.45 }}>
          The final total is confirmed at checkout from your live guest list — you&apos;re only ever charged for cards we can actually mail.
        </div>
      </div>

      {count === 0 && mailableCount != null && (
        <div style={{ fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
          No guests have a full mailing address yet (street, city, state, and ZIP).{' '}
          <Link href="/dashboard/rsvp" style={{ color: 'var(--peach-ink, #C6703D)', fontWeight: 600 }}>
            Collect addresses first
          </Link>
          , then come back — the cards will be waiting.
        </div>
      )}

      {error && (
        <div role="alert" style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(122,45,45,0.08)', color: 'var(--plum-ink, #7A2D2D)', fontSize: 12.5, lineHeight: 1.5 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid var(--line-soft)' }}>
        <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>
          After payment you&apos;ll land on{' '}
          <Link href="/dashboard/print" style={{ color: 'var(--ink-soft)', fontWeight: 600 }}>Print orders</Link>
          {' '}with per-card tracking.
        </div>
        <button
          type="button"
          onClick={startCheckout}
          disabled={busy || !ready}
          style={{
            padding: '9px 16px',
            fontSize: 12.5,
            fontWeight: 700,
            color: 'var(--cream)',
            background: 'var(--ink)',
            border: 'none',
            borderRadius: 999,
            cursor: busy || !ready ? 'not-allowed' : 'pointer',
            opacity: busy || !ready ? 0.55 : 1,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontFamily: 'inherit',
            flexShrink: 0,
          }}
        >
          {busy ? (
            'Threading…'
          ) : fullyCovered ? (
            'Order with credit'
          ) : (
            <>
              <Icon name="send" size={12} color="var(--cream)" />
              {perCardCents != null
                ? `Continue to payment — from ${dollars(perCardCents)}/card`
                : 'Continue to payment'}
            </>
          )}
        </button>
      </div>
      <div style={{ fontSize: 10, color: 'var(--ink-muted)' }}>
        <Pear size={10} tone="sage" shadow={false} /> Pear freezes the artwork before payment — what&apos;s on your desk is exactly what gets mailed.
      </div>
    </div>
  );
}
