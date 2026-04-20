'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/site/CostSplitterBlock.tsx
//
// Shared group-trip budget for bachelor/ette parties and
// reunion trips. Hosts list expenses; the block shows the total
// and the per-person share. Read-only for guests.
//
// Purely presentational — no live syncing to Splitwise/Venmo
// yet. Optional `payoutHandle` renders as a callout so the host
// can say "Venmo @best-man when you confirm."
// ─────────────────────────────────────────────────────────────

import type { CSSProperties } from 'react';

export interface CostLineItem {
  /** Short human label: "Airbnb", "Dinner Saturday", "Activity". */
  label: string;
  /** Numeric amount in the displayed currency. */
  amount: number;
  /** Optional one-line note under the label. */
  note?: string;
}

interface CostSplitterBlockProps {
  title?: string;
  subtitle?: string;
  currency?: string; // "USD", "EUR" — purely for formatting.
  headcount?: number;
  lineItems: CostLineItem[];
  /** e.g. "Venmo @best-man" — shown as a pay-to line. */
  payoutHandle?: string;
  accent?: string;
  foreground?: string;
  muted?: string;
  headingFont?: string;
  bodyFont?: string;
  style?: CSSProperties;
}

export function CostSplitterBlock({
  title = 'The cost share',
  subtitle,
  currency = 'USD',
  headcount,
  lineItems,
  payoutHandle,
  accent = 'var(--pl-olive)',
  foreground = 'var(--pl-ink)',
  muted = 'var(--pl-muted)',
  headingFont = 'var(--pl-font-display, Georgia, serif)',
  bodyFont = 'var(--pl-font-body, system-ui, sans-serif)',
  style,
}: CostSplitterBlockProps) {
  const total = lineItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const perPerson = headcount && headcount > 0 ? total / headcount : null;

  const fmt = (n: number) => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
      }).format(n);
    } catch {
      return `${currency} ${Math.round(n)}`;
    }
  };

  return (
    <section
      style={{
        padding: 'clamp(48px, 8vw, 96px) clamp(20px, 5vw, 64px)',
        color: foreground,
        fontFamily: bodyFont,
        ...style,
      }}
      data-pe-section="costSplitter"
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <header style={{ textAlign: 'center', marginBottom: 36 }}>
          <h2
            className="pl-display"
            style={{
              margin: 0,
              fontFamily: headingFont,
              fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
              color: foreground,
              fontStyle: 'italic',
              fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
            }}
          >
            {title}
          </h2>
          {subtitle && (
            <p style={{ margin: '10px auto 0', maxWidth: '52ch', color: muted, fontSize: 'clamp(0.92rem, 1.1vw, 1rem)', lineHeight: 1.55 }}>
              {subtitle}
            </p>
          )}
        </header>

        {/* Line items */}
        <div
          style={{
            border: '1px solid var(--pl-divider)',
            borderRadius: 'var(--pl-radius-lg)',
            background: 'var(--pl-cream-card)',
            overflow: 'hidden',
          }}
        >
          <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {lineItems.length === 0 ? (
              <li style={{ padding: '20px 24px', color: muted, fontStyle: 'italic', fontSize: '0.9rem' }}>
                Nothing logged yet. The host will fill this in.
              </li>
            ) : (
              lineItems.map((item, i) => (
                <li
                  key={`${item.label}-${i}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: 20,
                    padding: '14px 24px',
                    borderTop: i > 0 ? '1px solid var(--pl-divider-soft)' : undefined,
                    alignItems: 'baseline',
                  }}
                >
                  <div>
                    <div style={{ fontFamily: headingFont, fontSize: '1rem', fontWeight: 500, color: foreground }}>
                      {item.label}
                    </div>
                    {item.note && (
                      <div style={{ marginTop: 2, fontSize: '0.82rem', color: muted, lineHeight: 1.5 }}>
                        {item.note}
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--pl-font-mono, ui-monospace)',
                      fontSize: '0.92rem',
                      fontWeight: 600,
                      color: foreground,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {fmt(Number(item.amount) || 0)}
                  </div>
                </li>
              ))
            )}
          </ol>

          {/* Footer: totals */}
          {lineItems.length > 0 && (
            <div
              style={{
                padding: '18px 24px',
                borderTop: `2px solid ${accent}`,
                background: `color-mix(in oklab, ${accent} 8%, transparent)`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--pl-font-mono, ui-monospace)',
                  fontSize: '0.66rem',
                  fontWeight: 700,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: accent,
                }}
              >
                Total
              </div>
              <div
                style={{
                  fontFamily: headingFont,
                  fontStyle: 'italic',
                  fontSize: '1.4rem',
                  color: foreground,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {fmt(total)}
              </div>
            </div>
          )}
        </div>

        {/* Per-person summary */}
        {perPerson !== null && (
          <div
            style={{
              marginTop: 20,
              padding: '18px 24px',
              border: `1px dashed ${accent}`,
              borderRadius: 'var(--pl-radius-lg)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: 'var(--pl-font-mono, ui-monospace)',
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: muted,
                }}
              >
                Your share · {headcount} people
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontFamily: headingFont,
                  fontStyle: 'italic',
                  fontSize: 'clamp(1.6rem, 3vw, 2rem)',
                  color: foreground,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {fmt(perPerson)}
              </div>
            </div>
            {payoutHandle && (
              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    fontFamily: 'var(--pl-font-mono, ui-monospace)',
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    color: muted,
                  }}
                >
                  Pay to
                </div>
                <div
                  style={{
                    marginTop: 4,
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: foreground,
                  }}
                >
                  {payoutHandle}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
