'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Check, ArrowRight } from 'lucide-react';
import { colors as C, text, card, sectionPadding } from '@/lib/design-tokens';
import { SectionHeader } from '@/components/marketing/SectionHeader';

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
      <div className="max-w-[780px] mx-auto">
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
              style={{
                borderRadius: card.radius,
                background: card.bg,
                border: tier.highlighted
                  ? `2px solid ${C.olive}`
                  : card.border,
                boxShadow: card.shadow,
                padding: '1.75rem',
                transition: 'box-shadow 0.2s ease',
              }}
              whileHover={{ boxShadow: card.shadowHover }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="font-bold tracking-[0.14em] uppercase"
                  style={{ fontSize: text.xs, color: tier.accent }}
                >
                  {tier.name}
                </div>
                {tier.highlighted && (
                  <span
                    className="font-semibold uppercase tracking-wide"
                    style={{ fontSize: text.xs, color: C.plum }}
                  >
                    Best Value
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-1 mb-2">
                <span
                  className="font-[family-name:var(--eg-font-heading)] text-[2.5rem] font-bold leading-none"
                  style={{ color: C.ink }}
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
                    <Check
                      size={16}
                      strokeWidth={2.5}
                      className="flex-shrink-0 mt-0.5"
                      style={{ color: tier.accent }}
                    />
                    <span style={{ fontSize: text.sm, color: C.dark }}>
                      {f}
                    </span>
                  </div>
                ))}
              </div>

              <button
                className="group w-full inline-flex items-center justify-center gap-2 py-3 rounded-lg font-semibold font-[family-name:var(--eg-font-body)] cursor-pointer transition-colors duration-200"
                style={{
                  fontSize: text.base,
                  background: tier.highlighted ? C.olive : 'transparent',
                  color: tier.highlighted ? '#fff' : tier.accent,
                  border: tier.highlighted ? 'none' : `1px solid ${tier.accent}40`,
                }}
                onMouseEnter={(e) => {
                  if (!tier.highlighted) {
                    e.currentTarget.style.background = `${tier.accent}12`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!tier.highlighted) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                {tier.cta} <ArrowRight size={14} />
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
