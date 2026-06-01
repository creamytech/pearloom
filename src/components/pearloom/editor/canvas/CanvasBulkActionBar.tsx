'use client';

// ─────────────────────────────────────────────────────────────
// CanvasBulkActionBar — floating "you have 3 sections selected"
// pill at the bottom of the canvas in edit mode. Surfaces only
// when 2+ blocks are selected; offers:
//   • Apply scene preset (Letterpress, Carved, Scrapbook, Linen,
//     Slate, Vellum) to all selected sections at once.
//   • Hide all selected.
//   • Clear selection.
//
// Reads selection state from EditorCanvasContext (already wired
// at the SiteV8Renderer root; multi-select via shift/cmd-click on
// CanvasBlockSortable). Writes via the same onEditField patcher
// so undo/redo works without special-casing.
// ─────────────────────────────────────────────────────────────

import { useEditorCanvas } from './EditorCanvasContext';
import { SCENES } from '../panels/BlockStylePanel';
import type { StoryManifest, BlockStyleOverride } from '@/types';

export function CanvasBulkActionBar() {
  const { editMode, selectedBlockIds, clearSelection, onEditField } = useEditorCanvas();
  if (!editMode) return null;
  const selected = selectedBlockIds ?? [];
  if (selected.length < 2) return null;

  function applyPresetToAll(scene: typeof SCENES[number]) {
    if (!onEditField) return;
    onEditField((m) => {
      const styles = ((m as unknown as { blockStyles?: Record<string, BlockStyleOverride> }).blockStyles) ?? {};
      const next = { ...styles };
      for (const id of selected) {
        // Map outline keys to renderer section ids (story → our-story).
        const sectionId = id === 'story' ? 'our-story' : id;
        next[sectionId] = { ...(next[sectionId] ?? {}), ...scene.apply };
      }
      return { ...m, blockStyles: next } as StoryManifest;
    });
  }

  function hideAll() {
    if (!onEditField) return;
    onEditField((m) => {
      const cur = ((m as unknown as { hiddenBlocks?: string[] }).hiddenBlocks) ?? [];
      const idsToHide = selected.map((k) => (k === 'story' ? 'our-story' : k));
      const merged = Array.from(new Set([...cur, ...idsToHide]));
      return { ...m, hiddenBlocks: merged } as StoryManifest;
    });
    clearSelection?.();
  }

  return (
    <div
      role="toolbar"
      aria-label="Bulk actions for selected sections"
      className="pl8-canvas-bulk-bar"
      style={{
        position: 'fixed',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 6px 6px 14px',
        borderRadius: 999,
        background: 'rgba(14,13,11,0.92)',
        backdropFilter: 'blur(14px) saturate(160%)',
        WebkitBackdropFilter: 'blur(14px) saturate(160%)',
        boxShadow: '0 24px 48px -16px rgba(14,13,11,0.5), 0 12px 24px -10px rgba(14,13,11,0.32)',
        color: 'rgba(243,233,212,0.96)',
        fontFamily: 'var(--font-ui)',
        fontSize: 11.5,
        fontWeight: 700,
        letterSpacing: '0.04em',
        animation: 'pl-bulk-bar-rise 220ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <span style={{ paddingRight: 4, color: 'rgba(243,233,212,0.74)', whiteSpace: 'nowrap' }}>
        {selected.length} selected
      </span>
      <span aria-hidden style={{ width: 1, height: 18, background: 'rgba(243,233,212,0.16)', margin: '0 2px' }} />
      <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(243,233,212,0.62)', padding: '0 4px' }}>
        Apply
      </span>
      {SCENES.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => applyPresetToAll(s)}
          title={s.hint}
          style={pillBtn}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(243,233,212,0.18)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          {s.label}
        </button>
      ))}
      <span aria-hidden style={{ width: 1, height: 18, background: 'rgba(243,233,212,0.16)', margin: '0 2px' }} />
      <button
        type="button"
        onClick={hideAll}
        aria-label="Hide all selected sections"
        title="Hide all selected sections"
        style={{ ...pillBtn, color: '#FCA5A5' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.18)'; e.currentTarget.style.color = '#FECACA'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#FCA5A5'; }}
      >
        Hide
      </button>
      <button
        type="button"
        onClick={() => clearSelection?.()}
        aria-label="Clear selection (Esc)"
        title="Clear selection (Esc)"
        style={{
          width: 28, height: 28,
          borderRadius: 999,
          border: 'none',
          background: 'transparent',
          color: 'rgba(243,233,212,0.7)',
          cursor: 'pointer',
          display: 'grid',
          placeItems: 'center',
          fontSize: 14,
          marginLeft: 2,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(243,233,212,1)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(243,233,212,0.7)'; }}
      >
        ×
      </button>
    </div>
  );
}

const pillBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '6px 11px',
  borderRadius: 999,
  background: 'transparent',
  color: 'inherit',
  border: 'none',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.04em',
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'background-color var(--pl-dur-fast) var(--pl-ease-out), color var(--pl-dur-fast) var(--pl-ease-out)',
};
