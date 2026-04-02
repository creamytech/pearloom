'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / MobilePreviewPane.tsx — Touch-interactive preview for mobile
// Full-width rendering (no scaling), tap-to-edit chapters
// ─────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { StoryManifest, Chapter } from '@/types';
import type { VibeSkin } from '@/lib/vibe-engine';
import { parseLocalDate } from '@/lib/date';

function proxyUrl(rawUrl: string, w: number, h: number): string {
  if (!rawUrl) return '';
  if (rawUrl.includes('googleusercontent.com')) {
    return `/api/photos/proxy?url=${encodeURIComponent(rawUrl)}&w=${w}&h=${h}`;
  }
  return rawUrl;
}

export interface MobilePreviewPaneProps {
  manifest: StoryManifest;
  coupleNames: [string, string];
  vibeSkin?: VibeSkin;
  selectedChapterId?: string | null;
  onChapterTap: (chapterId: string) => void;
  onHeroTap?: () => void;
}

// ── Hero Section (mobile) ──────────────────────────────────────
function MobileHero({
  manifest, coupleNames, vibeSkin, onTap,
}: {
  manifest: StoryManifest;
  coupleNames: [string, string];
  vibeSkin?: VibeSkin;
  onTap?: () => void;
}) {
  const bg = vibeSkin?.palette?.background || manifest.theme?.colors?.background || '#faf9f6';
  const fg = vibeSkin?.palette?.foreground || manifest.theme?.colors?.foreground || '#1a1a1a';
  const accent = vibeSkin?.palette?.accent || manifest.theme?.colors?.accent || '#A3B18A';
  const headingFont = vibeSkin?.fonts?.heading || manifest.theme?.fonts?.heading || 'Playfair Display';
  const bodyFont = vibeSkin?.fonts?.body || manifest.theme?.fonts?.body || 'Inter';
  const tagline = manifest.poetry?.heroTagline || 'A story of love and forever';
  const rawCover = manifest.chapters?.[0]?.images?.[0]?.url;
  const coverPhoto = rawCover ? proxyUrl(rawCover, 800, 500) : null;
  const hasPair = !!coupleNames[1];

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onClick={onTap}
      style={{
        background: coverPhoto ? '#1a1a18' : `linear-gradient(160deg, ${bg} 60%, ${accent}22 100%)`,
        padding: '56px 24px 40px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
      }}
    >
      {coverPhoto && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coverPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', opacity: 0.5 }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.55) 100%)' }} />
        </div>
      )}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          fontSize: '10px', fontWeight: 800, letterSpacing: '0.25em',
          textTransform: 'uppercase', color: coverPhoto ? 'rgba(255,255,255,0.7)' : accent,
          marginBottom: '12px', fontFamily: bodyFont,
        }}>
          {coupleNames[0]}{hasPair ? ` & ${coupleNames[1]}` : ''}
        </div>
        <h1 style={{
          fontFamily: `"${headingFont}", Georgia, serif`,
          fontSize: '36px', fontWeight: 700, lineHeight: 1.1,
          color: coverPhoto ? '#ffffff' : fg, margin: '0 0 12px',
          letterSpacing: '-0.02em',
        }}>
          {coupleNames[0]}{hasPair && (
            <>
              <br />
              <span style={{ fontStyle: 'italic', fontWeight: 400 }}>&amp; {coupleNames[1]}</span>
            </>
          )}
        </h1>
        <p style={{
          fontFamily: bodyFont, fontSize: '14px',
          color: coverPhoto ? 'rgba(255,255,255,0.65)' : `${fg}88`,
          margin: '0 0 20px', lineHeight: 1.6, maxWidth: '320px', marginLeft: 'auto', marginRight: 'auto',
        }}>
          {tagline}
        </p>
        {manifest.logistics?.date && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '6px 16px', borderRadius: '100px',
            background: coverPhoto ? 'rgba(255,255,255,0.1)' : `${accent}15`,
            border: `1px solid ${coverPhoto ? 'rgba(255,255,255,0.18)' : `${accent}30`}`,
            fontSize: '11px', fontWeight: 600, color: coverPhoto ? '#fff' : accent, fontFamily: bodyFont,
          }}>
            {parseLocalDate(manifest.logistics.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        )}
        {/* Tap hint */}
        <div style={{
          marginTop: '16px', fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: coverPhoto ? 'rgba(255,255,255,0.3)' : `${fg}30`,
        }}>
          Tap to edit
        </div>
      </div>
    </motion.div>
  );
}

