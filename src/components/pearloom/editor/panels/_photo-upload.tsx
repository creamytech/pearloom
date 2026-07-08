'use client';

/* eslint-disable no-restricted-syntax */
/* PhotoUploadSlot — reusable drag-drop + click-to-pick + remove
   tile. Used for hero cover photo (HeroPanel) and per-chapter
   story photos (StoryPanel). Posts to /api/photos/upload and
   returns the resolved baseUrl via onChange.

   Round AA: optional `pool` prop opens a "Pick from gallery"
   modal showing every photo the host's already uploaded
   elsewhere on the site, so re-using a hero cover as a chapter
   photo (or vice versa) doesn't require re-uploading. The pool
   is built once at the panel level via `collectPhotoPool(manifest)`. */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { StoryManifest } from '@/types';
import { pearErrorMessage } from '../../redesign/PearAssist';
import {
  normalizeImageFile,
  blobToDataUrl,
  filenameForOutput,
  isHeicLike,
  normalizeErrorMessage,
  ImageNormalizeError,
} from '@/lib/image/normalize-image';

interface Props {
  /** Current photo URL (absolute, served from R2/CDN). Empty string
   *  for "no photo yet". */
  url: string;
  /** Setter — called with the new URL (or empty string when removed). */
  onChange: (next: string) => void;
  /** CSS aspect-ratio for the drop zone. Default '16/9'. */
  aspectRatio?: string;
  /** Custom hint text under the empty drop zone. */
  hint?: string;
  /** Small (used in chapter slots) vs default (used for hero cover). */
  size?: 'sm' | 'md';
  /** When present + non-empty, renders a "Pick from gallery" link
   *  under the slot. Click → opens the gallery picker modal. */
  pool?: string[];
  /** Multi-file mode (2026-07-02): the OS picker + drag-drop accept
   *  several images at once; they upload as ONE batch POST (the
   *  upload API already takes a photos[] array) and land via
   *  `onAddMany`. The first URL still goes through `onChange` when
   *  `onAddMany` is absent. Used by GalleryPanel — 30 photos no
   *  longer means 30 round trips through the picker. */
  multiple?: boolean;
  onAddMany?: (urls: string[]) => void;
}

