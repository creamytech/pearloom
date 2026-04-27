// ──────────────────────────────────────────────────────────────
// Pearloom / lib/block-engine/block-styles.ts
//
// Block-style variant registry. Generalises what was a hardcoded
// `manifest.layoutFormat` (story) and the implicit single-hero
// layout (in HeroSection) into a single extensible system.
//
// Adding a new variant:
//   1. Build the variant component (consumes the variant's
//      props interface + reads from manifest).
//   2. registerBlockStyle({ blockType, id, label, ..., Component })
//      from a module that the editor + renderer both import.
//   3. The Inspector picker auto-discovers it via getBlockStyles().
//
// Tier gating is enforced by getBlockStyles() (filters out
// higher-tier variants for free users) so adding paid variants
// is just a `tier: 'atelier'` flag — no editor changes needed.
// ──────────────────────────────────────────────────────────────

import type { ComponentType, ReactNode } from 'react';

export type BlockStyleTier = 'free' | 'atelier' | 'legacy';

/** A variant declaration. The Component is rendered with whatever
 *  props the host block provides; the registry doesn't enforce a
 *  shape so different block types can have different prop signatures. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface BlockStyleVariant<P = any> {
  /** Block type this variant belongs to (e.g. 'hero', 'story', 'rsvp'). */
  blockType: string;
  /** Stable identifier — what gets stored in manifest.blockStyles[blockType].style. */
  id: string;
  /** UI label for the picker. */
  label: string;
  /** One-line description for the picker hover. */
  description: string;
  /** Mini SVG preview shown in the picker card. */
  preview: ReactNode;
  /** The actual variant renderer. */
  Component: ComponentType<P>;
  /** Default option values — passed to Component when manifest doesn't
   *  carry per-variant overrides. */
  defaultOptions?: Record<string, unknown>;
  /** Plan tier required to use this variant. Default 'free'. */
  tier?: BlockStyleTier;
  /** Free-form tags for filtering / search ('photo-heavy', 'minimal'). */
  tags?: string[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const REGISTRY = new Map<string, Map<string, BlockStyleVariant<any>>>();

/** Register a variant. Called at module-import time from each
 *  variant's source file (or a barrel). Re-registering the same
 *  (blockType, id) pair is allowed — the new entry wins (useful
 *  for live-reload + tests). */
export function registerBlockStyle<P>(v: BlockStyleVariant<P>): void {
  let bucket = REGISTRY.get(v.blockType);
  if (!bucket) {
    bucket = new Map();
    REGISTRY.set(v.blockType, bucket);
  }
  bucket.set(v.id, v);
}

/** All registered variants for a block type. Order is insertion
 *  order — register the default first. */
export function getBlockStyles(
  blockType: string,
  opts: { tier?: BlockStyleTier } = {},
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): BlockStyleVariant<any>[] {
  const bucket = REGISTRY.get(blockType);
  if (!bucket) return [];
  const tier = opts.tier ?? 'legacy'; // legacy/atelier sees everything
  return Array.from(bucket.values()).filter((v) => {
    const variantTier = v.tier ?? 'free';
    if (variantTier === 'free') return true;
    if (variantTier === 'atelier') return tier === 'atelier' || tier === 'legacy';
    if (variantTier === 'legacy') return tier === 'legacy';
    return false;
  });
}

/** Look up a single variant. Returns undefined if not registered. */
export function getBlockStyle(
  blockType: string,
  id: string,
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): BlockStyleVariant<any> | undefined {
  return REGISTRY.get(blockType)?.get(id);
}

/** True when at least one non-default variant exists for the type. */
export function hasMultipleStyles(blockType: string): boolean {
  const bucket = REGISTRY.get(blockType);
  return Boolean(bucket && bucket.size > 1);
}
