'use client';

/* ========================================================================
   SortableList — dnd-kit wrapper that replaces ListRow with a true
   drag-and-drop list. Used by every block panel with a repeated item.
   ======================================================================== */

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  useDraggable,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { type CSSProperties, type ReactNode, useState } from 'react';
import { Icon } from '../motifs';

export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
  emptyState,
}: {
  items: T[];
  onReorder: (next: T[]) => void;
  renderItem: (item: T, bind: { handle: ReactNode; onDelete?: () => void }) => ReactNode;
  emptyState?: ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const [activeId, setActiveId] = useState<string | null>(null);

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }
  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = items.findIndex((it) => it.id === active.id);
    const to = items.findIndex((it) => it.id === over.id);
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(items, from, to));
  }

  if (items.length === 0 && emptyState) return <>{emptyState}</>;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <SortableContext items={items.map((it) => it.id)} strategy={verticalListSortingStrategy}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map((item) => (
            <SortableRow key={item.id} id={item.id}>
              {(bind) => renderItem(item, bind)}
            </SortableRow>
          ))}
        </div>
      </SortableContext>
      <DragOverlay dropAnimation={null}>
        {activeId ? (
          <div
            style={{
              padding: 14,
              background: 'var(--card)',
              border: '2px solid var(--sage-deep)',
              borderRadius: 14,
              boxShadow: '0 18px 40px rgba(61,74,31,0.22)',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--ink)',
              opacity: 0.98,
              minHeight: 80,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            Moving…
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function SortableRow({
  id,
  children,
}: {
  id: string;
  children: (bind: { handle: ReactNode; onDelete?: () => void }) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };
  const handle = (
    <button
      type="button"
      aria-label="Drag to reorder"
      {...attributes}
      {...listeners}
      style={{
        width: 28,
        height: 28,
        display: 'grid',
        placeItems: 'center',
        background: 'transparent',
        border: 'none',
        borderRadius: 8,
        color: 'var(--ink-muted)',
        cursor: 'grab',
        touchAction: 'none',
      }}
    >
      <Icon name="drag" size={16} />
    </button>
  );
  return (
    <div ref={setNodeRef} style={style}>
      {children({ handle })}
    </div>
  );
}

/* ---------- SortableListRow — visual row with slot for the drag handle ---------- */
export function SortableRowCard({
  handle,
  onDelete,
  children,
  highlighted,
}: {
  handle: ReactNode;
  onDelete?: () => void;
  children: ReactNode;
  highlighted?: boolean;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '28px 1fr auto',
        gap: 12,
        padding: 16,
        background: 'var(--card)',
        border: `1px solid ${highlighted ? 'var(--sage-deep)' : 'var(--card-ring)'}`,
        borderRadius: 14,
        alignItems: 'start',
        transition: 'border-color 180ms, box-shadow 180ms',
      }}
    >
      <div style={{ paddingTop: 4 }}>{handle}</div>
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete"
          style={{
            width: 28,
            height: 28,
            display: 'grid',
            placeItems: 'center',
            background: 'transparent',
            border: '1px solid var(--line)',
            borderRadius: 8,
            color: '#7A2D2D',
            cursor: 'pointer',
            alignSelf: 'start',
          }}
        >
          <Icon name="close" size={14} />
        </button>
      )}
    </div>
  );
}