export function PhotoUploadSlot({ url, onChange, aspectRatio = '16/9', hint, size = 'md', pool, multiple, onAddMany }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  async function uploadFile(file: File) {
    if (!file.type.startsWith('image/') && !isHeicLike(file)) {
      setErr('That file isn’t an image.');
      return;
    }
    // Normalize BEFORE upload: downscale + re-encode to web-safe
    // JPEG (any-size photo fits, HEIC becomes renderable, bytes are
    // captured now so a stale picker reference can't break later).
    setBusy(true); setErr(null);
    try {
      const normalized = await normalizeImageFile(file);
      const base64 = await blobToDataUrl(normalized.blob);
      const id = `up-${Date.now().toString(36)}`;
      const res = await fetch('/api/photos/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photos: [{
            id, filename: filenameForOutput(file.name, normalized.mimeType),
            mimeType: normalized.mimeType, base64,
            width: normalized.width, height: normalized.height,
            capturedAt: new Date(file.lastModified || Date.now()).toISOString(),
          }],
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        console.error('[photo-upload] upload failed:', res.status);
        throw new Error((j as { error?: string }).error ?? 'The upload didn’t take — try again?');
      }
      const data = await res.json() as { photos?: { baseUrl?: string }[] };
      const baseUrl = data.photos?.[0]?.baseUrl;
      if (!baseUrl) throw new Error('Upload finished but no URL was returned.');
      onChange(baseUrl);
    } catch (e) {
      console.error('[photo-upload] upload error:', e);
      setErr(e instanceof ImageNormalizeError
        ? normalizeErrorMessage(e)
        : pearErrorMessage(e, 'The upload didn’t take — try again?'));
    } finally {
      setBusy(false);
    }
  }

  async function uploadMany(files: File[]) {
    // Any-size photos welcome now — the normalizer shrinks them.
    // We only pre-filter genuinely non-image files.
    const good = files.filter((f) => f.type.startsWith('image/') || isHeicLike(f));
    if (good.length === 0) {
      setErr(files.length ? 'Those files aren’t images.' : null);
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      // Normalize each before upload (downscale + HEIC→JPEG). Files
      // that fail to decode are dropped from the batch, not fatal.
      const normalizeFailures: string[] = [];
      const settled = await Promise.all(good.map(async (file, i) => {
        try {
          const normalized = await normalizeImageFile(file);
          const base64 = await blobToDataUrl(normalized.blob);
          return {
            id: `up-${Date.now().toString(36)}-${i}`,
            filename: filenameForOutput(file.name, normalized.mimeType),
            mimeType: normalized.mimeType, base64,
            width: normalized.width, height: normalized.height,
            capturedAt: new Date(file.lastModified || Date.now()).toISOString(),
          };
        } catch (e) {
          normalizeFailures.push(normalizeErrorMessage(e));
          return null;
        }
      }));
      const photos = settled.filter((p): p is NonNullable<typeof p> => p !== null);
      if (photos.length === 0) {
        setErr(normalizeFailures[0] ?? 'Those photos couldn’t be prepared.');
        return;
      }
      if (normalizeFailures.length > 0) {
        setErr(`${normalizeFailures.length} photo${normalizeFailures.length > 1 ? 's' : ''} skipped — ${normalizeFailures[0]}`);
      }
      const res = await fetch('/api/photos/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photos }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        console.error('[photo-upload] batch upload failed:', res.status);
        throw new Error((j as { error?: string }).error ?? 'The upload didn’t take — try again?');
      }
      const data = await res.json() as { photos?: { baseUrl?: string }[] };
      const urls = (data.photos ?? []).map((p) => p.baseUrl).filter((u): u is string => !!u);
      if (urls.length === 0) throw new Error('Upload finished but no URLs were returned.');
      if (onAddMany) onAddMany(urls);
      else onChange(urls[0]);
    } catch (e) {
      console.error('[photo-upload] batch upload error:', e);
      setErr(pearErrorMessage(e, 'The upload didn’t take — try again?'));
    } finally {
      setBusy(false);
    }
  }

  function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (multiple && files.length > 1) {
      void uploadMany(Array.from(files));
      return;
    }
    void uploadFile(files[0]);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    onFiles(e.dataTransfer.files);
  }

  const isSmall = size === 'sm';
  /* Pool the host can re-pick from — dedupe + drop the current
     slot's URL so the picker only ever shows OTHER photos. */
  const otherPhotos = (pool ?? []).filter((u) => u && u !== url);
  const hasPool = otherPhotos.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !busy && fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
        style={{
          display: 'block', width: '100%', aspectRatio,
          borderRadius: isSmall ? 8 : 10,
          border: dragOver
            ? '2px dashed var(--peach-ink)'
            : url
              ? '1px solid var(--line)'
              : '2px dashed var(--line)',
          background: url
            ? `var(--cream-2) center / cover no-repeat url("${url.replace(/"/g, '%22')}")`
            : 'var(--cream-2)',
          position: 'relative',
          cursor: busy ? 'wait' : 'pointer',
          transition: 'border-color 140ms, background 140ms',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple={multiple}
          onChange={(e) => onFiles(e.target.files)}
          style={{ display: 'none' }}
        />
        {!url && !busy && (
          <div style={{
            position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
            color: 'var(--ink-muted)', fontSize: isSmall ? 11 : 12.5, textAlign: 'center', padding: 12,
          }}>
            {/* Touch-neutral copy — "drop" assumed a mouse; the OS
                picker (camera / library) opens on tap either way. */}
            <div>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>{isSmall ? 'Add a photo' : 'Tap to add a photo'}</div>
              {!isSmall && <div style={{ fontSize: 11.5 }}>from your device — or drop one here</div>}
            </div>
          </div>
        )}
        {busy && (
          <div style={{
            position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
            /* Theme-aware scrim — a fixed cream wash left the peach
               "Threading…" label light-on-light in editorial-midnight. */
            background: 'color-mix(in oklab, var(--pl-cream-card, #FBF7EE) 88%, transparent)', borderRadius: isSmall ? 8 : 10,
            fontSize: 11.5, fontWeight: 600, color: 'var(--peach-ink)',
          }}>
            Uploading…
          </div>
        )}
        {url && !busy && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(''); }}
            aria-label="Remove photo"
            title="Remove photo"
            className="pl-hit44"
            style={{
              position: 'absolute', top: 6, right: 6,
              width: 22, height: 22, borderRadius: 999,
              background: 'rgba(20,20,20,0.72)', color: '#fff',
              border: 'none', cursor: 'pointer',
              display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700,
              lineHeight: 1,
            }}
          >×</button>
        )}
      </div>

      {/* "Pick from gallery" link — only when there's actually
          another uploaded photo to choose from, and either the
          slot is empty (so the host needs SOMETHING in it) or
          they want to swap it for one already on the site. */}
      {hasPool && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setPickerOpen(true); }}
          style={{
            alignSelf: 'flex-start',
            marginTop: 2,
            padding: '4px 8px',
            borderRadius: 7,
            border: '1px solid var(--line)',
            background: 'transparent',
            color: 'var(--ink-soft)',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          {/* Tiny stacked-photos glyph */}
          <span aria-hidden style={{ display: 'inline-block', position: 'relative', width: 13, height: 11 }}>
            <span style={{ position: 'absolute', left: 0, top: 2, width: 9, height: 9, borderRadius: 2, background: 'var(--cream-3)', border: '1px solid var(--line)' }} />
            <span style={{ position: 'absolute', left: 3, top: 0, width: 9, height: 9, borderRadius: 2, background: 'var(--peach-bg)', border: '1px solid var(--peach-ink)' }} />
          </span>
          {url ? 'Swap from gallery' : 'Pick from gallery'}
          <span style={{ fontSize: 10, color: 'var(--ink-muted)', fontWeight: 500 }}>· {otherPhotos.length}</span>
        </button>
      )}

      {hint && !url && !err && (
        <div style={{ fontSize: 10.5, color: 'var(--ink-muted)' }}>{hint}</div>
      )}
      {err && (
        <div style={{ padding: '5px 9px', borderRadius: 6, background: 'rgba(122,45,45,0.08)', fontSize: 11, color: '#7A2D2D' }}>
          {err}
        </div>
      )}

      {pickerOpen && (
        <GalleryPickerModal
          photos={otherPhotos}
          onPick={(picked) => { onChange(picked); setPickerOpen(false); }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}

/* ─── GalleryPickerModal ───────────────────────────────────── */

interface GalleryPickerModalProps {
  photos: string[];
  onPick: (url: string) => void;
  onClose: () => void;
}

function GalleryPickerModal({ photos, onPick, onClose }: GalleryPickerModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  /* SSR guard — react-dom's createPortal requires a live document
     element. During the server render pass there is none, so we
     skip the portal and return null (the parent component re-runs
     on hydration and the modal mounts then). */
  if (typeof document === 'undefined') return null;

  /* Portal to document.body — escapes any ancestor with
     transform/filter/contain/will-change that would otherwise
     trap `position: fixed` into a local containing block. Without
     this the modal renders inside the right rail (where the
     editor's panel chrome lives) instead of overlaying the viewport.
     See: https://developer.mozilla.org/en-US/docs/Web/CSS/position#fixed_positioning
     ("If any ancestor has a transform, perspective, or filter
     property set to other than none, that ancestor behaves as the
     containing block.") */
  return createPortal((
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(14,13,11,0.42)',
        display: 'grid', placeItems: 'center',
        padding: 24,
        animation: 'pl-fade-in 140ms ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Pick a photo"
        style={{
          width: '100%',
          maxWidth: 640,
          maxHeight: '78vh',
          display: 'flex', flexDirection: 'column',
          background: 'var(--card)',
          border: '1px solid var(--line)',
          borderRadius: 14,
          boxShadow: '0 24px 60px rgba(40,28,12,0.24), 0 8px 18px rgba(40,28,12,0.10)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid var(--line-soft)' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
              Pick a photo
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 1 }}>
              {photos.length} {photos.length === 1 ? 'photo' : 'photos'} already uploaded to your site
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'var(--cream-2)', border: 'none',
              cursor: 'pointer',
              display: 'grid', placeItems: 'center',
              fontSize: 14, fontWeight: 700, color: 'var(--ink-soft)',
              lineHeight: 1,
            }}
          >×</button>
        </div>

        {/* Grid */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 14,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8,
          }}
        >
          {photos.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center', color: 'var(--ink-muted)', fontSize: 13 }}>
              Nothing else uploaded yet.<br />
              Drop a photo into any slot to start your library.
            </div>
          ) : photos.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => onPick(src)}
              style={{
                position: 'relative',
                aspectRatio: '1 / 1',
                borderRadius: 8,
                border: '1px solid var(--line)',
                background: `var(--cream-2) center / cover no-repeat url("${src.replace(/"/g, '%22')}")`,
                cursor: 'pointer',
                padding: 0,
                transition: 'transform 140ms, box-shadow 140ms, border-color 140ms',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.02)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(40,28,12,0.18)';
                e.currentTarget.style.borderColor = 'var(--peach-ink)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = 'var(--line)';
              }}
            />
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '10px 18px', borderTop: '1px solid var(--line-soft)', background: 'var(--cream-2)', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: '1px solid var(--line)',
              background: 'transparent',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--ink-soft)',
              cursor: 'pointer',
            }}
          >Cancel</button>
        </div>
      </div>
    </div>
  ), document.body);
}

/* ─── collectPhotoPool ─────────────────────────────────────── */

/** Walk the manifest and gather every photo URL the host's already
 *  uploaded — cover photo + gallery images + each chapter's
 *  photos. Deduped, blanks stripped. Used by panels to feed
 *  PhotoUploadSlot's `pool` prop so the host can re-pick photos
 *  across slots without re-uploading. */
export function collectPhotoPool(manifest: StoryManifest): string[] {
  const loose = manifest as unknown as Record<string, unknown>;
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (u: unknown) => {
    if (typeof u !== 'string') return;
    const t = u.trim();
    if (!t) return;
    if (seen.has(t)) return;
    seen.add(t);
    out.push(t);
  };
  push(loose.coverPhoto);
  /* Gallery section host uploads. */
  const gal = loose.galleryImages as unknown;
  if (Array.isArray(gal)) gal.forEach(push);
  /* Per-chapter photos. images[] is shaped as { url, ... }. */
  const chapters = loose.chapters as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(chapters)) {
    for (const c of chapters) {
      const imgs = c.images as Array<Record<string, unknown>> | undefined;
      if (Array.isArray(imgs)) {
        for (const img of imgs) push(img.url);
      }
    }
  }
  return out;
}
