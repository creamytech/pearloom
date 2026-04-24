'use client';

// ─────────────────────────────────────────────────────────────
// Reusable Photo Picker modal — drop-in for any editor photo
// slot. Opens over the editor, lets the user pick from their
// library OR upload a new one, and returns the URL via callback.
//
// Usage:
//   const [open, setOpen] = useState(false);
//   <PhotoPicker open={open} onClose={...} onPick={(url) => {...}} />
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '../motifs';
import { useGooglePhotosPicker, type PickedPhoto } from '@/hooks/useGooglePhotosPicker';

export interface LibraryPhoto {
  id: string;
  url: string;
  filename?: string | null;
  caption?: string | null;
  width?: number | null;
  height?: number | null;
  source: string;
  created_at: string;
}

export function PhotoPicker({
  open,
  onClose,
  onPick,
  title = 'Choose a photo',
  accept = 'single',
}: {
  open: boolean;
  onClose: () => void;
  /** Called with one URL for single-pick, or an array for multi. */
  onPick: (urls: string | string[]) => void;
  title?: string;
  accept?: 'single' | 'multi';
}) {
  const [media, setMedia] = useState<LibraryPhoto[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
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
    if (!open) return;
    void load();
    setSelectedIds(new Set());
    setQuery('');
  }, [open, load]);

  const filtered = useMemo(() => {
    const list = media ?? [];
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter(
      (m) => (m.filename ?? '').toLowerCase().includes(q) || (m.caption ?? '').toLowerCase().includes(q),
    );
  }, [media, query]);

  function toggleSelect(m: LibraryPhoto) {
    if (accept === 'single') {
      onPick(m.url);
      onClose();
      return;
    }
    setSelectedIds((s) => {
      const next = new Set(s);
      if (next.has(m.id)) next.delete(m.id);
      else next.add(m.id);
      return next;
    });
  }

  function confirmMulti() {
    const urls = (media ?? []).filter((m) => selectedIds.has(m.id)).map((m) => m.url);
    if (urls.length === 0) return;
    onPick(urls);
    onClose();
  }

  async function handleDeviceFile(files: FileList | null) {
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
            id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
      const data = (await r.json().catch(() => null)) as { photos?: Array<{ baseUrl: string }> } | null;
      if (r.ok && data?.photos && data.photos.length > 0) {
        // Single-pick: pick the first uploaded photo immediately.
        if (accept === 'single' && data.photos[0]?.baseUrl) {
          onPick(data.photos[0].baseUrl);
          onClose();
          return;
        }
      }
      await load();
    } catch {
      /* surface a toast? for now, silent */
    } finally {
      setUploading(false);
    }
  }

  function onGoogle() {
    picker.pick((photos: PickedPhoto[]) => {
      // /api/photos fetch persists to user_media; we re-load and
      // (for single-pick) auto-return the first one.
      void (async () => {
        await new Promise((r) => setTimeout(r, 400));
        await load();
        if (accept === 'single' && photos[0]?.baseUrl) {
          onPick(photos[0].baseUrl);
          onClose();
        }
      })();
    });
  }

  if (!open) return null;

  const pickerBusy = picker.state === 'creating' || picker.state === 'waiting' || picker.state === 'fetching';

  return (
    <div
      role="dialog"
      aria-label={title}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(14,13,11,0.6)',
        backdropFilter: 'blur(8px)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 10000,
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--cream)',
          borderRadius: 18,
          width: 'min(1000px, 100%)',
          height: 'min(720px, 92vh)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 40px 80px rgba(14,13,11,0.35)',
        }}
      >
        <header
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--line-soft)',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div className="display" style={{ fontSize: 22, margin: 0, flex: 1 }}>
            {title}
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search filename or caption"
            style={{
              padding: '8px 12px',
              borderRadius: 10,
              border: '1px solid var(--line)',
              background: 'var(--card)',
              fontSize: 13,
              fontFamily: 'var(--font-ui)',
              width: 240,
              outline: 'none',
            }}
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'transparent',
              border: '1px solid var(--line)',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
            }}
          >
            <Icon name="close" size={14} />
          </button>
        </header>

        <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--line-soft)', display: 'flex', gap: 10 }}>
          <label
            htmlFor="pl8-picker-input"
            style={{
              padding: '8px 14px',
              borderRadius: 999,
              background: 'var(--ink)',
              color: 'var(--cream)',
              fontSize: 12,
              fontWeight: 600,
              cursor: uploading ? 'wait' : 'pointer',
              fontFamily: 'var(--font-ui)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              opacity: uploading ? 0.7 : 1,
            }}
          >
            <Icon name="upload" size={12} color="var(--cream)" /> {uploading ? 'Uploading…' : 'Upload'}
          </label>
          <input
            id="pl8-picker-input"
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => void handleDeviceFile(e.target.files)}
          />
          <button
            type="button"
            onClick={onGoogle}
            disabled={pickerBusy}
            style={{
              padding: '8px 14px',
              borderRadius: 999,
              background: 'var(--card)',
              border: '1px solid var(--line)',
              fontSize: 12,
              fontWeight: 600,
              cursor: pickerBusy ? 'wait' : 'pointer',
              fontFamily: 'var(--font-ui)',
            }}
          >
            {pickerBusy ? 'Opening Google Photos…' : 'Google Photos'}
          </button>
          <div style={{ flex: 1 }} />
          {accept === 'multi' && (
            <button
              type="button"
              onClick={confirmMulti}
              disabled={selectedIds.size === 0}
              style={{
                padding: '8px 16px',
                borderRadius: 999,
                background: selectedIds.size > 0 ? 'var(--peach-2)' : 'var(--cream-2)',
                color: selectedIds.size > 0 ? 'var(--ink)' : 'var(--ink-muted)',
                border: 'none',
                fontSize: 12,
                fontWeight: 600,
                cursor: selectedIds.size > 0 ? 'pointer' : 'not-allowed',
                fontFamily: 'var(--font-ui)',
              }}
            >
              <Icon name="check" size={12} /> Use {selectedIds.size || 'photos'}
            </button>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
          {loading ? (
            <div style={{ color: 'var(--ink-soft)', textAlign: 'center', padding: 40 }}>Threading…</div>
          ) : filtered.length === 0 ? (
            <div style={{ color: 'var(--ink-soft)', textAlign: 'center', padding: 40 }}>
              {query ? 'No matches.' : 'Your library is empty — upload or pick from Google Photos above.'}
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: 10,
              }}
            >
              {filtered.map((m) => {
                const sel = selectedIds.has(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleSelect(m)}
                    style={{
                      position: 'relative',
                      borderRadius: 10,
                      overflow: 'hidden',
                      background: '#000',
                      border: sel ? '3px solid var(--peach-2)' : '3px solid transparent',
                      padding: 0,
                      cursor: 'pointer',
                    }}
                  >
                    <img
                      src={m.url}
                      alt={m.filename ?? ''}
                      style={{ width: '100%', height: 130, objectFit: 'cover', display: 'block' }}
                    />
                    {sel && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 6,
                          right: 6,
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          background: 'var(--peach-2)',
                          color: 'var(--ink)',
                          display: 'grid',
                          placeItems: 'center',
                        }}
                      >
                        <Icon name="check" size={12} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
