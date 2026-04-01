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
import { SectionHeader } from '@/components/marketing/SectionHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/cn';

interface LandingPageProps {
  handleSignIn: () => void;
  status: string;
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  show: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.75, ease: EASE, delay: i * 0.1 },
  }),
};

// ── Data ──────────────────────────────────────────────────────

const OCCASIONS = [
  {
    num: '01',
    label: 'Weddings',
    tagline: 'From first look to forever',
    desc: 'A full wedding site with your love story, events, RSVP, registry, and travel \u2014 all in one breathtaking place.',
    accent: C.plum,
  },
  {
    num: '02',
    label: 'Engagements',
    tagline: 'They said yes. Now tell the world.',
    desc: 'Share the proposal story, the ring, and save-the-date details with everyone you love.',
    accent: C.olive,
  },
  {
    num: '03',
    label: 'Anniversaries',
    tagline: 'Years together, still writing chapters',
    desc: 'Celebrate milestones with a timeline of your journey, favorite memories, and a message to each other.',
    accent: C.gold,
  },
  {
    num: '04',
    label: 'Birthdays',
    tagline: 'Every year a new story',
    desc: 'A personalised birthday site with your story, photos, guest wishes, and all the event details.',
    accent: C.plum,
  },
  {
    num: '05',
    label: 'Any Celebration',
    tagline: 'If it matters, it deserves a site',
    desc: 'Reunions, retirements, quincea\u00f1eras, graduations \u2014 any moment worth remembering gets a home.',
    accent: C.olive,
  },
];

const TESTIMONIALS = [
  {
    quote: 'The Loom described our relationship better than we ever could. Our guests said it felt like a design studio built it just for us.',
    name: 'Emma & James',
    event: 'Wedding \u00b7 June 2025',
    featured: true,
  },
  {
    quote: 'I made an anniversary site in 20 minutes and my husband cried reading the story it wove about us.',
    name: 'Priya S.',
    event: 'Anniversary \u00b7 10 years',
    featured: false,
  },
  {
    quote: "Everyone at my mum\u2019s 70th asked who designed the site. I said \u201cPearloom and me in half an hour.\u201d Jaws dropped.",
    name: 'Liam T.',
    event: 'Birthday \u00b7 July 2025',
    featured: false,
  },
  {
    quote: 'The proposal story The Loom crafted had our families in tears. Absolutely stunning.',
    name: 'Sofia & Marco',
    event: 'Engagement \u00b7 March 2026',
    featured: false,
  },
  {
    quote: "His colleagues kept asking for the \u201cdesign agency\u201d behind it. It was just me and Pearloom.",
    name: 'Kezia O.',
    event: 'Celebration \u00b7 February 2026',
    featured: false,
  },
];

