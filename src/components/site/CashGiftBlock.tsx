'use client';

// ──────────────────────────────────────────────────────────────
// CashGiftBlock
//
// Public site block: "Send a cash gift". Guest picks an amount,
// enters email + optional message, redirects to Stripe Checkout.
// Webhook records the payment server-side.
//
// Pearloom takes a small platform fee (3% — see PEARLOOM_FEE_BPS);
// the couple receives the net.
// ──────────────────────────────────────────────────────────────

import { useState } from 'react';

interface Props {
  siteId: string;
  title?: string;
  subtitle?: string;
  presetAmounts?: number[];
  /** Block-level label, e.g. "Honeymoon fund" or "Down-payment fund". */
  label?: string;
}

const DEFAULT_AMOUNTS = [25, 50, 100, 200, 500];

export function CashGiftBlock({
  siteId,
  title = 'A cash gift',
  subtitle = 'Toward whatever helps the most.',
  presetAmounts = DEFAULT_AMOUNTS,
  label = 'Cash gift',
}: Props) {
  const [amount, setAmount] = useState<number>(presetAmounts[1] ?? 50);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    const finalAmount = customAmount ? Math.round(parseFloat(customAmount) * 100) : amount * 100;
    if (!Number.isFinite(finalAmount) || finalAmount < 500) {
      setError('Minimum gift is $5.');
      return;
    }
    if (finalAmount > 2_500_000) {
      setError('Maximum gift is $25,000.');
      return;
    }
    if (!email.includes('@')) {
      setError('A valid email is required for the receipt.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/cash-gift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId, amountCents: finalAmount,
          payerEmail: email, payerName: name, message, label,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not start checkout.');
        return;
      }
      if (data.url) window.location.href = data.url;
    } catch (e) {
      setError('Network error — try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section style={{ padding: 'clamp(48px, 8vw, 96px) 24px', maxWidth: 720, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <h2 className="display" style={{ fontSize: 'clamp(36px, 5vw, 56px)', margin: 0, color: 'var(--ink)' }}>
          {title}
        </h2>
        <p style={{ color: 'var(--ink-soft)', marginTop: 12, fontSize: 16, lineHeight: 1.55 }}>
          {subtitle}
        </p>
      </div>

      <div
        style={{
          background: 'var(--card, #FBF7EE)',
          border: '1px solid var(--card-ring, rgba(61,74,31,0.14))',
          borderRadius: 18,
          padding: 'clamp(20px, 4vw, 32px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase',
              color: 'var(--ink-muted)', fontWeight: 600, marginBottom: 10,
            }}
          >
            Amount
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {presetAmounts.map((a) => {
              const active = !customAmount && a === amount;
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => { setAmount(a); setCustomAmount(''); }}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 999,
                    border: active ? '1.5px solid var(--ink)' : '1px solid var(--line, rgba(61,74,31,0.14))',
                    background: active ? 'var(--ink, #18181B)' : 'var(--card, #FFFFFF)',
                    color: active ? 'var(--cream, #FBF7EE)' : 'var(--ink)',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  ${a}
                </button>
              );
            })}
            <div style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--ink-muted)', fontSize: 14, pointerEvents: 'none',
                }}
              >$</span>
              <input
                type="number" min={5} max={25000} step={5}
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="Other"
                style={{
                  padding: '10px 14px 10px 24px',
                  borderRadius: 999,
                  border: customAmount ? '1.5px solid var(--ink)' : '1px solid var(--line, rgba(61,74,31,0.14))',
                  background: 'var(--card, #FFFFFF)',
                  fontSize: 14, width: 100, color: 'var(--ink)',
                }}
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Email">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com" required style={inputStyle} />
          </Field>
          <Field label="Name (optional)">
            <input value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Anna Park" style={inputStyle} />
          </Field>
        </div>

        <Field label="Note for the couple (optional)">
          <textarea value={message} onChange={(e) => setMessage(e.target.value)}
            rows={3} maxLength={300}
            placeholder="A few words they'll see with the gift…"
            style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }} />
        </Field>

        {error && (
          <div style={{ padding: 10, borderRadius: 8, background: 'rgba(155,52,38,0.08)', color: '#9B3426', fontSize: 13 }}>
            {error}
          </div>
        )}

        <button
          type="button" onClick={submit} disabled={submitting}
          style={{
            marginTop: 4, padding: '14px 18px',
            borderRadius: 999, border: 'none', background: 'var(--ink, #18181B)',
            color: 'var(--cream, #FBF7EE)', fontSize: 15, fontWeight: 600,
            cursor: submitting ? 'wait' : 'pointer',
          }}
        >
          {submitting
            ? 'Opening checkout…'
            : `Continue to pay $${(customAmount ? parseFloat(customAmount) || 0 : amount).toLocaleString('en-US')}`}
        </button>
        <div style={{ fontSize: 11, color: 'var(--ink-muted)', textAlign: 'center' }}>
          Secure payment via Stripe.
        </div>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--ink-muted)', fontWeight: 600 }}>
        {label}
      </span>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid var(--line, rgba(61,74,31,0.14))',
  background: 'var(--card, #FFFFFF)',
  fontSize: 14,
  color: 'var(--ink)',
};
