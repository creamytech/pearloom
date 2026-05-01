'use client';

// ─────────────────────────────────────────────────────────────
// StoryQuickEditModal — listens for `pearloom:story-quick-edit`
// and opens the shared paper modal with the focused chapter in
// edit mode. Chapters live in `manifest.chapters` and carry
// title / subtitle / description / images / layout / mood.
//
// Same UX pattern as Hotel + Schedule + FAQ modals: sidebar
// list with drag-reorder + bulk-tag + bulk-delete, editor pane
// with full per-chapter controls, undo toast on bulk operations.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { StoryManifest, Chapter, ChapterImage } from '@/types';
import { Field, SelectInput, TextArea, TextInput } from './atoms';
import { Icon } from '../motifs';
import { QuickEditModalShell } from './QuickEditModalShell';
import { todayLocal } from '@/lib/date-utils';

interface Props {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}

const LAYOUT_OPTIONS: Array<{ value: NonNullable<Chapter['layout']>; label: string }> = [
  { value: 'editorial',  label: 'Editorial'  },
  { value: 'fullbleed',  label: 'Full-bleed' },
  { value: 'split',      label: 'Split'      },
  { value: 'cinematic',  label: 'Cinematic'  },
  { value: 'gallery',    label: 'Gallery'    },
  { value: 'mosaic',     label: 'Mosaic'     },
  { value: 'bento',      label: 'Bento'      },
];

