'use client';

import { PD, DISPLAY_STYLE, MONO_STYLE } from '../design/DesignAtoms';

const TIERS = [
  {
    k: 'starter',
    name: 'Starter',
    sub: 'Perfect for personal events',
    price: '0',
    period: '',
    billing: 'Always free',
    cta: 'Get started',
    highlighted: false,
  },
  {
    k: 'essentials',
    name: 'Essentials',
    sub: 'Everything you need to plan',
    price: '19',
    period: '/month',
    billing: 'Billed annually',
    cta: 'Start free trial',
    highlighted: true,
  },
  {
    k: 'pro',
    name: 'Professional',
    sub: 'For planners & pros',
    price: '49',
    period: '/month',
    billing: 'Billed annually',
    cta: 'Start free trial',
    highlighted: false,
  },
  {
    k: 'enterprise',
    name: 'Enterprise',
    sub: 'For teams & organizations',
    price: 'Custom',
    period: '',
    billing: 'Tailored to your needs',
    cta: 'Contact sales',
    highlighted: false,
  },
];

export function LandingPricing({ onStart }: { onStart: () => void }) {
  return (
    <section id="pricing" style={{ padding: '80px 40px', background: PD.paper }}>
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          background: PD.paperCard,
          borderRadius: 24,
          padding: 'clamp(32px, 4vw, 56px)',
          border: '1px solid rgba(31,36,24,0.06)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 3fr)',
            gap: 40,
            alignItems: 'center',
          }}
          className="pl-pricing-grid"
        >
          <div>
            <div
              style={{
                ...MONO_STYLE,
                fontSize: 11,
                color: '#6E5BA8',
                letterSpacing: '0.26em',
                marginBottom: 14,
              }}
            >
              SIMPLE, TRANSPARENT PRICING
            </div>
            <h2
              style={{
                ...DISPLAY_STYLE,
                fontSize: 'clamp(28px, 3vw, 40px)',
                margin: 0,
                fontWeight: 400,
                letterSpacing: '-0.02em',
                lineHeight: 1.15,
              }}
            >
              Choose the plan that fits your day.
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: 14,
            }}
            className="pl-pricing-tiers"
          >
            {TIERS.map((t) => (
              <Tier key={t.k} {...t} onClick={onStart} />
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 1060px) {
          :global(.pl-pricing-grid) {
            grid-template-columns: 1fr !important;
          }
          :global(.pl-pricing-tiers) {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }
        @media (max-width: 600px) {
          :global(.pl-pricing-tiers) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}

function Tier({
  name,
  sub,
  price,
  period,
  billing,
  cta,
  highlighted,
  onClick,
}: {
  name: string;
  sub: string;
  price: string;
  period: string;
  billing: string;
  cta: string;
  highlighted: boolean;
  onClick: () => void;
}) {
  const custom = price === 'Custom';
  return (
    <div
      style={{
        background: '#FFFEF7',
        border: highlighted
          ? `1.5px solid ${PD.olive}`
          : '1px solid rgba(31,36,24,0.08)',
        borderRadius: 16,
        padding: '22px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        position: 'relative',
      }}
    >
      {highlighted && (
        <div
          style={{
            position: 'absolute',
            top: -10,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#C8B3D9',
            color: PD.ink,
            fontSize: 10,
            padding: '4px 10px',
            borderRadius: 999,
            fontWeight: 500,
          }}
        >
          Most popular
        </div>
      )}
      <div>
        <div
          style={{
            ...DISPLAY_STYLE,
            fontSize: 18,
            fontWeight: 400,
            letterSpacing: '-0.01em',
          }}
        >
          {name}
        </div>
        <div style={{ fontSize: 11.5, color: PD.inkSoft, marginTop: 4, lineHeight: 1.4 }}>
          {sub}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        {!custom && <span style={{ fontSize: 22 }}>$</span>}
        <span
          style={{
            ...DISPLAY_STYLE,
            fontSize: custom ? 28 : 44,
            fontWeight: 400,
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          {price}
        </span>
        {period && <span style={{ fontSize: 12, color: PD.inkSoft }}>{period}</span>}
      </div>
      <div style={{ fontSize: 11, color: PD.inkSoft, opacity: 0.75 }}>{billing}</div>
      <button
        onClick={onClick}
        style={{
          marginTop: 'auto',
          background: highlighted ? PD.oliveDeep : 'transparent',
          color: highlighted ? '#FFFEF7' : PD.ink,
          border: highlighted ? 'none' : '1px solid rgba(31,36,24,0.2)',
          borderRadius: 999,
          padding: '10px 16px',
          fontSize: 12.5,
          fontWeight: 500,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        {cta}
      </button>
    </div>
  );
}
