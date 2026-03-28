'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/landing-page.tsx
// Brand-accurate redesign — Pear Cream palette, editorial luxury
// ─────────────────────────────────────────────────────────────

import { useRef } from 'react';
import { motion, useInView, type Variants } from 'framer-motion';
import { ArrowRight, Sparkles, MessageCircle, Users, Heart, Image, Globe } from 'lucide-react';

interface LandingPageProps {
  handleSignIn: () => void;
  status: string;
}

// ── Brand tokens (Pearloom palette) ──────────────────────────
const C = {
  cream:      '#F5F1E8',    // Pear Cream — main background
  creamDeep:  '#EEE8DC',   // slightly deeper cream
  creamCard:  '#EBE5D5',   // card backgrounds
  olive:      '#A3B18A',   // Soft Olive — primary brand / CTAs
  oliveHover: '#8FA876',   // darker olive for hover
  gold:       '#D6C6A8',   // Dusty Gold — premium accent
  goldLight:  'rgba(214,198,168,0.25)',
  plum:       '#6D597A',   // Muted Plum — emotion / selected
  plumLight:  'rgba(109,89,122,0.1)',
  ink:        '#2B2B2B',   // Charcoal Ink — text
  inkLight:   '#3D3530',   // warm dark for footer
  muted:      '#9A9488',   // warm muted text
  divider:    '#E6DFD2',   // subtle dividers
} as const;

// ── Motion variants ───────────────────────────────────────────
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.7, ease: EASE, delay: i * 0.12 },
  }),
};

const cardIn: Variants = {
  hidden: { opacity: 0, y: 40, scale: 0.97 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.65, ease: EASE, delay: i * 0.14 },
  }),
};

// ── Decorative ornament ───────────────────────────────────────
function OrnamentDivider({ color = C.gold }: { color?: string }) {
  return (
    <svg width="160" height="20" viewBox="0 0 160 20" fill="none" aria-hidden="true">
      <line x1="0" y1="10" x2="62" y2="10" stroke={color} strokeWidth="1" strokeOpacity="0.5" />
      <circle cx="80" cy="10" r="4.5" stroke={color} strokeWidth="1.5" strokeOpacity="0.65" />
      <circle cx="80" cy="10" r="2" fill={color} fillOpacity="0.45" />
      <line x1="98" y1="10" x2="160" y2="10" stroke={color} strokeWidth="1" strokeOpacity="0.5" />
      <circle cx="62" cy="10" r="1.8" fill={color} fillOpacity="0.45" />
      <circle cx="98" cy="10" r="1.8" fill={color} fillOpacity="0.45" />
    </svg>
  );
}

// ── Eye-candy tag pill ─────────────────────────────────────────
function TagPill({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
      padding: '0.3rem 0.9rem',
      background: `rgba(163,177,138,0.12)`,
      border: `1px solid rgba(163,177,138,0.28)`,
      borderRadius: '999px',
      color: C.olive,
      fontSize: '0.72rem', fontWeight: 700,
      letterSpacing: '0.16em', textTransform: 'uppercase',
    }}>
      {children}
    </span>
  );
}

// ── Section header ─────────────────────────────────────────────
function SectionHeader({ label, heading, inView }: { label: string; heading: string; inView: boolean }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
        style={{ marginBottom: '1.25rem' }}
      >
        <TagPill><Sparkles size={10} strokeWidth={2.5} />{label}</TagPill>
      </motion.div>
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.65, delay: 0.1 }}
        style={{
          fontFamily: 'var(--eg-font-heading)',
          fontSize: 'clamp(2rem, 4.5vw, 3rem)',
          fontWeight: 700,
          color: C.ink,
          letterSpacing: '-0.03em',
          lineHeight: 1.15,
        }}
      >
        {heading}
      </motion.h2>
    </div>
  );
}

