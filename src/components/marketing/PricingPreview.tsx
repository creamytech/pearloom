'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { ArrowRight, Check, Sprout, Heart, Leaf } from 'lucide-react';
import { colors as C, text, card, sectionPadding, layout } from '@/lib/design-tokens';
import { SectionHeader } from '@/components/marketing/SectionHeader';

type Tier = {
  name: string;
  price: string;
  period: string;
  tagline: string;
  desc: string;
  features: string[];
  cta: string;
  accent: string;
  highlighted: boolean;
  badge?: string;
  Icon: React.ElementType;
};

const TIERS: Tier[] = [
  {
    name: 'Seed',
    price: '$0',
    period: 'forever',
    tagline: 'Plant your story',
    desc: 'Create a beautiful site and go live — no credit card, no catch.',
    features: [
      'Pearloom AI site generation',
      'Custom visual identity',
      '7 core block types',
      'Pearloom subdomain',
      'Up to 75 guest RSVPs',
      'Up to 100 photos',
      'Mobile-responsive site',
    ],
    cta: 'Start Free',
    accent: C.olive,
    highlighted: false,
    Icon: Sprout,
  },
  {
    name: 'Pair',
    price: '$29',
    period: 'one-time',
    tagline: 'Everything for your big day',
    desc: 'The full Pearloom experience. Pay once, keep forever — no subscriptions.',
    features: [
      'Everything in Seed, plus:',
      'Custom domain',
      'All 19 block types',
      'Unlimited guests & photos',
      'Full guest management + CSV import',
      'Interactive seating chart',
      'Bulk messaging & email invitations',
      'AI guest concierge (voice-trained)',
      '9-language translations',
      'Analytics & RSVP insights',
      'Save the Date card designer',
      'Wedding hashtag generator',
      'Time capsule messages',
      'Guest photo guestbook',
      'Priority support',
    ],
    cta: 'Get Pair',
    accent: C.plum,
    highlighted: true,
    badge: 'Most Popular',
    Icon: Heart,
  },
  {
    name: 'Perennial',
    price: '$12',
    period: '/month',
    tagline: 'A lifetime of celebrations',
    desc: 'Pair features for every occasion, every year — weddings, anniversaries, birthdays, and beyond.',
    features: [
      'Everything in Pair, plus:',
      'Unlimited celebrations',
      'Post-wedding anniversary mode',
      'Community photo moderation',
      'Coordinator collaboration access',
      'Advanced visual effects & custom CSS',
      'PDF export & print-ready',
      'Early AI feature access',
    ],
    cta: 'Go Perennial',
    accent: C.gold,
    highlighted: false,
    badge: 'Best for recurring events',
    Icon: Leaf,
  },
];

