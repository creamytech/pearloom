import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getSiteConfig } from '@/lib/db';
import { ThemeProvider } from '@/components/theme-provider';
import { SiteNav } from '@/components/site-nav';
import { Hero } from '@/components/hero';
import { Timeline } from '@/components/timeline';
import { EventLogistics } from '@/components/event-logistics';
import { ComingSoon } from '@/components/coming-soon';
import { WeddingEvents } from '@/components/wedding-events';
import { RegistryShowcase } from '@/components/registry-showcase';
import { FaqSection } from '@/components/faq-section';
import { TravelSection } from '@/components/travel-section';
import { PublicRsvpSection } from '@/components/public-rsvp-section';
import type { Chapter } from '@/types';
import { deriveVibeSkin } from '@/lib/vibe-engine';
import { WaveDivider } from '@/components/vibe/WaveDivider';
import lazyLoad from 'next/dynamic';

// Client-only components — lazy-loaded to prevent SSR issues
const PhotoGallery = lazyLoad(() => import('@/components/photo-gallery').then(m => ({ default: m.PhotoGallery })), { ssr: false });
const Guestbook = lazyLoad(() => import('@/components/guestbook').then(m => ({ default: m.Guestbook })), { ssr: false });
const RsvpLiveCounter = lazyLoad(() => import('@/components/rsvp-live-counter').then(m => ({ default: m.RsvpLiveCounter })), { ssr: false });
const AskCoupleChat = lazyLoad(() => import('@/components/ask-couple-chat').then(m => ({ default: m.AskCoupleChat })), { ssr: false });
const PasswordGate = lazyLoad(() => import('@/components/PasswordGate').then(m => ({ default: m.PasswordGate })), { ssr: false });
const VisitTracker = lazyLoad(() => import('@/components/VisitTracker').then(m => ({ default: m.VisitTracker })), { ssr: false });

export const dynamic = 'force-dynamic';