// ── How-it-works steps ────────────────────────────────────────
const STEPS = [
  {
    num: '01',
    icon: <MessageCircle size={24} strokeWidth={1.5} />,
    title: 'Tell us your love story',
    body: 'Speak or type — share how you met, what makes you laugh, the moment you knew. Our AI listens with care.',
    accent: C.olive,
  },
  {
    num: '02',
    icon: <Sparkles size={24} strokeWidth={1.5} />,
    title: 'AI crafts your bespoke site',
    body: 'Custom narrative, VibeSkin visual identity, and curated illustrations generated uniquely for your story.',
    accent: C.plum,
  },
  {
    num: '03',
    icon: <Users size={24} strokeWidth={1.5} />,
    title: 'Share with your guests',
    body: 'A living site your guests will treasure — RSVP, travel info, your story, and more in one elegant place.',
    accent: C.gold,
  },
];

// ── Feature cards ─────────────────────────────────────────────
const FEATURES = [
  {
    icon: <Heart size={22} strokeWidth={1.5} />,
    title: 'AI Story Generation',
    body: 'Gemini reads your words and crafts an intimate, moving narrative in your voice — never a template.',
    accent: C.plum,
  },
  {
    icon: <Image size={22} strokeWidth={1.5} />,
    title: 'Bespoke Visual Identity',
    body: 'VibeSkin technology builds a complete visual language — palette, type, motifs — from your personality.',
    accent: C.olive,
  },
  {
    icon: <Globe size={22} strokeWidth={1.5} />,
    title: 'Grace for Your Guests',
    body: 'RSVPs, travel, seating, and song requests — collected gracefully in one luminous, branded destination.',
    accent: C.gold,
  },
];

// ── Marquee publications ──────────────────────────────────────
const PUBLICATIONS = [
  'The Knot', 'Brides', 'Martha Stewart Weddings',
  'Vogue Weddings', 'Junebug Weddings', 'Style Me Pretty',
];

