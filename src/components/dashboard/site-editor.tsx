'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/dashboard/site-editor.tsx
// Complete Site Editor — chapters + design system + password + patterns
// Improvements: #11 font picker, #12 live color preview, #10 patterns, #18 password
// ─────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react';
import { CustomSelect } from '@/components/ui/custom-select';
import { DatePicker } from '@/components/ui/date-picker';
import { ColorPicker } from '@/components/ui/color-picker';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, Check, GripVertical, Trash2, Plus, Lock, Unlock, Eye, LayoutDashboard } from 'lucide-react';
import type { Chapter, StoryManifest } from '@/types';

// dnd-kit uses browser-only pointer/keyboard APIs — must NOT run on the server
// Static import crashes Vercel with 'n is not a function' during SSR
const BlockEditor = dynamic(
  () => import('@/components/dashboard/block-editor').then(m => m.BlockEditor),
  {
    ssr: false,
    loading: () => (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '400px', color: 'var(--pl-muted)', fontSize: '0.9rem',
        gap: '0.75rem', flexDirection: 'column',
      }}>
        <div style={{
          width: '40px', height: '51px',
          borderRadius: '42% 42% 52% 52% / 30% 30% 52% 52%',
          background: 'rgba(163,177,138,0.12)',
          border: '1px solid rgba(163,177,138,0.2)',
          animation: 'pulse 1.5s ease-in-out infinite',
        }} />
        <span>Loading editor…</span>
      </div>
    ),
  }
);

interface SiteEditorProps {
  manifest: StoryManifest;
  onChange: (manifest: StoryManifest) => void;
  onSave?: () => void;
  onPreview?: () => void;
}

// ── Curated font pairings ──
const HEADING_FONTS = [
  { name: 'Playfair Display', label: 'Playfair Display', style: 'Editorial' },
  { name: 'Cormorant Garamond', label: 'Cormorant Garamond', style: 'Classic' },
  { name: 'Lora', label: 'Lora', style: 'Elegant' },
  { name: 'Cinzel', label: 'Cinzel', style: 'High Fashion' },
  { name: 'DM Serif Display', label: 'DM Serif', style: 'Modern Serif' },
  { name: 'Libre Baskerville', label: 'Libre Baskerville', style: 'Traditional' },
  { name: 'Inter', label: 'Inter', style: 'Clean Modern' },
  { name: 'Outfit', label: 'Outfit', style: 'Geometric' },
];

const BODY_FONTS = [
  { name: 'Inter', label: 'Inter', style: 'Clean' },
  { name: 'Lora', label: 'Lora', style: 'Serif Readable' },
  { name: 'Outfit', label: 'Outfit', style: 'Geometric' },
  { name: 'Roboto', label: 'Roboto', style: 'Standard' },
  { name: 'PT Serif', label: 'PT Serif', style: 'Traditional' },
  { name: 'DM Sans', label: 'DM Sans', style: 'Humanist' },
];

const PATTERNS = [
  { value: 'none', label: 'None' },
  { value: 'noise', label: 'Noise / Grain' },
  { value: 'dots', label: 'Dot Grid' },
  { value: 'grid', label: 'Fine Grid' },
  { value: 'waves', label: 'Line Waves' },
  { value: 'topography', label: 'Topography' },
  { value: 'floral', label: 'Radial Glow' },
];

// ── Color section ──
function ColorField({
  label, value, onChange,
}: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label style={{
        display: 'block', fontSize: '0.7rem', fontWeight: 700,
        letterSpacing: '0.12em', textTransform: 'uppercase',
        color: 'var(--pl-muted)', marginBottom: '0.6rem',
      }}>
        {label}
      </label>
      <ColorPicker value={value} onChange={onChange} />
    </div>
  );
}

