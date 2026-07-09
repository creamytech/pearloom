'use client';

// ─────────────────────────────────────────────────────────────
// StudioPlacedAssets — assets pressed onto the card front at
// nine snap anchors (STUDIO-PLAN SV.7). The canvas passes
// move/remove handlers: dragging a piece re-snaps it to the
// nearest anchor on release; the press sheet and send preview
// render the same pieces statically.
// ─────────────────────────────────────────────────────────────

import { useRef, useState } from 'react';
import type { AssetEntry } from './studio-constants';
import type { PlacedAsset } from './useStudioState';
import { AssetGlyph } from './StudioAssetGlyph';

const PIECE = 64;

/** Anchor centers as fractions of the card box — a 3×3 grid held
 *  off the very edge so pieces never bleed past the trim. */
const FRACS = [0.16, 0.5, 0.84] as const;

export function anchorXY(anchor: number): { x: number; y: number } {
  const col = anchor % 3;
  const row = Math.floor(anchor / 3);
  return { x: FRACS[col] ?? 0.5, y: FRACS[row] ?? 0.5 };
}

export function nearestAnchor(xFrac: number, yFrac: number): number {
  const near = (v: number) => (v < 1 / 3 ? 0 : v > 2 / 3 ? 2 : 1);
  return near(yFrac) * 3 + near(xFrac);
}

/** Anchor fill order for newly placed pieces — corners first
 *  (where marks read best), center last. */
export const ANCHOR_ORDER = [2, 0, 8, 6, 4, 1, 3, 5, 7] as const;

export function PlacedAssets({ placed, assets, onMove, onRemove }: {
  placed: PlacedAsset[];
  assets: AssetEntry[];
  /** Present on the live canvas only — drag re-snaps. */
  onMove?: (id: string, anchor: number) => void;
  onRemove?: (id: string) => void;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null);

  function fracsFrom(e: React.PointerEvent): { x: number; y: number } | null {
    const el = rootRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return null;
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    };
  }

  if (placed.length === 0) return null;

  return (
    <div ref={rootRef} aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 4, pointerEvents: 'none' }}>
      {placed.map((piece) => {
        const asset = assets.find((a) => a.id === piece.assetId);
        if (!asset) return null; // stale asset id — render nothing
        const pos = drag?.id === piece.id ? { x: drag.x, y: drag.y } : anchorXY(piece.anchor);
        const dragging = drag?.id === piece.id;
        return (
          <div
            key={piece.id}
            className="pl-studio-placed"
            style={{
              position: 'absolute',
              left: `${pos.x * 100}%`,
              top: `${pos.y * 100}%`,
              transform: 'translate(-50%, -50%)',
              width: PIECE,
              height: PIECE,
              display: 'grid',
              placeItems: 'center',
              pointerEvents: onMove ? 'auto' : 'none',
              cursor: onMove ? (dragging ? 'grabbing' : 'grab') : 'default',
              touchAction: 'none',
              transition: dragging ? 'none' : 'left 160ms ease, top 160ms ease',
            }}
            onPointerDown={onMove ? (e) => {
              e.preventDefault();
              e.currentTarget.setPointerCapture(e.pointerId);
              const f = fracsFrom(e);
              if (f) setDrag({ id: piece.id, ...f });
            } : undefined}
            onPointerMove={onMove ? (e) => {
              if (drag?.id !== piece.id) return;
              const f = fracsFrom(e);
              if (f) setDrag({ id: piece.id, ...f });
            } : undefined}
            onPointerUp={onMove ? (e) => {
              if (drag?.id !== piece.id) return;
              const f = fracsFrom(e);
              setDrag(null);
              if (f) onMove(piece.id, nearestAnchor(f.x, f.y));
            } : undefined}
            onPointerCancel={onMove ? () => setDrag(null) : undefined}
          >
            <AssetGlyph asset={asset} size={52} />
            {onRemove && !dragging && (
              <button
                type="button"
                className="pl-studio-placed-x"
                aria-label="Remove from card"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onRemove(piece.id)}
                style={{
                  position: 'absolute', top: -6, right: -6,
                  width: 18, height: 18, borderRadius: '50%',
                  background: 'var(--ink, #0E0D0B)', color: 'var(--cream, #F5EFE2)',
                  border: 'none', fontSize: 11, lineHeight: 1, cursor: 'pointer',
                  display: 'grid', placeItems: 'center', padding: 0,
                }}
              >
                ×
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
