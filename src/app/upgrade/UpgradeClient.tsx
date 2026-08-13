'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / app/upgrade/UpgradeClient.tsx
//
// The upgrade surface itself. The two paid cards render from
// DesignPricing's TIERS — the SAME array the landing renders and
// pricing-agreement.test.ts pins to PLAN_LIMITS — so this door
// can never tell a different story than the pricing page (M.2).
//
// Degraded till (no Stripe keys): the checkout API answers 503
// "Payments are not configured." — infrastructure-speak (L83).
// This surface translates it into host language with a next step.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import Link from 'next/link';
import { TIERS } from '@/components/marketing/design/DesignPricing';
import { humanizeCheckoutError } from '@/lib/money-copy';

interface UpgradeClientProps {
  currentPlan: 'free' | 'pro' | 'premium';
  intent: 'pass' | 'keepsake' | null;
  fromLine: string | null;
}

const PLAN_ID: Record<string, 'pass' | 'keepsake'> = {
  Pass: 'pass',
  Keepsake: 'keepsake',
};

/** Held rank per card, so owned tiers render as owned. */
const CARD_RANK: Record<'pass' | 'keepsake', 'pro' | 'premium'> = {
  pass: 'pro',
  keepsake: 'premium',
};

const INK = 'var(--pl-ink, #0E0D0B)';
const CREAM = 'var(--pl-cream, #F5EFE2)';
const SOFT = 'var(--pl-ink-soft, #3A332C)';
const MUTED = 'var(--pl-muted, #6F6557)';
const GOLD = 'var(--pl-gold, #A8862D)';
const LINE = 'var(--pl-divider, rgba(14,13,11,0.14))';
const DISPLAY = 'var(--pl-font-display, Fraunces, Georgia, serif)';
const MONO = 'var(--pl-font-mono, ui-monospace, "Geist Mono", monospace)';

