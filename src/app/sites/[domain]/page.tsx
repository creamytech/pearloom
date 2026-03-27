import { notFound } from 'next/navigation';
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
import type { Chapter } from '@/types';

// Force dynamic because each subdomain generates a unique site payload on request
export const dynamic = 'force-dynamic';

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
  const title = siteConfig.names 
    ? siteConfig.names.map(n => n.charAt(0).toUpperCase() + n.slice(1)).join(' & ')
    : 'Our Story';

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

  return (
    <ThemeProvider theme={manifest.theme || siteConfig.theme || defaultTheme}>
      <SiteNav 
        names={siteConfig.names as [string, string] || ['Our', 'Story']} 
        pages={[]} 
      />
      
      <main style={{ minHeight: '100vh', paddingBottom: '5rem' }}>
        <Hero
          names={siteConfig.names as [string, string] || ['Our', 'Story']}
          subtitle={siteConfig.tagline || 'A love story beautifully told.'}
          coverPhoto={coverPhoto}
        />

        {/* ── Editorial Pull-Quote bridge between hero and timeline ── */}
        {manifest.vibeString && (
          <div style={{
            position: 'relative',
            zIndex: 10,
            padding: '7rem 2rem 5rem',
            textAlign: 'center',
            maxWidth: '900px',
            margin: '0 auto',
          }}>
            {/* Top ornamental line */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', marginBottom: '4rem', opacity: 0.3 }}>
              <div style={{ flex: 1, maxWidth: '80px', height: '1px', background: 'var(--eg-fg)' }} />
              <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--eg-accent)' }} />
              <div style={{ flex: 1, maxWidth: '80px', height: '1px', background: 'var(--eg-fg)' }} />
            </div>

            <p style={{
              fontFamily: 'var(--eg-font-heading)',
              fontSize: 'clamp(1.4rem, 3vw, 2.2rem)',
              fontWeight: 400,
              fontStyle: 'italic',
              lineHeight: 1.65,
              color: 'var(--eg-fg)',
              opacity: 0.75,
              letterSpacing: '-0.01em',
            }}>
              &ldquo;{manifest.vibeString}&rdquo;
            </p>

            {/* Bottom ornament */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', marginTop: '4rem', opacity: 0.3 }}>
              <div style={{ flex: 1, maxWidth: '80px', height: '1px', background: 'var(--eg-fg)' }} />
              <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--eg-accent)' }} />
              <div style={{ flex: 1, maxWidth: '80px', height: '1px', background: 'var(--eg-fg)' }} />
            </div>
          </div>
        )}

        <Timeline chapters={manifest.chapters || []} />

        {/* Multi-event cards: ceremony, reception, rehearsal dinner */}
        {manifest.events && manifest.events.length > 0 && (
          <WeddingEvents events={manifest.events} />
        )}

        {/* Render Event Logistics (RSVP & Registry) only if the AI generated them from the Occasion step */}
        <EventLogistics manifest={manifest} siteId={domain} />

        {/* Multi-registry showcase */}
        {(manifest.registry?.entries?.length || manifest.registry?.cashFundUrl) && (
          <RegistryShowcase
            registries={manifest.registry?.entries || []}
            cashFundUrl={manifest.registry?.cashFundUrl}
            cashFundMessage={manifest.registry?.cashFundMessage}
          />
        )}

        {/* Travel & Hotels */}
        {manifest.travelInfo && <TravelSection info={manifest.travelInfo} />}

        {/* FAQ accordion */}
        {manifest.faqs && manifest.faqs.length > 0 && (
          <FaqSection faqs={manifest.faqs} />
        )}

        {/* Coming Soon section with email capture */}
        {manifest.comingSoon && <ComingSoon config={manifest.comingSoon} siteId={domain} />}
      </main>
    </ThemeProvider>
  );
}
