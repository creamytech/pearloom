'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Check, ArrowRight } from 'lucide-react';
import { C } from './colors';

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
        background: `radial-gradient(ellipse at 30% 0%, rgba(109,89,122,0.08) 0%, transparent 50%), radial-gradient(ellipse at 70% 100%, rgba(163,177,138,0.06) 0%, transparent 50%), ${C.deep}`,
        padding: '7rem 1.5rem',
        borderTop: `1px solid ${C.divider}`,
      }}
    >
      <div className="max-w-[780px] mx-auto">
        {/* Header — simple text, no Pill */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            className="mb-4"
          >
            <span
              className="text-[0.68rem] font-bold tracking-[0.14em] uppercase"
              style={{ color: C.gold }}
            >
              Pricing
            </span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 18 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1 }}
            className="font-[family-name:var(--eg-font-heading)] font-bold tracking-[-0.03em] leading-tight mb-3"
            style={{ fontSize: 'clamp(1.9rem, 4vw, 2.8rem)', color: C.ink }}
          >
            Start free. Upgrade when you&rsquo;re ready.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2 }}
            className="text-[0.95rem]"
            style={{ color: C.muted, lineHeight: 1.75 }}
          >
            No subscriptions. One price per celebration.
          </motion.p>
        </div>

        {/* Tier cards — differentiated styles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {TIERS.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.12 + 0.3, duration: 0.5 }}
              className="rounded-2xl p-7 relative overflow-hidden"
              style={{
                background: tier.highlighted ? 'white' : 'transparent',
                border: tier.highlighted
                  ? `1px solid ${tier.accent}35`
                  : `1.5px solid ${C.divider}`,
                boxShadow: tier.highlighted
                  ? `0 12px 48px rgba(109,89,122,0.12), 0 0 0 1px rgba(109,89,122,0.08)`
                  : 'none',
              }}
            >
              {tier.highlighted && (
                <div
                  className="absolute top-0 left-0 right-0 h-[4px]"
                  style={{ background: `linear-gradient(90deg, ${C.plum}, ${C.olive})` }}
                />
              )}

              <div className="text-[0.68rem] font-bold tracking-[0.14em] uppercase mb-2" style={{ color: tier.accent }}>
                {tier.name}
              </div>
              <div className="flex items-baseline gap-1 mb-2">
                <span
                  className="font-[family-name:var(--eg-font-heading)] text-[2.5rem] font-bold leading-none"
                  style={{ color: C.ink }}
                >
                  {tier.price}
                </span>
                <span className="text-[0.8rem]" style={{ color: C.muted }}>
                  {tier.period}
                </span>
              </div>
              <p className="text-[0.84rem] mb-5" style={{ color: C.muted, lineHeight: 1.6 }}>
                {tier.desc}
              </p>

              <div className="flex flex-col gap-2.5 mb-6">
                {tier.features.map(f => (
                  <div key={f} className="flex items-start gap-2.5">
                    <Check size={14} className="mt-0.5 flex-shrink-0" style={{ color: tier.accent }} />
                    <span className="text-[0.82rem]" style={{ color: C.dark }}>
                      {f}
                    </span>
                  </div>
                ))}
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg text-[0.88rem] font-semibold font-[family-name:var(--eg-font-body)] border-none cursor-pointer"
                style={{
                  background: tier.highlighted ? tier.accent : 'transparent',
                  color: tier.highlighted ? 'white' : tier.accent,
                  border: tier.highlighted ? 'none' : `1.5px solid ${tier.accent}40`,
                }}
              >
                {tier.cta} <ArrowRight size={14} />
              </motion.button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
