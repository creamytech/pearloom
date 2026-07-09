'use client';

// ─────────────────────────────────────────────────────────────
// PhotoFilterEditor — the host's photo edit step in the PhotoPicker.
// Pick an on-brand filter preset (Warm, Letterpress, Film, B&W,
// Fade), dial its Strength, Rotate in 90° steps, and Crop to an
// aspect. The live preview is a canvas rendered by the SAME
// bakeToCanvas the export uses, so what you see is what you get.
// "Apply edits" re-encodes + uploads via /api/photos/upload.
//
// Fails gracefully — if the source taints the canvas on export, we
// keep the original and say so.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { Icon } from '../motifs';
import {
  FILTER_PRESETS, bakeToCanvas, loadImage, isFullCrop, FULL_CROP,
  type FilterPreset, type CropRect,
} from '@/lib/photo-filters';

export function PhotoFilterEditor({
  url,
  onApplied,
  onCancel,
}: {
  url: string;
  onApplied: (finalUrl: string) => void;
  onCancel: () => void;
}) {
  const [preset, setPreset] = useState<FilterPreset>(FILTER_PRESETS[0]);
  const [intensity, setIntensity] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [crop, setCrop] = useState<CropRect | null>(null);
  const [mode, setMode] = useState<'edit' | 'crop'>('edit');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const previewRef = useRef<HTMLCanvasElement | null>(null);

  const touched = preset.filter !== '' || rotation !== 0 || !isFullCrop(crop);

  // Load the source once for the canvas preview + bake.
  useEffect(() => {
    let cancelled = false;
    loadImage(url)
      .then((el) => { if (!cancelled) setImg(el); })
      .catch(() => { if (!cancelled) setLoadFailed(true); });
    return () => { cancelled = true; };
  }, [url]);

  // Render the live preview — same pipeline as the export.
  useEffect(() => {
    if (mode !== 'edit' || !img || !previewRef.current) return;
    try {
      bakeToCanvas(img, { filter: preset.filter, intensity, rotation, crop, maxEdge: 1000 }, previewRef.current);
    } catch { /* tainted source still previews via the crop stage img */ }
  }, [img, preset, intensity, rotation, crop, mode]);

  async function apply() {
    if (busy) return;
    if (!touched || !img) { onApplied(url); return; }
    setBusy(true);
    setNote(null);
    try {
      const canvas = bakeToCanvas(img, { filter: preset.filter, intensity, rotation, crop });
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9); // throws if tainted
      const r = await fetch('/api/photos/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photos: [{ id: `flt-${Date.now()}`, filename: `edited-${preset.id}.jpg`, mimeType: 'image/jpeg', base64: dataUrl }],
          source: 'editor',
        }),
      });
      const data = (await r.json().catch(() => null)) as { photos?: Array<{ baseUrl: string }> } | null;
      const baked = data?.photos?.[0]?.baseUrl;
      if (r.ok && baked) onApplied(baked);
      else { setNote('Could not save the edited photo, using the original.'); onApplied(url); }
    } catch {
      setNote('This photo can’t be re-saved with edits, using the original.');
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
      style={{ position: 'fixed', inset: 0, zIndex: 10001, background: 'rgba(14,13,11,0.72)', backdropFilter: 'blur(8px)', display: 'grid', placeItems: 'center', padding: 24 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'var(--pl-chrome-bg)', borderRadius: 18, width: 'min(640px, 100%)', maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 40px 80px rgba(14,13,11,0.4)' }}
      >
        <header style={{ padding: '16px 20px', borderBottom: '1px solid var(--pl-chrome-border)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="display" style={{ fontSize: 20, margin: 0, flex: 1 }}>
            {mode === 'crop' ? 'Crop' : 'Edit photo'}
          </div>
          <button type="button" onClick={onCancel} aria-label="Cancel" style={{ width: 30, height: 30, borderRadius: 8, background: 'transparent', border: '1px solid var(--pl-chrome-border)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
            <Icon name="close" size={13} />
          </button>
        </header>

        {mode === 'crop' && img ? (
          <CropStage
            img={img}
            onDone={(c) => { setCrop(c); setMode('edit'); }}
            onCancel={() => setMode('edit')}
          />
        ) : (
          <>
            <div style={{ padding: 18, overflowY: 'auto' }}>
              <div style={{ borderRadius: 12, overflow: 'hidden', background: '#000', display: 'grid', placeItems: 'center', minHeight: 200, maxHeight: '44vh' }}>
                {loadFailed ? (
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, padding: 24 }}>Couldn&rsquo;t load this photo.</div>
                ) : (
                  <canvas ref={previewRef} style={{ maxWidth: '100%', maxHeight: '44vh', display: 'block' }} />
                )}
              </div>

              {/* Crop + Rotate + (when a filter is on) Strength. */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
                <button type="button" onClick={() => setMode('crop')} disabled={!img} style={toolBtn}>
                  <Icon name="layout" size={13} /> {isFullCrop(crop) ? 'Crop' : 'Cropped ✓'}
                </button>
                <button type="button" onClick={() => setRotation((r) => (r + 90) % 360)} disabled={!img} style={toolBtn}>
                  <Icon name="rotate" size={13} /> Rotate
                </button>
                {!isFullCrop(crop) && (
                  <button type="button" onClick={() => setCrop(null)} style={{ ...toolBtn, border: 'none' }}>
                    Reset crop
                  </button>
                )}
                {preset.filter !== '' && (
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 150, fontSize: 11.5, color: 'var(--pl-chrome-text-muted, #6F6557)' }}>
                    Strength
                    <input type="range" min={0} max={100} value={Math.round(intensity * 100)} onChange={(e) => setIntensity(Number(e.target.value) / 100)} className="pl-native-control" style={{ flex: 1, accentColor: 'var(--peach-ink, #C6703D)' }} />
                    <span style={{ width: 34, textAlign: 'right' }}>{Math.round(intensity * 100)}%</span>
                  </label>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                {FILTER_PRESETS.map((p) => {
                  const on = p.id === preset.id;
                  return (
                    <button key={p.id} type="button" onClick={() => setPreset(p)} aria-pressed={on}
                      style={{ padding: '8px 14px', borderRadius: 999, border: on ? '1.5px solid var(--peach-ink, #C6703D)' : '1px solid var(--pl-chrome-border)', background: on ? 'var(--peach-bg, rgba(198,112,61,0.12))' : 'transparent', color: 'var(--pl-chrome-text)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
                      {p.label}
                    </button>
                  );
                })}
              </div>

              {note && <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--peach-ink, #C6703D)' }}>{note}</div>}
            </div>

            <footer style={{ padding: '14px 20px', borderTop: '1px solid var(--pl-chrome-border)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => onApplied(url)} disabled={busy} style={{ padding: '9px 16px', borderRadius: 999, background: 'transparent', border: '1px solid var(--pl-chrome-border)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)', color: 'var(--pl-chrome-text)' }}>
                Use original
              </button>
              <button type="button" onClick={() => void apply()} disabled={busy} style={{ padding: '9px 18px', borderRadius: 999, background: 'var(--pl-chrome-text)', color: 'var(--pl-chrome-bg)', border: 'none', fontSize: 12.5, fontWeight: 700, cursor: busy ? 'wait' : 'pointer', fontFamily: 'var(--font-ui)', opacity: busy ? 0.7 : 1 }}>
                {busy ? 'Applying…' : touched ? 'Apply edits' : 'Use photo'}
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}

const toolBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '7px 13px', borderRadius: 999,
  border: '1px solid var(--pl-chrome-border)', background: 'transparent',
  color: 'var(--pl-chrome-text)', fontSize: 12.5, fontWeight: 600,
  cursor: 'pointer', fontFamily: 'var(--font-ui)',
};

// ── CropStage ───────────────────────────────────────────────────
// Aspect presets + zoom + drag-to-reposition. Produces a normalized
// source CropRect. The container is sized to the image's aspect so
// normalized coords map straight to percentages.
const ASPECTS: Array<{ id: string; label: string; a: number | null }> = [
  { id: 'free', label: 'Full',   a: null },
  { id: '1',    label: '1:1',    a: 1 },
  { id: '45',   label: '4:5',    a: 4 / 5 },
  { id: '32',   label: '3:2',    a: 3 / 2 },
  { id: '169',  label: '16:9',   a: 16 / 9 },
];

function computeCrop(w0: number, h0: number, a: number, zoom: number, cx: number, cy: number): CropRect {
  const imgA = w0 / h0;
  let cw: number; let ch: number;
  if (a >= imgA) { cw = w0; ch = w0 / a; } else { ch = h0; cw = h0 * a; }
  cw *= zoom; ch *= zoom;
  const nw = cw / w0; const nh = ch / h0;
  const nx = Math.min(Math.max(cx - nw / 2, 0), 1 - nw);
  const ny = Math.min(Math.max(cy - nh / 2, 0), 1 - nh);
  return { x: nx, y: ny, w: nw, h: nh };
}

function CropStage({ img, onDone, onCancel }: { img: HTMLImageElement; onDone: (c: CropRect | null) => void; onCancel: () => void }) {
  const [aspectId, setAspectId] = useState('free');
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState({ cx: 0.5, cy: 0.5 });
  const boxRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);

  const aspect = ASPECTS.find((x) => x.id === aspectId) ?? ASPECTS[0];
  const rect = aspect.a == null ? FULL_CROP : computeCrop(img.naturalWidth, img.naturalHeight, aspect.a, zoom, center.cx, center.cy);

  function onPointerDown(e: React.PointerEvent) {
    if (aspect.a == null) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, cx: center.cx, cy: center.cy };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current || !boxRef.current) return;
    const b = boxRef.current.getBoundingClientRect();
    const dx = (e.clientX - drag.current.x) / b.width;
    const dy = (e.clientY - drag.current.y) / b.height;
    setCenter({ cx: drag.current.cx + dx, cy: drag.current.cy + dy });
  }
  function onPointerUp() { drag.current = null; }

  return (
    <>
      <div style={{ padding: 18, overflowY: 'auto' }}>
        <div
          ref={boxRef}
          style={{
            position: 'relative', width: '100%', aspectRatio: `${img.naturalWidth} / ${img.naturalHeight}`,
            maxHeight: '50vh', margin: '0 auto', borderRadius: 8, overflow: 'hidden',
            background: `#000 center/contain no-repeat url("${img.src.replace(/"/g, '%22')}")`,
            touchAction: 'none',
          }}
        >
          {aspect.a != null && (
            <div
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              role="button"
              aria-label="Drag to reposition crop"
              style={{
                position: 'absolute',
                left: `${rect.x * 100}%`, top: `${rect.y * 100}%`,
                width: `${rect.w * 100}%`, height: `${rect.h * 100}%`,
                boxShadow: '0 0 0 9999px rgba(14,13,11,0.55)',
                border: '1.5px solid rgba(255,255,255,0.92)',
                cursor: 'move', boxSizing: 'border-box',
              }}
            />
          )}
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 14 }}>
          {ASPECTS.map((x) => {
            const on = x.id === aspectId;
            return (
              <button key={x.id} type="button" onClick={() => { setAspectId(x.id); setZoom(1); setCenter({ cx: 0.5, cy: 0.5 }); }} aria-pressed={on}
                style={{ padding: '7px 13px', borderRadius: 999, border: on ? '1.5px solid var(--peach-ink, #C6703D)' : '1px solid var(--pl-chrome-border)', background: on ? 'var(--peach-bg, rgba(198,112,61,0.12))' : 'transparent', color: 'var(--pl-chrome-text)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
                {x.label}
              </button>
            );
          })}
        </div>

        {aspect.a != null && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, fontSize: 11.5, color: 'var(--pl-chrome-text-muted, #6F6557)' }}>
            Zoom
            <input type="range" min={30} max={100} value={Math.round(zoom * 100)} onChange={(e) => setZoom(Number(e.target.value) / 100)} className="pl-native-control" style={{ flex: 1, accentColor: 'var(--peach-ink, #C6703D)' }} />
          </label>
        )}
      </div>

      <footer style={{ padding: '14px 20px', borderTop: '1px solid var(--pl-chrome-border)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancel} style={{ padding: '9px 16px', borderRadius: 999, background: 'transparent', border: '1px solid var(--pl-chrome-border)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)', color: 'var(--pl-chrome-text)' }}>
          Cancel
        </button>
        <button type="button" onClick={() => onDone(aspect.a == null ? null : rect)} style={{ padding: '9px 18px', borderRadius: 999, background: 'var(--pl-chrome-text)', color: 'var(--pl-chrome-bg)', border: 'none', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
          Done
        </button>
      </footer>
    </>
  );
}

export default PhotoFilterEditor;
