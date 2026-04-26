'use client';

// ──────────────────────────────────────────────────────────────
// CanvasBlockSortable — direct-manipulation block ordering on the
// live canvas. v9.1 upgrades over the original Wix-style reorder:
//
//   1. Each section gets a hover SectionActionMenu (top-right):
//      ⋮⋮ drag · ✎ edit · ⊕ add below · × remove. Anyone editing
//      a site never has to round-trip to the Outline for these.
//
//   2. InlineAddBlock — a thin row between every two sections.
//      Hover reveals a "+ Add section" pill anchored to the gap;
//      clicking opens the BlockPickerPopover with everything
//      currently hidden, ready to slot in at that position.
//
//   3. Outline → canvas drag bridge: the same DndContext accepts
//      drags initiated outside the SortableContext (e.g. from the
//      Outline) and drops them in the right gap.
//
// Strict-reorder still — no free positioning. Editorial flow stays
// intact.
// ──────────────────────────────────────────────────────────────

import { type ReactNode, useState, useMemo, useCallback } from 'react';
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
import { SectionActionMenu } from './SectionActionMenu';
import { InlineAddBlock } from './InlineAddBlock';
import { BlockPickerPopover, type PickerBlock } from './BlockPickerPopover';

interface SortableBlockListProps {
  blockKeys: string[];
  /** Renders each block. Called once per key. */
  renderItem: (key: string, idx: number) => ReactNode;
  /** Called when reorder happens. Receives the new order. */
  onReorder?: (next: string[]) => void;
  /** Called when "× remove" is clicked on a section. The host
   *  decides what removal means (typically: add to hiddenBlocks). */
  onRemove?: (key: string) => void;
  /** Called when "✎ edit" is clicked. Host scrolls Inspector to
   *  the matching block panel. */
  onEdit?: (key: string) => void;
  /** Called when "+ Add" inline-zone or section-menu is used. The
   *  parent decides which block to add and at what index. */
  onAddAt?: (atIndex: number, key: string) => void;
  /** All blocks the picker can offer (already-hidden ones the user
   *  can re-show). Empty list = picker shows empty state. */
  pickerBlocks?: PickerBlock[];
  /** Called when a section dragged from the Outline is dropped into
   *  one of the inline-add gaps. Index = the gap's insert index. */
  onDropOutlineBlock?: (atIndex: number, key: string) => void;
  /** Pretty labels keyed by blockKey — surfaced in the section
   *  chip so it reads "Gallery" not "gallery". */
  blockLabels?: Record<string, string>;
}

export function SortableBlockList({
  blockKeys, renderItem, onReorder, onRemove, onEdit, onAddAt, pickerBlocks = [], onDropOutlineBlock, blockLabels,
}: SortableBlockListProps) {
  const edit = useIsEditMode();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pickerAnchor, setPickerAnchor] = useState<HTMLElement | null>(null);
  const [pickerIndex, setPickerIndex] = useState<number>(0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const items = useMemo(() => blockKeys.map((k) => ({ id: k })), [blockKeys]);

  const openPicker = useCallback((index: number, anchor: HTMLElement) => {
    setPickerIndex(index);
    setPickerAnchor(anchor);
  }, []);

  const closePicker = useCallback(() => {
    setPickerAnchor(null);
  }, []);

  // When NOT in edit mode, render items unchanged.
  if (!edit) {
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
    if (!reorderCb || !e.over || e.active.id === e.over.id) return;
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
          <div key={key}>
            {/* Inline-add zone ABOVE every section. The first one
                accepts blocks at index 0 — nothing renders above it
                in edit mode except the hero (which is outside this
                list), so it doubles as "add at the very top". */}
            {onAddAt && (
              <InlineAddBlock
                onAdd={(anchor) => openPicker(i, anchor)}
                onDropBlock={onDropOutlineBlock
                  ? (k) => onDropOutlineBlock(i, k)
                  : undefined}
              />
            )}
            <CanvasSortableItem
              id={key}
              label={blockLabels?.[key]}
              onRemove={onRemove}
              onEdit={onEdit}
              onAddBelow={onAddAt
                ? (k, anchor) => openPicker(i + 1, anchor)
                : undefined}
            >
              {renderItem(key, i)}
            </CanvasSortableItem>
          </div>
        ))}
        {/* Trailing add-zone — at the very end of the section list. */}
        {onAddAt && (
          <InlineAddBlock
            onAdd={(anchor) => openPicker(blockKeys.length, anchor)}
            onDropBlock={onDropOutlineBlock
              ? (k) => onDropOutlineBlock(blockKeys.length, k)
              : undefined}
          />
        )}
      </SortableContext>
      <DragOverlay>
        {activeId ? (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 16px 10px 12px',
              borderRadius: 999,
              background: 'var(--cream, #FBF7EE)',
              border: '1.5px solid var(--peach-ink, #C6703D)',
              boxShadow: '0 20px 48px -12px rgba(14,13,11,0.32), 0 0 0 6px rgba(198,112,61,0.10)',
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--ink, #18181B)',
              fontFamily: 'var(--font-ui)',
              letterSpacing: '0.04em',
              cursor: 'grabbing',
            }}
          >
            <span
              aria-hidden
              style={{
                display: 'inline-grid',
                placeItems: 'center',
                width: 22,
                height: 22,
                borderRadius: 999,
                background: 'var(--peach-ink, #C6703D)',
                color: '#fff',
              }}
            >
              <svg width="12" height="14" viewBox="0 0 12 14" aria-hidden>
                <circle cx="3" cy="3" r="1.4" fill="currentColor" />
                <circle cx="9" cy="3" r="1.4" fill="currentColor" />
                <circle cx="3" cy="7" r="1.4" fill="currentColor" />
                <circle cx="9" cy="7" r="1.4" fill="currentColor" />
                <circle cx="3" cy="11" r="1.4" fill="currentColor" />
                <circle cx="9" cy="11" r="1.4" fill="currentColor" />
              </svg>
            </span>
            {blockLabels?.[activeId] ?? activeId}
          </div>
        ) : null}
      </DragOverlay>
      {pickerAnchor && onAddAt && (
        <BlockPickerPopover
          anchor={pickerAnchor}
          blocks={pickerBlocks}
          onClose={closePicker}
          onPick={(k) => {
            onAddAt(pickerIndex, k);
            closePicker();
          }}
        />
      )}
    </DndContext>
  );
}

