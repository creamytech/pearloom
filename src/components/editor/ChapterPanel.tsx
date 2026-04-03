'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / ChapterPanel.tsx — Chapter property editor
// Extracted from FullscreenEditor (ChapterPanel function)
// ─────────────────────────────────────────────────────────────

import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { Field, lbl, inp } from './editor-utils';
import { ImageManager } from './ImageManager';
import { SectionStyleEditor } from './SectionStyleEditor';
import { AIBlocksIcon } from '@/components/icons/EditorIcons';
import type { Chapter } from '@/types';
import type { VibeSkin } from '@/lib/vibe-engine';
import type { SectionStyleOverrides } from './SectionStyleEditor';

const LAYOUT_OPTS = ['editorial', 'fullbleed', 'split', 'cinematic', 'gallery', 'mosaic'] as const;
const LAYOUT_LABELS: Record<string, string> = {
  editorial: 'Editorial', fullbleed: 'Full Bleed', split: 'Split',
  cinematic: 'Cinematic', gallery: 'Gallery', mosaic: 'Mosaic',
};

interface ChapterPanelProps {
  chapter: Chapter;
  onUpdate: (id: string, data: Partial<Chapter>) => void;
  onAIRewrite: (id: string) => void;
  isRewriting: boolean;
  vibeSkin?: VibeSkin;
  sectionOverrides?: SectionStyleOverrides;
  onOverridesChange?: (id: string, overrides: SectionStyleOverrides) => void;
  vibeString?: string;
  streamingText?: string | null;
}

export function ChapterPanel({
  chapter, onUpdate, onAIRewrite, isRewriting, vibeSkin,
  sectionOverrides, onOverridesChange, vibeString, streamingText,
}: ChapterPanelProps) {
  const upd = useCallback((data: Partial<Chapter>) => onUpdate(chapter.id, data), [chapter.id, onUpdate]);
  const currentLayout = chapter.layout || 'editorial';

  return (
    <motion.div
      key={chapter.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.22 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}
    >
      {/* Section heading */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
        <span style={{ fontSize: '0.82rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--eg-gold, #D6C6A8)', whiteSpace: 'nowrap' }}>
          Chapter Editor
        </span>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
      </div>

      {/* Title */}
      <div>
        <label style={lbl}>Title</label>
        <input
          value={chapter.title || ''}
          onChange={e => upd({ title: e.target.value })}
          placeholder="The Rooftop, Brooklyn"
          style={{ ...inp, fontSize: 'max(16px, 1rem)', fontWeight: 700, letterSpacing: '-0.01em' }}
          onFocus={e => { e.currentTarget.style.borderColor = 'rgba(163,177,138,0.6)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.1)'; }}
          onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; e.currentTarget.style.boxShadow = 'none'; }}
        />
      </div>

      {/* Date + Subtitle row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
        <div>
          <label style={lbl}>Date</label>
          <input
            type="date"
            value={chapter.date ? chapter.date.slice(0, 10) : ''}
            onChange={e => upd({ date: e.target.value })}
            style={{ ...inp, colorScheme: 'dark' }}
            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(163,177,138,0.6)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; }}
          />
        </div>
        <Field label="Subtitle" value={chapter.subtitle || ''} onChange={v => upd({ subtitle: v })} placeholder="in all the best ways" />
      </div>

      {/* Description */}
      <div>
        <label style={lbl}>Story</label>
        <textarea
          value={streamingText != null ? streamingText + '▋' : (chapter.description || '')}
          onChange={streamingText != null ? undefined : e => upd({ description: e.target.value })}
          readOnly={streamingText != null}
          rows={5}
          placeholder="Write your memory here..."
          style={{ ...inp, resize: 'vertical', lineHeight: 1.65, minHeight: '120px', ...(streamingText != null ? { opacity: 0.85, cursor: 'default' } : {}) }}
          onFocus={e => { if (streamingText == null) { e.currentTarget.style.borderColor = 'rgba(163,177,138,0.6)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.1)'; } }}
          onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; e.currentTarget.style.boxShadow = 'none'; }}
        />
      </div>

      {/* Layout selector */}
      <div>
        <label style={lbl}>Layout</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {LAYOUT_OPTS.map(l => (
            <button
              key={l}
              onClick={() => upd({ layout: l })}
              style={{
                padding: '6px 12px', borderRadius: '100px', border: 'none', cursor: 'pointer',
                fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.04em',
                background: currentLayout === l ? 'var(--eg-plum, #6D597A)' : 'rgba(255,255,255,0.09)',
                color: currentLayout === l ? '#fff' : 'rgba(255,255,255,0.55)',
                transition: 'all 0.15s',
              }}
            >
              {LAYOUT_LABELS[l] || l}
            </button>
          ))}
        </div>
      </div>

      {/* Mood */}
      <Field label="Mood" value={chapter.mood || ''} onChange={v => upd({ mood: v })} placeholder="e.g. golden hour, cozy winter" />

      {/* AI Rewrite */}
      <motion.button
        onClick={() => onAIRewrite(chapter.id)}
        disabled={isRewriting}
        animate={isRewriting ? { opacity: [0.5, 1, 0.5] } : { opacity: 1 }}
        transition={isRewriting ? { repeat: Infinity, duration: 1.2 } : undefined}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
          padding: '10px 16px', borderRadius: '8px',
          border: '1px solid rgba(163,177,138,0.35)',
          background: isRewriting ? 'rgba(255,255,255,0.04)' : 'rgba(163,177,138,0.12)',
          color: isRewriting ? 'rgba(255,255,255,0.4)' : 'var(--eg-accent, #A3B18A)',
          fontSize: '0.85rem', fontWeight: 700, cursor: isRewriting ? 'not-allowed' : 'pointer',
          letterSpacing: '0.04em', transition: 'all 0.15s',
        }}
        onMouseOver={e => { if (!isRewriting) (e.currentTarget as HTMLElement).style.background = 'rgba(163,177,138,0.22)'; }}
        onMouseOut={e => { if (!isRewriting) (e.currentTarget as HTMLElement).style.background = 'rgba(163,177,138,0.12)'; }}
      >
        {isRewriting
          ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Rewriting…</>
          : <><AIBlocksIcon size={13} /> Rewrite this chapter</>}
      </motion.button>

      {/* Image Manager */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem' }}>
        <ImageManager
          images={chapter.images || []}
          onUpdate={imgs => upd({ images: imgs })}
          imagePosition={chapter.imagePosition}
          onPositionChange={(x, y) => upd({ imagePosition: { x, y } })}
          chapterTitle={chapter.title}
          chapterMood={chapter.mood}
          chapterDescription={chapter.description}
          vibeString={vibeString || ''}
        />
      </div>

      {/* Section Style Overrides */}
      {vibeSkin && onOverridesChange && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--eg-muted, #9A9488)', marginBottom: '8px' }}>
            Section Style
          </div>
          <SectionStyleEditor
            sectionId={chapter.id}
            sectionType="chapter"
            currentOverrides={sectionOverrides}
            vibeSkin={vibeSkin}
            onChange={(overrides) => onOverridesChange(chapter.id, overrides)}
          />
        </div>
      )}
    </motion.div>
  );
}
