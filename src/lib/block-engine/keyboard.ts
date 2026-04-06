// ─────────────────────────────────────────────────────────────
// Pearloom / lib/block-engine/keyboard.ts
// Keyboard shortcuts for block manipulation.
//
// Shortcuts:
//   Delete / Backspace — Delete selected block
//   Cmd+D             — Duplicate selected block
//   Arrow Up          — Move selected block up
//   Arrow Down        — Move selected block down
//   Escape            — Deselect all blocks
//   Cmd+Shift+S       — Save snapshot
//   Cmd+Z             — Undo (handled by FullscreenEditor)
//   Cmd+Shift+Z       — Redo (handled by FullscreenEditor)
// ─────────────────────────────────────────────────────────────

import type { PageBlock } from '@/types';
import { duplicateBlock, deleteBlock, moveBlockUp, moveBlockDown } from './block-actions';

export type BlockKeyboardAction =
  | { type: 'duplicate'; blockId: string }
  | { type: 'delete'; blockId: string }
  | { type: 'moveUp'; blockId: string }
  | { type: 'moveDown'; blockId: string }
  | { type: 'deselect' }
  | { type: 'saveSnapshot' }
  | null;

/**
 * Map a keyboard event to a block action.
 * Returns null if the event doesn't match any shortcut.
 */
export function mapKeyToAction(
  e: KeyboardEvent,
  selectedBlockId: string | null,
): BlockKeyboardAction {
  const isMeta = e.metaKey || e.ctrlKey;

  // Ignore if focus is in an input/textarea/contentEditable
  const target = e.target as HTMLElement;
  if (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable
  ) {
    return null;
  }

  // Cmd+Shift+S — Save snapshot
  if (isMeta && e.shiftKey && e.key === 's') {
    e.preventDefault();
    return { type: 'saveSnapshot' };
  }

  // Escape — Deselect
  if (e.key === 'Escape') {
    return { type: 'deselect' };
  }

  // Block-specific shortcuts (require selection)
  if (!selectedBlockId) return null;

  // Delete / Backspace — Delete selected block
  if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault();
    return { type: 'delete', blockId: selectedBlockId };
  }

  // Cmd+D — Duplicate selected block
  if (isMeta && e.key === 'd') {
    e.preventDefault();
    return { type: 'duplicate', blockId: selectedBlockId };
  }

  // Arrow Up — Move block up
  if (e.key === 'ArrowUp' && !e.shiftKey) {
    e.preventDefault();
    return { type: 'moveUp', blockId: selectedBlockId };
  }

  // Arrow Down — Move block down
  if (e.key === 'ArrowDown' && !e.shiftKey) {
    e.preventDefault();
    return { type: 'moveDown', blockId: selectedBlockId };
  }

  return null;
}

/**
 * Apply a block keyboard action to the blocks array.
 * Returns the updated blocks array, or null if no change.
 */
export function applyBlockAction(
  blocks: PageBlock[],
  action: BlockKeyboardAction,
): PageBlock[] | null {
  if (!action) return null;

  switch (action.type) {
    case 'duplicate':
      return duplicateBlock(blocks, action.blockId);
    case 'delete':
      return deleteBlock(blocks, action.blockId);
    case 'moveUp':
      return moveBlockUp(blocks, action.blockId);
    case 'moveDown':
      return moveBlockDown(blocks, action.blockId);
    default:
      return null;
  }
}
