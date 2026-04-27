'use client';

// ─────────────────────────────────────────────────────────────
// Photo Library — the user's personal media bank.
// Every photo they've uploaded (wizard, editor, invite, Google
// Photos picker) lands here. From here, they can:
//   • add more photos (device upload or Google Photos picker)
//   • caption / delete individual photos
//   • see where each photo came from (source + site)
//   • use any photo in the editor via the PhotoPicker modal
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DashLayout } from '../dash/DashShell';
import { Icon } from '../motifs';
import { useGooglePhotosPicker, type PickedPhoto } from '@/hooks/useGooglePhotosPicker';

export interface UserMedia {
  id: string;
  url: string;
  width?: number | null;
  height?: number | null;
  mime_type?: string | null;
  filename?: string | null;
  caption?: string | null;
  taken_at?: string | null;
  source: 'upload' | 'google' | 'wizard' | 'editor' | 'invite';
  source_site_id?: string | null;
  created_at: string;
}

type SourceFilter = 'all' | 'upload' | 'google' | 'wizard' | 'editor';

export function LibraryPage() {
  const [media, setMedia] = useState<UserMedia[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<SourceFilter>('all');
  const [uploadingCount, setUploadingCount] = useState(0);
  const picker = useGooglePhotosPicker();
  const [selected, setSelected] = useState<UserMedia | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/user-media', { cache: 'no-store' });
      if (!r.ok) throw new Error('Failed');
      const d = (await r.json()) as { media?: UserMedia[] };
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

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const accepted = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (accepted.length === 0) return;
    setUploadingCount(accepted.length);
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
      await fetch('/api/photos/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photos: payload, source: 'upload' }),
      });
      await load();
    } catch {
      // swallow — the grid will still refresh on next poll
    } finally {
      setUploadingCount(0);
    }
  }

  function onGoogle() {
    picker.pick((photos: PickedPhoto[]) => {
      // The /api/photos fetch handler now persists to user_media
      // automatically — we just need to refresh.
      void (async () => {
        await new Promise((r) => setTimeout(r, 400));
        await load();
      })();
      // Suppress unused-param warning
      void photos;
    });
  }

  async function onDelete(id: string) {
    if (!confirm('Remove this photo from your library?')) return;
    setMedia((m) => (m ?? []).filter((x) => x.id !== id));
    try {
      await fetch(`/api/user-media?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch {}
  }

  async function onCaption(id: string, caption: string) {
    setMedia((m) => (m ?? []).map((x) => (x.id === id ? { ...x, caption } : x)));
    try {
      await fetch('/api/user-media', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, caption }),
      });
    } catch {}
  }

  const filtered = useMemo(() => {
    const list = media ?? [];
    if (filter === 'all') return list;
    return list.filter((m) => m.source === filter);
  }, [media, filter]);

  const counts = useMemo(() => {
    const c: Record<SourceFilter, number> = { all: 0, upload: 0, google: 0, wizard: 0, editor: 0 };
    for (const m of media ?? []) {
      c.all += 1;
      if (m.source in c) (c as unknown as Record<string, number>)[m.source] = ((c as unknown as Record<string, number>)[m.source] ?? 0) + 1;
    }
    return c;
  }, [media]);

  const pickerBusy = picker.state === 'creating' || picker.state === 'waiting' || picker.state === 'fetching';

  return (
    <DashLayout
      active="library"
      title="Photo library"
      subtitle="Every photo you've uploaded to Pearloom, in one place. Add more, caption them, and drop them into any site you're building."
    >
      <div style={{ padding: '0 clamp(20px, 4vw, 40px) 32px', maxWidth: 1240, margin: '0 auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 14,
            marginBottom: 22,
          }}
        >
          <label
            htmlFor="pl8-library-input"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 30,
              border: '2px dashed var(--line)',
              borderRadius: 16,
              background: 'var(--cream-2)',
              cursor: 'pointer',
              gap: 8,
              color: 'var(--ink)',
              minHeight: 150,
            }}
          >
            <Icon name="upload" size={26} />
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {uploadingCount > 0 ? `Uploading ${uploadingCount}…` : 'Add photos from device'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>JPG, PNG, HEIC</div>
          </label>
          <input
            id="pl8-library-input"
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => void onFiles(e.target.files)}
          />

          <button
            type="button"
            onClick={onGoogle}
            disabled={pickerBusy}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 30,
              border: '2px solid var(--line)',
              borderRadius: 16,
              background: pickerBusy ? 'var(--cream-2)' : 'var(--card)',
              cursor: pickerBusy ? 'wait' : 'pointer',
              gap: 8,
              color: 'var(--ink)',
              minHeight: 150,
              fontFamily: 'var(--font-ui)',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 48 48" aria-hidden>
              <path fill="#EA4335" d="M24 9.5c-3.54 0-6.72 1.22-9.2 3.22l-5.36-5.36C13.26 3.89 18.37 2 24 2c8.27 0 15.26 4.59 19 11.27l-5.9 4.58C34.96 13.31 29.89 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.35l-7.73-6c-2.15 1.45-4.92 2.3-6.84 2.3-5.89 0-10.87-3.81-12.65-8.85l-7.98 6.19C6.73 41.41 13.73 46 24 46z" />
            </svg>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {pickerBusy ? 'Opening…' : 'Pick from Google Photos'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Nothing leaves Google unless you pick it</div>
          </button>
        </div>

        {picker.error && (
          <div style={{ fontSize: 13, color: '#7A2D2D', marginBottom: 12 }}>{picker.error}</div>
        )}

        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          {(
            [
              ['all', 'All'],
              ['upload', 'Device'],
              ['google', 'Google Photos'],
              ['wizard', 'Wizard'],
              ['editor', 'Editor'],
            ] as Array<[SourceFilter, string]>
          ).map(([k, l]) => {
            const on = filter === k;
            const n = counts[k] ?? 0;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setFilter(k)}
                style={{
                  padding: '6px 14px',
                  fontSize: 12,
                  borderRadius: 999,
                  background: on ? 'var(--ink)' : 'transparent',
                  color: on ? 'var(--cream)' : 'var(--ink)',
                  border: `1px solid ${on ? 'var(--ink)' : 'var(--line)'}`,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-ui)',
                  fontWeight: 500,
                }}
              >
                {l} · {n}
              </button>
            );
          })}
        </div>

        {loading && <div style={{ color: 'var(--ink-soft)' }}>Threading your library…</div>}

        {!loading && filtered.length === 0 && (
          <div
            style={{
              padding: 40,
              textAlign: 'center',
              background: 'var(--card)',
              border: '1px dashed var(--line)',
              borderRadius: 18,
              color: 'var(--ink-soft)',
            }}
          >
            <div className="display" style={{ fontSize: 22, marginBottom: 6 }}>
              Nothing here yet.
            </div>
            <div style={{ fontSize: 13, maxWidth: 420, margin: '0 auto' }}>
              Add a few photos above, or come back after you run the wizard — every photo you upload lands here.
            </div>
          </div>
        )}

        {filtered.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 12,
            }}
          >
            {filtered.map((m) => (
              <div
                key={m.id}
                style={{
                  position: 'relative',
                  borderRadius: 12,
                  overflow: 'hidden',
                  background: '#000',
                  cursor: 'pointer',
                }}
                onClick={() => setSelected(m)}
              >
                <img
                  src={m.url}
                  alt={m.caption ?? m.filename ?? ''}
                  style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }}
                />
                {m.source === 'google' && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 6,
                      left: 6,
                      padding: '2px 8px',
                      background: 'rgba(66,133,244,0.85)',
                      color: '#fff',
                      fontSize: 10,
                      borderRadius: 999,
                    }}
                  >
                    Google
                  </div>
                )}
                {m.caption && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      padding: '8px 10px',
                      background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.7) 100%)',
                      color: '#fff',
                      fontSize: 11,
                      fontStyle: 'italic',
                    }}
                  >
                    {m.caption}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {selected && (
          <div
            role="dialog"
            onClick={() => setSelected(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(14,13,11,0.72)',
              display: 'grid',
              placeItems: 'center',
              zIndex: 1000,
              padding: 24,
              backdropFilter: 'blur(8px)',
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'var(--cream)',
                borderRadius: 18,
                overflow: 'hidden',
                maxWidth: 900,
                width: '100%',
                display: 'grid',
                gridTemplateColumns: '2fr 1fr',
                gap: 0,
              }}
            >
              <div style={{ background: '#000', display: 'grid', placeItems: 'center' }}>
                <img src={selected.url} alt="" style={{ maxWidth: '100%', maxHeight: '80vh', display: 'block' }} />
              </div>
              <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--peach-ink)', textTransform: 'uppercase' }}>
                  {selected.source}
                </div>
                <div className="display" style={{ fontSize: 18, margin: 0 }}>
                  {selected.filename ?? 'Photo'}
                </div>
                <textarea
                  defaultValue={selected.caption ?? ''}
                  placeholder="Caption (optional)"
                  rows={3}
                  onBlur={(e) => onCaption(selected.id, e.target.value)}
                  style={{
                    width: '100%',
                    padding: 10,
                    borderRadius: 10,
                    border: '1px solid var(--line)',
                    fontFamily: 'inherit',
                    fontSize: 13,
                    background: 'var(--card)',
                    resize: 'vertical',
                  }}
                />
                <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                  Uploaded {new Date(selected.created_at).toLocaleDateString()}
                  {selected.width && selected.height && <> · {selected.width} × {selected.height}</>}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                  <a href={selected.url} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
                    <Icon name="arrow-ur" size={12} /> Open
                  </a>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                      if (typeof navigator !== 'undefined' && navigator.clipboard) {
                        navigator.clipboard.writeText(selected.url).catch(() => {});
                      }
                    }}
                  >
                    <Icon name="copy" size={12} /> Copy URL
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ marginLeft: 'auto', color: '#7A2D2D' }}
                    onClick={() => {
                      void onDelete(selected.id);
                      setSelected(null);
                    }}
                  >
                    <Icon name="close" size={12} /> Remove
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashLayout>
  );
}
