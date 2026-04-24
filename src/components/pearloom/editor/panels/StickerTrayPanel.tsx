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

import { useState } from 'react';
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
  const [status, setStatus] = useState<'idle' | 'running' | 'error'>('idle');
  const [err, setErr] = useState<string | null>(null);

  const stickers = manifest.stickers ?? [];

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
        body: JSON.stringify({ siteId, occasion, paletteHex, venue, vibe, hint: hint.trim() || undefined }),
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

  return (
    <PanelSection
      label="Stickers"
      hint="Ask Pear to draw a custom sticker. It'll drop onto the hero — drag it anywhere, Shift-drag to scale, Alt-drag to rotate."
    >
      <Field label="Describe your sticker (optional)">
        <TextInput
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          placeholder="e.g. champagne coupe in gold, loose ink lines"
        />
      </Field>
      <button
        type="button"
        className="btn btn-primary btn-sm"
        onClick={generate}
        disabled={status === 'running'}
        style={{ width: '100%', marginTop: 6, justifyContent: 'center' }}
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