export function UpgradeClient({ currentPlan, intent, fromLine }: UpgradeClientProps) {
  const [busy, setBusy] = useState<'pass' | 'keepsake' | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const paidTiers = TIERS.filter((t) => t.price > 0);
  const rank = currentPlan === 'premium' ? 2 : currentPlan === 'pro' ? 1 : 0;
  const featured: 'pass' | 'keepsake' =
    intent ?? (currentPlan === 'pro' ? 'keepsake' : 'pass');

  async function buy(target: 'pass' | 'keepsake') {
    setBusy(target);
    setErr(null);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: target }),
      });
      const data = (await res.json().catch(() => null)) as
        | { url?: string; error?: string }
        | null;
      if (!res.ok || !data?.url) {
        // Host language only — the server's error string is consulted
        // for classification, never rendered (M.8/L83).
        setErr(humanizeCheckoutError(res.status, data?.error ?? null));
        setBusy(null);
        return;
      }
      // hard on purpose: Stripe checkout is an external origin.
      window.location.assign(data.url);
    } catch {
      setErr(humanizeCheckoutError(null, null));
      setBusy(null);
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: CREAM,
        color: INK,
        padding: '4rem 1.25rem 5rem',
      }}
    >
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <p
          style={{
            fontFamily: MONO,
            fontSize: '0.64rem',
            letterSpacing: '0.26em',
            textTransform: 'uppercase',
            color: MUTED,
            margin: '0 0 14px',
            textAlign: 'center',
          }}
        >
          One-time, not a subscription
        </p>
        <h1
          className="pl-letterpress"
          style={{
            fontFamily: DISPLAY,
            fontStyle: 'italic',
            fontWeight: 600,
            fontSize: 'clamp(32px, 6vw, 48px)',
            lineHeight: 1.1,
            textAlign: 'center',
            margin: '0 0 14px',
          }}
        >
          {currentPlan === 'premium'
            ? 'You already hold everything'
            : currentPlan === 'pro'
              ? 'Keep everything, forever'
              : 'The whole weekend, one payment'}
        </h1>

        {fromLine && (
          <p
            style={{
              fontSize: 15,
              lineHeight: 1.6,
              color: SOFT,
              textAlign: 'center',
              maxWidth: 560,
              margin: '0 auto 8px',
            }}
          >
            {fromLine}
          </p>
        )}
        <p
          style={{
            fontSize: 14.5,
            lineHeight: 1.6,
            color: MUTED,
            textAlign: 'center',
            maxWidth: 560,
            margin: '0 auto 40px',
          }}
        >
          {currentPlan === 'premium'
            ? 'The Keepsake removed every limit — there is nothing left to sell you.'
            : 'Pay once for this celebration. Never again, unless you’re hosting again.'}
        </p>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 18,
            justifyContent: 'center',
            alignItems: 'stretch',
          }}
        >
          {paidTiers.map((t) => {
            const id = PLAN_ID[t.name];
            const owned = rank >= (CARD_RANK[id] === 'premium' ? 2 : 1);
            const isFeatured = !owned && id === featured;
            return (
              <section
                key={t.name}
                aria-label={`${t.name} plan`}
                style={{
                  flex: '1 1 300px',
                  maxWidth: 400,
                  background: 'var(--pl-cream-card, #FBF7EC)',
                  border: isFeatured ? `1px solid ${GOLD}` : `1px solid ${LINE}`,
                  borderRadius: 18,
                  padding: '26px 26px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  opacity: owned && currentPlan !== 'premium' ? 0.72 : 1,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    gap: 10,
                  }}
                >
                  <h2
                    style={{
                      fontFamily: DISPLAY,
                      fontSize: 28,
                      fontWeight: 500,
                      margin: 0,
                    }}
                  >
                    {t.name}
                  </h2>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                    <span style={{ fontFamily: DISPLAY, fontSize: 30, fontWeight: 500 }}>
                      ${t.price}
                    </span>
                    <span style={{ fontSize: 12.5, color: MUTED }}>· {t.cadence}</span>
                  </div>
                </div>
                <p style={{ fontSize: 13.5, color: SOFT, margin: '6px 0 16px' }}>{t.blurb}</p>
                <div style={{ height: 1, background: LINE, marginBottom: 16 }} />
                <ul
                  style={{
                    listStyle: 'none',
                    margin: '0 0 22px',
                    padding: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 9,
                    flex: 1,
                  }}
                >
                  {t.feats.map((f) => (
                    <li
                      key={f}
                      style={{ fontSize: 13.5, lineHeight: 1.5, color: SOFT, display: 'flex', gap: 8 }}
                    >
                      <span aria-hidden style={{ color: GOLD }}>·</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                {owned ? (
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: '0.64rem',
                      letterSpacing: '0.2em',
                      textTransform: 'uppercase',
                      color: MUTED,
                      padding: '12px 0',
                      textAlign: 'center',
                    }}
                  >
                    Your plan
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => buy(id)}
                    disabled={busy !== null}
                    style={{
                      padding: '13px 22px',
                      borderRadius: 999,
                      border: 'none',
                      background: isFeatured ? INK : 'transparent',
                      color: isFeatured ? CREAM : INK,
                      boxShadow: isFeatured ? 'none' : `inset 0 0 0 1px ${INK}`,
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: busy ? 'default' : 'pointer',
                    }}
                  >
                    {busy === id ? 'One moment…' : `Choose ${t.name}`}
                  </button>
                )}
              </section>
            );
          })}
        </div>

        {err && (
          <p
            role="alert"
            style={{
              margin: '22px auto 0',
              maxWidth: 560,
              textAlign: 'center',
              fontSize: 13.5,
              lineHeight: 1.55,
              color: 'var(--pl-plum, #7A2D2D)',
            }}
          >
            {err}
          </p>
        )}

        <p
          style={{
            marginTop: 40,
            textAlign: 'center',
            fontSize: 13,
            color: MUTED,
          }}
        >
          One-time, never a subscription. Memorials are always free on every tier.
        </p>
        <p style={{ textAlign: 'center', marginTop: 10 }}>
          <Link
            href="/dashboard"
            style={{ fontSize: 13.5, color: SOFT, textDecoration: 'none', borderBottom: `1px solid ${LINE}` }}
          >
            &larr; Back to your dashboard
          </Link>
        </p>
      </div>
    </main>
  );
}
