'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / landing-page.tsx
//
// Exact implementation of the Pearloom Home design from the
// Claude Design handoff bundle. Section order matches the design's
// app.jsx verbatim:
//
//   Nav
//   Hero            (wedding/milestone/memorial preview switcher)
//   Marquee         (counter-rotating occasion orbit)
//   ThreeActs       (Compose/Conduct/Remember tabbed stage)
//   Occasions       (12 tilted cards with bespoke SVG glyphs)
//   Blocks          (26 click-to-preview blocks)
//   Director        (Pear-as-planner timeline)
//   Testimonials    (tilted sticky notes on dark slab)
//   Pricing         (3 tiers, Atelier featured)
//   FAQ             (plus-sign accordion)
//   Promise + CTA + Footer  (memorials-free + giant "Begin a
//                            thread" + massive pearloom wordmark)
//
// All sections live in components/marketing/design/. They use the
// design palette (PD constants) directly, so the look matches the
// prototype pixel-for-pixel instead of drifting toward product
// tokens.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { AuthModal } from '@/components/auth/AuthModal';
import { GrooveMotion } from '@/components/brand/groove';

import { DesignNav } from './marketing/design/DesignNav';
import { DesignHero } from './marketing/design/DesignHero';
import { OccasionOrbit } from './marketing/OccasionOrbit';
import { ThreeActsStage } from './marketing/design/ThreeActsStage';
import { DesignOccasions } from './marketing/design/DesignOccasions';
import { BlocksLibrary } from './marketing/BlocksLibrary';
import { DirectorTimeline } from './marketing/DirectorTimeline';
import { DesignTestimonials } from './marketing/design/DesignTestimonials';
import { DesignPricing } from './marketing/design/DesignPricing';
import { DesignFAQ } from './marketing/design/DesignFAQ';
import { DesignCTAFooter } from './marketing/design/DesignCTAFooter';

// Legacy props — the page wrapper passes NextAuth signIn handler +
// status through. The design is stateless so we only use them to
// prompt auth when a CTA is pressed.
interface LandingPageProps {
  handleSignIn: () => void;
  status: string;
}

export function LandingPage({ handleSignIn: _handleSignIn, status: _status }: LandingPageProps) {
  void _handleSignIn;
  void _status;
  const [showAuthModal, setShowAuthModal] = useState(false);
  const openAuth = () => setShowAuthModal(true);

  return (
    <GrooveMotion>
        <div
          className="min-h-dvh font-body"
          style={{
            background: '#F4ECD8',
            color: '#1F2418',
            overflowX: 'clip',
          }}
        >
          <DesignNav onGetStarted={openAuth} />
          <DesignHero onGetStarted={openAuth} />
          <OccasionOrbit />
          <ThreeActsStage />
          <DesignOccasions onGetStarted={openAuth} />
          <BlocksLibrary />
          <DirectorTimeline onGetStarted={openAuth} />
          <DesignTestimonials />
          <DesignPricing onGetStarted={openAuth} />
          <DesignFAQ />
          <DesignCTAFooter onGetStarted={openAuth} />

          <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
        </div>
      </GrooveMotion>
  );
}
