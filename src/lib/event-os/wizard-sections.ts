// ─────────────────────────────────────────────────────────────
// wizard-sections — the shared section catalog.
//
// ONE source of truth for:
//   • SECTION_META      — every canvas section's label/icon/desc,
//                         shared by SectionRail + the wizard so the
//                         two can't drift.
//   • SECTION_ORDER     — the canonical order selected sections
//                         write into manifest.blockOrder.
//   • CORE_BLOCK_ORDER  — the eight reorderable CORE sections'
//                         implicit blockOrder base (wizard-seed +
//                         bastings append onto this).
//   • SECTION_GATE      — SectionId → the EVENT_TYPES BlockType id(s)
//                         that gate it. Unifies the core-section and
//                         Event-OS gates already shipped.
//   • wizardSectionsFor — derives the {essential, optional} chooser
//                         set for an occasion (never a hand-kept 28-
//                         list — computed from EVENT_TYPES).
//   • mergeBlockOrder / applySectionPicks — the wizard-finish wiring.
//
// Pure + server-safe. Imports only pure leaf modules (event-types,
// section-applicability) and layouts.ts (which type-imports the
// editor's SectionId union — a type-only edge, erased at build, so
// no client runtime is pulled in here).
//
// See docs/WIZARD-SECTIONS-PLAN.md §2 for the derivation rule and
// §2.3 for the canonical order.
// ─────────────────────────────────────────────────────────────

import type { StoryManifest } from '@/types';
import type { SectionId } from '@/components/pearloom/redesign/EditorRedesign';
import {
  LAYOUTS,
  DEFAULT_VARIANT,
  readVariant,
  recommendedVariantFor,
  type LayoutVariant,
} from '@/components/pearloom/redesign/layouts';
import { sectionHasContent } from '@/components/pearloom/redesign/section-applicability';
import { getEventType } from '@/lib/event-os/event-types';

/** A canvas section id (never null — hero is a real section). */
type CanvasSection = Exclude<SectionId, null>;

// ── SECTION_GATE ─────────────────────────────────────────────
//
// SectionId → the EVENT_TYPES BlockType id(s) that gate it.
// Unifies section-applicability.CORE_SECTION_BLOCK_GATES,
// EditorRedesign.BLOCK_GATE_ALIASES, and the optional sections.
//
//   null  = always essential (hero is pinned / not a card; details
//           is an always-on essential card — every occasion has
//           logistics).
//   [ids] = essential when ANY id ∈ occasion.defaultBlocks,
//           optional when ANY id ∈ occasion.optionalBlocks,
//           otherwise hidden (skipped — catches hiddenBlocks and
//           anything the occasion doesn't list).
//
// Legacy blocks with NO redesign canvas section (guestbook,
// anniversary, quote, hashtag, storymap, quiz, welcome, vibeQuote,
// photoWall) are deliberately absent — they can't be chooser cards.
// (photoWall folds into the gallery's guest-uploads; guestbook is a
// manifest.features flag.)
export const SECTION_GATE: Record<string, readonly string[] | null> = {
  hero: null,
  details: null,
  story: ['story'],
  schedule: ['event'], // UNIVERSAL → every occasion
  travel: ['travel'],
  registry: ['registry'],
  gallery: ['gallery', 'photos'], // UNIVERSAL 'photos' → every occasion
  rsvp: ['rsvp'],
  faq: ['faq'],
  countdown: ['countdown'],
  map: ['map'],
  music: ['spotify'],
  // Event-OS blocks — direct, plus honorList's weddingParty/whosWho aliases.
  honorList: ['weddingParty', 'whosWho'],
  itinerary: ['itinerary'],
  costSplitter: ['costSplitter'],
  activityVote: ['activityVote'],
  toastSignup: ['toastSignup'],
  adviceWall: ['adviceWall'],
  program: ['program'],
  livestream: ['livestream'],
  obituary: ['obituary'],
  packingList: ['packingList'],
  tributeWall: ['tributeWall'],
  menu: ['menu'],
  dressCode: ['dressCode'],
  nameVote: ['nameVote'],
  rooms: ['rooms'],
  thenAndNow: ['thenAndNow'],
  groupChat: ['groupChat'],
};

