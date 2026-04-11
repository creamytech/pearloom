import React from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getSiteConfig } from '@/lib/db';
import { ThemeProvider } from '@/components/theme-provider';
import { SiteNav } from '@/components/site-nav';
import { Hero } from '@/components/hero';
import { StorySection, chapterDateFormatOptions } from '@/components/blocks/StoryLayouts';
import { sanitizeSvg } from '@/lib/sanitize-svg';
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
import { SectionDivider } from '@/components/effects/SectionDivider';
import { PerBlockRevealCSS } from '@/components/effects/ScrollReveal';
import { SiteClientSections, SiteGallerySection } from '@/components/site/SiteClientSections';
import { CelebrationOverlay } from '@/components/vibe/CelebrationOverlay';
import { CountdownBlock } from '@/components/site/CountdownBlock';
import { SitePasswordWrapper } from '@/components/site/SitePasswordWrapper';
import { WeddingDayBanner } from '@/components/site/WeddingDayBanner';
import { WeddingDayTimeline } from '@/components/site/WeddingDayTimeline';
import { WeddingDayPhotoFeed } from '@/components/site/WeddingDayPhotoFeed';
import { GuestbookSection } from '@/components/site/GuestbookSection';
import { GuestPhotoWall } from '@/components/site/GuestPhotoWall';
import { LiveUpdatesFeed } from '@/components/site/LiveUpdatesFeed';
import { SpotifySection } from '@/components/site/SpotifySection';
import { CoupleQuiz } from '@/components/site/CoupleQuiz';
import { ShareBar } from '@/components/site/ShareBar';
import { enforcePaletteContrast } from '@/lib/color-utils';
import { StickerLayer } from '@/components/site-stickers/StickerLayer';
import { AnalyticsBeacon } from '@/components/analytics/AnalyticsBeacon';
import { buildContext, resolveBlockConfig } from '@/lib/block-engine';
import { getPostEventConfig, getPostEventBanner } from '@/lib/post-event';
import { generateJsonLd, getTwitterMeta } from '@/lib/guest-services';
import { WeddingPartySection } from '@/components/site/WeddingPartySection';

export const dynamic = 'force-dynamic';