export function StoryQuickEditModal({ manifest, onChange }: Props) {
  const [openChapterId, setOpenChapterId] = useState<string | null>(null);

  useEffect(() => {
    function onOpen(e: Event) {
      const detail = (e as CustomEvent<{ chapterId?: string }>).detail;
      if (!detail?.chapterId) return;
      setOpenChapterId(detail.chapterId);
    }
    window.addEventListener('pearloom:story-quick-edit', onOpen);
    return () => window.removeEventListener('pearloom:story-quick-edit', onOpen);
  }, []);

  const items = useMemo<Chapter[]>(() => {
    const arr = manifest.chapters;
    return Array.isArray(arr) ? arr : [];
  }, [manifest.chapters]);

  const focused = items.find((c) => c.id === openChapterId) ?? items[0] ?? null;

  const setItems = useCallback((next: Chapter[]) => {
    onChange({ ...manifest, chapters: next.map((c, i) => ({ ...c, order: i })) });
  }, [manifest, onChange]);

  const updateItem = useCallback((id: string, patch: Partial<Chapter>) => {
    setItems(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }, [items, setItems]);

  const removeItem = useCallback((id: string) => {
    const idx = items.findIndex((it) => it.id === id);
    const next = items.filter((it) => it.id !== id);
    setItems(next);
    if (next.length === 0) {
      setOpenChapterId(null);
      return;
    }
    const fallback = next[Math.min(idx, next.length - 1)];
    setOpenChapterId(fallback.id);
  }, [items, setItems]);

  const addItem = useCallback(() => {
    const id = `ch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
    const next: Chapter = {
      id,
      date: todayLocal(),
      title: 'New chapter',
      subtitle: '',
      description: '',
      images: [],
      location: null,
      mood: 'observed',
      order: items.length,
    };
    setItems([...items, next]);
    setOpenChapterId(id);
  }, [items, setItems]);

  return (
    <QuickEditModalShell
      open={!!openChapterId && !!focused}
      title="Story"
      focusedTitle={focused?.title || 'New chapter'}
      items={items.map((it) => ({
        id: it.id,
        label: it.title || 'Untitled',
        sublabel: it.subtitle || (it.images?.length ? `${it.images.length} photo${it.images.length === 1 ? '' : 's'}` : 'No photos yet'),
        icon: 'page',
        photoUrl: it.images?.[0]?.url,
      }))}
      focusedId={focused?.id ?? null}
      onFocusChange={(id) => setOpenChapterId(id)}
      onReorder={(orderedIds) => {
        const byId = new Map(items.map((it) => [it.id, it]));
        const next = orderedIds.map((id) => byId.get(id)).filter((it): it is Chapter => Boolean(it));
        const seen = new Set(orderedIds);
        const tail = items.filter((it) => !seen.has(it.id));
        setItems([...next, ...tail]);
      }}
      onBulkDelete={(ids) => {
        const idSet = new Set(ids);
        const next = items.filter((it) => !idSet.has(it.id));
        const snapshot = items;
        setItems(next);
        if (next.length === 0) setOpenChapterId(null);
        else if (focused && idSet.has(focused.id)) setOpenChapterId(next[0].id);
        return () => setItems(snapshot);
      }}
      onClose={() => setOpenChapterId(null)}
      emptyHint="No chapters yet. Add your first."
      searchSlot={
        <button
          type="button"
          onClick={addItem}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            borderRadius: 999,
            border: '1px dashed var(--peach-ink, #C6703D)',
            background: 'transparent',
            color: 'var(--peach-ink, #C6703D)',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'var(--font-ui)',
          }}
        >
          <Icon name="plus" size={11} /> Add a chapter
        </button>
      }
      editorSlot={
        focused ? (
          <ChapterEditor
            chapter={focused}
            onChange={(patch) => updateItem(focused.id, patch)}
            onRemove={() => removeItem(focused.id)}
          />
        ) : null
      }
    />
  );
}

function ChapterEditor({
  chapter,
  onChange,
  onRemove,
}: {
  chapter: Chapter;
  onChange: (patch: Partial<Chapter>) => void;
  onRemove: () => void;
}) {
  // The photo strip lives inside the editor pane so hosts can
  // reorder, add, or replace each chapter's photos without
  // leaving the modal. Photos are stored as ChapterImage[]; the
  // editor talks to them as a flat URL list and keeps the rest
  // of the photo metadata (alt, caption) in lockstep.
  function patchPhotoAt(index: number, patch: Partial<ChapterImage>) {
    const next = [...(chapter.images ?? [])];
    if (!next[index]) return;
    next[index] = { ...next[index], ...patch };
    onChange({ images: next });
  }

  function removePhotoAt(index: number) {
    const next = [...(chapter.images ?? [])];
    next.splice(index, 1);
    onChange({ images: next });
  }

  function appendPhoto(url: string) {
    const next = [...(chapter.images ?? [])];
    next.push({
      id: `img-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      url,
      alt: '',
      width: 0,
      height: 0,
    });
    onChange({ images: next });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Field label="Title">
        <TextInput
          value={chapter.title}
          onChange={(e) => onChange({ title: e.target.value, hasCustomTitle: true })}
          placeholder="The afternoon we decided"
        />
      </Field>
      <Field label="Subtitle">
        <TextInput
          value={chapter.subtitle}
          onChange={(e) => onChange({ subtitle: e.target.value })}
          placeholder="Optional — a quieter line under the title"
        />
      </Field>
      <Field label="Body">
        <TextArea
          value={chapter.description}
          onChange={(e) => onChange({ description: e.target.value, hasCustomDescription: true })}
          rows={6}
          placeholder="The story itself — a paragraph or three. Pear can polish this from the canvas later."
        />
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Layout">
          <SelectInput
            value={chapter.layout ?? 'editorial'}
            onChange={(v) => onChange({ layout: v as Chapter['layout'] })}
            options={LAYOUT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          />
        </Field>
        <Field label="Date">
          <TextInput
            value={chapter.date ?? ''}
            onChange={(e) => onChange({ date: e.target.value })}
            placeholder="YYYY-MM-DD"
          />
        </Field>
      </div>

      <Field label={`Photos (${chapter.images?.length ?? 0})`} help="Drag any image onto a slot to add it. The first photo is the chapter's cover unless you flip the hero index.">
        <PhotoStrip
          images={chapter.images ?? []}
          onPatch={patchPhotoAt}
          onRemove={removePhotoAt}
          onAdd={appendPhoto}
        />
      </Field>

      <Field label="Mood">
        <TextInput
          value={chapter.mood ?? ''}
          onChange={(e) => onChange({ mood: e.target.value })}
          placeholder="golden hour, quiet morning, cozy winter…"
        />
      </Field>

      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid var(--line-soft)', marginTop: 6 }}>
        <button
          type="button"
          onClick={onRemove}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            borderRadius: 999,
            border: '1px solid rgba(122,45,45,0.25)',
            background: 'transparent',
            color: '#7A2D2D',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'var(--font-ui)',
          }}
        >
          <Icon name="close" size={11} />
          Remove this chapter
        </button>
      </div>
    </div>
  );
}

