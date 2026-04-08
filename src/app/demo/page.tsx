'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / app/demo/page.tsx — Showcase Example Site
// A fully realistic wedding site demonstrating every feature
// the generator can produce. Uses real components and a
// complete manifest — exactly what a user would create.
// ─────────────────────────────────────────────────────────────

import { Hero } from '@/components/hero';
import { Timeline } from '@/components/timeline';
import { WeddingEvents } from '@/components/wedding-events';
import { PublicRsvpSection } from '@/components/public-rsvp-section';
import { RegistryShowcase } from '@/components/registry-showcase';
import { TravelSection } from '@/components/travel-section';
import { FaqSection } from '@/components/faq-section';
import { ThemeProvider } from '@/components/theme-provider';
import { SiteNav } from '@/components/site-nav';
import { SiteFooter } from '@/components/site-footer';
import { WaveDivider } from '@/components/vibe/WaveDivider';
import { deriveVibeSkin } from '@/lib/vibe-engine';
import type {
  Chapter, ThemeSchema, SitePage, WeddingEvent, FaqItem,
} from '@/types';

// ─── Names & Vibe ───
const NAMES: [string, string] = ['Jessica', 'Thomas'];
const VIBE = 'romantic garden soft natural golden sage green intimate editorial';

const VIBE_SKIN = deriveVibeSkin(VIBE);
const PAL = VIBE_SKIN.palette;

// ─── Pages ───
const PAGES: SitePage[] = [
  { id: 'pg-1', slug: 'our-story',  label: 'Our Story',  enabled: true, order: 0 },
  { id: 'pg-2', slug: 'schedule',   label: 'Schedule',    enabled: true, order: 1 },
  { id: 'pg-3', slug: 'rsvp',       label: 'RSVP',        enabled: true, order: 2 },
  { id: 'pg-4', slug: 'registry',   label: 'Registry',    enabled: true, order: 3 },
  { id: 'pg-5', slug: 'travel',     label: 'Travel',      enabled: true, order: 4 },
  { id: 'pg-6', slug: 'faq',        label: 'FAQ',          enabled: true, order: 5 },
];

// ─── Theme ───
const THEME: ThemeSchema = {
  name: 'demo-garden',
  fonts: { heading: VIBE_SKIN.fonts.heading, body: VIBE_SKIN.fonts.body },
  colors: {
    background: PAL.background,
    foreground: PAL.foreground,
    accent: PAL.accent,
    accentLight: PAL.accent2,
    muted: PAL.muted,
    cardBg: PAL.card,
  },
  borderRadius: '1rem',
};

