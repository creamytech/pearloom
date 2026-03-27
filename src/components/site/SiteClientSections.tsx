'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/site/SiteClientSections.tsx
// Client-only container for SSR-incompatible site components.
// All dynamic(ssr:false) imports must live in a 'use client' file.
// ─────────────────────────────────────────────────────────────

import dynamic from 'next/dynamic';
import type { VibeSkin } from '@/lib/vibe-engine';

const PhotoGallery    = dynamic(() => import('@/components/photo-gallery').then(m => ({ default: m.PhotoGallery })),     { ssr: false });
const Guestbook       = dynamic(() => import('@/components/guestbook').then(m => ({ default: m.Guestbook })),             { ssr: false });
const RsvpLiveCounter = dynamic(() => import('@/components/rsvp-live-counter').then(m => ({ default: m.RsvpLiveCounter })), { ssr: false });
const AskCoupleChat   = dynamic(() => import('@/components/ask-couple-chat').then(m => ({ default: m.AskCoupleChat })),   { ssr: false });
const VisitTracker    = dynamic(() => import('@/components/VisitTracker').then(m => ({ default: m.VisitTracker })),       { ssr: false });

interface SiteClientSectionsProps {
  siteId: string;
  coupleNames: [string, string];
  vibeSkin: VibeSkin;
}

export function SiteClientSections({ siteId, coupleNames, vibeSkin }: SiteClientSectionsProps) {
  return (
    <>
      <VisitTracker siteId={siteId} />
      <AskCoupleChat siteId={siteId} coupleNames={coupleNames} vibeSkin={vibeSkin} />
    </>
  );
}

interface SiteGalleryProps {
  siteId: string;
  coupleNames: [string, string];
}

export function SiteGallerySection({ siteId, coupleNames }: SiteGalleryProps) {
  // Provide a minimal vibeSkin to Guestbook (full skin only available server-side)
  const minimalVibeSkin: VibeSkin = { tone: 'dreamy', decorIcons: ['✦'], accentSymbol: '♡', particleColor: '#b8926a', dividerQuote: '', sectionLabels: { story: '', events: '', registry: '', travel: '', faqs: '', rsvp: '' }, aiGenerated: false, curve: 'wave', particle: 'petals', accentShape: 'ring', sectionEntrance: 'fade-up', texture: 'none', cornerStyle: '1rem', wavePath: '', wavePathInverted: '', palette: { background: '#faf9f6', foreground: '#1a1a1a', accent: '#b8926a', accent2: '#d4b896', card: '#ffffff', muted: '#8c8c8c' }, fonts: { heading: 'Playfair Display', body: 'Inter' } };
  return (
    <>
      <RsvpLiveCounter siteId={siteId} coupleNames={coupleNames} />
      <section style={{ padding: '6rem 2rem', background: 'var(--eg-bg)' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <PhotoGallery />
        </div>
      </section>
      <Guestbook siteId={siteId} coupleNames={coupleNames} vibeSkin={minimalVibeSkin} />
    </>
  );
}
