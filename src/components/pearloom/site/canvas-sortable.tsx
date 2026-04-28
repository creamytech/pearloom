'use client';

// ─────────────────────────────────────────────────────────────
// CanvasSortable — dnd-kit wrapper used by SiteV8Renderer to
// give every structured section (hotels, FAQ, schedule, registry)
// a canvas-side drag-to-reorder UX in edit mode. Renderer-local
// (parallel to src/components/pearloom/editor/sortable.tsx, which
// lives in the editor panels) so the published site bundle never
// pulls in editor chrome.
//
// Each item gets a hover-revealed peach grip handle; pressing it
// activates a 5px drag activation distance so accidental clicks
// don't trigger a reorder. Drag overlay paints a translucent ghost
// of the item; on drop, we call onReorder with the new array order.
// ─────────────────────────────────────────────────────────────

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { type CSSProperties, type ReactNode } from 'react';

export function CanvasSortable<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
  enabled = true,
}: {
  items: T[];
  onReorder: (next: T[]) => void;
  renderItem: (item: T, ctx: { index: number; dragHandleProps: React.HTMLAttributes<HTMLElement> & { ref: (el: HTMLElement | null) => void } }) => ReactNode;
  enabled?: boolean;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (!enabled) {
    return (
      <>
        {items.map((item, index) =>
          renderItem(item, { index, dragHandleProps: { ref: () => {} } as never }),
        )}
      </>
    );
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const fromIdx = items.findIndex((x) => x.id === active.id);
    const toIdx = items.findIndex((x) => x.id === over.id);
    if (fromIdx < 0 || toIdx < 0) return;
    onReorder(arrayMove(items, fromIdx, toIdx));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((x) => x.id)} strategy={verticalListSortingStrategy}>
        {items.map((item, index) => (
          <CanvasSortableRow key={item.id} id={item.id} index={index} item={item} renderItem={renderItem} />
        ))}
      </SortableContext>
    </DndContext>
  );
}

function CanvasSortableRow<T>({
  id,
  index,
  item,
  renderItem,
}: {
  id: string;
  index: number;
  item: T;
  renderItem: (item: T, ctx: { index: number; dragHandleProps: React.HTMLAttributes<HTMLElement> & { ref: (el: HTMLElement | null) => void } }) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, setActivatorNodeRef } = useSortable({ id });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };
  // Combined drag-handle props: ref to register the element as the
  // activator (so dragging only starts from the handle, not the
  // whole card), plus the listeners needed for pointer/touch.
  const dragHandleProps = {
    ref: setActivatorNodeRef,
    ...attributes,
    ...listeners,
  } as React.HTMLAttributes<HTMLElement> & { ref: (el: HTMLElement | null) => void };

  return (
    <div ref={setNodeRef} style={style} data-pl-sortable-id={id}>
      {renderItem(item, { index, dragHandleProps })}
    </div>
  );
}

/**
 * Pearl-edge grip glyph — drop into a corner of any sortable
 * canvas item. Spreads dragHandleProps so dnd-kit recognizes it
 * as the activator. Hover-reveals via .pl8-canvas-row CSS.
 */
export function CanvasGripHandle({
  dragHandleProps,
  ariaLabel = 'Drag to reorder',
  position = 'top-left',
}: {
  dragHandleProps: React.HTMLAttributes<HTMLElement> & { ref: (el: HTMLElement | null) => void };
  ariaLabel?: string;
  position?: 'top-left' | 'top-right';
}) {
  // For the small inset gap on each corner so the chip doesn't
  // collide with hover-× buttons that live in the opposite corner.
  const positionStyle: CSSProperties =
    position === 'top-right'
      ? { top: 10, right: 10 }
      : { top: 10, left: 10 };
  return (
    <button
      type="button"
      {...dragHandleProps}
      aria-label={ariaLabel}
      className="pl8-canvas-grip"
      style={{
        position: 'absolute',
        ...positionStyle,
        width: 26,
        height: 26,
        borderRadius: 999,
        background: 'rgba(14,13,11,0.75)',
        color: '#FFFFFF',
        border: '1px solid rgba(255,255,255,0.15)',
        cursor: 'grab',
        zIndex: 4,
        display: 'grid',
        placeItems: 'center',
        opacity: 0,
        transition: 'opacity 160ms ease, background 140ms ease',
        touchAction: 'none',
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <circle cx="9" cy="6" r="1.4" />
        <circle cx="15" cy="6" r="1.4" />
        <circle cx="9" cy="12" r="1.4" />
        <circle cx="15" cy="12" r="1.4" />
        <circle cx="9" cy="18" r="1.4" />
        <circle cx="15" cy="18" r="1.4" />
      </svg>
    </button>
  );
}