// ── Live color preview swatch ──
function ColorPreviewSwatch({ colors }: { colors: Record<string, string> }) {
  return (
    <div style={{
      borderRadius: '0.75rem', overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.4)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
      fontSize: '0.7rem',
    }}>
      <div style={{ background: colors.background, padding: '1rem' }}>
        <div style={{ fontFamily: 'var(--pl-font-heading)', fontSize: '1rem', color: colors.foreground, marginBottom: '0.4rem' }}>
          Shauna & Ben
        </div>
        <div style={{ color: colors.muted, fontSize: '0.75rem', marginBottom: '0.8rem' }}>
          The beginning of everything.
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ background: colors.accent, color: '#fff', padding: '0.3rem 0.8rem', borderRadius: '100px', fontSize: '0.7rem', fontWeight: 700 }}>
            View Story
          </div>
          <div style={{ background: colors.accentLight, color: colors.accent, padding: '0.3rem 0.8rem', borderRadius: '100px', fontSize: '0.7rem', fontWeight: 600 }}>
            RSVP
          </div>
        </div>
      </div>
      <div style={{ background: colors.accent, color: '#fff', padding: '0.5rem 1rem', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        Accent strip ↑
      </div>
    </div>
  );
}

export function SiteEditor({ manifest, onChange, onSave, onPreview }: SiteEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'builder' | 'chapters' | 'design' | 'details'>('builder');

  const updateColor = useCallback((key: keyof typeof manifest.theme.colors, value: string) => {
    onChange({ ...manifest, theme: { ...manifest.theme, colors: { ...manifest.theme.colors, [key]: value } } });
  }, [manifest, onChange]);

  const updateChapter = (chapterId: string, updates: Partial<Chapter>) => {
    onChange({ ...manifest, chapters: manifest.chapters.map(ch => ch.id === chapterId ? { ...ch, ...updates } : ch) });
  };

  const deleteChapter = (chapterId: string) => {
    onChange({ ...manifest, chapters: manifest.chapters.filter(ch => ch.id !== chapterId) });
  };

  const addChapter = () => {
    const newChapter: Chapter = {
      id: `ch-${Date.now()}`,
      date: new Date().toISOString(),
      title: 'New Chapter',
      subtitle: 'Add your subtitle',
      description: 'Write your story here...',
      images: [],
      location: null,
      mood: 'new',
      order: manifest.chapters.length,
    };
    onChange({ ...manifest, chapters: [...manifest.chapters, newChapter] });
    setEditingId(newChapter.id);
  };

  const moveChapter = (index: number, direction: 'up' | 'down') => {
    const chapters = [...manifest.chapters];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= chapters.length) return;
    [chapters[index], chapters[targetIndex]] = [chapters[targetIndex], chapters[index]];
    onChange({ ...manifest, chapters });
  };

  const TAB_STYLE = (active: boolean, accent?: boolean) => ({
    padding: '0.6rem 1.25rem',
    borderRadius: '0.5rem',
    fontSize: '0.75rem',
    fontWeight: 700 as const,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    border: 'none',
    cursor: 'pointer' as const,
    background: active ? (accent ? 'var(--pl-olive)' : 'var(--pl-ink)') : 'transparent',
    color: active ? '#fff' : 'var(--pl-muted)',
    transition: 'all 0.2s ease',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* ── Header + Tabs ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1rem 1.5rem',
        background: 'rgba(255,255,255,0.45)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.5)',
        boxShadow: '0 4px 20px rgba(43,30,20,0.06)',
        gap: '1rem', flexWrap: 'wrap',
      }}
