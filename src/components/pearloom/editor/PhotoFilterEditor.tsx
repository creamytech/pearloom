'use client';

// ─────────────────────────────────────────────────────────────
// PhotoFilterEditor — a small, tasteful photo filter step for the
// editor PhotoPicker. The host picks an on-brand preset (Warm,
// Letterpress, Film, B&W, Fade) or keeps the original; "Apply"
// bakes the CSS filter onto a canvas, re-encodes, and uploads the
// result through /api/photos/upload, returning the new URL.
//
// v1 scope: preset filters only (no crop / rotate / sliders yet).
// Fails gracefully — if the source can't be drawn to a canvas
// (cross-origin taint), we keep the original and say so.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { Icon } from '../motifs';

export interface FilterPreset {
  id: string;
  label: string;
  /** CSS/canvas filter string. Empty = original. */
  filter: string;
}

// On-brand, restrained. These read as "made", not "Instagram".
export const FILTER_PRESETS: FilterPreset[] = [
  { id: 'none',        label: 'Original',    filter: '' },
  { id: 'warm',        label: 'Warm',        filter: 'saturate(1.12) sepia(0.14) contrast(1.03) brightness(1.02)' },
  { id: 'letterpress', label: 'Letterpress', filter: 'grayscale(0.18) contrast(1.12) brightness(1.02) sepia(0.08)' },
  { id: 'film',        label: 'Film',        filter: 'contrast(1.08) saturate(0.92) sepia(0.2) brightness(1.02)' },
  { id: 'bw',          label: 'B & W',       filter: 'grayscale(1) contrast(1.08)' },
  { id: 'fade',        label: 'Fade',        filter: 'contrast(0.92) brightness(1.06) saturate(0.82)' },
];

