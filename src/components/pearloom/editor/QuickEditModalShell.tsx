'use client';

// ─────────────────────────────────────────────────────────────
// QuickEditModalShell — paper-styled modal frame shared by every
// section's "click on canvas → open a wider editor" flow:
// HotelQuickEditModal, FaqQuickEditModal, ScheduleQuickEditModal,
// RegistryQuickEditModal. Each section just provides:
//
//   • title             — section name ("Places to stay", "FAQ"…)
//   • focusedTitle      — the row's primary label
//   • items             — sidebar list shape
//   • focusedId         — which row the editor pane shows
//   • onFocusChange     — switching focus inside the modal
//   • onReorder?        — drag-to-reorder callback, optional
//   • searchSlot?       — top "Add another …" affordance
//   • editorSlot        — the focused row's full editor
//   • onClose           — host pressed × or escape or backdrop
//
// The shell handles: frame, header, close, escape, body scroll
// lock, sidebar tile chrome, animated open. Each section keeps
// its own data plumbing — the shell is purely presentational.
// ─────────────────────────────────────────────────────────────

import { useEffect, type ReactNode } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
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
import { Icon } from '../motifs';

export interface QuickEditModalItem {
  id: string;
  label: string;
  sublabel?: string;
  /** Optional thumbnail URL — falls back to an icon glyph. */
  photoUrl?: string;
  /** Optional inline icon to render when there's no photo. */
  icon?: string;
}

interface Props {
  open: boolean;
  /** Section title — displayed in the header eyebrow. */
  title: string;
  /** Focused row's primary label — displayed as the modal's
   *  display heading next to the eyebrow. */
  focusedTitle: string;
  /** Sidebar items. The shell renders them as clickable tiles. */
  items: QuickEditModalItem[];
  focusedId: string | null;
  onFocusChange: (id: string) => void;
  /** Drag-to-reorder callback. Receives the visible array in
   *  the new order. When provided, sidebar tiles get a small
   *  grip glyph + dnd-kit wiring. */
  onReorder?: (orderedIds: string[]) => void;
  /** Optional search / add-row component pinned above the
   *  sidebar + editor so the host can grow the list without
   *  closing the modal. */
  searchSlot?: ReactNode;
  /** The focused row's editor. Rendered in the right pane. */
  editorSlot: ReactNode;
  onClose: () => void;
  /** Sidebar empty-state copy when the section has no rows yet. */
  emptyHint?: string;
}

