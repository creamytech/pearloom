// ─────────────────────────────────────────────────────────────
// Pearloom / lib/site-names.ts
//
// One rule for "does this names pair actually carry names?" —
// shared by every reader and the save path.
//
// History: sites store the host names TWICE (site_config.names,
// the legacy read key, and manifest.names). Save paths that
// posted a manifest without names used to clobber
// site_config.names to ['',''] (the Studio autosave wipe,
// 2026-07-09). saveSiteDraft now refuses to overwrite a stored
// pair with an empty one, and the read paths heal wiped rows by
// falling back to manifest.names.
// ─────────────────────────────────────────────────────────────

/** Returns the trimmed [a, b] pair when `value` is an array
 *  carrying at least one non-empty name; null otherwise
 *  (missing, malformed, or the wiped-to-empty pair). */
export function usableNamesPair(value: unknown): [string, string] | null {
  if (!Array.isArray(value) || value.length < 2) return null;
  const a = typeof value[0] === 'string' ? value[0].trim() : '';
  const b = typeof value[1] === 'string' ? value[1].trim() : '';
  if (!a && !b) return null;
  return [a, b];
}

/** Resolve a site's display names from the two places they live:
 *  site_config.names (legacy read key) → manifest.names. Returns
 *  ['', ''] when neither carries a real name. */
export function resolveSiteNames(
  configNames: unknown,
  manifestNames: unknown,
): [string, string] {
  return usableNamesPair(configNames) ?? usableNamesPair(manifestNames) ?? ['', ''];
}
