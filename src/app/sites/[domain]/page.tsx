import { notFound } from 'next/navigation';
import { getSiteConfig } from '@/lib/db';
import { ThemeProvider } from '@/components/theme-provider';
import { SiteNav } from '@/components/site-nav';
import { Hero } from '@/components/hero';
import { Timeline } from '@/components/timeline';
import { EventLogistics } from '@/components/event-logistics';
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

        <div style={{ maxWidth: '800px', margin: '-4rem auto 4rem', padding: '0 2rem', position: 'relative', zIndex: 10 }}>
          <p style={{
            fontSize: '1.25rem', lineHeight: 1.8, color: 'var(--eg-foreground)',
            textAlign: 'center', fontFamily: 'var(--eg-font-body)', fontStyle: 'italic',
            background: 'var(--eg-card-bg)', padding: '3rem', borderRadius: 'var(--eg-radius)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.05)'
          }}>
            {manifest.vibeString || 'Two hearts, one journey.'}
          </p>
        </div>

        <Timeline chapters={manifest.chapters || []} />
        
        {/* Render Event Logistics (RSVP & Registry) only if the AI generated them from the Occasion step */}
        <EventLogistics manifest={manifest} siteId={domain} />
      </main>
    </ThemeProvider>
  );
}
