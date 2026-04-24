'use client';

import { useRef, type ChangeEvent } from 'react';
import type { StoryManifest, Chapter } from '@/types';
import { EmptyBlockState, PanelSection } from '../atoms';
import { Icon } from '../../motifs';

export function GalleryPanel({
  manifest,
  onChange,
}: {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const chapters = manifest.chapters ?? [];

  // Flatten to a single list with back-references so we can update a given
  // photo back into its chapter when reordered/deleted.
  const photos: Array<{ url: string; chapterIdx: number; imageIdx: number; caption?: string }> = [];
  chapters.forEach((c, ci) => {
    (c.images ?? []).forEach((img, ii) => {
      if (img.url) photos.push({ url: img.url, chapterIdx: ci, imageIdx: ii, caption: img.caption });
    });
  });

  function updateChapter(idx: number, patch: Partial<Chapter>) {
    const next = chapters.map((c, i) => (i === idx ? { ...c, ...patch } : c));
    onChange({ ...manifest, chapters: next });
  }

  function addToFirstChapter(urls: string[]) {
    if (urls.length === 0) return;
    let target = chapters[0];
    if (!target) {
      target = {
        id: `ch-gallery-${Date.now().toString(36)}`,
        date: new Date().toISOString().slice(0, 10),
        title: 'Along the way',
        subtitle: '',
        description: '',
        images: [],
        location: null,
        mood: 'warm',
        order: 0,
      };
      const nextChapters = [target];
      const nextImages = urls.map((u, i) => ({
        id: `img-${Date.now().toString(36)}-${i}`,
        url: u,
        alt: '',
        width: 1600,
        height: 1600,
      }));
      onChange({ ...manifest, chapters: [{ ...target, images: nextImages }] });
      return;
    }
    const nextImages = [
      ...(target.images ?? []),
      ...urls.map((u, i) => ({
        id: `img-${Date.now().toString(36)}-${i}`,
        url: u,
        alt: '',
        width: 1600,
        height: 1600,
      })),
    ];
    updateChapter(0, { images: nextImages });
  }

  function removePhoto(chapterIdx: number, imageIdx: number) {
    const chapter = chapters[chapterIdx];
    if (!chapter) return;
    const nextImages = (chapter.images ?? []).filter((_, i) => i !== imageIdx);
    updateChapter(chapterIdx, { images: nextImages });
  }

  async function onFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const urls = await Promise.all(
      files.map(
        (f) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
            reader.readAsDataURL(f);
          })
      )
    );
    addToFirstChapter(urls.filter(Boolean));
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" multiple onChange={onFiles} style={{ display: 'none' }} />

      <PanelSection
        label="Gallery"
        hint="Photos from every chapter stream into the gallery section on your site."
        action={
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => inputRef.current?.click()}
          >
            <Icon name="upload" size={13} color="var(--cream)" /> Upload photos
          </button>
        }
      >
        {photos.length === 0 ? (
          <EmptyBlockState
            icon="gallery"
            title="No photos yet"
            body="Drop a batch — the v8 gallery uses a bento layout, so 8–16 photos looks especially nice."
            action={
              <button type="button" className="btn btn-primary btn-sm" onClick={() => inputRef.current?.click()}>
                <Icon name="upload" size={13} color="var(--cream)" /> Upload photos
              </button>
            }
          />
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: 10,
            }}
          >
            {photos.map((p, i) => (
              <div
                key={`${p.chapterIdx}-${p.imageIdx}-${i}`}
                style={{
                  position: 'relative',
                  aspectRatio: '1/1',
                  borderRadius: 12,
                  overflow: 'hidden',
                  background: `#e8e4d5 url(${p.url}) center/cover no-repeat`,
                }}
              >
                <button
                  type="button"
                  onClick={() => removePhoto(p.chapterIdx, p.imageIdx)}
                  aria-label="Remove photo"
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    background: 'rgba(14,13,11,0.65)',
                    color: 'var(--cream)',
                    border: 0,
                    display: 'grid',
                    placeItems: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <Icon name="close" size={12} color="var(--cream)" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 8 }}>
          {photos.length} {photos.length === 1 ? 'photo' : 'photos'} across {chapters.length}{' '}
          {chapters.length === 1 ? 'chapter' : 'chapters'}.
        </div>
      </PanelSection>
    </div>
  );
}
