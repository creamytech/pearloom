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
    name: 'Journal',
    price: 'Free',
    period: 'forever',
    tagline: 'Start your story',
    desc: 'Everything you need to create a beautiful celebration site.',
    features: [
      'AI-generated site from photos',
      '7 core block types',
      'Up to 150 guest RSVPs',
      'Pearloom subdomain',
      'Mobile-responsive design',
      'Google Photos integration',
      'RSVP with meal selection',
    ],
    cta: 'Get Started Free',
    accent: C.olive,
    highlighted: false,
    Icon: Sprout,
  },
  {
    name: 'Atelier',
    price: '$19',
    period: 'one-time',
    tagline: 'The full creative studio',
    desc: 'Unlock every feature for your celebration — pay once, keep forever.',
    features: [
      'Everything in Journal, plus:',
      'Custom domain',
      'All 19+ block types',
      'Unlimited guests & photos',
      'Interactive seating chart',
      'Bulk messaging & email invitations',
      'AI voice-trained concierge',
      '9-language translations',
      'Analytics & RSVP insights',
      'Save the Date card designer',
      'Wedding hashtag generator',
      'Time capsule messages',
      'Priority support',
    ],
    cta: 'Upgrade for $19',
    accent: C.plum,
    highlighted: true,
    badge: 'Most Popular',
    Icon: Heart,
  },
  {
    name: 'Legacy',
    price: '$12',
    period: '/month',
    tagline: 'For every celebration',
    desc: 'All Atelier features for unlimited celebrations, forever.',
    features: [
      'Everything in Atelier, plus:',
      'Unlimited celebration sites',
      'Anniversary & memory mode',
      'Coordinator collaboration',
      'Advanced visual effects & custom CSS',
      'PDF export & print-ready',
      'Early AI feature access',
      'White-glove support',
    ],
    cta: 'Go Legacy',
    accent: C.gold,
    highlighted: false,
    badge: 'Best for recurring events',
    Icon: Leaf,
  },
];

interface PricingPreviewProps {
  onGetStarted?: () => void;
}

export function PricingPreview({ onGetStarted }: PricingPreviewProps = {}) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.08 });

  const handleTierClick = () => {
    if (onGetStarted) onGetStarted();
    else if (typeof window !== 'undefined') window.location.hash = 'try';
  };

  return (
    <section
      ref={ref}
      id="pricing"
      style={{
        background: 'var(--pl-cream-deep)',
        padding: `${sectionPadding.y} ${sectionPadding.x}`,
        borderTop: '1px solid var(--pl-divider)',
      }}
    >
      <div style={{ maxWidth: layout.maxWidth, margin: '0 auto' }}>
        <SectionHeader
          eyebrow="Pricing"
          eyebrowColor={C.gold}
          title={<>Simple, transparent pricing</>}
          subtitle="Create your first site for free. One-time upgrade — no subscriptions, no hidden costs."
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
                    background: 'var(--pl-cream-card)',
                    border: isHighlighted
                      ? `2.5px solid ${tier.accent}`
                      : '1px solid var(--pl-divider)',
                    boxShadow: isHighlighted
                      ? `0 12px 40px ${tier.accent}30, 0 4px 12px ${tier.accent}18`
                      : 'var(--pl-shadow-sm)',
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
                      color: 'var(--pl-ink)',
                      letterSpacing: '-0.02em',
                    }}>
                      {tier.price}
                    </span>
                    <span style={{ fontSize: text.sm, color: 'var(--pl-muted)', paddingBottom: '2px' }}>
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
                    fontSize: text.sm, color: 'var(--pl-muted)',
                    lineHeight: 1.65, marginBottom: '1.5rem',
                  }}>
                    {tier.desc}
                  </p>

                  {/* CTA */}
                  <button
                    onClick={handleTierClick}
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
                  <div style={{ height: '1px', background: 'var(--pl-divider)', marginBottom: '1.5rem' }} />

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
                              color: 'var(--pl-muted)',
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
                              <span style={{ fontSize: text.sm, color: 'var(--pl-ink-soft)', lineHeight: 1.5 }}>
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
            color: 'var(--pl-muted)',
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
