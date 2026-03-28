'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/editor/PreviewPane.tsx
// Scaled live preview of the wedding site — no iframe
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Monitor, Smartphone } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import type { StoryManifest, Chapter } from '@/types';
import type { VibeSkin } from '@/lib/vibe-engine';

export interface PreviewPaneProps {
  manifest: StoryManifest;
  coupleNames: [string, string];
  vibeSkin?: VibeSkin;
  scale?: number; // default 0.65
  onSectionClick?: (chapterId: string) => void;
  /** When set, drop zones appear between chapters for drag-and-drop reorder/insert */
  draggingId?: string | null;
}

type PreviewDevice = 'desktop' | 'mobile';

const DEVICE_WIDTHS: Record<PreviewDevice, number> = {
  desktop: 1280,
  mobile: 390,
};

// ── Hero Section ───────────────────────────────────────────────
function HeroSection({
  manifest, coupleNames, vibeSkin,
}: {
  manifest: StoryManifest;
  coupleNames: [string, string];
  vibeSkin?: VibeSkin;
}) {
  const bg = vibeSkin?.palette?.background || manifest.theme?.colors?.background || '#faf9f6';
  const fg = vibeSkin?.palette?.foreground || manifest.theme?.colors?.foreground || '#1a1a1a';
  const accent = vibeSkin?.palette?.accent || manifest.theme?.colors?.accent || '#A3B18A';
  const headingFont = vibeSkin?.fonts?.heading || manifest.theme?.fonts?.heading || 'Playfair Display';
  const bodyFont = vibeSkin?.fonts?.body || manifest.theme?.fonts?.body || 'Inter';
  const tagline = manifest.poetry?.heroTagline || 'A story of love and forever';

  return (
    <div style={{
      background: `linear-gradient(160deg, ${bg} 60%, ${accent}22 100%)`,
      padding: '80px 60px 60px',
      textAlign: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Decorative accent circle */}
      <div style={{
        position: 'absolute', top: '-60px', right: '-60px',
        width: '280px', height: '280px', borderRadius: '50%',
        background: `${accent}10`, pointerEvents: 'none',
      }} />
      <div style={{
        display: 'inline-block',
        fontSize: '11px', fontWeight: 800, letterSpacing: '0.25em',
        textTransform: 'uppercase', color: accent,
        marginBottom: '16px', fontFamily: bodyFont,
      }}>
        {coupleNames[0]} &amp; {coupleNames[1]}
      </div>
      <h1 style={{
        fontFamily: `"${headingFont}", Georgia, serif`,
        fontSize: '52px', fontWeight: 700, lineHeight: 1.1,
        color: fg, margin: '0 0 16px',
        letterSpacing: '-0.02em',
      }}>
        {coupleNames[0]}<br />
        <span style={{ fontStyle: 'italic', fontWeight: 400 }}>&amp; {coupleNames[1]}</span>
      </h1>
      <p style={{
        fontFamily: bodyFont, fontSize: '16px', color: `${fg}88`,
        margin: '0 0 32px', lineHeight: 1.6, maxWidth: '460px', marginLeft: 'auto', marginRight: 'auto',
      }}>
        {tagline}
      </p>
      {manifest.logistics?.date && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '8px 20px', borderRadius: '100px',
          background: `${accent}15`, border: `1px solid ${accent}35`,
          fontSize: '13px', fontWeight: 600, color: accent, fontFamily: bodyFont,
        }}>
          {new Date(manifest.logistics.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          {manifest.logistics.venue && <> &middot; {manifest.logistics.venue}</>}
        </div>
      )}
    </div>
  );
}

