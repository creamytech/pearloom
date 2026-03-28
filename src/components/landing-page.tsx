'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/landing-page.tsx
// Editorial luxury redesign — "Vogue meets Notion meets Webflow"
// ─────────────────────────────────────────────────────────────

import { useRef } from 'react';
import { motion, useInView, type Variants } from 'framer-motion';
import { ArrowRight, Sparkles, MessageCircle, Users } from 'lucide-react';

interface LandingPageProps {
  handleSignIn: () => void;
  status: string;
}

// ── Brand tokens ──────────────────────────────────────────────
const C = {
  ivory:    '#F5F1E8',
  ivoryDim: '#EEE8DC',
  sage:     '#A3B18A',
  gold:     '#D6C6A8',
  espresso: '#3D3530',
  ink:      '#1C1916',
  copper:   '#b8926a',
  muted:    '#9A9488',
} as const;

// ── Reusable motion variants ──────────────────────────────────
const CUBIC: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: CUBIC, delay: i * 0.12 },
  }),
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: CUBIC, delay: i * 0.15 },
  }),
};

// ── Decorative SVG ring ───────────────────────────────────────
function OrnamentDivider() {
  return (
    <svg width="180" height="24" viewBox="0 0 180 24" fill="none" aria-hidden="true">
      <line x1="0" y1="12" x2="72" y2="12" stroke={C.gold} strokeWidth="1" strokeOpacity="0.6" />
      <circle cx="90" cy="12" r="5" stroke={C.copper} strokeWidth="1.5" strokeOpacity="0.7" />
      <circle cx="90" cy="12" r="2" fill={C.copper} fillOpacity="0.5" />
      <line x1="108" y1="12" x2="180" y2="12" stroke={C.gold} strokeWidth="1" strokeOpacity="0.6" />
      <circle cx="72" cy="12" r="2" fill={C.gold} fillOpacity="0.5" />
      <circle cx="108" cy="12" r="2" fill={C.gold} fillOpacity="0.5" />
    </svg>
  );
}

// ── Floating decorative circle ────────────────────────────────
function FloatingOrb({ size, top, left, right, bottom, color, blur, opacity, delay }: {
  size: number; color: string; blur?: number; opacity?: number; delay?: number;
  top?: string; left?: string; right?: string; bottom?: string;
}) {
  return (
    <motion.div
      aria-hidden="true"
      animate={{ y: [0, -12, 0], opacity: [opacity ?? 0.12, (opacity ?? 0.12) * 1.4, opacity ?? 0.12] }}
      transition={{ duration: 6 + (delay ?? 0), ease: 'easeInOut', repeat: Infinity, delay: delay ?? 0 }}
      style={{
        position: 'absolute',
        width: size, height: size,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        filter: `blur(${blur ?? 60}px)`,
        top, left, right, bottom,
        pointerEvents: 'none',
      }}
    />
  );
}

// ── Marquee publication names ─────────────────────────────────
const PUBLICATIONS = [
  'The Knot', 'Brides', 'Martha Stewart Weddings',
  'Vogue Weddings', 'Junebug Weddings', 'Style Me Pretty',
];

// ── How-it-works steps ────────────────────────────────────────
const STEPS = [
  {
    num: '01',
    icon: <MessageCircle size={28} strokeWidth={1.5} />,
    title: 'Tell us your love story',
    body: 'Speak or type — share how you met, what makes you laugh, the moment you knew. Our AI listens with care.',
  },
  {
    num: '02',
    icon: <Sparkles size={28} strokeWidth={1.5} />,
    title: 'AI crafts your bespoke site',
    body: 'Custom narrative, VibeSkin visual identity, and curated illustrations generated uniquely for your story.',
  },
  {
    num: '03',
    icon: <Users size={28} strokeWidth={1.5} />,
    title: 'Share with your guests',
    body: 'A living site your guests will treasure — RSVP, travel info, your story, and more in one elegant place.',
  },
];

// ── Feature cards ─────────────────────────────────────────────
const FEATURES = [
  {
    emoji: '✦',
    title: 'AI Story Generation',
    body: 'Gemini reads your words and crafts an intimate, moving narrative in your voice — never a template.',
  },
  {
    emoji: '◈',
    title: 'Bespoke Visual Identity',
    body: 'VibeSkin technology builds a complete visual language — palette, type, motifs — from your personality.',
  },
  {
    emoji: '❋',
    title: 'Guest Experience',
    body: 'RSVPs, travel, seating, and song requests — collected gracefully in one luminous, branded destination.',
  },
];

