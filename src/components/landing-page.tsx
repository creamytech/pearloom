'use client';

// ─────────────────────────────────────────────────────────────
// Landing — Wave B editorial recompose.
// Order: Hero → Social proof → Event OS pillars → Live demo
//      → Seat-to-Story → Editor → The Loom → Occasions
//      → Testimonials → Pricing → Trust → FAQ → CTA → Footer
// ─────────────────────────────────────────────────────────────

import { useRef, useState } from 'react';
import { motion, useInView, type Variants } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { AuthModal } from '@/components/auth/AuthModal';

import { MarketingNav } from './marketing/MarketingNav';
import { EditorialHero } from './marketing/EditorialHero';
import { EventOSPillars } from './marketing/EventOSPillars';
import { SocialProofBar } from './marketing/SocialProofBar';
import { TheLoomShowcase } from './marketing/TheLoomShowcase';
import { GuestExperience } from './marketing/GuestExperience';
import { EditorShowcase } from './marketing/EditorShowcase';
import { PricingPreview } from './marketing/PricingPreview';
import { FAQSection } from './marketing/FAQSection';
import { TrustSignals } from './marketing/TrustSignals';
import { MarketingFooter } from './marketing/MarketingFooter';
import { C, EASE } from './marketing/colors';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface LandingPageProps {
  handleSignIn: () => void;
  status: string;
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: EASE, delay: i * 0.08 },
  }),
};

// ─── Data ─────────────────────────────────────────────────────

const OCCASIONS = [
  { num: '01', label: 'Weddings', tagline: 'From first look to forever', accent: 'var(--pl-plum)' },
  { num: '02', label: 'Engagements', tagline: 'They said yes. Now tell the world.', accent: 'var(--pl-olive)' },
  { num: '03', label: 'Anniversaries', tagline: 'Years together, still writing chapters', accent: 'var(--pl-gold)' },
  { num: '04', label: 'Birthdays', tagline: 'Every year a new story', accent: 'var(--pl-plum)' },
  { num: '05', label: 'Reunions & memorials', tagline: 'For the people you keep close', accent: 'var(--pl-olive)' },
];

const TESTIMONIALS = [
  {
    quote: 'The Loom described our relationship better than we ever could.',
    name: 'Emma & James',
    event: 'Wedding',
  },
  {
    quote: 'I made an anniversary site in 20 minutes and my husband cried.',
    name: 'Priya S.',
    event: 'Anniversary',
  },
  {
    quote: 'Everyone asked who designed the site. I said "Pearloom and me in half an hour."',
    name: 'Liam T.',
    event: 'Birthday',
  },
];

