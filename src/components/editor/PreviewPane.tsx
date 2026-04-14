'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/editor/PreviewPane.tsx
// Scaled live preview of the wedding site — no iframe
// With inline visual editing: hover bar, double-click-to-edit, context menu
// ─────────────────────────────────────────────────────────────

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, Smartphone } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import type { StoryManifest, Chapter } from '@/types';
import type { VibeSkin } from '@/lib/vibe-engine';
import { InlineEditableText } from './preview/InlineEditableText';
import { ChapterHoverBar } from './preview/ChapterHoverBar';
import { ChapterContextMenu, type ContextMenuState } from './preview/ChapterContextMenu';

function proxyUrl(rawUrl: string, w: number, h: number): string {
  if (!rawUrl) return '';
  if (rawUrl.includes('googleusercontent.com')) {
    return `/api/photos/proxy?url=${encodeURIComponent(rawUrl)}&w=${w}&h=${h}`;
  }
  return rawUrl;
}

// ── Inline edit state ──────────────────────────────────────────
interface InlineEditState {
  chapterId: string;
  field: 'title' | 'subtitle' | 'description' | 'mood';
}

export interface PreviewPaneProps {
  manifest: StoryManifest;
  coupleNames: [string, string];
  vibeSkin?: VibeSkin;
  scale?: number;
  onSectionClick?: (chapterId: string) => void;
  draggingId?: string | null;
  selectedChapterId?: string | null;
  // Chapter mutation callbacks
  onUpdateChapter?: (id: string, data: Partial<Chapter>) => void;
  onDeleteChapter?: (id: string) => void;
  onDuplicateChapter?: (id: string) => void;
  onMoveChapter?: (id: string, direction: 'up' | 'down') => void;
  onAIRewrite?: (id: string) => void;
  onUpdateHeroTagline?: (tagline: string) => void;
}

type PreviewDevice = 'desktop' | 'mobile';

const DEVICE_WIDTHS: Record<PreviewDevice, number> = {
  desktop: 1280,
  mobile: 390,
};

