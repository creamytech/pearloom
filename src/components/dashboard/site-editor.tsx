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
          <h3
            className="text-xl font-semibold"
            style={{ fontFamily: 'var(--eg-font-heading)' }}
          >
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

      {manifest.chapters.map((chapter, index) => (
        <motion.div
          key={chapter.id}
          layout
          className="border border-black/5 rounded-lg bg-white overflow-hidden"
        >
          {editingId === chapter.id ? (
            /* ── Edit Mode ── */
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-[var(--eg-accent)] font-medium uppercase tracking-widest">
                  editing chapter {index + 1}
                </span>
              </div>

              <input
                type="date"
                value={chapter.date.slice(0, 10)}
                onChange={(e) => updateChapter(chapter.id, { date: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-black/10 text-sm
                           focus:outline-none focus:border-[var(--eg-accent)]"
              />

              <input
                type="text"
                value={chapter.title}
                onChange={(e) => updateChapter(chapter.id, { title: e.target.value })}
                placeholder="chapter title"
                className="w-full px-3 py-2 rounded-md border border-black/10 text-lg
                           font-semibold focus:outline-none focus:border-[var(--eg-accent)]"
                style={{ fontFamily: 'var(--eg-font-heading)' }}
              />

              <input
                type="text"
                value={chapter.subtitle}
                onChange={(e) => updateChapter(chapter.id, { subtitle: e.target.value })}
                placeholder="subtitle"
                className="w-full px-3 py-2 rounded-md border border-black/10 text-sm
                           italic focus:outline-none focus:border-[var(--eg-accent)]"
              />

              <textarea
                value={chapter.description}
                onChange={(e) => updateChapter(chapter.id, { description: e.target.value })}
                placeholder="your story..."
                rows={4}
                className="w-full px-3 py-2 rounded-md border border-black/10 text-sm
                           focus:outline-none focus:border-[var(--eg-accent)] resize-none"
              />

              <input
                type="text"
                value={chapter.mood}
                onChange={(e) => updateChapter(chapter.id, { mood: e.target.value })}
                placeholder="mood tag"
                className="w-32 px-3 py-1.5 rounded-full border border-black/10 text-xs
                           focus:outline-none focus:border-[var(--eg-accent)]"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setEditingId(null)}
                  className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[var(--eg-accent)] text-white
                             text-sm hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <Check size={14} />
                  done
                </button>
              </div>
            </div>
          ) : (
            /* ── Display Mode ── */
            <div className="flex items-center gap-4 p-4 group">
              <div className="flex flex-col gap-1 text-[var(--eg-muted)] opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => moveChapter(index, 'up')}
                  disabled={index === 0}
                  className="hover:text-[var(--eg-fg)] disabled:opacity-20 cursor-pointer"
                >
                  <GripVertical size={14} />
                </button>
              </div>

              {/* Thumbnail */}
              {chapter.images?.[0] && (
                <img
                  src={chapter.images[0].url}
                  alt=""
                  className="w-16 h-16 rounded-md object-cover shrink-0"
                />
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[var(--eg-accent)] font-medium">
                  {new Date(chapter.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
                <p
                  className="font-semibold text-[var(--eg-fg)] truncate"
                  style={{ fontFamily: 'var(--eg-font-heading)' }}
                >
                  {chapter.title}
                </p>
                <p className="text-xs text-[var(--eg-muted)] truncate">{chapter.description}</p>
              </div>

              {/* Mood tag */}
              {chapter.mood && (
                <span className="px-2 py-0.5 rounded-full bg-[var(--eg-accent-light)] text-[var(--eg-accent)]
                                 text-[10px] font-medium shrink-0">
                  {chapter.mood}
                </span>
              )}

              {/* Actions */}
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setEditingId(chapter.id)}
                  className="p-2 rounded-md hover:bg-black/5 text-[var(--eg-muted)]
                             hover:text-[var(--eg-fg)] transition-colors cursor-pointer"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => deleteChapter(chapter.id)}
                  className="p-2 rounded-md hover:bg-red-50 text-[var(--eg-muted)]
                             hover:text-red-500 transition-colors cursor-pointer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
