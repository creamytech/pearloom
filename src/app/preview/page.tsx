'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / app/preview/page.tsx
// Real-time preview — mirrors the live site renderer with
// block-driven layout, AI palette, Google Fonts, and SVG art.
// Listens for postMessage from the editor for live updates.
// ─────────────────────────────────────────────────────────────

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState, useEffect, useCallback } from 'react';
import { Hero } from '@/components/hero';
import { Timeline } from '@/components/timeline';
import { ComingSoon } from '@/components/coming-soon';
import { WeddingEvents } from '@/components/wedding-events';
import { RegistryShowcase } from '@/components/registry-showcase';
import { FaqSection } from '@/components/faq-section';
import { TravelSection } from '@/components/travel-section';
import { PublicRsvpSection } from '@/components/public-rsvp-section';
import { EditBridge } from '@/components/preview/EditBridge';
import { ThemeProvider } from '@/components/theme-provider';
import { SiteNav } from '@/components/site-nav';
import { CelebrationOverlay } from '@/components/vibe/CelebrationOverlay';
import { WaveDivider } from '@/components/vibe/WaveDivider';
import { deriveVibeSkin } from '@/lib/vibe-engine';
import { sanitizeSvg } from '@/lib/sanitize-svg';
import type { StoryManifest, SitePage } from '@/types';

// ── Helpers ───────────────────────────────────────────────────

function proxyUrl(rawUrl: string, w: number, h: number): string {
  if (!rawUrl) return '';
  if (rawUrl.includes('googleusercontent.com')) {
    return `/api/photos/proxy?url=${encodeURIComponent(rawUrl)}&w=${w}&h=${h}`;
  }
  return rawUrl;
}

const OCCASION_LABELS: Record<string, string> = {
  wedding: 'Wedding Website',
  anniversary: 'Anniversary',
  engagement: 'Engagement',
  birthday: 'Birthday Celebration',
  story: 'Love Story',
};

function getVideoEmbedUrl(url?: string): string | null {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/\s]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?rel=0&showinfo=0&modestbranding=1`;
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}?title=0&byline=0&portrait=0`;
  return null;
}

// ── Main Preview ──────────────────────────────────────────────

