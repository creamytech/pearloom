'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / app/photos/page.tsx — Guest Photo Gallery
// ─────────────────────────────────────────────────────────────

import { motion } from 'framer-motion';
import { Camera } from 'lucide-react';
import { SiteNav } from '@/components/site-nav';
import { SiteFooter } from '@/components/site-footer';
import { PhotoGallery } from '@/components/photo-gallery';
import { ThemeProvider } from '@/components/theme-provider';
import type { SitePage, ThemeSchema } from '@/types';

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
  fonts: { heading: 'Fraunces', body: 'Geist' },
  colors: { background: '#F5EFE2', foreground: '#0E0D0B', accent: '#B8935A', accentLight: '#EBE3D2', muted: '#6F6557', cardBg: '#FBF7EE' },
  borderRadius: 'var(--pl-radius-xs)',
};

export default function PhotosPage() {
  return (
    <ThemeProvider theme={THEME}>
      <SiteNav names={NAMES} pages={PAGES} />

      <main style={{
        minHeight: '100dvh',
        paddingTop: '8rem',
        paddingBottom: '5rem',
        background: 'linear-gradient(180deg, #f5ead6 0%, #F5F1E8 35%, #F5F1E8 100%)',
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 1.5rem' }}>
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            style={{ textAlign: 'center', marginBottom: '3rem' }}
          >
            <div style={{
              width: '4.5rem', height: '4.5rem', borderRadius: '50%',
              background: '#EEE8DC', border: '2px solid rgba(163,177,138,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.5rem',
            }}>
              <Camera size={22} color="var(--pl-gold, #B8935A)" />
            </div>
            <h1 style={{
              fontFamily: 'var(--pl-font-heading)',
              fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              marginBottom: '0.75rem',
            }}>
              Photos
            </h1>
            <p style={{
              color: '#9A9488',
              maxWidth: '420px',
              margin: '0 auto',
              lineHeight: 1.7,
            }}>
              Drop photos from the day. Everyone&rsquo;s uploads land in one warm gallery — filters, captions, and download all.
            </p>
          </motion.div>

          {/* Gallery */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            <PhotoGallery siteId="demo" />
          </motion.div>
        </div>
      </main>

      <SiteFooter names={NAMES} />
    </ThemeProvider>
  );
}
