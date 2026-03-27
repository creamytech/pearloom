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
import { SiteClientSections, SiteGallerySection } from '@/components/site/SiteClientSections';
import { SitePasswordWrapper } from '@/components/site/SitePasswordWrapper';

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

  // Use cached AI skin if available, fall back to deterministic
  const vibeSkin = manifest.vibeSkin || deriveVibeSkin(manifest.vibeString || '');

  // Derive ALL colors from the AI-generated palette
  const pal = vibeSkin.palette;
  const bgColor = pal.background;
  const cardBg = pal.card;
  const accentLight = pal.accent2;

  // Build theme dynamically from AI palette + fonts
  const dynamicTheme = {
    name: 'pearloom-ai',
    fonts: { heading: vibeSkin.fonts.heading, body: vibeSkin.fonts.body },
    colors: {
      background: pal.background,
      foreground: pal.foreground,
      accent: pal.accent,
      accentLight: pal.accent2,
      muted: pal.muted,
      cardBg: pal.card,
    },
    borderRadius: '1rem',
  };

  // Google Fonts URL for the AI-selected pairing
  const fontUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(vibeSkin.fonts.heading)}:ital,wght@0,400;0,600;0,700;1,400&family=${encodeURIComponent(vibeSkin.fonts.body)}:wght@300;400;500;600&display=swap`;

  // Determine cover photo
  const coverPhoto = manifest.chapters?.[0]?.images?.[0]?.url || 'https://images.unsplash.com/photo-1519741497674-611481863552';


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

  // ── Block renderer: ordered by manifest.blocks ─────────────────
  const renderBlock = (type: string, key: string) => {
    switch (type) {
      case 'hero':
        return (
          <Hero
            key={key}
            names={safeNames}
            subtitle={siteConfig.tagline || 'A love story beautifully told.'}
            coverPhoto={coverPhoto}
            weddingDate={manifest.events?.[0]?.date || manifest.logistics?.date}
            vibeSkin={vibeSkin}
          />
        );
      case 'story':
        return (
          <section key={key} id="our-story">
            <Timeline chapters={manifest.chapters || []} />
          </section>
        );
      case 'event':
        if (!manifest.events?.length) return null;
        return (
          <section key={key} id="schedule">
            <WaveDivider skin={vibeSkin} fromColor={bgColor} toColor={cardBg} height={80} />
            <WeddingEvents events={manifest.events} title={vibeSkin.sectionLabels.events} />
            <WaveDivider skin={vibeSkin} fromColor={cardBg} toColor={bgColor} height={70} inverted />
          </section>
        );
      case 'rsvp':
        if (!manifest.events?.length) return null;
        return (
          <section key={key} id="rsvp">
            <PublicRsvpSection
              siteId={domain}
              events={manifest.events}
              deadline={manifest.logistics?.rsvpDeadline}
            />
          </section>
        );
      case 'registry':
        if (!manifest.registry?.entries?.length && !manifest.registry?.cashFundUrl) return null;
        return (
          <section key={key} id="registry">
            <WaveDivider skin={vibeSkin} fromColor={bgColor} toColor={accentLight} height={80} />
            <RegistryShowcase
              registries={manifest.registry?.entries || []}
              cashFundUrl={manifest.registry?.cashFundUrl}
              cashFundMessage={manifest.registry?.cashFundMessage}
              title={vibeSkin.sectionLabels.registry}
            />
            <WaveDivider skin={vibeSkin} fromColor={accentLight} toColor={bgColor} height={70} inverted />
          </section>
        );
      case 'travel':
        if (!manifest.travelInfo) return null;
        return (
          <section key={key} id="travel">
            <WaveDivider skin={vibeSkin} fromColor={bgColor} toColor={cardBg} height={70} />
            <TravelSection info={manifest.travelInfo} />
          </section>
        );
      case 'faq':
        if (!manifest.faqs?.length) return null;
        return (
          <section key={key} id="faq">
            <WaveDivider skin={vibeSkin} fromColor={bgColor} toColor={bgColor} height={70} />
            <FaqSection faqs={manifest.faqs} />
          </section>
        );
      case 'guestbook':
        return (
          <section key={key} id="guestbook">
            <WaveDivider skin={vibeSkin} fromColor={bgColor} toColor={cardBg} height={80} />
            <SiteGallerySection siteId={domain} coupleNames={safeNames} />
            <WaveDivider skin={vibeSkin} fromColor={cardBg} toColor={bgColor} height={70} inverted />
          </section>
        );
      case 'countdown':
        return null; // handled client-side only
      default:
        return null;
    }
  };

  // Determine section order: blocks > legacy hardcoded
  const visibleBlocks = manifest.blocks && manifest.blocks.length > 0
    ? [...manifest.blocks].sort((a, b) => a.order - b.order).filter(b => b.visible !== false)
    : null;

  // Vibe-intro quote section (always rendered after hero, not a removable block)
  const VibeQuote = () => (
    <div style={{ position: 'relative', zIndex: 10, padding: '7rem 2rem 5rem', textAlign: 'center', maxWidth: '900px', margin: '0 auto' }}>
      {/* Custom medallion ornament */}
      {vibeSkin.medallionSvg && (
        <div
          style={{ width: '80px', height: '80px', margin: '0 auto 2rem', opacity: 0.45 }}
          dangerouslySetInnerHTML={{ __html: vibeSkin.medallionSvg }}
        />
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', marginBottom: '4rem' }}>
        <span style={{ fontSize: '1.25rem', color: 'var(--eg-accent)', opacity: 0.4 }}>{vibeSkin.decorIcons[1] || vibeSkin.decorIcons[0] || '✦'}</span>
        <div style={{ flex: 1, maxWidth: '80px', height: '1px', background: 'var(--eg-accent)', opacity: 0.2 }} />
        <span style={{ fontSize: '1.75rem', color: 'var(--eg-accent)', opacity: 0.7 }}>{vibeSkin.accentSymbol || vibeSkin.decorIcons[0] || '✦'}</span>
        <div style={{ flex: 1, maxWidth: '80px', height: '1px', background: 'var(--eg-accent)', opacity: 0.2 }} />
        <span style={{ fontSize: '1.25rem', color: 'var(--eg-accent)', opacity: 0.4 }}>{vibeSkin.decorIcons[2] || vibeSkin.decorIcons[0] || '✦'}</span>
      </div>
      <p style={{ fontFamily: 'var(--eg-font-heading)', fontSize: 'clamp(1.4rem, 3vw, 2.2rem)', fontWeight: 400, fontStyle: 'italic', lineHeight: 1.65, color: 'var(--eg-fg)', opacity: 0.75, letterSpacing: '-0.01em' }}>
        &ldquo;{vibeSkin.aiGenerated ? vibeSkin.dividerQuote : manifest.vibeString}&rdquo;
      </p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', marginTop: '4rem' }}>
        <div style={{ flex: 1, maxWidth: '80px', height: '1px', background: 'var(--eg-accent)', opacity: 0.2 }} />
        <span style={{ fontSize: '1.25rem', color: 'var(--eg-accent)', opacity: 0.5 }}>{vibeSkin.decorIcons[3] || '•'}</span>
        <div style={{ flex: 1, maxWidth: '80px', height: '1px', background: 'var(--eg-accent)', opacity: 0.2 }} />
      </div>
    </div>
  );

  // Custom SVG border art rendered between major sections
  const SvgBorder = ({ flip = false }: { flip?: boolean }) =>
    vibeSkin.sectionBorderSvg ? (
      <div
        style={{
          width: '100%', overflow: 'hidden', lineHeight: 0,
          transform: flip ? 'scaleX(-1)' : undefined,
          opacity: 0.5,
        }}
        dangerouslySetInnerHTML={{ __html: vibeSkin.sectionBorderSvg }}
      />
    ) : null;


  const siteContent = (
    <ThemeProvider theme={manifest.theme || siteConfig.theme || dynamicTheme}>
      {/* Inject AI-selected Google Fonts */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={fontUrl} />

      <SiteNav names={safeNames} pages={sitePages} />

      <main style={{ minHeight: '100vh', paddingBottom: '5rem', background: bgColor }}>
        {visibleBlocks ? (
          // ── BLOCK-DRIVEN layout (Canvas editor controls order) ──
          <>
            {/* AI-generated pattern overlay for entire page */}
            {vibeSkin.heroPatternSvg && (
              <div
                style={{
                  position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
                  backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(vibeSkin.heroPatternSvg)}")`,
                  backgroundRepeat: 'repeat', backgroundSize: '200px 200px', opacity: 0.08,
                }}
              />
            )}
            {visibleBlocks.map(block => renderBlock(block.type, block.id))}
            {/* Always append vibe quote after hero if hero is first */}
            {visibleBlocks[0]?.type === 'hero' && (
              <>
                <WaveDivider skin={vibeSkin} fromColor={bgColor} toColor={bgColor} height={70} />
                <SvgBorder />
                <VibeQuote />
                <SvgBorder flip />
              </>
            )}
            {/* Chatbot footer sections */}
            <SiteGallerySection siteId={domain} coupleNames={safeNames} />
          </>
        ) : (
          // ── LEGACY: hardcoded order (no blocks yet) ──
          <>
            <Hero names={safeNames} subtitle={siteConfig.tagline || 'A love story beautifully told.'} coverPhoto={coverPhoto} weddingDate={manifest.events?.[0]?.date || manifest.logistics?.date} vibeSkin={vibeSkin} />
            <WaveDivider skin={vibeSkin} fromColor={bgColor} toColor={bgColor} height={70} />
            <VibeQuote />
            <section id="our-story"><Timeline chapters={manifest.chapters || []} /></section>
            {manifest.events?.length ? <><WaveDivider skin={vibeSkin} fromColor={bgColor} toColor={cardBg} height={80} /><section id="schedule"><WeddingEvents events={manifest.events} title={vibeSkin.sectionLabels.events} /></section><WaveDivider skin={vibeSkin} fromColor={cardBg} toColor={bgColor} height={70} inverted /></> : null}
            {manifest.events?.length ? <section id="rsvp"><PublicRsvpSection siteId={domain} events={manifest.events} deadline={manifest.logistics?.rsvpDeadline} /></section> : null}
            {(manifest.registry?.entries?.length || manifest.registry?.cashFundUrl) ? <><WaveDivider skin={vibeSkin} fromColor={bgColor} toColor={accentLight} height={80} /><section id="registry"><RegistryShowcase registries={manifest.registry?.entries || []} cashFundUrl={manifest.registry?.cashFundUrl} cashFundMessage={manifest.registry?.cashFundMessage} title={vibeSkin.sectionLabels.registry} /></section><WaveDivider skin={vibeSkin} fromColor={accentLight} toColor={cardBg} height={70} inverted /></> : null}
            {manifest.travelInfo ? <><WaveDivider skin={vibeSkin} fromColor={cardBg} toColor={bgColor} height={70} /><section id="travel"><TravelSection info={manifest.travelInfo} /></section></> : null}
            {manifest.faqs?.length ? <><WaveDivider skin={vibeSkin} fromColor={bgColor} toColor={bgColor} height={70} /><section id="faq"><FaqSection faqs={manifest.faqs} /></section></> : null}
            <WaveDivider skin={vibeSkin} fromColor={bgColor} toColor={cardBg} height={80} />
            <SiteGallerySection siteId={domain} coupleNames={safeNames} />
            <WaveDivider skin={vibeSkin} fromColor={cardBg} toColor={bgColor} height={70} inverted />
          </>
        )}

        {manifest.comingSoon && <ComingSoon config={manifest.comingSoon} siteId={domain} />}
      </main>

      <SiteClientSections siteId={domain} coupleNames={safeNames} vibeSkin={vibeSkin} />
    </ThemeProvider>
  );

  if (isPasswordProtected) {
    return (
      <SitePasswordWrapper siteId={domain} coupleNames={safeNames} password={manifest.comingSoon!.password!} vibeSkin={vibeSkin}>
        {siteContent}
      </SitePasswordWrapper>
    );
  }

  return siteContent;
}