// ═══════════════════════════════════════════════════════════════
export function LandingPage({ handleSignIn, status }: LandingPageProps) {
  const occasionRef = useRef<HTMLElement>(null);
  const testRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const occasionInView = useInView(occasionRef, { once: true, amount: 0.08 });
  const testInView = useInView(testRef, { once: true, amount: 0.1 });
  const ctaInView = useInView(ctaRef, { once: true, amount: 0.3 });

  const NAV_LINKS = ['How it works', 'The Loom', 'Features', 'Pricing', 'FAQ'];

  return (
    <div className="bg-[var(--pl-cream)] min-h-dvh font-[family-name:var(--pl-font-body)] text-[var(--pl-ink)] overflow-x-hidden">

      {/* ══════════════ NAV — dark band ══════════════ */}
      <nav className="sticky top-0 z-[100] bg-[var(--pl-ink)] flex items-center justify-between px-[clamp(1.25rem,5vw,3.5rem)] h-[68px]">
        <span className="font-[family-name:var(--pl-font-heading)] text-xl font-bold italic text-white tracking-[-0.01em]">
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
            onClick={handleSignIn}
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
              className="md:hidden fixed inset-0 z-[998] bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="md:hidden fixed top-0 right-0 bottom-0 w-[min(82vw,340px)] z-[999] bg-[var(--pl-ink)] flex flex-col shadow-[-12px_0_50px_rgba(0,0,0,0.3)]"
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
                <span className="font-[family-name:var(--pl-font-heading)] text-xl font-bold italic text-white">
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
                  <motion.a
                    key={label}
                    href={`#${label.toLowerCase().replace(/ /g, '-')}`}
                    onClick={() => setMobileMenuOpen(false)}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.08 + i * 0.05 }}
                    className="text-[1.05rem] font-semibold text-white/75 no-underline px-4 py-3.5 rounded-xl flex items-center justify-between hover:bg-white/08 hover:text-white transition-all duration-150"
                  >
                    {label}
                    <ChevronRight size={15} className="opacity-40" />
                  </motion.a>
                ))}
              </div>
              <div className="p-5 border-t border-white/10">
                <Button
                  variant="accent"
                  size="lg"
                  className="w-full justify-center"
                  onClick={() => { setMobileMenuOpen(false); handleSignIn(); }}
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

      {/* ══════════════ OCCASIONS — numbered list on dark bg ══════════════ */}
      <section
        id="occasions"
        ref={occasionRef}
        className="bg-[var(--pl-ink)] py-[clamp(4rem,8vw,8rem)] px-[clamp(1.25rem,5vw,4rem)]"
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
              className="font-[family-name:var(--pl-font-heading)] text-[clamp(2rem,5vw,3.5rem)] font-bold italic text-white leading-[1.1] tracking-[-0.03em] max-w-[600px]"
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
                  className="font-[family-name:var(--pl-font-heading)] text-[3.5rem] font-bold italic leading-none flex-shrink-0 w-24 text-right hidden sm:block transition-colors duration-300"
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
                  <div className="font-[family-name:var(--pl-font-heading)] text-[1.3rem] font-semibold italic text-white mb-2 leading-snug">
                    {o.tagline}
                  </div>
                  <p className="text-[0.88rem] text-white/45 leading-[1.75] max-w-[520px]">
                    {o.desc}
                  </p>
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

      {/* ══════════════ TESTIMONIALS — cream cards on deep bg ══════════════ */}
      <section
        ref={testRef}
        className="bg-[var(--pl-cream-deep)] py-[clamp(4rem,8vw,8rem)] px-[clamp(1.25rem,5vw,4rem)] border-t border-[var(--pl-divider)]"
      >
        <div className="max-w-[1100px] mx-auto">
          <SectionHeader
            eyebrow="Loved by real people"
            title="Stories from our community"
            inView={testInView}
          />

          {/* Featured first — full width */}
          {TESTIMONIALS.filter(t => t.featured).map((t, i) => (
            <motion.div
              key={t.name}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              animate={testInView ? 'show' : 'hidden'}
              className="mb-5"
            >
              <Card
                variant="elevated"
                padding="none"
                className="p-10 sm:p-14 relative overflow-hidden"
              >
                <div
                  className="absolute top-0 left-0 w-1 h-full rounded-l-[var(--pl-radius-md)]"
                  style={{ background: `linear-gradient(180deg, ${C.gold}, ${C.plum})` }}
                />
                <div
                  className="font-[family-name:var(--pl-font-heading)] text-[6rem] leading-[0.6] text-[var(--pl-gold)] opacity-20 select-none absolute top-6 left-10"
                  aria-hidden
                >
                  &ldquo;
                </div>
                <blockquote className="font-[family-name:var(--pl-font-heading)] text-[clamp(1.2rem,2.2vw,1.5rem)] italic font-medium text-[var(--pl-ink-soft)] leading-[1.5] mb-6 relative z-10 max-w-[760px]">
                  {t.quote}
                </blockquote>
                <Separator className="mb-5 max-w-[80px]" />
                <p className="text-[0.78rem] font-bold tracking-[0.12em] uppercase text-[var(--pl-muted)]">
                  — {t.name} &nbsp;&middot;&nbsp; {t.event}
                </p>
              </Card>
            </motion.div>
          ))}

          {/* Rest — 2-column grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {TESTIMONIALS.filter(t => !t.featured).map((t, i) => (
              <motion.div
                key={t.name}
                custom={i + 1}
                variants={fadeUp}
                initial="hidden"
                animate={testInView ? 'show' : 'hidden'}
                className="h-full"
              >
                <Card variant="flat" padding="none" className="p-7 h-full flex flex-col">
                  <div className="font-[family-name:var(--pl-font-heading)] text-[3rem] leading-[0.7] text-[var(--pl-gold)] opacity-50 mb-4 italic" aria-hidden>
                    &ldquo;
                  </div>
                  <blockquote className="font-[family-name:var(--pl-font-heading)] text-[1rem] italic font-medium text-[var(--pl-ink-soft)] leading-[1.6] flex-1 mb-5">
                    {t.quote}
                  </blockquote>
                  <p className="text-[0.72rem] font-bold tracking-[0.1em] uppercase text-[var(--pl-muted)]">
                    — {t.name} &nbsp;&middot;&nbsp; {t.event}
                  </p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ PRICING ══════════════ */}
      <PricingPreview />

      {/* ══════════════ FAQ ══════════════ */}
      <FAQSection />

      {/* ══════════════ FINAL CTA — split layout ══════════════ */}
      <section
        ref={ctaRef}
        className="relative bg-[var(--pl-ink)] overflow-hidden py-[clamp(5rem,10vw,10rem)] px-[clamp(1.5rem,5vw,4rem)]"
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
            <h2 className="font-[family-name:var(--pl-font-heading)] text-[clamp(2.2rem,5vw,3.75rem)] font-bold italic text-white tracking-[-0.035em] leading-[1.08] mb-6">
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
              <h3 className="font-[family-name:var(--pl-font-heading)] text-[1.5rem] font-semibold italic text-white mb-2 leading-tight">
                Create your first site
              </h3>
              <p className="text-[0.85rem] text-white/45 leading-relaxed mb-8">
                Answer a few questions. The Loom builds something extraordinary.
              </p>
              <Button
                variant="gold"
                size="lg"
                className="w-full justify-center bg-[var(--pl-gold)] text-[var(--pl-ink)] hover:bg-[#d4b87a] border-0 shadow-[0_4px_24px_rgba(196,169,106,0.35)]"
                onClick={handleSignIn}
                disabled={status === 'loading'}
              >
                Begin Your Story <ArrowRight size={16} strokeWidth={2.2} />
              </Button>
              <p className="text-center mt-4 text-[0.72rem] text-white/30 tracking-[0.08em]">
                Free to start &nbsp;&middot;&nbsp; No credit card &nbsp;&middot;&nbsp; Live in minutes
              </p>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* ══════════════ FOOTER ══════════════ */}
      <MarketingFooter />
    </div>
  );
}
