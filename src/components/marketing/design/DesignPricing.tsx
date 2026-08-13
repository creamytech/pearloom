'use client';

// Pricing — three tiers. Middle tier is featured (dark, lifted,
// MOST CHOSEN badge). Matches design bundle's pricing.jsx.
// On phones each tier folds its feature list behind a plain
// "Everything included" toggle so three stacked cards stay scannable.

import { useState } from 'react';
import { Leaf, Pearl, Pill, PLButton, PD, DISPLAY_STYLE, MONO_STYLE, pdInkMix, pdShadowMix } from './DesignAtoms';

type TierName = 'Page' | 'Pass' | 'Keepsake';
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

/* The ladder gates COORDINATION, COLLABORATION, COMMUNICATION and
   PRESERVATION — never how good a site looks. The free tier carries
   the whole standard theme catalog on purpose: every published free
   site is the marketing, so a crippled one costs more than it earns.
   (docs/REVIEW-SYNTHESIS.md §1.3–§1.4.) */
const TIERS: Tier[] = [
  {
    name: 'Page',
    price: 0,
    cadence: 'forever',
    blurb: 'Your celebration, beautiful from the first minute.',
    feats: [
      'One celebration, yours to keep',
      'The whole standard theme catalog',
      'The full drafting by Pear',
      'Up to 100 guests, unlimited RSVPs',
      'All 31 occasions',
      'Guest passports + the photo wall',
      'Your pearloom.com address',
    ],
    bg: PD.paper3,
    accent: PD.olive,
    btn: 'ghost',
  },
  {
    name: 'Pass',
    price: 89,
    cadence: 'once',
    blurb: 'The whole celebration — every event, every host.',
    feats: [
      'Everything in Page',
      'Every linked event: shower, bachelorette, rehearsal, brunch',
      'Co-hosts with real permissions',
      'Up to 500 guests',
      'The full Studio: invitations, save-the-dates, thank-yous',
      'The Director (day-of room) + live broadcasts',
      'Seating, budget, and the vendor book',
      'The signature theme shelf',
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
    name: 'Keepsake',
    price: 199,
    cadence: 'once',
    blurb: 'Everything, kept — long after the day.',
    feats: [
      'Everything in the Pass',
      'Unlimited celebrations',
      'Unlimited full-resolution photos and video',
      'The heirloom memory book (print-ready)',
      'Voice toasts + the time capsule, kept',
      'Anniversary rebroadcast, every year',
      'Download your whole archive, any time',
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
  /* Phone-only feature fold. The lists stay in the DOM at every width
     (CSS hides them collapsed ≤640); desktop never sees the toggle. */
  const [openTiers, setOpenTiers] = useState<Record<string, boolean>>({});
  const toggleTier = (name: TierName) =>
    setOpenTiers((prev) => ({ ...prev, [name]: !prev[name] }));

  return (
    <section
      id="pricing"
      style={{ padding: 'clamp(48px, 8vw, 96px) clamp(20px, 5vw, 24px) clamp(56px, 10vw, 120px)', position: 'relative', overflow: 'hidden', background: PD.paper }}
    >
      <div style={{ maxWidth: 1320, margin: '0 auto', position: 'relative' }}>
        <div
          className="pd-pricing-head"
          style={{ textAlign: 'center', marginBottom: 48, maxWidth: 760, marginInline: 'auto' }}
        >
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
              className={`pd-tier${t.featured ? ' pd-tier-featured' : ''}${openTiers[t.name] ? ' pd-tier-open' : ''}`}
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
              {/* The card body. ZERO-OVERHANG badge (third and final
                  fix): after two rounds of Safari shearing an
                  overhanging ribbon (border-radius + stacking-context
                  clip), the badge now lives fully INSIDE the rounded
                  card — in-flow, nothing to clip, on any engine. */}
              <div
                className="pl-lift"
                style={{
                  background: t.bg,
                  color: t.fg ?? PD.ink,
                  border: `1px solid ${t.featured ? t.accent : pdInkMix(14)}`,
                  borderRadius: 20,
                  padding: t.featured ? '26px 32px 32px' : '36px 32px 32px',
                  boxShadow: t.featured
                    ? `0 30px 60px -20px ${pdShadowMix(35)}`
                    : `0 1px 3px ${pdShadowMix(6)}`,
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
              {t.featured && (
                <div
                  style={{
                    ...MONO_STYLE,
                    alignSelf: 'flex-start',
                    background: t.accent,
                    // Constant dark ink — the butter badge keeps its
                    // color in dark mode, so its text must not flip
                    // to cream with PD.ink.
                    color: '#2C1E12',
                    borderRadius: 999,
                    padding: '4px 12px',
                    marginBottom: 16,
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  ★ MOST CHOSEN
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
                  className="pd-price"
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

              {/* Phone-only expander (desktop hides it; the list is
                  always open there). Plain words, real state. */}
              <button
                type="button"
                className="pd-feats-toggle"
                aria-expanded={!!openTiers[t.name]}
                onClick={() => toggleTier(t.name)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  margin: '0 0 18px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontFamily: 'var(--pl-font-body)',
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: 'inherit',
                  opacity: 0.85,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {openTiers[t.name]
                  ? 'Hide the list ▴'
                  : `Everything included (${t.feats.length}) ▾`}
              </button>

              <ul
                className="pd-tier-feats"
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
                {t.price === 0 ? 'Create your site' : `Choose ${t.name}`} <Pearl size={8} />
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
          {/* The old "Pear's promise →" link anchored to #journal — the
              id of DesignFAQ, mounted nowhere (M.1/L86). The promise
              stands better said plainly than linked to a void. */}
          One-time, never a subscription. Memorials are always free on
          every tier.
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
        /* Desktop always shows the full lists; the toggle is phone-only. */
        @media (min-width: 641px) {
          :global(.pd-feats-toggle) {
            display: none !important;
          }
        }
        @media (max-width: 640px) {
          :global(.pd-pricing-head) {
            margin-bottom: 32px !important;
          }
          :global(.pd-tier > .pl-lift) {
            padding: 24px 22px 26px !important;
          }
          :global(.pd-price) {
            font-size: 44px !important;
          }
          /* Collapsed by default: name, blurb, price, toggle, button. */
          :global(.pd-tier-feats) {
            display: none !important;
          }
          :global(.pd-tier-open .pd-tier-feats) {
            display: flex !important;
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
