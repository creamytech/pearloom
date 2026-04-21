'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / marketing/GrooveProofPricing.tsx
//
// Merges three previously-separate sections (Testimonials,
// TrustSignals, PricingPreview) into one tight "why you can
// trust us + what it costs" moment. Lets the landing page
// drop from 16 sections to 8 without losing any real content.
//
// Layout (desktop):
//   ┌─────────────────────────────────────────────────────┐
//   │  Eyebrow + Headline                                 │
//   │  Big testimonial pull-quote with host name + tone   │
//   ├─────────────────────────────────────────────────────┤
//   │  Trust pills (4)   |   Pricing cards (3)            │
//   └─────────────────────────────────────────────────────┘
// Mobile collapses to one column.
// ─────────────────────────────────────────────────────────────

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Shield, Lock, Zap, Globe, Check } from 'lucide-react';
import { BlurFade, CurvedText, MagneticHover, SquishyButton } from '@/components/brand/groove';

interface GrooveProofPricingProps {
  onGetStarted: () => void;
}

const QUOTE = {
  text: 'We sent the link the day our venue fell through. Pear redid the whole page in minutes while I was still on the phone with the caterer. Guests never knew.',
  name: 'Emma R.',
  tone: 'Wedding · Hudson Valley, NY',
  palette: 'rose' as const,
};

const TRUST_PILLS = [
  { icon: Lock,   label: 'SSL + data encrypted' },
  { icon: Shield, label: 'No card to start' },
  { icon: Zap,    label: '99.99% uptime' },
  { icon: Globe,  label: 'Hosted on global CDN' },
];

interface Tier {
  name: string;
  price: string;
  tag: string;
  bullets: string[];
  cta: string;
  tone: 'butter' | 'terra' | 'plum';
  recommended?: boolean;
}

const TIERS: Tier[] = [
  {
    name: 'Journal',
    price: 'Free',
    tag: 'Start weaving',
    bullets: ['One celebration site', 'AI-drafted story', '150 guest RSVPs'],
    cta: 'Begin free',
    tone: 'butter',
  },
  {
    name: 'Atelier',
    price: '$19',
    tag: 'One-time · per celebration',
    bullets: ['Everything in Journal', 'Unlimited guests', 'Custom domain', 'All 28 occasions + blocks'],
    cta: 'Get Atelier',
    tone: 'terra',
    recommended: true,
  },
  {
    name: 'Legacy',
    price: '$12',
    tag: 'per month · every celebration',
    bullets: ['Everything in Atelier', 'Anniversary rebroadcast', 'Co-host collaboration'],
    cta: 'Go Legacy',
    tone: 'plum',
  },
];

const TONE_WASH = {
  butter: 'color-mix(in oklab, var(--pl-groove-butter) 24%, var(--pl-groove-cream))',
  terra:  'color-mix(in oklab, var(--pl-groove-terra) 14%, var(--pl-groove-cream))',
  plum:   'color-mix(in oklab, var(--pl-groove-plum) 14%, var(--pl-groove-cream))',
} as const;

const TONE_INK = {
  butter: 'var(--pl-groove-terra)',
  terra:  'var(--pl-groove-terra)',
  plum:   'var(--pl-groove-plum)',
} as const;

