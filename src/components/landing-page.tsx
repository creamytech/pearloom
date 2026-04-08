'use client';

import { useRef, useState } from 'react';
import { motion, useInView, AnimatePresence, type Variants } from 'framer-motion';
import { ArrowRight, Menu, X, Sparkles, ChevronRight } from 'lucide-react';
import { AuthModal } from '@/components/auth/AuthModal';

import { MarketingHero } from './marketing/MarketingHero';
import { SocialProofBar } from './marketing/SocialProofBar';
import { HowItWorks } from './marketing/HowItWorks';
import { TheLoomShowcase } from './marketing/TheLoomShowcase';
import { BlockTypesGrid } from './marketing/BlockTypesGrid';
import { GuestExperience } from './marketing/GuestExperience';
import { EditorShowcase } from './marketing/EditorShowcase';
import { PricingPreview } from './marketing/PricingPreview';
import { Testimonials } from './marketing/Testimonials';
import { FAQSection } from './marketing/FAQSection';
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
    opacity: 1, y: 0,
    transition: { duration: 0.5, ease: EASE, delay: i * 0.08 },
  }),
};

// ── Data ──────────────────────────────────────────────────────

const OCCASIONS = [
  { num: '01', label: 'Weddings', tagline: 'From first look to forever', accent: C.plum },
  { num: '02', label: 'Engagements', tagline: 'They said yes. Now tell the world.', accent: C.olive },
  { num: '03', label: 'Anniversaries', tagline: 'Years together, still writing chapters', accent: C.gold },
  { num: '04', label: 'Birthdays', tagline: 'Every year a new story', accent: C.plum },
  { num: '05', label: 'Any Celebration', tagline: 'If it matters, it deserves a site', accent: C.olive },
];

// ── Try It Live Playground ─────────────────────────────────────
function TryItLivePlayground({ onGetStarted }: { onGetStarted: () => void }) {
  const [name1, setName1] = useState('Sarah');
  const [name2, setName2] = useState('Alex');

  const display = name1 && name2
    ? `${name1} & ${name2}`
    : name1 || name2 || 'Your Names';

  return (
    <div>
      {/* Input row */}
      <div className="flex gap-3 mb-6 max-w-[400px] mx-auto">
        <input
          type="text"
          value={name1}
          onChange={(e) => setName1(e.target.value)}
          placeholder="First name"
          className="flex-1 px-4 py-3 rounded-xl border border-[rgba(0,0,0,0.08)] bg-white text-[var(--pl-ink)] text-[max(16px,0.9rem)] font-body outline-none focus:border-[var(--pl-olive)] transition-colors"
        />
        <input
          type="text"
          value={name2}
          onChange={(e) => setName2(e.target.value)}
          placeholder="Partner's name"
          className="flex-1 px-4 py-3 rounded-xl border border-[rgba(0,0,0,0.08)] bg-white text-[var(--pl-ink)] text-[max(16px,0.9rem)] font-body outline-none focus:border-[var(--pl-olive)] transition-colors"
        />
      </div>

      {/* Live preview card */}
      <motion.div
        layout
        className="rounded-2xl overflow-hidden mx-auto max-w-[400px]"
        style={{
          background: 'linear-gradient(145deg, #faf9f6 0%, #f0ece4 100%)',
          border: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 12px 48px rgba(43,30,20,0.10), 0 0 0 1px rgba(0,0,0,0.02)',
        }}
      >
        {/* Hero image placeholder */}
        <div
          style={{
            height: 160,
            background: 'linear-gradient(135deg, rgba(163,177,138,0.15) 0%, rgba(196,169,106,0.1) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', overflow: 'hidden',
          }}
        >
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(circle at 30% 50%, rgba(163,177,138,0.2) 0%, transparent 60%)',
          }} />
          <motion.h3
            key={display}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="font-heading text-[clamp(1.6rem,4vw,2.2rem)] font-semibold italic tracking-[-0.02em] relative z-10"
            style={{ color: '#3D3530' }}
          >
            {display}
          </motion.h3>
        </div>
        {/* Mini sections */}
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-[2px] rounded-full" style={{ background: C.olive, opacity: 0.5 }} />
            <span className="text-[0.6rem] font-bold tracking-[0.15em] uppercase" style={{ color: C.olive }}>Our Story</span>
            <div className="flex-1 h-[2px] rounded-full" style={{ background: C.olive, opacity: 0.2 }} />
          </div>
          <div className="space-y-2 mb-4">
            <div className="h-2 rounded-full bg-[rgba(0,0,0,0.06)] w-[90%]" />
            <div className="h-2 rounded-full bg-[rgba(0,0,0,0.04)] w-[70%]" />
            <div className="h-2 rounded-full bg-[rgba(0,0,0,0.03)] w-[50%]" />
          </div>
          <Button variant="accent" size="sm" onClick={onGetStarted} className="w-full">
            Create yours free <ArrowRight size={14} />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

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
    quote: "Everyone asked who designed the site. I said \u201cPearloom and me in half an hour.\u201d",
    name: 'Liam T.',
    event: 'Birthday',
  },
];

