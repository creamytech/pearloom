'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/editor/useDragSort.ts
// Custom hook for pointer-event-based drag-and-drop reordering.
// Works with both mouse and touch (pointer events unify both).
//
// Strategy:
//   - Attach onPointerDown to each drag handle.
//   - On pointermove (window), measure DOM rects via data-drag-id
//     attributes to compute the drop target.
//   - Visually shift items via CSS translateY without reordering DOM.
//   - On pointerup, commit the new order via onReorder.
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useCallback, useEffect } from 'react';

export interface UseDragSortOptions<T> {
  items: T[];
  getKey: (item: T) => string;
  onReorder: (newItems: T[]) => void;
  /** Selector prefix for the data attribute used to find item elements */
  containerSelector?: string;
  /**
   * Optional ref to a "ghost" DOM element that follows the pointer during drag.
   * The hook imperatively updates top/left/width on this element so the parent
   * component can show a floating preview without triggering per-frame re-renders.
   */
  ghostRef?: React.RefObject<HTMLElement | null>;
  /** Companion ref that receives the pointer offset captured at drag start */
  ghostOffsetRef?: React.MutableRefObject<{ x: number; y: number }>;
}

export interface DragSortItemProps {
  draggable: boolean;
  style: React.CSSProperties;
  'data-drag-id': string;
  ref: (el: HTMLElement | null) => void;
}

export interface DragHandleProps {
  onPointerDown: (e: React.PointerEvent) => void;
  style: React.CSSProperties;
}

export interface UseDragSortReturn<T> {
  orderedItems: T[];
  getDragProps: (item: T) => DragSortItemProps;
  getHandleProps: (item: T) => DragHandleProps;
  isDragging: boolean;
  dragId: string | null;
  dropIndex: number | null;
}

interface DragState {
  dragKey: string;
  startIndex: number;
  pointerId: number;
}

