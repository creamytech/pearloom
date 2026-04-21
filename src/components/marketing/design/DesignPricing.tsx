'use client';

// Pricing — three tiers. Middle tier is featured (dark, lifted,
// MOST CHOSEN badge). Matches design bundle's pricing.jsx.

import { Leaf, Pearl, Pill, PLButton, PD, DISPLAY_STYLE, MONO_STYLE } from './DesignAtoms';

type TierName = 'Journal' | 'Atelier' | 'Legacy';
type BtnVariant = 'ghost' | 'butter' | 'ink';

interface Tier {
  name: TierName;
  price: number;
  cadence: string;
  blurb: string;
  feats: string[];
  bg: string;
  fg?: string;
  accent: string;
  btn: BtnVariant;
  featured?: boolean;
}

const TIERS: Tier[] = [
  {
    name: 'Journal',
    price: 0,
    cadence: 'forever',
    blurb: 'Your first celebration, kept free always.',
    feats: [
      'One site, yours to keep',
      'The full drafting by Pear',
      'Unlimited RSVPs',
      'All 28 occasions',
      'The Reel (one event)',
      'Pearloom subdomain',
    ],
    bg: PD.paper3,
    accent: PD.olive,
    btn: 'ghost',
  },
  {
    name: 'Atelier',
    price: 19,
    cadence: 'once',
    blurb: 'One celebration, every block unlocked.',
    feats: [
      'Everything in Journal',
      'Every block, every template',
      'Custom domain',
      'The Director (day-of room)',
      'Live photo wall + toasts',
      'Anniversary rebroadcast',
      'Priority Pear ~2h',
    ],
    bg: PD.ink,
    fg: PD.paper,
    accent: PD.butter,
    btn: 'butter',
    featured: true,
  },
  {
    name: 'Legacy',
    price: 129,
    cadence: 'lifetime',
    blurb: 'Every future celebration, one price.',
    feats: [
      'Everything in Atelier',
      'Every event, forever',
      'Family workspace',
      'Cross-event Reel',
      'Heirloom export (print-ready)',
      'Pear-priority line',
    ],
    bg: PD.paper2,
    accent: PD.gold,
    btn: 'ink',
  },
];

interface DesignPricingProps {
  onGetStarted: () => void;
}

export function DesignPricing({ onGetStarted }: DesignPricingProps) {
  return (
    <section
      id="pricing"
      style={{ padding: '140px 24px', position: 'relative', overflow: 'hidden', background: PD.paper }}
    >
      <div style={{ maxWidth: 1320, margin: '0 auto', position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: 64, maxWidth: 760, marginInline: 'auto' }}>
          <Pill style={{ marginBottom: 18 }}>
            <Pearl size={7} /> ONE-TIME, NOT A SUBSCRIPTION
          </Pill>
          <h2
            style={{
              ...DISPLAY_STYLE,
              fontSize: 'clamp(40px, 5.5vw, 76px)',
              lineHeight: 0.95,
              margin: '0 0 20px',
              fontWeight: 400,
              letterSpacing: '-0.025em',
              color: PD.ink,
            }}
          >
            Your first site is{' '}
            <span
              style={{
                fontStyle: 'italic',
                color: PD.olive,
                fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
              }}
            >
              free
            </span>
            <br />
            forever.
          </h2>
          <p
            style={{
              fontFamily: 'var(--pl-font-body)',
              fontSize: 18,
              color: PD.inkSoft,
              lineHeight: 1.5,
            }}
          >
            Pay when you want every block and the day-of room. Never again, unless you&rsquo;re
            hosting again.
          </p>
        </div>

        <div
          className="pd-pricing-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 20,
            alignItems: 'stretch',
            maxWidth: 1200,
            margin: '0 auto',
          }}
        >
          {TIERS.map((t) => (
            <div
              key={t.name}
              style={{
                background: t.bg,
                color: t.fg ?? PD.ink,
                border: `1px solid ${t.featured ? t.accent : 'rgba(31,36,24,0.14)'}`,
                borderRadius: 20,
                padding: '36px 32px 32px',
                transform: t.featured ? 'translateY(-14px)' : 'none',
                boxShadow: t.featured
                  ? '0 30px 60px -20px rgba(31,36,24,0.35)'
                  : '0 1px 3px rgba(31,36,24,0.06)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {t.featured && (
                <div
                  style={{
                    ...MONO_STYLE,
                    position: 'absolute',
                    top: -11,
                    left: 32,
                    background: t.accent,
                    color: PD.ink,
                    borderRadius: 999,
                    padding: '4px 12px',
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                  }}
                >
                  MOST CHOSEN
                </div>
              )}

              <div
                style={{
                  ...DISPLAY_STYLE,
                  fontSize: 36,
                  fontWeight: 400,
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                }}
              >
                {t.name}
              </div>
              <div
                style={{
                  fontFamily: 'var(--pl-font-body)',
                  fontSize: 14,
                  opacity: 0.75,
                  marginTop: 8,
                  minHeight: 40,
                }}
              >
                {t.blurb}
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '28px 0 6px' }}>
                <span
                  style={{
                    ...DISPLAY_STYLE,
                    fontSize: 58,
                    fontWeight: 400,
                    lineHeight: 1,
                    letterSpacing: '-0.03em',
                  }}
                >
                  ${t.price}
                </span>
                <span style={{ fontSize: 13, opacity: 0.7, fontFamily: 'var(--pl-font-body)' }}>
                  · {t.cadence}
                </span>
              </div>
              <div style={{ width: 60, height: 1, background: t.accent, margin: '18px 0 20px' }} />

              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: '0 0 28px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 11,
                  flex: 1,
                }}
              >
                {t.feats.map((f) => (
                  <li
                    key={f}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      fontSize: 14,
                      lineHeight: 1.45,
                      fontFamily: 'var(--pl-font-body)',
                    }}
                  >
                    <Leaf size={12} color={t.accent} rotate={-20} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <PLButton
                variant={t.btn}
                size="md"
                onClick={onGetStarted}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {t.price === 0 ? 'Begin a thread' : `Choose ${t.name}`} <Pearl size={8} />
              </PLButton>
            </div>
          ))}
        </div>

        <div
          style={{
            textAlign: 'center',
            marginTop: 48,
            fontSize: 14,
            color: PD.inkSoft,
            fontFamily: 'var(--pl-font-body)',
          }}
        >
          Memorials are always free on every tier.{' '}
          <a href="#journal" style={{ color: PD.olive, fontWeight: 500, textDecoration: 'underline' }}>
            Pear&rsquo;s promise →
          </a>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          :global(.pd-pricing-grid) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
