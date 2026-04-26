'use client';

// ──────────────────────────────────────────────────────────────
// CanvasBlockSortable — true visual builder drag-and-drop.
//
// Wraps the SiteV8Renderer's per-block list with a dnd-kit
// SortableContext. Each section becomes a sortable item with a
// drag handle that only appears in edit mode. Drop indicator
// (1px sage hairline) animates between sections during drag.
//
// Strict reorder only — no free positioning. Editorial flow
// integrity.
//
// Hero + theme are pinned and rendered OUTSIDE this surface;
// only the middle blocks (story, details, schedule, travel,
// registry, gallery, rsvp, faq) are sortable.
// ──────────────────────────────────────────────────────────────

import { type ReactNode, useState, useMemo } from 'react';
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, arrayMove, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useIsEditMode } from './EditorCanvasContext';

interface SortableBlockListProps {
  blockKeys: string[];
  /** Renders each block. The renderer is called once per key. */
  renderItem: (key: string, idx: number) => ReactNode;
  /** Callback when user reorders. Receives the new order. */
  onReorder?: (next: string[]) => void;
}

export function SortableBlockList({
  blockKeys, renderItem, onReorder,
}: SortableBlockListProps) {
  const edit = useIsEditMode();
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const items = useMemo(() => blockKeys.map((k) => ({ id: k })), [blockKeys]);

  // When NOT in edit mode, just render the items unchanged. dnd-kit
  // is purely an editor concern.
  if (!edit || !onReorder) {
    return (
      <>
        {blockKeys.map((key, i) => {
          const node = renderItem(key, i);
          return (
            <div key={key} data-pl-block={key}>
              {node}
            </div>
          );
        })}
      </>
    );
  }
  const reorderCb = onReorder;

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    if (!e.over || e.active.id === e.over.id) return;
    const oldIndex = blockKeys.indexOf(String(e.active.id));
    const newIndex = blockKeys.indexOf(String(e.over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(blockKeys, oldIndex, newIndex);
    reorderCb(next);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {blockKeys.map((key, i) => (
          <CanvasSortableItem key={key} id={key}>
            {renderItem(key, i)}
          </CanvasSortableItem>
        ))}
      </SortableContext>
      <DragOverlay>
        {activeId ? (
          <div
            style={{
              padding: '12px 18px',
              borderRadius: 12,
              background: 'var(--cream-2, #F5EFE2)',
              border: '1.5px solid var(--peach-ink, #C6703D)',
              boxShadow: '0 24px 56px rgba(14,13,11,0.18)',
              fontSize: 13, fontWeight: 700,
              color: 'var(--ink, #18181B)',
              textTransform: 'uppercase', letterSpacing: '0.12em',
            }}
          >
            {activeId}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

interface CanvasSortableItemProps {
  id: string;
  children: ReactNode;
}

function CanvasSortableItem({ id, children }: CanvasSortableItemProps) {
  const {
    attributes, listeners,
    setNodeRef, transform, transition,
    isDragging, isOver,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: 'relative',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-pl-block={id}
      data-pl-block-sortable
    >
      {/* Drop indicator — appears between sections when this is the
          drop target. 1px sage hairline that brightens to peach. */}
      {isOver && !isDragging && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: 2,
            background: 'var(--peach-ink, #C6703D)',
            zIndex: 50,
            borderRadius: 2,
            boxShadow: '0 0 12px rgba(198,112,61,0.4)',
            transition: 'opacity 180ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        />
      )}

      {/* Drag handle — only shown on hover when edit mode. The
          ⋮⋮ glyph sits at the left edge of the section so it
          doesn't compete with content. */}
      <DragHandle attributes={attributes} listeners={listeners} />

      {children}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DragHandle({ attributes, listeners }: { attributes: any; listeners: any }) {
  return (
    <button
      type="button"
      // dnd-kit listeners include onPointerDown etc.
      {...attributes}
      {...(listeners ?? {})}
      aria-label="Drag to reorder section"
      className="pl8-canvas-drag-handle"
      style={{
        position: 'absolute',
        top: 'calc(50% - 18px)',
        left: 6,
        width: 32, height: 36,
        borderRadius: 8,
        border: 'none',
        background: 'transparent',
        color: 'var(--ink-muted, #6F6557)',
        cursor: 'grab',
        opacity: 0,
        transition: 'opacity 180ms cubic-bezier(0.22, 1, 0.36, 1), background-color 180ms ease',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 30,
        touchAction: 'none',
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <svg width="14" height="20" viewBox="0 0 14 20" aria-hidden>
        <circle cx="4" cy="4" r="1.5" fill="currentColor" />
        <circle cx="10" cy="4" r="1.5" fill="currentColor" />
        <circle cx="4" cy="10" r="1.5" fill="currentColor" />
        <circle cx="10" cy="10" r="1.5" fill="currentColor" />
        <circle cx="4" cy="16" r="1.5" fill="currentColor" />
        <circle cx="10" cy="16" r="1.5" fill="currentColor" />
      </svg>
    </button>
  );
}
