// ─────────────────────────────────────────────────────────────
// Pearloom / editor-ids.ts
// Shared ID generator for non-block entities (events, FAQs, meals,
// party members, stickers, etc). Mirrors the `makeBlockId` helper
// living inside EditorCanvas and replaces the old `Date.now()`
// timestamp-only IDs which collide when multiple items are created
// in the same millisecond (e.g. batched AI block inserts).
// ─────────────────────────────────────────────────────────────

export function makeId(prefix: string): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `${prefix}-${crypto.randomUUID()}`;
    }
  } catch {
    // fall through to legacy path
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
