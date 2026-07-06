'use client';

// Pricing — three tiers. Middle tier is featured (dark, lifted,
// MOST CHOSEN badge). Matches design bundle's pricing.jsx.

import { Leaf, Pearl, Pill, PLButton, PD, DISPLAY_STYLE, MONO_STYLE, pdInkMix, pdShadowMix } from './DesignAtoms';

type TierName = 'Journal' | 'Atelier' | 'Legacy';
type BtnVariant = 'ghost' | 'pearl' | 'ink';

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
      'All 31 occasions',
      'The Reel (one event)',
      'Your pearloom.com address',
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
      'Every premium theme pack included',
      'Ten times the photo library',
      'The Director (day-of room)',
      'Live photo wall + toasts',
      'Anniversary rebroadcast',
      'Pear drafts — proofs, toasts, rewrites',
    ],
    bg: PD.ink,
    fg: PD.paper,
    accent: PD.butter,
    // Pearl, not a gold-filled button — gold is never a background
    // (BRAND.md §5); the pearl is the documented highlighted-tier
    // treatment (CLAUDE-DESIGN.md §6.5).
    btn: 'pearl',
    featured: true,
  },
  {
    name: 'Legacy',
    price: 129,
    cadence: 'lifetime',
    blurb: 'Every future celebration, one price.',
    feats: [
      'Everything in Atelier',
      'Up to ten sites, forever',
      'The full Theme Store, signature shelf included',
      'Co-hosts on every site',
      'Linked celebrations — one weekend, many sites',
      'Heirloom memory book (print-ready)',
      '$50 Pearloom Print credit',
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
      style={{ padding: 'clamp(48px, 8vw, 96px) clamp(20px, 5vw, 24px) clamp(56px, 10vw, 120px)', position: 'relative', overflow: 'hidden', background: PD.paper }}
    >
      <div style={{ maxWidth: 1320, margin: '0 auto', position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: 48, maxWidth: 760, marginInline: 'auto' }}>
          <Pill style={{ marginBottom: 18 }}>
            <Pearl size={7} /> ONE-TIME, NOT A SUBSCRIPTION
          </Pill>
          <h2
            className="pl-letterpress"
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
          data-reveal-stagger="90"
          data-reveal-as="rise"
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
              className={`pd-tier${t.featured ? ' pd-tier-featured' : ''}`}
              style={{
                position: 'relative',
                // The featured tier floats above its neighbours so the
                // raised ribbon is never covered by an adjacent card.
                zIndex: t.featured ? 2 : 1,
                display: 'flex',
                flexDirection: 'column',
                // Featured lift (top: -14) is a desktop-only flourish,
                // applied to this wrapper in the <style jsx> below at
                // ≥901px. On the single-column mobile stack the raise
                // only crowds the ribbon, so the card stays flush there.
              }}
            >
              {t.featured && (
                <div
                  style={{
                    ...MONO_STYLE,
                    position: 'absolute',
                    top: -12,
                    left: 32,
                    zIndex: 3,
                    background: t.accent,
                    // Constant dark ink — the butter badge keeps its
                    // color in dark mode, so its text must not flip
                    // to cream with PD.ink.
                    color: '#2C1E12',
                    borderRadius: 999,
                    padding: '4px 12px',
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    whiteSpace: 'nowrap',
                    // A soft drop-shadow so the ribbon reads as floating
                    // ABOVE the card edge — without it the butter pill can
                    // blend into a light card behind it and look clipped.
                    boxShadow: '0 6px 16px -6px rgba(20, 16, 10, 0.5)',
                  }}
                >
                  MOST CHOSEN
                </div>
              )}

              {/* The card body. The ribbon lives on the wrapper ABOVE,
                  never inside this rounded box: WebKit/iOS clips a child
                  that overflows a border-radius element which also forms
                  a stacking context / is transformed — that sheared the
                  ribbon's top on Safari (Chromium doesn't, so it looked
                  fine in preview). Keeping the ribbon out of the rounded
                  card sidesteps the clip on every engine. */}
              <div
                className="pl-lift"
                style={{
                  background: t.bg,
                  color: t.fg ?? PD.ink,
                  border: `1px solid ${t.featured ? t.accent : pdInkMix(14)}`,
                  borderRadius: 20,
                  padding: '36px 32px 32px',
                  boxShadow: t.featured
                    ? `0 30px 60px -20px ${pdShadowMix(35)}`
                    : `0 1px 3px ${pdShadowMix(6)}`,
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
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
          <a href="#journal" className="pl-link" style={{ color: PD.olive, fontWeight: 500 }}>
            Pear&rsquo;s promise →
          </a>
        </div>
      </div>

      <style jsx>{`
        /* The featured tier lifts above its neighbours only on the
           three-across desktop layout. On the single-column mobile
           stack the lift just crowds the badge, so it stays flush. */
        @media (min-width: 901px) {
          :global(.pd-tier-featured) {
            top: -14px;
          }
        }
        @media (max-width: 900px) {
          :global(.pd-pricing-grid) {
            grid-template-columns: 1fr !important;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          :global(.pd-anim),
          :global(.pd-anim *) {
            animation: none !important;
          }
        }
      `}</style>
    </section>
  );
}
