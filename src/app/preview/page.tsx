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
import { SectionDivider } from '@/components/effects/SectionDivider';
import { deriveVibeSkin } from '@/lib/vibe-engine';
import { sanitizeSvg } from '@/lib/sanitize-svg';
import type { StoryManifest, SitePage } from '@/types';
import { StickerLayer } from '@/components/site-stickers/StickerLayer';

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
function SubpagePreview({ page, manifest, names, rawParams }: { page: string; manifest: StoryManifest; names: [string, string]; rawParams?: string }) {
  const vibeSkin = manifest.vibeSkin || deriveVibeSkin(manifest.vibeString || '');
  const pal = vibeSkin.palette;
  const bgColor = pal.background;
  const cardBg = pal.card;
  const subMeshActive = manifest.theme?.effects?.gradientMesh && manifest.theme.effects.gradientMesh.preset !== 'none' && (manifest.theme.effects.gradientMesh.opacity ?? 0) > 0;
  const fontUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(vibeSkin.fonts.heading)}:ital,wght@0,400;0,600;0,700;1,400&family=${encodeURIComponent(vibeSkin.fonts.body)}:wght@300;400;500;600&display=swap`;
  const sitePages: SitePage[] = [
    { id: 'story', slug: 'our-story', label: vibeSkin.sectionLabels?.story || 'Our Story', enabled: true, order: 0 },
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
    <ThemeProvider theme={{ ...dynamicTheme, ...manifest.theme, colors: { ...dynamicTheme.colors, ...(manifest.theme?.colors || {}) }, effects: manifest.theme?.effects }}>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={fontUrl} />
      {subMeshActive && <style>{`body { background: ${bgColor}; }`}</style>}
      <main style={{ minHeight: '100dvh', paddingBottom: '5rem', background: subMeshActive ? 'transparent' : bgColor }}>
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
    return <SubpagePreview page={previewPageSlug} manifest={manifest} names={names} rawParams={searchParams.toString()} />;
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
  // Hero image priority: 1) user-uploaded cover, 2) AI-generated art, 3) hero-art API
  const heroArtParams = new URLSearchParams({
    n1: safeNames[0], n2: safeNames[1],
    occasion, accent: pal.accent, bg: pal.background,
  });
  const proxiedCover = manifest.coverPhoto
    || vibeSkin.heroArtDataUrl
    || `/api/hero-art?${heroArtParams.toString()}`;

  // Build nav pages — only show pages that have real content
  const sitePages: SitePage[] = [
    { id: 'story', slug: 'our-story', label: vibeSkin.sectionLabels?.story || 'Our Story', enabled: true, order: 0 },
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
          <div key={key} style={{ position: 'relative' }}>
            <Hero
              names={names}
              subtitle={manifest.chapters?.[0]?.subtitle || `${manifest.chapters?.length || 0} chapters of your love story`}
              coverPhoto={proxiedCover}
              weddingDate={manifest.events?.[0]?.date || manifest.logistics?.date}
              vibeSkin={vibeSkin}
              heroTagline={manifest.poetry?.heroTagline}
            />
            <StickerLayer stickers={manifest.stickers || []} accentColor={pal.accent} />
          </div>
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
            <WeddingEvents events={manifest.events} title={vibeSkin.sectionLabels.events} />
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
            <RegistryShowcase
              registries={manifest.registry?.entries || []}
              cashFundUrl={manifest.registry?.cashFundUrl}
              cashFundMessage={manifest.registry?.cashFundMessage}
              title={vibeSkin.sectionLabels.registry}
            />
          </section>
        );
      case 'travel':
        if (!manifest.travelInfo) return null;
        return (
          <section key={key} id="travel">
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
            <div style={{ fontSize: '2rem', color: pal.accent, opacity: 0.4, marginBottom: '1rem' }}><span data-pe-icon="accentSymbol" style={{ cursor: 'pointer' }}>{vibeSkin.accentSymbol || '✦'}</span></div>
            <p data-pe-editable="true" data-pe-path="poetry.dividerQuote" style={{
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

  // Global section divider setting from design panel
  const globalDivider = manifest.theme?.effects?.sectionDivider;
  const useCustomDivider = globalDivider && globalDivider.style !== 'none';

  // When gradient mesh is active, make main background transparent so the mesh shows through
  const meshActive = manifest.theme?.effects?.gradientMesh && manifest.theme.effects.gradientMesh.preset !== 'none' && (manifest.theme.effects.gradientMesh.opacity ?? 0) > 0;
  const mainBg = meshActive ? 'transparent' : bgColor;

  // Determines the background color a block enters with
  const blockEntryColor = (type: string): string => {
    switch (type) {
      case 'event': return cardBg;
      case 'registry': return accentLight;
      case 'travel': return cardBg;
      case 'guestbook': return cardBg;
      default: return bgColor;
    }
  };

  const blockExitColor = (type: string): string => {
    switch (type) {
      case 'event': return cardBg;
      case 'registry': return accentLight;
      case 'travel': return cardBg;
      case 'guestbook': return cardBg;
      default: return bgColor;
    }
  };

  // Build block sequence with dividers injected between sections (mirrors live site)
  const renderBlockSequence = () => {
    if (!visibleBlocks) return null;
    const result: React.ReactNode[] = [];
    let prevExitColor = bgColor;
    let dividerIdx = 0;

    visibleBlocks.forEach((block) => {
      const rendered = renderBlock(block.type, block.id);
      if (rendered === null) return;

      const thisEntryColor = blockEntryColor(block.type);

      // Inject divider before every non-hero block
      if (block.type !== 'hero') {
        const divAbove = (block as any).blockEffects?.dividerAbove;
        if (divAbove) {
          // Per-block custom divider
          result.push(
            <SectionDivider
              key={`divider-before-${block.id}`}
              style={divAbove.style}
              color={thisEntryColor}
              bgColor={prevExitColor}
              height={divAbove.height}
            />
          );
        } else if (useCustomDivider) {
          // Global section divider from design panel
          const shouldFlip = globalDivider!.flip && dividerIdx % 2 === 1;
          result.push(
            <SectionDivider
              key={`divider-before-${block.id}`}
              style={globalDivider!.style}
              color={thisEntryColor}
              bgColor={prevExitColor}
              height={globalDivider!.height}
              flip={shouldFlip}
            />
          );
          dividerIdx++;
        } else {
          // Default wave divider
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
      const blockReveal = (block as any).blockEffects?.scrollReveal;
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
          <WaveDivider key="divider-hero-quote" skin={vibeSkin} fromColor={bgColor} toColor={bgColor} height={70} />,
          <VibeQuote key="vibe-quote" />,
          ...(manifest.poetry?.welcomeStatement ? [<WelcomeStatement key="welcome-statement" />] : []),
          <ArtStrip key="art-strip" />,
        );
        prevExitColor = bgColor;
      } else {
        prevExitColor = blockExitColor(block.type);
      }
    });

    return result;
  };

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
          <span style={{ fontSize: '1.5rem', color: pal.accent, opacity: 0.7 }}><span data-pe-icon="accentSymbol" style={{ cursor: 'pointer' }}>{vibeSkin.accentSymbol || '✦'}</span></span>
          <div style={{ flex: 1, maxWidth: '80px', height: '1px', background: pal.accent, opacity: 0.3 }} />
        </div>
        <p data-pe-editable="true" data-pe-path="poetry.vibeQuote" style={{
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
        <p data-pe-editable="true" data-pe-path="poetry.welcomeStatement" style={{
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
    <ThemeProvider theme={{ ...dynamicTheme, ...manifest.theme, colors: { ...dynamicTheme.colors, ...(manifest.theme?.colors || {}) }, effects: manifest.theme?.effects }}>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={fontUrl} />

      <EditBridge enabled={editMode} />
      {!editMode && (
        <SiteNav
          names={names}
          pages={sitePages}
          logoIcon={manifest.logoIcon}
          logoSvg={manifest.logoSvg}
          navStyle={manifest.navStyle}
          pageHrefOverride={(slug) => {
            const params = new URLSearchParams(searchParams.toString());
            if (!slug || slug === 'our-story') { params.delete('page'); }
            else { params.set('page', slug); }
            return `/preview?${params.toString()}`;
          }}
        />
      )}

      <CelebrationOverlay
        occasion={(manifest.occasion as 'wedding' | 'engagement' | 'anniversary' | 'birthday' | 'story') || 'wedding'}
        accentColor={pal.accent}
        accentColor2={pal.accent2 || pal.highlight || pal.accent}
      />

      {/* Set body bg so it shows behind the mesh when main is transparent */}
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
            {renderBlockSequence()}
          </>
        ) : (
          <>
            <Hero names={names} subtitle={manifest.chapters?.[0]?.subtitle || 'A love story beautifully told.'} coverPhoto={proxiedCover} weddingDate={manifest.events?.[0]?.date || manifest.logistics?.date} vibeSkin={vibeSkin} heroTagline={manifest.poetry?.heroTagline} />
            <WaveDivider skin={vibeSkin} fromColor={bgColor} toColor={bgColor} height={70} />
            <VibeQuote />
            <WelcomeStatement />
            <ArtStrip />
            {(() => {
              const legacyReveal = manifest.theme?.effects?.scrollReveal;
              const rvAttr = (legacyReveal && legacyReveal !== 'none') ? { 'data-pl-reveal': legacyReveal } : {};
              const legacyDivider = (color: string, fallbackFrom: string, fallbackTo: string, height = 80, flip = false) =>
                useCustomDivider
                  ? <SectionDivider style={globalDivider!.style} color={color} height={globalDivider!.height} flip={flip} />
                  : <WaveDivider skin={vibeSkin} fromColor={fallbackFrom} toColor={fallbackTo} height={height} />;
              return (
                <>
                  <div {...rvAttr}><section id="our-story"><Timeline chapters={manifest.chapters || []} layoutFormat={manifest.layoutFormat} /></section></div>
                  {manifest.events?.length ? <>{legacyDivider(cardBg, bgColor, cardBg)}<div {...rvAttr}><section id="schedule"><WeddingEvents events={manifest.events} title={vibeSkin.sectionLabels.events} /></section></div></> : null}
                  {manifest.events?.length ? <div {...rvAttr}><section id="rsvp"><PublicRsvpSection siteId="preview" events={manifest.events} deadline={manifest.logistics?.rsvpDeadline} /></section></div> : null}
                  {(manifest.registry?.entries?.length || manifest.registry?.cashFundUrl) ? <>{legacyDivider(accentLight, bgColor, accentLight, 80, !!globalDivider?.flip)}<div {...rvAttr}><section id="registry"><RegistryShowcase registries={manifest.registry?.entries || []} cashFundUrl={manifest.registry?.cashFundUrl} cashFundMessage={manifest.registry?.cashFundMessage} title={vibeSkin.sectionLabels.registry} /></section></div></> : null}
                  {manifest.travelInfo ? <>{legacyDivider(cardBg, bgColor, cardBg, 70)}<div {...rvAttr}><section id="travel"><TravelSection info={manifest.travelInfo} /></section></div></> : null}
                  {manifest.faqs?.length ? <>{legacyDivider(bgColor, bgColor, bgColor, 70, !!globalDivider?.flip)}<div {...rvAttr}><section id="faq"><FaqSection faqs={manifest.faqs} /></section></div></> : null}
                </>
              );
            })()}
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
          {names[0]}{names[1]?.trim() ? ` & ${names[1]}` : ''}
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
