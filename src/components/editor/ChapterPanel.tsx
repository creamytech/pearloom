'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / ChapterPanel.tsx — Organic glass chapter editor
// Clean grouped sections with glass cards
// ─────────────────────────────────────────────────────────────

import { useCallback, useState } from 'react';
import { DatePicker } from '@/components/ui/date-picker';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2 } from 'lucide-react';
import { Field, lbl, inp } from './editor-utils';
import { ImageManager } from './ImageManager';
import { SectionStyleEditor } from './SectionStyleEditor';
import { AlternatesCarousel } from './AlternatesCarousel';
import { panelText, panelWeight, panelTracking, panelSection } from './panel';
import type { Chapter } from '@/types';
import type { VibeSkin } from '@/lib/vibe-engine';
import type { SectionStyleOverrides } from './SectionStyleEditor';

const MOOD_PRESETS = [
  { id: 'romantic', label: 'Romantic', color: '#E8927A' },
  { id: 'nostalgic', label: 'Nostalgic', color: '#C4A96A' },
  { id: 'joyful', label: 'Joyful', color: '#A3B18A' },
  { id: 'intimate', label: 'Intimate', color: '#6D597A' },
  { id: 'playful', label: 'Playful', color: '#7BA7BC' },
  { id: 'bittersweet', label: 'Bittersweet', color: '#8B7355' },
  { id: 'adventurous', label: 'Adventurous', color: '#4A9B8A' },
  { id: 'dramatic', label: 'Dramatic', color: '#4A3060' },
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

// Glass section wrapper — stays lightweight (no chevron/collapsible)
// because ChapterPanel is embedded inline inside StoryPanel's chapter
// edit flyout, not at the top of the sidebar. Heading / chrome comes
// from the shared panel tokens so it matches every other panel.
function Section({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <div style={{
      background: panelSection.cardBg,
      borderRadius: panelSection.cardRadius,
      border: panelSection.cardBorder,
      padding: panelSection.cardPadding,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
    }}>
      {label && (
        <span style={{
          fontSize: panelText.heading,
          fontWeight: panelWeight.bold,
          letterSpacing: panelTracking.wider,
          textTransform: 'uppercase',
          color: 'var(--pl-ink-soft)',
        }}>
          {label}
        </span>
      )}
      {children}
    </div>
  );
}

export function ChapterPanel({
  chapter, onUpdate, onAIRewrite, isRewriting, vibeSkin,
  sectionOverrides, onOverridesChange, vibeString, streamingText,
  onShowAlternates, isLoadingAlternates, alternates, onSelectAlternate, onCloseAlternates,
}: ChapterPanelProps) {
  const upd = useCallback((data: Partial<Chapter>) => onUpdate(chapter.id, data), [chapter.id, onUpdate]);

  return (
    <motion.div
      key={chapter.id}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.2 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
    >
      {/* ── Title ── */}
      <input
        value={chapter.title || ''}
        onChange={e => upd({ title: e.target.value })}
        placeholder="Chapter Title"
        style={{
          ...inp,
          fontSize: 'max(16px, 1.1rem)',
          fontWeight: 600,
          fontFamily: 'inherit',
          letterSpacing: '-0.02em',
        }}
      />

      {/* ── Date + Subtitle ── */}
      <Section label="Details">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <DatePicker
            label="Date"
            value={chapter.date ? chapter.date.slice(0, 10) : ''}
            onChange={(d) => upd({ date: d })}
          />
          <Field label="Subtitle" value={chapter.subtitle || ''} onChange={v => upd({ subtitle: v })} placeholder="A quiet beginning" />
        </div>
      </Section>

      {/* ── Story text + AI actions ── */}
      <Section label="Story">
        <div style={{ display: 'flex', gap: '6px', marginBottom: '2px' }}>
          <motion.button
            onClick={() => onAIRewrite(chapter.id)}
            disabled={isRewriting}
            whileHover={!isRewriting ? { scale: 1.03 } : {}}
            whileTap={!isRewriting ? { scale: 0.97 } : {}}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '5px 12px', borderRadius: '6px',
              border: '1px solid #E4E4E7',
              background: '#FFFFFF',
              color: '#18181B',
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
              whileHover={!isLoadingAlternates ? { scale: 1.03 } : {}}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '5px 12px', borderRadius: '6px',
                border: '1px solid #E4E4E7',
                background: '#FFFFFF',
                color: '#18181B',
                fontSize: '0.65rem', fontWeight: 700, cursor: isLoadingAlternates ? 'not-allowed' : 'pointer',
              }}
            >
              {isLoadingAlternates ? <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> : '✦'}
              {isLoadingAlternates ? 'Generating…' : '3 Alternatives'}
            </motion.button>
          )}
        </div>
        <textarea
          value={streamingText != null ? streamingText + '▋' : (chapter.description || '')}
          onChange={streamingText != null ? undefined : e => upd({ description: e.target.value })}
          readOnly={streamingText != null}
          rows={4}
          placeholder="Write your memory here..."
          style={{
            ...inp, resize: 'vertical', lineHeight: 1.7, minHeight: '120px',
            fontSize: '0.88rem',
            ...(streamingText != null ? { opacity: 0.85, cursor: 'default' } : {}),
          }}
        />
      </Section>

      {/* Alternates */}
      {alternates && alternates.length > 0 && onSelectAlternate && onCloseAlternates && (
        <AlternatesCarousel
          chapterId={chapter.id}
          alternates={alternates}
          onSelect={onSelectAlternate}
          onClose={onCloseAlternates}
        />
      )}

      {/* ── Mood ── */}
      <Section label="Mood">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
          {MOOD_PRESETS.map(m => {
            const isActive = (chapter.mood || '').toLowerCase().includes(m.id);
            return (
              <motion.button
                key={m.id}
                onClick={() => upd({ mood: m.label.toLowerCase() })}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  padding: '4px 10px', borderRadius: '6px',
                  border: isActive ? `1.5px solid ${m.color}` : '1px solid #E4E4E7',
                  background: isActive ? `${m.color}18` : '#FFFFFF',
                  cursor: 'pointer', fontSize: '0.68rem', fontWeight: 600,
                  color: isActive ? m.color : 'var(--pl-ink-soft)',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: m.color }} />
                {m.label}
              </motion.button>
            );
          })}
        </div>
        <input
          value={chapter.mood || ''}
          onChange={e => upd({ mood: e.target.value })}
          placeholder="Or type a custom mood..."
          style={{ ...inp, fontSize: '0.78rem', padding: '6px 10px' }}
        />
      </Section>

      {/* ── Photos ── */}
      <Section label="Photos">
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
      </Section>

      {/* ── Style overrides ── */}
      {vibeSkin && onOverridesChange && (
        <Section label="Section Style">
          <SectionStyleEditor
            sectionId={chapter.id}
            sectionType="chapter"
            currentOverrides={sectionOverrides}
            vibeSkin={vibeSkin}
            onChange={(overrides) => onOverridesChange(chapter.id, overrides)}
          />
        </Section>
      )}
    </motion.div>
  );
}