// ── Chapter Card ───────────────────────────────────────────────
function ChapterCard({
  chapter, vibeSkin, manifest, onClick,
}: {
  chapter: Chapter;
  vibeSkin?: VibeSkin;
  manifest: StoryManifest;
  onClick?: () => void;
}) {
  const bg = vibeSkin?.palette?.card || manifest.theme?.colors?.cardBg || '#fff';
  const fg = vibeSkin?.palette?.foreground || manifest.theme?.colors?.foreground || '#1a1a1a';
  const accent = vibeSkin?.palette?.accent || manifest.theme?.colors?.accent || '#A3B18A';
  const muted = vibeSkin?.palette?.muted || manifest.theme?.colors?.muted || '#888';
  const headingFont = vibeSkin?.fonts?.heading || manifest.theme?.fonts?.heading || 'Playfair Display';
  const bodyFont = vibeSkin?.fonts?.body || manifest.theme?.fonts?.body || 'Inter';
  const thumb = chapter.images?.[0]?.url || null;
  const isFullbleed = chapter.layout === 'fullbleed' || chapter.layout === 'cinematic';
  const isSplit = chapter.layout === 'split';

  if (isFullbleed && thumb) {
    return (
      <div
        onClick={onClick}
        style={{
          position: 'relative', height: '380px', overflow: 'hidden',
          cursor: onClick ? 'pointer' : 'default',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumb} alt={chapter.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.8) 40%, rgba(0,0,0,0.1) 100%)',
        }} />
        <div style={{ position: 'absolute', bottom: '36px', left: '48px', right: '48px', color: '#fff' }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.7, marginBottom: '8px', fontFamily: bodyFont }}>
            {chapter.mood || ''}
          </div>
          <h2 style={{ fontFamily: `"${headingFont}", Georgia, serif`, fontSize: '36px', fontWeight: 700, margin: '0 0 10px', lineHeight: 1.1 }}>
            {chapter.title}
          </h2>
          <p style={{ fontFamily: bodyFont, fontSize: '14px', opacity: 0.75, lineHeight: 1.6, margin: 0, WebkitLineClamp: 3, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
            {chapter.description}
          </p>
        </div>
      </div>
    );
  }

  if (isSplit) {
    return (
      <div
        onClick={onClick}
        style={{
          display: 'flex', background: bg, minHeight: '280px', overflow: 'hidden',
          cursor: onClick ? 'pointer' : 'default',
        }}
      >
        {thumb && (
          <div style={{ width: '45%', flexShrink: 0, overflow: 'hidden' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumb} alt={chapter.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
        )}
        <div style={{ flex: 1, padding: '40px 48px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: accent, marginBottom: '10px', fontFamily: bodyFont }}>
            {chapter.mood}
          </div>
          <h2 style={{ fontFamily: `"${headingFont}", Georgia, serif`, fontSize: '28px', fontWeight: 700, color: fg, margin: '0 0 12px', lineHeight: 1.2 }}>
            {chapter.title}
          </h2>
          <p style={{ fontFamily: bodyFont, fontSize: '14px', color: muted, lineHeight: 1.7, margin: 0 }}>
            {chapter.description?.slice(0, 180)}{chapter.description?.length > 180 ? '…' : ''}
          </p>
        </div>
      </div>
    );
  }

  // Default editorial layout
  return (
    <div
      onClick={onClick}
      style={{
        background: bg, padding: '48px 60px', cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {thumb && (
        <div style={{ width: '100%', height: '240px', borderRadius: '12px', overflow: 'hidden', marginBottom: '28px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumb} alt={chapter.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
      )}
      <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: accent, marginBottom: '10px', fontFamily: bodyFont }}>
        {chapter.mood}
      </div>
      <h2 style={{ fontFamily: `"${headingFont}", Georgia, serif`, fontSize: '30px', fontWeight: 700, color: fg, margin: '0 0 8px', lineHeight: 1.2 }}>
        {chapter.title}
      </h2>
      {chapter.subtitle && (
        <p style={{ fontFamily: `"${headingFont}", Georgia, serif`, fontStyle: 'italic', fontSize: '16px', color: `${fg}88`, margin: '0 0 16px' }}>
          {chapter.subtitle}
        </p>
      )}
      <p style={{ fontFamily: bodyFont, fontSize: '14px', color: muted, lineHeight: 1.7, margin: 0 }}>
        {chapter.description?.slice(0, 220)}{chapter.description?.length > 220 ? '…' : ''}
      </p>
    </div>
  );
}

// ── Drop Zone (appears between chapters during drag) ──────────────
function DropZone({ id, accent }: { id: string; accent: string }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        height: isOver ? '72px' : '10px',
        margin: '0 48px',
        borderRadius: '8px',
        border: isOver ? `2px dashed ${accent}` : `2px dashed transparent`,
        background: isOver ? `${accent}15` : 'transparent',
        transition: 'all 0.18s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'all',
      }}
    >
      {isOver && (
        <span style={{ fontSize: '11px', fontWeight: 700, color: accent, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          Drop here
        </span>
      )}
    </div>
  );
}

// ── Main PreviewPane ───────────────────────────────────────────
export function PreviewPane({
  manifest, coupleNames, vibeSkin, scale = 0.65, onSectionClick, draggingId,
}: PreviewPaneProps) {
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');

  const containerWidth = DEVICE_WIDTHS[previewDevice];
  const bg = vibeSkin?.palette?.background || manifest.theme?.colors?.background || '#faf9f6';
  const accent = vibeSkin?.palette?.accent || manifest.theme?.colors?.accent || '#A3B18A';
  const chapters = [...(manifest.chapters || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  // The outer pane fills all available space; the inner content div is scaled
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--eg-dark-2, #3D3530)', overflow: 'hidden',
    }}>
      {/* ── Header bar ── */}
      <div style={{
        flexShrink: 0, height: '40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 12px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(0,0,0,0.2)',
      }}>
        <span style={{
          fontSize: '0.82rem', fontWeight: 800, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)',
        }}>
          Live Preview
        </span>
        {/* Device toggle */}
        <div style={{ display: 'flex', gap: '2px', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', padding: '2px' }}>
          {(['desktop', 'mobile'] as PreviewDevice[]).map(d => (
            <button
              key={d}
              onClick={() => setPreviewDevice(d)}
              title={d === 'desktop' ? 'Desktop (1280px)' : 'Mobile (390px)'}
              style={{
                padding: '4px 8px', borderRadius: '4px', border: 'none', cursor: 'pointer',
                background: previewDevice === d ? 'rgba(255,255,255,0.14)' : 'transparent',
                color: previewDevice === d ? '#fff' : 'rgba(255,255,255,0.35)',
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
        {/* Outer sizing div — determines scroll height */}
        <div style={{
          width: '100%',
          // The scaled content's visual height ≈ naturalHeight * scale.
          // We allow overflow so the user can scroll to see more.
        }}>
          {/* Scaled inner container */}
          <div style={{
            width: `${containerWidth}px`,
            transformOrigin: 'top center',
            transform: `scale(${scale})`,
            // Push the parent to account for the extra space the unscaled width takes
            // and shrink the height so the parent scroll area matches visual height.
            marginLeft: `calc(50% - ${containerWidth * scale / 2}px)`,
            marginBottom: `-${100 - scale * 100}%`,
            background: bg,
            minHeight: '100px',
          }}>
            {/* Hero */}
            <HeroSection manifest={manifest} coupleNames={coupleNames} vibeSkin={vibeSkin} />

            {/* Section divider */}
            <div style={{ height: '2px', background: `linear-gradient(to right, transparent, ${accent}40, transparent)` }} />

            {/* Chapters */}
            {/* Top drop zone — insert before first chapter */}
            {draggingId && <DropZone id="drop:before:0" accent={accent} />}

            {chapters.map((ch, i) => (
              <div key={ch.id} style={{ opacity: draggingId === ch.id ? 0.35 : 1, transition: 'opacity 0.15s' }}>
                <ChapterCard
                  chapter={ch}
                  vibeSkin={vibeSkin}
                  manifest={manifest}
                  onClick={onSectionClick ? () => onSectionClick(ch.id) : undefined}
                />
                {draggingId
                  ? <DropZone id={`drop:after:${i}`} accent={accent} />
                  : i < chapters.length - 1 && (
                    <div style={{ height: '1px', background: `${accent}18`, margin: '0 48px' }} />
                  )
                }
              </div>
            ))}

            {/* Footer */}
            <div style={{
              padding: '40px 60px', textAlign: 'center',
              background: `${accent}08`,
              borderTop: `1px solid ${accent}20`,
            }}>
              <div style={{
                fontFamily: vibeSkin?.fonts?.heading || manifest.theme?.fonts?.heading || 'Playfair Display',
                fontSize: '18px', fontStyle: 'italic',
                color: `${vibeSkin?.palette?.foreground || '#1a1a1a'}60`,
              }}>
                {manifest.poetry?.closingLine || `${coupleNames[0]} & ${coupleNames[1]}`}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
