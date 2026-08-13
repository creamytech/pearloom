'use client';

// ─────────────────────────────────────────────────────────────
// AvatarCropModal — seat the face (ONBOARDING-PLAN O1).
//
// A picked photo lands in a circular frame; dragging moves the
// image inside it (the editor's Reframe mechanics on a round
// mask). Save crops the visible square CLIENT-SIDE via canvas —
// which also strips EXIF (GPS included) before the photo ever
// leaves the device — and hands the blob up for upload.
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from 'react';

const FRAME = 240; // CSS px

export function AvatarCropModal({
  file, busy = false, onCancel, onSave,
}: {
  file: File;
  busy?: boolean;
  onCancel: () => void;
  onSave: (blob: Blob) => void;
}) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const drag = useRef<{ sx: number; sy: number; px: number; py: number; overX: number; overY: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const img = imgRef.current;
    if (!img?.naturalWidth) return;
    const s = Math.max(FRAME / img.naturalWidth, FRAME / img.naturalHeight);
    drag.current = {
      sx: e.clientX, sy: e.clientY, px: pos.x, py: pos.y,
      overX: img.naturalWidth * s - FRAME,
      overY: img.naturalHeight * s - FRAME,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    setPos({
      x: d.overX > 1 ? Math.max(0, Math.min(100, d.px - ((e.clientX - d.sx) / d.overX) * 100)) : d.px,
      y: d.overY > 1 ? Math.max(0, Math.min(100, d.py - ((e.clientY - d.sy) / d.overY) * 100)) : d.py,
    });
  };
  const onPointerUp = () => { drag.current = null; };

  function save() {
    const img = imgRef.current;
    if (!img?.naturalWidth || busy) return;
    /* The visible square of a cover-fit image: side = min(nw, nh)
       scaled; its origin walks the overflow by the position %. */
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - side) * (pos.x / 100);
    const sy = (img.naturalHeight - side) * (pos.y / 100);
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, sx, sy, side, side, 0, 0, 512, 512);
    canvas.toBlob((blob) => { if (blob) onSave(blob); }, 'image/jpeg', 0.92);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Seat your photo"
      onClick={onCancel}
      className="pl-modal-veil"
      style={{
        position: 'fixed', inset: 0, zIndex: 260,
        background: 'rgba(20,14,8,0.55)',
        WebkitBackdropFilter: 'blur(6px)', backdropFilter: 'blur(6px)',
        display: 'grid', placeItems: 'center', padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="pl-modal-card"
        style={{
          background: 'var(--card, #FBF7EE)',
          border: '1px solid var(--line, #D8CFB8)',
          borderRadius: 16, padding: '22px 24px 18px',
          boxShadow: '0 30px 80px -24px rgba(14,13,11,0.55)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
          maxWidth: 'calc(100vw - 40px)',
        }}
      >
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-muted, #7A6F5C)' }}>
          Drag to seat your photo
        </div>
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{
            width: FRAME, height: FRAME, borderRadius: '50%',
            overflow: 'hidden', position: 'relative',
            cursor: 'grab', touchAction: 'none',
            border: '1px solid rgba(193,154,75,0.55)',
            boxShadow: 'inset 0 2px 6px rgba(31,36,24,0.14)',
            background: 'var(--cream-2, #F5EFE2)',
          }}
        >
          <img
            ref={imgRef}
            src={url}
            alt=""
            draggable={false}
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover', objectPosition: `${pos.x}% ${pos.y}%`,
              userSelect: 'none', pointerEvents: 'none',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            style={{
              padding: '8px 16px', borderRadius: 999, cursor: 'pointer',
              border: '1px solid var(--line, #D8CFB8)', background: 'transparent',
              color: 'var(--ink-soft, #3A332C)', fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={busy}
            style={{
              padding: '8px 18px', borderRadius: 999, border: 'none', cursor: busy ? 'wait' : 'pointer',
              background: 'var(--sage-deep, #5C6B3F)', color: 'var(--cream, #F5EFE2)',
              fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit',
              opacity: busy ? 0.7 : 1,
            }}
          >
            {busy ? 'Saving…' : 'Keep this framing'}
          </button>
        </div>
      </div>
    </div>
  );
}
