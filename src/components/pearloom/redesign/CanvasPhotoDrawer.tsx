'use client';

// ─────────────────────────────────────────────────────────────
// CanvasPhotoDrawer — the v2 editor's "press a square → your gallery
// as a tray" bottom drawer (handoff-v2 site-renderer/app.jsx
// PhotoPicker). Opened by clicking any photo slot on the editor
// canvas. Lists the host's real library — every photo already on the
// site (collectPhotoPool) unioned with their uploaded media
// (/api/user-media) — plus an Upload affordance (/api/photos/upload).
// Picking drops the URL into the clicked slot; the slot owner writes
// it to the manifest. No fabricated thumbnails.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import type { StoryManifest } from '@/types';
import { collectPhotoPool } from '../editor/panels/_photo-upload';
import { Icon } from '../motifs';

export interface PhotoSlot {
  /** Which manifest photo the click targets. */
  kind: 'cover' | 'gallery' | 'chapter';
  index?: number;
  /** Human label for the drawer header ("the cover", "this tile"). */
  label?: string;
  /** Current URL in the slot, if any. */
  current?: string | null;
}

export function CanvasPhotoDrawer({
  slot,
  manifest,
  onPick,
  onClear,
  onClose,
}: {
  slot: PhotoSlot | null;
  manifest: StoryManifest;
  onPick: (url: string) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const open = slot != null;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [render, setRender] = useState(open);
  const [vis, setVis] = useState(false);
  const [library, setLibrary] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // Mount/enter/exit transition (matches the zip's .28s slide).
  useEffect(() => {
    if (open) {
      setRender(true);
      const t = setTimeout(() => setVis(true), 20);
      return () => clearTimeout(t);
    }
    setVis(false);
    const t = setTimeout(() => setRender(false), 280);
    return () => clearTimeout(t);
  }, [open]);

  // Library = every photo already on the site (instant) unioned with
  // the host's uploaded media (fetched once per open).
  useEffect(() => {
    if (!open) return;
    const pool = collectPhotoPool(manifest);
    setLibrary(pool);
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/user-media', { cache: 'no-store' });
        if (!r.ok) return;
        const d = await r.json();
        const urls: string[] = Array.isArray(d?.media)
          ? d.media.map((m: { url?: string }) => m?.url).filter((u: unknown): u is string => typeof u === 'string' && !!u)
          : [];
        if (cancelled) return;
        setLibrary((prev) => {
          const seen = new Set(prev);
          return [...prev, ...urls.filter((u) => !seen.has(u))];
        });
      } catch { /* library stays the manifest pool */ }
    })();
    return () => { cancelled = true; };
  }, [open, manifest]);

  if (!render || !slot) return null;

  const current = slot.current ?? null;

  async function uploadFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const file = files[0];
      const base64 = await new Promise<string>((res, rej) => {
        const fr = new FileReader();
        fr.onload = () => res(String(fr.result));
        fr.onerror = rej;
        fr.readAsDataURL(file);
      });
      const r = await fetch('/api/photos/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photos: [{ id: `up-${Date.now()}`, filename: file.name, mimeType: file.type, base64, capturedAt: new Date().toISOString() }],
          source: 'editor',
        }),
      });
      const d = await r.json();
      const url = d?.photos?.[0]?.baseUrl;
      if (typeof url === 'string' && url) {
        setLibrary((prev) => (prev.includes(url) ? prev : [url, ...prev]));
        onPick(url);
      }
    } catch { /* upload failed — silent; the drawer stays open */ }
    finally { setUploading(false); }
  }

  const trigger = () => inputRef.current?.click();
  const headLabel = slot.label ? `Choose a photo for ${slot.label}` : 'Choose a photo';

  return (
    <div
      onClick={onClose}
      data-pl-skip
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        background: 'rgba(20,14,8,0.18)',
        opacity: vis ? 1 : 0, transition: 'opacity .26s ease',
        pointerEvents: vis ? 'auto' : 'none',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxHeight: '56vh', display: 'flex', flexDirection: 'column',
          background: 'var(--cream-2, #FBF7EE)', borderTop: '1px solid var(--line, #E2D9C3)',
          borderRadius: '18px 18px 0 0', boxShadow: '0 -24px 60px -24px rgba(20,14,8,0.45)',
          transform: vis ? 'translateY(0)' : 'translateY(101%)',
          transition: 'transform .28s cubic-bezier(.22,.61,.36,1)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', padding: '9px 0 2px' }}>
          <span aria-hidden style={{ width: 38, height: 4, borderRadius: 999, background: 'var(--line, #D8CDB4)' }} />
        </div>
        <div style={{ padding: '6px 22px 12px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div className="display" style={{ fontSize: 19, color: 'var(--ink)', lineHeight: 1.1 }}>{headLabel}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 3, lineHeight: 1.4 }}>
              Tap a photo to drop it into this spot, or upload a new one.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button type="button" onClick={trigger} disabled={uploading} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 999, border: 'none', background: 'var(--pl-olive, #5C6B3F)', color: 'var(--cream, #FBF7EE)', fontSize: 12.5, fontWeight: 700, cursor: uploading ? 'wait' : 'pointer' }}>
              <Icon name="plus" size={13} /> {uploading ? 'Uploading…' : 'Upload'}
            </button>
            <button type="button" onClick={onClose} title="Close" style={{ width: 34, height: 34, borderRadius: 999, border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink-muted)', cursor: 'pointer', fontSize: 14, flexShrink: 0 }}>✕</button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 22px 22px' }}>
          <input ref={inputRef} type="file" accept="image/*" onChange={(e) => { void uploadFiles(e.target.files); e.target.value = ''; }} style={{ display: 'none' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(104px, 1fr))', gap: 10 }}>
            <button type="button" onClick={trigger} style={{ aspectRatio: '1', borderRadius: 12, border: '1.5px dashed var(--gold, #C8B98C)', background: 'rgba(193,154,75,0.07)', color: 'var(--peach-ink, #8C6E3D)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <span style={{ fontSize: 24, lineHeight: 1, fontWeight: 300 }}>+</span>
              <span style={{ fontSize: 11, fontWeight: 700 }}>Add photo</span>
            </button>
            {current && (
              <div style={{ position: 'relative', aspectRatio: '1', borderRadius: 12, overflow: 'hidden', border: '2px solid var(--pl-olive, #5C6B3F)' }}>                <img src={current} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                <span style={{ position: 'absolute', top: 6, left: 6, fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fff', background: 'rgba(92,107,63,0.92)', padding: '2px 7px', borderRadius: 999 }}>In this spot</span>
                <button type="button" onClick={onClear} title="Remove from this spot" style={{ position: 'absolute', bottom: 6, right: 6, padding: '4px 9px', borderRadius: 7, border: 'none', background: 'rgba(20,14,8,0.66)', color: '#fff', fontSize: 10.5, fontWeight: 700, cursor: 'pointer' }}>Remove</button>
              </div>
            )}
            {library.filter((u) => u !== current).map((url) => (
              <button key={url} type="button" onClick={() => onPick(url)} style={{ position: 'relative', aspectRatio: '1', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--line)', cursor: 'pointer', padding: 0 }}>                <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </button>
            ))}
          </div>
          {library.length === 0 && (
            <div style={{ textAlign: 'center', padding: '22px 0 4px', fontSize: 12.5, color: 'var(--ink-muted)', lineHeight: 1.5 }}>
              Nothing yet — tap Add photo to begin your library.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
