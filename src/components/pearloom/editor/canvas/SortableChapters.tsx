'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/canvas/SortableChapters.tsx
//
// Wraps the chapter list with @dnd-kit sortable infrastructure
// when the SiteV8Renderer is in edit mode. On the published
// site it's a transparent passthrough — zero runtime cost.
//
// The chapter row itself stays unchanged; we just give each
// direct child a draggable wrapper with a gutter handle that
// fades in on hover. onReorder receives the new chapter order
// and patches manifest.chapters.
// ─────────────────────────────────────────────────────────────

import type { ReactNode } from 'react';
import type { Chapter } from '@/types';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useIsEditMode } from './EditorCanvasContext';

export interface SortableChaptersProps {
  chapters: Chapter[];
  onReorder: (next: Chapter[]) => void;
  children: (chapter: Chapter, index: number) => ReactNode;
}

export function SortableChapters({ chapters, onReorder, children }: SortableChaptersProps) {
  const editMode = useIsEditMode();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Static path — published site, no dnd cost.
  if (!editMode) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 56 }}>
        {chapters.map((c, i) => children(c, i))}
      </div>
    );
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = chapters.findIndex((c) => (c.id ?? '') === active.id);
    const newIndex = chapters.findIndex((c) => (c.id ?? '') === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(chapters, oldIndex, newIndex));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={chapters.map((c) => c.id ?? '')} strategy={verticalListSortingStrategy}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 56 }}>
          {chapters.map((c, i) => (
            <SortableChapterItem key={c.id ?? i} id={c.id ?? `chapter-${i}`}>
              {children(c, i)}
            </SortableChapterItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableChapterItem({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    position: 'relative',
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} data-pl8-sortable-chapter>
      {/* Drag handle — left edge, visible on hover */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder chapter"
        className="pl8-sortable-handle"
        style={{
          position: 'absolute',
          left: -28,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 22,
          height: 44,
          borderRadius: 10,
          border: '1px solid var(--line)',
          background: 'var(--cream)',
          cursor: 'grab',
          display: 'grid',
          placeItems: 'center',
          opacity: 0,
          transition: 'opacity 160ms ease',
          touchAction: 'none',
          padding: 0,
          zIndex: 4,
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <svg width="10" height="14" viewBox="0 0 10 14" fill="none" aria-hidden>
          <circle cx="2" cy="2" r="1.5" fill="currentColor" />
          <circle cx="2" cy="7" r="1.5" fill="currentColor" />
          <circle cx="2" cy="12" r="1.5" fill="currentColor" />
          <circle cx="8" cy="2" r="1.5" fill="currentColor" />
          <circle cx="8" cy="7" r="1.5" fill="currentColor" />
          <circle cx="8" cy="12" r="1.5" fill="currentColor" />
        </svg>
      </button>
      {children}
      <style jsx>{`
        [data-pl8-sortable-chapter]:hover .pl8-sortable-handle {
          opacity: 0.9;
        }
      `}</style>
    </div>
  );
}