// ════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════
export function LandingPage({ handleSignIn, status }: LandingPageProps) {
  const stepsRef   = useRef<HTMLElement>(null);
  const featRef    = useRef<HTMLElement>(null);
  const ctaRef     = useRef<HTMLElement>(null);
  const proofRef   = useRef<HTMLElement>(null);

  const stepsInView = useInView(stepsRef, { once: true, amount: 0.15 });
  const featInView  = useInView(featRef,  { once: true, amount: 0.15 });
  const ctaInView   = useInView(ctaRef,   { once: true, amount: 0.25 });
  const proofInView = useInView(proofRef, { once: true, amount: 0.2 });

  return (
    <div style={{ backgroundColor: C.cream, minHeight: '100dvh', fontFamily: 'var(--eg-font-body)', overflowX: 'hidden', color: C.ink }}>

      {/* ══════════════════════════════════════
          1. HERO — Pear Cream, editorial feel
      ══════════════════════════════════════ */}
      <section style={{
        minHeight: '100dvh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '6rem 2rem 5rem',
        position: 'relative', overflow: 'hidden',
        background: `linear-gradient(160deg, ${C.cream} 0%, ${C.creamDeep} 60%, ${C.cream} 100%)`,
      }}>
        {/* Subtle background texture */}
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `radial-gradient(circle at 20% 30%, rgba(163,177,138,0.08) 0%, transparent 50%),
                            radial-gradient(circle at 80% 70%, rgba(109,89,122,0.06) 0%, transparent 50%),
                            radial-gradient(circle at 50% 10%, rgba(214,198,168,0.12) 0%, transparent 40%)`,
        }} />

        {/* Decorative ring — top right */}
        <svg aria-hidden="true" width="380" height="380" viewBox="0 0 380 380"
          style={{ position: 'absolute', top: '-60px', right: '-80px', opacity: 0.12, pointerEvents: 'none' }}>
          <circle cx="190" cy="190" r="185" stroke={C.gold} strokeWidth="1" fill="none" />
          <circle cx="190" cy="190" r="155" stroke={C.olive} strokeWidth="0.5" fill="none" strokeDasharray="4 8" />
          <circle cx="190" cy="190" r="120" stroke={C.gold} strokeWidth="0.75" fill="none" />
        </svg>

        {/* Decorative ring — bottom left */}
        <svg aria-hidden="true" width="260" height="260" viewBox="0 0 260 260"
          style={{ position: 'absolute', bottom: '-50px', left: '-60px', opacity: 0.09, pointerEvents: 'none' }}>
          <circle cx="130" cy="130" r="125" stroke={C.plum} strokeWidth="1" fill="none" />
          <circle cx="130" cy="130" r="90" stroke={C.gold} strokeWidth="0.5" fill="none" strokeDasharray="3 7" />
        </svg>

        {/* Hero content */}
        <div style={{ position: 'relative', zIndex: 10, maxWidth: '820px', width: '100%', textAlign: 'center' }}>

          {/* Eyebrow tag */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            style={{ marginBottom: '2.5rem' }}
          >
            <TagPill><Sparkles size={10} strokeWidth={2.5} />AI Wedding Site Builder</TagPill>
          </motion.div>

          {/* Headline */}
          <h1 style={{
            fontFamily: 'var(--eg-font-heading)',
            fontSize: 'clamp(3rem, 7.5vw, 6.5rem)',
            fontWeight: 700,
            lineHeight: 1.06,
            letterSpacing: '-0.035em',
            color: C.ink,
            marginBottom: '1.75rem',
          }}>
            {['Your', 'Love', 'Story,'].map((word, i) => (
              <motion.span
                key={word + i}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                style={{ display: 'inline-block', marginRight: '0.22em' }}
              >
                {word}
              </motion.span>
            ))}
            <br />
            {['Beautifully', 'Told.'].map((word, i) => (
              <motion.span
                key={word + i}
                custom={i + 3}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                style={{ display: 'inline-block', marginRight: '0.22em', color: C.plum }}
              >
                {word}
              </motion.span>
            ))}
          </h1>

          {/* Sub-headline */}
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.75 }}
            style={{
              fontSize: 'clamp(1rem, 1.8vw, 1.2rem)',
              color: C.muted,
              maxWidth: '540px',
              margin: '0 auto 3rem',
              lineHeight: 1.8,
              fontWeight: 400,
            }}
          >
            Pearloom listens to your story and generates a bespoke wedding site in minutes — with its own visual identity, intimate narrative, and graceful guest experience.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.95 }}
            style={{ display: 'flex', gap: '0.875rem', justifyContent: 'center', flexWrap: 'wrap' }}
          >
            {/* Primary — Soft Olive */}
            <motion.button
              onClick={handleSignIn}
              disabled={status === 'loading'}
              whileHover={{ scale: 1.04, boxShadow: `0 8px 40px rgba(163,177,138,0.4)` }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 420, damping: 22 }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.55rem',
                padding: '0.95rem 2.1rem',
                background: C.olive,
                color: C.cream,
                border: 'none',
                borderRadius: '0.8rem',
                fontSize: '0.95rem', fontWeight: 600,
                fontFamily: 'var(--eg-font-body)',
                cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                opacity: status === 'loading' ? 0.65 : 1,
                letterSpacing: '0.02em',
                boxShadow: `0 2px 16px rgba(163,177,138,0.25)`,
              }}
            >
              Begin Your Story
              <ArrowRight size={15} strokeWidth={2.2} />
            </motion.button>

            {/* Secondary — Dusty Gold border */}
            <motion.button
              whileHover={{ scale: 1.02, backgroundColor: C.creamDeep }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 420, damping: 22 }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.55rem',
                padding: '0.95rem 2.1rem',
                background: 'transparent',
                color: C.inkLight,
                border: `1.5px solid ${C.gold}`,
                borderRadius: '0.8rem',
                fontSize: '0.95rem', fontWeight: 500,
                fontFamily: 'var(--eg-font-body)',
                cursor: 'pointer',
                letterSpacing: '0.02em',
              }}
            >
              See an Example
            </motion.button>
          </motion.div>

          {/* Trust signal */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4, duration: 0.5 }}
            style={{ marginTop: '1.75rem', fontSize: '0.78rem', color: C.muted, letterSpacing: '0.05em' }}
          >
            No credit card required &nbsp;·&nbsp; Live in minutes
          </motion.p>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8 }}
          style={{
            position: 'absolute', bottom: '2.5rem',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem',
            color: C.gold, fontSize: '0.65rem',
            letterSpacing: '0.18em', fontWeight: 700, textTransform: 'uppercase',
          }}
        >
          <motion.div animate={{ y: [0, 5, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
            <svg width="14" height="22" viewBox="0 0 14 22" fill="none" aria-hidden="true">
              <rect x="1" y="1" width="12" height="20" rx="6" stroke="currentColor" strokeWidth="1.2" />
              <motion.circle cx="7" cy="6" r="2" fill="currentColor"
                animate={{ cy: [6, 12, 6] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
            </svg>
          </motion.div>
          Scroll
        </motion.div>
      </section>

      {/* ══════════════════════════════════════
          2. PUBLICATION MARQUEE
      ══════════════════════════════════════ */}
      <section
        ref={proofRef}
        style={{
          backgroundColor: C.creamDeep,
          padding: '2.5rem 2rem',
          overflow: 'hidden',
          borderTop: `1px solid ${C.divider}`,
          borderBottom: `1px solid ${C.divider}`,
        }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={proofInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6 }}
          style={{
            textAlign: 'center',
            marginBottom: '1.5rem',
            fontSize: '0.7rem', fontWeight: 700,
            letterSpacing: '0.18em', textTransform: 'uppercase',
            color: C.muted,
          }}
        >
          <TagPill>Loved by couples everywhere</TagPill>
        </motion.div>

        <div style={{ position: 'relative', overflow: 'hidden' }}>
          <div aria-hidden="true" style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: '100px', zIndex: 2,
            background: `linear-gradient(90deg, ${C.creamDeep} 0%, transparent 100%)`,
          }} />
          <div aria-hidden="true" style={{
            position: 'absolute', right: 0, top: 0, bottom: 0, width: '100px', zIndex: 2,
            background: `linear-gradient(270deg, ${C.creamDeep} 0%, transparent 100%)`,
          }} />

          <motion.div
            animate={{ x: ['0%', '-50%'] }}
            transition={{ duration: 30, ease: 'linear', repeat: Infinity }}
            style={{ display: 'flex', gap: '4.5rem', alignItems: 'center', width: 'max-content' }}
          >
            {[...PUBLICATIONS, ...PUBLICATIONS].map((pub, i) => (
              <span key={pub + i} style={{
                fontFamily: 'var(--eg-font-heading)',
                fontSize: 'clamp(0.82rem, 1.4vw, 1rem)',
                fontWeight: 600, fontStyle: 'italic',
                color: `rgba(43,43,43,0.32)`,
                letterSpacing: '0.03em', whiteSpace: 'nowrap',
              }}>
                {pub}
              </span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          3. HOW IT WORKS
      ══════════════════════════════════════ */}
      <section ref={stepsRef} style={{ backgroundColor: C.cream, padding: '9rem 2rem' }}>
        <div style={{ maxWidth: '1060px', margin: '0 auto' }}>
          <SectionHeader label="How It Works" heading="Three steps to your perfect site" inView={stepsInView} />

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '2rem',
          }}>
            {STEPS.map((step, i) => (
              <motion.div
                key={step.num}
                custom={i}
                variants={cardIn}
                initial="hidden"
                animate={stepsInView ? 'visible' : 'hidden'}
                whileHover={{ y: -4, boxShadow: `0 16px 48px rgba(43,43,43,0.08)` }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                style={{
                  padding: '2.5rem',
                  background: `rgba(255,255,255,0.7)`,
                  backdropFilter: 'blur(8px)',
                  border: `1px solid ${C.divider}`,
                  borderRadius: '1.25rem',
                  boxShadow: `0 4px 20px rgba(43,43,43,0.04)`,
                  position: 'relative', overflow: 'hidden',
                }}
              >
                {/* Big step number watermark */}
                <span aria-hidden="true" style={{
                  position: 'absolute', top: '1rem', right: '1.5rem',
                  fontFamily: 'var(--eg-font-heading)',
                  fontSize: '5.5rem', fontWeight: 800, lineHeight: 1,
                  color: `rgba(214,198,168,0.22)`,
                  letterSpacing: '-0.04em', pointerEvents: 'none',
                }}>
                  {step.num}
                </span>

                {/* Icon */}
                <div style={{
                  width: '48px', height: '48px',
                  borderRadius: '0.875rem',
                  background: `${step.accent}18`,
                  border: `1px solid ${step.accent}35`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: step.accent, marginBottom: '1.5rem',
                }}>
                  {step.icon}
                </div>

                <h3 style={{
                  fontFamily: 'var(--eg-font-heading)',
                  fontSize: '1.15rem', fontWeight: 700,
                  color: C.ink, marginBottom: '0.75rem', lineHeight: 1.25,
                }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: '0.91rem', color: C.muted, lineHeight: 1.8 }}>
                  {step.body}
                </p>

                {/* Bottom accent bar */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  height: '3px',
                  background: `linear-gradient(90deg, ${step.accent}60 0%, transparent 100%)`,
                  borderRadius: '0 0 1.25rem 1.25rem',
                }} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          4. FEATURE SHOWCASE — deeper cream
      ══════════════════════════════════════ */}
      <section ref={featRef} style={{
        backgroundColor: C.creamDeep,
        padding: '9rem 2rem',
        position: 'relative',
        borderTop: `1px solid ${C.divider}`,
        borderBottom: `1px solid ${C.divider}`,
      }}>
        {/* Soft background radial */}
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `radial-gradient(ellipse at 70% 50%, rgba(109,89,122,0.05) 0%, transparent 60%),
                            radial-gradient(ellipse at 20% 80%, rgba(163,177,138,0.06) 0%, transparent 50%)`,
        }} />

        <div style={{ maxWidth: '1060px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <SectionHeader label="Platform Features" heading="Everything your love story deserves" inView={featInView} />

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.75rem',
          }}>
            {FEATURES.map((feat, i) => (
              <motion.div
                key={feat.title}
                custom={i}
                variants={cardIn}
                initial="hidden"
                animate={featInView ? 'visible' : 'hidden'}
                whileHover={{ y: -4, boxShadow: `0 16px 48px rgba(43,43,43,0.07)` }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                style={{
                  padding: '2.5rem',
                  background: `rgba(255,255,255,0.55)`,
                  backdropFilter: 'blur(10px)',
                  border: `1px solid rgba(255,255,255,0.8)`,
                  borderRadius: '1.25rem',
                  boxShadow: `0 2px 12px rgba(43,43,43,0.04)`,
                  cursor: 'default',
                }}
              >
                {/* Icon bubble */}
                <div style={{
                  width: '52px', height: '52px',
                  borderRadius: '50%',
                  background: `${feat.accent}15`,
                  border: `1.5px solid ${feat.accent}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: feat.accent, marginBottom: '1.5rem',
                }}>
                  {feat.icon}
                </div>

                <h3 style={{
                  fontFamily: 'var(--eg-font-heading)',
                  fontSize: '1.2rem', fontWeight: 700,
                  color: C.ink, marginBottom: '0.75rem', letterSpacing: '-0.01em',
                }}>
                  {feat.title}
                </h3>
                <p style={{ fontSize: '0.91rem', color: C.muted, lineHeight: 1.8 }}>
                  {feat.body}
                </p>

                {/* Accent thread */}
                <div style={{
                  marginTop: '2rem',
                  height: '2px', width: '36px',
                  background: `linear-gradient(90deg, ${feat.accent} 0%, transparent 100%)`,
                  borderRadius: '1px', opacity: 0.55,
                }} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          5. TESTIMONIAL + CTA
      ══════════════════════════════════════ */}
      <section ref={ctaRef} style={{
        backgroundColor: C.cream,
        padding: '9rem 2rem 10rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative rings */}
        <svg aria-hidden="true" viewBox="0 0 700 350"
          style={{
            position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
            width: '90%', maxWidth: '700px', opacity: 0.05, pointerEvents: 'none',
          }}>
          <ellipse cx="350" cy="175" rx="340" ry="160" stroke={C.plum} strokeWidth="1" fill="none" />
          <ellipse cx="350" cy="175" rx="270" ry="115" stroke={C.olive} strokeWidth="0.5" fill="none" strokeDasharray="5 9" />
        </svg>

        <div style={{ maxWidth: '640px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
          {/* Testimonial */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={ctaInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7 }}
          >
            {/* Opening quote */}
            <div style={{
              fontFamily: 'var(--eg-font-heading)',
              fontSize: '5rem', lineHeight: 0.6,
              color: C.plum, opacity: 0.3,
              marginBottom: '1.25rem', fontStyle: 'italic',
            }} aria-hidden="true">
              &ldquo;
            </div>

            <blockquote style={{
              fontFamily: 'var(--eg-font-heading)',
              fontSize: 'clamp(1.25rem, 2.8vw, 1.8rem)',
              fontWeight: 500, fontStyle: 'italic',
              color: C.inkLight, lineHeight: 1.5,
              letterSpacing: '-0.01em', marginBottom: '2rem',
            }}>
              The AI described our relationship better than we ever could. We both wept reading it, and our guests said it felt like a design studio had built it just for us.
            </blockquote>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <OrnamentDivider color={C.gold} />
            </div>

            <p style={{
              fontSize: '0.8rem', fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              color: C.muted,
            }}>
              Emma &amp; James &nbsp;·&nbsp; Married June 2025
            </p>
          </motion.div>

          {/* Final CTA */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={ctaInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.65, delay: 0.3 }}
            style={{ marginTop: '4.5rem' }}
          >
            <motion.button
              onClick={handleSignIn}
              disabled={status === 'loading'}
              whileHover={{
                scale: 1.05,
                boxShadow: `0 12px 50px rgba(163,177,138,0.45)`,
              }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 380, damping: 20 }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.65rem',
                padding: '1.15rem 3rem',
                background: C.olive,
                color: C.cream,
                border: 'none',
                borderRadius: '0.875rem',
                fontSize: '1.05rem', fontWeight: 700,
                fontFamily: 'var(--eg-font-body)',
                cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                opacity: status === 'loading' ? 0.65 : 1,
                letterSpacing: '0.02em',
                boxShadow: `0 4px 24px rgba(163,177,138,0.28)`,
              }}
            >
              Start Your Love Story
              <ArrowRight size={18} strokeWidth={2.2} />
            </motion.button>

            <p style={{
              marginTop: '1.25rem',
              fontSize: '0.78rem', color: C.muted, letterSpacing: '0.04em',
            }}>
              No credit card required &nbsp;·&nbsp; Your site live in minutes
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer style={{
        backgroundColor: C.inkLight,
        padding: '2.75rem 2rem',
        textAlign: 'center',
        borderTop: `1px solid rgba(214,198,168,0.12)`,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '0.5rem', marginBottom: '0.75rem',
        }}>
          <div style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: C.olive,
          }} />
          <span style={{
            fontFamily: 'var(--eg-font-heading)',
            fontSize: '1rem', fontWeight: 700,
            color: C.cream, letterSpacing: '0.04em', fontStyle: 'italic',
          }}>
            Pearloom
          </span>
        </div>
        <p style={{
          fontSize: '0.72rem',
          color: `rgba(245,241,232,0.3)`,
          letterSpacing: '0.06em',
        }}>
          © 2025 Pearloom &nbsp;·&nbsp; Crafted with love &amp; intelligence
        </p>
      </footer>
    </div>
  );
}