// ════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════
export function LandingPage({ handleSignIn, status }: LandingPageProps) {
  const proofRef   = useRef<HTMLElement>(null);
  const stepsRef   = useRef<HTMLElement>(null);
  const featRef    = useRef<HTMLElement>(null);
  const ctaRef     = useRef<HTMLElement>(null);

  const proofInView = useInView(proofRef,   { once: true, amount: 0.2 });
  const stepsInView = useInView(stepsRef,   { once: true, amount: 0.15 });
  const featInView  = useInView(featRef,    { once: true, amount: 0.15 });
  const ctaInView   = useInView(ctaRef,     { once: true, amount: 0.3 });

  const heroWords = ['Your', 'Love', 'Story,', 'Beautifully', 'Told'];

  return (
    <div style={{ backgroundColor: C.ink, minHeight: '100dvh', fontFamily: 'var(--eg-font-body)', overflowX: 'hidden' }}>

      {/* ══════════════════════════════════════
          1. HERO
      ══════════════════════════════════════ */}
      <section style={{
        minHeight: '100dvh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '8rem 2rem 6rem',
        position: 'relative', overflow: 'hidden',
        background: `linear-gradient(160deg, ${C.ink} 0%, ${C.espresso} 100%)`,
      }}>
        {/* Ambient orbs */}
        <FloatingOrb size={500} top="-10%" left="-10%" color={`rgba(163,177,138,0.18)`} blur={120} opacity={0.18} delay={0} />
        <FloatingOrb size={400} bottom="-10%" right="-5%" color={`rgba(214,198,168,0.15)`} blur={100} opacity={0.15} delay={2} />
        <FloatingOrb size={300} top="40%" left="55%" color={`rgba(184,146,106,0.12)`} blur={80} opacity={0.12} delay={4} />

        {/* Decorative SVG ring top-right */}
        <svg
          aria-hidden="true"
          width="320" height="320"
          viewBox="0 0 320 320"
          style={{ position: 'absolute', top: '5%', right: '-60px', opacity: 0.07, pointerEvents: 'none' }}
        >
          <circle cx="160" cy="160" r="155" stroke={C.gold} strokeWidth="1" fill="none" />
          <circle cx="160" cy="160" r="130" stroke={C.sage} strokeWidth="0.5" fill="none" strokeDasharray="4 8" />
          <circle cx="160" cy="160" r="100" stroke={C.gold} strokeWidth="1" fill="none" />
        </svg>

        {/* Decorative SVG ring bottom-left */}
        <svg
          aria-hidden="true"
          width="240" height="240"
          viewBox="0 0 240 240"
          style={{ position: 'absolute', bottom: '8%', left: '-40px', opacity: 0.06, pointerEvents: 'none' }}
        >
          <circle cx="120" cy="120" r="115" stroke={C.copper} strokeWidth="1" fill="none" />
          <circle cx="120" cy="120" r="85" stroke={C.gold} strokeWidth="0.5" fill="none" strokeDasharray="3 6" />
        </svg>

        {/* Fine grid overlay */}
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `linear-gradient(rgba(214,198,168,0.04) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(214,198,168,0.04) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }} />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 10, maxWidth: '860px', width: '100%', textAlign: 'center' }}>

          {/* Eyebrow label */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              marginBottom: '2.5rem',
              padding: '0.35rem 1.1rem',
              border: `1px solid rgba(214,198,168,0.3)`,
              borderRadius: '999px',
              color: C.gold,
              fontSize: '0.72rem',
              fontWeight: 600,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}
          >
            <Sparkles size={12} strokeWidth={2} />
            AI Wedding Site Builder
          </motion.div>

          {/* Headline — word-by-word */}
          <h1 style={{
            fontFamily: 'var(--eg-font-heading)',
            fontSize: 'clamp(3.2rem, 8vw, 7rem)',
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            color: C.ivory,
            marginBottom: '2rem',
          }}>
            {heroWords.map((word, i) => (
              <motion.span
                key={word + i}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                style={{ display: 'inline-block', marginRight: '0.25em' }}
              >
                {i === 3 || i === 4
                  ? <span style={{ color: C.copper }}>{word}</span>
                  : word}
              </motion.span>
            ))}
          </h1>

          {/* Sub-headline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.8 }}
            style={{
              fontSize: 'clamp(1rem, 2vw, 1.25rem)',
              color: `rgba(245,241,232,0.65)`,
              maxWidth: '560px',
              margin: '0 auto 3rem',
              lineHeight: 1.75,
              fontWeight: 300,
            }}
          >
            Pearloom listens to your story and generates a bespoke wedding site in minutes — with its own visual identity, intimate narrative, and graceful guest experience.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1 }}
            style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}
          >
            {/* Primary CTA */}
            <motion.button
              onClick={handleSignIn}
              disabled={status === 'loading'}
              whileHover={{ scale: 1.03, boxShadow: `0 0 32px rgba(184,146,106,0.45)` }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.6rem',
                padding: '0.95rem 2.2rem',
                background: `linear-gradient(135deg, ${C.copper} 0%, #a07050 100%)`,
                color: C.ivory,
                border: 'none',
                borderRadius: '0.75rem',
                fontSize: '0.95rem',
                fontWeight: 600,
                fontFamily: 'var(--eg-font-body)',
                cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                opacity: status === 'loading' ? 0.7 : 1,
                letterSpacing: '0.02em',
              }}
            >
              Create Your Site
              <ArrowRight size={16} strokeWidth={2} />
            </motion.button>

            {/* Secondary CTA */}
            <motion.button
              whileHover={{ scale: 1.02, backgroundColor: 'rgba(214,198,168,0.08)' }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.6rem',
                padding: '0.95rem 2.2rem',
                background: 'transparent',
                color: C.gold,
                border: `1px solid rgba(214,198,168,0.4)`,
                borderRadius: '0.75rem',
                fontSize: '0.95rem',
                fontWeight: 500,
                fontFamily: 'var(--eg-font-body)',
                cursor: 'pointer',
                letterSpacing: '0.02em',
              }}
            >
              See an Example
            </motion.button>
          </motion.div>
        </div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6 }}
          style={{
            position: 'absolute', bottom: '2.5rem',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem',
            color: `rgba(214,198,168,0.4)`,
            fontSize: '0.68rem',
            letterSpacing: '0.15em',
            fontWeight: 500,
          }}
        >
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <svg width="16" height="24" viewBox="0 0 16 24" fill="none" aria-hidden="true">
              <rect x="1" y="1" width="14" height="22" rx="7" stroke="currentColor" strokeWidth="1.2" />
              <motion.rect
                x="6.5" y="5" width="3" height="6" rx="1.5" fill="currentColor"
                animate={{ y: [0, 6, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              />
            </svg>
          </motion.div>
          SCROLL
        </motion.div>
      </section>

      {/* ══════════════════════════════════════
          2. SOCIAL PROOF STRIP
      ══════════════════════════════════════ */}
      <section
        ref={proofRef}
        style={{
          backgroundColor: C.ivory,
          padding: '3rem 2rem',
          overflow: 'hidden',
          borderBottom: `1px solid rgba(214,198,168,0.4)`,
        }}
      >
        {/* Stat */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={proofInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          style={{
            textAlign: 'center',
            marginBottom: '2rem',
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: C.muted,
          }}
        >
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.6rem',
            padding: '0.3rem 1rem',
            border: `1px solid rgba(163,177,138,0.3)`,
            borderRadius: '999px',
            color: C.sage,
          }}>
            ✦ &nbsp; Trusted by 500+ couples &nbsp; ✦
          </span>
        </motion.div>

        {/* Marquee */}
        <div style={{ position: 'relative', overflow: 'hidden' }}>
          {/* Fade edges */}
          <div aria-hidden="true" style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: '80px', zIndex: 2,
            background: `linear-gradient(90deg, ${C.ivory} 0%, transparent 100%)`,
          }} />
          <div aria-hidden="true" style={{
            position: 'absolute', right: 0, top: 0, bottom: 0, width: '80px', zIndex: 2,
            background: `linear-gradient(270deg, ${C.ivory} 0%, transparent 100%)`,
          }} />

          <motion.div
            animate={{ x: ['0%', '-50%'] }}
            transition={{ duration: 28, ease: 'linear', repeat: Infinity }}
            style={{ display: 'flex', gap: '4rem', alignItems: 'center', width: 'max-content' }}
          >
            {[...PUBLICATIONS, ...PUBLICATIONS].map((pub, i) => (
              <span
                key={pub + i}
                style={{
                  fontFamily: 'var(--eg-font-heading)',
                  fontSize: 'clamp(0.85rem, 1.5vw, 1.05rem)',
                  fontWeight: 600,
                  color: `rgba(61,53,48,0.35)`,
                  letterSpacing: '0.04em',
                  whiteSpace: 'nowrap',
                  fontStyle: 'italic',
                }}
              >
                {pub}
              </span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          3. HOW IT WORKS
      ══════════════════════════════════════ */}
      <section
        ref={stepsRef}
        style={{
          backgroundColor: C.ivory,
          padding: '8rem 2rem',
        }}
      >
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          {/* Section header */}
          <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={stepsInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5 }}
              style={{
                fontSize: '0.72rem', fontWeight: 700,
                letterSpacing: '0.18em', textTransform: 'uppercase',
                color: C.copper, marginBottom: '1rem',
              }}
            >
              How It Works
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={stepsInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.65, delay: 0.1 }}
              style={{
                fontFamily: 'var(--eg-font-heading)',
                fontSize: 'clamp(2rem, 4.5vw, 3.2rem)',
                fontWeight: 700,
                color: C.espresso,
                letterSpacing: '-0.03em',
                lineHeight: 1.15,
              }}
            >
              Three steps to your perfect site
            </motion.h2>
          </div>

          {/* Steps grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '2.5rem',
          }}>
            {STEPS.map((step, i) => (
              <motion.div
                key={step.num}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                animate={stepsInView ? 'visible' : 'hidden'}
                style={{
                  padding: '2.5rem 2rem',
                  background: 'rgba(255,255,255,0.6)',
                  border: `1px solid rgba(214,198,168,0.35)`,
                  borderRadius: '1.25rem',
                  boxShadow: '0 4px 24px rgba(61,53,48,0.05)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Step number — large background */}
                <span aria-hidden="true" style={{
                  position: 'absolute', top: '1rem', right: '1.5rem',
                  fontFamily: 'var(--eg-font-heading)',
                  fontSize: '5rem', fontWeight: 700, lineHeight: 1,
                  color: `rgba(214,198,168,0.18)`,
                  letterSpacing: '-0.04em',
                  pointerEvents: 'none',
                }}>
                  {step.num}
                </span>

                {/* Icon */}
                <div style={{
                  width: '52px', height: '52px',
                  borderRadius: '0.875rem',
                  background: `rgba(163,177,138,0.12)`,
                  border: `1px solid rgba(163,177,138,0.25)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: C.sage,
                  marginBottom: '1.5rem',
                }}>
                  {step.icon}
                </div>

                <h3 style={{
                  fontFamily: 'var(--eg-font-heading)',
                  fontSize: '1.2rem',
                  fontWeight: 700,
                  color: C.espresso,
                  marginBottom: '0.75rem',
                  lineHeight: 1.2,
                }}>
                  {step.title}
                </h3>
                <p style={{
                  fontSize: '0.92rem',
                  color: C.muted,
                  lineHeight: 1.75,
                }}>
                  {step.body}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          4. FEATURE SHOWCASE
      ══════════════════════════════════════ */}
      <section
        ref={featRef}
        style={{
          background: `linear-gradient(160deg, ${C.espresso} 0%, ${C.ink} 100%)`,
          padding: '8rem 2rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background decoration */}
        <FloatingOrb size={600} top="0" left="-100px" color={`rgba(163,177,138,0.1)`} blur={150} opacity={0.1} delay={1} />
        <FloatingOrb size={400} bottom="-50px" right="-100px" color={`rgba(184,146,106,0.1)`} blur={120} opacity={0.1} delay={3} />

        <div style={{ maxWidth: '1000px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={featInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5 }}
              style={{
                fontSize: '0.72rem', fontWeight: 700,
                letterSpacing: '0.18em', textTransform: 'uppercase',
                color: C.copper, marginBottom: '1rem',
              }}
            >
              Platform Features
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={featInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.65, delay: 0.1 }}
              style={{
                fontFamily: 'var(--eg-font-heading)',
                fontSize: 'clamp(2rem, 4.5vw, 3.2rem)',
                fontWeight: 700,
                color: C.ivory,
                letterSpacing: '-0.03em',
                lineHeight: 1.15,
              }}
            >
              Everything your love story deserves
            </motion.h2>
          </div>

          {/* Feature cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1.5rem',
          }}>
            {FEATURES.map((feat, i) => (
              <motion.div
                key={feat.title}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                animate={featInView ? 'visible' : 'hidden'}
                whileHover={{
                  scale: 1.02,
                  boxShadow: `0 0 40px rgba(214,198,168,0.18), 0 0 0 1px rgba(214,198,168,0.3)`,
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                style={{
                  padding: '2.5rem',
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid rgba(214,198,168,0.12)`,
                  borderRadius: '1.25rem',
                  cursor: 'default',
                }}
              >
                {/* Emoji icon */}
                <div style={{
                  fontSize: '2rem',
                  lineHeight: 1,
                  marginBottom: '1.5rem',
                  color: C.gold,
                  fontFamily: 'serif',
                }}>
                  {feat.emoji}
                </div>

                <h3 style={{
                  fontFamily: 'var(--eg-font-heading)',
                  fontSize: '1.3rem',
                  fontWeight: 700,
                  color: C.ivory,
                  marginBottom: '0.75rem',
                  letterSpacing: '-0.01em',
                }}>
                  {feat.title}
                </h3>
                <p style={{
                  fontSize: '0.92rem',
                  color: `rgba(245,241,232,0.6)`,
                  lineHeight: 1.75,
                }}>
                  {feat.body}
                </p>

                {/* Bottom accent line */}
                <div style={{
                  marginTop: '2rem',
                  height: '2px',
                  width: '40px',
                  background: `linear-gradient(90deg, ${C.copper} 0%, transparent 100%)`,
                  borderRadius: '1px',
                  opacity: 0.5,
                }} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          5. TESTIMONIAL + CTA
      ══════════════════════════════════════ */}
      <section
        ref={ctaRef}
        style={{
          backgroundColor: C.ivory,
          padding: '8rem 2rem 10rem',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative background SVG */}
        <svg
          aria-hidden="true"
          viewBox="0 0 800 400"
          style={{
            position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
            width: '100%', maxWidth: '800px', opacity: 0.04, pointerEvents: 'none',
          }}
        >
          <ellipse cx="400" cy="200" rx="380" ry="180" stroke={C.espresso} strokeWidth="1" fill="none" />
          <ellipse cx="400" cy="200" rx="300" ry="130" stroke={C.copper} strokeWidth="0.5" fill="none" strokeDasharray="6 10" />
        </svg>

        <div style={{ maxWidth: '680px', margin: '0 auto', position: 'relative', zIndex: 2 }}>

          {/* Testimonial */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={ctaInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7 }}
          >
            {/* Opening quote mark */}
            <div style={{
              fontFamily: 'var(--eg-font-heading)',
              fontSize: '5rem',
              lineHeight: 0.6,
              color: C.copper,
              opacity: 0.35,
              marginBottom: '1.5rem',
              fontStyle: 'italic',
            }} aria-hidden="true">
              &ldquo;
            </div>

            <blockquote style={{
              fontFamily: 'var(--eg-font-heading)',
              fontSize: 'clamp(1.3rem, 3vw, 1.9rem)',
              fontWeight: 500,
              fontStyle: 'italic',
              color: C.espresso,
              lineHeight: 1.45,
              letterSpacing: '-0.01em',
              marginBottom: '2rem',
            }}>
              The AI described our relationship better than we ever could. We both wept reading it, and our guests said it felt like a design studio had built it just for us.
            </blockquote>

            <OrnamentDivider />

            <p style={{
              marginTop: '1.5rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: C.muted,
            }}>
              Emma &amp; James &nbsp;&bull;&nbsp; Married June 2025
            </p>
          </motion.div>

          {/* Big CTA */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={ctaInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.65, delay: 0.3 }}
            style={{ marginTop: '4rem' }}
          >
            <motion.button
              onClick={handleSignIn}
              disabled={status === 'loading'}
              whileHover={{
                scale: 1.04,
                boxShadow: `0 0 48px rgba(184,146,106,0.5), 0 8px 32px rgba(184,146,106,0.25)`,
              }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 350, damping: 18 }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.7rem',
                padding: '1.1rem 2.8rem',
                background: `linear-gradient(135deg, ${C.copper} 0%, #8b5e3c 100%)`,
                color: C.ivory,
                border: 'none',
                borderRadius: '0.875rem',
                fontSize: '1.05rem',
                fontWeight: 600,
                fontFamily: 'var(--eg-font-body)',
                cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                opacity: status === 'loading' ? 0.7 : 1,
                letterSpacing: '0.02em',
              }}
            >
              Start Your Love Story
              <ArrowRight size={18} strokeWidth={2} />
            </motion.button>

            <p style={{
              marginTop: '1.25rem',
              fontSize: '0.78rem',
              color: C.muted,
              letterSpacing: '0.04em',
            }}>
              No credit card required &nbsp;&bull;&nbsp; Your site live in minutes
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer style={{
        backgroundColor: C.ink,
        padding: '2.5rem 2rem',
        textAlign: 'center',
        borderTop: `1px solid rgba(214,198,168,0.08)`,
      }}>
        <p style={{
          fontSize: '0.75rem',
          color: `rgba(245,241,232,0.25)`,
          letterSpacing: '0.06em',
        }}>
          © 2025 Pearloom &nbsp;&bull;&nbsp; Crafted with love &amp; intelligence
        </p>
      </footer>

    </div>
  );
}