export function useDragSort<T>({
  items,
  getKey,
  onReorder,
  ghostRef,
  ghostOffsetRef,
}: UseDragSortOptions<T>): UseDragSortReturn<T> {
  const [orderedItems, setOrderedItems] = useState<T[]>(items);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  // Ref to track whether we're mid-drag (avoids stale closure issues)
  const isDraggingRef = useRef(false);

  // Sync orderedItems from prop changes when not dragging
  useEffect(() => {
    if (!isDraggingRef.current) {
      setOrderedItems(items);
    }
  }, [items]);

  // Map of key -> DOM element for rect measurement
  const itemEls = useRef<Map<string, HTMLElement>>(new Map());

  const dragStateRef = useRef<DragState | null>(null);
  // Keep a snapshot of ordered keys at drag start so we can reorder consistently
  const orderedItemsRef = useRef<T[]>(items);
  orderedItemsRef.current = orderedItems;

  // ── Compute which index the pointer is hovering over ──────────
  const computeDropIndex = useCallback((pointerY: number, dragKey: string): number => {
    const current = orderedItemsRef.current;

    // Build sorted list of { key, mid } for items other than dragged
    const mids: Array<{ key: string; origIdx: number; mid: number }> = [];
    current.forEach((item, idx) => {
      const key = getKey(item);
      if (key === dragKey) return;
      const el = itemEls.current.get(key);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      mids.push({ key, origIdx: idx, mid: (rect.top + rect.bottom) / 2 });
    });
    mids.sort((a, b) => a.mid - b.mid);

    const dragOrigIdx = current.findIndex(it => getKey(it) === dragKey);

    for (let i = 0; i < mids.length; i++) {
      if (pointerY < mids[i].mid) {
        // Insert before item at mids[i]
        const insertBefore = mids[i].origIdx;
        return insertBefore > dragOrigIdx ? insertBefore - 1 : insertBefore;
      }
    }
    return current.length - 1;
  }, [getKey]);

  // ── Start drag ────────────────────────────────────────────────
  const startDrag = useCallback((key: string, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const current = orderedItemsRef.current;
    const startIndex = current.findIndex(it => getKey(it) === key);
    if (startIndex === -1) return;

    // Capture the pointer so we receive events even outside the element
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // setPointerCapture can throw in some environments; safe to ignore
    }

    dragStateRef.current = {
      dragKey: key,
      startIndex,
      pointerId: e.pointerId,
    };

    // Drive the ghost element imperatively to avoid per-frame re-renders
    const draggedEl = itemEls.current.get(key);
    if (ghostRef?.current && draggedEl) {
      const rect = draggedEl.getBoundingClientRect();
      const offsetY = e.clientY - rect.top;
      const offsetX = e.clientX - rect.left;
      if (ghostOffsetRef) ghostOffsetRef.current = { x: offsetX, y: offsetY };
      ghostRef.current.style.top = `${e.clientY - offsetY}px`;
      ghostRef.current.style.left = `${rect.left}px`;
      ghostRef.current.style.width = `${rect.width}px`;
    }

    isDraggingRef.current = true;
    setDragId(key);
    setDropIndex(startIndex);
  }, [getKey]);

  // ── Window pointer listeners ──────────────────────────────────
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragStateRef.current) return;
      if (e.pointerId !== dragStateRef.current.pointerId) return;
      const idx = computeDropIndex(e.clientY, dragStateRef.current.dragKey);
      setDropIndex(idx);
      // Reposition ghost directly on the DOM element — no React re-render needed
      if (ghostRef?.current && ghostOffsetRef) {
        ghostRef.current.style.top = `${e.clientY - ghostOffsetRef.current.y}px`;
      }
    };

    const onUp = (e: PointerEvent) => {
      if (!dragStateRef.current) return;
      if (e.pointerId !== dragStateRef.current.pointerId) return;

      const { dragKey, startIndex } = dragStateRef.current;
      dragStateRef.current = null;
      isDraggingRef.current = false;

      setDragId(null);
      setDropIndex(null);

      const finalDrop = computeDropIndex(e.clientY, dragKey);
      if (finalDrop === startIndex) return;

      const newItems = [...orderedItemsRef.current];
      const fromIdx = newItems.findIndex(it => getKey(it) === dragKey);
      if (fromIdx === -1) return;

      const [removed] = newItems.splice(fromIdx, 1);
      // Re-compute insert position after splice
      const insertAt = Math.max(0, Math.min(finalDrop, newItems.length));
      newItems.splice(insertAt, 0, removed);

      setOrderedItems(newItems);
      onReorder(newItems);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [computeDropIndex, getKey, onReorder]);

  // ── getDragProps ──────────────────────────────────────────────
  const getDragProps = useCallback((item: T): DragSortItemProps => {
    const key = getKey(item);
    const isBeingDragged = dragId === key;

    return {
      draggable: false,
      'data-drag-id': key,
      ref: (el: HTMLElement | null) => {
        if (el) {
          itemEls.current.set(key, el);
        } else {
          itemEls.current.delete(key);
        }
      },
      style: {
        transition: isDraggingRef.current && !isBeingDragged ? 'transform 200ms ease' : 'none',
        opacity: isBeingDragged ? 0 : 1,
        position: 'relative',
        zIndex: isBeingDragged ? 10 : 'auto',
        // Keep a size-preserving placeholder — no shadow/box since item is invisible
        pointerEvents: isBeingDragged ? 'none' : 'auto',
      } as React.CSSProperties,
    };
  }, [dragId, getKey]);

  // ── getHandleProps ────────────────────────────────────────────
  const getHandleProps = useCallback((item: T): DragHandleProps => {
    const key = getKey(item);
    return {
      onPointerDown: (e: React.PointerEvent) => startDrag(key, e),
      style: {
        cursor: dragId !== null ? 'grabbing' : 'grab',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      } as React.CSSProperties,
    };
  }, [getKey, startDrag, dragId]);

  return {
    orderedItems,
    getDragProps,
    getHandleProps,
    isDragging: dragId !== null,
    dragId,
    dropIndex,
  };
}
