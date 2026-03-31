'use client';

import { useRef, useState } from 'react';
import { motion, useInView, AnimatePresence, type Variants } from 'framer-motion';
import { ArrowRight, Menu, X, Sparkles, ChevronRight } from 'lucide-react';

import { MarketingHero } from './marketing/MarketingHero';
import { SocialProofBar } from './marketing/SocialProofBar';
import { HowItWorks } from './marketing/HowItWorks';
import { TheLoomShowcase } from './marketing/TheLoomShowcase';
import { EditorShowcase } from './marketing/EditorShowcase';
import { BlockTypesGrid } from './marketing/BlockTypesGrid';
import { GuestExperience } from './marketing/GuestExperience';
import { PricingPreview } from './marketing/PricingPreview';
import { FAQSection } from './marketing/FAQSection';
import { MarketingFooter } from './marketing/MarketingFooter';
import { C, EASE } from './marketing/colors';
import { Pill } from '@/components/ui/Pill';
import { SectionHeader } from '@/components/marketing/SectionHeader';
import { text, card, sectionPadding } from '@/lib/design-tokens';

interface LandingPageProps {
  handleSignIn: () => void;
  status: string;
}

const up: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: EASE, delay: i * 0.12 },
  }),
};

// ── Occasion data ─────────────────────────────────────────────
const OCCASIONS = [
  {
    label: 'Weddings',
    tagline: 'From first look to forever',
    desc: 'A full wedding site with your love story, events, RSVP, registry, and travel \u2014 all in one breathtaking place.',
    accent: C.plum,
    bg: 'rgba(109,89,122,0.07)',
  },
  {
    label: 'Engagements',
    tagline: 'They said yes. Now tell the world.',
    desc: 'Share the proposal story, the ring, and save-the-date details with everyone you love.',
    accent: C.olive,
    bg: 'rgba(163,177,138,0.08)',
  },
  {
    label: 'Anniversaries',
    tagline: 'Years together, still writing chapters',
    desc: 'Celebrate milestones with a timeline of your journey, favorite memories, and a message to each other.',
    accent: C.gold,
    bg: 'rgba(214,198,168,0.12)',
  },
  {
    label: 'Birthdays',
    tagline: 'Every year a new story',
    desc: 'A personalised birthday site with your story, photos, guest wishes, and all the event details.',
    accent: C.plum,
    bg: 'rgba(109,89,122,0.07)',
  },
  {
    label: 'Any Celebration',
    tagline: 'If it matters, it deserves a site',
    desc: 'Reunions, retirements, quincea\u00f1eras, graduations \u2014 any moment worth remembering gets a home.',
    accent: C.olive,
    bg: 'rgba(163,177,138,0.08)',
  },
];

