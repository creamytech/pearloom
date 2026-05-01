// ─────────────────────────────────────────────────────────────
// Pearloom / lib/block-engine/block-actions.ts
// Block manipulation actions — duplicate, delete, reorder,
// multi-select, style overrides, version snapshots.
// Pure functions that operate on manifest.blocks.
// ─────────────────────────────────────────────────────────────

import type { PageBlock, StoryManifest } from '@/types';

/**
 * Per-block style overrides — configurable background, padding,
 * border-radius, text color, font override per block.
 */
export interface BlockStyleOverrides {
  backgroundColor?: string;
  textColor?: string;
  paddingTop?: string;
  paddingBottom?: string;
  borderRadius?: string;
  fontHeadingOverride?: string;
  fontBodyOverride?: string;
  opacity?: number;
  maxWidth?: string;
}

/**
 * Version snapshot — saved state of the manifest at a point in time.
 */
export interface VersionSnapshot {
  id: string;
  timestamp: number;
  label: string;
  manifest: StoryManifest;
}

// ── Block duplication ────────────────────────────────────────

export function duplicateBlock(blocks: PageBlock[], blockId: string): PageBlock[] {
  const idx = blocks.findIndex(b => b.id === blockId);
  if (idx < 0) return blocks;

  const source = blocks[idx];
  const clone: PageBlock = {
    ...source,
    id: `${source.type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    config: source.config ? { ...source.config } : undefined,
    order: source.order + 1,
  };

  // Insert after source and reindex
  const result = [...blocks];
  result.splice(idx + 1, 0, clone);
  return result.map((b, i) => ({ ...b, order: i }));
}

// ── Block deletion ───────────────────────────────────────────

export function deleteBlock(blocks: PageBlock[], blockId: string): PageBlock[] {
  return blocks.filter(b => b.id !== blockId).map((b, i) => ({ ...b, order: i }));
}

// ── Block reorder (move up/down) ─────────────────────────────

export function moveBlockUp(blocks: PageBlock[], blockId: string): PageBlock[] {
  const sorted = [...blocks].sort((a, b) => a.order - b.order);
  const idx = sorted.findIndex(b => b.id === blockId);
  if (idx <= 0) return blocks;

  [sorted[idx - 1], sorted[idx]] = [sorted[idx], sorted[idx - 1]];
  return sorted.map((b, i) => ({ ...b, order: i }));
}

export function moveBlockDown(blocks: PageBlock[], blockId: string): PageBlock[] {
  const sorted = [...blocks].sort((a, b) => a.order - b.order);
  const idx = sorted.findIndex(b => b.id === blockId);
  if (idx < 0 || idx >= sorted.length - 1) return blocks;

  [sorted[idx], sorted[idx + 1]] = [sorted[idx + 1], sorted[idx]];
  return sorted.map((b, i) => ({ ...b, order: i }));
}

// ── Block visibility toggle ──────────────────────────────────

export function toggleBlockVisibility(blocks: PageBlock[], blockId: string): PageBlock[] {
  return blocks.map(b =>
    b.id === blockId ? { ...b, visible: b.visible === false ? true : false } : b
  );
}

// ── Multi-block operations ───────────────────────────────────

export function deleteBlocks(blocks: PageBlock[], blockIds: string[]): PageBlock[] {
  const idSet = new Set(blockIds);
  return blocks.filter(b => !idSet.has(b.id)).map((b, i) => ({ ...b, order: i }));
}

export function toggleBlocksVisibility(blocks: PageBlock[], blockIds: string[], visible: boolean): PageBlock[] {
  const idSet = new Set(blockIds);
  return blocks.map(b => idSet.has(b.id) ? { ...b, visible } : b);
}

// ── Block insertion at position ──────────────────────────────

export function insertBlockAt(
  blocks: PageBlock[],
  type: string,
  position: number,
  config?: Record<string, unknown>,
): PageBlock[] {
  const newBlock: PageBlock = {
    id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: type as PageBlock['type'],
    order: position,
    visible: true,
    config,
  };

  const sorted = [...blocks].sort((a, b) => a.order - b.order);
  sorted.splice(position, 0, newBlock);
  return sorted.map((b, i) => ({ ...b, order: i }));
}

// ── Per-block style overrides ────────────────────────────────

export function setBlockStyle(
  blocks: PageBlock[],
  blockId: string,
  style: BlockStyleOverrides,
): PageBlock[] {
  return blocks.map(b => {
    if (b.id !== blockId) return b;
    return {
      ...b,
      config: {
        ...(b.config || {}),
        _style: style,
      },
    };
  });
}

export function getBlockStyle(block: PageBlock): BlockStyleOverrides {
  return (block.config?._style as BlockStyleOverrides) || {};
}

// ── Version snapshots ────────────────────────────────────────

const MAX_SNAPSHOTS = 20;
const LEGACY_KEY = 'pearloom-version-snapshots';

function storageKey(siteId?: string): string {
  return siteId ? `pearloom-version-snapshots:${siteId}` : LEGACY_KEY;
}

// One-time migration: legacy global snapshots → first-seen siteId bucket.
function migrateLegacy(siteId?: string) {
  if (!siteId || typeof localStorage === 'undefined') return;
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (!legacy) return;
    const target = storageKey(siteId);
    if (!localStorage.getItem(target)) {
      localStorage.setItem(target, legacy);
    }
    localStorage.removeItem(LEGACY_KEY);
  } catch {}
}

export function saveSnapshot(manifest: StoryManifest, label: string, siteId?: string): VersionSnapshot {
  const snapshot: VersionSnapshot = {
    id: `snap-${Date.now()}`,
    timestamp: Date.now(),
    label,
    manifest: JSON.parse(JSON.stringify(manifest)),
  };

  try {
    migrateLegacy(siteId);
    const existing = loadSnapshots(siteId);
    const updated = [snapshot, ...existing].slice(0, MAX_SNAPSHOTS);
    localStorage.setItem(storageKey(siteId), JSON.stringify(updated));
  } catch {}

  return snapshot;
}

export function loadSnapshots(siteId?: string): VersionSnapshot[] {
  try {
    migrateLegacy(siteId);
    const raw = localStorage.getItem(storageKey(siteId));
    if (!raw) return [];
    return JSON.parse(raw) as VersionSnapshot[];
  } catch {
    return [];
  }
}

export function restoreSnapshot(snapshotId: string, siteId?: string): StoryManifest | null {
  const snapshots = loadSnapshots(siteId);
  const snap = snapshots.find(s => s.id === snapshotId);
  return snap?.manifest || null;
}

export function deleteSnapshot(snapshotId: string, siteId?: string): void {
  try {
    const existing = loadSnapshots(siteId);
    const updated = existing.filter(s => s.id !== snapshotId);
    localStorage.setItem(storageKey(siteId), JSON.stringify(updated));
  } catch {}
}
