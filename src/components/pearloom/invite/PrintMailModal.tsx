'use client';

// ─────────────────────────────────────────────────────────────
// PrintMailModal — Pearloom Print fulfillment dialog.
//
// Triggered from the InviteDesigner's "Print & Mail" CTA. Walks
// the host through:
//   1. Pick product (postcard / letter / thank-you card).
//   2. Confirm return address (sender's mailing address — required
//      by USPS so the postcard isn't rejected).
//   3. Confirm guest list (we count guests with addresses).
//   4. Cost preview ($0.74/postcard, $1.20/letter as of 2026-04).
//   5. Submit → /api/print/orders → render SVG → upload → Lob.
//
// SVG export is pulled from a passed-in ref so we don't duplicate
// the InviteSvg here. The host downloads the same artwork they're
// previewing — no surprises.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { Icon } from '../motifs';

export interface ReturnAddress {
  name: string;
  address_line1: string;
  address_line2?: string;
  address_city: string;
  address_state: string;
  address_zip: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  siteSlug: string;
  kind: 'save-the-date' | 'invitation' | 'thankyou';
  /** Callback that returns the current SVG outerHTML. Lets the
   *  modal grab the design at submit time so any last edits are
   *  captured. */
  getSvg: () => string | null;
}

const PRODUCTS = [
  {
    id: 'postcard' as const,
    label: 'Postcard',
    size: '4x6' as const,
    blurb: '4×6, no envelope. Single-sided. Mails in 3–5 days.',
    perCard: 0.74,
    minBest: 'save-the-date',
  },
  {
    id: 'postcard-large' as const,
    label: 'Large postcard',
    size: '6x9' as const,
    blurb: '6×9, no envelope. Bigger photo, bolder type.',
    perCard: 1.44,
    minBest: 'save-the-date',
  },
  {
    id: 'letter' as const,
    label: 'Letter + envelope',
    size: '6x9' as const,
    blurb: 'Folded letter in a return-addressed envelope. Best for invitations.',
    perCard: 1.20,
    minBest: 'invitation',
  },
];

