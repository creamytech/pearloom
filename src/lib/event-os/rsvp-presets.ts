// ─────────────────────────────────────────────────────────────
// Pearloom / lib/event-os/rsvp-presets.ts
//
// RSVP field presets — one per event archetype. The EventType
// registry (event-types.ts) declares a preset id per event; this
// module converts that id into the actual field set the RSVP
// block should render.
//
// Adding a new preset: append to PRESETS. Adding a new field:
// extend RsvpField type, then wire it into the renderer.
//
// See CLAUDE-PRODUCT.md §4.2 for the strategic plan.
// ─────────────────────────────────────────────────────────────

import type { RsvpPreset } from './event-types';

export type RsvpFieldKind =
  | 'attending'        // Yes / No (always first)
  | 'plus-one'         // Bringing +1? name field appears
  | 'meal'             // Meal choice dropdown
  | 'dietary'          // Text/chip: allergies, restrictions
  | 'song-request'     // Free text: song for the DJ
  | 'comments'         // General message to host
  | 'memory-share'     // Memory of the person (milestone, memorial)
  | 'attending-days'   // Multi-day attendance checkboxes (reunion, bachelor)
  | 'room-preference'  // Reunion / destination: shared vs private
  | 'bed-preference'   // Bachelor trip: twin, queen, king, couch
  | 'tshirt-size'      // Reunion merch sizing
  | 'cost-acknowledge' // Bachelor: "I understand the ~$X share"
  | 'allergies-med'    // Bachelor: allergies + meds for trip safety
  | 'gift-status'      // Shower: bringing a gift / sent ahead / n/a
  | 'advice'           // Shower: advice for the couple / parents
  | 'photo-upload';    // Milestone / memorial: upload an old photo

export interface RsvpFieldDef {
  kind: RsvpFieldKind;
  /** Question label shown above the input. */
  label: string;
  /** Optional helper text below the input. */
  hint?: string;
  /** Whether the question must be answered. */
  required?: boolean;
  /** Default options for enum-style fields. */
  options?: string[];
}

// ── Presets ──────────────────────────────────────────────────

const WEDDING: RsvpFieldDef[] = [
  { kind: 'attending',   label: 'Will you attend?',       required: true },
  { kind: 'plus-one',    label: 'Bringing a plus one?',   hint: 'Add their name if yes.' },
  { kind: 'meal',        label: 'Meal choice',            options: ['Beef', 'Chicken', 'Fish', 'Vegetarian', 'Vegan'] },
  { kind: 'dietary',     label: 'Allergies or restrictions' },
  { kind: 'song-request',label: 'A song that\u2019ll get you dancing' },
  { kind: 'comments',    label: 'A note to the couple' },
];

const SHOWER: RsvpFieldDef[] = [
  { kind: 'attending',   label: 'Will you be there?',     required: true },
  { kind: 'gift-status', label: 'Bringing a gift?',       options: ['Bringing on the day', 'Shipped ahead', 'Sending later', 'No gift'] },
  { kind: 'advice',      label: 'A piece of advice to share',             hint: 'We\u2019ll print the best ones.' },
  { kind: 'dietary',     label: 'Allergies or restrictions' },
];

const BACHELOR: RsvpFieldDef[] = [
  { kind: 'attending',        label: 'In?',                   required: true, hint: 'Only the people coming — no pressure.' },
  { kind: 'attending-days',   label: 'Which days can you make it?' },
  { kind: 'cost-acknowledge', label: 'Cost share acknowledgement', required: true, hint: 'Estimated share shown on the site — flag anything you can\u2019t cover.' },
  { kind: 'bed-preference',   label: 'Bed preference',        options: ['Any', 'Bed to myself', 'Don\u2019t mind sharing', 'Couch is fine'] },
  { kind: 'allergies-med',    label: 'Allergies, medications, or anything we should know' },
];

const MEMORIAL: RsvpFieldDef[] = [
  { kind: 'attending',    label: 'Will you attend?',    required: true, hint: 'Only if you want us to know.' },
  { kind: 'memory-share', label: 'A memory, if you\u2019d like to share one', hint: 'We\u2019ll read some aloud.' },
  { kind: 'photo-upload', label: 'A photo, if you have one to share' },
  { kind: 'comments',     label: 'A message to the family' },
];

const REUNION: RsvpFieldDef[] = [
  { kind: 'attending',        label: 'Coming?',                 required: true },
  { kind: 'attending-days',   label: 'Which days?' },
  { kind: 'room-preference',  label: 'Room preference',         options: ['Private room', 'Shared with family', 'No preference', 'Not staying on-site'] },
  { kind: 'tshirt-size',      label: 'T-shirt size',            options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
  { kind: 'dietary',          label: 'Allergies or restrictions' },
  { kind: 'photo-upload',     label: 'A photo from a past reunion, if you have one' },
];

const MILESTONE: RsvpFieldDef[] = [
  { kind: 'attending',    label: 'Will you be there?',      required: true },
  { kind: 'memory-share', label: 'A memory to share',       hint: 'We\u2019ll read a few on the night.' },
  { kind: 'photo-upload', label: 'An old photo of us together' },
  { kind: 'dietary',      label: 'Allergies or restrictions' },
];

const CULTURAL: RsvpFieldDef[] = [
  { kind: 'attending',  label: 'Will you attend?',   required: true },
  { kind: 'meal',       label: 'Meal choice',        options: ['Standard', 'Vegetarian', 'Kosher', 'Halal', 'Gluten-free'] },
  { kind: 'dietary',    label: 'Allergies or restrictions' },
  { kind: 'comments',   label: 'A note for the family' },
];

const CASUAL: RsvpFieldDef[] = [
  { kind: 'attending',  label: 'Coming?',                required: true },
  { kind: 'dietary',    label: 'Allergies or restrictions' },
  { kind: 'comments',   label: 'A note' },
];

const PRESETS: Record<RsvpPreset, RsvpFieldDef[]> = {
  wedding:   WEDDING,
  shower:    SHOWER,
  bachelor:  BACHELOR,
  memorial:  MEMORIAL,
  reunion:   REUNION,
  milestone: MILESTONE,
  cultural:  CULTURAL,
  casual:    CASUAL,
};

// ── API ──────────────────────────────────────────────────────

/** Returns the field list for a preset. */
export function getRsvpFields(preset: RsvpPreset): readonly RsvpFieldDef[] {
  return PRESETS[preset] ?? WEDDING;
}

/** Every preset id the system supports (for admin UIs, tests, etc.). */
export const RSVP_PRESET_IDS: readonly RsvpPreset[] = [
  'wedding', 'shower', 'bachelor', 'memorial',
  'reunion', 'milestone', 'cultural', 'casual',
];
