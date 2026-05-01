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

import { useEffect, useState, type ReactNode } from 'react';
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
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Icon } from '../motifs';

// V8 tone palette — mirrors BadgesEditor's tones so the inline
// composer in the bulk-tag bar paints the same colours hosts see
// elsewhere in the editor.
const TONE_SWATCH: Record<'peach' | 'sage' | 'lavender' | 'ink', { bg: string; fg: string }> = {
  peach:    { bg: 'rgba(198,112,61,0.18)',  fg: 'var(--peach-ink, #C6703D)' },
  sage:     { bg: 'rgba(123,138,93,0.22)',  fg: '#3D4A1F' },
  lavender: { bg: 'rgba(149,141,176,0.22)', fg: '#5C4F8C' },
  ink:      { bg: 'rgba(14,13,11,0.85)',    fg: '#FFFFFF' },
};

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
  /** Bulk-delete callback. When provided, the modal header
   *  surfaces a Select toggle; in select mode, sidebar tiles
   *  toggle membership instead of focusing, and a bottom action
   *  bar offers "Delete N" + "Cancel". May return a `restore`
   *  function — when provided, the shell shows a 6-second undo
   *  toast that calls it on click. Without restore, no toast. */
  onBulkDelete?: (ids: string[]) => void | (() => void);
  /** Bulk-tag callback. When provided alongside onBulkDelete, the
   *  bottom action bar gets a "Tag N" button that opens an inline
   *  picker (label + tone) and applies the chip to every selected
   *  row. Saves a lot of clicks for "mark these 4 hotels as
   *  Couple's pick". */
  onBulkTag?: (ids: string[], badge: { label: string; tone: 'peach' | 'sage' | 'lavender' | 'ink' }) => void;
  /** Optional search / add-row component pinned above the
   *  sidebar + editor so the host can grow the list without
   *  closing the modal. */
  searchSlot?: ReactNode;
  /** The focused row's editor. Rendered in the right pane. */
  editorSlot: ReactNode;
  onClose: () => void;
  /** Sidebar empty-state copy when the section has no rows yet. */
  emptyHint?: string;
  /** Layout mode. 'modal' (default) renders centered with a
   *  backdrop. 'panel' renders the same content as a docked
   *  panel inside its parent — used by the inspector pilot to
   *  test whether a wider inspector replaces the modal flow. */
  dock?: 'modal' | 'panel';
}