// ── Subpage preview (mirrors [domain]/[page] route) ──────────
function SubpagePreview({ page, manifest, names }: { page: string; manifest: StoryManifest; names: [string, string] }) {
  const vibeSkin = manifest.vibeSkin || deriveVibeSkin(manifest.vibeString || '');
  const pal = vibeSkin.palette;
  const bgColor = pal.background;
  const cardBg = pal.card;
  const fontUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(vibeSkin.fonts.heading)}:ital,wght@0,400;0,600;0,700;1,400&family=${encodeURIComponent(vibeSkin.fonts.body)}:wght@300;400;500;600&display=swap`;
  const sitePages: SitePage[] = [
    { id: 'story', slug: 'our-story', label: 'Our Story', enabled: true, order: 0 },
    ...(manifest.events?.length ? [{ id: 'schedule', slug: 'schedule', label: 'Schedule', enabled: true, order: 1 }] : []),
    ...(manifest.events?.length ? [{ id: 'rsvp', slug: 'rsvp', label: 'RSVP', enabled: true, order: 2 }] : []),
    ...((manifest.registry?.entries?.length || manifest.registry?.cashFundUrl) ? [{ id: 'registry', slug: 'registry', label: 'Registry', enabled: true, order: 3 }] : []),
    ...((manifest.travelInfo?.hotels?.length || manifest.travelInfo?.airports?.length) ? [{ id: 'travel', slug: 'travel', label: 'Travel', enabled: true, order: 4 }] : []),
    ...(manifest.faqs?.length ? [{ id: 'faq', slug: 'faq', label: 'FAQ', enabled: true, order: 5 }] : []),
  ];
  const dynamicTheme = {
    name: 'pearloom-ai',
    fonts: { heading: vibeSkin.fonts.heading, body: vibeSkin.fonts.body },
    colors: { background: pal.background, foreground: pal.foreground, accent: pal.accent, accentLight: pal.accent2, muted: pal.muted, cardBg: pal.card },
    borderRadius: '1rem',
  };

  const PageHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div style={{ padding: '5rem 2rem 3rem', background: bgColor, textAlign: 'center', borderBottom: `1px solid rgba(0,0,0,0.06)` }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <div style={{ fontFamily: `"${vibeSkin.fonts.heading}", serif`, fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', fontWeight: 400, letterSpacing: '-0.025em', color: pal.foreground, marginBottom: '0.75rem' }}>
          {title}
        </div>
        {subtitle && <p style={{ color: pal.muted, fontSize: '1rem', fontStyle: 'italic' }}>{subtitle}</p>}
      </div>
    </div>
  );

  let content: React.ReactNode = null;
  if (page === 'schedule' && manifest.events?.length) {
    content = <><PageHeader title="The Schedule" /><WaveDivider skin={vibeSkin} fromColor={bgColor} toColor={cardBg} height={60} /><WeddingEvents events={manifest.events} title={vibeSkin.sectionLabels.events} /></>;
  } else if (page === 'rsvp' && manifest.events?.length) {
    content = <><PageHeader title="RSVP" subtitle={manifest.logistics?.rsvpDeadline ? `Please respond by ${new Date(manifest.logistics.rsvpDeadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : 'Let us know if you can make it.'} /><WaveDivider skin={vibeSkin} fromColor={bgColor} toColor={cardBg} height={60} /><PublicRsvpSection siteId="preview" events={manifest.events} deadline={manifest.logistics?.rsvpDeadline} /></>;
  } else if (page === 'registry' && (manifest.registry?.entries?.length || manifest.registry?.cashFundUrl)) {
    content = <><PageHeader title="Registry" /><WaveDivider skin={vibeSkin} fromColor={bgColor} toColor={pal.accent2} height={60} /><RegistryShowcase registries={manifest.registry?.entries || []} cashFundUrl={manifest.registry?.cashFundUrl} cashFundMessage={manifest.registry?.cashFundMessage} title={vibeSkin.sectionLabels.registry} /></>;
  } else if (page === 'travel' && (manifest.travelInfo?.hotels?.length || manifest.travelInfo?.airports?.length)) {
    content = <><PageHeader title="Travel & Hotels" subtitle="Everything you need to plan your trip." /><TravelSection info={manifest.travelInfo!} /></>;
  } else if (page === 'faq' && manifest.faqs?.length) {
    content = <><PageHeader title="FAQ" /><FaqSection faqs={manifest.faqs} /></>;
  } else {
    // Custom page or page with no content yet
    const customPage = manifest.customPages?.find(p => p.slug === page);
    content = (
      <div style={{ padding: '8rem 2rem', textAlign: 'center' }}>
        <div style={{ fontFamily: `"${vibeSkin.fonts.heading}", serif`, fontSize: '2rem', color: pal.foreground, marginBottom: '1rem' }}>
          {customPage?.title || page}
        </div>
        <p style={{ color: pal.muted, fontStyle: 'italic' }}>
          {customPage ? 'Custom page — add content in the Canvas tab.' : 'No content yet for this page.'}
        </p>
      </div>
    );
  }

  return (
    <ThemeProvider theme={manifest.theme || dynamicTheme}>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={fontUrl} />
      <SiteNav names={names} pages={sitePages} logoIcon={manifest.logoIcon} logoSvg={manifest.logoSvg} />
      <main style={{ minHeight: '100dvh', paddingBottom: '5rem', background: bgColor }}>
        {content}
      </main>
    </ThemeProvider>
  );
}