// ── Chapter Card (mobile) ──────────────────────────────────────
function MobileChapterCard({
  chapter, vibeSkin, manifest, isSelected, onTap,
}: {
  chapter: Chapter;
  vibeSkin?: VibeSkin;
  manifest: StoryManifest;
  isSelected: boolean;
  onTap: () => void;
}) {
  const bg = vibeSkin?.palette?.card || manifest.theme?.colors?.cardBg || '#fff';
  const fg = vibeSkin?.palette?.foreground || manifest.theme?.colors?.foreground || '#1a1a1a';
  const accent = vibeSkin?.palette?.accent || manifest.theme?.colors?.accent || '#A3B18A';
  const muted = vibeSkin?.palette?.muted || manifest.theme?.colors?.muted || '#888';
  const headingFont = vibeSkin?.fonts?.heading || manifest.theme?.fonts?.heading || 'Playfair Display';
  const bodyFont = vibeSkin?.fonts?.body || manifest.theme?.fonts?.body || 'Inter';
  const rawThumb = chapter.images?.[0]?.url || null;
  const thumb = rawThumb ? proxyUrl(rawThumb, 600, 400) : null;

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onClick={onTap}
      style={{
        background: bg,
        position: 'relative',
        cursor: 'pointer',
        outline: isSelected ? '2px solid var(--eg-plum, #6D597A)' : 'none',
        outlineOffset: '-2px',
      }}
    >
      {/* Selected indicator */}
      {isSelected && (
        <div style={{
          position: 'absolute', top: 8, right: 8, zIndex: 10,
          background: 'var(--eg-plum, #6D597A)',
          color: '#fff', fontSize: '9px', fontWeight: 700,
          padding: '2px 8px', borderRadius: '100px',
          letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>
          Editing
        </div>
      )}

      {/* Image */}
      {thumb && (
        <div style={{ width: '100%', height: '200px', overflow: 'hidden' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumb} alt={chapter.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
      )}

      {/* Content */}
      <div style={{ padding: '20px 24px 24px' }}>
        {chapter.mood && (
          <div style={{
            fontSize: '9px', fontWeight: 700, letterSpacing: '0.2em',
            textTransform: 'uppercase', color: accent, marginBottom: '8px', fontFamily: bodyFont,
          }}>
            {chapter.mood}
          </div>
        )}
        <h2 style={{
          fontFamily: `"${headingFont}", Georgia, serif`,
          fontSize: '24px', fontWeight: 700, color: fg, margin: '0 0 6px', lineHeight: 1.2,
        }}>
          {chapter.title}
        </h2>
        {chapter.subtitle && (
          <p style={{
            fontFamily: `"${headingFont}", Georgia, serif`, fontStyle: 'italic',
            fontSize: '14px', color: `${fg}88`, margin: '0 0 12px',
          }}>
            {chapter.subtitle}
          </p>
        )}
        {chapter.description && (
          <p style={{
            fontFamily: bodyFont, fontSize: '13px', color: muted, lineHeight: 1.7, margin: 0,
            display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          } as React.CSSProperties}>
            {chapter.description}
          </p>
        )}
        {/* Tap hint */}
        <div style={{
          marginTop: '12px', fontSize: '9px', fontWeight: 600, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: `${fg}25`,
        }}>
          Tap to edit
        </div>
      </div>
    </motion.div>
  );
}

// ── Main MobilePreviewPane ──────────────────────────────────────
export function MobilePreviewPane({
  manifest, coupleNames, vibeSkin, selectedChapterId, onChapterTap, onHeroTap,
}: MobilePreviewPaneProps) {
  const bg = vibeSkin?.palette?.background || manifest.theme?.colors?.background || '#faf9f6';
  const accent = vibeSkin?.palette?.accent || manifest.theme?.colors?.accent || '#A3B18A';

  const chapters = useMemo(
    () => [...(manifest.chapters || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [manifest.chapters],
  );

  return (
    <div style={{
      flex: 1, overflow: 'auto',
      background: bg,
      WebkitOverflowScrolling: 'touch',
      paddingBottom: 'calc(56px + env(safe-area-inset-bottom, 0px) + 80px)',
    } as React.CSSProperties}>
      {/* Hero */}
      <MobileHero manifest={manifest} coupleNames={coupleNames} vibeSkin={vibeSkin} onTap={onHeroTap} />

      {/* Section divider */}
      <div style={{ height: '2px', background: `linear-gradient(to right, transparent, ${accent}40, transparent)` }} />

      {/* Chapters */}
      {chapters.map((ch, i) => (
        <div key={ch.id}>
          <MobileChapterCard
            chapter={ch}
            vibeSkin={vibeSkin}
            manifest={manifest}
            isSelected={selectedChapterId === ch.id}
            onTap={() => onChapterTap(ch.id)}
          />
          {i < chapters.length - 1 && (
            <div style={{ height: '1px', background: `${accent}18` }} />
          )}
        </div>
      ))}

      {/* Footer */}
      <div style={{
        padding: '32px 24px', textAlign: 'center',
        background: `${accent}08`,
        borderTop: `1px solid ${accent}20`,
      }}>
        <div style={{
          fontFamily: vibeSkin?.fonts?.heading || manifest.theme?.fonts?.heading || 'Playfair Display',
          fontSize: '16px', fontStyle: 'italic',
          color: `${vibeSkin?.palette?.foreground || '#1a1a1a'}60`,
        }}>
          {manifest.poetry?.closingLine || (coupleNames[1] ? `${coupleNames[0]} & ${coupleNames[1]}` : coupleNames[0])}
        </div>
      </div>
    </div>
  );
}
