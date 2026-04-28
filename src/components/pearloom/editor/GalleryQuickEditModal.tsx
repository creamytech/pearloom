'use client';

// ─────────────────────────────────────────────────────────────
// GalleryQuickEditModal — listens for `pearloom:gallery-quick-edit`
// and opens the shared paper modal scoped to a single photo. The
// gallery grid is built from chapters[].images flattened, so the
// edit affordance writes back to whichever chapter the photo
// belongs to via { chapterIndex, imageIndex } addressing.
//
// Same UX language as the other quick-edit modals — sidebar lists
// every gallery photo with its current caption, editor pane has
// caption / alt / replace-URL / focal-point. Bulk-delete via shell.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { StoryManifest, Chapter, ChapterImage } from '@/types';
import { Field, TextArea, TextInput } from './atoms';
import { Icon } from '../motifs';
import { QuickEditModalShell } from './QuickEditModalShell';

interface Props {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}

interface FlatPhoto {
  /** Stable id matches ChapterImage.id when present, else
   *  synthesized from chapter+index so the picker doesn't lose
   *  focus when a photo is replaced. */
  id: string;
  url: string;
  caption?: string;
  alt?: string;
  chapterIndex: number;
  chapterTitle: string;
  imageIndex: number;
}

function flatten(chapters: Chapter[]): FlatPhoto[] {
  const out: FlatPhoto[] = [];
  chapters.forEach((c, ci) => {
    (c.images ?? []).forEach((img, ii) => {
      if (!img?.url) return;
      out.push({
        id: img.id ?? `${c.id ?? ci}-img-${ii}`,
        url: img.url,
        caption: img.caption,
        alt: img.alt,
        chapterIndex: ci,
        chapterTitle: c.title || `Chapter ${ci + 1}`,
        imageIndex: ii,
      });
    });
  });
  return out;
}

