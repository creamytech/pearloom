// ─────────────────────────────────────────────────────────────
// Pearloom / editor-log.ts
// Tiny centralised logger for editor errors. Previously scattered
// catch blocks either swallowed errors silently or used ad-hoc
// console.error — this gives us a single tagged entry point.
// ─────────────────────────────────────────────────────────────

export function logEditorError(context: string, err: unknown): void {
  // Keep it intentionally small — we prefix with [pearloom] so errors
  // are easy to filter in the browser console.
  // eslint-disable-next-line no-console
  console.error('[pearloom]', context, err);
}
