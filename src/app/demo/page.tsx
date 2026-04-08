'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / app/demo/page.tsx — Showcase Example Site
// A Santorini destination wedding — Mediterranean blues, golden
// light, whitewashed architecture. Every section the generator
// can produce, rendered with real components.
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
const NAMES: [string, string] = ['Elena', 'Marco'];
const VIBE = 'mediterranean coastal blue white gold sunset intimate elegant greek island';

const VIBE_SKIN = deriveVibeSkin(VIBE);

// Override palette for a true Santorini feel
const PAL = {
  ...VIBE_SKIN.palette,
  background: '#F8F6F1',
  foreground: '#1A2430',
  accent: '#2E6B8A',
  accent2: '#D4A862',
  card: '#FFFFFF',
  muted: '#7A8C98',
  ink: '#0D1820',
  highlight: '#1A4A6A',
  subtle: '#F2F0EB',
};

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
  name: 'santorini-blue',
  fonts: { heading: 'Cormorant Garamond', body: 'Lora' },
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

// Override vibeSkin with Santorini palette
const SKIN = {
  ...VIBE_SKIN,
  palette: PAL,
  fonts: { heading: 'Cormorant Garamond', body: 'Lora' },
  accentSymbol: '◆',
  sectionLabels: {
    story: 'Our Journey',
    events: 'The Celebration',
    rsvp: 'Will You Join Us?',
    registry: 'Gift Guide',
    travel: 'Getting to Santorini',
    faqs: 'Questions & Answers',
    photos: 'Our Photos',
  },
};

