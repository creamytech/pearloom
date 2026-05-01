'use client';

// ──────────────────────────────────────────────────────────────
// RegistryItemsBlock
//
// Native registry — couple lists items, guests claim & pay through
// Pearloom (Stripe Checkout redirect). Distinct from RegistrySection
// which is the link-out directory to Zola/Amazon.
//
// Reads /api/registry-items?siteId=... and renders a responsive
// grid. Each item shows photo, title, price, and a Claim button
// that opens a small modal asking for email + optional message,
// then redirects to Stripe Checkout.
//
// Webhook updates the item's claim count on success; the UI
// polls/refreshes on visit so guests see "1 of 4 claimed" etc.
// ──────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';

interface Item {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  imageUrl: string | null;
  itemUrl: string | null;
  category: string | null;
  priority: 'need' | 'want' | 'dream';
  quantity: number;
  quantityClaimed: number;
  purchased: boolean;
  sortOrder: number;
}

interface Props {
  siteId: string;
  title?: string;
  subtitle?: string;
}

export function RegistryItemsBlock({ siteId, title = 'Registry', subtitle }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeItem, setActiveItem] = useState<Item | null>(null);

  useEffect(() => {
    fetch(`/api/registry-items?siteId=${encodeURIComponent(siteId)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((data: { items?: Item[] }) => setItems(data.items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [siteId]);

  if (loading) {
    return (
      <section style={{ padding: 'clamp(48px, 8vw, 96px) 24px', textAlign: 'center' }}>
        <div style={{ color: 'var(--ink-muted, #6F6557)' }}>Threading the registry…</div>
      </section>
    );
  }

  if (items.length === 0) return null;

  return (
    <section style={{ padding: 'clamp(48px, 8vw, 96px) 24px', maxWidth: 1180, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h2 className="display" style={{ fontSize: 'clamp(36px, 5vw, 56px)', margin: 0, color: 'var(--ink)' }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{ color: 'var(--ink-soft)', marginTop: 12, fontSize: 16, lineHeight: 1.55, maxWidth: 540, margin: '12px auto 0' }}>
            {subtitle}
          </p>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 18,
        }}
      >
        {items.map((item) => (
          <RegistryItemCard key={item.id} item={item} onClaim={() => setActiveItem(item)} />
        ))}
      </div>

      {activeItem && (
        <ClaimModal
          item={activeItem}
          siteId={siteId}
          onClose={() => setActiveItem(null)}
        />
      )}
    </section>
  );
}

function RegistryItemCard({ item, onClaim }: { item: Item; onClaim: () => void }) {
  const remaining = Math.max(0, item.quantity - item.quantityClaimed);
  const fullyClaimed = remaining <= 0;
  return (
    <div
      style={{
        background: 'var(--card, #FBF7EE)',
        border: '1px solid var(--card-ring, rgba(61,74,31,0.14))',
        borderRadius: 14,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          aspectRatio: '4/3',
          background: item.imageUrl
            ? `url(${item.imageUrl}) center/cover`
            : 'linear-gradient(135deg, var(--peach-bg), var(--sage-tint))',
        }}
      />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{item.name}</div>
          {item.price && (
            <div style={{ fontSize: 14, color: 'var(--ink-soft)' }}>${formatPrice(item.price)}</div>
          )}
        </div>
        {item.description && (
          <div style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.45 }}>
            {item.description}
          </div>
        )}
        <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 'auto' }}>
          {fullyClaimed
            ? 'Fully claimed — thank you'
            : item.quantity > 1
              ? `${remaining} of ${item.quantity} left`
              : 'Available'}
        </div>
        <button
          type="button"
          onClick={onClaim}
          disabled={fullyClaimed}
          style={{
            marginTop: 8,
            padding: '10px 14px',
            borderRadius: 999,
            border: '1px solid var(--ink, #18181B)',
            background: fullyClaimed ? 'transparent' : 'var(--ink, #18181B)',
            color: fullyClaimed ? 'var(--ink-muted)' : 'var(--cream, #FBF7EE)',
            fontSize: 13,
            fontWeight: 600,
            cursor: fullyClaimed ? 'not-allowed' : 'pointer',
            opacity: fullyClaimed ? 0.5 : 1,
          }}
        >
          {fullyClaimed ? 'Claimed' : 'I’ll get this'}
        </button>
      </div>
    </div>
  );
}

function ClaimModal({ item, siteId, onClose }: { item: Item; siteId: string; onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = Math.max(0, item.quantity - item.quantityClaimed);
  const total = (item.price ?? 0) * quantity;

  async function submit() {
    if (!email.includes('@')) {
      setError('Please enter a valid email — Stripe sends the receipt there.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/registry-items/${item.id}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payerEmail: email, payerName: name, quantity, message }),
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
    <div
      role="dialog"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(14,13,11,0.55)',
        backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: 20, zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--cream, #FDFAF0)', borderRadius: 18,
          padding: 28, maxWidth: 440, width: '100%', position: 'relative',
        }}
      >
        <button
          type="button" onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute', top: 12, right: 12, background: 'transparent',
            border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--ink-soft)',
          }}
        >×</button>
        <h3 style={{ fontFamily: 'var(--pl-font-display, Georgia, serif)', fontSize: 22, margin: 0 }}>
          {item.name}
        </h3>
        <div style={{ fontSize: 13, color: 'var(--ink-muted)', marginTop: 4 }}>
          ${formatPrice(item.price ?? 0)} {item.quantity > 1 && `each · ${remaining} available`}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 18 }}>
          <Field label="Your email">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com" autoFocus required style={inputStyle} />
          </Field>
          <Field label="Name (optional)">
            <input value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Anna Park" style={inputStyle} />
          </Field>
          {item.quantity > 1 && (
            <Field label="How many">
              <input type="number" min={1} max={remaining} value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(remaining, parseInt(e.target.value, 10) || 1)))}
                style={inputStyle} />
            </Field>
          )}
          <Field label="A note for the couple (optional)">
            <textarea value={message} onChange={(e) => setMessage(e.target.value)}
              rows={2} maxLength={300} style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }} />
          </Field>
        </div>

        {error && (
          <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(155,52,38,0.08)', color: '#9B3426', fontSize: 13 }}>
            {error}
          </div>
        )}

        <button
          type="button" onClick={submit} disabled={submitting}
          style={{
            marginTop: 16, width: '100%', padding: '12px 16px',
            borderRadius: 999, border: 'none', background: 'var(--ink, #18181B)',
            color: 'var(--cream, #FBF7EE)', fontSize: 14, fontWeight: 600,
            cursor: submitting ? 'wait' : 'pointer',
          }}
        >
          {submitting ? 'Opening checkout…' : `Continue to pay $${formatPrice(total)}`}
        </button>
        <div style={{ fontSize: 11, color: 'var(--ink-muted)', textAlign: 'center', marginTop: 8 }}>
          Secure payment via Stripe. The couple receives the gift, minus a small platform fee.
        </div>
      </div>
    </div>
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

function formatPrice(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
