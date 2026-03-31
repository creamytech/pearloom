'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { colors as C, text, card, sectionPadding, layout } from '@/lib/design-tokens';
import { SectionHeader } from '@/components/marketing/SectionHeader';
import { Card, Button, Badge } from '@/components/ui';

const TIERS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    desc: 'Perfect for getting started. Create your site, share your story.',
    features: [
      'The Loom AI site generation',
      'Custom Rind\u2122 visual identity',
      '5 core block types',
      'Shareable link',
      'Mobile-responsive site',
      'Basic guest RSVP',
    ],
    cta: 'Start Free',
    accent: C.olive,
    highlighted: false,
  },
  {
    name: 'Premium',
    price: '$19',
    period: '/celebration',
    desc: 'Everything you need for the full experience. One price, no subscriptions.',
    features: [
      'Everything in Free, plus:',
      'Custom domain',
      'All 15 block types',
      'Full guest management',
      'Interactive seating chart',
      'AI concierge for guests',
      'Time capsule',
      'Guestbook with photos',
      'Priority support',
    ],
    cta: 'Go Premium',
    accent: C.plum,
    highlighted: true,
  },
];

export function PricingPreview() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });

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
      <div style={{ maxWidth: layout.narrowWidth, margin: '0 auto' }}>
        {/* Decorative gold rule */}
        <div className="flex justify-center mb-6">
          <div style={{ width: 60, height: 1, background: C.gold }} />
        </div>

        <SectionHeader
          eyebrow="Pricing"
          eyebrowColor={C.gold}
          title={<>Start free. Upgrade when you&rsquo;re ready.</>}
          subtitle="No subscriptions. One price per celebration."
          inView={inView}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {TIERS.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.12 + 0.3, duration: 0.5 }}
              style={{ position: 'relative' }}
            >
              {/* RECOMMENDED label for premium */}
              {tier.highlighted && (
                <div className="text-center mb-2">
                  <Badge variant="success">Recommended</Badge>
                </div>
              )}

              <Card
                variant={tier.highlighted ? 'elevated' : 'outlined'}
                padding="lg"
                className={tier.highlighted ? 'border-2 border-[var(--eg-accent)]' : ''}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="font-bold tracking-[0.14em] uppercase"
                    style={{ fontSize: text.xs, color: tier.accent }}
                  >
                    {tier.name}
                  </div>
                  {tier.highlighted && (
                    <Badge variant="warning">Best Value</Badge>
                  )}
                </div>

                <div className="flex items-baseline gap-1 mb-2">
                  <span
                    className="font-[family-name:var(--eg-font-heading)] font-bold leading-none"
                    style={{ fontSize: '3rem', color: C.ink }}
                  >
                    {tier.price}
                  </span>
                  <span style={{ fontSize: text.sm, color: C.muted }}>
                    {tier.period}
                  </span>
                </div>

                <p className="mb-5" style={{ fontSize: text.base, color: C.muted, lineHeight: 1.6 }}>
                  {tier.desc}
                </p>

                <div className="flex flex-col gap-3.5 mb-7">
                  {tier.features.map(f => (
                    <div key={f} className="flex items-start gap-3">
                      {/* Olive dot bullet */}
                      <div
                        className="flex-shrink-0 mt-1.5 rounded-full"
                        style={{
                          width: 6,
                          height: 6,
                          background: C.olive,
                        }}
                      />
                      <span style={{ fontSize: text.sm, color: C.dark }}>
                        {f}
                      </span>
                    </div>
                  ))}
                </div>

                <Button
                  variant={tier.highlighted ? 'accent' : 'secondary'}
                  size="lg"
                  className="w-full uppercase tracking-[0.04em]"
                >
                  {tier.cta} <ArrowRight size={14} />
                </Button>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
