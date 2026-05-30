// ─────────────────────────────────────────────────────────────
// Site Editions — the 5 canonical EditionDefinitions.
//
// Per the layout-overhaul plan (workflow synthesis dated 2026-05-30):
// 5 Editions cover ~90% of occasions. Mixtape and Field Notes fold
// into adjacent Editions as occasion-driven sub-tunings rather
// than separate top-level entries — the picker reads cleaner at
// 5 tiles than 7.
// ─────────────────────────────────────────────────────────────

import type { SiteBlockKey } from '@/lib/site-mode';
import type { EditionDefinition, EditionId } from './types';

/** The default block order shared across non-Quiet Editions —
 *  same shape as the renderer's existing fallback. Each Edition
 *  may override. */
const STANDARD_ORDER: SiteBlockKey[] = [
  'story',
  'details',
  'schedule',
  'travel',
  'registry',
  'gallery',
  'faq',
  'rsvp',
];

export const EDITIONS: EditionDefinition[] = [
  {
    id: 'almanac',
    label: 'The Almanac',
    tagline: 'A bound book. Chapter-marked. Serif drop cap.',
    description:
      "Postcard-style hero with a serif drop cap and a foliated date glyph. Chapter markers ('I — How we met') open every section. Generous body type, a single hairline thread between sections, paper grain underfoot. Built for sites whose center of gravity is the narrative.",
    heroVariantId: 'postcard',
    sectionOpener: 'chapter-mark',
    divider: 'thread',
    atmospherePreset: { intensity: 'low' },
    typeScale: 'generous',
    ctaShape: 'hairline',
    blockOrder: ['story', 'details', 'schedule', 'travel', 'registry', 'faq', 'rsvp'],
    recommendedFor: ['wedding', 'anniversary', 'vow-renewal'],
  },
  {
    id: 'cinema',
    label: 'The Cinema',
    tagline: 'Letterboxed film magazine. Full-bleed photo. Slow Ken Burns.',
    description:
      "Photo-first hero pushed to full viewport with a slow Ken Burns. Sans-serif uppercase kickers ('REEL ONE · WINTER 2026'). Black-bar slug lines open each section. Photos default to 21:9, divider is a single sprocket row. Pearl reserved for the one RSVP CTA. Built for cinematic destinations.",
    heroVariantId: 'photo-first',
    sectionOpener: 'slug-line',
    divider: 'sprocket',
    atmospherePreset: { intensity: 'standard' },
    typeScale: 'compact',
    ctaShape: 'pearl',
    blockOrder: ['gallery', 'details', 'schedule', 'travel', 'story', 'registry', 'rsvp'],
    recommendedFor: ['engagement', 'milestone-birthday', 'sweet-sixteen'],
  },
  {
    id: 'postcard-box',
    label: 'The Postcard Box',
    tagline: 'Stacked tilted cards. Stamps. Torn paper. Handwritten.',
    description:
      "A bundle of cards on a soft cream-deep gauze. Tilted polaroid hero, each section is its own card with a 6° rotated stamp and a typed handwritten kicker. Thread-stitch dividers, torn-paper bottom edges, no atmosphere shader — the cards ARE the chrome. Built for travel-flavored, multi-day, fun-leaning events.",
    heroVariantId: 'postcard',
    sectionOpener: 'stamp',
    divider: 'stitch',
    atmospherePreset: { intensity: 'off' },
    typeScale: 'standard',
    ctaShape: 'tag',
    blockOrder: ['gallery', 'details', 'schedule', 'travel', 'rsvp', 'registry', 'faq'],
    allowedMotifs: ['polaroid', 'postIt', 'stamp', 'squiggle'],
    recommendedFor: [
      'bachelor-party',
      'bachelorette-party',
      'bridal-shower',
      'reunion',
      'sip-and-see',
      'baby-shower',
    ],
  },
  {
    id: 'linen-folder',
    label: 'The Linen Folder',
    tagline: 'Hotel stationery formal. Two-column. Gold hairline.',
    description:
      "Split hero — 4:5 photo left, names right in Fraunces upright (not italic) with a gold hairline rule above and below the date. Mono-uppercased section labels with a leading gold dot ('. PROGRAMME'), centered gold hairline dividers, paper-only atmosphere. No emoji, no stickers. Built for formal events.",
    heroVariantId: 'split',
    sectionOpener: 'mono-label',
    divider: 'gold-hairline',
    atmospherePreset: { kind: 'paper', intensity: 'low' },
    typeScale: 'standard',
    ctaShape: 'pill',
    blockOrder: ['details', 'schedule', 'rsvp', 'travel', 'registry', 'story', 'faq'],
    forbiddenMotifs: ['blob', 'sparkle', 'heart'],
    recommendedFor: [
      'rehearsal-dinner',
      'bar-mitzvah',
      'bat-mitzvah',
      'quinceanera',
      'baptism',
      'first-communion',
      'confirmation',
      'retirement',
    ],
  },
  {
    id: 'quiet',
    label: 'The Quiet Edition',
    tagline: 'Whitespace and restraint. Minimal. No chrome.',
    description:
      "Centered 560px column, single thread above the names. Wide-margined sections (max 640px), tiny mono overlines, 24px of whitespace as the divider. No countdown, no broadcast bar, no decor. Photos render small and centered when at all. Built for events that ask the design to step back.",
    heroVariantId: 'minimal',
    sectionOpener: 'overline',
    divider: 'whitespace',
    atmospherePreset: { intensity: 'off' },
    typeScale: 'compact',
    ctaShape: 'hairline',
    blockOrder: ['story', 'details', 'schedule', 'rsvp', 'gallery'],
    forbiddenMotifs: ['blob', 'sparkle', 'heart', 'postIt', 'polaroid', 'stamp'],
    recommendedFor: ['memorial', 'funeral'],
  },
];

void STANDARD_ORDER;

/** O(1) lookup by id. */
export const EDITIONS_BY_ID: Record<EditionId, EditionDefinition> = EDITIONS.reduce(
  (acc, ed) => {
    acc[ed.id] = ed;
    return acc;
  },
  {} as Record<EditionId, EditionDefinition>,
);

/** Default Edition when nothing matches — Almanac is the closest
 *  to the current SiteV8Renderer's behaviour (postcard hero,
 *  thread divider, narrative-led ordering). Picking it here
 *  ensures legacy manifests resolve to a visually-similar
 *  default. */
export const DEFAULT_EDITION_ID: EditionId = 'almanac';
