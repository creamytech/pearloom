import React from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getSiteConfig } from '@/lib/db';
import { buildSiteUrl } from '@/lib/site-urls';
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
import { getEventType } from '@/lib/event-os/event-types';
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
import { AmbientSpotifyPlayer } from '@/components/site/AmbientSpotifyPlayer';
import { StickyRsvpPill } from '@/components/site/StickyRsvpPill';
import { LinkedEventsStrip } from '@/components/site/LinkedEventsStrip';
import { GrooveSiteHero } from '@/components/site/groove/GrooveSiteHero';
import { GrooveSiteStory } from '@/components/site/groove/GrooveSiteStory';
import { GrooveSiteEvents } from '@/components/site/groove/GrooveSiteEvents';
import { GrooveSiteFooter } from '@/components/site/groove/GrooveSiteFooter';
import { GrooveSiteCountdown } from '@/components/site/groove/GrooveSiteCountdown';
import { GrooveSiteFaq } from '@/components/site/groove/GrooveSiteFaq';
import { GrooveSiteWelcome } from '@/components/site/groove/GrooveSiteWelcome';
import { GrooveSiteQuote } from '@/components/site/groove/GrooveSiteQuote';
import { resolveThemeFamily } from '@/lib/event-os/theme-family';
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

  const siteUrl = buildSiteUrl(domain, '', undefined, manifest?.occasion);

  // Build themed OG image URL with full palette & font info.
  // Solo occasions (birthday, memorial, graduation, etc.) pass
  // only the first honoree — the OG route centres a single name
  // without the "&" glyph.
  const ogSoloOccasions = new Set<string>([
    'birthday', 'first-birthday', 'sweet-sixteen', 'milestone-birthday',
    'retirement', 'graduation', 'bar-mitzvah', 'bat-mitzvah', 'quinceanera',
    'baptism', 'first-communion', 'confirmation',
    'memorial', 'funeral', 'gender-reveal', 'sip-and-see', 'bridal-shower',
    'bridal-luncheon', 'baby-shower',
  ]);
  const ogIsSolo = ogSoloOccasions.has(occasion);
  const ogUrl = new URL('/api/og', siteUrl);
  ogUrl.searchParams.set(
    'names',
    ogIsSolo ? names[0] : `${names[0]},${names[1]}`,
  );
  ogUrl.searchParams.set('occasion', occasion);
  // Theme family drives the OG card layout (warm blob + radial
  // for groove, double frame + corner flourishes for editorial).
  ogUrl.searchParams.set('family', resolveThemeFamily(manifest));
  ogUrl.searchParams.set('date', eventDate || '');
  ogUrl.searchParams.set('tagline', tagline);
  ogUrl.searchParams.set('bg', vibeSkin.palette.background.replace('#', ''));
  ogUrl.searchParams.set('fg', vibeSkin.palette.foreground.replace('#', ''));
  ogUrl.searchParams.set('accent', vibeSkin.palette.accent.replace('#', ''));
  ogUrl.searchParams.set('heading', vibeSkin.fonts.heading);
  ogUrl.searchParams.set('symbol', vibeSkin.accentSymbol || '✦');
  // Include the couple's cover photo so social shares show their face,
  // not just a card. Only forward absolute https URLs (Satori restriction).
  const ogPhotoCandidate = manifest?.coverPhoto || manifest?.chapters?.[0]?.images?.[0]?.url || '';
  if (ogPhotoCandidate.startsWith('https://')) {
    ogUrl.searchParams.set('photo', ogPhotoCandidate);
  }

  return {
    metadataBase: new URL('https://pearloom.com'),
    title: fullTitle,
    description,
    alternates: {
      canonical: siteUrl,
    },
    // Per-site PWA manifest — installs to home screen as the couple's
    // site, not Pearloom. The route is at /sites/<domain>/manifest.webmanifest.
    manifest: `/sites/${domain}/manifest.webmanifest`,
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

export default async function SubdomainSite({
  params,
  searchParams,
}: {
  params: Promise<{ domain: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Wait for params as standard in NextJS App Router
  const { domain } = await params;
  const sp = await searchParams;

  // Query Supabase via our DB layer bypassing RLS securely because this is a Server Component!
  const siteConfig = await getSiteConfig(domain);

  // If no subdomain matches in the SaaS database, render 404
  if (!siteConfig || !siteConfig.manifest) {
    return notFound();
  }

  // Apply per-locale translations from manifest.translations[locale]
  // when ?lang=xx is set. Browser-language fallback is intentionally
  // NOT applied server-side — guests on a French Mac viewing a couple's
  // English wedding site should still see English unless the host
  // explicitly chose a default locale (manifest.activeLocale).
  const requestedLocale = (Array.isArray(sp.lang) ? sp.lang[0] : sp.lang) ?? siteConfig.manifest.activeLocale;
  const { applyLocale } = await import('@/lib/i18n/apply-locale');
  const manifest = applyLocale(siteConfig.manifest, requestedLocale ?? null);

  // v8 is the only renderer now. Every published Pearloom site —
  // whether generated by the wizard, created in the editor, or
  // migrated from older drafts — renders through SiteV8Renderer so
  // what you publish matches what you built in the canvas.
  // (Older manifests may carry rendererVersion='v2' / 'classic';
  // we ignore it and render v8 regardless.)
  {
    const { SiteV8Renderer } = await import('@/components/pearloom/site/SiteV8Renderer');
    const { formatSiteDisplayUrl, normalizeOccasion } = await import('@/lib/site-urls');
    const names = Array.isArray(siteConfig.names) && siteConfig.names.length >= 2
      ? ([siteConfig.names[0], siteConfig.names[1]] as [string, string])
      : (['Our', 'Story'] as [string, string]);
    const prettyUrl = formatSiteDisplayUrl(domain, '', normalizeOccasion(manifest.occasion));
    return (
      <SiteV8Renderer manifest={manifest} names={names} siteSlug={domain} prettyUrl={prettyUrl} />
    );
  }
}

