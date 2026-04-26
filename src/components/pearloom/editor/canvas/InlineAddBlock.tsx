'use client';

// ──────────────────────────────────────────────────────────────
// InlineAddBlock — the thin row that appears between every two
// sections in edit mode. Hovers reveal a dashed line + "+ Add
// section" pill. Click → fires onAdd(anchor) so the parent can
// open a BlockPickerPopover anchored to the click target.
//
// Intentionally low-profile — invisible until hover so the
// canvas reads as the live site, not as scaffolding.
// ──────────────────────────────────────────────────────────────

import { useState, type DragEvent, type MouseEvent } from 'react';

const DRAG_MIME = 'application/x-pearloom-block';

interface Props {
  onAdd: (anchor: HTMLElement) => void;
  /** Called when an outline block is dropped onto this gap. The
   *  parent decides whether to accept (move/reveal) or ignore. */
  onDropBlock?: (key: string) => void;
}

export function InlineAddBlock({ onAdd, onDropBlock }: Props) {
  const [hover, setHover] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    onAdd(e.currentTarget);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    if (!onDropBlock) return;
    if (!Array.from(e.dataTransfer.types).includes(DRAG_MIME)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!dragOver) setDragOver(true);
  }

  function handleDragLeave() {
    if (dragOver) setDragOver(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    if (!onDropBlock) return;
    const key = e.dataTransfer.getData(DRAG_MIME);
    if (!key) return;
    e.preventDefault();
    setDragOver(false);
    onDropBlock(key);
  }

  const expanded = hover || dragOver;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        position: 'relative',
        height: expanded ? 28 : 8,
        transition: 'height 220ms cubic-bezier(0.22, 1, 0.36, 1)',
        margin: '2px 0',
        zIndex: 5,
      }}
    >
      {/* Dashed line — visible on hover or while a drag is over. */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: expanded ? 1 : 0,
          transition: 'opacity 220ms cubic-bezier(0.22, 1, 0.36, 1)',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0, right: 0,
            height: dragOver ? 2 : 1,
            borderTop: dragOver
              ? '2px solid var(--peach-ink, #C6703D)'
              : '1px dashed var(--peach-ink, #C6703D)',
            opacity: dragOver ? 0.9 : 0.55,
            boxShadow: dragOver ? '0 0 12px rgba(198,112,61,0.45)' : 'none',
          }}
        />
      </div>
      {/* + Add section pill — actual click target. */}
      <div
        style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <button
          type="button"
          onClick={handleClick}
          aria-label="Add a section here"
          style={{
            padding: '4px 12px',
            borderRadius: 999,
            border: '1px solid var(--peach-ink, #C6703D)',
            background: 'var(--cream, #FBF7EE)',
            color: 'var(--peach-ink, #C6703D)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.04em',
            cursor: 'pointer',
            opacity: expanded ? 1 : 0,
            pointerEvents: expanded ? 'auto' : 'none',
            transition: 'opacity 220ms cubic-bezier(0.22, 1, 0.36, 1), transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
            transform: expanded ? 'scale(1)' : 'scale(0.92)',
            boxShadow: '0 6px 16px -8px rgba(198,112,61,0.4)',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {dragOver ? 'Drop to add here' : 'Add section'}
        </button>
      </div>
    </div>
  );
}