// ─── Chapters ───
const CHAPTERS: Chapter[] = [
  {
    id: 'ch-1', date: '2020-06-15', order: 0,
    title: 'A Summer in Florence',
    subtitle: 'The First Glance',
    description: 'I was studying abroad. He was sketching in the Boboli Gardens. He asked if I could move — I was standing in his light. I told him I was the light. He laughed, and somewhere between that laugh and our first espresso, I knew.',
    images: [{ id: 'img-1', url: 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?q=80&w=1200&auto=format&fit=crop', alt: 'Florence Italy', width: 1200, height: 800 }],
    location: { lat: 43.7696, lng: 11.2558, label: 'Florence, Italy' },
    mood: 'Serendipity',
    layout: 'editorial',
  },
  {
    id: 'ch-2', date: '2021-09-02', order: 1,
    title: 'Long Distance',
    subtitle: 'New York to Milan',
    description: 'Six thousand miles and a seven-hour time difference. We learned that love isn\'t about being in the same room — it\'s about being in the same story. FaceTime at 2 AM became my favorite part of the day.',
    images: [{ id: 'img-2', url: 'https://images.unsplash.com/photo-1534430480872-3498386e7856?q=80&w=1200&auto=format&fit=crop', alt: 'Long distance love', width: 1200, height: 800 }],
    location: { lat: 40.7128, lng: -74.0060, label: 'New York City' },
    mood: 'Longing',
    layout: 'split',
  },
  {
    id: 'ch-3', date: '2022-05-20', order: 2,
    title: 'Closing the Distance',
    subtitle: 'One City, One Life',
    description: 'Marco moved to New York. Our first apartment was tiny, the radiator was loud, and we\'d never been happier. Sunday mornings at the corner café, walks through the Village, cooking together every night.',
    images: [{ id: 'img-3', url: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?q=80&w=1200&auto=format&fit=crop', alt: 'Together in NYC', width: 1200, height: 800 }],
    location: { lat: 40.7336, lng: -74.0027, label: 'West Village, NYC' },
    mood: 'Home',
    layout: 'cinematic',
  },
  {
    id: 'ch-4', date: '2024-08-18', order: 3,
    title: 'The Proposal',
    subtitle: 'Under the Tuscan Sun',
    description: 'He took me back to Florence — to the exact bench in the Boboli Gardens where we met. This time, he wasn\'t sketching. He was kneeling. Through my tears I managed one word: yes.',
    images: [{ id: 'img-4', url: 'https://images.unsplash.com/photo-1583008911326-fde557761043?q=80&w=1200&auto=format&fit=crop', alt: 'The proposal', width: 1200, height: 800 }],
    location: { lat: 43.7621, lng: 11.2480, label: 'Boboli Gardens, Florence' },
    mood: 'Euphoric',
    layout: 'fullbleed',
    isEmotionalPeak: true,
    emotionalIntensity: 10,
  },
  {
    id: 'ch-5', date: '2026-09-19', order: 4,
    title: 'Santorini',
    subtitle: 'Where Forever Begins',
    description: 'And so we return to the Mediterranean — where our story began. Surrounded by the Aegean Sea, whitewashed walls, and everyone we love, we say the words we\'ve been living for years.',
    images: [{ id: 'img-5', url: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?q=80&w=1200&auto=format&fit=crop', alt: 'Santorini sunset', width: 1200, height: 800 }],
    location: { lat: 36.3932, lng: 25.4615, label: 'Oia, Santorini' },
    mood: 'Forever',
    layout: 'cinematic',
    isEmotionalPeak: true,
    emotionalIntensity: 10,
  },
];

// ─── Events ───
const EVENTS: WeddingEvent[] = [
  {
    id: 'evt-1',
    name: 'Welcome Drinks',
    type: 'welcome-party',
    date: '2026-09-18',
    time: '7:00 PM',
    endTime: '10:00 PM',
    venue: 'Santo Wines Winery',
    address: 'Pyrgos Kallistis, Santorini 847 00, Greece',
    description: 'An evening of Greek wine and sunset views over the caldera. Casual dress — sandals welcome.',
    dressCode: 'Resort Casual',
  },
  {
    id: 'evt-2',
    name: 'Ceremony',
    type: 'ceremony',
    date: '2026-09-19',
    time: '5:30 PM',
    endTime: '6:15 PM',
    venue: 'Le Ciel Terrace',
    address: 'Oia, Santorini 847 02, Greece',
    description: 'An intimate cliff-side ceremony as the sun sets over the Aegean. The caldera will be our altar.',
    dressCode: 'Black Tie Optional',
  },
  {
    id: 'evt-3',
    name: 'Reception & Dinner',
    type: 'reception',
    date: '2026-09-19',
    time: '7:00 PM',
    endTime: '1:00 AM',
    venue: 'Le Ciel Restaurant',
    address: 'Oia, Santorini 847 02, Greece',
    description: 'Mediterranean feast under the stars. Open bar, dancing, and speeches. Wear your dancing shoes.',
    dressCode: 'Black Tie Optional',
  },
];

// ─── Registry ───
const REGISTRY = {
  enabled: true,
  cashFundUrl: 'https://venmo.com/elena-marco',
  cashFundMessage: 'Your presence in Santorini is the greatest gift we could ask for. If you\'d like to contribute to our new home together, we\'d be deeply grateful.',
  entries: [
    { name: 'Zola Registry', url: 'https://zola.com', note: 'Home essentials for our new apartment' },
    { name: 'Honeyfund', url: 'https://honeyfund.com', note: 'Help us extend our Greek island honeymoon' },
  ],
};

// ─── Travel ───
const TRAVEL = {
  airports: ['JTR (Santorini)', 'ATH (Athens)'],
  hotels: [
    { name: 'Canaves Oia Suites', address: 'Main Street, Oia, Santorini 847 02', bookingUrl: 'https://canaves.com', groupRate: '15% off with code ELENAMARCO', notes: 'Our top recommendation — infinity pool overlooking the caldera' },
    { name: 'Katikies Hotel', address: 'Oia, Santorini 847 02', bookingUrl: 'https://katikies.com', notes: 'Boutique luxury with cave suites carved into the cliffs' },
    { name: 'Andronis Luxury Suites', address: 'Oia, Santorini 847 02', bookingUrl: 'https://andronis.com', notes: 'Budget-friendly option with stunning views' },
  ],
  parkingInfo: 'Most Oia hotels offer shuttle service from Santorini airport (JTR). Rental cars are available but parking in Oia is very limited.',
  directions: 'Fly to Santorini (JTR) directly from Athens (45 min) or take the Blue Star ferry from Piraeus port (5 hours, but scenic). From the airport, Oia is a 25-minute drive north.',
};

// ─── FAQs ───
const FAQS: FaqItem[] = [
  { id: 'faq-1', question: 'Do I need a passport to attend?', answer: 'Yes! Santorini is in Greece, so you\'ll need a valid passport. EU citizens can travel with their national ID card. US citizens don\'t need a visa for stays under 90 days.', order: 0 },
  { id: 'faq-2', question: 'What should I wear?', answer: 'Black tie optional for the ceremony and reception. For the welcome drinks, resort casual is perfect — think linen, light colors, and comfortable shoes. Santorini is warm in September (75-80°F / 24-27°C).', order: 1 },
  { id: 'faq-3', question: 'How do I get to Santorini?', answer: 'Fly to Athens (ATH), then take a short 45-minute flight to Santorini (JTR). Many European cities have direct flights to Santorini in summer. We recommend booking flights early as September is peak season.', order: 2 },
  { id: 'faq-4', question: 'Are kids welcome?', answer: 'We love your little ones! However, the ceremony and reception venues have cliff-side terraces, so for safety this will be an adults-only celebration. We hope you enjoy a well-deserved getaway!', order: 3 },
  { id: 'faq-5', question: 'What if I can\'t make it to Santorini?', answer: 'We completely understand — it\'s a big trip! We\'ll be hosting a casual celebration back in New York in November for those who can\'t travel. Details to follow.', order: 4 },
  { id: 'faq-6', question: 'What currency do they use in Greece?', answer: 'Greece uses the Euro (€). Credit cards are widely accepted in Oia, but it\'s good to have some cash for small shops and taxis. ATMs are available in Fira and Oia.', order: 5 },
  { id: 'faq-7', question: 'When should I arrive and depart?', answer: 'We recommend arriving by September 18th (the day of welcome drinks) and departing September 21st or later. Take some extra days to explore the island — you won\'t regret it!', order: 6 },
  { id: 'faq-8', question: 'Will there be a photographer?', answer: 'Yes! We have a photographer and videographer for the full weekend. We\'ll share a gallery link after the wedding. Please keep phones away during the ceremony.', order: 7 },
];

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
          subtitle="From Florence to forever — a love story written across the Mediterranean."
          coverPhoto="https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?q=80&w=2000&auto=format&fit=crop"
          weddingDate="2026-09-19"
          vibeSkin={SKIN}
          heroTagline="where the Aegean meets forever"
        />

        <WaveDivider skin={SKIN} fromColor={bgColor} toColor={bgColor} height={70} />

        {/* Story */}
        <section id="our-story">
          <Timeline chapters={CHAPTERS} layoutFormat="cascade" />
        </section>

        <WaveDivider skin={SKIN} fromColor={bgColor} toColor={bgColor} height={70} />

        {/* Countdown */}
        <section id="countdown" style={{ padding: '4rem 2rem', textAlign: 'center', background: cardBg }}>
          <div style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 'clamp(1.4rem, 3vw, 2rem)', color: PAL.foreground }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: PAL.accent, marginBottom: '0.75rem' }}>
              September 19, 2026 · Oia, Santorini
            </div>
            The Countdown Has Begun
          </div>
        </section>

        <WaveDivider skin={SKIN} fromColor={cardBg} toColor={bgColor} height={60} />

        {/* Events */}
        <section id="schedule" style={{ position: 'relative', overflow: 'hidden' }}>
          <WeddingEvents events={EVENTS} title="The Celebration" />
        </section>

        <WaveDivider skin={SKIN} fromColor={bgColor} toColor={bgColor} height={60} />

        {/* RSVP */}
        <section id="rsvp">
          <PublicRsvpSection siteId="demo" events={EVENTS} deadline="2026-08-01" />
        </section>

        <WaveDivider skin={SKIN} fromColor={bgColor} toColor={bgColor} height={60} />

        {/* Registry */}
        <section id="registry">
          <RegistryShowcase
            registries={REGISTRY.entries}
            cashFundUrl={REGISTRY.cashFundUrl}
            cashFundMessage={REGISTRY.cashFundMessage}
            title="Gift Guide"
          />
        </section>

        <WaveDivider skin={SKIN} fromColor={bgColor} toColor={bgColor} height={60} />

        {/* Travel */}
        <section id="travel">
          <TravelSection info={TRAVEL} />
        </section>

        <WaveDivider skin={SKIN} fromColor={bgColor} toColor={bgColor} height={60} />

        {/* FAQ */}
        <section id="faq">
          <FaqSection faqs={FAQS} />
        </section>

        {/* Guestbook */}
        <section style={{ padding: '4rem 2rem', maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', color: PAL.foreground, marginBottom: '1rem' }}>
            Leave Your Wishes
          </h2>
          <p style={{ color: PAL.muted, fontSize: '0.95rem', marginBottom: '2rem' }}>
            Share your love and well wishes for Elena & Marco.
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
            <h2 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', fontWeight: 600, color: PAL.foreground, marginBottom: '0.5rem' }}>
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

        {/* Closing quote */}
        <section style={{ padding: '5rem 2rem', textAlign: 'center', maxWidth: '700px', margin: '0 auto' }}>
          <div style={{ fontSize: '2rem', color: PAL.accent, opacity: 0.4, marginBottom: '1rem' }}>
            ◆
          </div>
          <p style={{
            fontFamily: '"Cormorant Garamond", serif',
            fontSize: 'clamp(1.3rem, 3vw, 2rem)',
            fontWeight: 400, fontStyle: 'italic', lineHeight: 1.65,
            color: PAL.foreground, opacity: 0.75,
          }}>
            &ldquo;Whatever our souls are made of, his and mine are the same.&rdquo;
          </p>
          <p style={{ fontSize: '0.78rem', color: PAL.muted, marginTop: '1rem', fontWeight: 600 }}>
            — Emily Brontë
          </p>
        </section>
      </main>

      <SiteFooter names={NAMES} />
    </ThemeProvider>
  );
}
