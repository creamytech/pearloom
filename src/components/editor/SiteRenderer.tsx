'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / SiteRenderer.tsx — Direct-DOM site preview
// Renders the celebration site directly in the editor DOM
// instead of in an iframe. Enables native drag-drop, direct
// click-to-edit, and real glass blur transparency.
// ─────────────────────────────────────────────────────────────

import React, { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown, Copy, Trash2, Eye, EyeOff, GripVertical } from 'lucide-react';
import { Hero } from '@/components/hero';
import { Timeline } from '@/components/timeline';
import { WeddingEvents } from '@/components/wedding-events';
import { RegistryShowcase } from '@/components/registry-showcase';
import { FaqSection } from '@/components/faq-section';
import { TravelSection } from '@/components/travel-section';
import { PublicRsvpSection } from '@/components/public-rsvp-section';
import { ThemeProvider } from '@/components/theme-provider';
import { SiteNav } from '@/components/site-nav';
import { WaveDivider } from '@/components/vibe/WaveDivider';
import { deriveVibeSkin } from '@/lib/vibe-engine';
import { sanitizeSvg } from '@/lib/sanitize-svg';
import { StickerLayer } from '@/components/site-stickers/StickerLayer';
import type { StoryManifest, SitePage, PageBlock, BlockType } from '@/types';

function proxyUrl(rawUrl: string, w: number, h: number): string {
  if (!rawUrl) return '';
  if (rawUrl.includes('googleusercontent.com')) {
    return `/api/photos/proxy?url=${encodeURIComponent(rawUrl)}&w=${w}&h=${h}`;
  }
  return rawUrl;
}

interface SiteRendererProps {
  manifest: StoryManifest;
  names: [string, string];
  /** Called when user clicks editable text — provides path and current value */
  onTextEdit?: (path: string, value: string) => void;
  /** Called when user clicks a section — provides section type */
  onSectionClick?: (sectionId: string, chapterId?: string) => void;
  /** Called when a block is dropped at a position */
  onBlockDrop?: (blockType: string, position: number) => void;
  /** Is editor in edit mode? Enables click handlers and visual hints */
  editMode?: boolean;
  /** Currently selected block ID */
  selectedBlockId?: string | null;
  /** Called when a block action is triggered */
  onBlockAction?: (action: 'moveUp' | 'moveDown' | 'duplicate' | 'delete' | 'toggleVisibility', blockId: string) => void;
}