export function PricingPreview() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.08 });

  return (
    <section
      ref={ref}
      id="pricing"
      style={{
        background: C.deep,
        padding: `${sectionPadding.y} ${sectionPadding.x}`,
        borderTop: `1px solid ${C.divider}`,
      }}
    >
      <div style={{ maxWidth: layout.maxWidth, margin: '0 auto' }}>
        <SectionHeader
          eyebrow="Pricing"
          eyebrowColor={C.gold}
          title={<>Investment in Continuity</>}
          subtitle="Select the sanctuary that best preserves your story."
          inView={inView}
        />

        {/* Tier cards */}
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-5"
          style={{ alignItems: 'start' }}
        >
          {TIERS.map((tier, i) => {
            const Icon = tier.Icon;
            const isHighlighted = tier.highlighted;
            return (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, y: 28 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * 0.1 + 0.25, duration: 0.55 }}
              >
                <div
                  style={{
                    borderRadius: '14px',
                    background: '#FFFFFF',
                    border: isHighlighted
                      ? `2.5px solid ${tier.accent}`
                      : card.border,
                    boxShadow: isHighlighted
                      ? `0 12px 40px ${tier.accent}30, 0 4px 12px ${tier.accent}18`
                      : card.shadow,
                    padding: '1.75rem',
                    display: 'flex',
                    flexDirection: 'column',
                    transform: isHighlighted ? 'scale(1.03)' : 'none',
                    position: 'relative',
                    zIndex: isHighlighted ? 2 : 1,
                  }}
                >
                  {/* Badge row */}
                  <div style={{ height: '26px', marginBottom: '1.1rem', display: 'flex', alignItems: 'center' }}>
                    {tier.badge && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center',
                        padding: '2px 10px',
                        borderRadius: '100px',
                        fontSize: '0.66rem', fontWeight: 700,
                        letterSpacing: '0.06em', textTransform: 'uppercase',
                        background: `${tier.accent}16`,
                        color: tier.accent,
                        border: `1px solid ${tier.accent}28`,
                      }}>
                        {tier.badge}
                      </span>
                    )}
                  </div>

                  {/* Icon + tier name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                    <div style={{
                      width: '34px', height: '34px', borderRadius: '9px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: `${tier.accent}18`,
                      flexShrink: 0,
                    }}>
                      <Icon size={15} color={tier.accent} />
                    </div>
                    <span style={{
                      fontSize: '0.68rem', fontWeight: 800,
                      letterSpacing: '0.1em', textTransform: 'uppercase',
                      color: tier.accent,
                    }}>
                      {tier.name}
                    </span>
                  </div>

                  {/* Price */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '0.35rem' }}>
                    <span style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: '2.8rem', fontWeight: 700, lineHeight: 1,
                      color: C.ink,
                      letterSpacing: '-0.02em',
                    }}>
                      {tier.price}
                    </span>
                    <span style={{ fontSize: text.sm, color: C.muted, paddingBottom: '2px' }}>
                      {tier.period}
                    </span>
                  </div>

                  {/* Tagline */}
                  <p style={{
                    fontSize: '0.68rem', fontWeight: 700,
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                    color: tier.accent, marginBottom: '0.6rem',
                  }}>
                    {tier.tagline}
                  </p>

                  {/* Description */}
                  <p style={{
                    fontSize: text.sm, color: C.muted,
                    lineHeight: 1.65, marginBottom: '1.5rem',
                  }}>
                    {tier.desc}
                  </p>

                  {/* CTA */}
                  <button
                    style={{
                      width: '100%',
                      padding: '11px 16px',
                      borderRadius: '8px',
                      border: isHighlighted ? 'none' : `1px solid ${tier.accent}38`,
                      background: isHighlighted ? tier.accent : `${tier.accent}12`,
                      color: isHighlighted ? '#fff' : tier.accent,
                      fontSize: text.sm,
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '7px',
                      marginBottom: '1.75rem',
                      transition: 'filter 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(0.92)')}
                    onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
                  >
                    {tier.cta}
                    <ArrowRight size={14} strokeWidth={2.2} />
                  </button>

                  {/* Divider */}
                  <div style={{ height: '1px', background: C.divider, marginBottom: '1.5rem' }} />

                  {/* Feature list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {tier.features.map(f => {
                      const isContinuity = f.endsWith(':');
                      return (
                        <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '9px' }}>
                          {isContinuity ? (
                            <span style={{
                              fontSize: '0.66rem', fontWeight: 700,
                              letterSpacing: '0.07em', textTransform: 'uppercase',
                              color: C.muted,
                            }}>
                              {f}
                            </span>
                          ) : (
                            <>
                              <div style={{
                                width: '16px', height: '16px',
                                borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0, marginTop: '1px',
                                background: `${tier.accent}16`,
                              }}>
                                <Check size={9} color={tier.accent} strokeWidth={3} />
                              </div>
                              <span style={{ fontSize: text.sm, color: C.dark, lineHeight: 1.5 }}>
                                {f}
                              </span>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.75, duration: 0.55 }}
          style={{
            textAlign: 'center',
            fontSize: '0.75rem',
            color: C.muted,
            marginTop: '2rem',
            letterSpacing: '0.01em',
            lineHeight: 1.6,
          }}
        >
          All plans include SSL, automatic mobile optimization, and instant publishing.&nbsp;
          No credit card required to start free.
        </motion.p>
      </div>
    </section>
  );
}
