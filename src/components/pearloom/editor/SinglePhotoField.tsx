'use client';

// ─────────────────────────────────────────────────────────────
// SinglePhotoField — minimal photo picker for sections that just
// need ONE thumbnail (schedule events, registry entries) rather
// than the full carousel HotelPhotoStrip ships. Same upload
// pipeline (POST /api/photos/upload) so the URLs round-trip
// through R2 and the canvas reads them like any other photo.
//
// Modes:
//   • Empty   — dashed peach "Add photo" tile
//   • Filled  — thumbnail with hover × to remove + replace overlay
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Icon } from '../motifs';

interface Props {
  value?: string;
  onChange: (next: string | undefined) => void;
  /** Tile size — 96 fits the modal editor pane width. */
  size?: number;
}

export function SinglePhotoField({ value, onChange, size = 96 }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
        reader.onerror = () => reject(new Error('Could not read file'));
        reader.readAsDataURL(file);
      });
      const res = await fetch('/api/photos/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photos: [{
            id: `photo-${Date.now()}`,
            filename: file.name || 'photo.jpg',
            mimeType: file.type || 'image/jpeg',
            base64,
            capturedAt: new Date(file.lastModified || Date.now()).toISOString(),
          }],
        }),
      });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      const data = (await res.json()) as { photos?: Array<{ baseUrl?: string }> };
      const url = data.photos?.[0]?.baseUrl;
      if (!url) throw new Error('No URL returned');
      onChange(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
      setTimeout(() => setError(null), 2400);
    } finally {
      setUploading(false);
    }
  }

  if (value) {
    return (
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div
          style={{
            width: size,
            height: Math.round(size * 0.83),
            borderRadius: 10,
            background: `url(${value}) center/cover no-repeat var(--cream-2)`,
            border: '1px solid var(--line-soft)',
            position: 'relative',
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={() => onChange(undefined)}
            aria-label="Remove photo"
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              width: 22,
              height: 22,
              borderRadius: 999,
              background: 'rgba(14,13,11,0.78)',
              color: '#FFFFFF',
              border: 'none',
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center',
              fontSize: 12,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 12px',
            borderRadius: 999,
            border: '1px solid var(--line)',
            background: 'transparent',
            color: 'var(--ink-soft)',
            fontSize: 11.5,
            fontWeight: 700,
            cursor: uploading ? 'wait' : 'pointer',
            fontFamily: 'var(--font-ui)',
            opacity: uploading ? 0.6 : 1,
            alignSelf: 'center',
          }}
        >
          <Icon name="upload" size={11} />
          {uploading ? 'Uploading…' : 'Replace'}
          <input
            type="file"
            accept="image/*"
            hidden
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
              e.target.value = '';
            }}
          />
        </label>
        {error && (
          <span style={{ fontSize: 11, color: 'var(--plum-ink, #7A2D2D)', alignSelf: 'center' }}>{error}</span>
        )}
      </div>
    );
  }

  return (
    <label
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        width: size,
        height: Math.round(size * 0.83),
        borderRadius: 10,
        background: 'var(--cream-2, #F5EFE2)',
        border: '1.5px dashed var(--peach-ink, #C6703D)',
        color: 'var(--peach-ink, #C6703D)',
        cursor: uploading ? 'wait' : 'pointer',
        fontSize: 11,
        fontWeight: 700,
        fontFamily: 'var(--font-ui)',
        opacity: uploading ? 0.6 : 1,
      }}
    >
      <Icon name={uploading ? 'sparkles' : 'plus'} size={14} />
      <span>{uploading ? 'Uploading…' : 'Add photo'}</span>
      <input
        type="file"
        accept="image/*"
        hidden
        disabled={uploading}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
          e.target.value = '';
        }}
      />
      {error && (
        <div style={{ fontSize: 9.5, color: 'var(--plum-ink, #7A2D2D)', marginTop: 2 }}>{error}</div>
      )}
    </label>
  );
}