export function GalleryQuickEditModal({ manifest, onChange }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    function onOpen(e: Event) {
      const detail = (e as CustomEvent<{ photoId?: string; url?: string }>).detail;
      if (!detail) return;
      // Allow callers to address by stable id OR by URL — the
      // canvas grid sometimes only knows the URL.
      const arr = Array.isArray(manifest.chapters) ? manifest.chapters : [];
      const flat = flatten(arr);
      let target: FlatPhoto | undefined;
      if (detail.photoId) {
        target = flat.find((p) => p.id === detail.photoId);
      }
      if (!target && detail.url) {
        target = flat.find((p) => p.url === detail.url);
      }
      if (target) setOpenId(target.id);
    }
    window.addEventListener('pearloom:gallery-quick-edit', onOpen);
    return () => window.removeEventListener('pearloom:gallery-quick-edit', onOpen);
  }, [manifest.chapters]);

  const photos = useMemo<FlatPhoto[]>(() => {
    const arr = Array.isArray(manifest.chapters) ? manifest.chapters : [];
    return flatten(arr);
  }, [manifest.chapters]);

  const focused = photos.find((p) => p.id === openId) ?? photos[0] ?? null;

  const patchPhoto = useCallback((target: FlatPhoto, patch: Partial<ChapterImage>) => {
    const arr = [...(manifest.chapters ?? [])];
    const ch = arr[target.chapterIndex];
    if (!ch) return;
    const imgs = [...(ch.images ?? [])];
    if (!imgs[target.imageIndex]) return;
    imgs[target.imageIndex] = { ...imgs[target.imageIndex], ...patch };
    arr[target.chapterIndex] = { ...ch, images: imgs };
    onChange({ ...manifest, chapters: arr });
  }, [manifest, onChange]);

  const removePhoto = useCallback((target: FlatPhoto) => {
    const arr = [...(manifest.chapters ?? [])];
    const ch = arr[target.chapterIndex];
    if (!ch) return;
    const imgs = [...(ch.images ?? [])];
    imgs.splice(target.imageIndex, 1);
    arr[target.chapterIndex] = { ...ch, images: imgs };
    onChange({ ...manifest, chapters: arr });
    // Keep focus on the photo that was at the same position, or
    // fall back to the previous one. Prevents the modal from
    // jumping to the first photo every time you delete.
    const remaining = flatten(arr);
    if (remaining.length === 0) {
      setOpenId(null);
      return;
    }
    setOpenId(remaining[Math.min(remaining.length - 1, photos.findIndex((p) => p.id === target.id))]?.id ?? remaining[0].id);
  }, [manifest, onChange, photos]);

  return (
    <QuickEditModalShell
      open={!!openId && !!focused}
      title="Gallery"
      focusedTitle={focused?.caption || focused?.alt || `Photo ${focused ? focused.imageIndex + 1 : ''}`.trim()}
      items={photos.map((p) => ({
        id: p.id,
        label: p.caption || p.alt || `From ${p.chapterTitle}`,
        sublabel: p.chapterTitle,
        icon: 'image',
        photoUrl: p.url,
      }))}
      focusedId={focused?.id ?? null}
      onFocusChange={(id) => setOpenId(id)}
      onBulkDelete={(ids) => {
        // Bulk-delete walks the manifest once instead of N times so
        // we don't shift indices mid-loop.
        const idSet = new Set(ids);
        const snapshot = manifest;
        const arr = (manifest.chapters ?? []).map((c) => ({
          ...c,
          images: (c.images ?? []).filter((img, ii) => {
            const synthId = img.id ?? `${c.id ?? '_'}-img-${ii}`;
            return !idSet.has(synthId);
          }),
        }));
        onChange({ ...manifest, chapters: arr });
        const remaining = flatten(arr);
        if (remaining.length === 0) setOpenId(null);
        else if (focused && idSet.has(focused.id)) setOpenId(remaining[0].id);
        return () => onChange(snapshot);
      }}
      onClose={() => setOpenId(null)}
      emptyHint="No photos in the gallery yet. Add some via the chapters panel."
      editorSlot={
        focused ? (
          <PhotoEditor
            photo={focused}
            onPatch={(patch) => patchPhoto(focused, patch)}
            onRemove={() => removePhoto(focused)}
          />
        ) : null
      }
    />
  );
}

function PhotoEditor({
  photo,
  onPatch,
  onRemove,
}: {
  photo: FlatPhoto;
  onPatch: (patch: Partial<ChapterImage>) => void;
  onRemove: () => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Big preview at the top so the host always sees what they're
          editing. Aspect-locked to 4:3; covers crop. */}
      <div
        style={{
          aspectRatio: '4 / 3',
          background: 'var(--cream-2, #F5EFE2)',
          borderRadius: 14,
          overflow: 'hidden',
          border: '1px solid var(--line)',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.url}
          alt={photo.alt ?? ''}
          loading="lazy"
          decoding="async"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>

      <div
        style={{
          padding: '10px 14px',
          background: 'var(--cream-2, #F5EFE2)',
          borderRadius: 10,
          fontSize: 11.5,
          color: 'var(--ink-soft)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <Icon name="page" size={11} />
        From&nbsp;<strong style={{ color: 'var(--ink)' }}>{photo.chapterTitle}</strong>
      </div>

      <Field label="Caption">
        <TextArea
          value={photo.caption ?? ''}
          onChange={(e) => onPatch({ caption: e.target.value })}
          rows={2}
          placeholder="A short line that lands under the photo on the gallery."
        />
      </Field>

      <Field label="Alt text" help="Read by screen readers + used as the file name on download.">
        <TextInput
          value={photo.alt ?? ''}
          onChange={(e) => onPatch({ alt: e.target.value })}
          placeholder="Couple beneath the wisteria, late afternoon."
        />
      </Field>

      <Field label="Replace photo (URL)" help="Paste a new image URL to replace this photo without losing its caption.">
        <TextInput
          value={photo.url}
          onChange={(e) => onPatch({ url: e.target.value })}
          placeholder="https://…"
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
          Remove this photo
        </button>
      </div>
    </div>
  );
}
