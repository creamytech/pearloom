'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / app/page.tsx — The Public Anniversary Site
// Home page with hero + timeline + coming soon
// ─────────────────────────────────────────────────────────────

import { Hero } from '@/components/hero';
import { Timeline } from '@/components/timeline';
import { ComingSoon } from '@/components/coming-soon';
import { ThemeProvider } from '@/components/theme-provider';
import { SiteNav } from '@/components/site-nav';
import { SiteFooter } from '@/components/site-footer';
import type { Chapter, ComingSoonConfig, ThemeSchema, SitePage } from '@/types';

// ─── Site Config ───
const NAMES: [string, string] = ['Ben', 'Shauna'];

const PAGES: SitePage[] = [
  { id: 'pg-1', slug: 'our-story', label: 'Our Story', enabled: true, order: 0 },
  { id: 'pg-2', slug: 'details', label: 'Details', enabled: true, order: 1 },
  { id: 'pg-3', slug: 'rsvp', label: 'RSVP', enabled: true, order: 2 },
  { id: 'pg-4', slug: 'photos', label: 'Photos', enabled: true, order: 3 },
  { id: 'pg-5', slug: 'faq', label: 'FAQ', enabled: true, order: 4 },
];

const THEME: ThemeSchema = {
  name: 'pearloom-ivory',
  fonts: { heading: 'Playfair Display', body: 'Inter' },
  colors: {
    background: '#F5F1E8',
    foreground: '#2B2B2B',
    accent: '#c9a87c',
    accentLight: '#f5ead6',
    muted: '#9A9488',
    cardBg: '#ffffff',
  },
  borderRadius: '0.5rem',
};

const CHAPTERS: Chapter[] = [
  {
    id: 'ch-1',
    date: '2024-03-15',
    title: 'Where It All Began',
    subtitle: 'The First Spark',
    description:
      'The day the universe decided to put us in the same room. Little did I know, everything was about to change. Your laugh caught me off guard — and I never recovered.',
    images: [{ id: 'img-1', url: 'https://images.unsplash.com/photo-1583008911326-fde557761043?q=80&w=1200&auto=format&fit=crop', alt: 'Couple meeting', width: 1200, height: 750 }],
    location: null,
    mood: 'Butterflies',
    order: 0,
  },
  {
    id: 'ch-2',
    date: '2024-06-20',
    title: 'First Summer Together',
    subtitle: 'Golden Hours',
    description:
      'Late drives with the windows down, discovering songs that became ours. Every sunset felt like it was performing just for us.',
    images: [{ id: 'img-2', url: 'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?q=80&w=1200&auto=format&fit=crop', alt: 'Summer memories', width: 1200, height: 750 }],
    location: { lat: 26.1224, lng: -80.1373, label: 'Fort Lauderdale, FL' },
    mood: 'Golden Hour',
    order: 1,
  },
  {
    id: 'ch-3',
    date: '2024-10-31',
    title: 'Our First Halloween',
    subtitle: 'Partners in Everything',
    description:
      'Matching costumes, too much candy, and the realization that the mundane stuff is the best stuff when I\'m doing it with you.',
    images: [{ id: 'img-3', url: 'https://images.unsplash.com/photo-1509557965875-b88c97052f0e?q=80&w=1200&auto=format&fit=crop', alt: 'Halloween together', width: 1200, height: 750 }],
    location: null,
    mood: 'Playful',
    order: 2,
  },
  {
    id: 'ch-4',
    date: '2024-12-25',
    title: 'First Christmas',
    subtitle: 'Home Feels Different Now',
    description:
      'Snow on the ground, cocoa in hand, and you beside me. That\'s when holiday stopped being a date on the calendar and became a feeling.',
    images: [{ id: 'img-4', url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=1200&auto=format&fit=crop', alt: 'Winter holidays', width: 1200, height: 750 }],
    location: null,
    mood: 'Cozy Winter',
    order: 3,
  },
  {
    id: 'ch-5',
    date: '2025-03-15',
    title: 'One Year Down',
    subtitle: 'Just Getting Started',
    description:
      '365 days and somehow it already feels like I\'d known you for a thousand. Every fight made us stronger, every laugh made us closer.',
    images: [{ id: 'img-5', url: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?q=80&w=1200&auto=format&fit=crop', alt: 'One year anniversary', width: 1200, height: 750 }],
    location: null,
    mood: 'Gratitude',
    order: 4,
  },
  {
    id: 'ch-6',
    date: '2026-03-15',
    title: 'Two Years, Still Falling',
    subtitle: 'Happy Anniversary, Shauna',
    description:
      '730 days. I still get the same rush when I see your name on my phone. Here\'s to every chapter that comes next — I wouldn\'t write this story with anyone else.',
    images: [{ id: 'img-6', url: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?q=80&w=1200&auto=format&fit=crop', alt: 'Two year anniversary', width: 1200, height: 750 }],
    location: null,
    mood: 'Forever',
    order: 5,
  },
];

const COMING_SOON: ComingSoonConfig = {
  enabled: true,
  title: 'The Next Chapter',
  subtitle: 'Our story is far from over... something special is on the way.',
  passwordProtected: false,
};

export default function HomePage() {
  return (
    <ThemeProvider theme={THEME}>
      <SiteNav names={NAMES} pages={PAGES} />
      <main>
        <Hero
          names={NAMES}
          anniversaryLabel="Two Years"
          subtitle="730 days of laughter, love, and a lifetime to go."
          date="March 15, 2026"
        />
        <Timeline chapters={CHAPTERS} />
        <ComingSoon config={COMING_SOON} />
      </main>
      <SiteFooter names={NAMES} />
    </ThemeProvider>
  );
}