export function PhotoFilterEditor({
  url,
  onApplied,
  onCancel,
}: {
  url: string;
  /** Returns the URL to use — the filtered upload, or the original
   *  when the host kept it / applying failed. */
  onApplied: (finalUrl: string) => void;
  onCancel: () => void;
}) {
  const [preset, setPreset] = useState<FilterPreset>(FILTER_PRESETS[0]);
  const [intensity, setIntensity] = useState(1); // 0..1 — filter strength
  const [rotation, setRotation] = useState(0); // 0 | 90 | 180 | 270
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const touched = preset.filter !== '' || rotation !== 0;

  // Probe whether we can draw this source to a canvas (some remote
  // hosts taint it). If not, we still let the host preview but warn
  // that "Apply" will keep the original.
  const [canBake, setCanBake] = useState(true);
  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { if (!cancelled) setCanBake(true); };
    img.onerror = () => { if (!cancelled) setCanBake(false); };
    img.src = url;
    return () => { cancelled = true; };
  }, [url]);

  async function apply() {
    if (busy) return;
    // Nothing changed, or we can't bake → just use the source URL.
    if (!touched || !canBake) {
      onApplied(url);
      return;
    }
    setBusy(true);
    setNote(null);
    try {
      const dataUrl = await bakeFilter(url, preset.filter, intensity, rotation);
      const r = await fetch('/api/photos/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photos: [{
            id: `flt-${Date.now()}`,
            filename: `filtered-${preset.id}.jpg`,
            mimeType: 'image/jpeg',
            base64: dataUrl,
          }],
          source: 'editor',
        }),
      });
      const data = (await r.json().catch(() => null)) as { photos?: Array<{ baseUrl: string }> } | null;
      const baked = data?.photos?.[0]?.baseUrl;
      if (r.ok && baked) {
        onApplied(baked);
      } else {
        setNote('Could not save the filtered photo — using the original.');
        onApplied(url);
      }
    } catch {
      setNote('Could not apply the filter — using the original.');
      onApplied(url);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Edit photo"
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 10001,
        background: 'rgba(14,13,11,0.72)', backdropFilter: 'blur(8px)',
        display: 'grid', placeItems: 'center', padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--pl-chrome-bg)',
          borderRadius: 18,
          width: 'min(640px, 100%)',
          maxHeight: '92vh',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 40px 80px rgba(14,13,11,0.4)',
        }}
      >
        <header style={{ padding: '16px 20px', borderBottom: '1px solid var(--pl-chrome-border)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="display" style={{ fontSize: 20, margin: 0, flex: 1 }}>Add a filter</div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel"
            style={{ width: 30, height: 30, borderRadius: 8, background: 'transparent', border: '1px solid var(--pl-chrome-border)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}
          >
            <Icon name="close" size={13} />
          </button>
        </header>

        <div style={{ padding: 18, overflowY: 'auto' }}>
          <div style={{ borderRadius: 12, overflow: 'hidden', background: '#000', display: 'grid', placeItems: 'center', maxHeight: '44vh' }}>
            {/* Live preview — the filtered layer rides over the
                original at `intensity` opacity so the slider blends
                strength; the whole stack rotates. Baking reproduces
                exactly this on a canvas. */}
            <div style={{ position: 'relative', lineHeight: 0, transform: `rotate(${rotation}deg)`, transition: 'transform 220ms ease' }}>
              <img
                ref={imgRef}
                src={url}
                alt="Preview"
                style={{ maxWidth: '100%', maxHeight: '40vh', objectFit: 'contain', display: 'block' }}
              />
              {preset.filter !== '' && (
                <img
                  src={url}
                  alt=""
                  aria-hidden
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', filter: preset.filter, opacity: intensity }}
                />
              )}
            </div>
          </div>

          {/* Rotate + (when a filter is on) intensity. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 999, border: '1px solid var(--pl-chrome-border)', background: 'transparent', color: 'var(--pl-chrome-text)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}
            >
              <Icon name="rotate" size={13} /> Rotate
            </button>
            {preset.filter !== '' && (
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 160, fontSize: 11.5, color: 'var(--pl-chrome-text-muted, #6F6557)' }}>
                Strength
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(intensity * 100)}
                  onChange={(e) => setIntensity(Number(e.target.value) / 100)}
                  className="pl-native-control"
                  style={{ flex: 1, accentColor: 'var(--peach-ink, #C6703D)' }}
                />
                <span style={{ width: 34, textAlign: 'right' }}>{Math.round(intensity * 100)}%</span>
              </label>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            {FILTER_PRESETS.map((p) => {
              const on = p.id === preset.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPreset(p)}
                  aria-pressed={on}
                  style={{
                    padding: '8px 14px', borderRadius: 999,
                    border: on ? '1.5px solid var(--peach-ink, #C6703D)' : '1px solid var(--pl-chrome-border)',
                    background: on ? 'var(--peach-bg, rgba(198,112,61,0.12))' : 'transparent',
                    color: 'var(--pl-chrome-text)',
                    fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)',
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {!canBake && touched && (
            <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--pl-chrome-text-muted, #6F6557)' }}>
              This photo can&rsquo;t be re-saved with edits (it&rsquo;s hosted elsewhere) — it&rsquo;ll be used as-is.
            </div>
          )}
          {note && (
            <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--peach-ink, #C6703D)' }}>{note}</div>
          )}
        </div>

        <footer style={{ padding: '14px 20px', borderTop: '1px solid var(--pl-chrome-border)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => onApplied(url)}
            disabled={busy}
            style={{ padding: '9px 16px', borderRadius: 999, background: 'transparent', border: '1px solid var(--pl-chrome-border)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)', color: 'var(--pl-chrome-text)' }}
          >
            Use original
          </button>
          <button
            type="button"
            onClick={() => void apply()}
            disabled={busy}
            style={{ padding: '9px 18px', borderRadius: 999, background: 'var(--pl-chrome-text)', color: 'var(--pl-chrome-bg)', border: 'none', fontSize: 12.5, fontWeight: 700, cursor: busy ? 'wait' : 'pointer', fontFamily: 'var(--font-ui)', opacity: busy ? 0.7 : 1 }}
          >
            {busy ? 'Applying…' : touched ? 'Apply edits' : 'Use photo'}
          </button>
        </footer>
      </div>
    </div>
  );
}

/** Bake the filter (at `intensity`) + `rotation` onto a canvas and
 *  return a JPEG data URL. The filtered layer is drawn over the
 *  original at `intensity` alpha — matching the live preview.
 *  Throws if the source taints the canvas. */
async function bakeFilter(src: string, filter: string, intensity: number, rotation: number): Promise<string> {
  const img = await loadImage(src);
  const MAX = 2000;
  const scale = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);
  const rot = ((rotation % 360) + 360) % 360;
  const swap = rot === 90 || rot === 270;

  const canvas = document.createElement('canvas');
  canvas.width = swap ? h : w;
  canvas.height = swap ? w : h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no 2d context');

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rot * Math.PI) / 180);
  // Base — the unfiltered image.
  ctx.filter = 'none';
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  // Filtered layer over the base at `intensity`.
  if (filter && intensity > 0) {
    ctx.globalAlpha = Math.min(1, Math.max(0, intensity));
    ctx.filter = filter;
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
  }
  ctx.restore();
  return canvas.toDataURL('image/jpeg', 0.9);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image load failed'));
    img.src = src;
  });
}

export default PhotoFilterEditor;