export async function generateMetadata(
  { params }: { params: Promise<{ domain: string }> }
): Promise<Metadata> {
  const { domain } = await params;
  const siteConfig = await getSiteConfig(domain);

  if (!siteConfig) return { title: 'Pearloom' };

  const names = Array.isArray(siteConfig.names) ? siteConfig.names : ['Together', 'Forever'];
  const displayNames = names.map((n: string) => n.charAt(0).toUpperCase() + n.slice(1)).filter(Boolean).join(' & ');

  const manifest = siteConfig.manifest;

  // Build title with names + date
  const eventDate = manifest?.logistics?.date;
  const venue = manifest?.logistics?.venue || manifest?.events?.[0]?.venue;
  const dateStr = eventDate
    ? new Date(eventDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '';

  const occasion = manifest?.occasion || 'wedding';
  const occasionLabel: Record<string, string> = {
    wedding: 'Wedding', anniversary: 'Anniversary',
    birthday: 'Birthday', engagement: 'Engagement', story: 'Story',
  };
  const shortTitle = `${displayNames} — ${occasionLabel[occasion] || 'Celebration'}`;
  const fullTitle = `${shortTitle} | Pearloom`;

  // Build description — prefer heroTagline, then first chapter description, then vibeString
  const vibeString = manifest?.vibeString || '';
  const heroTagline = manifest?.poetry?.heroTagline || '';
  const firstChapterDesc = manifest?.chapters?.[0]?.description || '';
  const chapterCount = manifest?.chapters?.length || 0;
  const occasionDescLabel: Record<string, string> = {
    wedding: 'wedding website', anniversary: 'anniversary celebration',
    birthday: 'birthday celebration', engagement: 'engagement celebration', story: 'personal story site',
  };
  const description = heroTagline
    ? `${displayNames} — ${heroTagline.slice(0, 150)}${heroTagline.length > 150 ? '...' : ''}`
    : firstChapterDesc
    ? `${displayNames}'s story — ${firstChapterDesc.slice(0, 140)}${firstChapterDesc.length > 140 ? '...' : ''}`
    : vibeString
    ? `${displayNames}'s love story — ${vibeString.slice(0, 120)}${vibeString.length > 120 ? '...' : ''}`
    : `${displayNames}'s ${occasionDescLabel[occasion] || 'wedding website'}. ${chapterCount} chapters of their story.`;

  // Derive vibeSkin for themed OG image colors & fonts.
  // Guard against malformed skins missing the palette field so metadata
  // generation never crashes on "foreground of undefined".
  const vibeSkin = (manifest?.vibeSkin && manifest.vibeSkin.palette)
    ? manifest.vibeSkin
    : deriveVibeSkin(manifest?.vibeString || '');
  const tagline = manifest?.poetry?.heroTagline || siteConfig.tagline || vibeString || '';

  const siteUrl = `https://${domain}.pearloom.com`;

  // Build themed OG image URL with full palette & font info
  const ogUrl = new URL('/api/og', siteUrl);
  ogUrl.searchParams.set('names', `${names[0]},${names[1]}`);
  ogUrl.searchParams.set('occasion', occasion);
  ogUrl.searchParams.set('date', eventDate || '');
  ogUrl.searchParams.set('tagline', tagline);
  ogUrl.searchParams.set('bg', vibeSkin.palette.background.replace('#', ''));
  ogUrl.searchParams.set('fg', vibeSkin.palette.foreground.replace('#', ''));
  ogUrl.searchParams.set('accent', vibeSkin.palette.accent.replace('#', ''));
  ogUrl.searchParams.set('heading', vibeSkin.fonts.heading);
  ogUrl.searchParams.set('symbol', vibeSkin.accentSymbol || '✦');

  return {
    metadataBase: new URL('https://pearloom.com'),
    title: fullTitle,
    description,
    alternates: {
      canonical: siteUrl,
    },
    icons: {
      icon: '/favicon.ico',
    },
    openGraph: {
      title: shortTitle,
      description,
      url: siteUrl,
      siteName: 'Pearloom',
      type: 'website',
      images: [{ url: ogUrl.toString(), width: 1200, height: 630, alt: `${displayNames}${dateStr ? ` — ${dateStr}` : ''}` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: shortTitle,
      description,
      images: [ogUrl.toString()],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}



// ── Helpers ───────────────────────────────────────────────────

/** Proxy Google Photos URLs through /api/photos/proxy so they load publicly */
function proxyUrl(rawUrl: string, w: number, h: number): string {
  if (!rawUrl) return rawUrl;
  if (rawUrl.includes('googleusercontent.com') || rawUrl.includes('lh3.google')) {
    return `/api/photos/proxy?url=${encodeURIComponent(rawUrl)}&w=${w}&h=${h}`;
  }
  return rawUrl;
}

function getVideoEmbedUrl(url?: string): string | null {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/\s]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?rel=0&showinfo=0&modestbranding=1`;
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}?title=0&byline=0&portrait=0`;
  return null;
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
  const title = safeNames.filter(n => n.trim()).map(n => n.charAt(0).toUpperCase() + n.slice(1)).join(' & ');

  // JSON-LD structured data — event type is dynamic based on occasion
  const occasion = manifest.occasion || 'wedding';
  const occasionEventName: Record<string, string> = {
    wedding: `${title} Wedding`,
    anniversary: `${title} Anniversary Celebration`,
    birthday: `${title} Birthday`,
    engagement: `${title} Engagement`,
    story: title,
  };
  const jsonLdType = occasion === 'wedding' ? 'WeddingEvent'
    : occasion === 'birthday' ? 'SocialEvent'
    : occasion === 'story' ? 'Event'
    : 'SocialEvent';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const canonicalUrl = siteUrl
    ? `${siteUrl.replace(/^https?:\/\//, 'https://')
        .replace(/^(https?:\/\/)/, `$1${domain}.`)}`
    : `https://${domain}.pearloom.com`;
  const vibeString = manifest.vibeString || '';
  const heroTagline = manifest.poetry?.heroTagline || '';
  const jsonLdDesc = heroTagline
    ? `${title} — ${heroTagline}`
    : vibeString
    ? `${title}'s story — ${vibeString.slice(0, 120)}${vibeString.length > 120 ? '...' : ''}`
    : `${title}'s ${occasion} site.`;
  const coverPhotoUrl = manifest.chapters?.[0]?.images?.[0]?.url || '';
  const jsonLd = manifest.events?.length ? {
    '@context': 'https://schema.org',
    '@type': jsonLdType,
    name: occasionEventName[occasion] || `${title} Celebration`,
    description: jsonLdDesc,
    url: canonicalUrl,
    startDate: manifest.events[0].date || manifest.logistics?.date,
    location: manifest.events[0].venue ? {
      '@type': 'Place',
      name: manifest.events[0].venue,
      address: manifest.events[0].address || manifest.logistics?.venueAddress || '',
    } : manifest.logistics?.venue ? {
      '@type': 'Place',
      name: manifest.logistics.venue,
      address: manifest.logistics.venueAddress || '',
    } : undefined,
    organizer: [
      { '@type': 'Person', name: safeNames[0] },
      ...(safeNames[1]?.trim() ? [{ '@type': 'Person', name: safeNames[1] }] : []),
    ],
    ...(coverPhotoUrl ? { image: coverPhotoUrl.startsWith('/') ? `https://pearloom.com${coverPhotoUrl}` : coverPhotoUrl } : {}),
  } : null;

  // Use cached AI skin if available, fall back to deterministic.
  // Also recover from malformed skins (no palette) which would otherwise
  // crash with "Cannot read properties of undefined (reading 'foreground')".
  const vibeSkin = (manifest.vibeSkin && manifest.vibeSkin.palette)
    ? manifest.vibeSkin
    : deriveVibeSkin(manifest.vibeString || '');

  // Derive ALL colors from the AI-generated palette (with contrast enforcement)
  const pal = enforcePaletteContrast(vibeSkin.palette);
  const bgColor = pal.background;
  const cardBg = pal.card;
  const accentLight = pal.accent2;

  // ── Manifest feature fields ──────────────────────────────────
  const parchmentFilter = manifest.parchmentTint && manifest.parchmentTint !== 'none'
    ? { ivory: 'sepia(0.08) saturate(1.1)', linen: 'sepia(0.15) saturate(0.95)', parchment: 'sepia(0.25) saturate(0.85)', sepia: 'sepia(0.4) saturate(0.8)' }[manifest.parchmentTint] || 'none'
    : 'none';
  const showWatermark = manifest.watermark === true;
  const isPrivateGallery = manifest.privateGallery === true;
  const typoPair = manifest.typographyPair;
  const typoPairFonts = typoPair === 'mono-serif' ? { heading: 'JetBrains Mono', body: 'Lora' }
    : typoPair === 'display-body' ? { heading: 'Cormorant Garamond', body: 'Source Sans 3' }
    : typoPair === 'editorial' ? { heading: 'Newsreader', body: 'Newsreader' }
    : null; // null = use vibeSkin fonts (default)

  // When gradient mesh is active, make main transparent so the mesh shows through
  const meshActive = manifest.theme?.effects?.gradientMesh && manifest.theme.effects.gradientMesh.preset !== 'none' && (manifest.theme.effects.gradientMesh.opacity ?? 0) > 0;
  const mainBg = meshActive ? 'transparent' : bgColor;

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

  // Determine cover photo — fall back to AI-generated typographic hero art
  const rawCoverPhoto = manifest.chapters?.[0]?.images?.[0]?.url || '';
  const heroArtParams = new URLSearchParams({
    n1: safeNames[0],
    n2: safeNames[1],
    occasion,
    accent: pal.accent,
    bg: pal.background,
  });
  // Hero image priority: 1) user-uploaded cover, 2) AI-generated art, 3) hero-art API
  const coverPhoto = manifest.coverPhoto || vibeSkin.heroArtDataUrl || `/api/hero-art?${heroArtParams.toString()}`;

  // Memory Film: collect up to 6 chapter images for the cycling hero backdrop
  const filmPhotos = (manifest.chapters || [])
    .flatMap((ch: import('@/types').Chapter) => ch.images || [])
    .slice(0, 6)
    .map((img: { url: string }) => proxyUrl(img.url, 1800, 1200));

  // Build real nav pages from manifest content
  const hidden = new Set(manifest.hiddenPages || []);
  const sitePages = [
    { id: 'story',    slug: 'our-story', label: vibeSkin.sectionLabels?.story || 'Our Story', enabled: true,  order: 0 },
    (!hidden.has('schedule') && manifest.events?.length)
      ? { id: 'schedule', slug: 'schedule', label: 'Schedule',   enabled: true,  order: 1 } : null,
    (!hidden.has('rsvp') && manifest.events?.length)
      ? { id: 'rsvp',     slug: 'rsvp',     label: 'RSVP',       enabled: true,  order: 2 } : null,
    (!hidden.has('registry') && (manifest.registry?.entries?.length || manifest.registry?.cashFundUrl))
      ? { id: 'registry', slug: 'registry', label: 'Registry',   enabled: true,  order: 3 } : null,
    (!hidden.has('travel') && (manifest.travelInfo?.hotels?.length || manifest.travelInfo?.airports?.length))
      ? { id: 'travel',   slug: 'travel',   label: 'Travel',     enabled: true,  order: 4 } : null,
    (!hidden.has('faq') && manifest.faqs?.length)
      ? { id: 'faq',      slug: 'faq',      label: 'FAQ',        enabled: true,  order: 5 } : null,
  ].filter(Boolean) as import('@/types').SitePage[];

  const isPasswordProtected = manifest.comingSoon?.passwordProtected && manifest.comingSoon?.password;

  // ── Binding context for template/binding resolution ──────────────
  const bindingCtx = buildContext(manifest, safeNames, vibeSkin);

  // ── Block renderer: ordered by manifest.blocks ─────────────────
  const renderBlock = (type: string, key: string) => {
    const rawCfg = (manifest.blocks || []).find((b: { id: string }) => b.id === key)?.config || {};
    const blockCfg = resolveBlockConfig(rawCfg, bindingCtx);
    switch (type) {
      case 'hero':
        return (
          <div key={key} style={{ position: 'relative' }}>
            <Hero
              names={safeNames}
              subtitle={(blockCfg.subtitle as string) || siteConfig.tagline || ''}
              coverPhoto={coverPhoto}
              weddingDate={manifest.events?.[0]?.date || manifest.logistics?.date}
              vibeSkin={vibeSkin}
              heroTagline={manifest.poetry?.heroTagline}
              photos={filmPhotos.length > 0 ? filmPhotos : undefined}
            />
            <StickerLayer stickers={manifest.stickers || []} accentColor={pal.accent} />
          </div>
        );
      case 'story':
        return (
          <section key={key} id="our-story" style={{ position: 'relative' }}>
            <StorySection
              chapters={manifest.chapters || []}
              storyLayout={manifest.storyLayout}
              layoutFormat={manifest.layoutFormat}
              chapterIcons={(vibeSkin.chapterIcons || []).map(svg => sanitizeSvg(svg))}
              sectionBorderSvg={vibeSkin.sectionBorderSvg ? sanitizeSvg(vibeSkin.sectionBorderSvg) : undefined}
              medallionSvg={vibeSkin.medallionSvg ? sanitizeSvg(vibeSkin.medallionSvg) : undefined}
              accentColor={pal.accent}
              dateFormat={chapterDateFormatOptions(manifest.dateFormat)}
              transformUrl={(url) => proxyUrl(url, 1600, 1200)}
            />
          </section>
        );
      case 'event':
        if (!manifest.events?.length) return null;
        return (
          <section key={key} id="schedule" style={{ position: 'relative', overflow: 'hidden', background: cardBg }}>
            {vibeSkin.accentBlobSvg && (
              <div
                style={{ position: 'absolute', left: '-8%', bottom: '5%', width: '55%', height: '90%', zIndex: 0, pointerEvents: 'none', opacity: 0.25 }}
                dangerouslySetInnerHTML={{ __html: sanitizeSvg(vibeSkin.accentBlobSvg) }}
              />
            )}
            <WeddingEvents events={manifest.events} title={(blockCfg.title as string) || vibeSkin.sectionLabels.events} />
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
          <section key={key} id="registry" style={{ background: accentLight }}>
            <RegistryShowcase
              registries={manifest.registry?.entries || []}
              cashFundUrl={manifest.registry?.cashFundUrl}
              cashFundMessage={manifest.registry?.cashFundMessage}
              title={(blockCfg.title as string) || vibeSkin.sectionLabels.registry}
            />
          </section>
        );
      case 'travel':
        if (!manifest.travelInfo) return null;
        return (
          <section key={key} id="travel" style={{ background: cardBg }}>
            <TravelSection info={manifest.travelInfo} />
          </section>
        );
      case 'faq':
        if (!manifest.faqs?.length) return null;
        return (
          <section key={key} id="faq">
            <FaqSection faqs={manifest.faqs} />
          </section>
        );
      case 'guestbook':
        if (manifest.features?.guestbook === false) return null;
        return (
          <GuestbookSection
            key={key}
            subdomain={domain}
            vibeSkin={vibeSkin}
            manifest={manifest}
          />
        );
      case 'live':
        return (
          <LiveUpdatesFeed
            key={key}
            subdomain={domain}
            weddingDate={manifest.logistics?.date || manifest.events?.[0]?.date}
            vibeSkin={vibeSkin}
          />
        );
      case 'countdown': {
        const eventDate = manifest.logistics?.date || manifest.events?.[0]?.date;
        if (!eventDate) return null;
        const occasion = manifest.occasion || 'wedding';
        const defaultCountdownLabel = occasion === 'birthday' ? 'Until the celebration!'
          : occasion === 'anniversary' ? 'Until our anniversary!'
          : occasion === 'engagement' ? 'Until the big day!'
          : occasion === 'story' ? 'The moment arrives'
          : 'Until we say I do';
        const countdownLabel = (blockCfg.label as string) || defaultCountdownLabel;
        return (
          <CountdownBlock
            key={key}
            targetDate={eventDate}
            accentColor={pal.accent}
            headingFont={vibeSkin.fonts.heading}
            bodyFont={vibeSkin.fonts.body}
            bgColor={cardBg}
            fgColor={pal.foreground}
            mutedColor={pal.muted}
            label={countdownLabel}
          />
        );
      }
      case 'text': {
        // Accept both 'content' (legacy) and 'text' (CanvasEditor saves as 'text')
        const textContent = (blockCfg.content || blockCfg.text) as string | undefined;
        if (!textContent) return null;
        return (
          <section key={key} style={{ paddingTop: '5rem', paddingBottom: '5rem', paddingLeft: '2rem', paddingRight: '2rem', maxWidth: '800px', margin: '0 auto' }}>
            <p style={{ fontFamily: `"${vibeSkin.fonts.body}", sans-serif`, fontSize: '1.1rem', lineHeight: 1.8, color: pal.foreground, opacity: 0.8, textAlign: 'center' }}>
              {textContent}
            </p>
          </section>
        );
      }
      case 'quote': {
        // Accept 'quote' (legacy) and 'text' (CanvasEditor saves as 'text')
        const customQuote = (blockCfg.quote || blockCfg.text) as string | undefined;
        const quoteText = customQuote || vibeSkin.dividerQuote || manifest.vibeString || '';
        return (
          <section key={key} style={{ paddingTop: '5rem', paddingBottom: '5rem', paddingLeft: '2rem', paddingRight: '2rem', textAlign: 'center', maxWidth: '700px', margin: '0 auto' }}>
            <div style={{ fontSize: '2rem', color: pal.accent, opacity: 0.4, marginBottom: '1rem' }}>{(blockCfg.symbol as string) || vibeSkin.accentSymbol || '\u2726'}</div>
            <p style={{ fontFamily: `"${vibeSkin.fonts.heading}", serif`, fontSize: 'clamp(1.3rem, 3vw, 2rem)', fontWeight: 400, fontStyle: 'italic', lineHeight: 1.65, color: pal.foreground, opacity: 0.75 }}>
              &ldquo;{quoteText}&rdquo;
            </p>
          </section>
        );
      }
      case 'video': {
        const videoEmbedUrl = getVideoEmbedUrl(blockCfg.url as string | undefined);
        return (
          <section key={key} style={{ paddingTop: 'clamp(2rem, 5vw, 5rem)', paddingBottom: 'clamp(2rem, 5vw, 5rem)', paddingLeft: 'clamp(1rem, 4vw, 2rem)', paddingRight: 'clamp(1rem, 4vw, 2rem)', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ aspectRatio: '16/9', borderRadius: '1rem', overflow: 'hidden', background: cardBg, border: `1px solid ${pal.muted}30` }}>
              {videoEmbedUrl ? (
                <iframe
                  src={videoEmbedUrl}
                  title="Wedding video"
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: pal.muted, fontSize: '1rem' }}>Video embed — add YouTube or Vimeo URL in Canvas config</span>
                </div>
              )}
            </div>
          </section>
        );
      }
      case 'map': {
        const mapAddress = (blockCfg.address as string | undefined) || manifest.events?.[0]?.address || manifest.logistics?.venue;
        return (
          <section key={key} style={{ paddingTop: 'clamp(2rem, 5vw, 5rem)', paddingBottom: 'clamp(2rem, 5vw, 5rem)', paddingLeft: 'clamp(1rem, 4vw, 2rem)', paddingRight: 'clamp(1rem, 4vw, 2rem)', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ aspectRatio: '16/9', borderRadius: '1rem', overflow: 'hidden', background: cardBg, border: `1px solid ${pal.muted}30` }}>
              {mapAddress ? (
                <iframe
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(mapAddress)}&output=embed&z=15`}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: pal.muted, fontSize: '1rem' }}>Venue map — add address in Details</span>
                </div>
              )}
            </div>
          </section>
        );
      }
      case 'divider':
        return <WaveDivider key={key} skin={vibeSkin} fromColor={bgColor} toColor={bgColor} height={(blockCfg.height as number) || 60} />;
      case 'photos': {
        if (isPrivateGallery) return null; // Private gallery — hide photos from visitors
        const allPhotos = (manifest.chapters || []).flatMap((ch: import('@/types').Chapter) => ch.images || []).slice(0, 9);
        return (
          <section key={key} style={{ paddingTop: '5rem', paddingBottom: '5rem', paddingLeft: '2rem', paddingRight: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', color: pal.accent, marginBottom: '0.6rem', fontFamily: `"${vibeSkin.fonts.body}", sans-serif` }}>
                {(blockCfg.title as string) || vibeSkin.sectionLabels.photos || 'Our Photos'}
              </div>
              <div style={{ width: '40px', height: '2px', background: pal.accent, margin: '0 auto', opacity: 0.5 }} />
            </div>
            {allPhotos.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
                {allPhotos.map((img: { url: string; alt?: string }, i: number) => (
                  <div key={i} style={{ gridColumn: i === 0 ? 'span 2' : undefined, aspectRatio: i === 0 ? '2/1.2' : '1/1', borderRadius: '0.75rem', overflow: 'hidden', background: cardBg }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={proxyUrl(img.url, 800, 800)} alt={img.alt || ''} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ textAlign: 'center', color: pal.muted, fontSize: '0.9rem' }}>Photos will appear here once added.</p>
            )}
            {/* Wedding day guest photo feed — shown on/after wedding date */}
            {manifest.logistics?.date && (
              <WeddingDayPhotoFeed siteId={domain} vibeSkin={vibeSkin} />
            )}
          </section>
        );
      }
      case 'spotify':
        if (!manifest.spotifyUrl) return null;
        return (
          <SpotifySection
            key={key}
            spotifyUrl={manifest.spotifyUrl}
            playlistName={(blockCfg.title as string) || manifest.spotifyPlaylistName}
            vibeSkin={vibeSkin}
          />
        );
      case 'quiz': {
        const quizChapters = (manifest.chapters || []).filter((ch: import('@/types').Chapter) => ch.quizQuestion);
        if (quizChapters.length === 0) return null;
        return (
          <CoupleQuiz
            key={key}
            chapters={quizChapters}
            vibeSkin={vibeSkin}
            siteId={domain}
            coupleNames={safeNames}
          />
        );
      }
      case 'photoWall':
        return (
          <GuestPhotoWall
            key={key}
            siteId={domain}
            vibeSkin={vibeSkin}
          />
        );
      case 'hashtag': {
        if (!manifest.hashtags?.length) return null;
        return (
          <section key={key} style={{ padding: 'clamp(3rem,6vw,5rem) 2rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: pal.accent, marginBottom: '1rem', fontFamily: `"${vibeSkin.fonts.body}", sans-serif` }}>
              {(blockCfg.title as string) || 'Share the Moment'}
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              {manifest.hashtags.map((tag: string) => (
                <span key={tag} style={{ fontFamily: `"${vibeSkin.fonts.heading}", serif`, fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 600, fontStyle: 'italic', color: pal.foreground }}>
                  #{tag}
                </span>
              ))}
            </div>
          </section>
        );
      }
      case 'gallery':
        return (
          <SiteGallerySection key={key} siteId={domain} coupleNames={safeNames} />
        );
      case 'vibeQuote': {
        const vqText = (blockCfg.text as string) || vibeSkin.dividerQuote || manifest.vibeString || '';
        if (!vqText) return null;
        return (
          <section key={key} style={{ padding: 'clamp(3rem,6vw,6rem) 2rem', textAlign: 'center', maxWidth: '700px', margin: '0 auto' }}>
            <div style={{ fontSize: '2rem', color: pal.accent, opacity: 0.4, marginBottom: '1rem' }}>{(blockCfg.symbol as string) || vibeSkin.accentSymbol || '\u2726'}</div>
            <p style={{ fontFamily: `"${vibeSkin.fonts.heading}", serif`, fontSize: 'clamp(1.2rem, 3vw, 1.8rem)', fontWeight: 400, fontStyle: 'italic', lineHeight: 1.7, color: pal.foreground, opacity: 0.75 }}>
              &ldquo;{vqText}&rdquo;
            </p>
          </section>
        );
      }
      case 'welcome': {
        const welcomeText = (blockCfg.text as string) || manifest.poetry?.welcomeStatement;
        if (!welcomeText) return null;
        return (
          <section key={key} style={{ padding: 'clamp(3rem,6vw,5rem) 2rem', textAlign: 'center', maxWidth: '680px', margin: '0 auto' }}>
            <p style={{ fontFamily: `"${vibeSkin.fonts.body}", sans-serif`, fontSize: '1.05rem', lineHeight: 1.9, color: pal.foreground, opacity: 0.8 }}>
              {welcomeText}
            </p>
          </section>
        );
      }
      case 'anniversary':
        if (!manifest.anniversaryMode) return null;
        return (
          <section key={key} style={{ textAlign: 'center', padding: '1.5rem', background: `${pal.accent}08` }}>
            <p style={{ fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: pal.accent }}>
              {(blockCfg.title as string) || 'Anniversary Edition'}
            </p>
          </section>
        );
      case 'weddingParty':
        if (!manifest.weddingParty?.length) return null;
        return (
          <WeddingPartySection
            key={key}
            members={manifest.weddingParty}
            title={(blockCfg.title as string) || 'Our People'}
            accentColor={pal.accent}
            headingFont={vibeSkin.fonts.heading}
            bodyFont={vibeSkin.fonts.body}
          />
        );
      case 'footer':
        return (
          <footer key={key} style={{ background: pal.foreground, color: `${pal.background}B0`, padding: 'clamp(3rem,6vw,5rem) 2rem 2rem', textAlign: 'center' }}>
            <p style={{ fontFamily: `"${vibeSkin.fonts.heading}", serif`, fontSize: 'clamp(1.2rem,3vw,1.8rem)', fontWeight: 600, fontStyle: 'italic', color: `${pal.background}F0`, marginBottom: '0.75rem' }}>
              {safeNames[1]?.trim() ? `${safeNames[0]} & ${safeNames[1]}` : safeNames[0]}
            </p>
            {manifest.poetry?.closingLine && (
              <p style={{ fontSize: '0.88rem', fontStyle: 'italic', opacity: 0.6, marginBottom: '2rem', maxWidth: '480px', margin: '0 auto 2rem' }}>
                {(blockCfg.text as string) || manifest.poetry.closingLine}
              </p>
            )}
            <p style={{ fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.3, marginTop: '2rem' }}>
              {(blockCfg.subtitle as string) || 'Made with Pearloom'}
            </p>
          </footer>
        );
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
    <div style={{ position: 'relative', zIndex: 10, overflow: 'hidden' }}>
      {/* Nano Banana hero art — full bleed behind the quote, edge-faded with CSS mask */}
      {vibeSkin.heroArtDataUrl && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
            // mask-image fades edges so the solid-background image blends into the page
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%), linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)',
            WebkitMaskComposite: 'source-in',
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%), linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)',
            maskComposite: 'intersect',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={vibeSkin.heroArtDataUrl}
            alt=""
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              opacity: 0.55,
              mixBlendMode: pal.background < '#888' ? 'screen' : 'multiply',
            }}
          />
        </div>
      )}
      {/* SVG blob art fallback when no raster art — right side */}
      {!vibeSkin.heroArtDataUrl && vibeSkin.heroBlobSvg && (
        <div
          style={{ position: 'absolute', right: '-1%', top: '5%', width: '40%', height: '90%', zIndex: 0, pointerEvents: 'none', opacity: 0.35 }}
          dangerouslySetInnerHTML={{ __html: sanitizeSvg(vibeSkin.heroBlobSvg) }}
        />
      )}
      {!vibeSkin.heroArtDataUrl && vibeSkin.heroBlobSvg && (
        <div
          style={{ position: 'absolute', left: '-1%', top: '10%', width: '36%', height: '80%', zIndex: 0, pointerEvents: 'none', opacity: 0.25, transform: 'scaleX(-1)' }}
          dangerouslySetInnerHTML={{ __html: sanitizeSvg(vibeSkin.heroBlobSvg) }}
        />
      )}
      <div style={{ padding: '7rem 2rem 5rem', textAlign: 'center', maxWidth: '900px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Custom medallion ornament */}
        {vibeSkin.medallionSvg && (
          <div
            style={{ width: '80px', height: '80px', margin: '0 auto 2rem', opacity: 0.55 }}
            dangerouslySetInnerHTML={{ __html: sanitizeSvg(vibeSkin.medallionSvg) }}
          />
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', marginBottom: '4rem' }}>
          <span style={{ fontSize: '1.25rem', color: 'var(--pl-olive)', opacity: 0.4 }}>{vibeSkin.decorIcons[1] || vibeSkin.decorIcons[0] || '✦'}</span>
          <div style={{ flex: 1, maxWidth: '80px', height: '1px', background: 'var(--pl-olive)', opacity: 0.2 }} />
          <span style={{ fontSize: '1.75rem', color: 'var(--pl-olive)', opacity: 0.7 }}>{vibeSkin.accentSymbol || vibeSkin.decorIcons[0] || '✦'}</span>
          <div style={{ flex: 1, maxWidth: '80px', height: '1px', background: 'var(--pl-olive)', opacity: 0.2 }} />
          <span style={{ fontSize: '1.25rem', color: 'var(--pl-olive)', opacity: 0.4 }}>{vibeSkin.decorIcons[2] || vibeSkin.decorIcons[0] || '✦'}</span>
        </div>
        <p style={{ fontFamily: 'var(--pl-font-heading)', fontSize: 'clamp(1.4rem, 3vw, 2.2rem)', fontWeight: 400, fontStyle: 'italic', lineHeight: 1.65, color: 'var(--pl-ink)', opacity: 0.75, letterSpacing: '-0.01em' }}>
          &ldquo;{vibeSkin.aiGenerated ? vibeSkin.dividerQuote : manifest.vibeString}&rdquo;
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', marginTop: '4rem' }}>
          <div style={{ flex: 1, maxWidth: '80px', height: '1px', background: 'var(--pl-olive)', opacity: 0.2 }} />
          <span style={{ fontSize: '1.25rem', color: 'var(--pl-olive)', opacity: 0.5 }}>{vibeSkin.decorIcons[3] || '•'}</span>
          <div style={{ flex: 1, maxWidth: '80px', height: '1px', background: 'var(--pl-olive)', opacity: 0.2 }} />
        </div>
      </div>
    </div>
  );

  // Nano Banana art strip — horizontal painted botanical divider between sections
  const ArtStrip = () => {
    if (!vibeSkin.artStripDataUrl) return null;
    return (
      <div
        aria-hidden="true"
        style={{
          width: '100%', height: '120px', position: 'relative', overflow: 'hidden',
          // Fade left/right edges with CSS mask since image has solid background
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
          maskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={vibeSkin.artStripDataUrl}
          alt=""
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            opacity: 0.55,
            mixBlendMode: pal.background < '#888' ? 'screen' : 'multiply',
          }}
        />
      </div>
    );
  };

  // Welcome statement — the couple's personal voice, shown below the vibe quote
  const WelcomeStatement = () => {
    const statement = manifest.poetry?.welcomeStatement;
    if (!statement) return null;
    return (
      <div style={{ padding: '0 2rem 5rem', maxWidth: '680px', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <p style={{
          fontFamily: `"${vibeSkin.fonts.body}", sans-serif`,
          fontSize: 'clamp(1rem, 2.2vw, 1.15rem)',
          lineHeight: 1.85,
          color: pal.foreground,
          opacity: 0.7,
          fontStyle: 'normal',
          letterSpacing: '0.01em',
        }}>
          {statement}
        </p>
      </div>
    );
  };

  // Custom SVG border art rendered between major sections
  const SvgBorder = ({ flip = false }: { flip?: boolean }) =>
    vibeSkin.sectionBorderSvg ? (
      <div
        style={{
          width: '100%', overflow: 'hidden', lineHeight: 0,
          transform: flip ? 'scaleX(-1)' : undefined,
          opacity: 0.5,
        }}
        dangerouslySetInnerHTML={{ __html: sanitizeSvg(vibeSkin.sectionBorderSvg) }}
      />
    ) : null;


  // CSS custom properties derived from the AI-generated palette — applied to the outermost wrapper
  const siteVarsStyle = {
    '--site-bg': pal.background,
    '--site-fg': pal.foreground,
    '--site-accent': pal.accent,
    '--site-accent2': pal.accent2,
    '--site-card': pal.card,
    '--site-muted': pal.muted,
    '--site-highlight': pal.highlight,
    '--site-subtle': pal.subtle,
    '--site-ink': pal.ink,
  } as React.CSSProperties;

  // Map of which block types produce a colored (non-bgColor) background after rendering,
  // so the page can compute the correct fromColor for the next divider.
  const blockExitColor = (type: string): string => {
    switch (type) {
      case 'event': return cardBg;
      case 'registry': return accentLight;
      case 'travel': return cardBg;
      case 'guestbook': return cardBg;
      default: return bgColor;
    }
  };

  // Build the block-driven section list with single wave dividers injected between blocks.
  // This replaces the per-block WaveDivider calls that caused stacked dividers.
  const renderBlockSequence = () => {
    if (!visibleBlocks) return null;
    const result: React.ReactNode[] = [];
    let prevExitColor = bgColor;
    let dividerIdx = 0;

    visibleBlocks.forEach((block) => {
      const rendered = renderBlock(block.type, block.id);
      if (rendered === null) return;

      // Determine what color this block's section uses as its background
      const thisEntryColor = ((): string => {
        switch (block.type) {
          case 'event': return cardBg;
          case 'registry': return accentLight;
          case 'travel': return cardBg;
          case 'guestbook': return cardBg;
          default: return bgColor;
        }
      })();

      // Skip divider before hero (it's the first thing on the page)
      if (block.type !== 'hero') {
        const divAbove = block.blockEffects?.dividerAbove;
        const globalDiv = manifest.theme?.effects?.sectionDivider;
        const useGlobalDiv = globalDiv && globalDiv.style !== 'none';
        if (divAbove) {
          // Per-block custom SVG shape divider chosen in the editor
          result.push(
            <SectionDivider
              key={`divider-before-${block.id}`}
              style={divAbove.style}
              color={thisEntryColor}
              bgColor={prevExitColor}
              height={divAbove.height}
            />
          );
        } else if (useGlobalDiv) {
          // Global section divider from design panel
          const shouldFlip = globalDiv!.flip && dividerIdx % 2 === 1;
          result.push(
            <SectionDivider
              key={`divider-before-${block.id}`}
              style={globalDiv!.style}
              color={thisEntryColor}
              bgColor={prevExitColor}
              height={globalDiv!.height}
              flip={shouldFlip}
              animated={globalDiv!.animated ?? true}
            />
          );
          dividerIdx++;
        } else {
          result.push(
            <WaveDivider
              key={`divider-before-${block.id}`}
              skin={vibeSkin}
              fromColor={prevExitColor}
              toColor={thisEntryColor}
              height={80}
            />
          );
        }
      }

      // Wrap in scroll-reveal container — per-block overrides global
      const blockReveal = block.blockEffects?.scrollReveal;
      const globalReveal = manifest.theme?.effects?.scrollReveal;
      const effectiveReveal = (blockReveal && blockReveal !== 'none') ? blockReveal : globalReveal;
      if (effectiveReveal && effectiveReveal !== 'none' && block.type !== 'hero') {
        result.push(
          <div key={block.id} data-pl-reveal={effectiveReveal}>
            {rendered}
          </div>
        );
      } else {
        result.push(rendered);
      }

      // After hero, inject the vibe quote + welcome statement
      if (block.type === 'hero') {
        result.push(
          ...(manifest.anniversaryMode ? [
            <div key="anniversary-banner" style={{
              textAlign: 'center', fontSize: '0.85rem',
              color: 'var(--pl-olive, #A3B18A)',
              letterSpacing: '0.12em', textTransform: 'uppercase',
              marginTop: '0.5rem', opacity: 0.8,
            }}>
              ✦ Anniversary Edition ✦
            </div>
          ] : []),
          <WaveDivider key="divider-hero-quote" skin={vibeSkin} fromColor={bgColor} toColor={bgColor} height={70} />,
          <SvgBorder key="border-before-quote" />,
          <VibeQuote key="vibe-quote" />,
          ...(manifest.poetry?.welcomeStatement ? [<WelcomeStatement key="welcome-statement" />] : []),
          <ArtStrip key="art-strip" />,
          <SvgBorder key="border-after-quote" flip />
        );
        // vibe quote exits with bgColor
        prevExitColor = bgColor;
      } else {
        prevExitColor = blockExitColor(block.type);
      }
    });

    // Spotify section
    if (manifest.spotifyUrl) {
      result.push(
        <WaveDivider key="divider-before-spotify" skin={vibeSkin} fromColor={prevExitColor} toColor={bgColor} height={80} />,
        <SpotifySection key="spotify" spotifyUrl={manifest.spotifyUrl} playlistName={manifest.spotifyPlaylistName} vibeSkin={vibeSkin} />
      );
      prevExitColor = bgColor;
    }

    // Quiz section
    if (manifest.chapters?.some((c) => c.quizQuestion)) {
      result.push(
        <WaveDivider key="divider-before-quiz" skin={vibeSkin} fromColor={prevExitColor} toColor={bgColor} height={80} />,
        <CoupleQuiz key="quiz" siteId={domain} coupleNames={safeNames} chapters={manifest.chapters} vibeSkin={vibeSkin} />
      );
      prevExitColor = bgColor;
    }

    // Photo Wall section
    if (manifest.features?.photoWall) {
      result.push(
        <GuestPhotoWall key="photo-wall" siteId={domain} vibeSkin={vibeSkin} enabled />
      );
    }

    // Hashtags section
    if (manifest.hashtags && manifest.hashtags.length > 0) {
      result.push(
        <section key="hashtags" style={{ textAlign: 'center', padding: '2rem 1.5rem', opacity: 0.75 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
            {manifest.hashtags.map((tag: string) => (
              <span key={tag} style={{
                fontSize: '0.9rem', fontWeight: 600,
                color: 'var(--pl-olive, #A3B18A)',
                background: 'rgba(163,177,138,0.08)',
                padding: '0.3rem 0.75rem', borderRadius: '999px',
                border: '1px solid rgba(163,177,138,0.2)',
              }}>
                #{tag.replace(/^#/, '')}
              </span>
            ))}
          </div>
        </section>
      );
    }

    // Final divider before the always-present gallery footer
    result.push(
      <WaveDivider key="divider-before-gallery" skin={vibeSkin} fromColor={prevExitColor} toColor={cardBg} height={80} />,
      <SiteGallerySection key="gallery" siteId={domain} coupleNames={safeNames} />,
      <WaveDivider key="divider-after-gallery" skin={vibeSkin} fromColor={cardBg} toColor={bgColor} height={70} inverted />
    );

    return result;
  };

  // Build final theme: merge base theme with vibeSkin palette so colors always come from the AI skin
  const resolvedTheme = {
    ...(manifest.theme || siteConfig.theme || dynamicTheme),
    colors: {
      background: pal.background,
      foreground: pal.foreground,
      accent: pal.accent,
      accentLight: pal.accent2,
      muted: pal.muted,
      cardBg: pal.card,
    },
  };

  const siteContent = (
    <ThemeProvider theme={resolvedTheme}>
      {/* JSON-LD structured data for search engines */}
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
        />
      )}
      {/* Inject AI-selected Google Fonts */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={fontUrl} />

      <div style={{ ...siteVarsStyle, scrollBehavior: 'smooth' }}>
        <SiteNav
          names={safeNames}
          pages={sitePages}
          logoIcon={manifest.logoIcon}
          logoSvg={manifest.logoSvg}
          navStyle={manifest.navStyle}
          navOpacity={manifest.navOpacity}
          navBackground={manifest.navBackground}
          mobileNavStyle={manifest.mobileNavStyle}
          {...(manifest.pageMode === 'single-scroll' ? { pageHrefOverride: (slug: string) => slug === '' ? '#' : `#${slug}` } : {})}
        />

        {manifest.logistics?.date && (
          <WeddingDayBanner
            weddingDate={manifest.logistics.date}
            coupleNames={safeNames}
            vibeSkin={vibeSkin}
          />
        )}

        {manifest.logistics?.date && manifest.events?.length ? (
          <WeddingDayTimeline
            events={manifest.events}
            weddingDate={manifest.logistics.date}
            accentColor={vibeSkin.palette.accent}
            headingFont={vibeSkin.fonts.heading}
            bodyFont={vibeSkin.fonts.body}
          />
        ) : null}

        <CelebrationOverlay
          occasion={(manifest.occasion as 'wedding' | 'engagement' | 'anniversary' | 'birthday' | 'story') || 'wedding'}
          accentColor={pal.accent}
          accentColor2={pal.accent2 || pal.highlight || pal.accent}
        />

        {meshActive && <style>{`body { background: ${bgColor}; }`}</style>}

        {/* AI-generated bespoke background art from the Design panel */}
        {manifest.backgroundPatternCss && (
          <div aria-hidden="true" style={{
            position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
            backgroundImage: manifest.backgroundPatternCss,
            backgroundRepeat: 'repeat', backgroundSize: '400px 400px',
            opacity: 0.12,
          }} />
        )}

        <main style={{ minHeight: '100dvh', paddingBottom: '5rem', background: mainBg, position: 'relative', isolation: 'isolate' }}>
          {visibleBlocks ? (
            // ── BLOCK-DRIVEN layout (Canvas editor controls order) ──
            <>
              {/* Nano Banana ambient art — very subtle full-page painted texture overlay */}
              {vibeSkin.ambientArtDataUrl && (
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
                    overflow: 'hidden',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={vibeSkin.ambientArtDataUrl}
                    alt=""
                    style={{
                      width: '100%', height: '100%', objectFit: 'cover',
                      opacity: 0.30,
                      mixBlendMode: pal.background < '#888' ? 'screen' : 'multiply',
                    }}
                  />
                </div>
              )}
              {/* AI-generated couple motif SVG pattern overlay (used when no raster ambient) */}
              {!vibeSkin.ambientArtDataUrl && vibeSkin.heroPatternSvg && (
                <div
                  style={{
                    position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
                    backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(vibeSkin.heroPatternSvg)}")`,
                    backgroundRepeat: 'repeat', backgroundSize: '220px 220px', opacity: 0.22,
                  }}
                />
              )}
              {/* VibeSkin texture overlay — linen/paper/marble/etc grain */}
              {vibeSkin.texture && vibeSkin.texture !== 'none' && (() => {
                const TEXTURES: Record<string, string> = {
                  linen: `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><path d="M0 0L4 4M4 0L0 4" stroke="#888" stroke-width="0.4" opacity="0.4"/></svg>')}")`,
                  paper: `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="200" height="200" filter="url(#n)" opacity="0.06"/></svg>')}")`,
                  marble: `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><filter id="n"><feTurbulence type="turbulence" baseFrequency="0.015" numOctaves="4" seed="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="200" height="200" filter="url(#n)" opacity="0.05"/></svg>')}")`,
                  starfield: `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><circle cx="10" cy="15" r="0.6" fill="#fff" opacity="0.5"/><circle cx="40" cy="80" r="0.8" fill="#fff" opacity="0.4"/><circle cx="80" cy="30" r="0.5" fill="#fff" opacity="0.6"/><circle cx="120" cy="90" r="0.7" fill="#fff" opacity="0.45"/><circle cx="160" cy="50" r="0.6" fill="#fff" opacity="0.5"/><circle cx="190" cy="140" r="0.8" fill="#fff" opacity="0.4"/><circle cx="60" cy="160" r="0.5" fill="#fff" opacity="0.55"/><circle cx="150" cy="180" r="0.7" fill="#fff" opacity="0.45"/></svg>')}")`,
                  floral: `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60"><g fill="none" stroke="currentColor" stroke-width="0.4" opacity="0.18"><path d="M30 30Q30 20 25 15Q30 20 35 15Q30 20 30 30Z"/><path d="M30 30Q40 30 45 25Q40 30 45 35Q40 30 30 30Z"/><path d="M30 30Q30 40 35 45Q30 40 25 45Q30 40 30 30Z"/><path d="M30 30Q20 30 15 35Q20 30 15 25Q20 30 30 30Z"/><circle cx="30" cy="30" r="3"/></g></svg>')}")`,
                };
                const bg = TEXTURES[vibeSkin.texture];
                if (!bg) return null;
                return (
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
                      backgroundImage: bg,
                      backgroundRepeat: 'repeat',
                      backgroundSize: vibeSkin.texture === 'linen' ? '4px 4px' : vibeSkin.texture === 'floral' ? '60px 60px' : '200px 200px',
                      opacity: vibeSkin.texture === 'starfield' ? 0.4 : 0.6,
                      mixBlendMode: 'multiply',
                    }}
                  />
                );
              })()}
              {/* Mount per-block scroll reveal CSS + observer when any block has it */}
              {visibleBlocks?.some(b => b.blockEffects?.scrollReveal && b.blockEffects.scrollReveal !== 'none') && (
                <PerBlockRevealCSS />
              )}
              {renderBlockSequence()}
            </>
          ) : (
            // ── LEGACY: hardcoded order (no blocks yet) ──
            <>
              <Hero names={safeNames} subtitle={siteConfig.tagline || 'A love story beautifully told.'} coverPhoto={coverPhoto} weddingDate={manifest.events?.[0]?.date || manifest.logistics?.date} vibeSkin={vibeSkin} heroTagline={manifest.poetry?.heroTagline} photos={filmPhotos.length > 0 ? filmPhotos : undefined} />
              {manifest.anniversaryMode && (
                <div style={{
                  textAlign: 'center', fontSize: '0.85rem',
                  color: 'var(--pl-olive, #A3B18A)',
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  marginTop: '0.5rem', opacity: 0.8,
                }}>
                  ✦ Anniversary Edition ✦
                </div>
              )}
              <WaveDivider skin={vibeSkin} fromColor={bgColor} toColor={bgColor} height={70} />
              <VibeQuote />
              <WelcomeStatement />
              <ArtStrip />
              <section id="our-story" style={{ position: 'relative' }}>
                <StorySection
                  chapters={manifest.chapters || []}
                  storyLayout={manifest.storyLayout}
                  layoutFormat={manifest.layoutFormat}
                  chapterIcons={(vibeSkin.chapterIcons || []).map(svg => sanitizeSvg(svg))}
                  sectionBorderSvg={vibeSkin.sectionBorderSvg ? sanitizeSvg(vibeSkin.sectionBorderSvg) : undefined}
                  medallionSvg={vibeSkin.medallionSvg ? sanitizeSvg(vibeSkin.medallionSvg) : undefined}
                  accentColor={pal.accent}
                  dateFormat={chapterDateFormatOptions(manifest.dateFormat)}
                  transformUrl={(url) => proxyUrl(url, 1600, 1200)}
                />
              </section>
              {manifest.events?.length ? (
                <>
                  <WaveDivider skin={vibeSkin} fromColor={bgColor} toColor={cardBg} height={80} />
                  <section id="schedule" style={{ background: cardBg }}><WeddingEvents events={manifest.events} title={vibeSkin.sectionLabels.events} /></section>
                  <WaveDivider skin={vibeSkin} fromColor={cardBg} toColor={bgColor} height={70} inverted />
                </>
              ) : null}
              {manifest.events?.length ? <section id="rsvp"><PublicRsvpSection siteId={domain} events={manifest.events} deadline={manifest.logistics?.rsvpDeadline} mealOptions={manifest.mealOptions} /></section> : null}
              {(manifest.registry?.entries?.length || manifest.registry?.cashFundUrl) ? (
                <>
                  <WaveDivider skin={vibeSkin} fromColor={bgColor} toColor={accentLight} height={80} />
                  <section id="registry" style={{ background: accentLight }}><RegistryShowcase registries={manifest.registry?.entries || []} cashFundUrl={manifest.registry?.cashFundUrl} cashFundMessage={manifest.registry?.cashFundMessage} title={vibeSkin.sectionLabels.registry} /></section>
                  <WaveDivider skin={vibeSkin} fromColor={accentLight} toColor={bgColor} height={70} inverted />
                </>
              ) : null}
              {manifest.travelInfo ? (
                <>
                  <WaveDivider skin={vibeSkin} fromColor={bgColor} toColor={cardBg} height={70} />
                  <section id="travel" style={{ background: cardBg }}><TravelSection info={manifest.travelInfo} /></section>
                  <WaveDivider skin={vibeSkin} fromColor={cardBg} toColor={bgColor} height={70} inverted />
                </>
              ) : null}
              {manifest.faqs?.length ? (
                <>
                  <WaveDivider skin={vibeSkin} fromColor={bgColor} toColor={bgColor} height={70} />
                  <section id="faq"><FaqSection faqs={manifest.faqs} /></section>
                </>
              ) : null}
              {manifest.features?.guestbook !== false && (
                <>
                  <WaveDivider skin={vibeSkin} fromColor={bgColor} toColor={cardBg} height={70} />
                  <GuestbookSection subdomain={domain} vibeSkin={vibeSkin} manifest={manifest} />
                  <WaveDivider skin={vibeSkin} fromColor={cardBg} toColor={bgColor} height={70} inverted />
                </>
              )}
              {manifest.features?.photoWall && (
                <GuestPhotoWall siteId={domain} vibeSkin={vibeSkin} enabled />
              )}
              {manifest.spotifyUrl && (
                <SpotifySection spotifyUrl={manifest.spotifyUrl} playlistName={manifest.spotifyPlaylistName} vibeSkin={vibeSkin} />
              )}
              {manifest.chapters?.some((c) => c.quizQuestion) && (
                <CoupleQuiz siteId={domain} coupleNames={safeNames} chapters={manifest.chapters} vibeSkin={vibeSkin} />
              )}
              {manifest.hashtags && manifest.hashtags.length > 0 && (
                <section style={{ textAlign: 'center', padding: '2rem 1.5rem', opacity: 0.75 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
                    {manifest.hashtags.map((tag: string) => (
                      <span key={tag} style={{
                        fontSize: '0.9rem', fontWeight: 600,
                        color: 'var(--pl-olive, #A3B18A)',
                        background: 'rgba(163,177,138,0.08)',
                        padding: '0.3rem 0.75rem', borderRadius: '999px',
                        border: '1px solid rgba(163,177,138,0.2)',
                      }}>
                        #{tag.replace(/^#/, '')}
                      </span>
                    ))}
                  </div>
                </section>
              )}
              <WaveDivider skin={vibeSkin} fromColor={bgColor} toColor={cardBg} height={80} />
              <SiteGallerySection siteId={domain} coupleNames={safeNames} />
              <WaveDivider skin={vibeSkin} fromColor={cardBg} toColor={bgColor} height={70} inverted />
            </>
          )}

          {manifest.comingSoon && <ComingSoon config={manifest.comingSoon} siteId={domain} />}
        </main>

        <SiteClientSections siteId={domain} coupleNames={safeNames} vibeSkin={vibeSkin} />

        {/* Site footer */}
        <footer style={{
          padding: '3rem 2rem', textAlign: 'center',
          background: pal.foreground, color: `${pal.background}cc`,
          fontSize: '0.75rem', letterSpacing: '0.05em',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Corner decorations on footer */}
          {vibeSkin.cornerFlourishSvg && (
            <>
              <div aria-hidden="true" style={{ position: 'absolute', bottom: 0, left: 0, width: 'min(30vw, 200px)', height: 'min(30vw, 200px)', pointerEvents: 'none', opacity: 0.15, transform: 'scaleY(-1)', filter: 'invert(1)' }} dangerouslySetInnerHTML={{ __html: vibeSkin.cornerFlourishSvg.replace(/opacity="[^"]*"/g, 'opacity="0.5"') }} />
              <div aria-hidden="true" style={{ position: 'absolute', bottom: 0, right: 0, width: 'min(30vw, 200px)', height: 'min(30vw, 200px)', pointerEvents: 'none', opacity: 0.15, transform: 'scale(-1, -1)', filter: 'invert(1)' }} dangerouslySetInnerHTML={{ __html: vibeSkin.cornerFlourishSvg.replace(/opacity="[^"]*"/g, 'opacity="0.5"') }} />
            </>
          )}
          <div style={{ marginBottom: '0.5rem', fontSize: '1rem', opacity: 0.6 }}>{vibeSkin.accentSymbol || '♡'}</div>
          <div style={{
            fontFamily: `"${vibeSkin.fonts.heading}", serif`,
            fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem',
          }}>
            {safeNames[0]}{safeNames[1] ? ` & ${safeNames[1]}` : ''}
          </div>
          {manifest.poetry?.closingLine && (
            <div style={{
              fontFamily: `"${vibeSkin.fonts.heading}", serif`,
              fontSize: '0.75rem', fontStyle: 'italic', opacity: 0.45, marginBottom: '0.75rem',
              maxWidth: '400px', margin: '0 auto 0.75rem',
            }}>
              {manifest.poetry.closingLine}
            </div>
          )}
          <ShareBar
            url={canonicalUrl}
            title={safeNames[0] + (safeNames[1] ? ` & ${safeNames[1]}` : '')}
            accent={pal.accent}
            bgColor={pal.background}
          />
          <div style={{ opacity: 0.35, fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '1rem' }}>Made with Pearloom</div>
        </footer>
        <AnalyticsBeacon siteId={domain} />

        {/* JSON-LD structured data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: generateJsonLd(manifest, safeNames, domain) }}
        />

        {/* Post-event banner */}
        {(() => {
          const postEvent = getPostEventConfig(manifest, safeNames);
          const banner = getPostEventBanner(postEvent);
          if (!banner?.show) return null;
          return (
            <div style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
              padding: '16px 20px',
              background: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(16px)',
              borderTop: `1px solid ${pal.accent}20`,
              textAlign: 'center',
            }}>
              <span style={{ marginRight: '8px' }}>{banner.icon}</span>
              <strong style={{ fontFamily: `"${vibeSkin.fonts.heading}", serif`, fontStyle: 'italic' }}>
                {banner.title}
              </strong>
              <span style={{ color: pal.muted, fontSize: '0.85rem', marginLeft: '8px' }}>
                {banner.subtitle}
              </span>
            </div>
          );
        })()}

        {/* Parchment tint filter — applies to all images */}
        {parchmentFilter !== 'none' && (
          <style>{`[data-pl-site-root] img { filter: ${parchmentFilter}; }`}</style>
        )}

        {/* Typography pair override */}
        {typoPairFonts && (
          <style>{`
            [data-pl-site-root] h1, [data-pl-site-root] h2, [data-pl-site-root] h3 { font-family: "${typoPairFonts.heading}", serif !important; }
            [data-pl-site-root] p, [data-pl-site-root] span { font-family: "${typoPairFonts.body}", sans-serif !important; }
          `}</style>
        )}

        {/* Watermark */}
        {showWatermark && (
          <div style={{
            position: 'fixed', bottom: '12px', right: '12px', zIndex: 40,
            padding: '4px 10px', borderRadius: '100px',
            background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)',
            fontSize: '0.55rem', fontWeight: 600, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: 'rgba(0,0,0,0.3)',
            pointerEvents: 'none',
          }}>
            Hand-curated with Pearloom
          </div>
        )}
      </div>
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


