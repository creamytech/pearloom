'use client';

/* eslint-disable no-restricted-syntax */
/* PhotoUploadSlot — reusable drag-drop + click-to-pick + remove
   tile. Used for hero cover photo (HeroPanel) and per-chapter
   story photos (StoryPanel). Posts to /api/photos/upload and
   returns the resolved baseUrl via onChange.

   Renders identical visual + UX everywhere — the only difference
   between mount sites is the aspectRatio prop. */

import { useRef, useState } from 'react';

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
}

export function PhotoUploadSlot({ url, onChange, aspectRatio = '16/9', hint, size = 'md' }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function uploadFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setErr('That file isn’t an image.');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setErr('Image is over the 12 MB upload limit.');
      return;
    }
    setBusy(true); setErr(null);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Couldn’t read the file.'));
        reader.readAsDataURL(file);
      });
      const id = `up-${Date.now().toString(36)}`;
      const res = await fetch('/api/photos/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photos: [{
            id, filename: file.name, mimeType: file.type, base64,
            capturedAt: new Date(file.lastModified || Date.now()).toISOString(),
          }],
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      const data = await res.json() as { photos?: { baseUrl?: string }[] };
      const baseUrl = data.photos?.[0]?.baseUrl;
      if (!baseUrl) throw new Error('Upload finished but no URL was returned.');
      onChange(baseUrl);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    void uploadFile(files[0]);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    onFiles(e.dataTransfer.files);
  }

  const isSmall = size === 'sm';

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
          onChange={(e) => onFiles(e.target.files)}
          style={{ display: 'none' }}
        />
        {!url && !busy && (
          <div style={{
            position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
            color: 'var(--ink-muted)', fontSize: isSmall ? 11 : 12.5, textAlign: 'center', padding: 12,
          }}>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>{isSmall ? 'Drop photo' : 'Drop a photo here'}</div>
              {!isSmall && <div style={{ fontSize: 11.5 }}>or click to pick from your device</div>}
            </div>
          </div>
        )}
        {busy && (
          <div style={{
            position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
            background: 'rgba(245,239,226,0.85)', borderRadius: isSmall ? 8 : 10,
            fontSize: 11.5, fontWeight: 600, color: 'var(--peach-ink)',
          }}>
            Threading…
          </div>
        )}
        {url && !busy && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(''); }}
            aria-label="Remove photo"
            title="Remove photo"
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
      {hint && !url && !err && (
        <div style={{ fontSize: 10.5, color: 'var(--ink-muted)' }}>{hint}</div>
      )}
      {err && (
        <div style={{ padding: '5px 9px', borderRadius: 6, background: 'rgba(122,45,45,0.08)', fontSize: 11, color: '#7A2D2D' }}>
          {err}
        </div>
      )}
    </div>
  );
}
