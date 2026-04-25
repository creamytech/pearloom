// ─────────────────────────────────────────────────────────────
// Pearloom / lib/manifest-migrations.ts
//
// Centralized manifest migration runner. Every time we add a field
// that requires reshaping older data (renaming a key, splitting one
// field into many, defaulting a new section), we add a numbered
// migration here. The editor calls migrateManifest(m) on load so
// the in-memory shape always matches the latest TypeScript types.
//
// Conventions:
//   - schemaVersion starts at 1.
//   - Each migration takes a manifest at version N and returns one
//     at version N+1. Migrations are pure (no side effects, no I/O).
//   - Migrations are idempotent: running them twice doesn't change
//     anything once the version is past their threshold.
//   - We never throw — a migration that can't run logs a warning
//     and leaves the manifest unchanged at its current version.
//
// Usage:
//
//     import { migrateManifest, CURRENT_SCHEMA_VERSION } from '@/lib/manifest-migrations';
//     const m = migrateManifest(rawFromDb);
// ─────────────────────────────────────────────────────────────

import type { StoryManifest } from '@/types';

/** Bump every time you add a migration below. */
export const CURRENT_SCHEMA_VERSION = 1;

type Migration = {
  /** Version this migration upgrades FROM. */
  from: number;
  /** Version it upgrades TO. */
  to: number;
  label: string;
  apply: (m: Record<string, unknown>) => Record<string, unknown>;
};

/* ────────────────────────────────────────────────────────────────
   Add migrations chronologically. Number them so it's obvious
   what order they run in, and what each one does.
   ──────────────────────────────────────────────────────────────── */
const MIGRATIONS: Migration[] = [
  // --- Migration 0 → 1 ---------------------------------------
  // First entry is just establishing baseline. If a manifest has
  // no schemaVersion at all, we treat it as v0 and stamp it v1.
  // Future migrations append below this one.
  {
    from: 0,
    to: 1,
    label: 'Initialize schemaVersion',
    apply: (m) => ({ ...m }),
  },
];

/** Run all pending migrations against `manifest` and return a new
 *  object stamped at `CURRENT_SCHEMA_VERSION`. Never throws. */
export function migrateManifest(manifest: unknown): StoryManifest {
  if (!manifest || typeof manifest !== 'object') {
    // No-op for null/empty manifests — let downstream code handle.
    return manifest as StoryManifest;
  }
  let next = { ...(manifest as Record<string, unknown>) };
  let version = typeof next.schemaVersion === 'number' ? next.schemaVersion : 0;

  // Apply each pending migration in order.
  for (const mig of MIGRATIONS) {
    if (version !== mig.from) continue;
    try {
      next = mig.apply(next);
      version = mig.to;
      next.schemaVersion = version;
    } catch (err) {
      // Don't crash the editor on a migration failure — log and stop.
      // The user can still edit; the migration will retry next save.
      // eslint-disable-next-line no-console
      console.warn(`[manifest-migrations] ${mig.label} failed:`, err);
      break;
    }
  }

  // Stamp the latest version even if the manifest was already current
  // — ensures the field is always present.
  if (typeof next.schemaVersion !== 'number') {
    next.schemaVersion = CURRENT_SCHEMA_VERSION;
  }

  return next as unknown as StoryManifest;
}

/** Returns true if a manifest has migrations pending. Useful for
 *  the editor to decide whether to mark itself dirty after open. */
export function needsMigration(manifest: unknown): boolean {
  if (!manifest || typeof manifest !== 'object') return false;
  const v = (manifest as Record<string, unknown>).schemaVersion;
  return typeof v !== 'number' || v < CURRENT_SCHEMA_VERSION;
}
