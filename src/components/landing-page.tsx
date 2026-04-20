'use client';

// ─────────────────────────────────────────────────────────────
// Landing page — groove master plan
// 8 content sections, nothing editorial:
//
//   1. GrooveHero          — 3D pear + magnetic CTAs
//   2. WeavingScrollSection — signature scroll-pinned weave demo
//   3. Occasions           — warm tiles for the 28 events
//   4. GrooveEventOS       — 3 pillars (Compose/Conduct/Remember)
//   5. TryItLive           — live names-to-cover playground
//   6. InteractiveFeatureGrid — hover-to-play feature tiles
//   7. GrooveProofPricing  — testimonial + trust + 3 tiers
//   8. GrooveSiteFaq + GrooveClosingMoment — FAQ + book-end pear
//
// The old editorial sections (Not-assembled dark slab, "The day
// is coming", stats band, separate Testimonials/Trust/Pricing,
// EditorShowcase, TheLoomShowcase, GuestExperience, ShowroomParallax,
// SiteShowroom) are all removed. 16 sections → 8.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { AuthModal } from '@/components/auth/AuthModal';

import { MarketingNav } from './marketing/MarketingNav';
import { GrooveHero } from './marketing/GrooveHero';
import { GrooveEventOS } from './marketing/GrooveEventOS';
import { WeavingScrollSection } from './marketing/WeavingScrollSection';
import { InteractiveFeatureGrid } from './marketing/InteractiveFeatureGrid';
import { GrooveProofPricing } from './marketing/GrooveProofPricing';
import { GrooveClosingMoment } from './marketing/GrooveClosingMoment';
import {
  GrooveMotion,
  TracingThread,
  Wave,
  GrooveBlob,
  BlurFade,
  MagneticHover,
  SquishyButton,
} from '@/components/brand/groove';
import { GrooveSiteFaq } from '@/components/site/groove/GrooveSiteFaq';
import { FAQS } from './marketing/FAQSection';
import { MarketingFooter } from './marketing/MarketingFooter';
import { Button } from '@/components/ui/button';

interface LandingPageProps {
  handleSignIn: () => void;
  status: string;
}

// ─── Occasions — warm groove tiles ────────────────────────────
const OCCASIONS = [
  { label: 'Weddings',           tagline: 'From first look to forever' },
  { label: 'Anniversaries',      tagline: 'Years together, still writing chapters' },
  { label: 'Birthdays',          tagline: 'Every year, a new page' },
  { label: 'Bachelor weekends',  tagline: 'The wild one, made editorial' },
  { label: 'Reunions',           tagline: 'The people you keep close' },
  { label: 'Memorials',          tagline: 'Gather. Remember. Together.' },
  { label: 'Showers',            tagline: 'Baby, bridal, sip-and-see' },
  { label: 'Retirements',        tagline: 'A full career, one love letter' },
];