export function SiteRenderer({ manifest, names, onTextEdit, onSectionClick, onBlockDrop, editMode = true, selectedBlockId, onBlockAction }: SiteRendererProps) {
  const vibeSkin = manifest.vibeSkin || deriveVibeSkin(manifest.vibeString || '');
  const pal = vibeSkin.palette;
  const bgColor = pal.background;
  const cardBg = pal.card;

  const dynamicTheme = {
    name: 'pearloom-ai',
    fonts: { heading: vibeSkin.fonts.heading, body: vibeSkin.fonts.body },
    colors: {
      background: pal.background, foreground: pal.foreground,
      accent: pal.accent, accentLight: pal.accent2,
      muted: pal.muted, cardBg: pal.card,
    },
    borderRadius: '1rem',
  };

  const fontUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(vibeSkin.fonts.heading)}:ital,wght@0,400;0,600;0,700;1,400&family=${encodeURIComponent(vibeSkin.fonts.body)}:wght@300;400;500;600&display=swap`;

  const safeNames: [string, string] = [names[0] || 'Celebrating', names[1] || ''];
  const occasion = manifest.occasion || 'wedding';

  const proxiedCover = manifest.coverPhoto
    || vibeSkin.heroArtDataUrl
    || `/api/hero-art?${new URLSearchParams({ n1: safeNames[0], n2: safeNames[1], occasion, accent: pal.accent, bg: pal.background }).toString()}`;

  const sitePages: SitePage[] = useMemo(() => [
    { id: 'story', slug: 'our-story', label: vibeSkin.sectionLabels?.story || 'Our Story', enabled: true, order: 0 },
    ...(manifest.events?.length ? [{ id: 'schedule', slug: 'schedule', label: 'Schedule', enabled: true, order: 1 }] : []),
    ...(manifest.events?.length ? [{ id: 'rsvp', slug: 'rsvp', label: 'RSVP', enabled: true, order: 2 }] : []),
    ...((manifest.registry?.entries?.length || manifest.registry?.cashFundUrl) ? [{ id: 'registry', slug: 'registry', label: 'Registry', enabled: true, order: 3 }] : []),
    ...((manifest.travelInfo?.hotels?.length || manifest.travelInfo?.airports?.length) ? [{ id: 'travel', slug: 'travel', label: 'Travel', enabled: true, order: 4 }] : []),
    ...(manifest.faqs?.length ? [{ id: 'faq', slug: 'faq', label: 'FAQ', enabled: true, order: 5 }] : []),
  ], [manifest, vibeSkin]);

  const visibleBlocks = manifest.blocks?.filter(b => b.visible).sort((a, b) => a.order - b.order);

  // ── Section click handler — direct DOM, no postMessage ──
  const handleSectionClick = useCallback((e: React.MouseEvent) => {
    if (!editMode || !onSectionClick) return;
    const target = e.target as HTMLElement;
    if (target.closest('[contenteditable="true"]')) return;
    const section = target.closest('[data-pe-section]');
    if (section) {
      const sectionId = section.getAttribute('data-pe-section') || '';
      const chapterId = section.getAttribute('data-pe-chapter') || undefined;
      onSectionClick(sectionId, chapterId);
    }
  }, [editMode, onSectionClick]);

  // ── Inline text editing — direct DOM, no postMessage ──
  const handleTextBlur = useCallback((e: React.FocusEvent) => {
    if (!editMode || !onTextEdit) return;
    const el = e.target as HTMLElement;
    const path = el.getAttribute('data-pe-path');
    const chapterId = el.closest('[data-pe-chapter]')?.getAttribute('data-pe-chapter');
    const field = el.getAttribute('data-pe-field');
    const value = el.innerText.trim();

    if (path) {
      onTextEdit(path, value);
    } else if (chapterId && field) {
      onTextEdit(`chapter:${chapterId}:${field}`, value);
    }
  }, [editMode, onTextEdit]);

  // ── Hover state ──
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);

  // ── Section wrapper — hover outline + selection + inline toolbar ──
  const SectionWrap = useCallback(({ block, children, index, total }: { block: PageBlock; children: React.ReactNode; index: number; total: number }) => {
    const isSelected = selectedBlockId === block.id;
    const isHovered = hoveredBlockId === block.id;
    const def = BLOCK_CATALOGUE_MAP[block.type];
    const color = def?.color || '#A3B18A';

    return (
      <div
        data-block-id={block.id}
        onMouseEnter={() => setHoveredBlockId(block.id)}
        onMouseLeave={() => setHoveredBlockId(null)}
        onClick={(e) => {
          e.stopPropagation();
          onSectionClick?.(block.type, undefined);
        }}
        style={{
          position: 'relative',
          outline: isSelected ? `2px solid ${color}` : isHovered ? '2px solid rgba(163,177,138,0.4)' : '2px solid transparent',
          outlineOffset: '-2px',
          borderRadius: '4px',
          transition: 'outline-color 0.15s',
          cursor: editMode ? 'pointer' : 'default',
        }}
      >
        {/* Floating section toolbar — shows on hover/select */}
        <AnimatePresence>
          {editMode && (isSelected || isHovered) && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.12 }}
              style={{
                position: 'absolute', top: '-36px', left: '50%', transform: 'translateX(-50%)',
                zIndex: 100, display: 'flex', alignItems: 'center', gap: '2px',
                padding: '4px 6px', borderRadius: '10px',
                background: 'rgba(250,247,242,0.92)',
                backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.5)',
                boxShadow: '0 4px 16px rgba(43,30,20,0.1)',
                pointerEvents: 'auto',
              } as React.CSSProperties}
            >
              {/* Section label */}
              <span style={{ fontSize: '0.58rem', fontWeight: 700, color, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '0 6px' }}>
                {def?.label || block.type}
              </span>
              <div style={{ width: '1px', height: '14px', background: 'rgba(0,0,0,0.06)' }} />
              {/* Actions */}
              {[
                { icon: <ChevronUp size={12} />, action: 'moveUp' as const, disabled: index === 0 },
                { icon: <ChevronDown size={12} />, action: 'moveDown' as const, disabled: index === total - 1 },
                { icon: <Copy size={12} />, action: 'duplicate' as const },
                { icon: <Trash2 size={12} />, action: 'delete' as const, danger: true },
              ].filter(a => !a.disabled).map(a => (
                <button
                  key={a.action}
                  onClick={(e) => { e.stopPropagation(); onBlockAction?.(a.action, block.id); }}
                  style={{
                    width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: 'none', borderRadius: '6px', background: 'transparent',
                    color: (a as { danger?: boolean }).danger ? '#e07070' : 'var(--pl-muted)',
                    cursor: 'pointer', transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.04)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  {a.icon}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        {children}
      </div>
    );
  }, [editMode, selectedBlockId, hoveredBlockId, onSectionClick, onBlockAction]);

  // Simple block type → def mapping for labels/colors
  const BLOCK_CATALOGUE_MAP: Record<string, { label: string; color: string }> = {
    hero: { label: 'Hero', color: '#A3B18A' },
    story: { label: 'Story', color: '#7c5cbf' },
    event: { label: 'Events', color: '#e8927a' },
    countdown: { label: 'Countdown', color: '#4a9b8a' },
    rsvp: { label: 'RSVP', color: '#e87ab8' },
    registry: { label: 'Registry', color: '#c4774a' },
    travel: { label: 'Travel', color: '#4a7a9b' },
    faq: { label: 'FAQ', color: '#8b7a4a' },
    photos: { label: 'Photos', color: '#4a8b6a' },
    guestbook: { label: 'Guestbook', color: '#7a4a8b' },
    text: { label: 'Text', color: '#6a8b4a' },
    quote: { label: 'Quote', color: '#8b4a6a' },
    video: { label: 'Video', color: '#4a4a8b' },
    divider: { label: 'Divider', color: '#8b8b4a' },
    map: { label: 'Map', color: '#4a6a8b' },
  };

  // ── Block drop zone ──
  const [dropTargetIdx, setDropTargetIdx] = useState<number | null>(null);

  // ── Render block by type ──
  const renderBlock = useCallback((block: PageBlock) => {
    const blockCfg = block.config || {};
    const key = block.id;

    switch (block.type) {
      case 'hero':
        return (
          <div key={key} data-pe-section="hero" data-pe-label="Hero" style={{ position: 'relative' }}>
            <Hero
              names={names}
              subtitle={manifest.chapters?.[0]?.subtitle || `${manifest.chapters?.length || 0} chapters`}
              coverPhoto={proxiedCover}
              weddingDate={manifest.events?.[0]?.date || manifest.logistics?.date}
              vibeSkin={vibeSkin}
              heroTagline={manifest.poetry?.heroTagline}
            />
            <StickerLayer stickers={manifest.stickers || []} accentColor={pal.accent} />
          </div>
        );
      case 'story':
        return <section key={key} id="our-story" data-pe-section="story"><Timeline chapters={manifest.chapters || []} layoutFormat={manifest.layoutFormat} /></section>;
      case 'event':
        if (!manifest.events?.length) return null;
        return <section key={key} id="schedule" data-pe-section="events"><WeddingEvents events={manifest.events} title={vibeSkin.sectionLabels.events} /></section>;
      case 'rsvp':
        if (!manifest.events?.length) return null;
        return <section key={key} id="rsvp" data-pe-section="rsvp"><PublicRsvpSection siteId="preview" events={manifest.events} deadline={manifest.logistics?.rsvpDeadline} /></section>;
      case 'registry':
        if (!manifest.registry?.entries?.length && !manifest.registry?.cashFundUrl) return null;
        return <section key={key} id="registry" data-pe-section="registry"><RegistryShowcase registries={manifest.registry?.entries || []} cashFundUrl={manifest.registry?.cashFundUrl} cashFundMessage={manifest.registry?.cashFundMessage} title={vibeSkin.sectionLabels.registry} /></section>;
      case 'travel':
        if (!manifest.travelInfo) return null;
        return <section key={key} id="travel" data-pe-section="travel"><TravelSection info={manifest.travelInfo} /></section>;
      case 'faq':
        if (!manifest.faqs?.length) return null;
        return <section key={key} id="faq" data-pe-section="faq"><FaqSection faqs={manifest.faqs} /></section>;
      case 'countdown':
        return (
          <section key={key} data-pe-section="countdown" style={{ padding: '4rem 2rem', textAlign: 'center', background: cardBg }}>
            <div style={{ fontFamily: `"${vibeSkin.fonts.heading}", serif`, fontSize: 'clamp(1.4rem, 3vw, 2rem)', color: pal.foreground }}>
              Countdown
            </div>
          </section>
        );
      case 'text': {
        const textContent = blockCfg.content as string | undefined;
        if (!textContent) return null;
        return (
          <section key={key} data-pe-section="text" style={{ padding: '4rem 2rem', maxWidth: '800px', margin: '0 auto' }}>
            <p
              contentEditable={editMode} suppressContentEditableWarning
              data-pe-editable="true" data-pe-path={`blocks.${block.id}.config.content`}
              onBlur={handleTextBlur}
              style={{ fontFamily: `"${vibeSkin.fonts.body}", sans-serif`, fontSize: '1.1rem', lineHeight: 1.8, color: pal.foreground, opacity: 0.8, textAlign: 'center', outline: 'none' }}
            >
              {textContent}
            </p>
          </section>
        );
      }
      case 'quote':
        return (
          <section key={key} data-pe-section="quote" style={{ padding: '5rem 2rem', textAlign: 'center', maxWidth: '700px', margin: '0 auto' }}>
            <div style={{ fontSize: '2rem', color: pal.accent, opacity: 0.4, marginBottom: '1rem' }}>{vibeSkin.accentSymbol || '✦'}</div>
            <p style={{ fontFamily: `"${vibeSkin.fonts.heading}", serif`, fontSize: 'clamp(1.3rem, 3vw, 2rem)', fontWeight: 400, fontStyle: 'italic', lineHeight: 1.65, color: pal.foreground, opacity: 0.75 }}>
              &ldquo;{vibeSkin.dividerQuote || manifest.vibeString || 'Love is composed of a single soul inhabiting two bodies.'}&rdquo;
            </p>
          </section>
        );
      case 'divider':
        return <WaveDivider key={key} skin={vibeSkin} fromColor={bgColor} toColor={bgColor} height={60} />;
      case 'photos': {
        const allPhotos = manifest.chapters?.flatMap(ch => ch.images || []).slice(0, 9) || [];
        if (!allPhotos.length) return null;
        return (
          <section key={key} data-pe-section="photos" style={{ padding: '4rem 2rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px', maxWidth: '960px', margin: '0 auto' }}>
              {allPhotos.map((photo, i) => (
                <div key={i} style={{ aspectRatio: i === 0 ? '2/1' : '1', gridColumn: i === 0 ? 'span 2' : undefined, borderRadius: '10px', overflow: 'hidden' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={proxyUrl(photo.url, 800, 600)} alt={photo.alt || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
              ))}
            </div>
          </section>
        );
      }
      default:
        return null;
    }
  }, [manifest, names, vibeSkin, pal, bgColor, cardBg, proxiedCover, editMode, handleTextBlur]);

  // ── Drop zone between blocks ──
  const DropZone = ({ index }: { index: number }) => (
    <div
      onDragOver={e => {
        if (e.dataTransfer.types.includes('pearloom/block-type')) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
          setDropTargetIdx(index);
        }
      }}
      onDragLeave={() => setDropTargetIdx(null)}
      onDrop={e => {
        e.preventDefault();
        const blockType = e.dataTransfer.getData('pearloom/block-type');
        if (blockType && onBlockDrop) {
          onBlockDrop(blockType, index);
        }
        setDropTargetIdx(null);
      }}
      style={{
        height: dropTargetIdx === index ? '8px' : '20px',
        transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        position: 'relative',
      }}
    >
      {dropTargetIdx === index && (
        <div style={{
          position: 'absolute', left: '10%', right: '10%', top: '50%', transform: 'translateY(-50%)',
          height: '4px', borderRadius: '4px',
          background: 'var(--pl-olive, #A3B18A)',
          boxShadow: '0 0 16px rgba(163,177,138,0.5)',
        }} />
      )}
    </div>
  );

  return (
    <ThemeProvider theme={{ ...dynamicTheme, ...manifest.theme, colors: { ...dynamicTheme.colors, ...(manifest.theme?.colors || {}) }, effects: manifest.theme?.effects }}>
      {/* Google Fonts */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={fontUrl} />

      {/* CSS scoping — site content lives inside .pl-site-scope */}
      <div
        className="pl-site-scope"
        onClick={handleSectionClick}
        style={{ position: 'relative', minHeight: '100%' }}
      >
        {/* Site navigation */}
        <SiteNav
          names={safeNames}
          pages={sitePages}
          logoIcon={manifest.logoIcon}
          logoSvg={manifest.logoSvg}
          navStyle={manifest.navStyle}
        />

        {/* Main content */}
        <main style={{
          minHeight: '100dvh', paddingBottom: '5rem',
          background: bgColor, position: 'relative', isolation: 'isolate',
        }}>
          {/* Ambient art */}
          {vibeSkin.ambientArtDataUrl && (
            <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={vibeSkin.ambientArtDataUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.28, mixBlendMode: 'multiply' }} />
            </div>
          )}

          {/* Block sequence with drop zones */}
          {visibleBlocks ? (
            <>
              <DropZone index={0} />
              {visibleBlocks.map((block, i) => (
                <React.Fragment key={block.id}>
                  <SectionWrap block={block} index={i} total={visibleBlocks.length}>
                    {renderBlock(block)}
                  </SectionWrap>
                  <DropZone index={i + 1} />
                </React.Fragment>
              ))}
            </>
          ) : (
            <>
              <Hero names={names} subtitle={manifest.chapters?.[0]?.subtitle || 'A love story'} coverPhoto={proxiedCover} weddingDate={manifest.events?.[0]?.date || manifest.logistics?.date} vibeSkin={vibeSkin} heroTagline={manifest.poetry?.heroTagline} />
              <section id="our-story"><Timeline chapters={manifest.chapters || []} layoutFormat={manifest.layoutFormat} /></section>
              {manifest.events?.length ? <section id="schedule"><WeddingEvents events={manifest.events} title={vibeSkin.sectionLabels.events} /></section> : null}
              {manifest.events?.length ? <section id="rsvp"><PublicRsvpSection siteId="preview" events={manifest.events} deadline={manifest.logistics?.rsvpDeadline} /></section> : null}
              {(manifest.registry?.entries?.length || manifest.registry?.cashFundUrl) ? <section id="registry"><RegistryShowcase registries={manifest.registry?.entries || []} cashFundUrl={manifest.registry?.cashFundUrl} cashFundMessage={manifest.registry?.cashFundMessage} title={vibeSkin.sectionLabels.registry} /></section> : null}
              {manifest.travelInfo ? <section id="travel"><TravelSection info={manifest.travelInfo} /></section> : null}
              {manifest.faqs?.length ? <section id="faq"><FaqSection faqs={manifest.faqs} /></section> : null}
            </>
          )}
        </main>

        {/* Footer */}
        <footer style={{
          padding: '3rem 2rem', textAlign: 'center',
          background: pal.foreground, color: `${pal.background}cc`,
          fontSize: '0.75rem', letterSpacing: '0.05em', position: 'relative',
        }}>
          <div style={{ marginBottom: '0.5rem', fontSize: '1rem', opacity: 0.6 }}>{vibeSkin.accentSymbol || '♡'}</div>
          <div style={{ fontFamily: `"${vibeSkin.fonts.heading}", serif`, fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            {safeNames[0]}{safeNames[1] ? ` & ${safeNames[1]}` : ''}
          </div>
          {manifest.poetry?.closingLine && (
            <div style={{ fontFamily: `"${vibeSkin.fonts.heading}", serif`, fontSize: '0.75rem', fontStyle: 'italic', opacity: 0.45, maxWidth: '400px', margin: '0 auto 0.75rem' }}>
              {manifest.poetry.closingLine}
            </div>
          )}
          <div style={{ opacity: 0.35, fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '1rem' }}>Made with Pearloom</div>
        </footer>
      </div>
    </ThemeProvider>
  );
}
