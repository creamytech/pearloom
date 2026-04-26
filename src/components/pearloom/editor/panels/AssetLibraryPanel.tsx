'use client';

// ──────────────────────────────────────────────────────────────
// AssetLibraryPanel — the rail-docked asset browser. Surfaces
// in the inspector's "Library" tab so users can keep their
// photos in view while editing the canvas.
//
// Three sources, all in one panel:
//   • Library  — already-uploaded photos from /api/user-media
//   • Upload   — file picker → POST /api/photos/upload → R2
//   • Google   — official Google Photos picker via the existing
//                useGooglePhotosPicker hook
//
// Every tile is HTML5-draggable. PhotoDropTarget already accepts
// URL drags via the text/uri-list mime so dropping a tile on any
// canvas photo dropzone "just works" — no changes needed there.
//
// Click a tile to broadcast a `pearloom:asset-pick` event with the
// URL. Future surfaces can listen + apply (e.g. "click to set as
// the active block's photo").
// ──────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../../motifs';
import { useGooglePhotosPicker, type PickedPhoto } from '@/hooks/useGooglePhotosPicker';

interface LibraryPhoto {
  id: string;
  url: string;
  filename?: string | null;
  caption?: string | null;
  source?: string;
  created_at?: string;
}

const DRAG_MIME = 'application/x-pearloom-asset';

export function AssetLibraryPanel() {
  const [media, setMedia] = useState<LibraryPhoto[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const picker = useGooglePhotosPicker();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/user-media', { cache: 'no-store' });
      if (!r.ok) throw new Error('Failed');
      const d = (await r.json()) as { media?: LibraryPhoto[] };
      setMedia(d.media ?? []);
    } catch {
      setMedia([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const list = media ?? [];
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter(
      (m) => (m.filename ?? '').toLowerCase().includes(q) || (m.caption ?? '').toLowerCase().includes(q),
    );
  }, [media, query]);

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const accepted = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (accepted.length === 0) return;
    setUploading(true);
    try {
      const payload = await Promise.all(
        accepted.map(async (file) => {
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
            reader.onerror = () => resolve('');
            reader.readAsDataURL(file);
          });
          return {
            id: `up-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            filename: file.name,
            mimeType: file.type || 'image/jpeg',
            base64: dataUrl,
            capturedAt: file.lastModified ? new Date(file.lastModified).toISOString() : undefined,
          };
        }),
      );
      const r = await fetch('/api/photos/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photos: payload, source: 'editor' }),
      });
      if (r.ok) await load();
    } catch {
      /* silent */
    } finally {
      setUploading(false);
    }
  }

  function onGoogle() {
    picker.pick((_photos: PickedPhoto[]) => {
      void (async () => {
        await new Promise((r) => setTimeout(r, 400));
        await load();
      })();
    });
  }

  const pickerBusy =
    picker.state === 'creating' || picker.state === 'waiting' || picker.state === 'fetching';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Source actions — Upload + Google Photos */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          padding: '12px 16px 10px',
          borderBottom: '1px solid var(--line-soft)',
          background: 'var(--cream)',
        }}
      >
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => {
            void onFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
          style={{
            flex: 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '7px 12px',
            borderRadius: 999,
            background: 'var(--ink)',
            color: 'var(--cream)',
            border: 'none',
            fontSize: 11.5,
            fontWeight: 700,
            fontFamily: 'var(--font-ui)',
            cursor: uploading ? 'wait' : 'pointer',
          }}
        >
          <Icon name="upload" size={11} color="var(--cream)" />
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
        <button
          type="button"
          onClick={onGoogle}
          disabled={pickerBusy}
          style={{
            flex: 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '7px 12px',
            borderRadius: 999,
            background: 'var(--card)',
            color: 'var(--ink)',
            border: '1px solid var(--line-soft)',
            fontSize: 11.5,
            fontWeight: 600,
            fontFamily: 'var(--font-ui)',
            cursor: pickerBusy ? 'wait' : 'pointer',
          }}
        >
          <Icon name="image" size={11} />
          {pickerBusy ? 'Opening…' : 'Google Photos'}
        </button>
      </div>

      {/* Search */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--line-soft)' }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search filename or caption"
          style={{
            width: '100%',
            padding: '7px 10px',
            borderRadius: 8,
            border: '1px solid var(--line-soft)',
            background: 'var(--card)',
            fontSize: 12,
            fontFamily: 'var(--font-ui)',
            outline: 'none',
            color: 'var(--ink)',
          }}
        />
      </div>

      {/* Tiles */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        {loading ? (
          <div style={{ color: 'var(--ink-soft)', textAlign: 'center', padding: 24, fontSize: 12 }}>
            Threading…
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              color: 'var(--ink-soft)',
              textAlign: 'center',
              padding: '24px 12px',
              fontSize: 12,
              lineHeight: 1.5,
            }}
          >
            {query ? 'No matches.' : (
              <>
                <div style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
                  Library is empty.
                </div>
                Upload or pick from Google Photos above. Drag any tile onto a canvas photo to apply it.
              </>
            )}
          </div>
        ) : (
          <>
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--ink-muted)',
                marginBottom: 8,
                padding: '0 4px',
              }}
            >
              {filtered.length} {filtered.length === 1 ? 'photo' : 'photos'} · drag onto canvas
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 8,
              }}
            >
              {filtered.map((m) => (
                <AssetTile key={m.id} photo={m} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function AssetTile({ photo }: { photo: LibraryPhoto }) {
  function onDragStart(e: React.DragEvent<HTMLDivElement>) {
    // Set BOTH the pearloom mime AND text/uri-list, since
    // PhotoDropTarget already accepts text/uri-list — no changes
    // needed on the dropzone.
    e.dataTransfer.setData(DRAG_MIME, photo.url);
    e.dataTransfer.setData('text/uri-list', photo.url);
    e.dataTransfer.setData('text/plain', photo.url);
    e.dataTransfer.effectAllowed = 'copy';
  }

  function onClick() {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('pearloom:asset-pick', {
      detail: { url: photo.url, filename: photo.filename ?? null },
    }));
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      title={`${photo.filename ?? 'Photo'} — drag onto a canvas photo to apply`}
      style={{
        position: 'relative',
        aspectRatio: '1/1',
        borderRadius: 8,
        overflow: 'hidden',
        background: '#000',
        cursor: 'grab',
        border: '1px solid var(--line-soft)',
        transition: 'transform 180ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 180ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = '0 8px 18px -8px rgba(14,13,11,0.32)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = '';
      }}
    >
      <img
        src={photo.url}
        alt={photo.filename ?? ''}
        loading="lazy"
        draggable={false}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