// ═══════════════════════════════════════════════════════════════
export function LandingPage({ handleSignIn, status }: LandingPageProps) {
  const occasionRef = useRef<HTMLElement>(null);
  const testRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Wrap handleSignIn to show modal instead of direct Google sign-in
  const openAuth = () => setShowAuthModal(true);

  const occasionInView = useInView(occasionRef, { once: true, amount: 0.08 });
  const testInView = useInView(testRef, { once: true, amount: 0.1 });
  const ctaInView = useInView(ctaRef, { once: true, amount: 0.3 });

  const NAV_LINKS = ['How it works', 'The Loom', 'Features', 'Pricing', 'FAQ'];

  return (
    <div className="bg-[var(--pl-cream)] min-h-dvh font-body text-[var(--pl-ink)] overflow-x-hidden">

      {/* ══════════════ NAV — dark band ══════════════ */}
      <nav className="sticky top-0 z-[100] bg-[var(--pl-ink)] flex items-center justify-between px-[clamp(1.25rem,5vw,3.5rem)] h-[68px]">
        <span className="font-heading text-xl font-bold italic text-white tracking-[-0.01em]">
          Pearloom
        </span>

        <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 gap-8">
          {NAV_LINKS.map(label => (
            <a
              key={label}
              href={`#${label.toLowerCase().replace(/ /g, '-')}`}
              className="text-[0.85rem] font-medium text-white/55 no-underline tracking-[0.03em] transition-colors duration-200 hover:text-white"
            >
              {label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="accent"
            size="sm"
            onClick={openAuth}
            className="hidden sm:inline-flex"
          >
            Get Started Free
          </Button>
          <button
            className="md:hidden bg-transparent border-0 cursor-pointer p-1.5 text-white/70 flex items-center justify-center hover:text-white transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
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
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="md:hidden fixed inset-0 z-[998] bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="md:hidden fixed top-0 right-0 bottom-0 w-[min(82vw,340px)] z-[999] bg-[var(--pl-ink)] flex flex-col shadow-[-12px_0_50px_rgba(0,0,0,0.3)]"
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
                <span className="font-heading text-xl font-bold italic text-white">
                  Pearloom
                </span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="bg-transparent border-0 cursor-pointer p-1.5 text-white/50 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 p-4 flex flex-col gap-1 overflow-y-auto">
                {NAV_LINKS.map((label, i) => (
                  <a
                    key={label}
                    href={`#${label.toLowerCase().replace(/ /g, '-')}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`pl-enter pl-enter-d${Math.min(i + 1, 8)} text-[1.05rem] font-semibold text-white/75 no-underline px-4 py-3.5 rounded-xl flex items-center justify-between hover:bg-white/08 hover:text-white transition-all duration-150`}
                  >
                    {label}
                    <ChevronRight size={15} className="opacity-40" />
                  </a>
                ))}
              </div>
              <div className="p-5 border-t border-white/10">
                <Button
                  variant="accent"
                  size="lg"
                  className="w-full justify-center"
                  onClick={() => { setMobileMenuOpen(false); openAuth(); }}
                  icon={<Sparkles size={15} />}
                >
                  Get Started Free
                </Button>
                <p className="text-center mt-3 text-[0.75rem] text-white/35 tracking-wider">
                  No credit card required
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ══════════════ HERO ══════════════ */}
      <MarketingHero handleSignIn={openAuth} status={status} />

      {/* ══════════════ SOCIAL PROOF ══════════════ */}
      <SocialProofBar />

      {/* ══════════════ HOW IT WORKS ══════════════ */}
      <HowItWorks />

      {/* ══════════════ THE LOOM ══════════════ */}
      <TheLoomShowcase />

      {/* ══════════════ BLOCK TYPES ══════════════ */}
      <BlockTypesGrid />

      {/* ══════════════ PLATFORM FEATURES ══════════════ */}
      <GuestExperience />

      {/* ══════════════ EDITOR ══════════════ */}
      <EditorShowcase />

      {/* ══════════════ TRY IT LIVE ══════════════ */}
      <section className="py-[clamp(3rem,6vw,5rem)] px-[clamp(1.25rem,5vw,4rem)] bg-[var(--pl-cream-deep)]">
        <div className="max-w-[680px] mx-auto text-center">
          <motion.p
            initial="hidden" whileInView="show" viewport={{ once: true }}
            variants={fadeUp} custom={0}
            className="text-[0.72rem] font-bold tracking-[0.2em] uppercase mb-4"
            style={{ color: C.olive }}
          >
            Try it now
          </motion.p>
          <motion.h2
            initial="hidden" whileInView="show" viewport={{ once: true }}
            variants={fadeUp} custom={1}
            className="font-heading text-[clamp(2rem,5vw,3rem)] font-bold italic tracking-[-0.03em] mb-3 leading-tight"
            style={{ color: C.ink }}
          >
            See your names come alive
          </motion.h2>
          <motion.p
            initial="hidden" whileInView="show" viewport={{ once: true }}
            variants={fadeUp} custom={2}
            className="text-[var(--pl-muted)] text-[1rem] mb-10 max-w-[420px] mx-auto leading-relaxed"
          >
            Type your names below and watch the preview update instantly.
          </motion.p>

          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true }}
            variants={fadeUp} custom={3}
          >
            <TryItLivePlayground onGetStarted={openAuth} />
          </motion.div>
        </div>
      </section>

      {/* ══════════════ OCCASIONS — numbered list on dark bg ══════════════ */}
      <section
        id="occasions"
        ref={occasionRef}
        className="bg-[var(--pl-ink)] py-[clamp(3rem,6vw,6rem)] px-[clamp(1.25rem,5vw,4rem)]"
      >
        <div className="max-w-[1100px] mx-auto">
          {/* Header */}
          <div className="mb-14">
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={occasionInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6 }}
              className="text-[0.72rem] font-bold tracking-[0.2em] uppercase text-[var(--pl-gold)] mb-4"
            >
              Every occasion
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={occasionInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.75, delay: 0.08 }}
              className="font-heading text-[clamp(2rem,5vw,3.5rem)] font-bold italic text-white leading-[1.1] tracking-[-0.03em] max-w-[600px]"
            >
              Whatever you&rsquo;re celebrating, it deserves a beautiful home.
            </motion.h2>
          </div>

          {/* Numbered rows */}
          <div className="flex flex-col divide-y divide-white/[0.07]">
            {OCCASIONS.map((o, i) => (
              <motion.div
                key={o.label}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                animate={occasionInView ? 'show' : 'hidden'}
                className="group flex flex-col sm:flex-row items-start sm:items-center gap-6 py-8 transition-all duration-300 hover:bg-white/[0.02] px-2 rounded-xl -mx-2"
              >
                {/* Number */}
                <span
                  className="font-heading text-[3.5rem] font-bold italic leading-none flex-shrink-0 w-24 text-right hidden sm:block transition-colors duration-300"
                  style={{ color: `${o.accent}35`, WebkitTextStroke: `1px ${o.accent}30` }}
                >
                  {o.num}
                </span>

                {/* Accent dot (mobile) */}
                <span
                  className="sm:hidden w-2 h-2 rounded-full flex-shrink-0 mt-2"
                  style={{ background: o.accent }}
                />

                {/* Content */}
                <div className="flex-1 sm:border-l sm:pl-8 transition-all duration-300" style={{ borderColor: `${o.accent}25` }}>
                  <div
                    className="text-[0.72rem] font-bold tracking-[0.16em] uppercase mb-2 transition-colors duration-300 group-hover:opacity-100"
                    style={{ color: o.accent }}
                  >
                    {o.label}
                  </div>
                  <div className="font-heading text-[1.3rem] font-semibold italic text-white leading-snug">
                    {o.tagline}
                  </div>
                </div>

                {/* Arrow */}
                <ArrowRight
                  size={18}
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1"
                  style={{ color: o.accent }}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ TESTIMONIALS — floating pull quotes ══════════════ */}
      <section
        ref={testRef}
        className="bg-[var(--pl-cream)] py-[clamp(3rem,6vw,6rem)] px-[clamp(1.25rem,5vw,4rem)] border-t border-[var(--pl-divider)]"
      >
        <div className="max-w-[1100px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-10">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.name}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              animate={testInView ? 'show' : 'hidden'}
              className="flex flex-col"
            >
              <div
                className="font-heading text-[5rem] leading-[0.7] mb-5 select-none italic"
                style={{ color: C.gold, opacity: 0.35 }}
                aria-hidden
              >
                &ldquo;
              </div>
              <blockquote
                className="font-heading italic font-medium leading-[1.55] flex-1 mb-5"
                style={{ fontSize: 'clamp(1.05rem,1.6vw,1.2rem)', color: C.ink }}
              >
                {t.quote}
              </blockquote>
              <p className="text-[0.72rem] font-bold tracking-[0.1em] uppercase text-[var(--pl-muted)]">
                — {t.name} &nbsp;&middot;&nbsp; {t.event}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ══════════════ PRICING ══════════════ */}
      <PricingPreview />

      {/* ══════════════ TESTIMONIALS ══════════════ */}
      <Testimonials />

      {/* ══════════════ FAQ ══════════════ */}
      <FAQSection />

      {/* ══════════════ FINAL CTA — split layout ══════════════ */}
      <section
        ref={ctaRef}
        className="relative bg-[var(--pl-ink)] overflow-hidden py-[clamp(4rem,8vw,7rem)] px-[clamp(1.5rem,5vw,4rem)]"
      >
        {/* Decorative circles */}
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full border border-white/[0.04] pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-[340px] h-[340px] rounded-full border border-[var(--pl-gold)]/[0.08] pointer-events-none" />
        <div className="absolute top-10 right-10 w-[200px] h-[200px] rounded-full border border-[var(--pl-plum)]/[0.12] pointer-events-none" />

        <div className="max-w-[1100px] mx-auto flex flex-col lg:flex-row items-center gap-16 relative z-10">
          {/* Left — text */}
          <motion.div
            className="flex-1"
            initial={{ opacity: 0, x: -30 }}
            animate={ctaInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8 }}
          >
            <p className="text-[0.72rem] font-bold tracking-[0.2em] uppercase text-[var(--pl-gold)] mb-5">
              Start free today
            </p>
            <h2 className="font-heading text-[clamp(2.2rem,5vw,3.75rem)] font-bold italic text-white tracking-[-0.035em] leading-[1.08] mb-6">
              Your moment is already beautiful.
              <br />
              <span style={{ color: C.gold }}>Let&rsquo;s give it a home.</span>
            </h2>
            <p className="text-[1rem] text-white/45 leading-[1.8] max-w-[440px]">
              Weddings, birthdays, anniversaries, reunions &mdash; whatever you&rsquo;re celebrating,
              Pearloom and The Loom make it unforgettable.
            </p>
          </motion.div>

          {/* Right — CTA card */}
          <motion.div
            className="flex-shrink-0 w-full lg:w-[360px]"
            initial={{ opacity: 0, x: 30 }}
            animate={ctaInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.15 }}
          >
            <Card
              variant="dark"
              padding="none"
              className="p-10 border-white/[0.1] shadow-[0_32px_80px_rgba(0,0,0,0.4)]"
            >
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6" style={{ background: `${C.gold}22`, border: `1px solid ${C.gold}30` }}>
                <Sparkles size={24} style={{ color: C.gold }} />
              </div>
              <h3 className="font-heading text-[1.5rem] font-semibold italic text-white mb-2 leading-tight">
                Create your first site
              </h3>
              <p className="text-[0.85rem] text-white/45 leading-relaxed mb-8">
                Answer a few questions. The Loom builds something extraordinary.
              </p>
              <Button
                variant="gold"
                size="lg"
                className="w-full justify-center bg-[var(--pl-gold)] text-[var(--pl-ink)] hover:bg-[#d4b87a] border-0 shadow-[0_4px_24px_rgba(196,169,106,0.35)] text-[1rem] py-3.5"
                onClick={openAuth}
                disabled={status === 'loading'}
              >
                Begin Your Story <ArrowRight size={16} strokeWidth={2.2} />
              </Button>
              <p className="text-center mt-3 text-[0.8rem] text-white/40 tracking-[0.02em]">
                Takes less than 2 minutes
              </p>
              <p className="text-center mt-1 text-[0.68rem] text-white/25 tracking-[0.08em]">
                Free to start &nbsp;&middot;&nbsp; No credit card &nbsp;&middot;&nbsp; Live in minutes
              </p>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* ══════════════ FOOTER ══════════════ */}
      <MarketingFooter />

      {/* Auth Modal */}
      <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}