export function GrooveProofPricing({ onGetStarted }: GrooveProofPricingProps) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.1 });

  return (
    <section
      ref={ref}
      style={{
        position: 'relative',
        padding: 'clamp(80px, 12vh, 140px) clamp(20px, 5vw, 64px)',
        background: 'var(--pl-groove-cream)',
        overflow: 'hidden',
      }}
    >
      {/* Soft atmospheric blob */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: '8%',
          right: '-120px',
          width: 520,
          height: 520,
          borderRadius: '42% 58% 70% 30% / 45% 30% 70% 55%',
          background: 'var(--pl-groove-rose)',
          opacity: 0.22,
          filter: 'blur(80px)',
          animation: 'pl-groove-blob-morph 22s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1180, margin: '0 auto' }}>
        {/* ── Eyebrow + headline ── */}
        <BlurFade>
          <div
            aria-hidden
            style={{
              color: 'var(--pl-groove-plum)',
              marginBottom: 4,
              marginLeft: -6,
            }}
          >
            <CurvedText
              variant="arc"
              width={260}
              amplitude={14}
              fontFamily='var(--pl-font-body)'
              fontSize={14}
              fontWeight={500}
              letterSpacing={1.6}
              aria-label="Proof & pricing"
            >
              ✦  Proof &amp; pricing  ✦
            </CurvedText>
          </div>
        </BlurFade>
        <BlurFade delay={0.08}>
          <h2
            style={{
              margin: '0 0 48px',
              maxWidth: '22ch',
              fontFamily: 'var(--pl-font-body)',
              fontWeight: 700,
              fontSize: 'clamp(2rem, 4.8vw, 3rem)',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              color: 'var(--pl-groove-ink)',
            }}
          >
            Hosts who&rsquo;ve tried it don&rsquo;t go back.
          </h2>
        </BlurFade>

        {/* ── Big testimonial pull ── */}
        <BlurFade delay={0.16}>
          <figure
            style={{
              margin: '0 0 64px',
              padding: 'clamp(28px, 4vw, 48px)',
              borderRadius: 'var(--pl-groove-radius-blob)',
              background:
                'color-mix(in oklab, var(--pl-groove-rose) 18%, var(--pl-groove-cream))',
              border: '1px solid color-mix(in oklab, var(--pl-groove-plum) 22%, transparent)',
              position: 'relative',
            }}
          >
            <div
              aria-hidden
              style={{
                position: 'absolute',
                top: 20,
                right: 28,
                fontFamily: '"Fraunces", Georgia, serif',
                fontSize: '4rem',
                lineHeight: 0.7,
                color: 'var(--pl-groove-plum)',
                opacity: 0.35,
                fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
              }}
            >
              &rdquo;
            </div>
            <blockquote
              style={{
                margin: 0,
                maxWidth: '40ch',
                fontFamily: '"Fraunces", Georgia, serif',
                fontStyle: 'italic',
                fontWeight: 400,
                fontSize: 'clamp(1.3rem, 2.4vw, 1.9rem)',
                lineHeight: 1.35,
                letterSpacing: '-0.005em',
                color: 'var(--pl-groove-ink)',
                fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
              }}
            >
              &ldquo;{QUOTE.text}&rdquo;
            </blockquote>
            <figcaption
              style={{
                marginTop: 24,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span
                aria-hidden
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background:
                    'linear-gradient(135deg, var(--pl-groove-butter), var(--pl-groove-rose))',
                  fontFamily: 'var(--pl-font-body)',
                  fontSize: '1.04rem',
                  fontWeight: 700,
                  color: '#fff',
                }}
              >
                {QUOTE.name.charAt(0)}
              </span>
              <div>
                <div
                  style={{
                    fontFamily: 'var(--pl-font-body)',
                    fontSize: '0.96rem',
                    fontWeight: 700,
                    color: 'var(--pl-groove-ink)',
                  }}
                >
                  {QUOTE.name}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--pl-font-body)',
                    fontSize: '0.84rem',
                    color: 'color-mix(in oklab, var(--pl-groove-ink) 62%, transparent)',
                  }}
                >
                  {QUOTE.tone}
                </div>
              </div>
            </figcaption>
          </figure>
        </BlurFade>

        {/* ── Trust pill row ── */}
        <BlurFade delay={0.2}>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
              marginBottom: 48,
            }}
          >
            {TRUST_PILLS.map((pill, i) => (
              <motion.div
                key={pill.label}
                initial={{ opacity: 0, y: 6 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.28 + i * 0.06, duration: 0.4 }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 14px',
                  borderRadius: 999,
                  background: 'var(--pl-groove-cream)',
                  border: '1px solid color-mix(in oklab, var(--pl-groove-sage) 28%, transparent)',
                  fontFamily: 'var(--pl-font-body)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: 'var(--pl-groove-ink)',
                }}
              >
                <pill.icon size={14} color="var(--pl-groove-sage)" />
                {pill.label}
              </motion.div>
            ))}
          </div>
        </BlurFade>

        {/* ── Pricing cards ── */}
        <div
          id="pricing"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 16,
          }}
        >
          {TIERS.map((tier, i) => {
            const wash = TONE_WASH[tier.tone];
            const ink = TONE_INK[tier.tone];
            return (
              <BlurFade key={tier.name} delay={0.24 + i * 0.08}>
                <article
                  style={{
                    position: 'relative',
                    padding: 'clamp(24px, 3vw, 32px)',
                    borderRadius: tier.recommended ? 'var(--pl-groove-radius-blob)' : '28px',
                    background: tier.recommended ? 'var(--pl-groove-blob-sunrise)' : wash,
                    border: tier.recommended
                      ? 'none'
                      : `1px solid color-mix(in oklab, ${ink} 28%, transparent)`,
                    color: tier.recommended ? '#fff' : 'var(--pl-groove-ink)',
                    boxShadow: tier.recommended
                      ? '0 18px 48px rgba(139,74,106,0.28), 0 6px 14px rgba(43,30,20,0.1)'
                      : `0 2px 6px rgba(43,30,20,0.04), 0 14px 40px color-mix(in oklab, ${ink} 14%, transparent)`,
                    transform: tier.recommended ? 'translateY(-6px)' : '',
                  }}
                >
                  {tier.recommended && (
                    <span
                      style={{
                        position: 'absolute',
                        top: -14,
                        left: 24,
                        padding: '4px 12px',
                        borderRadius: 999,
                        background: 'var(--pl-groove-plum)',
                        color: '#fff',
                        fontFamily: 'var(--pl-font-body)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        letterSpacing: '-0.005em',
                        boxShadow: '0 6px 12px rgba(139,74,106,0.28)',
                      }}
                    >
                      Most hosts pick this
                    </span>
                  )}
                  <div
                    style={{
                      fontFamily: 'var(--pl-font-body)',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      letterSpacing: '-0.005em',
                      color: tier.recommended
                        ? 'color-mix(in oklab, #fff 90%, transparent)'
                        : ink,
                      marginBottom: 6,
                    }}
                  >
                    {tier.name}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: 6,
                      marginBottom: 8,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--pl-font-body)',
                        fontSize: 'clamp(2rem, 4vw, 2.8rem)',
                        fontWeight: 700,
                        lineHeight: 1,
                        letterSpacing: '-0.03em',
                        color: tier.recommended ? '#fff' : 'var(--pl-groove-ink)',
                      }}
                    >
                      {tier.price}
                    </span>
                  </div>
                  <p
                    style={{
                      margin: '0 0 20px',
                      fontFamily: 'var(--pl-font-body)',
                      fontSize: '0.88rem',
                      color: tier.recommended
                        ? 'color-mix(in oklab, #fff 82%, transparent)'
                        : 'color-mix(in oklab, var(--pl-groove-ink) 62%, transparent)',
                    }}
                  >
                    {tier.tag}
                  </p>
                  <ul
                    style={{
                      margin: '0 0 24px',
                      padding: 0,
                      listStyle: 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    }}
                  >
                    {tier.bullets.map((b) => (
                      <li
                        key={b}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 10,
                          fontFamily: 'var(--pl-font-body)',
                          fontSize: '0.92rem',
                          color: tier.recommended
                            ? 'color-mix(in oklab, #fff 88%, transparent)'
                            : 'var(--pl-groove-ink)',
                        }}
                      >
                        <span
                          aria-hidden
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 18,
                            height: 18,
                            borderRadius: '50%',
                            background: tier.recommended
                              ? 'color-mix(in oklab, #fff 30%, transparent)'
                              : `color-mix(in oklab, ${ink} 18%, transparent)`,
                            color: tier.recommended ? '#fff' : ink,
                            flexShrink: 0,
                          }}
                        >
                          <Check size={10} strokeWidth={3} />
                        </span>
                        {b}
                      </li>
                    ))}
                  </ul>
                  <MagneticHover strength={0.2} radius={100}>
                    <SquishyButton
                      fullWidth
                      onClick={onGetStarted}
                      palette={tier.recommended ? 'ink' : 'sunrise'}
                    >
                      {tier.cta}
                    </SquishyButton>
                  </MagneticHover>
                </article>
              </BlurFade>
            );
          })}
        </div>
      </div>
    </section>
  );
}