// ── Hero Section ───────────────────────────────────────────────
function HeroSection({
  manifest, coupleNames, vibeSkin, editingTagline, onStartEditTagline, onCancelEditTagline, onCommitTagline,
}: {
  manifest: StoryManifest;
  coupleNames: [string, string];
  vibeSkin?: VibeSkin;
  editingTagline?: boolean;
  onStartEditTagline?: () => void;
  onCancelEditTagline?: () => void;
  onCommitTagline?: (val: string) => void;
}) {
  const bg = vibeSkin?.palette?.background || manifest.theme?.colors?.background || '#faf9f6';
  const fg = vibeSkin?.palette?.foreground || manifest.theme?.colors?.foreground || '#1a1a1a';
  const accent = vibeSkin?.palette?.accent || manifest.theme?.colors?.accent || '#71717A';
  const headingFont = vibeSkin?.fonts?.heading || manifest.theme?.fonts?.heading || 'Playfair Display';
  const bodyFont = vibeSkin?.fonts?.body || manifest.theme?.fonts?.body || 'Inter';
  const tagline = manifest.poetry?.heroTagline || 'A story of love and forever';
  const rawCover = manifest.chapters?.[0]?.images?.[0]?.url;
  const coverPhoto = rawCover ? proxyUrl(rawCover, 1200, 800) : null;
  const hasPair = !!coupleNames[1];

  return (
    <div style={{
      background: coverPhoto ? '#1a1a18' : `linear-gradient(160deg, ${bg} 60%, ${accent}22 100%)`,
      padding: '80px 60px 60px',
      textAlign: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {coverPhoto && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <img src={coverPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', opacity: 0.55 }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.55) 100%)' }} />
        </div>
      )}
      {/* AI hero art overlay */}
      {vibeSkin?.heroArtDataUrl && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)',
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)',
        }}>
          <img src={vibeSkin.heroArtDataUrl} alt="" style={{
            width: '100%', height: '100%', objectFit: 'cover', opacity: 0.4,
            mixBlendMode: bg < '#888' ? 'screen' : 'multiply',
          }} />
        </div>
      )}
      {!coverPhoto && !vibeSkin?.heroArtDataUrl && (
        <div style={{
          position: 'absolute', top: '-60px', right: '-60px',
          width: '280px', height: '280px', borderRadius: '50%',
          background: `${accent}10`, pointerEvents: 'none',
        }} />
      )}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          display: 'inline-block',
          fontSize: '11px', fontWeight: 800, letterSpacing: '0.25em',
          textTransform: 'uppercase', color: coverPhoto ? '#18181B' : accent,
          marginBottom: '16px', fontFamily: bodyFont,
        }}>
          {coupleNames[0]}{hasPair ? ` & ${coupleNames[1]}` : ''}
        </div>
        <h1 style={{
          fontFamily: `"${headingFont}", Georgia, serif`,
          fontSize: '52px', fontWeight: 700, lineHeight: 1.1,
          color: coverPhoto ? '#ffffff' : fg, margin: '0 0 16px',
          letterSpacing: '-0.02em',
        }}>
          {coupleNames[0]}{hasPair && (
            <>
              <br />
              <span style={{  fontWeight: 400 }}>&amp; {coupleNames[1]}</span>
            </>
          )}
        </h1>
        {onCommitTagline ? (
          <InlineEditableText
            value={tagline}
            isEditing={!!editingTagline}
            onStartEdit={onStartEditTagline || (() => {})}
            onCancelEdit={onCancelEditTagline || (() => {})}
            onCommit={onCommitTagline}
            tag="p"
            style={{
              fontFamily: bodyFont, fontSize: '16px', color: coverPhoto ? 'rgba(255,255,255,0.72)' : `${fg}88`,
              margin: '0 0 32px', lineHeight: 1.6, maxWidth: '460px', marginLeft: 'auto', marginRight: 'auto',
            }}
            placeholder="Add a tagline..."
          />
        ) : (
          <p style={{
            fontFamily: bodyFont, fontSize: '16px', color: coverPhoto ? 'rgba(255,255,255,0.72)' : `${fg}88`,
            margin: '0 0 32px', lineHeight: 1.6, maxWidth: '460px', marginLeft: 'auto', marginRight: 'auto',
          }}>
            {tagline}
          </p>
        )}
        {manifest.logistics?.date && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '8px 20px', borderRadius: '8px',
            background: coverPhoto ? 'rgba(0,0,0,0.07)' : `${accent}15`,
            border: `1px solid ${coverPhoto ? '#71717A' : `${accent}35`}`,
            fontSize: '13px', fontWeight: 600, color: coverPhoto ? '#fff' : accent, fontFamily: bodyFont,
          }}>
            {new Date(manifest.logistics.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            {manifest.logistics.venue && <> &middot; {manifest.logistics.venue}</>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Chapter Card ───────────────────────────────────────────────
function ChapterCard({
  chapter, vibeSkin, manifest, onClick,
  chapterIndex, chapterCount, dragging,
  inlineEdit, onStartEdit, onCancelEdit, onCommitEdit,
  onDuplicate, onDelete, onMove, onLayoutChange, onAIRewrite,
  onContextMenu,
}: {
  chapter: Chapter;
  vibeSkin?: VibeSkin;
  manifest: StoryManifest;
  onClick?: () => void;
  chapterIndex: number;
  chapterCount: number;
  dragging?: boolean;
  inlineEdit: InlineEditState | null;
  onStartEdit: (field: InlineEditState['field']) => void;
  onCancelEdit: () => void;
  onCommitEdit: (field: InlineEditState['field'], value: string) => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onMove?: (direction: 'up' | 'down') => void;
  onLayoutChange?: (layout: string) => void;
  onAIRewrite?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const bg = vibeSkin?.palette?.card || manifest.theme?.colors?.cardBg || '#fff';
  const fg = vibeSkin?.palette?.foreground || manifest.theme?.colors?.foreground || '#1a1a1a';
  const accent = vibeSkin?.palette?.accent || manifest.theme?.colors?.accent || '#71717A';
  const muted = vibeSkin?.palette?.muted || manifest.theme?.colors?.muted || '#888';
  const headingFont = vibeSkin?.fonts?.heading || manifest.theme?.fonts?.heading || 'Playfair Display';
  const bodyFont = vibeSkin?.fonts?.body || manifest.theme?.fonts?.body || 'Inter';
  const rawThumb = chapter.images?.[0]?.url || null;
  const thumb = rawThumb ? proxyUrl(rawThumb, 800, 600) : null;
  const isFullbleed = chapter.layout === 'fullbleed';
  const isCinematic = chapter.layout === 'cinematic';
  const isSplit = chapter.layout === 'split';

  const isEditingField = (field: InlineEditState['field']) =>
    inlineEdit?.chapterId === chapter.id && inlineEdit?.field === field;

  const showHoverBar = hovered && !dragging && onDuplicate;

  const hoverBar = (
    <ChapterHoverBar
      visible={!!showHoverBar}
      chapterIndex={chapterIndex}
      chapterCount={chapterCount}
      currentLayout={chapter.layout}
      onDuplicate={() => onDuplicate?.()}
      onDelete={() => onDelete?.()}
      onMove={(d) => onMove?.(d)}
      onLayoutChange={(l) => onLayoutChange?.(l)}
      onAIRewrite={() => onAIRewrite?.()}
    />
  );

  const titleStyle = (fontSize: string, color: string, extra?: React.CSSProperties): React.CSSProperties => ({
    fontFamily: `"${headingFont}", Georgia, serif`, fontSize, fontWeight: 700,
    color, margin: '0 0 8px', lineHeight: 1.2, ...extra,
  });

  const descStyle: React.CSSProperties = {
    fontFamily: bodyFont, fontSize: '14px', color: muted, lineHeight: 1.7, margin: 0,
  };

  const commonProps = {
    onClick,
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
    onContextMenu,
  };

  if (isCinematic) {
    return (
      <div {...commonProps} style={{ position: 'relative', height: '240px', overflow: 'hidden', cursor: onClick ? 'pointer' : 'default', borderRadius: '12px', marginBottom: '12px', background: '#1a1a18' }}>
        {hoverBar}
        {thumb && <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }} />}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
          <InlineEditableText
            value={chapter.subtitle || chapter.title}
            isEditing={isEditingField('subtitle') || isEditingField('title')}
            onStartEdit={() => onStartEdit(chapter.subtitle ? 'subtitle' : 'title')}
            onCancelEdit={onCancelEdit}
            onCommit={(v) => onCommitEdit(chapter.subtitle ? 'subtitle' : 'title', v)}
            tag="p"
            style={{ fontFamily: `"${headingFont}", serif`, fontSize: '18px',  color: '#fff', lineHeight: 1.5, margin: 0 }}
          />
        </div>
      </div>
    );
  }

  if (isFullbleed && thumb) {
    return (
      <div {...commonProps} style={{ position: 'relative', height: '380px', overflow: 'hidden', cursor: onClick ? 'pointer' : 'default' }}>
        {hoverBar}
        <img src={thumb} alt={chapter.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8) 40%, rgba(0,0,0,0.1) 100%)' }} />
        <div style={{ position: 'absolute', bottom: '36px', left: '48px', right: '48px', color: '#fff' }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.7, marginBottom: '8px', fontFamily: bodyFont }}>
            {chapter.mood || ''}
          </div>
          <InlineEditableText value={chapter.title} isEditing={isEditingField('title')} onStartEdit={() => onStartEdit('title')} onCancelEdit={onCancelEdit} onCommit={(v) => onCommitEdit('title', v)} tag="h2" style={titleStyle('36px', '#fff', { margin: '0 0 10px' })} />
          <InlineEditableText value={chapter.description || ''} isEditing={isEditingField('description')} onStartEdit={() => onStartEdit('description')} onCancelEdit={onCancelEdit} onCommit={(v) => onCommitEdit('description', v)} tag="p" multiline style={{ ...descStyle, color: '#18181B', WebkitLineClamp: isEditingField('description') ? undefined : 3, display: isEditingField('description') ? 'block' : '-webkit-box', WebkitBoxOrient: 'vertical', overflow: isEditingField('description') ? 'visible' : 'hidden' } as React.CSSProperties} />
        </div>
      </div>
    );
  }

  if (isSplit) {
    return (
      <div {...commonProps} style={{ display: 'flex', background: bg, minHeight: '280px', overflow: 'hidden', cursor: onClick ? 'pointer' : 'default', position: 'relative' }}>
        {hoverBar}
        {thumb && (
          <div style={{ width: '45%', flexShrink: 0, overflow: 'hidden' }}>
            <img src={thumb} alt={chapter.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
        )}
        <div style={{ flex: 1, padding: '40px 48px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: accent, marginBottom: '10px', fontFamily: bodyFont }}>
            {chapter.mood}
          </div>
          <InlineEditableText value={chapter.title} isEditing={isEditingField('title')} onStartEdit={() => onStartEdit('title')} onCancelEdit={onCancelEdit} onCommit={(v) => onCommitEdit('title', v)} tag="h2" style={titleStyle('28px', fg, { margin: '0 0 12px' })} />
          <InlineEditableText value={chapter.description || ''} isEditing={isEditingField('description')} onStartEdit={() => onStartEdit('description')} onCancelEdit={onCancelEdit} onCommit={(v) => onCommitEdit('description', v)} tag="p" multiline style={descStyle} />
        </div>
      </div>
    );
  }

  // Default editorial layout
  return (
    <div {...commonProps} style={{ background: bg, padding: '48px 60px', cursor: onClick ? 'pointer' : 'default', position: 'relative' }}>
      {hoverBar}
      {thumb && (
        <div style={{ width: '100%', height: '240px', borderRadius: '12px', overflow: 'hidden', marginBottom: '28px' }}>
          <img src={thumb} alt={chapter.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
      )}
      <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: accent, marginBottom: '10px', fontFamily: bodyFont }}>
        {chapter.mood}
      </div>
      <InlineEditableText value={chapter.title} isEditing={isEditingField('title')} onStartEdit={() => onStartEdit('title')} onCancelEdit={onCancelEdit} onCommit={(v) => onCommitEdit('title', v)} tag="h2" style={titleStyle('30px', fg)} />
      {chapter.subtitle && (
        <InlineEditableText value={chapter.subtitle} isEditing={isEditingField('subtitle')} onStartEdit={() => onStartEdit('subtitle')} onCancelEdit={onCancelEdit} onCommit={(v) => onCommitEdit('subtitle', v)} tag="p" style={{ fontFamily: `"${headingFont}", Georgia, serif`,  fontSize: '16px', color: `${fg}88`, margin: '0 0 16px' }} />
      )}
      <InlineEditableText value={chapter.description || ''} isEditing={isEditingField('description')} onStartEdit={() => onStartEdit('description')} onCancelEdit={onCancelEdit} onCommit={(v) => onCommitEdit('description', v)} tag="p" multiline style={descStyle} />
    </div>
  );
}

// ── Drop Zone ──────────────────────────────────────────────────
function DropZone({ id, accent }: { id: string; accent: string }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        height: isOver ? '80px' : '24px',
        margin: '0 48px', borderRadius: '8px',
        border: isOver ? `2px solid ${accent}` : `2px dotted ${accent}30`,
        background: isOver ? `${accent}22` : `${accent}06`,
        transition: 'all 0.18s ease',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'all',
      }}
    >
      {isOver && (
        <span style={{ fontSize: '12px', fontWeight: 700, color: accent, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Drop here ↓
        </span>
      )}
    </div>
  );
}

// ── Main PreviewPane ───────────────────────────────────────────
export function PreviewPane({
  manifest, coupleNames, vibeSkin, scale = 0.65, onSectionClick, draggingId, selectedChapterId,
  onUpdateChapter, onDeleteChapter, onDuplicateChapter, onMoveChapter, onAIRewrite, onUpdateHeroTagline,
}: PreviewPaneProps) {
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');
  const [inlineEdit, setInlineEdit] = useState<InlineEditState | null>(null);
  const [editingTagline, setEditingTagline] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const containerWidth = DEVICE_WIDTHS[previewDevice];
  const bg = vibeSkin?.palette?.background || manifest.theme?.colors?.background || '#faf9f6';
  const accent = vibeSkin?.palette?.accent || manifest.theme?.colors?.accent || '#71717A';
  const chapters = useMemo(
    () => [...(manifest.chapters || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [manifest.chapters],
  );

  const handleStartEdit = useCallback((chapterId: string, field: InlineEditState['field']) => {
    setInlineEdit({ chapterId, field });
  }, []);

  const handleCancelEdit = useCallback(() => {
    setInlineEdit(null);
  }, []);

  const handleCommitEdit = useCallback((chapterId: string, field: InlineEditState['field'], value: string) => {
    setInlineEdit(null);
    onUpdateChapter?.(chapterId, { [field]: value });
  }, [onUpdateChapter]);

  const handleContextMenu = useCallback((e: React.MouseEvent, chapterId: string, chapterIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, chapterId, chapterIndex });
  }, []);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--pl-ink-soft, #3D3530)', overflow: 'hidden',
    }}>
      {/* ── Header bar ── */}
      <div style={{
        flexShrink: 0, height: '40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 12px',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        background: 'rgba(0,0,0,0.2)',
      }}>
        <span style={{
          fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: '#3F3F46',
        }}>
          Live Preview
        </span>
        <div style={{ display: 'flex', gap: '2px', background: 'rgba(0,0,0,0.04)', borderRadius: '6px', padding: '2px' }}>
          {(['desktop', 'mobile'] as PreviewDevice[]).map(d => (
            <button
              key={d}
              onClick={() => setPreviewDevice(d)}
              title={d === 'desktop' ? 'Desktop (1280px)' : 'Mobile (390px)'}
              style={{
                padding: '4px 8px', borderRadius: '4px', border: 'none', cursor: 'pointer',
                background: previewDevice === d ? 'rgba(255,255,255,0.14)' : 'transparent',
                color: previewDevice === d ? '#fff' : '#71717A',
                display: 'flex', alignItems: 'center', transition: 'all 0.15s',
              }}
            >
              {d === 'desktop' ? <Monitor size={12} /> : <Smartphone size={12} />}
            </button>
          ))}
        </div>
      </div>

      {/* ── Scrollable scaled preview area ── */}
      <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        <div style={{ width: '100%' }}>
          <div style={{
            width: `${containerWidth}px`,
            transformOrigin: 'top center',
            transform: `scale(${scale})`,
            marginLeft: `calc(50% - ${containerWidth * scale / 2}px)`,
            marginBottom: `-${100 - scale * 100}%`,
            background: bg,
            minHeight: '100px',
          }}>
            {/* Hero */}
            <HeroSection
              manifest={manifest}
              coupleNames={coupleNames}
              vibeSkin={vibeSkin}
              editingTagline={editingTagline}
              onStartEditTagline={onUpdateHeroTagline ? () => setEditingTagline(true) : undefined}
              onCancelEditTagline={() => setEditingTagline(false)}
              onCommitTagline={onUpdateHeroTagline ? (v) => { setEditingTagline(false); onUpdateHeroTagline(v); } : undefined}
            />

            {/* Section divider */}
            <div style={{ height: '2px', background: `linear-gradient(to right, transparent, ${accent}40, transparent)` }} />

            {/* Chapters */}
            {draggingId && <DropZone id="drop:before:0" accent={accent} />}

            {chapters.map((ch, i) => {
              const isSelected = selectedChapterId === ch.id;
              const chapterCard = (
                <ChapterCard
                  chapter={ch} vibeSkin={vibeSkin} manifest={manifest}
                  chapterIndex={i} chapterCount={chapters.length}
                  dragging={!!draggingId}
                  onClick={onSectionClick ? () => onSectionClick(ch.id) : undefined}
                  inlineEdit={inlineEdit}
                  onStartEdit={(field) => handleStartEdit(ch.id, field)}
                  onCancelEdit={handleCancelEdit}
                  onCommitEdit={(field, val) => handleCommitEdit(ch.id, field, val)}
                  onDuplicate={onDuplicateChapter ? () => onDuplicateChapter(ch.id) : undefined}
                  onDelete={onDeleteChapter ? () => onDeleteChapter(ch.id) : undefined}
                  onMove={onMoveChapter ? (d) => onMoveChapter(ch.id, d) : undefined}
                  onLayoutChange={onUpdateChapter ? (l) => onUpdateChapter(ch.id, { layout: l as Chapter['layout'] }) : undefined}
                  onAIRewrite={onAIRewrite ? () => onAIRewrite(ch.id) : undefined}
                  onContextMenu={(e) => handleContextMenu(e, ch.id, i)}
                />
              );
              return (
                <div key={ch.id} style={{ opacity: draggingId === ch.id ? 0.35 : 1, transition: 'opacity 0.15s' }}>
                  {isSelected ? (
                    <div style={{
                      outline: '2px solid #71717A',
                      outlineOffset: '-2px',
                      borderRadius: '4px',
                      position: 'relative',
                    }}>
                      {chapterCard}
                    </div>
                  ) : chapterCard}
                  {draggingId
                    ? <DropZone id={`drop:after:${i}`} accent={accent} />
                    : i < chapters.length - 1 && (
                      <div style={{ height: '1px', background: `${accent}18`, margin: '0 48px' }} />
                    )
                  }
                </div>
              );
            })}

            {/* Footer */}
            <div style={{
              padding: '40px 60px', textAlign: 'center',
              background: `${accent}08`,
              borderTop: `1px solid ${accent}20`,
            }}>
              <div style={{
                fontFamily: vibeSkin?.fonts?.heading || manifest.theme?.fonts?.heading || 'Playfair Display',
                fontSize: '18px', 
                color: `${vibeSkin?.palette?.foreground || '#1a1a1a'}60`,
              }}>
                {manifest.poetry?.closingLine || (coupleNames[1] ? `${coupleNames[0]} & ${coupleNames[1]}` : coupleNames[0])}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Context Menu (portal-based) */}
      <ChapterContextMenu
        state={contextMenu}
        chapterCount={chapters.length}
        currentLayout={contextMenu ? chapters.find(c => c.id === contextMenu.chapterId)?.layout : undefined}
        onClose={() => setContextMenu(null)}
        onEditInSidebar={(id) => onSectionClick?.(id)}
        onDuplicate={(id) => onDuplicateChapter?.(id)}
        onDelete={(id) => onDeleteChapter?.(id)}
        onMove={(id, d) => onMoveChapter?.(id, d)}
        onLayoutChange={(id, l) => onUpdateChapter?.(id, { layout: l as Chapter['layout'] })}
        onAIRewrite={(id) => onAIRewrite?.(id)}
      />
    </div>
  );
}