// ─── Inline live-demo (kept from prior version) ───────────────
function TryItLivePlayground({ onGetStarted }: { onGetStarted: () => void }) {
  const [name1, setName1] = useState('Sarah');
  const [name2, setName2] = useState('Alex');

  const display = name1 && name2 ? `${name1} & ${name2}` : name1 || name2 || 'Your Names';

  return (
    <div>
      <div className="flex gap-3 mb-6 w-full max-w-[400px] mx-auto">
        <input
          type="text"
          value={name1}
          onChange={(e) => setName1(e.target.value)}
          placeholder="First name"
          className="flex-1 min-w-0 px-4 py-3 rounded-xl border border-[var(--pl-divider)] bg-[var(--pl-cream-card)] text-[var(--pl-ink)] text-[max(16px,0.9rem)] font-body outline-none focus:border-[var(--pl-olive)] transition-colors"
        />
        <input
          type="text"
          value={name2}
          onChange={(e) => setName2(e.target.value)}
          placeholder="Partner's name"
          className="flex-1 min-w-0 px-4 py-3 rounded-xl border border-[var(--pl-divider)] bg-[var(--pl-cream-card)] text-[var(--pl-ink)] text-[max(16px,0.9rem)] font-body outline-none focus:border-[var(--pl-olive)] transition-colors"
        />
      </div>

      <motion.div
        layout
        className="rounded-2xl overflow-hidden mx-auto w-full max-w-[400px]"
        style={{
          background: 'var(--pl-cream-card)',
          border: '1px solid var(--pl-divider)',
          boxShadow: 'var(--pl-shadow-lg)',
        }}
      >
        <div
          style={{
            height: 160,
            background:
              'radial-gradient(circle at 30% 50%, color-mix(in oklab, var(--pl-olive) 22%, transparent) 0%, transparent 60%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <motion.h3
            key={display}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="font-heading text-[clamp(1.6rem,4vw,2.2rem)] font-medium italic tracking-[-0.02em] relative z-10"
            style={{ color: 'var(--pl-ink)', fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1' }}
          >
            {display}
          </motion.h3>
        </div>
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-[2px] rounded-full" style={{ background: 'var(--pl-olive)', opacity: 0.5 }} />
            <span className="text-[0.6rem] font-bold tracking-[0.18em] uppercase" style={{ color: 'var(--pl-olive)' }}>
              Our Story
            </span>
            <div className="flex-1 h-[2px] rounded-full" style={{ background: 'var(--pl-olive)', opacity: 0.18 }} />
          </div>
          <div className="space-y-2 mb-4">
            <div className="h-2 rounded-full bg-[var(--pl-divider)] w-[90%]" />
            <div className="h-2 rounded-full bg-[var(--pl-divider-soft)] w-[70%]" />
            <div className="h-2 rounded-full bg-[var(--pl-divider-soft)] w-[50%]" />
          </div>
          <Button variant="accent" size="sm" onClick={onGetStarted} className="w-full">
            Create yours free <ArrowRight size={14} />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
export function LandingPage({ handleSignIn: _handleSignIn, status }: LandingPageProps) {
  void _handleSignIn;
  const occasionRef = useRef<HTMLElement>(null);
  const testRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLElement>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const openAuth = () => setShowAuthModal(true);

  const occasionInView = useInView(occasionRef, { once: true, amount: 0.08 });
  const testInView = useInView(testRef, { once: true, amount: 0.1 });
  const ctaInView = useInView(ctaRef, { once: true, amount: 0.3 });

  return (
    <div
      className="min-h-dvh font-body overflow-x-hidden"
      style={{ background: 'var(--pl-cream)', color: 'var(--pl-ink)' }}
    >
      {/* ── Nav (editorial, theme-aware) ───────────────────────── */}
      <MarketingNav onGetStarted={openAuth} />

      {/* ── Hero ───────────────────────────────────────────────── */}
      <EditorialHero onGetStarted={openAuth} />

      {/* ── Social proof — slim band ───────────────────────────── */}
      <SocialProofBar />

      {/* ── Event OS — the actual pitch ────────────────────────── */}
      <EventOSPillars />

      {/* ── Try it live ────────────────────────────────────────── */}
      <section
        id="try"
        style={{
          padding: 'clamp(80px, 12vh, 140px) clamp(20px, 5vw, 64px)',
          background: 'var(--pl-cream)',
        }}
      >
        <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          <motion.div
            className="pl-overline"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            style={{ marginBottom: 18 }}
          >
            Try it now · no signup
          </motion.div>
          <motion.h2
            className="pl-display"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={1}
            style={{
              margin: '0 0 14px',
              fontSize: 'clamp(2rem, 4.5vw, 3rem)',
              color: 'var(--pl-ink)',
              lineHeight: 1.05,
            }}
          >
            Type your names. Watch the cover{' '}
            <em
              style={{
                fontFamily: 'var(--pl-font-display)',
                fontStyle: 'italic',
                color: 'var(--pl-gold)',
                fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
              }}
            >
              breathe.
            </em>
          </motion.h2>
          <motion.p
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={2}
            style={{
              color: 'var(--pl-muted)',
              fontSize: '1rem',
              maxWidth: 460,
              margin: '0 auto 36px',
              lineHeight: 1.55,
            }}
          >
            A miniature of the cover-builder. The real one has hundreds of cover compositions, swappable typography, and a Pear assistant whispering ideas.
          </motion.p>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={3}
          >
            <TryItLivePlayground onGetStarted={openAuth} />
          </motion.div>
        </div>
      </section>

      {/* ── Seat-to-Story (guest experience) ──────────────────── */}
      <GuestExperience />

      {/* ── Editor showcase ───────────────────────────────────── */}
      <EditorShowcase />

      {/* ── The Loom (Pear narrative) ─────────────────────────── */}
      <TheLoomShowcase />

      {/* ── Occasions — numbered editorial list on dark bg ────── */}
      <section
        id="occasions"
        ref={occasionRef}
        style={{
          background: 'var(--pl-ink)',
          padding: 'clamp(80px, 12vh, 140px) clamp(20px, 5vw, 64px)',
        }}
      >
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <div style={{ marginBottom: 56, maxWidth: 640 }}>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={occasionInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6 }}
              style={{
                fontFamily: 'var(--pl-font-mono)',
                fontSize: '0.66rem',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'var(--pl-gold)',
                marginBottom: 18,
              }}
            >
              Every occasion
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={occasionInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.08 }}
              className="pl-display"
              style={{
                margin: 0,
                fontSize: 'clamp(2rem, 5vw, 3.4rem)',
                color: 'var(--pl-cream)',
                lineHeight: 1.05,
              }}
            >
              Whatever you’re celebrating, it deserves a{' '}
              <em
                style={{
                  fontFamily: 'var(--pl-font-display)',
                  fontStyle: 'italic',
                  color: 'var(--pl-gold)',
                  fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                }}
              >
                home.
              </em>
            </motion.h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {OCCASIONS.map((o, i) => (
              <motion.a
                key={o.label}
                href="#try"
                custom={i}
                variants={fadeUp}
                initial="hidden"
                animate={occasionInView ? 'show' : 'hidden'}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '90px 1fr auto',
                  alignItems: 'center',
                  gap: 28,
                  padding: '28px 4px',
                  borderTop: '1px solid color-mix(in oklab, var(--pl-cream) 12%, transparent)',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'background var(--pl-dur-base) var(--pl-ease-out), padding var(--pl-dur-base) var(--pl-ease-out)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'color-mix(in oklab, var(--pl-cream) 4%, transparent)';
                  e.currentTarget.style.paddingLeft = '14px';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.paddingLeft = '4px';
                }}
              >
                <span
                  className="pl-display-italic"
                  style={{
                    fontSize: '2.6rem',
                    color: o.accent,
                    opacity: 0.55,
                    lineHeight: 1,
                    fontVariationSettings: '"opsz" 144, "SOFT" 50, "WONK" 1',
                  }}
                >
                  {o.num}
                </span>
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--pl-font-mono)',
                      fontSize: '0.66rem',
                      letterSpacing: '0.2em',
                      textTransform: 'uppercase',
                      color: o.accent,
                      marginBottom: 8,
                    }}
                  >
                    {o.label}
                  </div>
                  <div
                    className="pl-display"
                    style={{
                      fontSize: 'clamp(1.2rem, 2.2vw, 1.6rem)',
                      color: 'var(--pl-cream)',
                      lineHeight: 1.2,
                    }}
                  >
                    {o.tagline}
                  </div>
                </div>
                <ArrowRight size={18} style={{ color: o.accent, opacity: 0.7 }} />
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials — editorial pull-quotes ──────────────── */}
      <section
        ref={testRef}
        style={{
          background: 'var(--pl-cream)',
          padding: 'clamp(80px, 12vh, 140px) clamp(20px, 5vw, 64px)',
        }}
      >
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <div className="pl-overline" style={{ marginBottom: 56 }}>
            What hosts have said
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 56,
            }}
          >
            {TESTIMONIALS.map((t, i) => (
              <motion.figure
                key={t.name}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                animate={testInView ? 'show' : 'hidden'}
                style={{ margin: 0, display: 'flex', flexDirection: 'column' }}
              >
                <div
                  className="pl-display-italic"
                  style={{
                    fontSize: '5rem',
                    lineHeight: 0.7,
                    color: 'var(--pl-gold)',
                    opacity: 0.4,
                    marginBottom: 16,
                    fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                  }}
                  aria-hidden
                >
                  &ldquo;
                </div>
                <blockquote
                  className="pl-display-italic"
                  style={{
                    margin: 0,
                    fontSize: 'clamp(1.05rem,1.5vw,1.2rem)',
                    color: 'var(--pl-ink)',
                    lineHeight: 1.5,
                    fontVariationSettings: '"opsz" 144, "SOFT" 60, "WONK" 0',
                    flex: 1,
                  }}
                >
                  {t.quote}
                </blockquote>
                <figcaption
                  style={{
                    marginTop: 22,
                    fontFamily: 'var(--pl-font-mono)',
                    fontSize: '0.66rem',
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: 'var(--pl-muted)',
                  }}
                >
                  — {t.name} · {t.event}
                </figcaption>
              </motion.figure>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────── */}
      <PricingPreview onGetStarted={openAuth} />

      {/* ── Trust signals ─────────────────────────────────────── */}
      <TrustSignals />

      {/* ── FAQ ───────────────────────────────────────────────── */}
      <FAQSection />

      {/* ── Final CTA ─────────────────────────────────────────── */}
      <section
        ref={ctaRef}
        style={{
          position: 'relative',
          background: 'var(--pl-ink)',
          padding: 'clamp(80px, 12vh, 140px) clamp(20px, 5vw, 64px)',
          overflow: 'hidden',
        }}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse 60% 50% at 80% 0%, color-mix(in oklab, var(--pl-gold) 16%, transparent) 0%, transparent 60%)',
          }}
        />
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            maxWidth: 1180,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)',
            gap: 64,
            alignItems: 'center',
          }}
          className="pl-cta-grid"
        >
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={ctaInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7 }}
          >
            <div
              style={{
                fontFamily: 'var(--pl-font-mono)',
                fontSize: '0.66rem',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'var(--pl-gold)',
                marginBottom: 18,
              }}
            >
              Pearloom is open
            </div>
            <h2
              className="pl-display"
              style={{
                margin: 0,
                fontSize: 'clamp(2.2rem, 5vw, 3.6rem)',
                color: 'var(--pl-cream)',
                lineHeight: 1.05,
                maxWidth: '14ch',
              }}
            >
              The day is coming.{' '}
              <em
                style={{
                  fontFamily: 'var(--pl-font-display)',
                  fontStyle: 'italic',
                  color: 'var(--pl-gold)',
                  fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                }}
              >
                Be ready.
              </em>
            </h2>
            <p
              style={{
                marginTop: 22,
                color: 'color-mix(in oklab, var(--pl-cream) 75%, transparent)',
                fontSize: '1.05rem',
                lineHeight: 1.6,
                maxWidth: '46ch',
              }}
            >
              One workspace for the site, the day-of, and the film. Free forever on small events. Live in five minutes.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={ctaInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.12 }}
          >
            <Card
              variant="dark"
              padding="none"
              className="p-10 border-white/[0.1]"
              style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.4)' }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'color-mix(in oklab, var(--pl-gold) 22%, transparent)',
                  border: '1px solid color-mix(in oklab, var(--pl-gold) 30%, transparent)',
                  marginBottom: 22,
                }}
              >
                <Sparkles size={22} style={{ color: 'var(--pl-gold)' }} />
              </div>
              <h3
                className="pl-display"
                style={{
                  margin: 0,
                  color: 'var(--pl-cream)',
                  fontSize: '1.5rem',
                  lineHeight: 1.15,
                }}
              >
                Begin your first plate
              </h3>
              <p
                style={{
                  marginTop: 8,
                  color: 'color-mix(in oklab, var(--pl-cream) 70%, transparent)',
                  fontSize: '0.9rem',
                  lineHeight: 1.55,
                }}
              >
                Three questions. Pear drafts the rest. You take it from there.
              </p>
              <Button
                variant="gold"
                size="lg"
                className="w-full justify-center mt-7 text-[1rem] py-3.5"
                style={{
                  background: 'var(--pl-gold)',
                  color: 'var(--pl-ink)',
                  border: 0,
                  boxShadow: '0 4px 24px color-mix(in oklab, var(--pl-gold) 35%, transparent)',
                }}
                onClick={openAuth}
                disabled={status === 'loading'}
              >
                Start weaving — free <ArrowRight size={16} strokeWidth={2.2} />
              </Button>
              <p
                style={{
                  textAlign: 'center',
                  marginTop: 10,
                  fontFamily: 'var(--pl-font-mono)',
                  fontSize: '0.66rem',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'color-mix(in oklab, var(--pl-cream) 55%, transparent)',
                }}
              >
                No card · 5-min setup
              </p>
            </Card>
          </motion.div>
        </div>

        <style jsx>{`
          @media (max-width: 880px) {
            :global(.pl-cta-grid) {
              grid-template-columns: 1fr !important;
              gap: 36px !important;
            }
          }
        `}</style>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <MarketingFooter />

      {/* ── Auth modal ─────────────────────────────────────────── */}
      <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}

// Suppress unused `C` import — colors module kept for legacy components
void C;