// ── SECTION_ORDER ────────────────────────────────────────────
//
// Selected sections write into manifest.blockOrder in this fixed
// order so a site reads coherently regardless of pick order. Hero
// is pinned by the renderer and is NEVER in blockOrder, so it's
// absent here. This list covers exactly ThemedSite's `allKinds`
// minus hero (28 sections).
//
// Rationale (§2.3): story/obituary open · logistics in the middle ·
// gallery/people/interactive in the body · RSVP + FAQ close.
export const SECTION_ORDER: readonly string[] = [
  'story', 'obituary', 'details', 'schedule', 'program', 'itinerary',
  'travel', 'rooms', 'menu', 'dressCode', 'registry', 'gallery',
  'thenAndNow', 'honorList', 'tributeWall', 'adviceWall', 'nameVote',
  'activityVote', 'toastSignup', 'costSplitter', 'packingList',
  'countdown', 'map', 'music', 'livestream', 'groupChat', 'rsvp', 'faq',
];

// The eight reorderable CORE sections (hero excluded — it's pinned,
// never in blockOrder). Derived from SECTION_ORDER so there is a
// single ordering source: wizard-seed.withBlock + bastings.blockOrderWith
// use this as their implicit blockOrder base, appending optional
// sections onto it. Equals the previous hardcoded CORE_ORDER exactly.
const CORE_BLOCK_KEYS = new Set([
  'story', 'details', 'schedule', 'travel', 'registry', 'gallery', 'rsvp', 'faq',
]);
export const CORE_BLOCK_ORDER: readonly string[] =
  SECTION_ORDER.filter((s) => CORE_BLOCK_KEYS.has(s));

// ── SECTION_META ─────────────────────────────────────────────
//
// Every canvas section's label/icon/desc. SectionRail's SECTIONS
// and OPTIONAL_SECTIONS arrays are built FROM these ordered lists
// (single source — the rail and the wizard read the same labels).
export interface SectionMeta {
  id: CanvasSection;
  label: string;
  icon: string;
  desc: string;
  required?: boolean;
}

// Order is load-bearing: SectionRail derives REORDERABLE_CORE_KEYS
// (SECTIONS.filter(!required)) + auto-append order from this list.
export const CORE_SECTION_META: readonly SectionMeta[] = [
  { id: 'hero',     label: 'Opening',   icon: 'home',     required: true, desc: 'Names, date, cover photo' },
  { id: 'story',    label: 'Our story', icon: 'heart-icon',               desc: 'How you met' },
  { id: 'details',  label: 'Details',   icon: 'sparkles',                 desc: 'Dress code, kids, FAQ-lite' },
  { id: 'schedule', label: 'Schedule',  icon: 'calendar',                 desc: 'Day-of timeline' },
  { id: 'travel',   label: 'Travel',    icon: 'map',                      desc: 'Hotels, transit, tips' },
  { id: 'registry', label: 'Registry',  icon: 'gift',                     desc: 'Linked stores' },
  { id: 'gallery',  label: 'Gallery',   icon: 'image',                    desc: 'Your photo wall' },
  { id: 'rsvp',     label: 'RSVP',      icon: 'mail',     required: true, desc: 'Reply form + deadline' },
  { id: 'faq',      label: 'FAQ',       icon: 'sparkles',                 desc: 'Guest questions' },
];

