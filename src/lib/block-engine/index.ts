// ─────────────────────────────────────────────────────────────
// Pearloom / lib/block-engine/index.ts
// Block engine — schema-driven site rendering system.
//
// Core:
//   schema.ts       — block prop schemas (what's editable)
//   bindings.ts     — {{ variable }} resolver
//   template.ts     — Liquid-like template engine
//   registry.ts     — component registry (type → React component)
//
// Block operations:
//   block-actions.ts — duplicate, delete, reorder, style, snapshots
//   inline-edit.ts  — inline text editing via iframe postMessage
//   keyboard.ts     — keyboard shortcuts for block operations
//
// AI & Intelligence:
//   ai-blocks.ts    — AI block generation, content suggestions, auto-layout
//   templates.ts    — block template marketplace
//   integrations.ts — webhooks & external data connections
//   devices.ts      — responsive device presets
// ─────────────────────────────────────────────────────────────

// Core
export { BLOCK_SCHEMAS, type BlockSchema, type PropSchema, type PropType } from './schema';
export { buildContext, resolveBindings, resolveBlockConfig, hasBindings, extractBindings, type BindingContext } from './bindings';
export { renderTemplate } from './template';
export { registerBlock, getBlock, getRegisteredTypes, isRegistered, type BlockRenderProps, type RegisteredBlock } from './registry';

// Block operations
export {
  duplicateBlock, deleteBlock, moveBlockUp, moveBlockDown,
  toggleBlockVisibility, deleteBlocks, toggleBlocksVisibility,
  insertBlockAt, setBlockStyle, getBlockStyle,
  saveSnapshot, loadSnapshots, restoreSnapshot, deleteSnapshot,
  type BlockStyleOverrides, type VersionSnapshot,
} from './block-actions';
export { parseElementId, INLINE_EDIT_SCRIPT, type InlineEditEvent } from './inline-edit';
export { mapKeyToAction, applyBlockAction, type BlockKeyboardAction } from './keyboard';

// AI & Intelligence
export { generateBlockFromPrompt, suggestContent, suggestBlockOrder, suggestMissingBlocks } from './ai-blocks';
export { BLOCK_TEMPLATES, instantiateTemplate, searchTemplates, type BlockTemplate } from './templates';
export { INTEGRATION_PRESETS, getBlockIntegration, setBlockIntegration, fetchIntegrationData, applyIntegrationData, type BlockIntegration, type IntegrationType } from './integrations';
export { DEVICE_PRESETS, getPreset, getPresetsByCategory, type DevicePreset } from './devices';
