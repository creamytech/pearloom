// ─────────────────────────────────────────────────────────────
// Photo plates — the house's own pressed image fields.
//
// Twelve painterly, occasion-tinted plates under /public/plates,
// authored in-house (warm washes, fine grain, one quiet gesture:
// a thread, a sprig, an arch, a pearl). They fill every slot that
// used to hotlink Unsplash stock (REVAMP P.4): a craft house
// doesn't hotlink stock, and a proxy or ad-blocker must never be
// able to blank the landing or the demo worlds.
//
// `plateFor(key)` is a stable hash → plate path, so a fixed key
// (an old photo id, a slot name) always presses the same plate.
// ─────────────────────────────────────────────────────────────

export const PLATE_COUNT = 12;

/** `/plates/plate-07.jpg` for n=7 (1-based, wraps). */
export function platePath(n: number): string {
  const idx = ((Math.trunc(n) - 1) % PLATE_COUNT + PLATE_COUNT) % PLATE_COUNT + 1;
  return `/plates/plate-${String(idx).padStart(2, '0')}.jpg`;
}

/** Stable key → plate path. Same key, same plate, every render. */
export function plateFor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return platePath((Math.abs(h) % PLATE_COUNT) + 1);
}