export function PrintMailModal({ open, onClose, siteSlug, kind, getSvg }: Props) {
  const [product, setProduct] = useState<'postcard' | 'postcard-large' | 'letter'>(
    kind === 'invitation' ? 'letter' : 'postcard',
  );
  const [returnAddr, setReturnAddr] = useState<ReturnAddress>({
    name: '',
    address_line1: '',
    address_line2: '',
    address_city: '',
    address_state: '',
    address_zip: '',
  });
  const [eligibleCount, setEligibleCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ submitted: number; failed: number; cost: number } | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // Load address from localStorage if previously entered.
  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem(`pl-print-return-addr:${siteSlug}`);
      if (raw) setReturnAddr(JSON.parse(raw));
    } catch { /* noop */ }
  }, [open, siteSlug]);

  // Count guests with addresses on file.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoadingCount(true);
      try {
        const res = await fetch(`/api/guests?siteId=${encodeURIComponent(siteSlug)}&hasAddress=1`);
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (Array.isArray(data.guests)) {
          setEligibleCount(data.guests.length);
        } else if (typeof data.eligibleCount === 'number') {
          setEligibleCount(data.eligibleCount);
        } else {
          setEligibleCount(0);
        }
      } catch {
        if (!cancelled) setEligibleCount(null);
      } finally {
        if (!cancelled) setLoadingCount(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, siteSlug]);

  // Esc to close.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const productSpec = PRODUCTS.find((p) => p.id === product)!;
  const cost = productSpec.perCard * (eligibleCount ?? 0);
  const isAddressFilled = Boolean(
    returnAddr.name && returnAddr.address_line1 && returnAddr.address_city &&
    returnAddr.address_state && returnAddr.address_zip,
  );
  const canSubmit = isAddressFilled && (eligibleCount ?? 0) > 0 && !submitting;

  async function handleSubmit() {
    setError(null);
    const svg = getSvg();
    if (!svg) {
      setError('Could not capture the design. Reload and try again.');
      return;
    }
    setSubmitting(true);
    try {
      // Persist address for next time.
      localStorage.setItem(`pl-print-return-addr:${siteSlug}`, JSON.stringify(returnAddr));
      const res = await fetch('/api/print/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteSlug,
          kind,
          product: product === 'postcard-large' ? 'postcard' : product,
          size: productSpec.size,
          svg,
          returnAddress: returnAddr,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Could not submit (${res.status})`);
      }
      setSuccess({
        submitted: data.submitted ?? 0,
        failed: data.failed ?? 0,
        cost: (data.costCents ?? 0) / 100,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submit failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(14,13,11,0.55)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 200,
        display: 'grid',
        placeItems: 'center',
        padding: 'clamp(16px, 4vw, 32px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        style={{
          width: 'min(560px, 100%)',
          background: 'var(--paper, #F5EFE2)',
          borderRadius: 16,
          padding: 28,
          boxShadow: '0 30px 90px rgba(14,13,11,0.4)',
          fontFamily: 'var(--font-ui)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {success ? (
          <SuccessView result={success} onClose={onClose} />
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
              <div>
                <div className="eyebrow" style={{ color: 'var(--peach-ink)', marginBottom: 6 }}>
                  Pearloom Print
                </div>
                <h2 className="display" style={{ fontSize: 26, margin: 0 }}>
                  Mail to your guest list
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                style={{
                  width: 32, height: 32, borderRadius: 999,
                  background: 'transparent', border: '1.5px solid var(--line)',
                  cursor: 'pointer', display: 'grid', placeItems: 'center',
                }}
              >
                <Icon name="close" size={14} />
              </button>
            </div>

            {/* Step 1 — Product */}
            <Section title="Product">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {PRODUCTS.map((p) => {
                  const on = product === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setProduct(p.id)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 10,
                        border: on ? '2px solid var(--ink)' : '1.5px solid var(--line)',
                        background: on ? 'var(--cream-2)' : 'var(--card)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        gap: 12,
                        alignItems: 'center',
                      }}
                    >
                      <span aria-hidden style={{
                        width: 12, height: 12, borderRadius: 999,
                        background: on ? 'var(--peach-ink, #C6703D)' : 'transparent',
                        border: on ? 'none' : '1.5px solid var(--line)',
                        flexShrink: 0,
                      }} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>{p.label}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 2 }}>{p.blurb}</div>
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--peach-ink, #C6703D)' }}>
                        ${p.perCard.toFixed(2)} ea
                      </span>
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* Step 2 — Return address */}
            <Section title="Return address" hint="Required by USPS — printed on the back of every card.">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <Input value={returnAddr.name} onChange={(v) => setReturnAddr({ ...returnAddr, name: v })} placeholder="Name" full />
                <Input value={returnAddr.address_line1} onChange={(v) => setReturnAddr({ ...returnAddr, address_line1: v })} placeholder="Street address" full />
                <Input value={returnAddr.address_line2 || ''} onChange={(v) => setReturnAddr({ ...returnAddr, address_line2: v })} placeholder="Apt / suite" full />
                <Input value={returnAddr.address_city} onChange={(v) => setReturnAddr({ ...returnAddr, address_city: v })} placeholder="City" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <Input value={returnAddr.address_state} onChange={(v) => setReturnAddr({ ...returnAddr, address_state: v.toUpperCase() })} placeholder="State" maxLength={2} />
                  <Input value={returnAddr.address_zip} onChange={(v) => setReturnAddr({ ...returnAddr, address_zip: v })} placeholder="ZIP" />
                </div>
              </div>
            </Section>

            {/* Step 3 — Recipients summary */}
            <Section title="Recipients">
              <div style={{
                padding: '12px 14px',
                background: 'var(--cream-2)',
                borderRadius: 10,
                fontSize: 13,
                color: 'var(--ink)',
                lineHeight: 1.5,
              }}>
                {loadingCount ? (
                  <span style={{ color: 'var(--ink-muted)' }}>Counting eligible guests…</span>
                ) : eligibleCount === 0 ? (
                  <>
                    <strong>No mailable addresses on file.</strong>{' '}
                    <span style={{ color: 'var(--ink-muted)' }}>
                      Collect addresses through the guest list before mailing.
                    </span>
                  </>
                ) : (
                  <>
                    <strong>{eligibleCount}</strong>{' '}
                    {eligibleCount === 1 ? 'guest has' : 'guests have'} a mailing address on file.
                  </>
                )}
              </div>
            </Section>

            {/* Cost */}
            {(eligibleCount ?? 0) > 0 && (
              <div
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px',
                  background: 'var(--cream-2)',
                  border: '1px solid var(--peach-ink)',
                  borderRadius: 12,
                  marginTop: 4,
                  marginBottom: 16,
                }}
              >
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: 'var(--peach-ink)', textTransform: 'uppercase' }}>
                    Estimated total
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 4 }}>
                    Lob bills the actual amount on send. Postage is included.
                  </div>
                </div>
                <div className="display" style={{ fontSize: 32, color: 'var(--ink)' }}>
                  ${cost.toFixed(2)}
                </div>
              </div>
            )}

            {error && (
              <div style={{
                padding: '10px 12px',
                background: 'rgba(122,45,45,0.08)',
                color: '#7A2D2D',
                borderRadius: 10,
                fontSize: 12,
                marginBottom: 12,
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '10px 18px',
                  borderRadius: 999,
                  background: 'transparent',
                  color: 'var(--ink)',
                  border: '1.5px solid var(--line)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-ui)',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!canSubmit}
                onClick={handleSubmit}
                className={canSubmit ? 'pl-pearl-accent' : ''}
                style={{
                  padding: '10px 22px',
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: canSubmit ? 'pointer' : 'not-allowed',
                  border: 'none',
                  fontFamily: 'var(--font-ui)',
                  opacity: canSubmit ? 1 : 0.5,
                  background: canSubmit ? undefined : 'var(--ink)',
                  color: canSubmit ? undefined : 'var(--cream)',
                }}
              >
                {submitting ? 'Sending…' : `Send ${eligibleCount ?? 0} ${productSpec.label.toLowerCase()}${(eligibleCount ?? 0) === 1 ? '' : 's'}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div className="eyebrow" style={{ color: 'var(--peach-ink)', marginBottom: 6 }}>
        {title}
      </div>
      {hint && (
        <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginBottom: 8, lineHeight: 1.45 }}>
          {hint}
        </div>
      )}
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, full, maxLength }: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  full?: boolean;
  maxLength?: number;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      style={{
        gridColumn: full ? '1 / -1' : undefined,
        padding: '10px 12px',
        background: 'var(--paper)',
        border: '1.5px solid var(--line)',
        borderRadius: 10,
        fontSize: 13,
        color: 'var(--ink)',
        fontFamily: 'var(--font-ui)',
        outline: 'none',
        boxSizing: 'border-box',
      }}
    />
  );
}