// ─── Chapters ───
const CHAPTERS: Chapter[] = [
  {
    id: 'ch-1', date: '2021-09-12', order: 0,
    title: 'Where It All Began',
    subtitle: 'The First Hello',
    description: 'A mutual friend\'s birthday party in Brooklyn. You were telling a story about getting lost in Tokyo and I couldn\'t stop listening. By the end of the night, I knew I\'d remember this one.',
    images: [{ id: 'img-1', url: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?q=80&w=1200&auto=format&fit=crop', alt: 'First meeting', width: 1200, height: 800 }],
    location: { lat: 40.6782, lng: -73.9442, label: 'Brooklyn, NY' },
    mood: 'Butterflies',
    layout: 'editorial',
  },
  {
    id: 'ch-2', date: '2022-03-20', order: 1,
    title: 'First Trip Together',
    subtitle: 'The Amalfi Coast',
    description: 'Ten days in Italy. We got lost in Positano, ate too much pasta, and watched the sun set over the Mediterranean from a cliffside restaurant. You held my hand the entire drive back.',
    images: [{ id: 'img-2', url: 'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?q=80&w=1200&auto=format&fit=crop', alt: 'Italy trip', width: 1200, height: 800 }],
    location: { lat: 40.6333, lng: 14.6029, label: 'Positano, Italy' },
    mood: 'Adventure',
    layout: 'cinematic',
  },
  {
    id: 'ch-3', date: '2022-11-15', order: 2,
    title: 'Moving In Together',
    subtitle: 'Home Is Wherever You Are',
    description: 'A studio apartment in the West Village that was way too small for two people and absolutely perfect. Sunday mornings with coffee and the crossword became our religion.',
    images: [{ id: 'img-3', url: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?q=80&w=1200&auto=format&fit=crop', alt: 'Moving in together', width: 1200, height: 800 }],
    location: { lat: 40.7336, lng: -74.0027, label: 'West Village, NYC' },
    mood: 'Cozy',
    layout: 'split',
  },
  {
    id: 'ch-4', date: '2024-06-14', order: 3,
    title: 'The Proposal',
    subtitle: 'She Said Yes',
    description: 'Central Park at golden hour. I had the ring in my pocket for three weeks waiting for the perfect moment. When you turned around and saw me on one knee, you laughed and cried at the same time. I\'ll never forget that sound.',
    images: [{ id: 'img-4', url: 'https://images.unsplash.com/photo-1583008911326-fde557761043?q=80&w=1200&auto=format&fit=crop', alt: 'The proposal', width: 1200, height: 800 }],
    location: { lat: 40.7829, lng: -73.9654, label: 'Central Park, NYC' },
    mood: 'Euphoric',
    layout: 'fullbleed',
    isEmotionalPeak: true,
    emotionalIntensity: 10,
  },
  {
    id: 'ch-5', date: '2026-10-10', order: 4,
    title: 'The Wedding',
    subtitle: 'Forever Starts Here',
    description: 'And now, surrounded by everyone we love, we begin the next chapter. Not because the story needed it — but because we can\'t imagine writing it any other way.',
    images: [{ id: 'img-5', url: 'https://images.unsplash.com/photo-1509557965875-b88c97052f0e?q=80&w=1200&auto=format&fit=crop', alt: 'Wedding day', width: 1200, height: 800 }],
    location: { lat: 40.7484, lng: -73.9856, label: 'The Foundry, Long Island City' },
    mood: 'Celebration',
    layout: 'cinematic',
    isEmotionalPeak: true,
    emotionalIntensity: 10,
  },
];

// ─── Events ───
const EVENTS: WeddingEvent[] = [
  {
    id: 'evt-1',
    name: 'Ceremony',
    type: 'ceremony',
    date: '2026-10-10',
    time: '4:00 PM',
    endTime: '4:45 PM',
    venue: 'The Foundry Garden',
    address: '42-38 9th Street, Long Island City, NY 11101',
    dressCode: 'Black Tie Optional',
    description: 'An outdoor garden ceremony surrounded by autumn foliage.',
  },
  {
    id: 'evt-2',
    name: 'Cocktail Hour',
    type: 'reception',
    date: '2026-10-10',
    time: '5:00 PM',
    endTime: '6:00 PM',
    venue: 'The Foundry Courtyard',
    address: '42-38 9th Street, Long Island City, NY 11101',
    description: 'Craft cocktails, passed hors d\'oeuvres, and live jazz.',
  },
  {
    id: 'evt-3',
    name: 'Reception & Dinner',
    type: 'reception',
    date: '2026-10-10',
    time: '6:00 PM',
    endTime: '11:00 PM',
    venue: 'The Foundry Main Hall',
    address: '42-38 9th Street, Long Island City, NY 11101',
    description: 'Dinner, dancing, and speeches. Open bar all night.',
    dressCode: 'Black Tie Optional',
  },
];

// ─── Registry ───
const REGISTRY = {
  enabled: true,
  cashFundUrl: 'https://venmo.com/jessica-thomas',
  cashFundMessage: 'Your presence is the greatest gift. If you\'d like to contribute to our honeymoon fund, we\'d be incredibly grateful.',
  entries: [
    { name: 'Williams-Sonoma', url: 'https://williams-sonoma.com', note: 'Kitchen & home essentials' },
    { name: 'Crate & Barrel', url: 'https://crateandbarrel.com', note: 'Furniture & decor' },
    { name: 'REI', url: 'https://rei.com', note: 'For our next adventure together' },
  ],
};

// ─── Travel ───
const TRAVEL = {
  airports: ['JFK', 'LGA', 'EWR'],
  hotels: [
    { name: 'The William Vale', address: '111 N 12th St, Brooklyn, NY 11249', bookingUrl: 'https://thewilliamvale.com', groupRate: '15% off with code JESSTHOM26', notes: 'Our top pick — rooftop views of Manhattan' },
    { name: 'Paper Factory Hotel', address: '37-06 36th St, Long Island City, NY 11101', bookingUrl: 'https://paperfactoryhotel.com', notes: '5-minute walk to the venue' },
    { name: 'The Hoxton Williamsburg', address: '97 Wythe Ave, Brooklyn, NY 11249', bookingUrl: 'https://thehoxton.com', notes: 'Boutique charm in Williamsburg' },
  ],
  parkingInfo: 'Street parking is available on 9th Street. The nearest garage is LAZ Parking at 43-25 Hunter St ($25 flat rate for events).',
  directions: 'The Foundry is a 10-minute taxi from Midtown Manhattan. Take the 7 train to Vernon Blvd–Jackson Ave, then walk 5 minutes.',
};

// ─── FAQs ───
const FAQS: FaqItem[] = [
  { id: 'faq-1', question: 'What is the dress code?', answer: 'Black tie optional. Think elegant cocktail — suits, gowns, or your best "I look amazing" outfit. The ceremony is outdoors in a garden, so consider comfortable shoes for grass.', order: 0 },
  { id: 'faq-2', question: 'Can I bring a plus-one?', answer: 'If your invitation includes "and guest," absolutely! Due to venue capacity, we can only accommodate guests who are specifically named on the invitation.', order: 1 },
  { id: 'faq-3', question: 'Is there parking?', answer: 'Street parking is available on 9th Street. The nearest parking garage is LAZ Parking at 43-25 Hunter St ($25 flat rate). We recommend ride-sharing for the easiest experience.', order: 2 },
  { id: 'faq-4', question: 'Are kids welcome?', answer: 'We love your little ones! However, this will be an adults-only celebration. We hope this gives you a chance to enjoy a night out.', order: 3 },
  { id: 'faq-5', question: 'What happens if it rains?', answer: 'The Foundry has a beautiful indoor space that we\'ll move the ceremony into if weather doesn\'t cooperate. The reception is indoors regardless. No umbrellas needed!', order: 4 },
  { id: 'faq-6', question: 'When is the RSVP deadline?', answer: 'Please RSVP by September 1st, 2026 so we can finalize catering and seating. You can RSVP right here on the site!', order: 5 },
  { id: 'faq-7', question: 'Will there be food options for dietary restrictions?', answer: 'Yes! Our caterer can accommodate vegetarian, vegan, gluten-free, and most allergy needs. Please note any dietary requirements when you RSVP.', order: 6 },
  { id: 'faq-8', question: 'Can I take photos during the ceremony?', answer: 'We kindly ask for an unplugged ceremony — please put phones away during the vows. Our photographer will capture everything! After the ceremony, snap away.', order: 7 },
];

// ─── Derived ───
const bgColor = PAL.background;
const cardBg = PAL.card;

export default function DemoPage() {
  return (
    <ThemeProvider theme={THEME}>
      <SiteNav names={NAMES} pages={PAGES} />

      <main style={{ minHeight: '100dvh', background: bgColor }}>
        {/* Hero */}
        <Hero
          names={NAMES}
          subtitle="Five years of laughter, love, and a lifetime to go."
          coverPhoto="https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=2000&auto=format&fit=crop"
          weddingDate="2026-10-10"
          vibeSkin={VIBE_SKIN}
          heroTagline="captured in your warmest light"
        />

        <WaveDivider skin={VIBE_SKIN} fromColor={bgColor} toColor={bgColor} height={70} />

        {/* Story */}
        <section id="our-story">
          <Timeline chapters={CHAPTERS} layoutFormat="cascade" />
        </section>

        <WaveDivider skin={VIBE_SKIN} fromColor={bgColor} toColor={bgColor} height={70} />

        {/* Countdown placeholder */}
        <section id="countdown" style={{ padding: '4rem 2rem', textAlign: 'center', background: cardBg }}>
          <div style={{ fontFamily: `"${VIBE_SKIN.fonts.heading}", serif`, fontSize: 'clamp(1.4rem, 3vw, 2rem)', color: PAL.foreground }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: PAL.accent, marginBottom: '0.75rem' }}>
              October 10, 2026
            </div>
            The Countdown Has Begun
          </div>
        </section>

        <WaveDivider skin={VIBE_SKIN} fromColor={cardBg} toColor={bgColor} height={60} />

        {/* Events */}
        <section id="schedule" style={{ position: 'relative', overflow: 'hidden' }}>
          <WeddingEvents events={EVENTS} title={VIBE_SKIN.sectionLabels?.events || 'The Celebration'} />
        </section>

        <WaveDivider skin={VIBE_SKIN} fromColor={bgColor} toColor={bgColor} height={60} />

        {/* RSVP */}
        <section id="rsvp">
          <PublicRsvpSection siteId="demo" events={EVENTS} deadline="2026-09-01" />
        </section>

        <WaveDivider skin={VIBE_SKIN} fromColor={bgColor} toColor={bgColor} height={60} />

        {/* Registry */}
        <section id="registry">
          <RegistryShowcase
            registries={REGISTRY.entries}
            cashFundUrl={REGISTRY.cashFundUrl}
            cashFundMessage={REGISTRY.cashFundMessage}
            title="Gift Guide"
          />
        </section>

        <WaveDivider skin={VIBE_SKIN} fromColor={bgColor} toColor={bgColor} height={60} />

        {/* Travel */}
        <section id="travel">
          <TravelSection info={TRAVEL} />
        </section>

        <WaveDivider skin={VIBE_SKIN} fromColor={bgColor} toColor={bgColor} height={60} />

        {/* FAQ */}
        <section id="faq">
          <FaqSection faqs={FAQS} />
        </section>

        {/* Guestbook placeholder */}
        <section style={{ padding: '4rem 2rem', maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontFamily: `"${VIBE_SKIN.fonts.heading}", serif`, fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', color: PAL.foreground, marginBottom: '1rem' }}>
            Leave Your Wishes
          </h2>
          <p style={{ color: PAL.muted, fontSize: '0.95rem', marginBottom: '2rem' }}>
            Share your love and well wishes for the happy couple.
          </p>
          <div style={{ padding: '2rem', borderRadius: '1rem', background: `${cardBg}80`, border: `1px solid ${PAL.accent}20` }}>
            <p style={{ color: PAL.muted, fontStyle: 'italic' }}>
              Guestbook messages will appear here after guests leave their wishes.
            </p>
          </div>
        </section>

        {/* Photos */}
        <section style={{ padding: '4rem 2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <h2 style={{ fontFamily: `"${VIBE_SKIN.fonts.heading}", serif`, fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', fontWeight: 600, color: PAL.foreground, marginBottom: '0.5rem' }}>
              Our Photos
            </h2>
            <div style={{ width: '40px', height: '2px', background: PAL.accent, margin: '0 auto', opacity: 0.5 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px', maxWidth: '960px', margin: '0 auto' }}>
            {CHAPTERS.flatMap(ch => ch.images || []).map((img, i) => (
              <div key={i} style={{ aspectRatio: i === 0 ? '2/1' : '1', gridColumn: i === 0 ? 'span 2' : undefined, borderRadius: '10px', overflow: 'hidden' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.alt || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </div>
            ))}
          </div>
        </section>

        {/* Quote / Footer sentiment */}
        <section style={{ padding: '5rem 2rem', textAlign: 'center', maxWidth: '700px', margin: '0 auto' }}>
          <div style={{ fontSize: '2rem', color: PAL.accent, opacity: 0.4, marginBottom: '1rem' }}>
            {VIBE_SKIN.accentSymbol || '✦'}
          </div>
          <p style={{
            fontFamily: `"${VIBE_SKIN.fonts.heading}", serif`,
            fontSize: 'clamp(1.3rem, 3vw, 2rem)',
            fontWeight: 400, fontStyle: 'italic', lineHeight: 1.65,
            color: PAL.foreground, opacity: 0.75,
          }}>
            &ldquo;Love recognizes no barriers. It jumps hurdles, leaps fences, penetrates walls to arrive at its destination full of hope.&rdquo;
          </p>
          <p style={{ fontSize: '0.78rem', color: PAL.muted, marginTop: '1rem', fontWeight: 600 }}>
            — Maya Angelou
          </p>
        </section>
      </main>

      <SiteFooter names={NAMES} />
    </ThemeProvider>
  );
}
