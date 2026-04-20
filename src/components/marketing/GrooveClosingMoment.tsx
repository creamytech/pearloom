'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / marketing/GrooveClosingMoment.tsx
//
// The book-end. The 3D RipeningPear returns smaller, the page's
// final sentence sits under it, and one magnetic "Start your
// loom" CTA closes the story. Sets up the MarketingFooter below
// without an abrupt transition.
// ─────────────────────────────────────────────────────────────

import { ArrowRight } from 'lucide-react';
import {
  BlurFade,
  GrooveBlob,
  MagneticHover,
  RipeningPear,
  SquishyButton,
} from '@/components/brand/groove';

interface GrooveClosingMomentProps {
  onGetStarted: () => void;
}

export function GrooveClosingMoment({ onGetStarted }: GrooveClosingMomentProps) {
  return (
    <section
      style={{
        position: 'relative',
        padding: 'clamp(96px, 14vh, 180px) clamp(20px, 5vw, 64px)',
        background:
          'radial-gradient(ellipse at 50% 0%, color-mix(in oklab, var(--pl-groove-butter) 22%, var(--pl-groove-cream)) 0%, var(--pl-groove-cream) 70%)',
        textAlign: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Atmospheric blobs book-end the hero's atmosphere */}
      <GrooveBlob
        palette="sunrise"
        size={460}
        blur={80}
        opacity={0.36}
        style={{ position: 'absolute', top: '-100px', right: '-80px', zIndex: 0 }}
      />
      <GrooveBlob
        palette="orchard"
        size={320}
        blur={70}
        opacity={0.26}
        style={{ position: 'absolute', bottom: '-80px', left: '-60px', zIndex: 0 }}
      />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 820, margin: '0 auto' }}>
        <BlurFade>
          <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'center' }}>
            <RipeningPear size={220} scrollDriven={false} ripeness={0.72} />
          </div>
        </BlurFade>
        <BlurFade delay={0.1}>
          <div
            style={{
              fontFamily: 'var(--pl-font-body)',
              fontSize: '0.92rem',
              fontWeight: 500,
              color: 'var(--pl-groove-terra)',
              marginBottom: 14,
            }}
          >
            The loom is open
          </div>
        </BlurFade>
        <BlurFade delay={0.18}>
          <h2
            style={{
              margin: 0,
              fontFamily: 'var(--pl-font-body)',
              fontWeight: 700,
              fontSize: 'clamp(2.2rem, 5.6vw, 3.4rem)',
              lineHeight: 1.06,
              letterSpacing: '-0.025em',
              color: 'var(--pl-groove-ink)',
              maxWidth: '18ch',
              marginInline: 'auto',
            }}
          >
            Your celebration is a few answers away.
          </h2>
        </BlurFade>
        <BlurFade delay={0.26}>
          <p
            style={{
              margin: '22px auto 40px',
              maxWidth: '48ch',
              fontFamily: 'var(--pl-font-body)',
              fontSize: '1.08rem',
              lineHeight: 1.55,
              color: 'color-mix(in oklab, var(--pl-groove-ink) 70%, transparent)',
            }}
          >
            Three questions, a few photos, and the draft is yours.
            No card. Free forever on one site.
          </p>
        </BlurFade>

        <BlurFade delay={0.34}>
          <MagneticHover strength={0.28} radius={160}>
            <SquishyButton size="lg" onClick={onGetStarted} trailing={<ArrowRight size={18} />}>
              Start your loom
            </SquishyButton>
          </MagneticHover>
        </BlurFade>

        <BlurFade delay={0.42}>
          <p
            style={{
              marginTop: 18,
              fontFamily: 'var(--pl-font-body)',
              fontSize: '0.84rem',
              color: 'color-mix(in oklab, var(--pl-groove-ink) 56%, transparent)',
            }}
          >
            Free to start · No credit card · Your first site is yours to keep
          </p>
        </BlurFade>
      </div>
    </section>
  );
}
