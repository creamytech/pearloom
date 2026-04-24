'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import type { StoryManifest, Chapter } from '@/types';
import { EmptyBlockState, PanelSection } from '../atoms';
import { Icon } from '../../motifs';

/** Reads natural width/height of a data-URL image so we persist
 *  real dimensions on manifest.chapter.images[] instead of the
 *  1600×1600 placeholder (which broke every non-square photo's
 *  aspect ratio in the gallery layout). */
function readImageDims(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve({ width: 1600, height: 1600 });
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth || 1600, height: img.naturalHeight || 1600 });
    img.onerror = () => resolve({ width: 1600, height: 1600 });
    img.src = dataUrl;
  });
}

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

  async function addToFirstChapter(files: File[], dataUrls: string[]) {
    if (dataUrls.length === 0) return;
    // 1) Mirror to R2 so the final manifest carries permanent URLs
    //    instead of megabytes of base64 that clobber the save payload.
    //    Falls back to data URLs if the upload endpoint fails so the
    //    user still sees their photos in the editor.
    let uploadedUrls: string[] = [];
    try {
      const res = await fetch('/api/photos/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photos: dataUrls.map((b, i) => ({
            id: `gal-${Date.now()}-${i}`,
            filename: files[i]?.name ?? `gallery-${i}.jpg`,
            mimeType: files[i]?.type ?? 'image/jpeg',
            base64: b,
            capturedAt: files[i]?.lastModified
              ? new Date(files[i].lastModified).toISOString()
              : new Date().toISOString(),
          })),
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { photos?: Array<{ baseUrl?: string }> };
        uploadedUrls = (data.photos ?? []).map((p) => p.baseUrl ?? '');
      }
    } catch {}
    const finalUrls = dataUrls.map((d, i) => uploadedUrls[i] || d);
    const dims = await Promise.all(dataUrls.map((d) => readImageDims(d)));
    const ts = Date.now().toString(36);

    let target = chapters[0];
    if (!target) {
      target = {
        id: `ch-gallery-${ts}`,
        date: new Date().toISOString().slice(0, 10),
        title: 'Along the way',
        subtitle: '',
        description: '',
        images: [],
        location: null,
        mood: 'warm',
        order: 0,
      };
      const nextImages = finalUrls.map((u, i) => ({
        id: `img-${ts}-${i}`,
        url: u,
        alt: '',
        width: dims[i].width,
        height: dims[i].height,
      }));
      onChange({ ...manifest, chapters: [{ ...target, images: nextImages }] });
      return;
    }
    const nextImages = [
      ...(target.images ?? []),
      ...finalUrls.map((u, i) => ({
        id: `img-${ts}-${i}`,
        url: u,
        alt: '',
        width: dims[i].width,
        height: dims[i].height,
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
    setUploading(true);
    try {
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
      await addToFirstChapter(files, urls.filter(Boolean));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const [uploading, setUploading] = useState(false);
  void uploading;

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
