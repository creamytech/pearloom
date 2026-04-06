// ─────────────────────────────────────────────────────────────
// Pearloom / lib/block-engine/index.ts
// Block engine — schema-driven site rendering system.
//
// Architecture:
//   schema.ts    — block prop schemas (what's editable)
//   bindings.ts  — {{ variable }} resolver (data interpolation)
//   template.ts  — Liquid-like template engine (conditionals + filters)
//   registry.ts  — component registry (type → React component)
//
// Usage:
//   import { BLOCK_SCHEMAS, resolveBlockConfig, renderTemplate, buildContext } from '@/lib/block-engine';
// ─────────────────────────────────────────────────────────────

export { BLOCK_SCHEMAS, type BlockSchema, type PropSchema, type PropType } from './schema';
export { buildContext, resolveBindings, resolveBlockConfig, hasBindings, extractBindings, type BindingContext } from './bindings';
export { renderTemplate } from './template';
export { registerBlock, getBlock, getRegisteredTypes, isRegistered, type BlockRenderProps, type RegisteredBlock } from './registry';
