// ─────────────────────────────────────────────────────────────
// Stable hotel id helper. Both sides of the editor — the panel
// (Hotel type, manifest.travel.hotels) and the canvas renderer
// (HotelBlock, manifest.travelInfo.hotels) — must agree on a
// hotel's identity so:
//
//   • Drag-to-reorder on canvas tracks the same row across
//     re-renders (dnd-kit keys off id; positional ids drift).
//   • Click-to-focus dispatches an id the panel's
//     [data-pl-hotel-row-id="…"] selector can match.
//   • Badge edits in the panel resolve to the right record via
//     findIndex(x => x.id === h.id) instead of degenerating to
//     "first row" when ids go missing.
//
// Legacy manifests (and a brief window where the canvas's onReorder
// stripped ids while writing back) ship hotels without an explicit
// id. This helper synthesizes a content-stable fallback from
// name+address so the same hotel resolves to the same id across
// renders without us having to mutate the manifest on read.
// ─────────────────────────────────────────────────────────────

/** Stable id for a hotel record. If the hotel already carries an
 *  id, returns it verbatim. Otherwise hashes name+address with
 *  FNV-1a so the same content always maps to the same id. */
export function stableHotelId(h: { id?: string; name?: string; address?: string }, fallbackIndex?: number): string {
  if (h.id) return h.id;
  const name = (h.name ?? '').trim();
  const addr = (h.address ?? '').trim();
  if (!name && !addr) return `htl-idx-${fallbackIndex ?? 0}`;
  const key = `${name}|${addr}`;
  // FNV-1a — small, fast, deterministic. We don't need crypto here;
  // we need stability under content change. Two hotels with the
  // same name+address will collide, but that's a real duplicate and
  // upstream UX should dedupe.
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `htl-${(hash >>> 0).toString(36)}`;
}
