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
  return <div style={{ height: '1px', background: '#F4F4F5', margin: '4px 0' }} />;
}

/** Section label — just a small muted string, no card */
function Label({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.04em',
      textTransform: 'uppercase', color: '#A1A1AA', display: 'block',
      marginBottom: '6px',
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
          fontSize: 'max(16px, 0.9rem)',
          fontWeight: 600,
          padding: '8px 10px',
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
                display: 'flex', alignItems: 'center', gap: '3px',
                padding: '3px 8px', borderRadius: '4px',
                border: '1px solid #E4E4E7', background: '#fff',
                color: '#18181B', fontSize: '0.6rem', fontWeight: 600,
                cursor: isRewriting ? 'not-allowed' : 'pointer',
                opacity: isRewriting ? 0.5 : 1,
              }}
            >
              {isRewriting ? <Loader2 size={9} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={9} />}
              Rewrite
            </button>
            {onShowAlternates && (
              <button
                onClick={onShowAlternates}
                disabled={isLoadingAlternates}
                style={{
                  display: 'flex', alignItems: 'center', gap: '3px',
                  padding: '3px 8px', borderRadius: '4px',
                  border: '1px solid #E4E4E7', background: '#fff',
                  color: '#18181B', fontSize: '0.6rem', fontWeight: 600,
                  cursor: isLoadingAlternates ? 'not-allowed' : 'pointer',
                  opacity: isLoadingAlternates ? 0.5 : 1,
                }}
              >
                {isLoadingAlternates ? <Loader2 size={9} style={{ animation: 'spin 1s linear infinite' }} /> : '✦'}
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
            ...inp, resize: 'vertical', lineHeight: 1.6, minHeight: '80px',
            fontSize: '0.8rem', padding: '8px 10px',
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
                  display: 'inline-flex', alignItems: 'center', gap: '3px',
                  padding: '2px 7px', borderRadius: '4px',
                  border: isActive ? `1.5px solid ${m.color}` : '1px solid #E4E4E7',
                  background: isActive ? `${m.color}10` : 'transparent',
                  cursor: 'pointer', fontSize: '0.6rem', fontWeight: 500,
                  color: isActive ? m.color : '#71717A',
                  lineHeight: '18px',
                }}
              >
                <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: m.color, flexShrink: 0 }} />
                {m.label}
              </button>
            );
          })}
        </div>
        <input
          value={chapter.mood || ''}
          onChange={e => upd({ mood: e.target.value })}
          placeholder="Or type a custom mood..."
          style={{ ...inp, fontSize: '0.65rem', padding: '5px 8px', minHeight: 'auto' }}
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