interface CanvasSortableItemProps {
  id: string;
  label?: string;
  children: ReactNode;
  onRemove?: (key: string) => void;
  onEdit?: (key: string) => void;
  onAddBelow?: (key: string, anchor: HTMLElement) => void;
}

function CanvasSortableItem({
  id, label, children, onRemove, onEdit, onAddBelow,
}: CanvasSortableItemProps) {
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

  // Right-click context menu — same actions as the hover chip,
  // accessible without aiming for the chip first. Wix users in
  // particular expect right-click everywhere.
  function handleContextMenu(e: React.MouseEvent<HTMLDivElement>) {
    // Don't hijack right-click on inputs / contenteditable / images
    // where the browser's native menu is more useful.
    const target = e.target as HTMLElement | null;
    if (target && (
      target.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'IMG', 'VIDEO'].includes(target.tagName)
    )) return;
    if (typeof window === 'undefined') return;
    e.preventDefault();
    const items = [
      onEdit && {
        id: 'edit', label: 'Edit in Inspector', icon: 'sliders', shortcut: '⌘1',
        onSelect: () => onEdit(id),
      },
      onAddBelow && {
        id: 'add-below', label: 'Add a section below', icon: 'plus',
        onSelect: () => {
          // Synthesize an anchor at the click position by passing
          // the section element itself.
          const el = (e.currentTarget as HTMLElement);
          onAddBelow(id, el);
        },
      },
      onRemove && {
        id: 'remove', label: `Hide ${label ?? id}`, icon: 'eye-off',
        divider: true, danger: true,
        onSelect: () => onRemove(id),
      },
    ].filter(Boolean) as Array<NonNullable<unknown>>;
    window.dispatchEvent(new CustomEvent('pearloom:context-menu-open', {
      detail: {
        x: e.clientX,
        y: e.clientY,
        title: label ?? id,
        items,
      },
    }));
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-pl-block={id}
      data-pl-block-sortable
      onContextMenu={handleContextMenu}
    >
      {/* Drop indicator when this section is the drop target. */}
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

      {/* Floating action menu on hover — drag handle + edit + add + remove. */}
      <SectionActionMenu
        blockKey={id}
        blockLabel={label}
        onEdit={onEdit}
        onAddBelow={onAddBelow}
        onRemove={onRemove}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dragHandle={<DragHandle attributes={attributes as any} listeners={listeners as any} />}
      />

      {children}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DragHandle({ attributes, listeners }: { attributes: any; listeners: any }) {
  return (
    <button
      type="button"
      {...attributes}
      {...(listeners ?? {})}
      aria-label="Drag to reorder section"
      title="Drag to reorder"
      style={{
        width: 28, height: 28,
        borderRadius: 999,
        border: 'none',
        background: 'transparent',
        color: 'rgba(243,233,212,0.92)',
        cursor: 'grab',
        display: 'grid', placeItems: 'center',
        touchAction: 'none',
        transition: 'background-color 180ms ease',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(243,233,212,0.14)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <svg width="12" height="14" viewBox="0 0 12 14" aria-hidden>
        <circle cx="3" cy="3" r="1.4" fill="currentColor" />
        <circle cx="9" cy="3" r="1.4" fill="currentColor" />
        <circle cx="3" cy="7" r="1.4" fill="currentColor" />
        <circle cx="9" cy="7" r="1.4" fill="currentColor" />
        <circle cx="3" cy="11" r="1.4" fill="currentColor" />
        <circle cx="9" cy="11" r="1.4" fill="currentColor" />
      </svg>
    </button>
  );
}