// ─── Try-it-live playground (kept, already groove-styled) ─────
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
          className="flex-1 min-w-0 px-4 py-3 rounded-full border text-[max(16px,0.9rem)] outline-none transition-colors"
          style={{
            background: 'var(--pl-groove-cream)',
            color: 'var(--pl-groove-ink)',
            borderColor: 'color-mix(in oklab, var(--pl-groove-terra) 26%, transparent)',
            fontFamily: 'var(--pl-font-body)',
          }}
        />
        <input
          type="text"
          value={name2}
          onChange={(e) => setName2(e.target.value)}
          placeholder="Partner's name"
          className="flex-1 min-w-0 px-4 py-3 rounded-full border text-[max(16px,0.9rem)] outline-none transition-colors"
          style={{
            background: 'var(--pl-groove-cream)',
            color: 'var(--pl-groove-ink)',
            borderColor: 'color-mix(in oklab, var(--pl-groove-terra) 26%, transparent)',
            fontFamily: 'var(--pl-font-body)',
          }}
        />
      </div>

      <motion.div
        layout
        className="overflow-hidden mx-auto w-full max-w-[400px]"
        style={{
          background: 'var(--pl-groove-cream)',
          border: '1px solid color-mix(in oklab, var(--pl-groove-terra) 22%, transparent)',
          borderRadius: 28,
          boxShadow: '0 16px 48px rgba(139,74,106,0.14)',
        }}
      >
        <div
          style={{
            height: 170,
            background:
              'radial-gradient(ellipse at 30% 40%, color-mix(in oklab, var(--pl-groove-butter) 28%, transparent) 0%, transparent 65%)',
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
            style={{
              fontFamily: '"Fraunces", Georgia, serif',
              fontStyle: 'italic',
              fontSize: 'clamp(1.8rem, 4vw, 2.4rem)',
              color: 'var(--pl-groove-ink)',
              letterSpacing: '-0.02em',
              fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
              position: 'relative',
              zIndex: 1,
            }}
          >
            {display}
          </motion.h3>
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{ width: 28, height: 2, borderRadius: 999, background: 'var(--pl-groove-terra)', opacity: 0.7 }} />
            <span style={{
              fontFamily: 'var(--pl-font-body)',
              fontSize: '0.76rem',
              fontWeight: 600,
              color: 'var(--pl-groove-terra)',
            }}>
              Our story
            </span>
            <div style={{ flex: 1, height: 2, borderRadius: 999, background: 'color-mix(in oklab, var(--pl-groove-terra) 18%, transparent)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
            <div style={{ height: 8, borderRadius: 999, background: 'color-mix(in oklab, var(--pl-groove-terra) 14%, transparent)', width: '90%' }} />
            <div style={{ height: 8, borderRadius: 999, background: 'color-mix(in oklab, var(--pl-groove-terra) 10%, transparent)', width: '70%' }} />
            <div style={{ height: 8, borderRadius: 999, background: 'color-mix(in oklab, var(--pl-groove-terra) 10%, transparent)', width: '50%' }} />
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
export function LandingPage({ handleSignIn: _handleSignIn, status: _status }: LandingPageProps) {
  void _handleSignIn;
  void _status;
  const [showAuthModal, setShowAuthModal] = useState(false);
  const openAuth = () => setShowAuthModal(true);

  return (
    <GrooveMotion>
    <div
      className="min-h-dvh font-body overflow-x-hidden"
      style={{ background: 'var(--pl-groove-cream)', color: 'var(--pl-groove-ink)' }}
    >
      {/* ── Nav ───────────────────────────────────────────────── */}
      <MarketingNav onGetStarted={openAuth} />

      {/* ── Side threads ───────────────────────────────────────── */}
      <TracingThread side="left" />
      <TracingThread side="right" warp="var(--pl-groove-sage)" weft="var(--pl-groove-butter)" />

      {/* ── 1. Hero ───────────────────────────────────────────── */}
      <GrooveHero onGetStarted={openAuth} />

      <Wave color="color-mix(in oklab, var(--pl-groove-rose) 10%, var(--pl-groove-cream))" depth="medium" height={96} />

      {/* ── 2. Watch it weave — signature scroll-pinned moment ── */}
      <WeavingScrollSection />

      <Wave color="color-mix(in oklab, var(--pl-groove-butter) 14%, var(--pl-groove-cream))" depth="shallow" height={72} />

      {/* ── 3. Every occasion ─────────────────────────────────── */}
      <section
        id="occasions"
        style={{
          position: 'relative',
          background:
            'radial-gradient(ellipse at 50% 0%, color-mix(in oklab, var(--pl-groove-plum) 14%, var(--pl-groove-cream)) 0%, var(--pl-groove-cream) 65%)',
          padding: 'clamp(80px, 12vh, 140px) clamp(20px, 5vw, 64px)',
          overflow: 'hidden',
        }}
      >
        <GrooveBlob palette="petal" size={520} blur={90} opacity={0.35} style={{ position: 'absolute', top: '-140px', right: '-120px', zIndex: 0, pointerEvents: 'none' }} />
        <GrooveBlob palette="sunrise" size={420} blur={80} opacity={0.28} style={{ position: 'absolute', bottom: '-120px', left: '-100px', zIndex: 0, pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1180, margin: '0 auto' }}>
          <BlurFade>
            <div
              style={{
                fontFamily: 'var(--pl-font-body)',
                fontSize: '0.92rem',
                fontWeight: 500,
                color: 'var(--pl-groove-plum)',
                marginBottom: 14,
              }}
            >
              Every occasion
            </div>
          </BlurFade>
          <BlurFade delay={0.08}>
            <h2
              style={{
                margin: '0 0 48px',
                maxWidth: '20ch',
                fontFamily: 'var(--pl-font-body)',
                fontWeight: 700,
                fontSize: 'clamp(2rem, 4.8vw, 3rem)',
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
                color: 'var(--pl-groove-ink)',
              }}
            >
              Whatever you&rsquo;re celebrating, it has a home here.
            </h2>
          </BlurFade>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 14,
            }}
          >
            {OCCASIONS.map((o, i) => {
              const tones = ['sunrise', 'orchard', 'petal'] as const;
              const tintMap = {
                sunrise: 'var(--pl-groove-butter)',
                orchard: 'var(--pl-groove-sage)',
                petal:   'var(--pl-groove-rose)',
              } as const;
              const tone = tones[i % tones.length];
              const tint = tintMap[tone];
              return (
                <BlurFade key={o.label} delay={0.08 + i * 0.04}>
                  <a
                    href="#try"
                    style={{
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                      padding: 'clamp(20px, 2.6vw, 26px)',
                      background: `color-mix(in oklab, ${tint} 24%, var(--pl-groove-cream))`,
                      borderRadius: i % 2 === 0 ? 'var(--pl-groove-radius-blob)' : '28px',
                      border: `1px solid color-mix(in oklab, ${tint} 48%, transparent)`,
                      textDecoration: 'none',
                      color: 'var(--pl-groove-ink)',
                      transition:
                        'transform var(--pl-dur-base) var(--pl-groove-ease-bloom),' +
                        ' box-shadow var(--pl-dur-base) var(--pl-ease-out),' +
                        ' border-color var(--pl-dur-fast) var(--pl-ease-out)',
                      boxShadow: `0 2px 6px rgba(43,30,20,0.04), 0 14px 40px color-mix(in oklab, ${tint} 16%, transparent)`,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow =
                        '0 6px 14px rgba(43,30,20,0.06), 0 28px 56px color-mix(in oklab, ' + tint + ' 26%, transparent)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = '';
                      e.currentTarget.style.boxShadow =
                        '0 2px 6px rgba(43,30,20,0.04), 0 14px 40px color-mix(in oklab, ' + tint + ' 16%, transparent)';
                    }}
                  >
                    <div
                      style={{
                        fontFamily: 'var(--pl-font-body)',
                        fontSize: '1.12rem',
                        fontWeight: 700,
                        color: 'var(--pl-groove-ink)',
                        letterSpacing: '-0.015em',
                      }}
                    >
                      {o.label}
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '0.9rem',
                        lineHeight: 1.5,
                        color: 'color-mix(in oklab, var(--pl-groove-ink) 70%, transparent)',
                      }}
                    >
                      {o.tagline}
                    </p>
                    <ArrowRight size={16} style={{ color: 'var(--pl-groove-plum)', marginTop: 6, alignSelf: 'flex-start' }} />
                  </a>
                </BlurFade>
              );
            })}
          </div>
        </div>
      </section>

      <Wave color="var(--pl-groove-cream)" depth="medium" height={90} />

      {/* ── 4. Event OS — 3 pillars ───────────────────────────── */}
      <GrooveEventOS onGetStarted={openAuth} />

      <Wave color="color-mix(in oklab, var(--pl-groove-butter) 10%, var(--pl-groove-cream))" depth="shallow" height={72} />

      {/* ── 5. Try it live ────────────────────────────────────── */}
      <section
        id="try"
        style={{
          position: 'relative',
          padding: 'clamp(80px, 12vh, 140px) clamp(20px, 5vw, 64px)',
          background: 'color-mix(in oklab, var(--pl-groove-butter) 10%, var(--pl-groove-cream))',
          overflow: 'hidden',
        }}
      >
        <GrooveBlob palette="sunrise" size={420} blur={80} opacity={0.28} style={{ position: 'absolute', top: '-80px', right: '-100px', zIndex: 0, pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          <BlurFade>
            <div
              style={{
                marginBottom: 14,
                fontFamily: 'var(--pl-font-body)',
                fontSize: '0.92rem',
                fontWeight: 500,
                color: 'var(--pl-groove-terra)',
              }}
            >
              Try it · no signup
            </div>
          </BlurFade>
          <BlurFade delay={0.08}>
            <h2
              style={{
                margin: '0 0 14px',
                fontFamily: 'var(--pl-font-body)',
                fontWeight: 700,
                fontSize: 'clamp(2rem, 4.5vw, 2.8rem)',
                color: 'var(--pl-groove-ink)',
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
              }}
            >
              Type your names. Watch the cover come alive.
            </h2>
          </BlurFade>
          <BlurFade delay={0.16}>
            <p
              style={{
                color: 'color-mix(in oklab, var(--pl-groove-ink) 70%, transparent)',
                fontSize: '1.04rem',
                maxWidth: 480,
                margin: '0 auto 36px',
                lineHeight: 1.55,
              }}
            >
              A tiny cover-builder. The real one has hundreds of compositions,
              swappable typography, and a Pear assistant whispering ideas.
            </p>
          </BlurFade>
          <BlurFade delay={0.24}>
            <TryItLivePlayground onGetStarted={openAuth} />
          </BlurFade>
        </div>
      </section>

      <Wave color="var(--pl-groove-cream)" depth="medium" height={90} />

      {/* ── 6. Interactive feature grid ───────────────────────── */}
      <InteractiveFeatureGrid />

      <Wave color="color-mix(in oklab, var(--pl-groove-rose) 8%, var(--pl-groove-cream))" depth="deep" height={100} />

      {/* ── 7. Proof + pricing — merged ───────────────────────── */}
      <GrooveProofPricing onGetStarted={openAuth} />

      <Wave color="var(--pl-groove-cream)" depth="medium" height={84} />

      {/* ── 8. FAQ ────────────────────────────────────────────── */}
      <GrooveSiteFaq
        items={FAQS.map((f) => ({ question: f.q, answer: f.a }))}
        title="Good questions"
        accent="var(--pl-groove-terra)"
        foreground="var(--pl-groove-ink)"
        background="var(--pl-groove-cream)"
        muted="color-mix(in oklab, var(--pl-groove-ink) 70%, transparent)"
        headingFont="Fraunces"
        bodyFont="Geist"
      />

      <Wave color="color-mix(in oklab, var(--pl-groove-butter) 14%, var(--pl-groove-cream))" depth="shallow" height={72} />

      {/* ── 9. Closing book-end ───────────────────────────────── */}
      <GrooveClosingMoment onGetStarted={openAuth} />

      <Wave color="color-mix(in oklab, var(--pl-groove-plum) 14%, var(--pl-groove-cream))" depth="deep" height={110} />
      <MarketingFooter />

      {/* ── Auth modal ─────────────────────────────────────────── */}
      <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
    </GrooveMotion>
  );
}
// Unused utilities from older versions — suppress to keep the
// diff focused while the rewrite settles.
void MagneticHover;
void SquishyButton;
