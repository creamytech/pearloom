// ─────────────────────────────────────────────────────────────
// Pearloom / lib/cover-crop.ts — where a cover photo's crop looks.
//
// `object-fit: cover` defaults to `object-position: 50% 50%`, and
// the vertical CENTER of a portrait photograph is the torso — a
// host's cover photo in a wide, short dashboard card showed "just
// her body" (user report, 2026-07-08). Faces live in the upper
// third of almost all people photography, so every dashboard card
// that crops a cover/gallery photo aims there instead.
//
// One constant, imported everywhere a card crops a photo of
// people, so the crop can be tuned (or upgraded to a per-photo
// focal point — see GRAND-PLAN-2 §9) in exactly one place.
// Deliberately NOT applied to account avatars (already
// face-centered squares) or the published site's hero variants
// (they carry their own art direction).
// ─────────────────────────────────────────────────────────────

/** Upper-third focus for people photography in cropping card slots. */
export const COVER_FOCUS = '50% 30%';