export async function generateMetadata(
  { params }: { params: Promise<{ domain: string }> }
): Promise<Metadata> {
  const { domain } = await params;
  const siteConfig = await getSiteConfig(domain);
  if (!siteConfig) return {};

  const names = Array.isArray(siteConfig.names) ? siteConfig.names : ['Together', 'Forever'];
  const title = names.map((n: string) => n.charAt(0).toUpperCase() + n.slice(1)).join(' & ');
  const tagline = siteConfig.tagline || 'A love story beautifully told.';
  const accent = siteConfig.manifest?.theme?.colors?.accent || '#b8926a';
  const bg = siteConfig.manifest?.theme?.colors?.background || '#1a1a1a';
  const coverPhoto = siteConfig.manifest?.chapters?.[0]?.images?.[0]?.url || '';
  const weddingDate = siteConfig.manifest?.logistics?.date || '';
  const [n1, n2] = names;

  const ogUrl = `/api/og?n1=${encodeURIComponent(n1)}&n2=${encodeURIComponent(n2)}&tag=${encodeURIComponent(tagline)}&accent=${encodeURIComponent(accent)}&bg=${encodeURIComponent(bg)}&date=${encodeURIComponent(weddingDate)}&photo=${encodeURIComponent(coverPhoto)}`;

  return {
    title: `${title} — Wedding Website`,
    description: tagline,
    openGraph: {
      title: `${title} — Wedding Website`,
      description: tagline,
      images: [{ url: ogUrl, width: 1200, height: 630, alt: `${title} wedding website` }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} — Wedding Website`,
      description: tagline,
      images: [ogUrl],
    },
  };
}



export default async function SubdomainSite({ params }: { params: Promise<{ domain: string }> }) {
  // Wait for params as standard in NextJS App Router
  const { domain } = await params;

  // Query Supabase via our DB layer bypassing RLS securely because this is a Server Component!
  const siteConfig = await getSiteConfig(domain);

  // If no subdomain matches in the SaaS database, render 404
  if (!siteConfig || !siteConfig.manifest) {
    return notFound();
  }

  const manifest = siteConfig.manifest;
  
  // Format the name elegantly "Shauna & Ben"
  const safeNames: [string, string] = Array.isArray(siteConfig.names) && siteConfig.names.length >= 2
    ? [siteConfig.names[0], siteConfig.names[1]]
    : ['Our', 'Story'];
  const title = safeNames.map(n => n.charAt(0).toUpperCase() + n.slice(1)).join(' & ');

  const defaultTheme = {
    name: 'pearloom-ivory',
    fonts: { heading: 'Playfair Display', body: 'Inter' },
    colors: {
      background: '#faf9f6',
      foreground: '#1a1a1a',
      accent: '#b8926a',
      accentLight: '#f3e8d8',
      muted: '#8c8c8c',
      cardBg: '#ffffff',
    },
    borderRadius: '1rem',
  };

  // Determine cover photo
  const coverPhoto = manifest.chapters?.[0]?.images?.[0]?.url || 'https://images.unsplash.com/photo-1519741497674-611481863552';

  // Use cached AI skin if available, fall back to deterministic
  const vibeSkin = manifest.vibeSkin || deriveVibeSkin(manifest.vibeString || '');

  // Background colors for wave transitions
  const bgColor = manifest.theme?.colors?.background || '#faf9f6';
  const cardBg = manifest.theme?.colors?.cardBg || '#ffffff';
  const accentLight = manifest.theme?.colors?.accentLight || '#f3e8d8';

  // Build real nav pages from manifest content
  const sitePages = [
    { id: 'story',    slug: 'our-story', label: 'Our Story', enabled: true,  order: 0 },
    manifest.events?.length
      ? { id: 'schedule', slug: 'schedule', label: 'Schedule',   enabled: true,  order: 1 } : null,
    manifest.events?.length
      ? { id: 'rsvp',     slug: 'rsvp',     label: 'RSVP',       enabled: true,  order: 2 } : null,
    (manifest.registry?.entries?.length || manifest.registry?.cashFundUrl)
      ? { id: 'registry', slug: 'registry', label: 'Registry',   enabled: true,  order: 3 } : null,
    manifest.travelInfo
      ? { id: 'travel',   slug: 'travel',   label: 'Travel',     enabled: true,  order: 4 } : null,
    manifest.faqs?.length
      ? { id: 'faq',      slug: 'faq',      label: 'FAQ',        enabled: true,  order: 5 } : null,
  ].filter(Boolean) as import('@/types').SitePage[];

  const isPasswordProtected = manifest.comingSoon?.passwordProtected && manifest.comingSoon?.password;

  const siteContent = (
    <ThemeProvider theme={manifest.theme || siteConfig.theme || defaultTheme}>
      <SiteNav
        names={safeNames}
        pages={sitePages}
      />

      {/* Silent analytics tracker */}
      <VisitTracker siteId={domain} />
      
      <main style={{ minHeight: '100vh', paddingBottom: '5rem', background: bgColor }}>
        <Hero
          names={safeNames}
          subtitle={siteConfig.tagline || 'A love story beautifully told.'}
          coverPhoto={coverPhoto}
          weddingDate={manifest.events?.[0]?.date || manifest.logistics?.date}
          vibeSkin={vibeSkin}
        />

        {/* Wave divider: Hero → Story vibe quote */}
        <WaveDivider skin={vibeSkin} fromColor={bgColor} toColor={bgColor} height={70} />

        {/* ── AI-designed pull-quote with vibe-skin decoration ── */}
        <div style={{
          position: 'relative', zIndex: 10,
          padding: '7rem 2rem 5rem', textAlign: 'center',
          maxWidth: '900px', margin: '0 auto',
        }}>
          {/* Decorative row using AI-chosen symbols */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', marginBottom: '4rem' }}>
            <span style={{ fontSize: '1.25rem', color: 'var(--eg-accent)', opacity: 0.4 }}>
              {vibeSkin.decorIcons[1] || vibeSkin.decorIcons[0] || '✦'}
            </span>
            <div style={{ flex: 1, maxWidth: '80px', height: '1px', background: 'var(--eg-accent)', opacity: 0.2 }} />
            <span style={{ fontSize: '1.75rem', color: 'var(--eg-accent)', opacity: 0.7 }}>
              {vibeSkin.accentSymbol || vibeSkin.decorIcons[0] || '✦'}
            </span>
            <div style={{ flex: 1, maxWidth: '80px', height: '1px', background: 'var(--eg-accent)', opacity: 0.2 }} />
            <span style={{ fontSize: '1.25rem', color: 'var(--eg-accent)', opacity: 0.4 }}>
              {vibeSkin.decorIcons[2] || vibeSkin.decorIcons[0] || '✦'}
            </span>
          </div>

          <p style={{
            fontFamily: 'var(--eg-font-heading)', fontSize: 'clamp(1.4rem, 3vw, 2.2rem)',
            fontWeight: 400, fontStyle: 'italic', lineHeight: 1.65,
            color: 'var(--eg-fg)', opacity: 0.75, letterSpacing: '-0.01em',
          }}>
            &ldquo;{vibeSkin.aiGenerated ? vibeSkin.dividerQuote : manifest.vibeString}&rdquo;
          </p>

          {/* Bottom ornament */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', marginTop: '4rem' }}>
            <div style={{ flex: 1, maxWidth: '80px', height: '1px', background: 'var(--eg-accent)', opacity: 0.2 }} />
            <span style={{ fontSize: '1.25rem', color: 'var(--eg-accent)', opacity: 0.5 }}>
              {vibeSkin.decorIcons[3] || '•'}
            </span>
            <div style={{ flex: 1, maxWidth: '80px', height: '1px', background: 'var(--eg-accent)', opacity: 0.2 }} />
          </div>
        </div>

        <section id="our-story">
          <Timeline chapters={manifest.chapters || []} />
        </section>

        {/* Wave divider: Timeline → Events */}
        {manifest.events && manifest.events.length > 0 && (
          <WaveDivider skin={vibeSkin} fromColor={bgColor} toColor={cardBg} height={80} />
        )}

        {manifest.events && manifest.events.length > 0 && (
          <section id="schedule">
            <WeddingEvents events={manifest.events} title={vibeSkin.sectionLabels.events} />
          </section>
        )}

        {/* Wave divider: Events → RSVP */}
        {manifest.events && manifest.events.length > 0 && (
          <WaveDivider skin={vibeSkin} fromColor={cardBg} toColor={bgColor} height={70} inverted />
        )}

        {manifest.events && manifest.events.length > 0 && (
          <section id="rsvp">
            <PublicRsvpSection
              siteId={domain}
              events={manifest.events}
              deadline={manifest.logistics?.rsvpDeadline}
            />
          </section>
        )}

        {/* Wave divider: RSVP → Registry */}
        {(manifest.registry?.entries?.length || manifest.registry?.cashFundUrl) && (
          <WaveDivider skin={vibeSkin} fromColor={bgColor} toColor={accentLight} height={80} />
        )}

        {(manifest.registry?.entries?.length || manifest.registry?.cashFundUrl) && (
          <section id="registry">
            <RegistryShowcase
              registries={manifest.registry?.entries || []}
              cashFundUrl={manifest.registry?.cashFundUrl}
              cashFundMessage={manifest.registry?.cashFundMessage}
              title={vibeSkin.sectionLabels.registry}
            />
          </section>
        )}

        {/* Wave divider: Registry → Travel */}
        {manifest.travelInfo && (
          <WaveDivider skin={vibeSkin} fromColor={accentLight} toColor={cardBg} height={70} inverted />
        )}

        {manifest.travelInfo && (
          <section id="travel">
            <TravelSection info={manifest.travelInfo} />
          </section>
        )}

        {/* Wave divider: Travel → FAQ */}
        {manifest.faqs && manifest.faqs.length > 0 && (
          <WaveDivider skin={vibeSkin} fromColor={cardBg} toColor={bgColor} height={70} />
        )}

        {manifest.faqs && manifest.faqs.length > 0 && (
          <section id="faq">
            <FaqSection faqs={manifest.faqs} />
          </section>
        )}

        {/* Wave divider: FAQ → Guestbook */}
        <WaveDivider skin={vibeSkin} fromColor={bgColor} toColor={cardBg} height={80} />

        {/* Public Guestbook — guests leave wishes */}
        <section id="guestbook">
          <Guestbook siteId={domain} coupleNames={safeNames} vibeSkin={vibeSkin} />
        </section>

        {/* Wave divider: Guestbook → Photos */}
        <WaveDivider skin={vibeSkin} fromColor={cardBg} toColor={bgColor} height={70} inverted />

        {/* Guest photo gallery with upload + masonry lightbox */}
        <section id="photos" style={{ padding: '6rem 2rem', background: bgColor }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.25rem', marginBottom: '2rem' }}>
                <div style={{ flex: 1, maxWidth: '80px', height: '1px', background: 'var(--eg-accent)', opacity: 0.2 }} />
                <span style={{ fontSize: '1.3rem', color: 'var(--eg-accent)' }}>{vibeSkin.decorIcons[0] || '✦'}</span>
                <div style={{ flex: 1, maxWidth: '80px', height: '1px', background: 'var(--eg-accent)', opacity: 0.2 }} />
              </div>
              <h2 style={{
                fontFamily: 'var(--eg-font-heading)', fontSize: 'clamp(2rem, 4vw, 3rem)',
                fontWeight: 400, letterSpacing: '-0.025em', color: 'var(--eg-fg)', marginBottom: '0.75rem',
              }}>Our Photo Wall</h2>
              <p style={{ color: 'var(--eg-muted)', fontSize: '1rem', fontStyle: 'italic' }}>
                Share your favorite moments. Upload your photos from the day.
              </p>
            </div>
            <PhotoGallery />
          </div>
        </section>

        {/* Live RSVP counter — shown just above the RSVP form */}
        <RsvpLiveCounter siteId={domain} coupleNames={safeNames} />

        {manifest.comingSoon && <ComingSoon config={manifest.comingSoon} siteId={domain} />}
      </main>

      {/* Floating Ask the Couple chatbot */}
      <AskCoupleChat siteId={domain} coupleNames={safeNames} vibeSkin={vibeSkin} />
    </ThemeProvider>
  );

  // Wrap in PasswordGate if protected
  if (isPasswordProtected) {
    return (
      <PasswordGate
        siteId={domain}
        coupleNames={safeNames}
        password={manifest.comingSoon!.password!}
        vibeSkin={vibeSkin}
      >
        {siteContent}
      </PasswordGate>
    );
  }

  return siteContent;
}
