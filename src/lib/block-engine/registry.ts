// ─────────────────────────────────────────────────────────────
// Pearloom / lib/block-engine/registry.ts
// Component registry — maps block types to React components.
// The renderer uses this to look up components instead of a
// giant switch statement.
// ─────────────────────────────────────────────────────────────

import type { ComponentType } from 'react';
import type { PageBlock, StoryManifest } from '@/types';
import type { VibeSkin } from '@/lib/vibe-engine';
import type { BindingContext } from './bindings';

/**
 * Props passed to every block component by the renderer.
 */
export interface BlockRenderProps {
  /** The block's unique ID */
  blockId: string;
  /** Resolved config (bindings already resolved) */
  config: Record<string, unknown>;
  /** The full manifest (for blocks that need deep data) */
  manifest: StoryManifest;
  /** Couple names */
  names: [string, string];
  /** AI-generated visual skin */
  vibeSkin: VibeSkin;
  /** Color palette extracted from vibeSkin */
  palette: {
    background: string;
    foreground: string;
    accent: string;
    accentLight: string;
    muted: string;
    card: string;
  };
  /** Site domain/subdomain */
  siteId: string;
  /** Binding context for template rendering */
  context: BindingContext;
}

/**
 * A registered block component.
 * Can be a React component or a lazy-loaded component.
 */
export interface RegisteredBlock {
  /** The React component to render */
  component: ComponentType<BlockRenderProps>;
  /** Whether this block should be wrapped in a <section> tag */
  wrapInSection?: boolean;
  /** Default section background (CSS value) */
  sectionBackground?: string;
  /** Section ID for anchor links */
  sectionId?: string;
}

/**
 * The component registry — maps block type → component.
 * Start with an empty registry, components register themselves.
 */
const registry = new Map<string, RegisteredBlock>();

/**
 * Register a block component.
 */
export function registerBlock(type: string, block: RegisteredBlock): void {
  registry.set(type, block);
}

/**
 * Look up a block component by type.
 */
export function getBlock(type: string): RegisteredBlock | undefined {
  return registry.get(type);
}

/**
 * Get all registered block types.
 */
export function getRegisteredTypes(): string[] {
  return Array.from(registry.keys());
}

/**
 * Check if a block type is registered.
 */
export function isRegistered(type: string): boolean {
  return registry.has(type);
}
