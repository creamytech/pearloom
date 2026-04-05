'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / app/rsvp/page.tsx — Premium RSVP Page
// ─────────────────────────────────────────────────────────────

import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { SiteNav } from '@/components/site-nav';
import { SiteFooter } from '@/components/site-footer';
import { RsvpForm } from '@/components/rsvp-form';
import { ThemeProvider } from '@/components/theme-provider';
import type { SitePage, ThemeSchema, WeddingEvent } from '@/types';

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
  colors: { background: '#F5F1E8', foreground: '#2B2B2B', accent: '#A3B18A', accentLight: '#EEE8DC', muted: '#9A9488', cardBg: '#F5F1E8' },
  borderRadius: '1rem',
};

const EVENTS: WeddingEvent[] = [
  {
    id: 'evt-1',
    name: 'Anniversary Dinner',
    type: 'other' as const,
    date: '2026-03-15',
    time: '7:00 PM',
    endTime: '10:00 PM',
    venue: 'Our Favorite Restaurant',
    address: '123 Love Lane, Fort Lauderdale, FL',
    description: 'An intimate celebration of two years together.',
    dressCode: 'Cocktail Attire',
  },
];

export default function RsvpPage() {
  return (
    <ThemeProvider theme={THEME}>
      <SiteNav names={NAMES} pages={PAGES} />

      <main style={{
        minHeight: '100dvh',
        paddingTop: '8rem',
        paddingBottom: '5rem',
        background: 'linear-gradient(180deg, #f5ead6 0%, #F5F1E8 35%, #F5F1E8 100%)',
      }}>
        <div style={{ maxWidth: '580px', margin: '0 auto', padding: '0 1.5rem' }}>
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            style={{ textAlign: 'center', marginBottom: '3rem' }}
          >
            {/* Icon circle */}
            <div style={{
              width: '4.5rem', height: '4.5rem', borderRadius: '50%',
              background: '#EEE8DC', border: '2px solid rgba(163,177,138,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.5rem',
            }}>
              <Heart size={22} color="#A3B18A" />
            </div>
            <h1 style={{
              fontFamily: 'var(--pl-font-heading)',
              fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              marginBottom: '0.75rem',
            }}>
              RSVP
            </h1>
            <p style={{
              color: '#9A9488',
              maxWidth: '360px',
              margin: '0 auto',
              lineHeight: 1.7,
              fontSize: '1rem',
            }}>
              We&apos;d love to celebrate with you. Let us know if you can make it.
            </p>
          </motion.div>

          {/* Form Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            style={{
              background: '#F5F1E8',
              borderRadius: '1.25rem',
              border: '1px solid rgba(0,0,0,0.06)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
              padding: 'clamp(1.5rem, 4vw, 2.5rem)',
            }}
          >
            <RsvpForm events={EVENTS} siteId="demo" />
          </motion.div>
        </div>
      </main>

      <SiteFooter names={NAMES} />
    </ThemeProvider>
  );
}
