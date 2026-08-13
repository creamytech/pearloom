// ─────────────────────────────────────────────────────────────
// Pearloom / lib/manifest-schema.ts
//
// The write-boundary guardrail for StoryManifest. The manifest is
// the product's central document — one large, historically
// weakly-typed JSON blob that the sole renderer trusts. Until now
// nothing validated it on the way into the database, so a
// malformed autosave (a truncated body, a client bug writing an
// array where an object belongs, a wrong-typed critical field)
// could persist and crash the renderer for every future load.
//
// DESIGN — a GUARDRAIL, not a strict schema. This runs on the
// autosave path over a corpus of real manifests with years of
// field variance. It MUST NOT reject a legitimate save (data loss
// is worse than a slightly-loose field). So it:
//   1. REJECTS only structurally-broken payloads that would
//      corrupt the row or crash the renderer — not an object, an
//      array, or a load-bearing field with a type the renderer
//      can't consume (blockOrder not an array, etc.).
//   2. STAMPS the schema version (idempotent migration hook) so
//      the editor can run field migrations on open.
//   3. Passes everything else through untouched.
//
// It does NOT enforce required content, cap sizes, or coerce
// values — those belong to the editor and the section panels.
// ─────────────────────────────────────────────────────────────

import type { StoryManifest } from '@/types';

/** Current manifest schema version. Bump when a change needs a
 *  migration on read; add the migration to `migrateManifest`. */
export const CURRENT_MANIFEST_VERSION = 1;

export type ManifestValidation =
  | { ok: true; manifest: StoryManifest }
  | { ok: false; error: string; field?: string };

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Load-bearing fields whose WRONG type would crash the renderer.
 *  Each entry: the field name + a predicate for an ACCEPTABLE
 *  value (absent is always acceptable — the renderer defaults). */
const SHAPE_RULES: ReadonlyArray<{
  field: string;
  ok: (v: unknown) => boolean;
  expected: string;
}> = [
  { field: 'blockOrder', ok: (v) => Array.isArray(v) && v.every((x) => typeof x === 'string'), expected: 'string[]' },
  { field: 'hiddenSections', ok: (v) => Array.isArray(v) && v.every((x) => typeof x === 'string'), expected: 'string[]' },
  { field: 'faqs', ok: (v) => Array.isArray(v), expected: 'array' },
  { field: 'events', ok: (v) => Array.isArray(v), expected: 'array' },
  { field: 'chapters', ok: (v) => Array.isArray(v), expected: 'array' },
  { field: 'galleryImages', ok: (v) => Array.isArray(v), expected: 'array' },
  { field: 'names', ok: (v) => Array.isArray(v), expected: 'array' },
  { field: 'themeVars', ok: (v) => isPlainObject(v), expected: 'object' },
  { field: 'theme', ok: (v) => isPlainObject(v), expected: 'object' },
  { field: 'blockVariants', ok: (v) => isPlainObject(v), expected: 'object' },
  { field: 'translations', ok: (v) => isPlainObject(v), expected: 'object' },
  { field: 'occasion', ok: (v) => typeof v === 'string', expected: 'string' },
  { field: 'subdomain', ok: (v) => typeof v === 'string', expected: 'string' },
];

/**
 * Idempotent forward migration + version stamp. Safe to call on any
 * manifest (already-current, legacy, or freshly built). Never
 * mutates the input.
 */
export function migrateManifest(input: Record<string, unknown>): StoryManifest {
  const m = { ...input };
  const version = typeof m.schemaVersion === 'number' ? m.schemaVersion : 0;

  // ── Migration steps run in order for manifests below each gate.
  // (None needed yet beyond stamping — v0 manifests are structurally
  //  compatible with v1. Add `if (version < N) { … }` blocks here as
  //  fields require migration, then bump CURRENT_MANIFEST_VERSION.)
  void version;

  m.schemaVersion = CURRENT_MANIFEST_VERSION;
  return m as unknown as StoryManifest;
}

/**
 * Validate a manifest at the write boundary. Returns the
 * version-stamped manifest to persist, or a structured rejection
 * the route turns into a 400. Rejection is reserved for payloads
 * that are structurally broken — a valid save is never rejected.
 */
export function validateManifestForWrite(input: unknown): ManifestValidation {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      error: Array.isArray(input)
        ? 'Manifest must be an object, received an array.'
        : `Manifest must be an object, received ${input === null ? 'null' : typeof input}.`,
    };
  }

  for (const rule of SHAPE_RULES) {
    if (rule.field in input && input[rule.field] != null && !rule.ok(input[rule.field])) {
      return {
        ok: false,
        error: `Manifest field "${rule.field}" must be ${rule.expected}.`,
        field: rule.field,
      };
    }
  }

  return { ok: true, manifest: migrateManifest(input) };
}
