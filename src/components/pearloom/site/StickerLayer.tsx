'use client';

/* ========================================================================
   StickerLayer — wraps any block and renders every sticker anchored to
   that block. Stickers are read from manifest.stickers[] and filtered by
   blockId. In published mode the stickers are static overlays; in edit
   mode they become draggable + rotatable + scalable with keyboard + mouse.

   A single drag moves the sticker; Shift+drag scales; Alt+drag rotates.
   Double-click a sticker to delete. Click empty space to deselect.

   All sticker state lives on the manifest. Every move/scale/rotate
   patches via onEditField, which flows to CanvasStage → queueSave.
   ======================================================================== */

import { useCallback, useRef, useState, useEffect, type CSSProperties } from 'react';
import type { StoryManifest, StickerItem } from '@/types';
import { useIsEditMode } from '../editor/canvas/EditorCanvasContext';

type FieldEditor = (patch: (m: StoryManifest) => StoryManifest) => void;

interface Props {
  blockId: string;
  stickers?: StickerItem[];
  onEditField?: FieldEditor;
  /** Visual nudge in the gutter — when non-empty, the layer shows a
   *  dashed outline on hover so users know they can drop here. */
  children?: React.ReactNode;
  style?: CSSProperties;
}

export function StickerLayer({ blockId, stickers, onEditField, children, style }: Props) {
  const edit = useIsEditMode();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Render anchored stickers — either image-based (url set) or
  // text-based (type === 'text', text set). Legacy SVG stickers
  // without a blockId render elsewhere in the tree.
  const mine = (stickers ?? []).filter(
    (s) => s.blockId === blockId && (s.url || (s.type === 'text' && s.text)),
  );

  // Delete the selected sticker on Backspace/Delete.
  useEffect(() => {
    if (!edit || !selectedId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        const target = e.target as HTMLElement | null;
        if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA'].includes(target.tagName))) return;
        e.preventDefault();
        onEditField?.((m) => ({
          ...m,
          stickers: (m.stickers ?? []).filter((s) => s.id !== selectedId),
        }));
        setSelectedId(null);
      } else if (e.key === 'Escape') {
        setSelectedId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [edit, selectedId, onEditField]);

  return (
    <div
      ref={containerRef}
      className="pl8-sticker-layer"
      data-sticker-block={blockId}
      style={{
        position: 'relative',
        ...style,
      }}
    >
      {children}
      {mine.map((s) => (
        <StickerPiece
          key={s.id}
          sticker={s}
          isEditing={edit}
          isSelected={selectedId === s.id}
          onSelect={() => setSelectedId(s.id)}
          containerRef={containerRef}
          onEditField={onEditField}
        />
      ))}
    </div>
  );
}

function StickerPiece({
  sticker,
  isEditing,
  isSelected,
  onSelect,
  containerRef,
  onEditField,
}: {
  sticker: StickerItem;
  isEditing: boolean;
  isSelected: boolean;
  onSelect: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onEditField?: FieldEditor;
}) {
  const baseSize = 160; // Natural sticker size before scale.
  const patchSticker = useCallback(
    (patch: Partial<StickerItem>) => {
      onEditField?.((m) => ({
        ...m,
        stickers: (m.stickers ?? []).map((s) => (s.id === sticker.id ? { ...s, ...patch } : s)),
      }));
    },
    [onEditField, sticker.id],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isEditing) return;
    e.stopPropagation();
    onSelect();
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const startSticker = { ...sticker };
    const startScale = startSticker.scale ?? 1;
    const mode = e.altKey ? 'rotate' : e.shiftKey ? 'scale' : 'move';

    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (mode === 'move') {
        const pctX = (dx / rect.width) * 100;
        const pctY = (dy / rect.height) * 100;
        patchSticker({
          x: clamp(startSticker.x + pctX, 0, 100),
          y: clamp(startSticker.y + pctY, 0, 100),
        });
      } else if (mode === 'scale') {
        const delta = (dx + dy) / 200;
        patchSticker({ scale: clamp(startScale + delta, 0.3, 2.2) });
      } else {
        // rotate — map horizontal drag to degrees (1px → 1deg)
        patchSticker({ rotation: startSticker.rotation + dx });
      }
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up, { once: true });
  };

  const onDoubleClick = () => {
    if (!isEditing) return;
    if (sticker.type === 'text') {
      // For text stickers, double-click opens an inline prompt to
      // change the text instead of deleting (use × on chip or
      // Backspace key to delete).
      // eslint-disable-next-line no-alert
      const next = window.prompt('Sticker text', sticker.text ?? '');
      if (next !== null && next !== sticker.text) {
        patchSticker({ text: next });
      }
      return;
    }
    onEditField?.((m) => ({
      ...m,
      stickers: (m.stickers ?? []).filter((s) => s.id !== sticker.id),
    }));
  };

  const handleRemove = (e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation();
    onEditField?.((m) => ({
      ...m,
      stickers: (m.stickers ?? []).filter((s) => s.id !== sticker.id),
    }));
  };

  const cycleScale = (e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation();
    const cur = sticker.scale ?? 1;
    // 0.6 → 1 → 1.4 → 1.8 → 0.6 …
    const steps = [0.6, 1, 1.4, 1.8];
    const i = steps.findIndex((s) => Math.abs(s - cur) < 0.05);
    const next = steps[((i < 0 ? 0 : i) + 1) % steps.length];
    patchSticker({ scale: next });
  };

  const isText = sticker.type === 'text';
  const fontFam =
    sticker.fontFamily === 'mono' ? 'var(--font-mono)' :
    sticker.fontFamily === 'body' ? 'var(--font-ui)' :
    'var(--font-display, "Fraunces", serif)';
  const fontSize = (sticker.fontSize ?? 32) * (sticker.scale ?? 1);
  const size = baseSize * (sticker.scale ?? 1);

  return (
    <div
      style={{
        position: 'absolute',
        left: `${sticker.x}%`,
        top: `${sticker.y}%`,
        transform: `translate(-50%, -50%)`,
        zIndex: isSelected ? 12 : 10,
        // Container takes the bounding box, the sticker rotates inside it
        // so the action chip stays upright above the sticker.
        width: isText ? 'auto' : size,
        height: isText ? 'auto' : size,
      }}
    >
      <div
        role={isEditing ? 'button' : undefined}
        onPointerDown={onPointerDown}
        onDoubleClick={onDoubleClick}
        title={isEditing ? 'Drag to move · Shift-drag to scale · Alt-drag to rotate' : undefined}
        style={
          isText
            ? {
                position: 'relative',
                transform: `rotate(${sticker.rotation}deg)`,
                fontFamily: fontFam,
                fontSize,
                fontWeight: sticker.fontWeight ?? 600,
                fontStyle: sticker.italic ? 'italic' : 'normal',
                lineHeight: 1.05,
                color: sticker.color ?? 'var(--ink, #0E0D0B)',
                opacity: sticker.opacity ?? 1,
                whiteSpace: 'pre',
                userSelect: isEditing && isSelected ? 'text' : 'none',
                cursor: isEditing ? 'grab' : 'default',
                padding: '4px 8px',
                outline: isEditing && isSelected ? '2px dashed var(--sage-deep, #5C6B3F)' : 'none',
                outlineOffset: 4,
                transition: isSelected ? 'none' : 'outline 140ms',
                touchAction: 'none',
                textShadow: '0 1px 0 rgba(255,255,255,0.4)',
              }
            : {
                position: 'absolute',
                inset: 0,
                transform: `rotate(${sticker.rotation}deg)`,
                backgroundImage: `url(${sticker.url})`,
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                filter: 'drop-shadow(0 6px 10px rgba(61,74,31,0.22))',
                cursor: isEditing ? 'grab' : 'default',
                outline: isEditing && isSelected ? '2px dashed var(--sage-deep, #5C6B3F)' : 'none',
                outlineOffset: 4,
                transition: isSelected ? 'none' : 'outline 140ms',
                touchAction: 'none',
              }
        }
      >
        {isText ? (sticker.text ?? '') : null}
      </div>
      {/* Action chip — appears above the sticker when selected. Sits
          OUTSIDE the rotated layer so it's always upright + readable. */}
      {isEditing && isSelected && (
        <div
          role="toolbar"
          aria-label="Sticker actions"
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: -36,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 2,
            padding: '3px 4px',
            borderRadius: 999,
            background: 'rgba(14,13,11,0.88)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            boxShadow: '0 6px 16px rgba(14,13,11,0.22)',
            color: 'rgba(243,233,212,0.92)',
            fontFamily: 'var(--font-ui)',
            fontSize: 10.5,
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            zIndex: 13,
          }}
        >
          <button
            type="button"
            onClick={cycleScale}
            aria-label="Resize sticker"
            title="Resize"
            style={stickerActionBtn}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleRemove}
            aria-label="Remove sticker"
            title="Remove"
            style={{ ...stickerActionBtn, color: '#FCA5A5' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

const stickerActionBtn: CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: 999,
  border: 'none',
  background: 'transparent',
  color: 'inherit',
  cursor: 'pointer',
  display: 'grid',
  placeItems: 'center',
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
