'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / lib/dnd-kit-helpers.tsx
// Thin wrappers around @dnd-kit that give every panel ONE way to
// build a reorderable list. Replaces the legacy hand-rolled
// useDragSort hook with a keyboard-accessible, touch-friendly,
// well-animated drag surface.
//
// Usage:
//
//   <SortableList
//     items={events}
//     getId={(e) => e.id}
//     onReorder={setEvents}
//   >
//     {(event) => <EventRow event={event} />}
//   </SortableList>
//
// For more control (e.g. a custom drag handle) drop to the hook:
//
//   const { setNodeRef, handleProps, style, isDragging } =
//     useSortableBlock(event.id);
//
// ─────────────────────────────────────────────────────────────

import {
  type ReactNode,
  type CSSProperties,
  useCallback,
  useMemo,
} from 'react';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DropAnimation,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ── useSortableBlock ──────────────────────────────────────────
// One-call sortable wrapper that returns props to spread onto the
// item root and the drag handle separately. Keeps the drag surface
// opt-in — a block never becomes draggable accidentally.
export function useSortableBlock(id: string) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.65 : 1,
    zIndex: isDragging ? 20 : 'auto',
    position: 'relative',
    touchAction: 'manipulation',
  };

  return {
    setNodeRef,
    style,
    isDragging,
    isOver,
    /** Spread onto the drag handle only — keeps body clicks/scroll unblocked. */
    handleProps: {
      ...attributes,
      ...listeners,
      style: {
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      } as CSSProperties,
    },
  };
}

// ── <SortableList> ────────────────────────────────────────────
// Plug-and-play renderer for the 90% case: a vertical list of rows
// where the whole row is its own drag handle. Pass `orientation` to
// swap axis, or `strategy="grid"` for a wrap-packing layout.

export interface SortableListProps<T> {
  items: T[];
  getId: (item: T) => string;
  onReorder: (items: T[]) => void;
  children: (item: T, index: number) => ReactNode;
  orientation?: 'vertical' | 'horizontal' | 'grid';
  /** Drag activation distance in px — default 6 = no accidental starts on tap. */
  activationDistance?: number;
  /** Optional id used by React keys when getId can collide. */
  listId?: string;
  className?: string;
  style?: CSSProperties;
}

const DROP_ANIMATION: DropAnimation = {
  duration: 220,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: { opacity: '0.65' },
    },
  }),
};

export interface SortableContextShellProps<T> {
  items: T[];
  getId: (item: T) => string;
  onReorder: (items: T[]) => void;
  orientation?: 'vertical' | 'horizontal' | 'grid';
  activationDistance?: number;
  listId?: string;
  children: ReactNode;
}

/**
 * Lower-level wrapper: provides DndContext + SortableContext only,
 * so the caller can render rows that each call useSortableBlock
 * themselves (needed when the drag handle is a specific grip icon,
 * not the whole row).
 */
export function SortableContextShell<T>({
  items,
  getId,
  onReorder,
  orientation = 'vertical',
  activationDistance = 6,
  listId,
  children,
}: SortableContextShellProps<T>) {
  const ids = useMemo(() => items.map(getId), [items, getId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: activationDistance } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 120, tolerance: 6 } }),
    useSensor(KeyboardSensor,{ coordinateGetter: sortableKeyboardCoordinates }),
  );

  const strategy =
    orientation === 'horizontal' ? horizontalListSortingStrategy :
    orientation === 'grid'       ? rectSortingStrategy :
    verticalListSortingStrategy;

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const from = ids.indexOf(String(active.id));
      const to = ids.indexOf(String(over.id));
      if (from === -1 || to === -1) return;
      onReorder(arrayMove(items, from, to));
    },
    [ids, items, onReorder],
  );

  return (
    <DndContext
      id={listId}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={ids} strategy={strategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

export function SortableList<T>({
  items,
  getId,
  onReorder,
  children,
  orientation = 'vertical',
  activationDistance = 6,
  listId,
  className,
  style,
}: SortableListProps<T>) {
  const ids = useMemo(() => items.map(getId), [items, getId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: activationDistance } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 120, tolerance: 6 } }),
    useSensor(KeyboardSensor,{ coordinateGetter: sortableKeyboardCoordinates }),
  );

  const strategy =
    orientation === 'horizontal' ? horizontalListSortingStrategy :
    orientation === 'grid'       ? rectSortingStrategy :
    verticalListSortingStrategy;

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const from = ids.indexOf(String(active.id));
      const to = ids.indexOf(String(over.id));
      if (from === -1 || to === -1) return;
      onReorder(arrayMove(items, from, to));
    },
    [ids, items, onReorder],
  );

  return (
    <DndContext
      id={listId}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={ids} strategy={strategy}>
        <div className={className} style={style}>
          {items.map((item, index) => (
            <SortableListItem key={getId(item)} id={getId(item)}>
              {children(item, index)}
            </SortableListItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableListItem({ id, children }: { id: string; children: ReactNode }) {
  const { setNodeRef, style, handleProps } = useSortableBlock(id);
  const { style: handleStyle, ...handleAttrs } = handleProps;
  return (
    <div
      ref={setNodeRef}
      style={{ ...style, ...handleStyle }}
      {...handleAttrs}
    >
      {children}
    </div>
  );
}

export { DROP_ANIMATION as sortableDropAnimation };