// Order preserved from SectionRail.OPTIONAL_SECTIONS.
export const OPTIONAL_SECTION_META: readonly SectionMeta[] = [
  { id: 'countdown',    label: 'Countdown',     icon: 'clock',          desc: 'Stat tiles · stripe · minimal · statement' },
  { id: 'map',          label: 'Map',           icon: 'map',            desc: 'Live embed · pin · static' },
  { id: 'music',        label: 'Music',         icon: 'music',          desc: 'Spotify · Apple · YouTube' },
  { id: 'itinerary',    label: 'Itinerary',     icon: 'calendar-check', desc: 'Multi-day plan, hour by hour' },
  { id: 'costSplitter', label: 'Cost splitter', icon: 'ticket',         desc: 'Who owes what — settled gently' },
  { id: 'activityVote', label: 'Group vote',    icon: 'check',          desc: 'Let the group pick' },
  { id: 'toastSignup',  label: 'Toast signup',  icon: 'mic',            desc: 'Claim a toast slot' },
  { id: 'adviceWall',   label: 'Advice wall',   icon: 'text',           desc: 'Words for the honoree' },
  { id: 'program',      label: 'Program',       icon: 'page',           desc: 'The order of the ceremony' },
  { id: 'livestream',   label: 'Livestream',    icon: 'play',           desc: 'For the ones far away' },
  { id: 'obituary',     label: 'Obituary',      icon: 'leaf',           desc: 'A life, remembered' },
  { id: 'packingList',  label: 'Packing list',  icon: 'list',           desc: 'What to bring' },
  { id: 'honorList',    label: 'Honor list',    icon: 'users',          desc: 'The people beside them' },
  { id: 'tributeWall',  label: 'Tribute wall',  icon: 'heart-icon',     desc: 'Memories, gathered from your guests' },
  { id: 'menu',         label: 'Menu',          icon: 'fleuron',        desc: 'Dinner, course by course' },
  { id: 'dressCode',    label: 'Dress code',    icon: 'palette',        desc: 'What to wear' },
  { id: 'nameVote',     label: 'Name vote',     icon: 'sparkles',       desc: 'Guests pick their favorite name' },
  { id: 'rooms',        label: 'Rooms',         icon: 'home',           desc: 'Who sleeps where' },
  { id: 'thenAndNow',   label: 'Then & now',    icon: 'image',          desc: 'Photo pairs, years apart' },
  { id: 'groupChat',    label: 'Group chat',    icon: 'send',           desc: 'Link out to the thread' },
];

export const SECTION_META: Record<string, SectionMeta> = Object.fromEntries(
  [...CORE_SECTION_META, ...OPTIONAL_SECTION_META].map((m) => [m.id, m]),
);

// ── The chooser derivation ───────────────────────────────────

export interface WizardSectionOffer {
  /** Canvas SectionId. */
  section: CanvasSection;
  /** Plain-word label from SECTION_META. */
  label: string;
  /** essential → pre-checked ON; optional → offered but OFF. */
  group: 'essential' | 'optional';
  /** Pre-checked state (essential → true). */
  defaultOn: boolean;
  /** Layout variant the chooser lands on:
   *  recommendedVariantFor ?? edition default ?? DEFAULT_VARIANT. */
  variant: string;
  /** All layout variants for the section (LAYOUTS[section]). */
  variants: readonly LayoutVariant[];
  /** The occasion-recommended variant id, if any (gold-pearl mark). */
  recommended?: string;
}

/** Resolve a section's default layout variant for an occasion:
 *  recommendedVariantFor ?? edition default ?? DEFAULT_VARIANT. */
function variantFor(section: CanvasSection, occasion: string, edition?: string): string {
  const rec = recommendedVariantFor(section, occasion);
  if (rec) return rec;
  // readVariant with no explicit layouts resolves edition ?? default.
  return readVariant({ layouts: {}, edition }, section) || (DEFAULT_VARIANT[section] ?? '');
}

/**
 * Derive the wizard's section chooser set for an occasion.
 *
 * Per §2.1: a section is essential when any of its gate blocks is in
 * the occasion's defaultBlocks, optional when in optionalBlocks, and
 * omitted otherwise (hiddenBlocks + anything unlisted). null-gated
 * sections (hero, details) are always essential.
 *
 * Returned in the canonical SECTION_ORDER (hero first, since it's
 * absent from SECTION_ORDER but is an always-essential opening).
 */