>
        {/* Tab group */}
        <div style={{ display: 'flex', gap: '0.25rem', background: 'rgba(255,255,255,0.3)', borderRadius: '12px', padding: '0.3rem' }}>
          {/* Builder gets accent highlight — it's the premium DnD mode */}
          <button
            onClick={() => setActiveTab('builder')}
            style={{
              ...TAB_STYLE(activeTab === 'builder', true),
              display: 'flex', alignItems: 'center', gap: '0.35rem',
            }}
          >
            <LayoutDashboard size={13} />
            Builder ✦
          </button>
          {(['chapters', 'design', 'details'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={TAB_STYLE(activeTab === tab)}>
              {tab}
            </button>
          ))}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Auto-save indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', color: '#22c55e', fontWeight: 600, letterSpacing: '0.05em' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px rgba(34,197,94,0.6)' }} />
            Auto-saved
          </div>
          {onPreview && (
            <button
              onClick={onPreview}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.6rem 1.25rem', borderRadius: '100px',
                border: '1.5px solid rgba(255,255,255,0.5)', background: 'transparent',
                color: 'var(--pl-ink)', fontSize: '0.78rem', fontWeight: 700,
                cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase',
                transition: 'all 0.2s ease',
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--pl-olive)'; e.currentTarget.style.color = 'var(--pl-olive)'; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'; e.currentTarget.style.color = 'var(--pl-ink)'; }}
            >
              <Eye size={14} />
              Preview
            </button>
          )}
          {onSave && (
            <button
              onClick={onSave}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.65rem 1.5rem', borderRadius: '100px',
                background: 'linear-gradient(135deg, var(--pl-cream-deep), var(--pl-cream))',
                color: '#fff', border: 'none',
                fontSize: '0.78rem', fontWeight: 700,
                cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase',
                boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
                transition: 'all 0.2s ease',
              }}
              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 12px 28px rgba(0,0,0,0.25)'; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.2)'; }}
            >
              <Check size={14} />
              Publish
            </button>
          )}
        </div>
      </div>

      {/* ── Builder Tab (DnD Block Editor) ── */}
      <AnimatePresence mode="popLayout">
        {activeTab === 'builder' && (
          <motion.div key="builder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <BlockEditor
              manifest={manifest}
              onChange={onChange}
              onSave={onSave}
              onPreview={onPreview}
            />
          </motion.div>
        )}

        {/* ── Chapters Tab ── */}
        {activeTab === 'chapters' && (
          <motion.div key="chapters" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={addChapter}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.6rem 1.25rem', borderRadius: '0.6rem',
                  border: '1.5px dashed rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.25)',
                  color: 'var(--pl-muted)', fontSize: '0.8rem', fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
                onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--pl-olive)'; e.currentTarget.style.color = 'var(--pl-olive)'; }}
                onMouseOut={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'; e.currentTarget.style.color = 'var(--pl-muted)'; }}
              >
                <Plus size={15} />
                Add Chapter
              </button>
            </div>

            {manifest.chapters.map((chapter, index) => (
              <motion.div
                key={chapter.id}
                layout
                style={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', overflow: 'hidden', boxShadow: '0 4px 20px rgba(43,30,20,0.06)' } as React.CSSProperties}
              >
                {editingId === chapter.id ? (
                  <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.3)' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--pl-olive)', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                        Chapter {index + 1}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <label style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--pl-muted)' }}>Layout</label>
                        <select
                          value={chapter.layout || 'editorial'}
                          onChange={(e) => updateChapter(chapter.id, { layout: e.target.value as Chapter['layout'] })}
                          style={{ padding: '0.4rem 0.75rem', borderRadius: '0.4rem', border: '1.5px solid rgba(255,255,255,0.4)', background: 'transparent', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                        >
                          <option value="editorial">Editorial</option>
                          <option value="fullbleed">Fullbleed</option>
                          <option value="split">Split Card</option>
                          <option value="cinematic">Cinematic</option>
                          <option value="gallery">Gallery Grid</option>
                          <option value="mosaic">Mosaic Polaroids</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {[
                          { label: 'Title', key: 'title' as const, type: 'text', size: '1.1rem', font: manifest.theme.fonts.heading },
                          { label: 'Subtitle', key: 'subtitle' as const, type: 'text', size: '0.9rem', italic: true },
                        ].map(field => (
                          <div key={field.key}>
                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--pl-muted)', marginBottom: '0.5rem' }}>
                              {field.label}
                            </label>
                            <input
                              type="text"
                              value={chapter[field.key] as string}
                              onChange={(e) => updateChapter(chapter.id, { [field.key]: e.target.value })}
                              style={{
                                width: '100%', padding: '0.7rem 1rem', borderRadius: '0.6rem',
                                border: '1.5px solid rgba(255,255,255,0.4)', outline: 'none',
                                fontSize: field.size, fontFamily: field.font ? `"${field.font}", serif` : 'inherit',
                                fontStyle: field.italic ? 'italic' : 'normal',
                                background: 'rgba(255,255,255,0.35)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', boxSizing: 'border-box',
                              }}
                              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--pl-olive)'}
                              onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'}
                            />
                          </div>
                        ))}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--pl-muted)', marginBottom: '0.5rem' }}>Date</label>
                            <DatePicker value={chapter.date.slice(0, 10)} onChange={(d) => updateChapter(chapter.id, { date: d })} />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--pl-muted)', marginBottom: '0.5rem' }}>Mood</label>
                            <input type="text" value={chapter.mood} onChange={(e) => updateChapter(chapter.id, { mood: e.target.value })}
                              placeholder="e.g. Romantic"
                              style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.4)', outline: 'none', fontSize: '0.85rem', background: 'rgba(255,255,255,0.35)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', boxSizing: 'border-box' }} />
                          </div>
                        </div>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--pl-muted)', marginBottom: '0.5rem' }}>The Story</label>
                        <textarea
                          value={chapter.description}
                          onChange={(e) => updateChapter(chapter.id, { description: e.target.value })}
                          placeholder="Write your beautiful memory here..."
                          style={{
                            width: '100%', height: '180px', padding: '0.9rem 1rem',
                            borderRadius: '12px', border: '1px solid rgba(255,255,255,0.4)',
                            outline: 'none', fontSize: '0.9rem', lineHeight: 1.7,
                            resize: 'none', background: 'rgba(255,255,255,0.35)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', boxSizing: 'border-box',
                          }}
                          onFocus={(e) => e.currentTarget.style.borderColor = 'var(--pl-olive)'}
                          onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.3)' }}>
                      <button
                        onClick={() => setEditingId(null)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          padding: '0.6rem 1.5rem', borderRadius: '0.6rem',
                          background: 'var(--pl-olive)', color: '#fff',
                          border: 'none', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                        }}
                      >
                        <Check size={14} />
                        Done
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem' }} className="group">
                    {/* Reorder arrows */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', opacity: 0, transition: 'opacity 0.2s' }} className="group-hover:opacity-100">
                      <button onClick={() => moveChapter(index, 'up')} disabled={index === 0} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pl-muted)', padding: '2px', opacity: index === 0 ? 0.3 : 1 }}>
                        <GripVertical size={14} />
                      </button>
                    </div>

                    {/* Thumbnail */}
                    <div style={{ width: '64px', height: '64px', borderRadius: '0.6rem', overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.3)' }}>
                      {chapter.images?.[0] ? (
                        <img src={chapter.images[0].url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.25)' }}>
                          {chapter.images?.length ? `${chapter.images.length} photos` : 'No Image'}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--pl-olive)', background: 'rgba(255,255,255,0.35)', padding: '0.2rem 0.5rem', borderRadius: '0.25rem' }}>
                          {new Date(chapter.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </span>
                        {chapter.layout && (
                          <span style={{ fontSize: '0.6rem', color: 'var(--pl-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
                            {chapter.layout}
                          </span>
                        )}
                      </div>
                      <div style={{ fontFamily: `"${manifest.theme.fonts.heading}", serif`, fontSize: '1rem', fontWeight: 500, color: 'var(--pl-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {chapter.title}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--pl-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '0.15rem' }}>
                        {chapter.description}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '0.4rem', opacity: 0, transition: 'opacity 0.2s' }} className="group-hover:opacity-100">
                      <button onClick={() => setEditingId(chapter.id)} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.4)', background: 'none', cursor: 'pointer', color: 'var(--pl-muted)', display: 'flex' }}>
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => deleteChapter(chapter.id)} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid rgba(239,68,68,0.2)', background: 'none', cursor: 'pointer', color: 'rgba(239,68,68,0.7)', display: 'flex' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* ── Design Tab ── */}
        {activeTab === 'design' && (
          <motion.div key="design" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Color system */}
            <div style={{ background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 4px 20px rgba(43,30,20,0.06)', overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.2)' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--pl-ink)' }}>Color Palette</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--pl-muted)', marginTop: '0.25rem' }}>Customize your site-wide colors. Preview updates live.</div>
              </div>
              <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <ColorField label="Background" value={manifest.theme.colors.background} onChange={v => updateColor('background', v)} />
                  <ColorField label="Foreground / Text" value={manifest.theme.colors.foreground} onChange={v => updateColor('foreground', v)} />
                  <ColorField label="Primary Accent" value={manifest.theme.colors.accent} onChange={v => updateColor('accent', v)} />
                  <ColorField label="Accent Light" value={manifest.theme.colors.accentLight} onChange={v => updateColor('accentLight', v)} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Live preview */}
                  <ColorPreviewSwatch colors={manifest.theme.colors} />
                  <ColorField label="Muted Text" value={manifest.theme.colors.muted} onChange={v => updateColor('muted', v)} />
                </div>
              </div>
            </div>

            {/* Typography */}
            <div style={{ background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 4px 20px rgba(43,30,20,0.06)', overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.2)' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--pl-ink)' }}>Typography</div>
              </div>
              <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                {/* Heading font visual picker */}
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--pl-muted)', marginBottom: '0.75rem' }}>Heading Font</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {HEADING_FONTS.map(font => (
                      <button
                        key={font.name}
                        onClick={() => onChange({ ...manifest, theme: { ...manifest.theme, fonts: { ...manifest.theme.fonts, heading: font.name } } })}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '0.75rem 1rem', borderRadius: '0.6rem', cursor: 'pointer',
                          border: `1.5px solid ${manifest.theme.fonts.heading === font.name ? 'var(--pl-olive)' : 'rgba(255,255,255,0.4)'}`,
                          background: manifest.theme.fonts.heading === font.name ? 'rgba(0,0,0,0.02)' : 'transparent',
                          textAlign: 'left',
                        }}
                      >
                        <span style={{ fontFamily: `"${font.name}", serif`, fontSize: '1.05rem', color: 'var(--pl-ink)' }}>{font.label}</span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--pl-muted)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{font.style}</span>
                      </button>
                    ))}
                  </div>
                </div>
                {/* Body font visual picker */}
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--pl-muted)', marginBottom: '0.75rem' }}>Body Font</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {BODY_FONTS.map(font => (
                      <button
                        key={font.name}
                        onClick={() => onChange({ ...manifest, theme: { ...manifest.theme, fonts: { ...manifest.theme.fonts, body: font.name } } })}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '0.75rem 1rem', borderRadius: '0.6rem', cursor: 'pointer',
                          border: `1.5px solid ${manifest.theme.fonts.body === font.name ? 'var(--pl-olive)' : 'rgba(255,255,255,0.4)'}`,
                          background: manifest.theme.fonts.body === font.name ? 'rgba(0,0,0,0.02)' : 'transparent',
                          textAlign: 'left',
                        }}
                      >
                        <span style={{ fontFamily: `"${font.name}", sans-serif`, fontSize: '1rem', color: 'var(--pl-ink)' }}>{font.label}</span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--pl-muted)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{font.style}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Background pattern */}
            <div style={{ background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 4px 20px rgba(43,30,20,0.06)', overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.2)' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--pl-ink)' }}>Background Pattern</div>
              </div>
              <div style={{ padding: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {PATTERNS.map(p => (
                  <button
                    key={p.value}
                    onClick={() => onChange({ ...manifest, theme: { ...manifest.theme, backgroundPattern: p.value as typeof manifest.theme.backgroundPattern } })}
                    style={{
                      padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer',
                      border: `1.5px solid ${(manifest.theme.backgroundPattern || 'none') === p.value ? 'var(--pl-olive)' : 'rgba(255,255,255,0.4)'}`,
                      background: (manifest.theme.backgroundPattern || 'none') === p.value ? 'rgba(255,255,255,0.35)' : 'transparent',
                      fontSize: '0.8rem', fontWeight: 600, color: 'var(--pl-ink)',
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Details Tab ── */}
        {activeTab === 'details' && (
          <motion.div key="details" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Coming Soon editor */}
            <div style={{ background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 4px 20px rgba(43,30,20,0.06)', overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.2)' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--pl-ink)' }}>Coming Soon Section</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--pl-muted)', marginTop: '0.25rem' }}>The bottom section teasing what&apos;s next.</div>
              </div>
              <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--pl-muted)', marginBottom: '0.5rem' }}>Section Title</label>
                  <input
                    type="text"
                    value={manifest.comingSoon?.title || 'The Next Chapter'}
                    onChange={(e) => onChange({ ...manifest, comingSoon: { ...manifest.comingSoon, title: e.target.value, enabled: true, passwordProtected: false } })}
                    style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.4)', outline: 'none', fontSize: '0.95rem', fontFamily: `"${manifest.theme.fonts.heading}", serif`, background: 'rgba(255,255,255,0.35)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--pl-muted)', marginBottom: '0.5rem' }}>Subtitle / Message</label>
                  <input
                    type="text"
                    value={manifest.comingSoon?.subtitle || ''}
                    onChange={(e) => onChange({ ...manifest, comingSoon: { ...manifest.comingSoon, subtitle: e.target.value, title: manifest.comingSoon?.title || 'The Next Chapter', enabled: true, passwordProtected: false } })}
                    placeholder="e.g. Our wedding day, September 14th 2025"
                    style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.4)', outline: 'none', fontSize: '0.9rem', background: 'rgba(255,255,255,0.35)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <DatePicker
                    label="Reveal Date (Optional)"
                    value={manifest.comingSoon?.revealDate?.slice(0, 10) || ''}
                    onChange={(d) => onChange({ ...manifest, comingSoon: { ...manifest.comingSoon, revealDate: d, title: manifest.comingSoon?.title || 'The Next Chapter', enabled: true, passwordProtected: false, subtitle: manifest.comingSoon?.subtitle || '' } })}
                  />
                </div>
              </div>
            </div>

            {/* Password protection */}
            <div style={{ background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 4px 20px rgba(43,30,20,0.06)', overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--pl-ink)' }}>Password Protection</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--pl-muted)', marginTop: '0.25rem' }}>Restrict access to your site with a password.</div>
                </div>
                <button
                  onClick={() => onChange({ ...manifest, comingSoon: { ...manifest.comingSoon, passwordProtected: !manifest.comingSoon?.passwordProtected, enabled: manifest.comingSoon?.enabled ?? true, title: manifest.comingSoon?.title || 'The Next Chapter', subtitle: manifest.comingSoon?.subtitle || '' } })}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.5rem 1rem', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: 700,
                    border: 'none', cursor: 'pointer',
                    background: manifest.comingSoon?.passwordProtected ? 'var(--pl-olive)' : 'rgba(255,255,255,0.35)',
                    color: manifest.comingSoon?.passwordProtected ? '#fff' : 'var(--pl-muted)',
                    transition: 'all 0.2s',
                  }}
                >
                  {manifest.comingSoon?.passwordProtected ? <Lock size={14} /> : <Unlock size={14} />}
                  {manifest.comingSoon?.passwordProtected ? 'Protected' : 'Public'}
                </button>
              </div>
              {manifest.comingSoon?.passwordProtected && (
                <div style={{ padding: '1.25rem 1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--pl-muted)', marginBottom: '0.5rem' }}>Site Password</label>
                  <input
                    type="text"
                    value={manifest.comingSoon?.password || ''}
                    onChange={(e) => onChange({ ...manifest, comingSoon: { ...manifest.comingSoon!, password: e.target.value } })}
                    placeholder="Enter a password for guests"
                    style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.4)', outline: 'none', fontSize: '0.9rem', fontFamily: 'monospace', background: 'rgba(255,255,255,0.35)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', boxSizing: 'border-box' }}
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
