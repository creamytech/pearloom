'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / ChapterPanel.tsx — Visual chapter editor
// Redesigned: visual layout previews, mood presets, featured block
// ─────────────────────────────────────────────────────────────

import { useCallback } from 'react';
import { DatePicker } from '@/components/ui/date-picker';
import { motion } from 'framer-motion';
import { Loader2, Sparkles } from 'lucide-react';
import { Field, lbl, inp } from './editor-utils';
import { ImageManager } from './ImageManager';
import { SectionStyleEditor } from './SectionStyleEditor';
import { AlternatesCarousel } from './AlternatesCarousel';
import { AIBlocksIcon } from '@/components/icons/EditorIcons';
import type { Chapter } from '@/types';
import type { VibeSkin } from '@/lib/vibe-engine';
import type { SectionStyleOverrides } from './SectionStyleEditor';

const LAYOUT_OPTS = ['editorial', 'fullbleed', 'split', 'bento', 'cinematic', 'gallery', 'mosaic'] as const;

// Visual layout mini-previews
const LAYOUT_PREVIEWS: Record<string, { label: string; preview: React.ReactNode }> = {
  editorial: {
    label: 'Editorial',
    preview: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '3px' }}>
        <div style={{ height: '14px', background: 'var(--pl-muted)', borderRadius: '2px' }} />
        <div style={{ display: 'flex', gap: '2px' }}>
          <div style={{ flex: 1, height: '8px', background: 'rgba(0,0,0,0.08)', borderRadius: '1px' }} />
          <div style={{ flex: 1, height: '8px', background: 'rgba(0,0,0,0.06)', borderRadius: '1px' }} />
        </div>
        <div style={{ height: '4px', width: '60%', background: 'rgba(0,0,0,0.06)', borderRadius: '1px' }} />
      </div>
    ),
  },
  fullbleed: {
    label: 'Full Bleed',
    preview: (
      <div style={{ height: '100%', background: 'linear-gradient(135deg, rgba(163,177,138,0.3), rgba(109,89,122,0.2))', borderRadius: '2px', display: 'flex', alignItems: 'flex-end', padding: '3px' }}>
        <div style={{ height: '6px', width: '70%', background: 'var(--pl-ink-soft)', borderRadius: '1px' }} />
      </div>
    ),
  },
  split: {
    label: 'Split',
    preview: (
      <div style={{ display: 'flex', gap: '2px', height: '100%', padding: '2px' }}>
        <div style={{ width: '45%', background: 'rgba(163,177,138,0.25)', borderRadius: '2px' }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', justifyContent: 'center', padding: '2px' }}>
          <div style={{ height: '4px', background: 'var(--pl-muted)', borderRadius: '1px' }} />
          <div style={{ height: '4px', width: '70%', background: 'rgba(0,0,0,0.07)', borderRadius: '1px' }} />
        </div>
      </div>
    ),
  },
  cinematic: {
    label: 'Cinematic',
    preview: (
      <div style={{ height: '100%', background: 'linear-gradient(180deg, rgba(43,30,20,0.06), rgba(43,30,20,0.1))', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3px' }}>
        <div style={{ height: '6px', width: '50%', background: 'var(--pl-muted)', borderRadius: '1px' }} />
      </div>
    ),
  },
  gallery: {
    label: 'Gallery',
    preview: (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px', padding: '3px', height: '100%' }}>
        {[0.25, 0.18, 0.2, 0.15].map((o, i) => (
          <div key={i} style={{ background: `rgba(163,177,138,${o})`, borderRadius: '2px' }} />
        ))}
      </div>
    ),
  },
  bento: {
    label: 'Bento',
    preview: (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '2px', padding: '3px', height: '100%' }}>
        <div style={{ gridColumn: 'span 2', background: 'rgba(163,177,138,0.25)', borderRadius: '2px' }} />
        <div style={{ background: 'rgba(255,255,255,0.6)', borderRadius: '2px', border: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '60%', height: '3px', background: 'rgba(0,0,0,0.12)', borderRadius: '1px' }} />
        </div>
        <div style={{ background: 'rgba(163,177,138,0.15)', borderRadius: '2px' }} />
        <div style={{ background: 'rgba(163,177,138,0.2)', borderRadius: '2px' }} />
        <div style={{ background: 'rgba(163,177,138,0.12)', borderRadius: '2px' }} />
      </div>
    ),
  },
  mosaic: {
    label: 'Mosaic',
    preview: (
      <div style={{ position: 'relative', height: '100%', padding: '3px' }}>
        {[{ r: -5, x: 4, y: 2 }, { r: 4, x: 16, y: 4 }, { r: -2, x: 10, y: 12 }].map((p, i) => (
          <div key={i} style={{
            position: 'absolute', width: '12px', height: '14px',
            background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
            transform: `rotate(${p.r}deg)`, left: `${p.x}px`, top: `${p.y}px`,
            borderRadius: '1px',
          }}>
            <div style={{ width: '100%', height: '8px', background: 'rgba(163,177,138,0.3)' }} />
          </div>
        ))}
      </div>
    ),
  },
};

