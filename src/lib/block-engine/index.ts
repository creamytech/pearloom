// ─────────────────────────────────────────────────────────────
// Pearloom / lib/block-engine/index.ts
// Block engine — schema-driven site rendering system.
//
// Architecture:
//   schema.ts       — block prop schemas (what's editable)
//   bindings.ts     — {{ variable }} resolver (data interpolation)
//   template.ts     — Liquid-like template engine (conditionals + filters)
//   registry.ts     — component registry (type → React component)
//   block-actions.ts — block manipulation (duplicate, delete, reorder, style, snapshots)
//   inline-edit.ts  — inline text editing via iframe postMessage
//   keyboard.ts     — keyboard shortcuts for block operations
// ─────────────────────────────────────────────────────────────

export { BLOCK_SCHEMAS, type BlockSchema, type PropSchema, type PropType } from './schema';
export { buildContext, resolveBindings, resolveBlockConfig, hasBindings, extractBindings, type BindingContext } from './bindings';
export { renderTemplate } from './template';
export { registerBlock, getBlock, getRegisteredTypes, isRegistered, type BlockRenderProps, type RegisteredBlock } from './registry';
export {
  duplicateBlock, deleteBlock, moveBlockUp, moveBlockDown,
  toggleBlockVisibility, deleteBlocks, toggleBlocksVisibility,
  insertBlockAt, setBlockStyle, getBlockStyle,
  saveSnapshot, loadSnapshots, restoreSnapshot, deleteSnapshot,
  type BlockStyleOverrides, type VersionSnapshot,
} from './block-actions';
export { parseElementId, INLINE_EDIT_SCRIPT, type InlineEditEvent } from './inline-edit';
export { mapKeyToAction, applyBlockAction, type BlockKeyboardAction } from './keyboard';