function PhotoStrip({
  images,
  onPatch,
  onRemove,
  onAdd,
}: {
  images: ChapterImage[];
  onPatch: (index: number, patch: Partial<ChapterImage>) => void;
  onRemove: (index: number) => void;
  onAdd: (url: string) => void;
}) {
  const [draftUrl, setDraftUrl] = useState('');

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result ?? '');
      if (url) onAdd(url);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {images.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 8 }}>
          {images.map((img, i) => (
            <div
              key={img.id ?? i}
              style={{
                position: 'relative',
                aspectRatio: '1 / 1',
                borderRadius: 10,
                overflow: 'hidden',
                background: 'var(--cream-2, #F5EFE2)',
                border: '1px solid var(--line)',
              }}
            >
              <img
                src={img.url}
                alt={img.alt ?? ''}
                loading="lazy"
                decoding="async"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <button
                type="button"
                onClick={() => onRemove(i)}
                aria-label="Remove photo"
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  border: 'none',
                  background: 'rgba(14,13,11,0.78)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: 12,
                  lineHeight: 1,
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                ×
              </button>
              {/* Caption inline edit. AI-generated captions are
                  stored on the image; hosts overwrite per photo
                  here without opening another panel. */}
              <input
                type="text"
                value={img.caption ?? ''}
                onChange={(e) => onPatch(i, { caption: e.target.value })}
                placeholder="Caption"
                style={{
                  position: 'absolute',
                  bottom: 4,
                  left: 4,
                  right: 4,
                  padding: '3px 6px',
                  borderRadius: 6,
                  border: 'none',
                  background: 'rgba(14,13,11,0.66)',
                  color: '#FBF7EE',
                  fontSize: 10.5,
                  fontFamily: 'var(--font-ui)',
                  outline: 'none',
                }}
              />
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: '10px 12px',
          background: 'var(--cream-2, #F5EFE2)',
          border: '1px dashed var(--line)',
          borderRadius: 10,
        }}
      >
        <input
          type="text"
          value={draftUrl}
          onChange={(e) => setDraftUrl(e.target.value)}
          placeholder="Paste a URL — or drag a photo onto this row"
          style={{
            flex: 1,
            padding: '6px 10px',
            borderRadius: 8,
            border: '1px solid var(--line)',
            background: 'var(--paper, #FBF7EE)',
            fontSize: 12,
            fontFamily: 'var(--font-ui)',
            color: 'var(--ink)',
            outline: 'none',
          }}
        />
        <button
          type="button"
          onClick={() => {
            if (!draftUrl.trim()) return;
            onAdd(draftUrl.trim());
            setDraftUrl('');
          }}
          disabled={!draftUrl.trim()}
          style={{
            padding: '6px 14px',
            borderRadius: 8,
            border: 'none',
            background: 'var(--ink, #0E0D0B)',
            color: 'var(--cream, #FBF7EE)',
            fontSize: 11.5,
            fontWeight: 700,
            cursor: draftUrl.trim() ? 'pointer' : 'default',
            opacity: draftUrl.trim() ? 1 : 0.4,
            fontFamily: 'var(--font-ui)',
          }}
        >
          Add
        </button>
        <label
          style={{
            padding: '6px 14px',
            borderRadius: 8,
            border: '1px solid var(--line)',
            background: 'var(--paper, #FBF7EE)',
            color: 'var(--ink-soft)',
            fontSize: 11.5,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'var(--font-ui)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          Upload
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              for (const f of files) handleFile(f);
              e.target.value = '';
            }}
            style={{ display: 'none' }}
          />
        </label>
      </div>
    </div>
  );
}