export function wizardSectionsFor(occasion: string, edition?: string): WizardSectionOffer[] {
  const event = getEventType(occasion);
  const out: WizardSectionOffer[] = [];

  // hero leads (it's not in SECTION_ORDER — pinned by the renderer —
  // but it's an always-essential opening the chooser accounts for).
  const orderedIds: CanvasSection[] = ['hero', ...(SECTION_ORDER as CanvasSection[])];

  for (const section of orderedIds) {
    const gate = SECTION_GATE[section];
    if (gate === undefined) continue; // not a chooser section

    let group: 'essential' | 'optional' | null;
    if (gate === null) {
      group = 'essential';
    } else if (!event) {
      // Unknown occasion (manifest predates the registry) — offer
      // only the always-on sections; gated ones can't be derived.
      group = null;
    } else if (gate.some((g) => (event.defaultBlocks as readonly string[]).includes(g))) {
      group = 'essential';
    } else if (gate.some((g) => (event.optionalBlocks as readonly string[]).includes(g))) {
      group = 'optional';
    } else {
      group = null; // hidden — skip
    }
    if (group === null) continue;

    const meta = SECTION_META[section];
    out.push({
      section,
      label: meta?.label ?? section,
      group,
      defaultOn: group === 'essential',
      variant: variantFor(section, occasion, edition),
      variants: LAYOUTS[section] ?? [],
      recommended: recommendedVariantFor(section, occasion),
    });
  }

  return out;
}

/** The section ids pre-checked ON for an occasion (the essentials). */
export function essentialSectionsFor(occasion: string, edition?: string): string[] {
  return wizardSectionsFor(occasion, edition)
    .filter((o) => o.group === 'essential')
    .map((o) => o.section);
}

// ── Finish wiring ────────────────────────────────────────────

export interface SectionPicks {
  /** Selected canvas SectionIds, in the host's on/off state. */
  on: string[];
  /** Per-section layout variant the host landed on. */
  layouts: Record<string, string>;
}

/**
 * Union the host's selected sections with whatever is already in
 * blockOrder (the wizard seed may have appended countdown / music /
 * honorList that carry real content), dedupe, and re-sort by the
 * canonical SECTION_ORDER. Content always wins — a seeded section is
 * never dropped just because the host didn't tick it. Hero and any
 * non-section junk are filtered out.
 */
export function mergeBlockOrder(
  existing: string[] | undefined,
  selected: string[],
): string[] {
  const present = new Set<string>();
  for (const s of selected) if ((SECTION_ORDER as readonly string[]).includes(s)) present.add(s);
  for (const s of existing ?? []) if ((SECTION_ORDER as readonly string[]).includes(s)) present.add(s);
  return (SECTION_ORDER as readonly string[]).filter((s) => present.has(s));
}

/**
 * Apply the wizard's section picks to a manifest (§3.3). Pure —
 * returns a new manifest, mutates nothing.
 *
 *  1. blockOrder — the selected non-hero sections in canonical order,
 *     unioned with any seeded content sections (content wins).
 *  2. hiddenSections — essential CORE sections the host turned OFF,
 *     EXCEPT any carrying real host content. The renderer auto-re-
 *     appends omitted cores, so deselection MUST be recorded here.
 *  3. layouts — the per-section variant picks merged over what
 *     applyWizardLook already wrote (host section-variant picks win
 *     over the LAYOUT_TO_VARIANTS map; the STRUCTURE / fitting-room
 *     nav/hero picks the wizard applies AFTER this still win).
 */
export function applySectionPicks(
  manifest: StoryManifest,
  occasion: string,
  picks: SectionPicks,
  edition?: string,
): StoryManifest {
  const loose = { ...(manifest as unknown as Record<string, unknown>) };
  const onSet = new Set(picks.on);
  const offered = new Set<string>(wizardSectionsFor(occasion, edition).map((o) => o.section));

  // 1. blockOrder.
  const selected = (SECTION_ORDER as readonly string[]).filter((s) => onSet.has(s));
  loose.blockOrder = mergeBlockOrder(loose.blockOrder as string[] | undefined, selected);

  // 2. hiddenSections — content-wins: an essential CORE the host
  //    turned off is hidden ONLY when it holds no entered data.
  const hiddenOff = (CORE_BLOCK_ORDER as readonly string[]).filter(
    (s) => offered.has(s) && !onSet.has(s) && !sectionHasContent(s, manifest),
  );
  if (hiddenOff.length > 0) {
    loose.hiddenSections = Array.from(new Set([
      ...((loose.hiddenSections as string[] | undefined) ?? []),
      ...hiddenOff,
    ]));
  }

  // 3. layouts.
  if (Object.keys(picks.layouts).length > 0) {
    loose.layouts = {
      ...((loose.layouts as Record<string, string> | undefined) ?? {}),
      ...picks.layouts,
    };
  }

  return loose as unknown as StoryManifest;
}
