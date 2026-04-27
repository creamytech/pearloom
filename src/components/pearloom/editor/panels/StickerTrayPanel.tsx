'use client';

/* ========================================================================
   StickerTrayPanel — panel inside the editor for generating custom
   AI stickers and adding them to the hero. Users can also provide a
   free-text hint so Pear draws exactly the sticker they want
   ("champagne coupe in gold, loose ink lines").

   Clicking "Generate" adds the sticker to `manifest.stickers[]` with
   a default anchor of the hero and a center position. Users drag it
   from there.
   ======================================================================== */

import { useRef, useState } from 'react';
import type { StoryManifest } from '@/types';
import { Field, PanelSection, TextInput } from '../atoms';

export function StickerTrayPanel({
  manifest,
  onChange,
}: {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}) {
  const [hint, setHint] = useState('');
  const [referenceImage, setReferenceImage] = useState<{ base64: string; mimeType: string; previewUrl: string } | null>(null);
  const [status, setStatus] = useState<'idle' | 'running' | 'error'>('idle');
  const [err, setErr] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stickers = manifest.stickers ?? [];

  function pickReferenceFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setErr('Reference must be an image.');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setErr('Reference image must be under 4 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip data:image/...;base64, prefix
      const comma = result.indexOf(',');
      const base64 = comma >= 0 ? result.slice(comma + 1) : result;
      setReferenceImage({ base64, mimeType: file.type, previewUrl: result });
      setErr(null);
    };
    reader.readAsDataURL(file);
  }

  async function generate() {
    setStatus('running');
    setErr(null);
    try {
      const occasion = (manifest as unknown as { occasion?: string }).occasion ?? 'wedding';
      const theme = (manifest as unknown as { theme?: { colors?: Record<string, string> } }).theme?.colors;
      const paletteHex = theme
        ? ([theme.background, theme.accent, theme.accentLight, theme.foreground, theme.muted].filter(Boolean) as string[])
        : undefined;
      const siteId = (manifest as unknown as { subdomain?: string }).subdomain ?? 'preview';
      const venue = manifest.logistics?.venue ?? '';
      const vibe = (manifest as unknown as { vibeString?: string }).vibeString ?? '';

      const res = await fetch('/api/decor/sticker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId, occasion, paletteHex, venue, vibe,
          hint: hint.trim() || undefined,
          referenceImage: referenceImage
            ? { base64: referenceImage.base64, mimeType: referenceImage.mimeType }
            : undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? String(res.status));
      }
      const data = (await res.json()) as { url?: string };
      if (!data.url) throw new Error('No sticker URL returned');

      // Place the new sticker over the hero at ~18% from top-right.
      const newSticker = {
        id: `sticker-${Date.now()}`,
        url: data.url,
        blockId: 'hero',
        x: 80,
        y: 25,
        rotation: -6,
        scale: 1,
      };
      onChange({
        ...manifest,
        stickers: [...(manifest.stickers ?? []), newSticker],
      } as StoryManifest);
      setHint('');
      setStatus('idle');
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Sticker failed');
      setStatus('error');
    }
  }

  function removeSticker(id: string) {
    onChange({
      ...manifest,
      stickers: (manifest.stickers ?? []).filter((s) => s.id !== id),
    } as StoryManifest);
  }

  function addTextSticker() {
    const id = `text-${Date.now().toString(36)}`;
    onChange({
      ...manifest,
      stickers: [
        ...(manifest.stickers ?? []),
        {
          id,
          type: 'text',
          text: 'Save the date',
          fontFamily: 'display',
          fontSize: 36,
          fontWeight: 600,
          italic: true,
          x: 50,
          y: 30,
          rotation: -4,
          scale: 1,
          opacity: 1,
          blockId: 'hero',
        },
      ],
    } as StoryManifest);
  }

  return (
    <PanelSection
      label="Stickers"
      hint="Ask Pear to draw a custom sticker. It'll drop onto the hero — drag it anywhere, Shift-drag to scale, Alt-drag to rotate."
    >
      {/* Free-form text sticker — Pearloom's contained answer to
          Wix-style free positioning. Drops a draggable text overlay
          onto the hero that the user can move, rotate, scale, edit. */}
      <button
        type="button"
        onClick={addTextSticker}
        style={{
          width: '100%',
          padding: '10px 14px',
          marginBottom: 14,
          borderRadius: 10,
          border: '1px dashed var(--peach-ink, #C6703D)',
          background: 'var(--peach-bg, #FCE6D7)',
          color: 'var(--peach-ink, #C6703D)',
          fontSize: 12.5,
          fontWeight: 700,
          fontFamily: 'var(--font-ui)',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          letterSpacing: '0.04em',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 7V4h16v3M9 20h6M12 5v15" />
        </svg>
        Add a text overlay
      </button>

      <Field label="Describe your sticker (optional)">
        <TextInput
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          placeholder="e.g. champagne coupe in gold, loose ink lines"
        />
      </Field>

      {/* Match-this reference image — drop in an existing piece of
          decor and gpt-image-2 will match its style + line weight. */}
      <div style={{ marginTop: 10 }}>
        <div
          style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'var(--ink-muted)',
            marginBottom: 6,
          }}
        >
          Match the style of an existing image (optional)
        </div>
        {referenceImage ? (
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: 8, borderRadius: 10,
              border: '1px solid var(--line-soft)',
              background: 'var(--cream-2)',
            }}
          >
            <div
              style={{
                width: 40, height: 40, flexShrink: 0,
                borderRadius: 6,
                background: `url(${referenceImage.previewUrl}) center/contain no-repeat var(--cream)`,
                border: '1px solid var(--line-soft)',
              }}
            />
            <div style={{ flex: 1, minWidth: 0, fontSize: 12, color: 'var(--ink-soft)' }}>
              Pear will match this style.
            </div>
            <button
              type="button"
              onClick={() => setReferenceImage(null)}
              style={{
                border: 'none', background: 'transparent',
                color: 'var(--ink-muted)', fontSize: 14, cursor: 'pointer',
                padding: 4,
              }}
              aria-label="Remove reference image"
            >
              ×
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: '100%', padding: '10px 14px',
              borderRadius: 10,
              border: '1px dashed var(--line)',
              background: 'transparent',
              color: 'var(--ink-soft)',
              fontSize: 12.5, cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            + Drop a reference image
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) pickReferenceFile(f);
            // Reset so picking the same file again still fires onChange.
            e.target.value = '';
          }}
        />
      </div>

      <button
        type="button"
        className="btn btn-primary btn-sm"
        onClick={generate}
        disabled={status === 'running'}
        style={{ width: '100%', marginTop: 10, justifyContent: 'center' }}
      >
        {status === 'running' ? 'Drafting your sticker…' : 'Draft a sticker'}
      </button>
      {err && (
        <div style={{ marginTop: 8, fontSize: 12, color: '#7A2D2D' }}>{err}</div>
      )}

      {stickers.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ink-muted)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>
            On this site ({stickers.length})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {stickers.map((s) => (
              <div
                key={s.id}
                style={{
                  position: 'relative',
                  aspectRatio: '1/1',
                  borderRadius: 10,
                  border: '1px solid var(--line-soft)',
                  background: `url(${s.url}) center/contain no-repeat var(--cream-2)`,
                }}
              >
                <button
                  type="button"
                  onClick={() => removeSticker(s.id)}
                  aria-label="Remove sticker"
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    border: 'none',
                    background: 'rgba(14,13,11,0.72)',
                    color: '#fff',
                    fontSize: 13,
                    lineHeight: 1,
                    cursor: 'pointer',
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </PanelSection>
  );
}
