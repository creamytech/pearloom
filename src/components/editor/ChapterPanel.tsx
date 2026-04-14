'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / ChapterPanel.tsx — Chapter editor panel
// Flat layout, no nested cards, no motion on chips
// ─────────────────────────────────────────────────────────────

import { useCallback } from 'react';
import { DatePicker } from '@/components/ui/date-picker';
import { Sparkles, Loader2 } from 'lucide-react';
import { Field, inp } from './editor-utils';
import { ImageManager } from './ImageManager';
import { SectionStyleEditor } from './SectionStyleEditor';
import { AlternatesCarousel } from './AlternatesCarousel';
import {
  panelText,
  panelWeight,
  panelTracking,
  panelLineHeight,
  panelDivider,
} from './panel';
import type { Chapter } from '@/types';
import type { VibeSkin } from '@/lib/vibe-engine';
import type { SectionStyleOverrides } from './SectionStyleEditor';

const MOOD_PRESETS = [
  { id: 'romantic', label: 'Romantic', color: '#E8927A' },
  { id: 'nostalgic', label: 'Nostalgic', color: '#C4A96A' },
  { id: 'joyful', label: 'Joyful', color: '#52525B' },
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

/** Lightweight divider between sections */
function Divider() {
  return <div style={{ height: '1px', background: panelDivider.color, margin: '4px 0' }} />;
}

/** Section label — just a small muted string, no card */
function Label({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: panelText.label,
      fontWeight: panelWeight.bold,
      letterSpacing: panelTracking.wider,
      textTransform: 'uppercase',
      color: '#71717A',
      display: 'block',
      marginBottom: '6px',
      lineHeight: panelLineHeight.tight,
    }}>
      {children}
    </span>
  );
}

export function ChapterPanel({
  chapter, onUpdate, onAIRewrite, isRewriting, vibeSkin,
  sectionOverrides, onOverridesChange, vibeString, streamingText,
  onShowAlternates, isLoadingAlternates, alternates, onSelectAlternate, onCloseAlternates,
}: ChapterPanelProps) {
  const upd = useCallback((data: Partial<Chapter>) => onUpdate(chapter.id, data), [chapter.id, onUpdate]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '2px 0' }}>

      {/* Title */}
      <input
        value={chapter.title || ''}
        onChange={e => upd({ title: e.target.value })}
        placeholder="Chapter title"
        style={{
          ...inp,
          fontSize: 'max(16px, 0.85rem)',
          fontWeight: panelWeight.semibold,
          fontFamily: 'inherit',
          padding: '9px 11px',
          lineHeight: panelLineHeight.tight,
        }}
      />

      {/* Date + Subtitle — side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
        <DatePicker
          label="Date"
          value={chapter.date ? chapter.date.slice(0, 10) : ''}
          onChange={(d) => upd({ date: d })}
        />
        <Field label="Subtitle" value={chapter.subtitle || ''} onChange={v => upd({ subtitle: v })} placeholder="A quiet beginning" />
      </div>

      <Divider />

      {/* Story text */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <Label>Story</Label>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => onAIRewrite(chapter.id)}
              disabled={isRewriting}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '4px 9px', borderRadius: '6px',
                border: '1px solid #E4E4E7', background: '#F4F4F5',
                color: '#18181B',
                fontSize: panelText.chip,
                fontWeight: panelWeight.semibold,
                fontFamily: 'inherit',
                cursor: isRewriting ? 'not-allowed' : 'pointer',
                opacity: isRewriting ? 0.5 : 1,
                transition: 'background 0.15s',
              }}
            >
              {isRewriting ? <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={10} />}
              Rewrite
            </button>
            {onShowAlternates && (
              <button
                onClick={onShowAlternates}
                disabled={isLoadingAlternates}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  padding: '4px 9px', borderRadius: '6px',
                  border: '1px solid #E4E4E7', background: '#F4F4F5',
                  color: '#18181B',
                  fontSize: panelText.chip,
                  fontWeight: panelWeight.semibold,
                  fontFamily: 'inherit',
                  cursor: isLoadingAlternates ? 'not-allowed' : 'pointer',
                  opacity: isLoadingAlternates ? 0.5 : 1,
                  transition: 'background 0.15s',
                }}
              >
                {isLoadingAlternates ? <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> : '✦'}
                Alts
              </button>
            )}
          </div>
        </div>
        <textarea
          value={streamingText != null ? streamingText + '▋' : (chapter.description || '')}
          onChange={streamingText != null ? undefined : e => upd({ description: e.target.value })}
          readOnly={streamingText != null}
          rows={3}
          placeholder="Write your memory here..."
          style={{
            ...inp,
            resize: 'vertical',
            lineHeight: 1.55,
            minHeight: '80px',
            fontSize: 'max(16px, 0.8rem)',
            fontFamily: 'inherit',
            padding: '9px 11px',
            ...(streamingText != null ? { opacity: 0.85, cursor: 'default' } : {}),
          }}
        />
      </div>

      {/* Alternates */}
      {alternates && alternates.length > 0 && onSelectAlternate && onCloseAlternates && (
        <AlternatesCarousel
          chapterId={chapter.id}
          alternates={alternates}
          onSelect={onSelectAlternate}
          onClose={onCloseAlternates}
        />
      )}

      <Divider />

      {/* Mood — compact chip row */}
      <div>
        <Label>Mood</Label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginBottom: '6px' }}>
          {MOOD_PRESETS.map(m => {
            const isActive = (chapter.mood || '').toLowerCase().includes(m.id);
            return (
              <button
                key={m.id}
                onClick={() => upd({ mood: m.label.toLowerCase() })}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 11px', borderRadius: '100px',
                  border: isActive ? `2px solid ${m.color}` : '1px solid #E4E4E7',
                  background: isActive ? `${m.color}1A` : '#FFFFFF',
                  cursor: 'pointer',
                  fontSize: panelText.chip,
                  fontWeight: isActive ? panelWeight.bold : panelWeight.semibold,
                  fontFamily: 'inherit',
                  color: isActive ? m.color : '#3F3F46',
                  transition: 'all 0.15s',
                  lineHeight: panelLineHeight.tight,
                }}
              >
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: m.color, flexShrink: 0 }} />
                {m.label}
              </button>
            );
          })}
        </div>
        <input
          value={chapter.mood || ''}
          onChange={e => upd({ mood: e.target.value })}
          placeholder="Or type a custom mood..."
          style={{
            ...inp,
            fontSize: 'max(16px, 0.75rem)',
            fontFamily: 'inherit',
            padding: '7px 10px',
            minHeight: 'auto',
          }}
        />
      </div>

      <Divider />

      {/* Photos — ImageManager provides its own header */}
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

      {/* Style overrides */}
      {vibeSkin && onOverridesChange && (
        <>
          <Divider />
          <div>
            <Label>Style</Label>
            <SectionStyleEditor
              sectionId={chapter.id}
              sectionType="chapter"
              currentOverrides={sectionOverrides}
              vibeSkin={vibeSkin}
              onChange={(overrides) => onOverridesChange(chapter.id, overrides)}
            />
          </div>
        </>
      )}
    </div>
  );
}
