// ─────────────────────────────────────────────────────────────
// Pearloom / lib/snapshots.ts
//
// Light-weight snapshot manager. Keeps the last N manifests inside
// `manifest.snapshots` so the editor can scrub backwards through
// time without server roundtrips. The `payload` field stores the
// FULL manifest at that moment (minus the snapshots array itself,
// to avoid recursion). Restoring a snapshot replaces the working
// manifest with the payload while keeping the new snapshot history.
// ─────────────────────────────────────────────────────────────

import type { StoryManifest } from '@/types';

export const MAX_SNAPSHOTS = 10;

export interface Snapshot {
  id: string;
  createdAt: string;
  label: string;
  payload: Record<string, unknown>;
}

/** Capture the manifest at this moment and prepend it to history.
 *  Returns the updated manifest (caller should setManifest with it).
 *  Skipped when the previous snapshot's payload is structurally
 *  identical — no point keeping duplicates. */
export function captureSnapshot(manifest: StoryManifest, labelHint?: string): StoryManifest {
  const existing = ((manifest as unknown as { snapshots?: Snapshot[] }).snapshots ?? []).slice();
  // Strip the snapshot history out of the payload itself.
  const payload = { ...(manifest as unknown as Record<string, unknown>) };
  delete payload.snapshots;

  const lastPayload = existing[0]?.payload;
  if (lastPayload && shallowEqual(lastPayload, payload)) {
    return manifest;
  }

  const next: Snapshot = {
    id: `snap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    label: labelHint ?? deriveLabel(payload),
    payload,
  };

  const trimmed = [next, ...existing].slice(0, MAX_SNAPSHOTS);
  return { ...manifest, snapshots: trimmed } as unknown as StoryManifest;
}

/** Restore a previously-captured snapshot. The current snapshot list
 *  is preserved, but a new snapshot is *not* automatically captured
 *  — callers should call captureSnapshot first if they want one. */
export function restoreSnapshot(manifest: StoryManifest, snapshotId: string): StoryManifest {
  const list = ((manifest as unknown as { snapshots?: Snapshot[] }).snapshots ?? []);
  const target = list.find((s) => s.id === snapshotId);
  if (!target) return manifest;
  return {
    ...(target.payload as unknown as StoryManifest),
    snapshots: list,
  } as unknown as StoryManifest;
}

/** Drop a snapshot from the list. */
export function deleteSnapshot(manifest: StoryManifest, snapshotId: string): StoryManifest {
  const list = ((manifest as unknown as { snapshots?: Snapshot[] }).snapshots ?? []);
  return {
    ...manifest,
    snapshots: list.filter((s) => s.id !== snapshotId),
  } as unknown as StoryManifest;
}

function deriveLabel(payload: Record<string, unknown>): string {
  // Best-effort: surface the most recent edit cue for the timeline UI.
  const m = payload as { palette?: string; themeName?: string };
  if (m.themeName) return m.themeName;
  if (m.palette) return `Palette: ${m.palette}`;
  return 'Edit';
}

function shallowEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  // Cheap structural compare — JSON.stringify is fine here because
  // both inputs are already plain objects with the same key order
  // (we always spread from the same source).
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}
