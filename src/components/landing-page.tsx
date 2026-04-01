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
  },
  {
    label: 'Engagements',
    tagline: 'They said yes. Now tell the world.',
    desc: 'Share the proposal story, the ring, and save-the-date details with everyone you love.',
    accent: C.olive,
  },
  {
    label: 'Anniversaries',
    tagline: 'Years together, still writing chapters',
    desc: 'Celebrate milestones with a timeline of your journey, favorite memories, and a message to each other.',
    accent: C.gold,
  },
  {
    label: 'Birthdays',
    tagline: 'Every year a new story',
    desc: 'A personalised birthday site with your story, photos, guest wishes, and all the event details.',
    accent: C.plum,
  },
  {
    label: 'Any Celebration',
    tagline: 'If it matters, it deserves a site',
    desc: 'Reunions, retirements, quincea\u00f1eras, graduations \u2014 any moment worth remembering gets a home.',
    accent: C.olive,
  },
];

// ── Occasion SVG icons ────────────────────────────────────────
function OccasionIcon({ type, accent }: { type: string; accent: string }) {
  const s = {
    width: 24, height: 24, fill: 'none', stroke: accent, strokeWidth: 1.6,
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  };
  if (type === 'Weddings')
    return (<svg {...s} viewBox="0 0 24 24" aria-hidden="true"><circle cx="8.5" cy="12" r="4.5" /><circle cx="15.5" cy="12" r="4.5" /></svg>);
  if (type === 'Engagements')
    return (<svg {...s} viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21L3 9l2.5-4h9L17 9l-5 12z" /><path d="M3 9h18M8 9l4 12M16 9l-4 12" /></svg>);
  if (type === 'Anniversaries')
    return (<svg {...s} viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21C12 21 3 14 3 8a4 4 0 0 1 7.5-2A4 4 0 0 1 21 8c0 6-9 13-9 13z" /></svg>);
  if (type === 'Birthdays')
    return (<svg {...s} viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="13" width="18" height="8" rx="2" /><path d="M8 13v-2M12 13v-2M16 13v-2" /><path d="M8 9a1 1 0 0 0 0-2c0-1 1-2 1-2s1 1 1 2a1 1 0 0 0 0 2" strokeWidth={1.3} /><path d="M12 9a1 1 0 0 0 0-2c0-1 1-2 1-2s1 1 1 2a1 1 0 0 0 0 2" strokeWidth={1.3} /><path d="M16 9a1 1 0 0 0 0-2c0-1 1-2 1-2s1 1 1 2a1 1 0 0 0 0 2" strokeWidth={1.3} /></svg>);
  return (<svg {...s} viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.64 5.64l1.42 1.42M16.95 16.95l1.41 1.41M5.64 18.36l1.42-1.42M16.95 7.05l1.41-1.41" /><circle cx="12" cy="12" r="3" /></svg>);
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
    quote: 'The Loom described our relationship better than we ever could. Our guests said it felt like a design studio built it just for us.',
    name: 'Emma & James',
    event: 'Wedding \u00b7 June 2025',
  },
  {
    quote: 'I made an anniversary site in 20 minutes and my husband cried reading the story it wove about us. Completely magical.',
    name: 'Priya',
    event: 'Anniversary \u00b7 10 years',
  },
  {
    quote: "Everyone at my mum\u2019s 70th asked who designed the site. I said \u201cPearloom and me in half an hour.\u201d Jaws dropped.",
    name: 'Liam T.',
    event: 'Birthday \u00b7 July 2025',
  },
  {
    quote: 'We used it to announce our engagement and the proposal story The Loom crafted had our families in tears. Absolutely stunning.',
    name: 'Sofia & Marco',
    event: 'Engagement \u00b7 March 2026',
  },
  {
    quote: "Made a site for my dad\u2019s retirement party. His colleagues kept asking for the \u201cdesign agency\u201d behind it. It was just me and Pearloom.",
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
    <div className="bg-[var(--pl-cream)] min-h-dvh font-[family-name:var(--pl-font-body)] text-[var(--pl-ink)] overflow-x-hidden">

      {/* ══════════════ NAV ══════════════ */}
      <nav className="sticky top-0 z-[100] flex items-center justify-between px-[clamp(1.25rem,5vw,4rem)] h-16 bg-[color-mix(in_srgb,var(--pl-cream)_92%,transparent)] backdrop-blur-[12px] border-b border-[var(--pl-divider)]">
        <span className="font-[family-name:var(--pl-font-heading)] text-lg font-bold italic text-[var(--pl-ink)] tracking-[-0.01em]">
          Pearloom
        </span>

        {/* Desktop links */}
        <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 gap-10">
          {NAV_LINKS.map(label => (
            <a
              key={label}
              href={`#${label.toLowerCase().replace(/ /g, '-')}`}
              className="text-[0.88rem] font-medium text-[var(--pl-muted)] no-underline tracking-[0.02em] transition-colors duration-200 hover:text-[var(--pl-ink)]"
            >
              {label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="sm"
            onClick={handleSignIn}
            className="hidden sm:inline-flex"
          >
            Get Started
          </Button>

          <button
            className="md:hidden bg-transparent border-0 cursor-pointer p-1.5 text-[var(--pl-ink)] flex items-center justify-center"
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="md:hidden fixed inset-0 z-[998] bg-black/45 backdrop-blur-[4px]"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="md:hidden fixed top-0 right-0 bottom-0 w-[min(85vw,360px)] z-[999] bg-[var(--pl-cream)] backdrop-blur-[20px] shadow-[-8px_0_40px_rgba(26,26,26,0.12)] flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--pl-divider)]">
                <span className="font-[family-name:var(--pl-font-heading)] text-lg font-bold italic text-[var(--pl-ink)] tracking-[-0.01em]">
                  Pearloom
                </span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="bg-transparent border-0 cursor-pointer p-1.5 text-[var(--pl-muted)] flex items-center justify-center rounded-lg hover:text-[var(--pl-ink)] transition-colors duration-200"
                  aria-label="Close menu"
                >
                  <X size={22} />
                </button>
              </div>

              <div className="flex-1 p-5 flex flex-col gap-1 overflow-y-auto">
                {NAV_LINKS.map((label, i) => (
                  <motion.a
                    key={label}
                    href={`#${label.toLowerCase().replace(/ /g, '-')}`}
                    onClick={() => setMobileMenuOpen(false)}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 + i * 0.05 }}
                    className="text-[clamp(1.05rem,2.5vw,1.15rem)] font-semibold text-[var(--pl-ink-soft)] no-underline px-4 py-3.5 rounded-xl flex items-center justify-between transition-all duration-200 hover:bg-[var(--pl-olive-mist)] hover:text-[var(--pl-ink)]"
                  >
                    {label}
                    <ChevronRight size={16} className="opacity-35" />
                  </motion.a>
                ))}
              </div>

              <Separator />

              <div className="p-6">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.35 }}
                >
                  <Button
                    variant="accent"
                    size="lg"
                    className="w-full justify-center"
                    onClick={() => { setMobileMenuOpen(false); handleSignIn(); }}
                    icon={<Sparkles size={16} />}
                  >
                    Get Started Free
                    <ArrowRight size={16} />
                  </Button>
                  <p className="text-center mt-3 text-[0.78rem] text-[var(--pl-muted)] tracking-[0.03em]">
                    No credit card required
                  </p>
                </motion.div>
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
        className="bg-[var(--pl-cream-deep)] py-[clamp(3.5rem,7vw,7rem)] px-[clamp(1.25rem,5vw,4rem)] border-t border-b border-[var(--pl-divider)]"
      >
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={occasionInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8 }}
              className="mb-4 flex justify-center"
            >
              <Ornament />
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 18 }}
              animate={occasionInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="font-[family-name:var(--pl-font-heading)] text-[clamp(1.9rem,4vw,2.9rem)] font-bold text-[var(--pl-ink)] tracking-[-0.03em] leading-[1.15]"
            >
              Whatever you&rsquo;re celebrating
            </motion.h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {OCCASIONS.map((o, i) => (
              <motion.div
                key={o.label}
                custom={i}
                variants={up}
                initial="hidden"
                animate={occasionInView ? 'show' : 'hidden'}
                whileHover={{ y: -4 }}
                className="h-full"
              >
                <Card
                  variant="elevated"
                  padding="none"
                  className="p-8 h-full border-l-[3px] transition-all duration-300 hover:shadow-[0_6px_24px_rgba(43,30,20,0.12),0_2px_8px_rgba(43,30,20,0.07)]"
                  style={{ borderLeftColor: o.accent }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <OccasionIcon type={o.label} accent={o.accent} />
                    <span
                      className="text-[0.72rem] font-bold tracking-[0.14em] uppercase"
                      style={{ color: o.accent }}
                    >
                      {o.label}
                    </span>
                  </div>
                  <h3 className="font-[family-name:var(--pl-font-heading)] text-lg font-bold italic text-[var(--pl-ink)] mb-3 leading-[1.3]">
                    {o.tagline}
                  </h3>
                  <p className="text-[0.9rem] text-[var(--pl-muted)] leading-[1.8] m-0">
                    {o.desc}
                  </p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ TESTIMONIALS ══════════════ */}
      <section
        ref={testRef}
        className="bg-[var(--pl-cream)] py-[clamp(3.5rem,7vw,7rem)] px-5 border-t border-[var(--pl-divider)]"
      >
        <div className="max-w-[1200px] mx-auto">
          <SectionHeader
            eyebrow="Loved by real people"
            title="Stories from our community"
            inView={testInView}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={t.name}
                custom={i}
                variants={up}
                initial="hidden"
                animate={testInView ? 'show' : 'hidden'}
                className={cn('h-full', i === 0 && 'sm:col-span-2')}
              >
                <Card variant="flat" padding="none" className={cn('h-full', i === 0 ? 'p-10' : 'p-8')}>
                  <div className="font-[family-name:var(--pl-font-heading)] text-[4rem] leading-[0.7] text-[var(--pl-gold)] opacity-70 mb-4 italic">
                    &ldquo;
                  </div>
                  <blockquote className="font-[family-name:var(--pl-font-heading)] text-[clamp(1rem,1.6vw,1.12rem)] italic font-medium text-[var(--pl-ink-soft)] leading-[1.55] m-0 mb-5">
                    {t.quote}
                  </blockquote>
                  <Separator className="mb-4" />
                  <p className="text-[0.78rem] font-bold tracking-[0.1em] uppercase text-[var(--pl-muted)]">
                    {t.name} &middot; {t.event}
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

      {/* ══════════════ FINAL CTA ══════════════ */}
      <section
        ref={ctaRef}
        className="bg-[var(--pl-ink)] py-[clamp(4rem,8vw,9rem)] px-6 pb-[clamp(4.5rem,9vw,10rem)] text-center"
      >
        <div className="max-w-[600px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={ctaInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
          >
            <div className="flex justify-center mb-8">
              <div className="w-20 h-px bg-[var(--pl-gold)] opacity-50" />
            </div>
            <h2 className="font-[family-name:var(--pl-font-heading)] text-[clamp(2rem,5vw,3.25rem)] font-bold italic text-[var(--pl-cream)] tracking-[-0.035em] leading-[1.1] mb-5">
              Your moment is already beautiful.
              <br />
              <span className="text-[var(--pl-gold)]">Let&rsquo;s give it a home.</span>
            </h2>
            <p className="text-[clamp(0.95rem,1.8vw,1.1rem)] text-[var(--pl-dark-text)] leading-[1.8] max-w-[480px] mx-auto mb-12">
              Weddings, birthdays, anniversaries, reunions &mdash; whatever you&rsquo;re celebrating,
              Pearloom and The Loom make it unforgettable.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={ctaInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.25 }}
          >
            <Button
              variant="gold"
              size="xl"
              onClick={handleSignIn}
              disabled={status === 'loading'}
              className="bg-[var(--pl-gold)] text-[var(--pl-ink)] hover:bg-[#d4b87a] shadow-[0_4px_24px_rgba(196,169,106,0.4)] hover:shadow-[0_14px_50px_rgba(196,169,106,0.5)]"
            >
              Begin Your Story <ArrowRight size={17} strokeWidth={2.2} />
            </Button>
            <p className="mt-4 text-[0.82rem] text-[var(--pl-dark-text)] tracking-[0.04em]">
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