// Mood presets
const MOOD_PRESETS = [
  { id: 'golden-hour', label: 'Golden Hour', color: '#D4A574' },
  { id: 'cozy-winter', label: 'Cozy Winter', color: '#8B7355' },
  { id: 'summer-breeze', label: 'Summer Breeze', color: '#7BA7BC' },
  { id: 'romantic', label: 'Romantic', color: '#B4838D' },
  { id: 'moody', label: 'Moody', color: '#4A3060' },
  { id: 'joyful', label: 'Joyful', color: '#C4A96A' },
  { id: 'nostalgic', label: 'Nostalgic', color: '#A08050' },
  { id: 'elegant', label: 'Elegant', color: '#6D597A' },
];

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
  onShowAlternates?: () => void;
  isLoadingAlternates?: boolean;
  alternates?: string[];
  onSelectAlternate?: (desc: string) => void;
  onCloseAlternates?: () => void;
}

export function ChapterPanel({
  chapter, onUpdate, onAIRewrite, isRewriting, vibeSkin,
  sectionOverrides, onOverridesChange, vibeString, streamingText,
  onShowAlternates, isLoadingAlternates, alternates, onSelectAlternate, onCloseAlternates,
}: ChapterPanelProps) {
  const upd = useCallback((data: Partial<Chapter>) => onUpdate(chapter.id, data), [chapter.id, onUpdate]);
  const currentLayout = chapter.layout || 'editorial';
  const currentMood = chapter.mood || '';

  return (
    <motion.div
      key={chapter.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.22 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
    >
      {/* Featured chapter title — large, editorial */}
      <div>
        <input
          value={chapter.title || ''}
          onChange={e => upd({ title: e.target.value })}
          placeholder="Chapter Title"
          style={{
            ...inp,
            fontSize: 'max(16px, 1.15rem)',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            fontFamily: 'var(--font-heading, "Playfair Display", serif)',
            fontStyle: 'italic',
            background: 'transparent',
            border: 'none',
            borderBottom: '1.5px solid var(--pl-divider, #E0D8CA)',
            borderRadius: 0,
            padding: '6px 0',
            color: 'var(--pl-ink-soft, #3D3530)',
          }}
          onFocus={e => { e.currentTarget.style.borderBottomColor = 'var(--pl-olive, #A3B18A)'; }}
          onBlur={e => { e.currentTarget.style.borderBottomColor = 'var(--pl-divider, #E0D8CA)'; }}
        />
      </div>

      {/* Date + Subtitle — compact row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
        <div>
          <DatePicker
            label="Date"
            value={chapter.date ? chapter.date.slice(0, 10) : ''}
            onChange={(d) => upd({ date: d })}
          />
        </div>
        <Field label="Subtitle" value={chapter.subtitle || ''} onChange={v => upd({ subtitle: v })} placeholder="in all the best ways" />
      </div>

      {/* Story text — the main content area */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <label style={{ ...lbl, fontSize: '0.62rem', marginBottom: 0 }}>Story</label>
          <div style={{ display: 'flex', gap: '4px' }}>
            <motion.button
              onClick={() => onAIRewrite(chapter.id)}
              disabled={isRewriting}
              whileHover={!isRewriting ? { scale: 1.04 } : {}}
              whileTap={!isRewriting ? { scale: 0.96 } : {}}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '3px 8px', borderRadius: '100px',
                border: '1px solid rgba(163,177,138,0.35)',
                background: isRewriting ? 'rgba(163,177,138,0.12)' : 'rgba(163,177,138,0.06)',
                color: 'var(--pl-olive-deep, #6E8C5C)',
                fontSize: '0.65rem', fontWeight: 700, cursor: isRewriting ? 'not-allowed' : 'pointer',
              }}
            >
              {isRewriting ? <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={10} />}
              {isRewriting ? 'Rewriting…' : 'AI Rewrite'}
            </motion.button>
            {onShowAlternates && (
              <motion.button
                onClick={onShowAlternates}
                disabled={isLoadingAlternates}
                whileHover={!isLoadingAlternates ? { scale: 1.04 } : {}}
                whileTap={!isLoadingAlternates ? { scale: 0.96 } : {}}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  padding: '3px 8px', borderRadius: '100px',
                  border: '1px solid rgba(109,89,122,0.25)',
                  background: 'rgba(109,89,122,0.06)',
                  color: 'var(--pl-plum, #6D597A)',
                  fontSize: '0.65rem', fontWeight: 700, cursor: isLoadingAlternates ? 'not-allowed' : 'pointer',
                }}
              >
                {isLoadingAlternates ? <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> : '✦'}
                {isLoadingAlternates ? 'Generating…' : '3 Alternatives'}
              </motion.button>
            )}
          </div>
        </div>
        <textarea
          value={streamingText != null ? streamingText + '▋' : (chapter.description || '')}
          onChange={streamingText != null ? undefined : e => upd({ description: e.target.value })}
          readOnly={streamingText != null}
          rows={5}
          placeholder="Write your memory here..."
          style={{
            ...inp, resize: 'vertical', lineHeight: 1.7, minHeight: '140px',
            fontSize: '0.9rem',
            ...(streamingText != null ? { opacity: 0.85, cursor: 'default' } : {}),
          }}
          onFocus={e => { if (streamingText == null) { e.currentTarget.style.borderColor = 'rgba(163,177,138,0.6)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.1)'; } }}
          onBlur={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.07)'; e.currentTarget.style.boxShadow = 'none'; }}
        />
      </div>

      {/* Alternates Carousel */}
      {alternates && alternates.length > 0 && onSelectAlternate && onCloseAlternates && (
        <AlternatesCarousel
          chapterId={chapter.id}
          alternates={alternates}
          onSelect={onSelectAlternate}
          onClose={onCloseAlternates}
        />
      )}

      {/* Layout Override — collapsed by default, auto-assigned normally */}
      <details style={{ marginTop: '0.25rem' }}>
        <summary style={{
          fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: 'var(--pl-muted)',
          cursor: 'pointer', padding: '4px 0', listStyle: 'none',
          display: 'flex', alignItems: 'center', gap: '4px',
        }}>
          <span style={{ fontSize: '0.5rem' }}>▸</span> Layout Override
          <span style={{ fontSize: '0.55rem', fontWeight: 500, fontStyle: 'italic', textTransform: 'none', letterSpacing: 'normal' }}>
            (auto: {currentLayout})
          </span>
        </summary>
        <div style={{ marginTop: '6px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
          {LAYOUT_OPTS.map(l => {
            const isActive = currentLayout === l;
            const { label, preview } = LAYOUT_PREVIEWS[l] || { label: l, preview: null };
            return (
              <motion.button
                key={l}
                onClick={() => upd({ layout: l })}
                whileHover={!isActive ? { scale: 1.04, borderColor: 'var(--pl-olive, #A3B18A)' } : {}}
                whileTap={{ scale: 0.96 }}
                style={{
                  display: 'flex', flexDirection: 'column',
                  border: isActive ? '2px solid var(--pl-olive, #A3B18A)' : '1px solid var(--pl-divider, #E0D8CA)',
                  borderRadius: '8px', cursor: 'pointer',
                  background: isActive ? 'rgba(163,177,138,0.08)' : '#fff',
                  overflow: 'hidden', transition: 'border-color 0.15s',
                  padding: 0,
                  boxShadow: isActive ? '0 2px 8px rgba(163,177,138,0.15)' : '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ height: '36px', overflow: 'hidden', background: 'var(--pl-cream-deep, #F0EBE0)' }}>
                  {preview}
                </div>
                <div style={{
                  padding: '4px 6px',
                  fontSize: '0.6rem', fontWeight: 700,
                  letterSpacing: '0.04em',
                  color: isActive ? 'var(--pl-olive-deep, #6E8C5C)' : 'var(--pl-muted, #7A756E)',
                  textAlign: 'center',
                }}>
                  {label}
                </div>
              </motion.button>
            );
          })}
        </div>
        </div>
      </details>

      {/* Mood — visual selectable presets */}
      <div>
        <label style={{ ...lbl, fontSize: '0.62rem' }}>Mood</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '6px' }}>
          {MOOD_PRESETS.map(m => {
            const isActive = currentMood.toLowerCase().includes(m.id.replace('-', ' '));
            return (
              <motion.button
                key={m.id}
                onClick={() => upd({ mood: m.label.toLowerCase() })}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '4px 10px', borderRadius: '100px',
                  border: isActive ? `2px solid ${m.color}` : '1px solid var(--pl-divider, #E0D8CA)',
                  background: isActive ? `${m.color}15` : '#fff',
                  cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600,
                  color: isActive ? m.color : 'var(--pl-ink-soft, #3D3530)',
                  transition: 'all 0.15s',
                  boxShadow: isActive ? `0 2px 8px ${m.color}20` : 'none',
                }}
              >
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: m.color, flexShrink: 0 }} />
                {m.label}
              </motion.button>
            );
          })}
        </div>
        <input
          value={chapter.mood || ''}
          onChange={e => upd({ mood: e.target.value })}
          placeholder="Or type your own mood..."
          style={{ ...inp, fontSize: '0.82rem', padding: '5px 8px' }}
          onFocus={e => { e.currentTarget.style.borderColor = 'rgba(163,177,138,0.6)'; }}
          onBlur={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.07)'; }}
        />
      </div>

      {/* Image Manager */}
      <div style={{ borderTop: '1px solid rgba(0,0,0,0.04)', paddingTop: '0.75rem' }}>
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
        <div style={{ borderTop: '1px solid rgba(0,0,0,0.04)', paddingTop: '0.75rem' }}>
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