// ── Occasion SVG icons ────────────────────────────────────────
function OccasionIcon({ type, accent }: { type: string; accent: string }) {
  const s = {
    width: 24,
    height: 24,
    fill: 'none',
    stroke: accent,
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  if (type === 'Weddings')
    return (
      <svg {...s} viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="8.5" cy="12" r="4.5" />
        <circle cx="15.5" cy="12" r="4.5" />
      </svg>
    );
  if (type === 'Engagements')
    return (
      <svg {...s} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 21L3 9l2.5-4h9L17 9l-5 12z" />
        <path d="M3 9h18M8 9l4 12M16 9l-4 12" />
      </svg>
    );
  if (type === 'Anniversaries')
    return (
      <svg {...s} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 21C12 21 3 14 3 8a4 4 0 0 1 7.5-2A4 4 0 0 1 21 8c0 6-9 13-9 13z" />
      </svg>
    );
  if (type === 'Birthdays')
    return (
      <svg {...s} viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="13" width="18" height="8" rx="2" />
        <path d="M8 13v-2M12 13v-2M16 13v-2" />
        <path d="M8 9a1 1 0 0 0 0-2c0-1 1-2 1-2s1 1 1 2a1 1 0 0 0 0 2" strokeWidth={1.3} />
        <path d="M12 9a1 1 0 0 0 0-2c0-1 1-2 1-2s1 1 1 2a1 1 0 0 0 0 2" strokeWidth={1.3} />
        <path d="M16 9a1 1 0 0 0 0-2c0-1 1-2 1-2s1 1 1 2a1 1 0 0 0 0 2" strokeWidth={1.3} />
      </svg>
    );
  return (
    <svg {...s} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.64 5.64l1.42 1.42M16.95 16.95l1.41 1.41M5.64 18.36l1.42-1.42M16.95 7.05l1.41-1.41" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// ── Ornament ──────────────────────────────────────────────────
function Ornament() {
  return (
    <svg width="140" height="18" viewBox="0 0 140 18" fill="none" aria-hidden="true">
      <line x1="0" y1="9" x2="54" y2="9" stroke={C.gold} strokeWidth="1" strokeOpacity="0.55" />
      <circle cx="70" cy="9" r="4" stroke={C.gold} strokeWidth="1.5" strokeOpacity="0.6" />
      <circle cx="70" cy="9" r="1.8" fill={C.gold} fillOpacity="0.5" />
      <line x1="86" y1="9" x2="140" y2="9" stroke={C.gold} strokeWidth="1" strokeOpacity="0.55" />
      <circle cx="54" cy="9" r="1.6" fill={C.gold} fillOpacity="0.45" />
      <circle cx="86" cy="9" r="1.6" fill={C.gold} fillOpacity="0.45" />
    </svg>
  );
}

const TESTIMONIALS = [
  {
    quote:
      'The Loom described our relationship better than we ever could. Our guests said it felt like a design studio built it just for us.',
    name: 'Emma & James',
    event: 'Wedding \u00b7 June 2025',
  },
  {
    quote:
      'I made an anniversary site in 20 minutes and my husband cried reading the story it wove about us. Completely magical.',
    name: 'Priya',
    event: 'Anniversary \u00b7 10 years',
  },
  {
    quote:
      "Everyone at my mum's 70th asked who designed the site. I said \"Pearloom and me in half an hour.\" Jaws dropped.",
    name: 'Liam T.',
    event: 'Birthday \u00b7 July 2025',
  },
  {
    quote:
      'We used it to announce our engagement and the proposal story The Loom crafted had our families in tears. Absolutely stunning.',
    name: 'Sofia & Marco',
    event: 'Engagement \u00b7 March 2026',
  },
  {
    quote:
      "Made a site for my dad's retirement party. His colleagues kept asking for the \"design agency\" behind it. It was just me and Pearloom.",
    name: 'Kezia O.',
    event: 'Celebration \u00b7 February 2026',
  },
];

// ═══════════════════════════════════════════════════════════════
export function LandingPage({ handleSignIn, status }: LandingPageProps) {
  const occasionRef = useRef<HTMLElement>(null);
  const testRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const occasionInView = useInView(occasionRef, { once: true, amount: 0.1 });
  const testInView = useInView(testRef, { once: true, amount: 0.2 });
  const ctaInView = useInView(ctaRef, { once: true, amount: 0.3 });

  const NAV_LINKS = ['How it works', 'The Loom', 'Features', 'Pricing', 'FAQ'];

  return (
    <div
      style={{
        background: C.cream,
        minHeight: '100dvh',
        fontFamily: 'var(--eg-font-body)',
        color: C.ink,
        overflowX: 'hidden',
      }}
    >
      {/* ══════════════ NAV ══════════════ */}
      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 clamp(1.25rem,5vw,4rem)',
          height: '64px',
          background: `${C.cream}EB`,
          backdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${C.divider}`,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--eg-font-heading)',
            fontSize: text.lg,
            fontWeight: 700,
            fontStyle: 'italic',
            color: C.ink,
            letterSpacing: '-0.01em',
          }}
        >
          Pearloom
        </span>

        {/* Desktop nav links */}
        <div
          className="hidden md:flex"
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            gap: '2.5rem',
          }}
        >
          {NAV_LINKS.map(label => (
            <a
              key={label}
              href={`#${label.toLowerCase().replace(/ /g, '-')}`}
              style={{
                fontSize: text.base,
                fontWeight: 500,
                color: C.muted,
                textDecoration: 'none',
                letterSpacing: '0.02em',
                transition: 'color 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = C.ink)}
              onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
            >
              {label}
            </a>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <motion.button
            onClick={handleSignIn}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="hidden sm:inline-flex"
            style={{
              padding: '0.5rem 1.25rem',
              background: C.olive,
              color: C.cream,
              border: 'none',
              borderRadius: '0.6rem',
              fontSize: text.base,
              fontWeight: 600,
              fontFamily: 'var(--eg-font-body)',
              cursor: 'pointer',
            }}
          >
            Get Started
          </motion.button>

          {/* Mobile hamburger */}
          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.4rem',
              color: C.ink,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* ══════════════ MOBILE MENU ══════════════ */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Dark overlay / backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="md:hidden"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 998,
                background: `${C.ink}73`,
                backdropFilter: 'blur(4px)',
              }}
            />
            {/* Slide-in drawer from right */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="md:hidden"
              style={{
                position: 'fixed',
                top: 0,
                right: 0,
                bottom: 0,
                width: 'min(85vw, 360px)',
                zIndex: 999,
                background: `${C.cream}F8`,
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                boxShadow: `-8px 0 40px ${C.ink}1F`,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {/* Drawer header with logo and close */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '1.25rem 1.5rem',
                borderBottom: `1px solid ${C.divider}`,
              }}>
                <span style={{
                  fontFamily: 'var(--eg-font-heading)',
                  fontSize: text.lg,
                  fontWeight: 700,
                  fontStyle: 'italic',
                  color: C.ink,
                  letterSpacing: '-0.01em',
                }}>
                  Pearloom
                </span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: '0.35rem', color: C.muted, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    borderRadius: '0.5rem', transition: 'color 0.2s',
                  }}
                  aria-label="Close menu"
                >
                  <X size={22} />
                </button>
              </div>

              {/* Nav links */}
              <div style={{
                flex: 1, padding: '1.25rem 1rem', display: 'flex',
                flexDirection: 'column', gap: '0.2rem', overflowY: 'auto',
              }}>
                {NAV_LINKS.map((label, i) => (
                  <motion.a
                    key={label}
                    href={`#${label.toLowerCase().replace(/ /g, '-')}`}
                    onClick={() => setMobileMenuOpen(false)}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 + i * 0.05 }}
                    style={{
                      fontSize: 'clamp(1.05rem, 2.5vw, 1.15rem)',
                      fontWeight: 600,
                      color: C.dark,
                      textDecoration: 'none',
                      padding: '0.9rem 1rem',
                      borderRadius: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'background 0.2s, color 0.2s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = `${C.olive}1A`;
                      e.currentTarget.style.color = C.ink;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = C.dark;
                    }}
                  >
                    {label}
                    <ChevronRight size={16} style={{ opacity: 0.35 }} />
                  </motion.a>
                ))}
              </div>

              {/* Separator */}
              <div style={{
                margin: '0 1.5rem',
                height: '1px',
                background: C.divider,
              }} />

              {/* Bottom CTA */}
              <div style={{ padding: '1.5rem' }}>
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.35 }}
                  onClick={() => { setMobileMenuOpen(false); handleSignIn(); }}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    background: C.olive,
                    color: C.cream,
                    border: 'none',
                    borderRadius: '0.85rem',
                    fontSize: text.md,
                    fontWeight: 700,
                    fontFamily: 'var(--eg-font-body)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow: `0 8px 30px ${C.olive}33`,
                    letterSpacing: '0.01em',
                  }}
                >
                  <Sparkles size={16} />
                  Get Started Free
                  <ArrowRight size={16} />
                </motion.button>
                <p style={{
                  textAlign: 'center', marginTop: '0.75rem',
                  fontSize: text.xs, color: C.muted, letterSpacing: '0.03em',
                }}>
                  No credit card required
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ══════════════ HERO ══════════════ */}
      <MarketingHero handleSignIn={handleSignIn} status={status} />

      {/* ══════════════ SOCIAL PROOF ══════════════ */}
      <SocialProofBar />

      {/* ══════════════ HOW IT WORKS ══════════════ */}
      <HowItWorks />

      {/* ══════════════ THE LOOM ══════════════ */}
      <TheLoomShowcase />

      {/* ══════════════ EDITOR ══════════════ */}
      <EditorShowcase />

      {/* ══════════════ BLOCKS ══════════════ */}
      <BlockTypesGrid />

      {/* ══════════════ GUEST EXPERIENCE ══════════════ */}
      <GuestExperience />

      {/* ══════════════ OCCASIONS ══════════════ */}
      <section
        id="occasions"
        ref={occasionRef}
        style={{
          background: C.cream,
          padding: sectionPadding.y + ' ' + sectionPadding.x,
          borderTop: `1px solid ${C.divider}`,
          borderBottom: `1px solid ${C.divider}`,
        }}
      >
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={occasionInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8 }}
              style={{ marginBottom: '1.1rem', display: 'flex', justifyContent: 'center' }}
            >
              <Ornament />
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 18 }}
              animate={occasionInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.1 }}
              style={{
                fontFamily: 'var(--eg-font-heading)',
                fontSize: 'clamp(1.9rem,4vw,2.9rem)',
                fontWeight: 700,
                color: C.ink,
                letterSpacing: '-0.03em',
                lineHeight: 1.15,
              }}
            >
              Whatever you&rsquo;re celebrating
            </motion.h2>
          </div>

          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            style={{ gap: '1.25rem' }}
          >
            {OCCASIONS.map((o, i) => (
              <motion.div
                key={o.label}
                custom={i}
                variants={up}
                initial="hidden"
                animate={occasionInView ? 'show' : 'hidden'}
                whileHover={{ y: -4, boxShadow: card.shadowHover }}
                style={{
                  padding: '2rem 1.5rem 2rem 1.75rem',
                  background: card.bg,
                  border: card.border,
                  borderLeft: `3px solid ${o.accent}`,
                  borderRadius: card.radius,
                  boxShadow: card.shadow,
                  transition: 'box-shadow 0.25s ease, transform 0.25s ease',
                }}
              >
                <div
                  style={{
                    fontSize: text.xs,
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: o.accent,
                    marginBottom: '0.6rem',
                  }}
                >
                  {o.label}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--eg-font-heading)',
                    fontSize: text.lg,
                    fontWeight: 700,
                    fontStyle: 'italic',
                    color: C.ink,
                    marginBottom: '0.75rem',
                    lineHeight: 1.3,
                  }}
                >
                  {o.tagline}
                </div>
                <p style={{ fontSize: text.base, color: C.muted, lineHeight: 1.8, margin: 0 }}>
                  {o.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ TESTIMONIALS ══════════════ */}
      <section
        ref={testRef}
        style={{
          background: C.cream,
          padding: 'clamp(3.5rem,7vw,7rem) 1.25rem',
          borderTop: `1px solid ${C.divider}`,
        }}
      >
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <SectionHeader
            eyebrow="Loved by real people"
            title="Stories from our community"
            inView={testInView}
          />
          <div
            className="grid grid-cols-1 sm:grid-cols-2"
            style={{ gap: '1.25rem' }}
          >
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={t.name}
                custom={i}
                variants={up}
                initial="hidden"
                animate={testInView ? 'show' : 'hidden'}
                className={i === 0 ? 'sm:col-span-2' : ''}
                style={{
                  padding: i === 0 ? '2.5rem' : '2rem',
                  background: card.bg,
                  border: card.border,
                  borderRadius: card.radius,
                  boxShadow: card.shadow,
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--eg-font-heading)',
                    fontSize: '4rem',
                    lineHeight: 0.7,
                    color: C.gold,
                    opacity: 0.7,
                    marginBottom: '1rem',
                    fontStyle: 'italic',
                  }}
                >
                  &ldquo;
                </div>
                <blockquote
                  style={{
                    fontFamily: 'var(--eg-font-heading)',
                    fontSize: 'clamp(1rem,1.6vw,1.12rem)',
                    fontStyle: 'italic',
                    fontWeight: 500,
                    color: C.dark,
                    lineHeight: 1.55,
                    margin: '0 0 1.25rem',
                  }}
                >
                  {t.quote}
                </blockquote>
                <p
                  style={{
                    marginTop: '1rem',
                    fontSize: text.sm,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: C.muted,
                  }}
                >
                  {t.name} &middot; {t.event}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ PRICING ══════════════ */}
      <PricingPreview />

      {/* ══════════════ FAQ ══════════════ */}
      <FAQSection />

      {/* ══════════════ FINAL CTA ══════════════ */}
      <section
        ref={ctaRef}
        style={{
          background: C.ink,
          padding: 'clamp(4rem,8vw,9rem) 1.5rem clamp(4.5rem,9vw,10rem)',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={ctaInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
          >
            {/* Gold ornamental rule */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
              <div style={{ width: '80px', height: '1px', background: C.gold, opacity: 0.5 }} />
            </div>
            <h2
              style={{
                fontFamily: 'var(--eg-font-heading)',
                fontSize: 'clamp(2rem,5vw,3.25rem)',
                fontWeight: 700,
                fontStyle: 'italic',
                color: C.cream,
                letterSpacing: '-0.035em',
                lineHeight: 1.1,
                margin: '0 0 1.25rem',
              }}
            >
              Your moment is already beautiful.
              <br />
              <span style={{ color: C.gold }}>Let&rsquo;s give it a home.</span>
            </h2>
            <p
              style={{
                fontSize: 'clamp(0.95rem,1.8vw,1.1rem)',
                color: C.darkText,
                lineHeight: 1.8,
                maxWidth: '480px',
                margin: '0 auto 3rem',
              }}
            >
              Weddings, birthdays, anniversaries, reunions — whatever you&rsquo;re celebrating,
              Pearloom and The Loom make it unforgettable.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={ctaInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.25 }}
          >
            <motion.button
              onClick={handleSignIn}
              disabled={status === 'loading'}
              whileHover={{ scale: 1.05, boxShadow: `0 14px 50px ${C.gold}80` }}
              whileTap={{ scale: 0.97 }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '1.1rem 2.8rem',
                background: C.gold,
                color: C.ink,
                border: 'none',
                borderRadius: '0.875rem',
                fontSize: text.lg,
                fontWeight: 700,
                fontFamily: 'var(--eg-font-body)',
                cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                opacity: status === 'loading' ? 0.65 : 1,
                boxShadow: `0 4px 24px ${C.gold}66`,
              }}
            >
              Begin Your Story <ArrowRight size={17} strokeWidth={2.2} />
            </motion.button>
            <p style={{ marginTop: '1.1rem', fontSize: text.sm, color: C.darkText, letterSpacing: '0.04em' }}>
              Free to start &middot; No credit card &middot; Live in minutes
            </p>
          </motion.div>
        </div>
      </section>

      {/* ══════════════ FOOTER ══════════════ */}
      <MarketingFooter />
    </div>
  );
}