function PreviewContent() {
  const searchParams = useSearchParams();

  // Initial load from sessionStorage
  const initial = useMemo(() => {
    try {
      const key = searchParams.get('key');
      if (key && typeof window !== 'undefined') {
        const stored = sessionStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          return { manifest: parsed.manifest as StoryManifest, names: parsed.names as [string, string] };
        }
      }
      const raw = searchParams.get('data');
      if (!raw) return { manifest: null, names: ['', ''] as [string, string] };
      const parsed = JSON.parse(decodeURIComponent(raw));
      return { manifest: parsed.manifest as StoryManifest, names: parsed.names as [string, string] };
    } catch {
      return { manifest: null, names: ['', ''] as [string, string] };
    }
  }, [searchParams]);

  const [manifest, setManifest] = useState<StoryManifest | null>(initial.manifest);
  const [names, setNames] = useState<[string, string]>(initial.names);

  const [editMode, setEditMode] = useState(false);

  // Listen for live editor updates via postMessage
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'pearloom-preview-update') {
        setManifest(event.data.manifest);
        if (event.data.names) setNames(event.data.names);
      }
      // Edit mode activation from parent editor
      if (event.data?.type === 'pearloom-edit-mode') {
        setEditMode(!!event.data.enabled);
      }
      // Also check sessionStorage on focus (fallback)
      if (event.data?.type === 'pearloom-preview-refresh') {
        const key = searchParams.get('key');
        if (key) {
          const stored = sessionStorage.getItem(key);
          if (stored) {
            const parsed = JSON.parse(stored);
            setManifest(parsed.manifest);
            if (parsed.names) setNames(parsed.names);
          }
        }
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [searchParams]);

  if (!manifest) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F1E8' }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 300, letterSpacing: '0.04em', color: '#2B2B2B', marginBottom: '0.75rem' }}>
            Preview
          </h1>
          <p style={{ color: '#9A9488', fontSize: '0.95rem' }}>
            No story data yet. Generate your story from the dashboard.
          </p>
        </div>
      </div>
    );
  }

  // Per-page preview — renders the subpage view when ?page= is set
  const previewPageSlug = searchParams.get('page');
  if (previewPageSlug && previewPageSlug !== 'our-story') {
    return <SubpagePreview page={previewPageSlug} manifest={manifest} names={names} />;
  }

  // Derive visual skin
  const vibeSkin = manifest.vibeSkin || deriveVibeSkin(manifest.vibeString || '');
  const pal = vibeSkin.palette;
  const bgColor = pal.background;
  const cardBg = pal.card;
  const accentLight = pal.accent2;

  // Build dynamic theme from AI palette
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

  // Google Fonts URL
  const fontUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(vibeSkin.fonts.heading)}:ital,wght@0,400;0,600;0,700;1,400&family=${encodeURIComponent(vibeSkin.fonts.body)}:wght@300;400;500;600&display=swap`;

  const rawCoverPhoto = manifest.chapters?.[0]?.images?.[0]?.url || '';
  const occasion = manifest.occasion || 'wedding';
  const safeNames = [names[0] || 'Celebrating', names[1] || ''];
  const heroArtParams = new URLSearchParams({
    n1: safeNames[0], n2: safeNames[1],
    occasion, accent: pal.accent, bg: pal.background,
  });
  const proxiedCover = rawCoverPhoto
    ? proxyUrl(rawCoverPhoto, 1920, 1080)
    : `/api/hero-art?${heroArtParams.toString()}`;

  // Build nav pages — only show pages that have real content
  const sitePages: SitePage[] = [
    { id: 'story', slug: 'our-story', label: 'Our Story', enabled: true, order: 0 },
    ...(manifest.events?.length ? [{ id: 'schedule', slug: 'schedule', label: 'Schedule', enabled: true, order: 1 }] : []),
    ...(manifest.events?.length ? [{ id: 'rsvp', slug: 'rsvp', label: 'RSVP', enabled: true, order: 2 }] : []),
    ...((manifest.registry?.entries?.length || manifest.registry?.cashFundUrl) ? [{ id: 'registry', slug: 'registry', label: 'Registry', enabled: true, order: 3 }] : []),
    ...((manifest.travelInfo?.hotels?.length || manifest.travelInfo?.airports?.length) ? [{ id: 'travel', slug: 'travel', label: 'Travel', enabled: true, order: 4 }] : []),
    ...(manifest.faqs?.length ? [{ id: 'faq', slug: 'faq', label: 'FAQ', enabled: true, order: 5 }] : []),
  ];

  // ── Block renderer (mirrors live site) ────────────────────────
  const renderBlock = (type: string, key: string) => {
    const blockCfg = visibleBlocks?.find(b => b.id === key)?.config || {};
    switch (type) {
      case 'hero':
        return (
          <Hero
            key={key}
            names={names}
            subtitle={manifest.chapters?.[0]?.subtitle || `${manifest.chapters?.length || 0} chapters of your love story`}
            coverPhoto={proxiedCover}
            weddingDate={manifest.events?.[0]?.date || manifest.logistics?.date}
            vibeSkin={vibeSkin}
            heroTagline={manifest.poetry?.heroTagline}
          />
        );
      case 'story':
        return <section key={key} id="our-story"><Timeline chapters={manifest.chapters || []} layoutFormat={manifest.layoutFormat} /></section>;
      case 'event':
        if (!manifest.events?.length) return null;
        return (
          <section key={key} id="schedule" style={{ position: 'relative', overflow: 'hidden' }}>
            {vibeSkin.accentBlobSvg && (
              <div
                style={{ position: 'absolute', left: '-8%', bottom: '5%', width: '55%', height: '90%', zIndex: 0, pointerEvents: 'none', opacity: 0.16 }}
                dangerouslySetInnerHTML={{ __html: sanitizeSvg(vibeSkin.accentBlobSvg) }}
              />
            )}
            <WaveDivider skin={vibeSkin} fromColor={bgColor} toColor={cardBg} height={80} />
            <WeddingEvents events={manifest.events} title={vibeSkin.sectionLabels.events} />
            <WaveDivider skin={vibeSkin} fromColor={cardBg} toColor={bgColor} height={70} inverted />
          </section>
        );
      case 'rsvp':
        if (!manifest.events?.length) return null;
        return (
          <section key={key} id="rsvp" data-pe-section="rsvp" data-pe-label="RSVP">
            <PublicRsvpSection siteId="preview" events={manifest.events} deadline={manifest.logistics?.rsvpDeadline} />
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
      case 'countdown':
        if (!manifest.logistics?.date) return null;
        return (
          <section key={key} id="countdown" data-pe-section="countdown" data-pe-label="Countdown" style={{ padding: '4rem 2rem', textAlign: 'center', background: cardBg }}>
            <div style={{ fontFamily: `"${vibeSkin.fonts.heading}", serif`, fontSize: 'clamp(1.4rem, 3vw, 2rem)', color: pal.foreground, opacity: 0.8 }}>
              <CountdownDisplay targetDate={manifest.logistics.date} accentColor={pal.accent} />
            </div>
          </section>
        );
      case 'text': {
        const textContent = blockCfg.content as string | undefined;
        if (!textContent) return null;
        return (
          <section key={key} data-pe-section="text" data-pe-label="Text" style={{ padding: '4rem 2rem', maxWidth: '800px', margin: '0 auto' }}>
            <p data-pe-editable="true" data-pe-field="content" style={{ fontFamily: `"${vibeSkin.fonts.body}", sans-serif`, fontSize: '1.1rem', lineHeight: 1.8, color: pal.foreground, opacity: 0.8, textAlign: 'center' }}>
              {textContent}
            </p>
          </section>
        );
      }
      case 'quote':
        return (
          <section key={key} data-pe-section="quote" data-pe-label="Quote" style={{ padding: '5rem 2rem', textAlign: 'center', maxWidth: '700px', margin: '0 auto' }}>
            <div style={{ fontSize: '2rem', color: pal.accent, opacity: 0.4, marginBottom: '1rem' }}>{vibeSkin.accentSymbol || '✦'}</div>
            <p style={{
              fontFamily: `"${vibeSkin.fonts.heading}", serif`,
              fontSize: 'clamp(1.3rem, 3vw, 2rem)', fontWeight: 400, fontStyle: 'italic',
              lineHeight: 1.65, color: pal.foreground, opacity: 0.75,
            }}>
              &ldquo;{vibeSkin.dividerQuote || manifest.vibeString || 'Love is composed of a single soul inhabiting two bodies.'}&rdquo;
            </p>
          </section>
        );
      case 'video': {
        const videoEmbedUrl = getVideoEmbedUrl(blockCfg.url as string | undefined);
        if (!videoEmbedUrl) return null;
        return (
          <section key={key} data-pe-section="video" data-pe-label="Video" style={{ padding: '3rem 2rem', maxWidth: '960px', margin: '0 auto' }}>
            <div style={{ aspectRatio: '16/9', borderRadius: '1rem', overflow: 'hidden', boxShadow: `0 24px 80px ${pal.foreground}18` }}>
              <iframe
                src={videoEmbedUrl}
                style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </section>
        );
      }
      case 'map': {
        const mapAddress = (blockCfg.address as string | undefined) || manifest.events?.[0]?.address || manifest.logistics?.venue;
        if (!mapAddress) return null;
        return (
          <section key={key} data-pe-section="map" data-pe-label="Map" style={{ padding: '3rem 2rem', maxWidth: '960px', margin: '0 auto' }}>
            <div style={{ aspectRatio: '16/9', borderRadius: '1rem', overflow: 'hidden', boxShadow: `0 24px 80px ${pal.foreground}18` }}>
              <iframe
                src={`https://maps.google.com/maps?q=${encodeURIComponent(mapAddress)}&output=embed&z=15`}
                style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                loading="lazy"
                title="Venue map"
              />
            </div>
          </section>
        );
      }
      case 'divider':
        return <WaveDivider key={key} skin={vibeSkin} fromColor={bgColor} toColor={bgColor} height={60} />;
      case 'photos': {
        const allPhotos = manifest.chapters?.flatMap(ch => ch.images || []).slice(0, 9) || [];
        return (
          <section key={key} data-pe-section="photos" data-pe-label="Photos" style={{ padding: '4rem 2rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              <div style={{ fontFamily: `"${vibeSkin.fonts.heading}", serif`, fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', fontWeight: 600, color: pal.foreground, marginBottom: '0.5rem' }}>
                {vibeSkin.sectionLabels?.story || 'Our Photos'}
              </div>
              <div style={{ width: '40px', height: '2px', background: pal.accent, margin: '0 auto', opacity: 0.5 }} />
            </div>
            {allPhotos.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px', maxWidth: '960px', margin: '0 auto' }}>
                {allPhotos.map((photo, i) => (
                  <div key={i} style={{
                    aspectRatio: i === 0 ? '2/1' : '1',
                    gridColumn: i === 0 ? 'span 2' : undefined,
                    borderRadius: '10px', overflow: 'hidden',
                    boxShadow: `0 8px 30px ${pal.foreground}12`,
                  }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={proxyUrl(photo.url, 800, 600)} alt={photo.alt || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      }
      case 'guestbook':
        return (
          <section key={key} data-pe-section="guestbook" data-pe-label="Guestbook" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <div style={{
              fontFamily: `"${vibeSkin.fonts.heading}", serif`,
              fontSize: '1.5rem', fontWeight: 600, color: pal.foreground, marginBottom: '1rem',
            }}>
              Guestbook
            </div>
            <p style={{ color: pal.muted, fontSize: '0.9rem', fontStyle: 'italic' }}>Messages from your guests will be shown here.</p>
          </section>
        );
      default:
        return null;
    }
  };

  // Block-driven or legacy
  const visibleBlocks = manifest.blocks && manifest.blocks.length > 0
    ? [...manifest.blocks].sort((a, b) => a.order - b.order).filter(b => b.visible !== false)
    : null;

  // Vibe quote section — mirrors live site art rendering
  const VibeQuote = () => (
    <div style={{ position: 'relative', padding: '6rem 0 5rem', textAlign: 'center', overflow: 'hidden', zIndex: 10 }}>
      {/* Nano Banana hero art — full bleed behind quote, edge-faded */}
      {vibeSkin.heroArtDataUrl && (
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%), linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)',
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%), linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)',
          WebkitMaskComposite: 'source-in', maskComposite: 'intersect',
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={vibeSkin.heroArtDataUrl} alt="" role="presentation" style={{
            width: '100%', height: '100%', objectFit: 'cover',
            opacity: 0.50, mixBlendMode: pal.background < '#888' ? 'screen' : 'multiply',
          }} />
        </div>
      )}
      {/* SVG blob art fallback when no raster art */}
      {!vibeSkin.heroArtDataUrl && vibeSkin.heroBlobSvg && (
        <div style={{ position: 'absolute', right: '-1%', top: '5%', width: '40%', height: '90%', zIndex: 0, pointerEvents: 'none', opacity: 0.35 }}
          dangerouslySetInnerHTML={{ __html: sanitizeSvg(vibeSkin.heroBlobSvg) }} />
      )}
      {!vibeSkin.heroArtDataUrl && vibeSkin.heroBlobSvg && (
        <div style={{ position: 'absolute', left: '-1%', top: '10%', width: '36%', height: '80%', zIndex: 0, pointerEvents: 'none', opacity: 0.25, transform: 'scaleX(-1)' }}
          dangerouslySetInnerHTML={{ __html: sanitizeSvg(vibeSkin.heroBlobSvg) }} />
      )}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '900px', margin: '0 auto', padding: '0 2rem' }}>
        {vibeSkin.medallionSvg && (
          <div style={{ width: '80px', height: '80px', margin: '0 auto 2rem', opacity: 0.55 }}
            dangerouslySetInnerHTML={{ __html: sanitizeSvg(vibeSkin.medallionSvg) }} />
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', marginBottom: '2.5rem' }}>
          <div style={{ flex: 1, maxWidth: '80px', height: '1px', background: pal.accent, opacity: 0.3 }} />
          <span style={{ fontSize: '1.5rem', color: pal.accent, opacity: 0.7 }}>{vibeSkin.accentSymbol || '✦'}</span>
          <div style={{ flex: 1, maxWidth: '80px', height: '1px', background: pal.accent, opacity: 0.3 }} />
        </div>
        <p style={{
          fontFamily: `"${vibeSkin.fonts.heading}", serif`,
          fontSize: 'clamp(1.2rem, 2.5vw, 1.9rem)', fontWeight: 400, fontStyle: 'italic',
          lineHeight: 1.7, color: pal.foreground, opacity: 0.78,
        }}>
          &ldquo;{vibeSkin.aiGenerated ? vibeSkin.dividerQuote : manifest.vibeString}&rdquo;
        </p>
      </div>
    </div>
  );

  // Art strip — horizontal painted botanical divider
  const ArtStrip = () => {
    if (!vibeSkin.artStripDataUrl) return null;
    return (
      <div aria-hidden="true" style={{
        width: '100%', height: '120px', position: 'relative', overflow: 'hidden',
        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
        maskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={vibeSkin.artStripDataUrl} alt="" role="presentation" style={{
          width: '100%', height: '100%', objectFit: 'cover',
          opacity: 0.55, mixBlendMode: pal.background < '#888' ? 'screen' : 'multiply',
        }} />
      </div>
    );
  };

  // Welcome statement — couple's personal voice
  const WelcomeStatement = () => {
    const statement = manifest.poetry?.welcomeStatement;
    if (!statement) return null;
    return (
      <div style={{ padding: '0 2rem 5rem', maxWidth: '680px', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <p style={{
          fontFamily: `"${vibeSkin.fonts.body}", sans-serif`,
          fontSize: 'clamp(1rem, 2.2vw, 1.15rem)', lineHeight: 1.85,
          color: pal.foreground, opacity: 0.7,
        }}>
          {statement}
        </p>
      </div>
    );
  };

  return (
    <ThemeProvider theme={manifest.theme || dynamicTheme}>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={fontUrl} />

      <EditBridge enabled={editMode} />
      <SiteNav names={names} pages={sitePages} logoIcon={manifest.logoIcon} logoSvg={manifest.logoSvg} />

      <CelebrationOverlay
        occasion={(manifest.occasion as 'wedding' | 'engagement' | 'anniversary' | 'birthday' | 'story') || 'wedding'}
        accentColor={pal.accent}
        accentColor2={pal.accent2 || pal.highlight || pal.accent}
      />

      <main style={{ minHeight: '100dvh', paddingBottom: '5rem', background: bgColor, position: 'relative', isolation: 'isolate' }}>
        {visibleBlocks ? (
          <>
            {/* Ambient art overlay — very subtle painted page texture */}
            {vibeSkin.ambientArtDataUrl ? (
              <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={vibeSkin.ambientArtDataUrl} alt="" role="presentation" style={{
                  width: '100%', height: '100%', objectFit: 'cover',
                  opacity: 0.28, mixBlendMode: pal.background < '#888' ? 'screen' : 'multiply',
                }} />
              </div>
            ) : vibeSkin.heroPatternSvg ? (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
                backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(vibeSkin.heroPatternSvg)}")`,
                backgroundRepeat: 'repeat', backgroundSize: '220px 220px', opacity: 0.22,
              }} />
            ) : null}
            {visibleBlocks.map(block => renderBlock(block.type, block.id))}
            {visibleBlocks[0]?.type === 'hero' && (
              <>
                <WaveDivider skin={vibeSkin} fromColor={bgColor} toColor={bgColor} height={70} />
                <VibeQuote />
                <WelcomeStatement />
                <ArtStrip />
              </>
            )}
          </>
        ) : (
          <>
            <Hero names={names} subtitle={manifest.chapters?.[0]?.subtitle || 'A love story beautifully told.'} coverPhoto={proxiedCover} weddingDate={manifest.events?.[0]?.date || manifest.logistics?.date} vibeSkin={vibeSkin} heroTagline={manifest.poetry?.heroTagline} />
            <WaveDivider skin={vibeSkin} fromColor={bgColor} toColor={bgColor} height={70} />
            <VibeQuote />
            <WelcomeStatement />
            <ArtStrip />
            <section id="our-story"><Timeline chapters={manifest.chapters || []} layoutFormat={manifest.layoutFormat} /></section>
            {manifest.events?.length ? <><WaveDivider skin={vibeSkin} fromColor={bgColor} toColor={cardBg} height={80} /><section id="schedule"><WeddingEvents events={manifest.events} title={vibeSkin.sectionLabels.events} /></section><WaveDivider skin={vibeSkin} fromColor={cardBg} toColor={bgColor} height={70} inverted /></> : null}
            {manifest.events?.length ? <section id="rsvp"><PublicRsvpSection siteId="preview" events={manifest.events} deadline={manifest.logistics?.rsvpDeadline} /></section> : null}
            {(manifest.registry?.entries?.length || manifest.registry?.cashFundUrl) ? <><WaveDivider skin={vibeSkin} fromColor={bgColor} toColor={accentLight} height={80} /><section id="registry"><RegistryShowcase registries={manifest.registry?.entries || []} cashFundUrl={manifest.registry?.cashFundUrl} cashFundMessage={manifest.registry?.cashFundMessage} title={vibeSkin.sectionLabels.registry} /></section></> : null}
            {manifest.travelInfo ? <section id="travel"><TravelSection info={manifest.travelInfo} /></section> : null}
            {manifest.faqs?.length ? <section id="faq"><FaqSection faqs={manifest.faqs} /></section> : null}
          </>
        )}

        {manifest.comingSoon && <ComingSoon config={manifest.comingSoon} siteId="preview" />}
      </main>

      {/* Site footer */}
      <footer style={{
        padding: '3rem 2rem', textAlign: 'center', background: pal.foreground,
        color: `${pal.background}cc`, fontSize: '0.75rem', letterSpacing: '0.05em',
      }}>
        <div style={{ marginBottom: '0.5rem', fontSize: '1rem', opacity: 0.6 }}>{vibeSkin.accentSymbol || '♡'}</div>
        <div style={{ fontFamily: `"${vibeSkin.fonts.heading}", serif`, fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>
          {names[0]} & {names[1]}
        </div>
        <div style={{ opacity: 0.5 }}>Made with Pearloom</div>
      </footer>
    </ThemeProvider>
  );
}

// ── Countdown widget ─────────────────────────────────────────
function CountdownDisplay({ targetDate, accentColor }: { targetDate: string; accentColor: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const target = new Date(targetDate).getTime();
  const diff = Math.max(0, target - now);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  if (diff <= 0) return <span style={{ color: accentColor }}>Today is the day!</span>;

  const unitStyle: React.CSSProperties = {
    display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
    margin: '0 0.75rem',
  };
  const numStyle: React.CSSProperties = {
    fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 700, color: accentColor,
    lineHeight: 1, fontVariantNumeric: 'tabular-nums',
  };
  const lblStyle: React.CSSProperties = {
    fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const,
    opacity: 0.4,
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap' }}>
      <div style={unitStyle}><span style={numStyle}>{days}</span><span style={lblStyle}>Days</span></div>
      <div style={unitStyle}><span style={numStyle}>{hours}</span><span style={lblStyle}>Hours</span></div>
      <div style={unitStyle}><span style={numStyle}>{minutes}</span><span style={lblStyle}>Min</span></div>
      <div style={unitStyle}><span style={numStyle}>{seconds}</span><span style={lblStyle}>Sec</span></div>
    </div>
  );
}

export default function PreviewPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: '#9A9488' }}>Loading preview…</p>
        </div>
      }
    >
      <PreviewContent />
    </Suspense>
  );
}