export function QuickEditModalShell({
  open,
  title,
  focusedTitle,
  items,
  focusedId,
  onFocusChange,
  onReorder,
  searchSlot,
  editorSlot,
  onClose,
  emptyHint,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  function handleDragEnd(e: DragEndEvent) {
    if (!onReorder) return;
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = items.findIndex((it) => it.id === active.id);
    const to = items.findIndex((it) => it.id === over.id);
    if (from < 0 || to < 0) return;
    const next = arrayMove(items, from, to);
    onReorder(next.map((it) => it.id));
  }
  // Escape to close, freeze body scroll while open.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label={`Edit ${title.toLowerCase()}`}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(14,13,11,0.55)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 360,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        animation: 'pl8-quick-edit-fade 180ms ease-out',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: 'min(960px, 100%)',
          height: 'min(720px, 92vh)',
          background: 'var(--paper, #FBF7EE)',
          borderRadius: 18,
          boxShadow: '0 32px 80px rgba(14,13,11,0.42)',
          fontFamily: 'var(--font-ui)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'pl8-quick-edit-rise 220ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '16px 20px',
            borderBottom: '1px solid var(--line-soft)',
            background: 'var(--cream, #FBF7EE)',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              className="eyebrow"
              style={{
                color: 'var(--peach-ink, #C6703D)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
              }}
            >
              {title}
            </div>
            <h2
              className="display"
              style={{
                fontSize: 22,
                margin: 0,
                color: 'var(--ink)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {focusedTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 30, height: 30, borderRadius: 999,
              background: 'transparent',
              border: '1.5px solid var(--line)',
              cursor: 'pointer',
              fontSize: 16,
              color: 'var(--ink)',
            }}
          >
            ×
          </button>
        </div>

        {/* Optional search row */}
        {searchSlot && (
          <div
            style={{
              padding: '12px 20px',
              borderBottom: '1px solid var(--line-soft)',
              background: 'var(--cream-2, #F5EFE2)',
            }}
          >
            {searchSlot}
          </div>
        )}

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Sidebar */}
          <div
            style={{
              width: 260,
              flexShrink: 0,
              borderRight: '1px solid var(--line-soft)',
              overflowY: 'auto',
              padding: '12px 10px',
              background: 'var(--cream, #FBF7EE)',
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.18em',
                color: 'var(--ink-muted)',
                textTransform: 'uppercase',
                padding: '4px 8px 8px',
              }}
            >
              {title} · {items.length}
            </div>
            {items.length === 0 && emptyHint ? (
              <div
                style={{
                  padding: 16,
                  fontSize: 12,
                  color: 'var(--ink-soft)',
                  lineHeight: 1.5,
                  textAlign: 'center',
                }}
              >
                {emptyHint}
              </div>
            ) : onReorder ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={items.map((it) => it.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {items.map((it) => (
                      <SortableSidebarTile
                        key={it.id}
                        item={it}
                        active={it.id === focusedId}
                        onClick={() => onFocusChange(it.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {items.map((it) => (
                  <SidebarTile
                    key={it.id}
                    item={it}
                    active={it.id === focusedId}
                    onClick={() => onFocusChange(it.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Editor pane */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
            {editorSlot}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes pl8-quick-edit-fade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes pl8-quick-edit-rise {
          from { opacity: 0; transform: translateY(12px) scale(0.985); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

function SidebarTile({
  item,
  active,
  onClick,
}: {
  item: QuickEditModalItem;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 10px',
        borderRadius: 10,
        border: active ? '1.5px solid var(--peach-ink, #C6703D)' : '1px solid transparent',
        background: active ? 'rgba(198,112,61,0.08)' : 'transparent',
        color: 'var(--ink)',
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
        fontFamily: 'var(--font-ui)',
        transition: 'background 140ms ease, border-color 140ms ease',
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = 'var(--cream-2, #F5EFE2)';
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = 'transparent';
      }}
    >
      <div
        aria-hidden
        style={{
          width: 36,
          height: 36,
          flexShrink: 0,
          borderRadius: 8,
          background: item.photoUrl
            ? `url(${item.photoUrl}) center/cover no-repeat var(--cream-2)`
            : 'var(--cream-2, #F5EFE2)',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--ink-muted)',
        }}
      >
        {!item.photoUrl && <Icon name={item.icon ?? 'star'} size={14} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 12.5,
            fontWeight: 700,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {item.label || 'Untitled'}
        </div>
        {item.sublabel && (
          <div
            style={{
              fontSize: 10.5,
              color: 'var(--ink-soft)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {item.sublabel}
          </div>
        )}
      </div>
    </button>
  );
}

// Sortable variant of SidebarTile. Wraps the same chrome but adds
// dnd-kit's setNodeRef + transform + a small grip glyph anchored
// to the right edge that the host can drag without losing the
// click-to-focus behaviour on the rest of the tile.
function SortableSidebarTile({
  item,
  active,
  onClick,
}: {
  item: QuickEditModalItem;
  active: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, setActivatorNodeRef } = useSortable({ id: item.id });
  return (
    <div
      ref={setNodeRef}
      style={{
        position: 'relative',
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
      }}
    >
      <button
        type="button"
        onClick={onClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 30px 10px 10px',
          borderRadius: 10,
          border: active ? '1.5px solid var(--peach-ink, #C6703D)' : '1px solid transparent',
          background: active ? 'rgba(198,112,61,0.08)' : 'transparent',
          color: 'var(--ink)',
          cursor: 'pointer',
          textAlign: 'left',
          width: '100%',
          fontFamily: 'var(--font-ui)',
          transition: 'background 140ms ease, border-color 140ms ease',
        }}
        onMouseEnter={(e) => {
          if (!active) e.currentTarget.style.background = 'var(--cream-2, #F5EFE2)';
        }}
        onMouseLeave={(e) => {
          if (!active) e.currentTarget.style.background = 'transparent';
        }}
      >
        <div
          aria-hidden
          style={{
            width: 36,
            height: 36,
            flexShrink: 0,
            borderRadius: 8,
            background: item.photoUrl
              ? `url(${item.photoUrl}) center/cover no-repeat var(--cream-2)`
              : 'var(--cream-2, #F5EFE2)',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--ink-muted)',
          }}
        >
          {!item.photoUrl && <Icon name={item.icon ?? 'star'} size={14} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 12.5,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {item.label || 'Untitled'}
          </div>
          {item.sublabel && (
            <div
              style={{
                fontSize: 10.5,
                color: 'var(--ink-soft)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {item.sublabel}
            </div>
          )}
        </div>
      </button>
      {/* Grip handle — sits at the right edge over the click
          target so dragging starts here and clicks elsewhere on
          the tile still focus. */}
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        style={{
          position: 'absolute',
          top: '50%',
          right: 6,
          transform: 'translateY(-50%)',
          width: 22,
          height: 22,
          padding: 0,
          background: 'transparent',
          border: 'none',
          color: 'var(--ink-muted)',
          cursor: 'grab',
          display: 'grid',
          placeItems: 'center',
          opacity: 0.55,
          touchAction: 'none',
        }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <circle cx="9" cy="6" r="1.4" />
          <circle cx="15" cy="6" r="1.4" />
          <circle cx="9" cy="12" r="1.4" />
          <circle cx="15" cy="12" r="1.4" />
          <circle cx="9" cy="18" r="1.4" />
          <circle cx="15" cy="18" r="1.4" />
        </svg>
      </button>
    </div>
  );
}
