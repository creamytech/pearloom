'use client';

// ─────────────────────────────────────────────────────────────
// everglow / components/dashboard/site-editor.tsx
// Post-generation inline editor for chapter content
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Pencil, Check, X, GripVertical, Trash2, Plus } from 'lucide-react';
import type { Chapter, StoryManifest } from '@/types';

interface SiteEditorProps {
  manifest: StoryManifest;
  onChange: (manifest: StoryManifest) => void;
}

export function SiteEditor({ manifest, onChange }: SiteEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const updateChapter = (chapterId: string, updates: Partial<Chapter>) => {
    const newManifest = {
      ...manifest,
      chapters: manifest.chapters.map((ch) =>
        ch.id === chapterId ? { ...ch, ...updates } : ch
      ),
    };
    onChange(newManifest);
  };

  const deleteChapter = (chapterId: string) => {
    const newManifest = {
      ...manifest,
      chapters: manifest.chapters.filter((ch) => ch.id !== chapterId),
    };
    onChange(newManifest);
  };

  const addChapter = () => {
    const newChapter: Chapter = {
      id: `ch-${Date.now()}`,
      date: new Date().toISOString(),
      title: 'new chapter',
      subtitle: 'add your subtitle',
      description: 'write your story here...',
      images: [],
      location: null,
      mood: 'new',
      order: manifest.chapters.length,
    };
    onChange({
      ...manifest,
      chapters: [...manifest.chapters, newChapter],
    });
    setEditingId(newChapter.id);
  };

  const moveChapter = (index: number, direction: 'up' | 'down') => {
    const chapters = [...manifest.chapters];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= chapters.length) return;
    [chapters[index], chapters[targetIndex]] = [chapters[targetIndex], chapters[index]];
    onChange({ ...manifest, chapters });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold" style={{ fontFamily: 'var(--eg-font-heading)' }}>
            edit your story
          </h3>
          <p className="text-sm text-[var(--eg-muted)]">
            click any chapter to edit. drag to reorder.
          </p>
        </div>
        <button
          onClick={addChapter}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-black/20
                     text-sm text-[var(--eg-muted)] hover:border-[var(--eg-accent)] hover:text-[var(--eg-accent)]
                     transition-all cursor-pointer"
        >
          <Plus size={16} />
          add chapter
        </button>
      </div>

      {/* --- THEME EDITOR --- */}
      <div className="mb-8 overflow-hidden rounded-xl border border-black/5 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.03)]">
        <div className="bg-black/[0.02] px-6 py-4 border-b border-black/5">
          <h4 className="text-sm font-bold uppercase tracking-[0.15em] text-[var(--eg-fg)]">Global Design System</h4>
          <p className="text-xs text-[var(--eg-muted)] mt-1">Configure your site-wide typography and color palette.</p>
        </div>
        
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
          
          {/* Colors */}
          <div className="space-y-6">
            <div>
              <label className="text-xs font-semibold text-[var(--eg-muted)] uppercase tracking-wider mb-3 block">Background Color</label>
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-full shadow-sm border border-black/10 flex-shrink-0 overflow-hidden cursor-pointer hover:scale-105 transition-transform">
                  <div style={{ background: manifest.theme.colors.background, width: '100%', height: '100%' }} />
                  <input 
                    type="color" 
                    value={manifest.theme.colors.background}
                    onChange={(e) => onChange({ ...manifest, theme: { ...manifest.theme, colors: { ...manifest.theme.colors, background: e.target.value } } })}
                    className="absolute inset-0 w-[200%] h-[200%] -top-1/2 -left-1/2 opacity-0 cursor-pointer" 
                  />
                </div>
                <input 
                  type="text" 
                  value={manifest.theme.colors.background}
                  onChange={(e) => onChange({ ...manifest, theme: { ...manifest.theme, colors: { ...manifest.theme.colors, background: e.target.value } } })}
                  className="flex-1 px-3 py-2 text-sm rounded-lg bg-black/[0.02] border border-black/5 focus:outline-none focus:border-[var(--eg-accent)] focus:bg-white transition-colors" 
                  style={{ fontFamily: 'monospace' }}
                />
              </div>
            </div>
            
            <div>
              <label className="text-xs font-semibold text-[var(--eg-muted)] uppercase tracking-wider mb-3 block">Primary Accent</label>
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-full shadow-sm border border-black/10 flex-shrink-0 overflow-hidden cursor-pointer hover:scale-105 transition-transform">
                  <div style={{ background: manifest.theme.colors.accent, width: '100%', height: '100%' }} />
                  <input 
                    type="color" 
                    value={manifest.theme.colors.accent}
                    onChange={(e) => onChange({ ...manifest, theme: { ...manifest.theme, colors: { ...manifest.theme.colors, accent: e.target.value } } })}
                    className="absolute inset-0 w-[200%] h-[200%] -top-1/2 -left-1/2 opacity-0 cursor-pointer" 
                  />
                </div>
                <input 
                  type="text" 
                  value={manifest.theme.colors.accent}
                  onChange={(e) => onChange({ ...manifest, theme: { ...manifest.theme, colors: { ...manifest.theme.colors, accent: e.target.value } } })}
                  className="flex-1 px-3 py-2 text-sm rounded-lg bg-black/[0.02] border border-black/5 focus:outline-none focus:border-[var(--eg-accent)] focus:bg-white transition-colors" 
                  style={{ fontFamily: 'monospace' }}
                />
              </div>
            </div>
          </div>

          {/* Typography */}
          <div className="space-y-6">
            <div>
              <label className="text-xs font-semibold text-[var(--eg-muted)] uppercase tracking-wider mb-3 block">Heading Typography</label>
              <select
                value={manifest.theme.fonts.heading}
                onChange={(e) => onChange({ ...manifest, theme: { ...manifest.theme, fonts: { ...manifest.theme.fonts, heading: e.target.value } } })}
                className="w-full px-4 py-3 text-sm rounded-lg bg-black/[0.02] border border-black/5 focus:outline-none focus:border-[var(--eg-accent)] focus:bg-white transition-colors cursor-pointer appearance-none" 
                style={{ fontFamily: manifest.theme.fonts.heading || 'Playfair Display' }}
              >
                <option value="Playfair Display">Playfair Display (Editorial)</option>
                <option value="Cormorant Garamond">Cormorant Garamond (Classic)</option>
                <option value="Lora">Lora (Elegant)</option>
                <option value="Inter">Inter (Modern Clean)</option>
                <option value="Outfit">Outfit (Geometric)</option>
                <option value="Cinzel">Cinzel (High Fashion)</option>
              </select>
            </div>
            
            <div>
              <label className="text-xs font-semibold text-[var(--eg-muted)] uppercase tracking-wider mb-3 block">Body Typography</label>
              <select
                value={manifest.theme.fonts.body}
                onChange={(e) => onChange({ ...manifest, theme: { ...manifest.theme, fonts: { ...manifest.theme.fonts, body: e.target.value } } })}
                className="w-full px-4 py-3 text-sm rounded-lg bg-black/[0.02] border border-black/5 focus:outline-none focus:border-[var(--eg-accent)] focus:bg-white transition-colors cursor-pointer appearance-none" 
                style={{ fontFamily: manifest.theme.fonts.body || 'Inter' }}
              >
                <option value="Inter">Inter (Clean)</option>
                <option value="Outfit">Outfit (Geometric)</option>
                <option value="Roboto">Roboto (Standard)</option>
                <option value="Lora">Lora (Serif Readable)</option>
                <option value="PT Serif">PT Serif (Traditional)</option>
              </select>
            </div>
          </div>

        </div>
      </div>

      <div className="space-y-4">
        {manifest.chapters.map((chapter, index) => (
          <motion.div
            key={chapter.id}
            layout
            className="border border-black/5 rounded-xl bg-white shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-shadow"
          >
            {editingId === chapter.id ? (
              /* ── Edit Mode ── */
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-black/5 pb-4">
                  <span className="text-xs text-[var(--eg-accent)] font-semibold uppercase tracking-[0.2em]">
                    Chapter {index + 1}
                  </span>
                  <div className="flex gap-4 items-center">
                    <span className="text-xs font-semibold text-[var(--eg-muted)] uppercase tracking-widest">Layout</span>
                    <select 
                      value={chapter.layout || 'editorial'}
                      onChange={(e) => updateChapter(chapter.id, { layout: e.target.value as Chapter['layout'] })}
                      className="px-3 py-1.5 rounded-md bg-black/[0.02] border border-transparent text-sm font-medium focus:bg-white focus:border-[var(--eg-accent)] focus:outline-none transition-colors cursor-pointer"
                    >
                      <option value="editorial">Editorial (Side-by-side)</option>
                      <option value="fullbleed">Fullbleed (Hero Photo)</option>
                      <option value="split">Split (Card)</option>
                      <option value="cinematic">Cinematic (Quote Focus)</option>
                      <option value="gallery">Gallery (Multi-image Grid)</option>
                      <option value="mosaic">Mosaic (Polaroid Scatter)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-[var(--eg-muted)] uppercase tracking-wider block mb-2">Title</label>
                      <input
                        type="text"
                        value={chapter.title}
                        onChange={(e) => updateChapter(chapter.id, { title: e.target.value })}
                        placeholder="Chapter Title"
                        className="w-full px-4 py-3 rounded-lg bg-black/[0.02] border border-transparent text-lg font-semibold focus:bg-white focus:border-[var(--eg-accent)] focus:outline-none transition-colors placeholder-black/30"
                        style={{ fontFamily: manifest.theme.fonts.heading || 'Playfair Display' }}
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs font-semibold text-[var(--eg-muted)] uppercase tracking-wider block mb-2">Subtitle</label>
                      <input
                        type="text"
                        value={chapter.subtitle}
                        onChange={(e) => updateChapter(chapter.id, { subtitle: e.target.value })}
                        placeholder="Optional subtitle"
                        className="w-full px-4 py-3 rounded-lg bg-black/[0.02] border border-transparent text-sm italic focus:bg-white focus:border-[var(--eg-accent)] focus:outline-none transition-colors placeholder-black/30"
                      />
                    </div>
                    
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="text-xs font-semibold text-[var(--eg-muted)] uppercase tracking-wider block mb-2">Date</label>
                        <input
                          type="date"
                          value={chapter.date.slice(0, 10)}
                          onChange={(e) => updateChapter(chapter.id, { date: e.target.value })}
                          className="w-full px-4 py-3 rounded-lg bg-black/[0.02] border border-transparent text-sm focus:bg-white focus:border-[var(--eg-accent)] focus:outline-none transition-colors"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs font-semibold text-[var(--eg-muted)] uppercase tracking-wider block mb-2">Mood / Tag</label>
                        <input
                          type="text"
                          value={chapter.mood}
                          onChange={(e) => updateChapter(chapter.id, { mood: e.target.value })}
                          placeholder="e.g. Romantic"
                          className="w-full px-4 py-3 rounded-lg bg-black/[0.02] border border-transparent text-sm focus:bg-white focus:border-[var(--eg-accent)] focus:outline-none transition-colors placeholder-black/30"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[var(--eg-muted)] uppercase tracking-wider block mb-2">The Story</label>
                    <textarea
                      value={chapter.description}
                      onChange={(e) => updateChapter(chapter.id, { description: e.target.value })}
                      placeholder="Write your beautiful memory here..."
                      className="w-full h-[calc(100%-24px)] min-h-[160px] px-5 py-4 rounded-lg bg-black/[0.02] border border-transparent text-sm leading-relaxed focus:bg-white focus:border-[var(--eg-accent)] focus:outline-none transition-colors resize-none placeholder-black/30"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-black/5">
                  <button
                    onClick={() => setEditingId(null)}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[var(--eg-accent)] text-white text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
                  >
                    <Check size={16} />
                    Save & Collapse
                  </button>
                </div>
              </div>
            ) : (
              /* ── Display Mode ── */
              <div className="flex items-center gap-6 p-5 group">
                <div className="flex flex-col gap-2 text-[var(--eg-muted)] opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => moveChapter(index, 'up')}
                    disabled={index === 0}
                    className="hover:text-[var(--eg-fg)] disabled:opacity-20 cursor-pointer p-1 rounded hover:bg-black/5 transition-colors"
                  >
                    <GripVertical size={16} />
                  </button>
                </div>

                {/* Thumbnail */}
                <div className="relative w-20 h-20 rounded-lg overflow-hidden shrink-0 shadow-sm border border-black/5">
                  {chapter.images?.[0] ? (
                    <img
                      src={chapter.images[0].url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-black/5 flex items-center justify-center">
                      <span className="text-[10px] uppercase text-black/30 font-bold">No Image</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-[10px] text-[var(--eg-accent)] font-bold uppercase tracking-widest bg-[var(--eg-accent)]/10 px-2 py-0.5 rounded-sm">
                      {new Date(chapter.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </span>
                    {chapter.mood && (
                      <span className="text-[10px] text-[var(--eg-muted)] font-medium uppercase tracking-wider">
                        • {chapter.mood}
                      </span>
                    )}
                  </div>
                  
                  <h5
                    className="text-lg font-medium text-[var(--eg-fg)] truncate mb-1"
                    style={{ fontFamily: manifest.theme.fonts.heading || 'Playfair Display' }}
                  >
                    {chapter.title}
                  </h5>
                  <p className="text-sm text-[var(--eg-muted)] truncate max-w-2xl">{chapter.description}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                  <button
                    onClick={() => setEditingId(chapter.id)}
                    className="p-2.5 rounded-lg border border-black/10 hover:border-black/20 hover:bg-black/5 text-[var(--eg-muted)] hover:text-[var(--eg-fg)] transition-all cursor-pointer shadow-sm"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => deleteChapter(chapter.id)}
                    className="p-2.5 rounded-lg border border-red-500/20 hover:border-red-500 hover:bg-red-50 text-red-500/70 hover:text-red-500 transition-all cursor-pointer shadow-sm"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* --- COMING SOON EDITOR --- */}
      <div className="mt-6 overflow-hidden rounded-xl border border-black/5 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.03)]">
        <div className="bg-black/[0.02] px-6 py-4 border-b border-black/5">
          <h4 className="text-sm font-bold uppercase tracking-[0.15em] text-[var(--eg-fg)]">Coming Soon Section</h4>
          <p className="text-xs text-[var(--eg-muted)] mt-1">The bottom section teasing what's next for you two.</p>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-xs font-semibold text-[var(--eg-muted)] uppercase tracking-wider block mb-2">Section Title</label>
            <input
              type="text"
              value={manifest.comingSoon?.title || 'The Next Chapter'}
              onChange={(e) => onChange({ ...manifest, comingSoon: { ...manifest.comingSoon, title: e.target.value, enabled: true, passwordProtected: false } })}
              className="w-full px-4 py-3 rounded-lg bg-black/[0.02] border border-transparent text-sm font-medium focus:bg-white focus:border-[var(--eg-accent)] focus:outline-none transition-colors"
              style={{ fontFamily: manifest.theme.fonts.heading || 'Playfair Display' }}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--eg-muted)] uppercase tracking-wider block mb-2">Subtitle / Message</label>
            <input
              type="text"
              value={manifest.comingSoon?.subtitle || ''}
              onChange={(e) => onChange({ ...manifest, comingSoon: { ...manifest.comingSoon, subtitle: e.target.value, title: manifest.comingSoon?.title || 'The Next Chapter', enabled: true, passwordProtected: false } })}
              placeholder="e.g. Our wedding day, September 14th 2025"
              className="w-full px-4 py-3 rounded-lg bg-black/[0.02] border border-transparent text-sm focus:bg-white focus:border-[var(--eg-accent)] focus:outline-none transition-colors placeholder-black/25"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