function SuccessView({ result, onClose }: { result: { submitted: number; failed: number; cost: number }; onClose: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '24px 8px' }}>
      <div style={{
        width: 64, height: 64, margin: '0 auto 16px',
        borderRadius: 999,
        background: 'var(--peach-ink, #C6703D)',
        color: '#FFFFFF',
        display: 'grid', placeItems: 'center',
      }}>
        <Icon name="check" size={28} color="#FFFFFF" />
      </div>
      <h2 className="display" style={{ fontSize: 26, marginBottom: 6 }}>In the mail</h2>
      <p style={{ color: 'var(--ink-soft)', fontSize: 14, lineHeight: 1.55, margin: 0 }}>
        {result.submitted} {result.submitted === 1 ? 'card' : 'cards'} are being printed and stamped.
        Tracking codes will appear in your <strong>Print orders</strong> dashboard within a day.
      </p>
      {result.failed > 0 && (
        <p style={{ color: '#A14A2C', fontSize: 12, marginTop: 8 }}>
          {result.failed} {result.failed === 1 ? 'recipient' : 'recipients'} couldn&apos;t be queued — likely missing address fields.
        </p>
      )}
      <div style={{
        margin: '20px auto 24px',
        padding: '12px 16px',
        background: 'var(--cream-2)',
        borderRadius: 10,
        display: 'inline-block',
      }}>
        <span style={{ fontSize: 11, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.16em' }}>
          Total billed
        </span>
        <div className="display" style={{ fontSize: 28, color: 'var(--ink)' }}>
          ${result.cost.toFixed(2)}
        </div>
      </div>
      <div>
        <button
          type="button"
          onClick={onClose}
          className="pl-pearl-accent"
          style={{
            padding: '10px 22px',
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            border: 'none',
            fontFamily: 'var(--font-ui)',
          }}
        >
          Done
        </button>
      </div>
    </div>
  );
}
