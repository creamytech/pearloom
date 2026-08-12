// /store/success — where Stripe sends a theme-pack buyer after
// payment. This page DID NOT EXIST while the checkout pointed at it
// (NEW-USER-REVAMP L8): a completed purchase landed on a 404 — the
// worst possible moment for one. A calm receipt: what happened,
// where the packs live now, and the two doors a buyer actually
// wants next.

import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'It’s yours · Pearloom',
  robots: { index: false },
};

export default function StoreSuccessPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        textAlign: 'center',
        background: 'var(--pl-cream, #F5EFE2)',
        color: 'var(--pl-ink, #0E0D0B)',
        fontFamily: 'var(--pl-font-body, system-ui, sans-serif)',
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'var(--pl-olive, #5C6B3F)',
          marginBottom: 18,
        }}
      >
        Paid & pressed
      </div>
      <h1
        style={{
          fontFamily: 'var(--font-display, Fraunces, serif)',
          fontSize: 'clamp(34px, 6vw, 52px)',
          lineHeight: 1.05,
          margin: '0 0 14px',
        }}
      >
        It’s yours.
      </h1>
      <p style={{ maxWidth: 420, fontSize: 15, lineHeight: 1.6, color: 'var(--pl-ink-soft, #4A463D)', margin: '0 0 28px' }}>
        Your payment went through and the pack is unlocked on your
        account. You’ll find it ready to apply in the editor’s Theme
        panel — and it stays yours on every site you make.
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link
          href="/dashboard/event"
          style={{
            padding: '12px 22px',
            borderRadius: 999,
            background: 'var(--pl-ink, #0E0D0B)',
            color: 'var(--pl-cream, #F5EFE2)',
            fontSize: 14,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Open my site
        </Link>
        <Link
          href="/store"
          style={{
            padding: '12px 22px',
            borderRadius: 999,
            border: '1px solid var(--pl-divider, #D8CFBB)',
            color: 'var(--pl-ink, #0E0D0B)',
            fontSize: 14,
            fontWeight: 600,
            textDecoration: 'none',
            background: 'transparent',
          }}
        >
          Back to the store
        </Link>
      </div>
    </div>
  );
}