export function QuickEditModalShell({
  open,
  title,
  focusedTitle,
  items,
  focusedId,
  onFocusChange,
  onReorder,
  onBulkDelete,
  onBulkTag,
  searchSlot,
  editorSlot,
  onClose,
  emptyHint,
  dock = 'modal',
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  // Multi-select state. `selectMode` enables the per-tile checkbox
  // affordance and routes click → toggle instead of focus. Reset
  // every time the modal closes so a stale selection never leaks
  // into the next open.
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Bulk-tag inline picker state. When the host clicks "Tag N",
  // the action bar swaps to a label + tone composer.
  const [tagOpen, setTagOpen] = useState(false);
  const [tagDraft, setTagDraft] = useState('');
  const [tagTone, setTagTone] = useState<'peach' | 'sage' | 'lavender' | 'ink'>('peach');
  // Undo toast state. Bulk delete keeps the restore callback
  // from the section around for ~6s so the host can roll back.
  const [pendingUndo, setPendingUndo] = useState<{
    count: number;
    restore: () => void;
  } | null>(null);
  // Reset selection / tag state when the modal closes via
  // store-and-compare-prev (avoids a setState-in-effect cascade).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) {
      setSelectMode(false);
      setSelectedIds(new Set());
      setTagOpen(false);
      setTagDraft('');
      setPendingUndo(null);
    }
  }
  useEffect(() => {
    if (!pendingUndo) return;
    const t = setTimeout(() => setPendingUndo(null), 6000);
    return () => clearTimeout(t);
  }, [pendingUndo]);

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
  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }
  function handleBulkDelete() {
    if (!onBulkDelete || selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const restore = onBulkDelete(ids);
    if (typeof restore === 'function') {
      setPendingUndo({ count: ids.length, restore });
    }
    exitSelectMode();
  }
  function handleBulkTag() {
    if (!onBulkTag || selectedIds.size === 0) return;
    const label = tagDraft.trim();
    if (!label) return;
    onBulkTag(Array.from(selectedIds), { label, tone: tagTone });
    setTagDraft('');
    setTagOpen(false);
    exitSelectMode();
  }
  // Escape to close, freeze body scroll while open. Panel mode
  // skips the body-scroll lock — it lives inside its parent and
  // shouldn't trap the page's scroll.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    let restore: (() => void) | undefined;
    if (dock !== 'panel') {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      restore = () => { document.body.style.overflow = prevOverflow; };
    }
    return () => {
      document.removeEventListener('keydown', onKey);
      restore?.();
    };
  }, [open, onClose, dock]);

  if (!open) return null;

  // Layout: 'modal' centers a 960px card with a backdrop;
  // 'panel' renders the same content filling its parent container
  // (used when the host's inspector is wide enough to host the
  // editor inline — single source of UI between the two flows).
  const isPanel = dock === 'panel';
  // Re-enable pointer events on the panel-mode root. The parent
  // wrapper in EditorV8 sets pointerEvents:'none' on the absolute
  // container so a closed shell doesn't block clicks to the panel
  // beneath; when we ARE open, this opt-in restores interaction.
  const outerStyle: React.CSSProperties = isPanel
    ? { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, pointerEvents: 'auto' }
    : {
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
      };
  const innerStyle: React.CSSProperties = isPanel
    ? {
        width: '100%',
        height: '100%',
        flex: 1,
        background: 'var(--paper, #FBF7EE)',
        fontFamily: 'var(--font-ui)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }
    : {
        width: 'min(960px, 100%)',
        height: 'min(720px, 92vh)',
        background: 'var(--paper, #FBF7EE)',
        borderRadius: 18,
        boxShadow: '0 32px 80px rgba(14,13,11,0.42)',
        fontFamily: 'var(--font-ui)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        animation: 'pl8-quick-edit-rise 220ms cubic-bezier(0.22, 1, 0.36, 1)',
      };
  return (
    <div
      role={isPanel ? 'region' : 'dialog'}
      aria-modal={isPanel ? undefined : true}
      aria-label={`Edit ${title.toLowerCase()}`}
      style={outerStyle}
      onClick={isPanel ? undefined : (e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={innerStyle}>
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
          {/* Select toggle — only renders when the section
              supports bulk delete. Shows the active state in peach
              so the host can see they're in a different mode. */}
          {onBulkDelete && (
            <button
              type="button"
              onClick={() => {
                if (selectMode) exitSelectMode();
                else setSelectMode(true);
              }}
              aria-pressed={selectMode}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                height: 30,
                padding: '0 12px',
                borderRadius: 999,
                background: selectMode ? 'var(--peach-ink, #C6703D)' : 'transparent',
                color: selectMode ? '#FFFFFF' : 'var(--ink-soft)',
                border: selectMode ? '1.5px solid var(--peach-ink, #C6703D)' : '1.5px solid var(--line)',
                cursor: 'pointer',
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: '0.04em',
                fontFamily: 'var(--font-ui)',
                transition: 'background 160ms ease, color 160ms ease, border-color 160ms ease',
              }}
            >
              {selectMode ? `${selectedIds.size} selected` : 'Select'}
            </button>
          )}
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
              padding: isPanel ? '10px 14px' : '12px 20px',
              borderBottom: '1px solid var(--line-soft)',
              background: 'var(--cream-2, #F5EFE2)',
            }}
          >
            {searchSlot}
          </div>
        )}

        <div style={{ flex: 1, display: 'flex', flexDirection: isPanel ? 'column' : 'row', overflow: 'hidden' }}>
          {/* Sidebar — vertical column in modal mode, horizontal
              strip in panel mode so the editor pane gets the full
              inspector width below. */}
          <div
            style={{
              ...(isPanel
                ? {
                    width: '100%',
                    flexShrink: 0,
                    borderBottom: '1px solid var(--line-soft)',
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'var(--cream, #FBF7EE)',
                  }
                : {
                    width: 260,
                    flexShrink: 0,
                    borderRight: '1px solid var(--line-soft)',
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'var(--cream, #FBF7EE)',
                  }),
            }}
          >
            <div
              style={{
                ...(isPanel
                  ? { padding: '8px 12px', overflowX: 'auto', overflowY: 'hidden' }
                  : { flex: 1, overflowY: 'auto', padding: '12px 10px' }),
              }}
            >
              {!isPanel && (
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
              )}
              {items.length === 0 && emptyHint ? (
                <div
                  style={{
                    padding: isPanel ? '8px 4px' : 16,
                    fontSize: 12,
                    color: 'var(--ink-soft)',
                    lineHeight: 1.5,
                    textAlign: 'center',
                  }}
                >
                  {emptyHint}
                </div>
              ) : onReorder && !selectMode ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={items.map((it) => it.id)}
                    strategy={isPanel ? horizontalListSortingStrategy : verticalListSortingStrategy}
                  >
                    <div style={{ display: 'flex', flexDirection: isPanel ? 'row' : 'column', gap: isPanel ? 6 : 4 }}>
                      {items.map((it) => (
                        <SortableSidebarTile
                          key={it.id}
                          item={it}
                          active={it.id === focusedId}
                          compact={isPanel}
                          onClick={() => onFocusChange(it.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                <div style={{ display: 'flex', flexDirection: isPanel ? 'row' : 'column', gap: isPanel ? 6 : 4 }}>
                  {items.map((it) => (
                    <SidebarTile
                      key={it.id}
                      item={it}
                      active={it.id === focusedId}
                      selectMode={selectMode}
                      selected={selectedIds.has(it.id)}
                      compact={isPanel}
                      onClick={() => {
                        if (selectMode) toggleSelected(it.id);
                        else onFocusChange(it.id);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
            {/* Bottom action bar — slides up when ≥1 row is
                selected. Sticky to the sidebar so the host can
                scroll the list freely without losing the bar.
                Two modes: action chooser + tag composer. */}
            {selectMode && selectedIds.size > 0 && (onBulkDelete || onBulkTag) && (
              <div
                style={{
                  borderTop: '1px solid var(--line-soft)',
                  padding: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  background: 'var(--cream-2, #F5EFE2)',
                  animation: 'pl8-bulk-bar-rise 200ms cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              >
                {!tagOpen ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    {onBulkDelete && (
                      <button
                        type="button"
                        onClick={handleBulkDelete}
                        style={{
                          flex: onBulkTag ? 'unset' : 1,
                          padding: '9px 14px',
                          borderRadius: 999,
                          border: '1px solid rgba(122,45,45,0.3)',
                          background: 'var(--plum-ink, #7A2D2D)',
                          color: '#FFFFFF',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontFamily: 'var(--font-ui)',
                        }}
                      >
                        Delete {selectedIds.size}
                      </button>
                    )}
                    {onBulkTag && (
                      <button
                        type="button"
                        onClick={() => setTagOpen(true)}
                        style={{
                          flex: 1,
                          padding: '9px 14px',
                          borderRadius: 999,
                          border: '1px solid var(--peach-ink, #C6703D)',
                          background: 'var(--peach-ink, #C6703D)',
                          color: '#FFFFFF',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontFamily: 'var(--font-ui)',
                        }}
                      >
                        Tag {selectedIds.size}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={exitSelectMode}
                      style={{
                        padding: '9px 14px',
                        borderRadius: 999,
                        border: '1px solid var(--line)',
                        background: 'transparent',
                        color: 'var(--ink-soft)',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: 'var(--font-ui)',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      autoFocus
                      value={tagDraft}
                      onChange={(e) => setTagDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); handleBulkTag(); }
                        if (e.key === 'Escape') { e.preventDefault(); setTagOpen(false); }
                      }}
                      placeholder="Couple's pick, Group gift, Updated…"
                      maxLength={28}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: '1px solid var(--line)',
                        background: 'var(--card)',
                        fontSize: 12,
                        fontFamily: 'var(--font-ui)',
                        color: 'var(--ink)',
                        outline: 'none',
                      }}
                    />
                    <div style={{ display: 'flex', gap: 4 }}>
                      {(['peach', 'sage', 'lavender', 'ink'] as const).map((tone) => {
                        const swatch = TONE_SWATCH[tone];
                        const on = tagTone === tone;
                        return (
                          <button
                            key={tone}
                            type="button"
                            onClick={() => setTagTone(tone)}
                            aria-pressed={on}
                            title={tone[0].toUpperCase() + tone.slice(1)}
                            style={{
                              flex: 1,
                              height: 26,
                              borderRadius: 6,
                              background: swatch.bg,
                              border: on ? '1.5px solid var(--ink)' : '1px solid var(--line)',
                              cursor: 'pointer',
                              padding: 0,
                              display: 'grid',
                              placeItems: 'center',
                              color: swatch.fg,
                              fontSize: 9.5,
                              fontWeight: 700,
                              letterSpacing: '0.06em',
                              textTransform: 'uppercase',
                              fontFamily: 'var(--font-ui)',
                            }}
                          >
                            {tone}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        onClick={handleBulkTag}
                        disabled={!tagDraft.trim()}
                        style={{
                          flex: 1,
                          padding: '9px 14px',
                          borderRadius: 999,
                          border: 'none',
                          background: 'var(--ink, #0E0D0B)',
                          color: 'var(--cream, #FBF7EE)',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: tagDraft.trim() ? 'pointer' : 'not-allowed',
                          opacity: tagDraft.trim() ? 1 : 0.5,
                          fontFamily: 'var(--font-ui)',
                        }}
                      >
                        Tag {selectedIds.size}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setTagOpen(false); setTagDraft(''); }}
                        style={{
                          padding: '9px 14px',
                          borderRadius: 999,
                          border: '1px solid var(--line)',
                          background: 'transparent',
                          color: 'var(--ink-soft)',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontFamily: 'var(--font-ui)',
                        }}
                      >
                        Back
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Editor pane */}
          <div style={{ flex: 1, overflowY: 'auto', padding: isPanel ? '14px 16px' : '20px 24px', minWidth: 0 }}>
            {editorSlot}
          </div>
        </div>

        {/* Undo toast — stays for 6s after a bulk delete with an
            available restore callback. Editorial paper pill at the
            bottom centre, peach Undo button. Click outside or wait
            6s and the toast dismisses. */}
        {pendingUndo && (
          <div
            role="status"
            aria-live="polite"
            style={{
              position: 'absolute',
              bottom: 18,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 14px 10px 18px',
              background: 'var(--ink, #0E0D0B)',
              color: 'var(--cream, #FBF7EE)',
              borderRadius: 999,
              boxShadow: '0 14px 36px rgba(14,13,11,0.42)',
              animation: 'pl8-undo-rise 220ms cubic-bezier(0.22, 1, 0.36, 1)',
              fontFamily: 'var(--font-ui)',
              fontSize: 12.5,
              fontWeight: 600,
              zIndex: 5,
            }}
          >
            Removed {pendingUndo.count}
            <button
              type="button"
              onClick={() => {
                pendingUndo.restore();
                setPendingUndo(null);
              }}
              style={{
                padding: '4px 12px',
                borderRadius: 999,
                background: 'var(--peach-ink, #C6703D)',
                color: '#FFFFFF',
                border: 'none',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                fontFamily: 'var(--font-ui)',
              }}
            >
              Undo
            </button>
            <button
              type="button"
              onClick={() => setPendingUndo(null)}
              aria-label="Dismiss"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--cream, #FBF7EE)',
                opacity: 0.6,
                fontSize: 14,
                cursor: 'pointer',
                padding: 2,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
        )}
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
        @keyframes pl8-bulk-bar-rise {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pl8-undo-rise {
          from { opacity: 0; transform: translate(-50%, 12px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  );
}

function SidebarTile({
  item,
  active,
  selectMode = false,
  selected = false,
  compact = false,
  onClick,
}: {
  item: QuickEditModalItem;
  active: boolean;
  selectMode?: boolean;
  selected?: boolean;
  compact?: boolean;
  onClick: () => void;
}) {
  // In select mode the visual hierarchy flips — the checkbox state
  // controls the peach edge, focused-row highlight goes muted.
  const showActive = !selectMode && active;
  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={item.label}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 10px 6px 6px',
          borderRadius: 999,
          border: selected
            ? '1.5px solid var(--peach-ink, #C6703D)'
            : showActive ? '1.5px solid var(--peach-ink, #C6703D)' : '1px solid var(--line)',
          background: selected
            ? 'rgba(198,112,61,0.12)'
            : showActive ? 'rgba(198,112,61,0.08)' : 'var(--cream-2, #F5EFE2)',
          color: 'var(--ink)',
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: 'var(--font-ui)',
          flexShrink: 0,
          maxWidth: 160,
          transition: 'background 140ms ease, border-color 140ms ease',
        }}
      >
        <div
          aria-hidden
          style={{
            width: 22,
            height: 22,
            flexShrink: 0,
            borderRadius: 999,
            background: item.photoUrl
              ? `url(${item.photoUrl}) center/cover no-repeat var(--cream-2)`
              : 'var(--cream, #FBF7EE)',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--ink-muted)',
          }}
        >
          {!item.photoUrl && <Icon name={item.icon ?? 'star'} size={11} />}
        </div>
        <span
          style={{
            fontSize: 11.5,
            fontWeight: 700,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {item.label || 'Untitled'}
        </span>
      </button>
    );
  }
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
        border: selected
          ? '1.5px solid var(--peach-ink, #C6703D)'
          : showActive ? '1.5px solid var(--peach-ink, #C6703D)' : '1px solid transparent',
        background: selected
          ? 'rgba(198,112,61,0.12)'
          : showActive ? 'rgba(198,112,61,0.08)' : 'transparent',
        color: 'var(--ink)',
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
        fontFamily: 'var(--font-ui)',
        transition: 'background 140ms ease, border-color 140ms ease',
      }}
      onMouseEnter={(e) => {
        if (!selected && !showActive) e.currentTarget.style.background = 'var(--cream-2, #F5EFE2)';
      }}
      onMouseLeave={(e) => {
        if (!selected && !showActive) e.currentTarget.style.background = 'transparent';
      }}
      onFocus={(e) => {
        if (!selected && !showActive) e.currentTarget.style.background = 'var(--cream-2, #F5EFE2)';
      }}
      onBlur={(e) => {
        if (!selected && !showActive) e.currentTarget.style.background = 'transparent';
      }}
    >
      {selectMode && (
        <span
          aria-hidden
          style={{
            width: 18,
            height: 18,
            flexShrink: 0,
            borderRadius: 4,
            border: selected ? '1.5px solid var(--peach-ink, #C6703D)' : '1.5px solid var(--line)',
            background: selected ? 'var(--peach-ink, #C6703D)' : 'transparent',
            display: 'grid',
            placeItems: 'center',
            color: '#FFFFFF',
            transition: 'background 140ms ease, border-color 140ms ease',
          }}
        >
          {selected && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </span>
      )}
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
  compact = false,
  onClick,
}: {
  item: QuickEditModalItem;
  active: boolean;
  compact?: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, setActivatorNodeRef } = useSortable({ id: item.id });
  if (compact) {
    return (
      <div
        ref={setNodeRef}
        style={{
          position: 'relative',
          transform: CSS.Transform.toString(transform),
          transition,
          opacity: isDragging ? 0.45 : 1,
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={onClick}
          {...attributes}
          {...listeners}
          ref={setActivatorNodeRef}
          title={item.label}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 10px 6px 6px',
            borderRadius: 999,
            border: active ? '1.5px solid var(--peach-ink, #C6703D)' : '1px solid var(--line)',
            background: active ? 'rgba(198,112,61,0.08)' : 'var(--cream-2, #F5EFE2)',
            color: 'var(--ink)',
            cursor: 'pointer',
            textAlign: 'left',
            fontFamily: 'var(--font-ui)',
            maxWidth: 160,
            touchAction: 'none',
            transition: 'background 140ms ease, border-color 140ms ease',
          }}
        >
          <div
            aria-hidden
            style={{
              width: 22,
              height: 22,
              flexShrink: 0,
              borderRadius: 999,
              background: item.photoUrl
                ? `url(${item.photoUrl}) center/cover no-repeat var(--cream-2)`
                : 'var(--cream, #FBF7EE)',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--ink-muted)',
            }}
          >
            {!item.photoUrl && <Icon name={item.icon ?? 'star'} size={11} />}
          </div>
          <span
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {item.label || 'Untitled'}
          </span>
        </button>
      </div>
    );
  }
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
        onFocus={(e) => {
          if (!active) e.currentTarget.style.background = 'var(--cream-2, #F5EFE2)';
        }}
        onBlur={(e) => {
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
