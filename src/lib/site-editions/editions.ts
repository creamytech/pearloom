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
    label: 'Pressed Garden',
    tagline: 'Cotton paper, pressed wildflowers, the Pearloom warmth.',
    description:
      "Postcard-style hero with a serif drop cap and a foliated date glyph. Chapter markers ('I — How we met') open every section. Generous body type, a single hairline thread between sections, paper grain underfoot. Built for sites whose center of gravity is the narrative.",
    heroVariantId: 'postcard',
    storyLayoutId: 'timeline',
    sectionOpener: 'chapter-mark',
    divider: 'thread',
    atmospherePreset: { intensity: 'low' },
    typeScale: 'generous',
    ctaShape: 'hairline',
    blockOrder: ['story', 'details', 'schedule', 'travel', 'registry', 'faq', 'rsvp'],
    blockStyles: {
      story:    { cardRadius: 'soft', cardShadow: 'none', cardBorder: 'hairline', cardPadding: 'generous', spacing: 'spacious' },
      schedule: { cardRadius: 'soft', cardShadow: 'none', cardBorder: 'hairline', cardPadding: 'generous', spacing: 'comfortable' },
      travel:   { cardRadius: 'soft', cardShadow: 'none', cardBorder: 'hairline', cardPadding: 'generous' },
      faq:      { cardRadius: 'soft', cardShadow: 'none', cardBorder: 'hairline', cardPadding: 'generous', spacing: 'comfortable' },
      rsvp:     { cardRadius: 'soft', cardShadow: 'none', cardBorder: 'hairline', cardPadding: 'generous' },
    },
    recommendedFor: ['wedding', 'anniversary', 'vow-renewal'],
    /* Almanac — warm cream paper, olive ink, Fraunces display +
       Inter body. Matches Pearloom's current v8 default so existing
       Almanac sites are byte-for-byte unchanged. Display weight
       600 + scale 1.0 + 0.14em eyebrow = the Pearloom v8 baseline. */
    /* Pressed Garden — cotton paper cream, sage-green primary,
       lavender wash, peach highlight. The prototype's swatch order
       (lavender · sage · peach · cream) maps to:
         accent=sage, accentLight=lavender, gold-stop=peach. */
    recommendedTheme: {
      colors: {
        background: '#F5EFE2',   // cream paper
        cardBg: '#FBF7EE',
        foreground: '#3D4A1F',   // sage-deep ink
        muted: '#7A8467',
        accent: '#8B9C5A',       // sage primary
        accentLight: '#E5DCEF',  // lavender wash
      },
      fonts: {
        heading: 'Fraunces',
        body: 'Inter',
        script: 'Caveat',
      },
      cardRadius: 'rounded',
      displayWeight: 600,
      heroScale: 1,
      eyebrowSpacing: '0.14em',
      cardShadow: '0 8px 22px rgba(61,74,31,0.08)',
    },
  },
  {
    id: 'cinema',
    label: 'Midnight Velvet',
    tagline: 'Inky velvet, candlelight gold — made for evenings.',
    description:
      "Photo-first hero pushed to full viewport with a slow Ken Burns. Sans-serif uppercase kickers ('REEL ONE · WINTER 2026'). Black-bar slug lines open each section. Photos default to 21:9, divider is a single sprocket row. Pearl reserved for the one RSVP CTA. Built for cinematic destinations.",
    heroVariantId: 'photo-first',
    storyLayoutId: 'parallax',
    sectionOpener: 'slug-line',
    divider: 'sprocket',
    atmospherePreset: { intensity: 'standard' },
    typeScale: 'compact',
    ctaShape: 'pearl',
    blockOrder: ['gallery', 'details', 'schedule', 'travel', 'story', 'registry', 'rsvp'],
    blockStyles: {
      story:    { cardRadius: 'sharp', cardShadow: 'none', cardBorder: 'none', cardPadding: 'compact' },
      schedule: { cardRadius: 'sharp', cardShadow: 'none', cardBorder: 'none', cardPadding: 'compact', spacing: 'comfortable' },
      gallery:  { cardRadius: 'sharp', cardShadow: 'none', cardBorder: 'none', cardPadding: 'compact' },
      travel:   { cardRadius: 'sharp', cardShadow: 'none', cardBorder: 'none', cardPadding: 'compact' },
      faq:      { cardRadius: 'sharp', cardShadow: 'none', cardBorder: 'none', cardPadding: 'default' },
      rsvp:     { cardRadius: 'sharp', cardShadow: 'lifted', cardBorder: 'none', cardPadding: 'compact' },
    },
    recommendedFor: ['engagement', 'milestone-birthday', 'sweet-sixteen'],
    /* Cinema — dark theatre paper, cream ink, italic Cormorant
       Garamond display, gold accent. Sharp 2-3px radii. The
       prototype's Midnight Velvet sits here. Display weight 500
       (slim elegant) + hero scale 1.08 (slightly bigger for film
       drama) + 0.18em eyebrow (tighter, more cinematic kicker). */
    recommendedTheme: {
      colors: {
        background: '#1A1B2E',
        cardBg: '#262842',
        foreground: '#F1EBDD',
        muted: '#8B86A0',
        accent: '#C9A24B',
        accentLight: 'rgba(241,235,221,0.09)',
      },
      fonts: {
        heading: 'Cormorant Garamond',
        body: 'Inter',
        script: 'Caveat',
      },
      cardRadius: 'sharp',
      displayWeight: 500,
      heroScale: 1.08,
      eyebrowSpacing: '0.18em',
      cardShadow: '0 16px 40px rgba(0,0,0,0.40)',
    },
  },
  {
    id: 'postcard-box',
    label: 'Tuscan Watercolor',
    tagline: 'Soft washes, terracotta & sage, blooms and lemons.',
    description:
      "A bundle of cards on a soft cream-deep gauze. Tilted polaroid hero, each section is its own card with a 6° rotated stamp and a typed handwritten kicker. Thread-stitch dividers, torn-paper bottom edges, no atmosphere shader — the cards ARE the chrome. Built for travel-flavored, multi-day, fun-leaning events.",
    heroVariantId: 'postcard',
    storyLayoutId: 'bento',
    sectionOpener: 'stamp',
    divider: 'stitch',
    atmospherePreset: { intensity: 'off' },
    typeScale: 'standard',
    ctaShape: 'tag',
    blockOrder: ['gallery', 'details', 'schedule', 'travel', 'rsvp', 'registry', 'faq'],
    blockStyles: {
      story:    { cardRadius: 'pillow', cardShadow: 'soft', cardBorder: 'none', cardPadding: 'default', cardShape: 'pillow' },
      schedule: { cardRadius: 'pillow', cardShadow: 'soft', cardBorder: 'none', cardPadding: 'default' },
      gallery:  { cardRadius: 'pillow', cardShadow: 'lifted', cardBorder: 'none', cardPadding: 'compact' },
      travel:   { cardRadius: 'pillow', cardShadow: 'soft', cardBorder: 'none', cardPadding: 'default' },
      faq:      { cardRadius: 'pillow', cardShadow: 'none', cardBorder: 'hairline', cardPadding: 'default' },
      rsvp:     { cardRadius: 'pillow', cardShadow: 'lifted', cardBorder: 'none', cardPadding: 'default' },
    },
    allowedMotifs: ['polaroid', 'postIt', 'stamp', 'squiggle'],
    recommendedFor: [
      'bachelor-party',
      'bachelorette-party',
      'bridal-shower',
      'reunion',
      'sip-and-see',
      'baby-shower',
    ],
    /* Postcard Box — warm cream-deep paper, peach accent, italic
       Fraunces (display) + Caveat (script handwritten tags). Pillow
       24px radii to match the polaroid stack. The prototype's
       Tuscan Watercolor sits here. Display weight 500 (lighter
       Fraunces feels casual) + scale 1.0 + 0.14em eyebrow (warm). */
    recommendedTheme: {
      colors: {
        background: '#FBF6EC',
        cardBg: '#FFFCF5',
        foreground: '#4B3D2A',
        muted: '#A0907A',
        accent: '#C2693E',
        accentLight: '#F4E3D3',
      },
      fonts: {
        heading: 'Fraunces',
        body: 'Inter',
        script: 'Caveat',
      },
      cardRadius: 'pillow',
      displayWeight: 500,
      heroScale: 1,
      eyebrowSpacing: '0.14em',
      cardShadow: '0 14px 30px rgba(75,61,42,0.10)',
    },
  },
  {
    id: 'linen-folder',
    label: 'Santorini Linen',
    tagline: 'Sun-bleached linen, Aegean blue, whitewash & olive.',
    description:
      "Split hero — 4:5 photo left, names right in Fraunces upright (not italic) with a gold hairline rule above and below the date. Mono-uppercased section labels with a leading gold dot ('. PROGRAMME'), centered gold hairline dividers, paper-only atmosphere. No emoji, no stickers. Built for formal events.",
    heroVariantId: 'split',
    storyLayoutId: 'magazine',
    sectionOpener: 'mono-label',
    divider: 'gold-hairline',
    atmospherePreset: { kind: 'paper', intensity: 'low' },
    typeScale: 'standard',
    ctaShape: 'pill',
    blockOrder: ['details', 'schedule', 'rsvp', 'travel', 'registry', 'story', 'faq'],
    blockStyles: {
      story:    { cardRadius: 'sharp', cardShadow: 'none', cardBorder: 'hairline', cardPadding: 'generous' },
      schedule: { cardRadius: 'sharp', cardShadow: 'none', cardBorder: 'hairline', cardPadding: 'generous', textAlign: 'center' },
      travel:   { cardRadius: 'sharp', cardShadow: 'none', cardBorder: 'hairline', cardPadding: 'generous' },
      faq:      { cardRadius: 'sharp', cardShadow: 'none', cardBorder: 'hairline', cardPadding: 'generous' },
      rsvp:     { cardRadius: 'sharp', cardShadow: 'none', cardBorder: 'hairline', cardPadding: 'generous' },
      registry: { cardRadius: 'sharp', cardShadow: 'none', cardBorder: 'hairline', cardPadding: 'default' },
    },
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
    /* Linen Folder — sun-bleached linen paper, deep navy ink,
       Cormorant Garamond upright (not italic) with gold accent.
       Sharp 5px radii. The prototype's Santorini Linen sits here.
       Display weight 600 + hero scale 1.18 (formal grand) +
       0.20em eyebrow (tight, hotel-stationery elegance). */
    recommendedTheme: {
      colors: {
        background: '#F5F1E8',
        cardBg: '#FBF9F3',
        foreground: '#283D4E',
        muted: '#8A9AA6',
        accent: '#3F6E92',
        accentLight: '#E2EAEF',
      },
      fonts: {
        heading: 'Cormorant Garamond',
        body: 'Inter',
        script: 'Caveat',
      },
      cardRadius: 'soft',
      displayWeight: 600,
      heroScale: 1.18,
      eyebrowSpacing: '0.20em',
      cardShadow: '0 1px 0 rgba(40,61,78,0.05)',
    },
  },
  {
    id: 'quiet',
    label: 'Modern Editorial',
    tagline: 'Flat matte, high-contrast type. The clean counterpoint.',
    description:
      "Centered 560px column, single thread above the names. Wide-margined sections (max 640px), tiny mono overlines, 24px of whitespace as the divider. No countdown, no broadcast bar, no decor. Photos render small and centered when at all. Built for events that ask the design to step back.",
    heroVariantId: 'minimal',
    storyLayoutId: 'timeline',
    sectionOpener: 'overline',
    divider: 'whitespace',
    atmospherePreset: { intensity: 'off' },
    typeScale: 'compact',
    ctaShape: 'hairline',
    blockOrder: ['story', 'details', 'schedule', 'rsvp', 'gallery'],
    blockStyles: {
      story:    { cardRadius: 'sharp', cardShadow: 'none', cardBorder: 'none', cardPadding: 'compact', spacing: 'spacious', textAlign: 'center' },
      schedule: { cardRadius: 'sharp', cardShadow: 'none', cardBorder: 'none', cardPadding: 'compact', spacing: 'spacious', textAlign: 'center' },
      gallery:  { cardRadius: 'sharp', cardShadow: 'none', cardBorder: 'none', cardPadding: 'compact' },
      rsvp:     { cardRadius: 'sharp', cardShadow: 'none', cardBorder: 'none', cardPadding: 'compact', textAlign: 'center' },
    },
    forbiddenMotifs: ['blob', 'sparkle', 'heart', 'postIt', 'polaroid', 'stamp'],
    recommendedFor: ['memorial', 'funeral'],
    /* Modern Editorial — flat matte cream, near-black ink, single
       gold accent for high-contrast type. Prototype swatch reads
       black · gold · gray · cream so accent stops carry gold; no
       serif at all. Sharp 2px radii. */
    recommendedTheme: {
      colors: {
        background: '#F4F3EF',
        cardBg: '#FBFAF7',
        foreground: '#0E0D0B',
        muted: '#8A8980',
        accent: '#B8935A',        // gold accent
        accentLight: '#E9E7E0',
      },
      fonts: {
        heading: 'Inter',
        body: 'Inter',
        script: 'Inter',
      },
      cardRadius: 'sharp',
      displayWeight: 800,
      heroScale: 1,
      eyebrowSpacing: '0.24em',
      cardShadow: 'none',
    },
  },
  {
    id: 'coastal',
    label: 'Coastal Ink',
    tagline: 'Deckled paper, navy ink line-work, sea-glass calm.',
    description:
      "Deckled hand-cut paper edges, navy line-work, sea-glass blue accent. Square 3px radii. Built for seaside / coastal / cape destinations and any event that wants the calm of harbor light rather than the warmth of olive groves. Photos sit in deckled frames; dividers are torn-paper hairlines.",
    heroVariantId: 'split',
    storyLayoutId: 'magazine',
    sectionOpener: 'mono-label',
    divider: 'gold-hairline',
    atmospherePreset: { kind: 'paper', intensity: 'low' },
    typeScale: 'standard',
    ctaShape: 'pill',
    blockOrder: ['details', 'schedule', 'rsvp', 'travel', 'registry', 'story', 'faq'],
    blockStyles: {
      story:    { cardRadius: 'sharp', cardShadow: 'none', cardBorder: 'hairline', cardPadding: 'generous' },
      schedule: { cardRadius: 'sharp', cardShadow: 'none', cardBorder: 'hairline', cardPadding: 'generous' },
      travel:   { cardRadius: 'sharp', cardShadow: 'none', cardBorder: 'hairline', cardPadding: 'generous' },
      faq:      { cardRadius: 'sharp', cardShadow: 'none', cardBorder: 'hairline', cardPadding: 'generous' },
      rsvp:     { cardRadius: 'sharp', cardShadow: 'none', cardBorder: 'hairline', cardPadding: 'generous' },
    },
    forbiddenMotifs: ['blob', 'sparkle', 'heart'],
    recommendedFor: ['wedding', 'engagement', 'rehearsal-dinner', 'welcome-party'],
    /* Coastal Ink — deckled cream paper, deep navy ink, sea-glass blue
       accent, gold hint. Cormorant Garamond display. Sharp 3px radii.
       Maps the prototype's Coastal Ink theme one-to-one. */
    recommendedTheme: {
      colors: {
        background: '#EAE5D7',
        cardBg: '#F4F0E4',
        foreground: '#1F3A4D',
        muted: '#82929E',
        accent: '#2C5E7A',
        accentLight: '#DCE5E7',
      },
      fonts: {
        heading: 'Cormorant Garamond',
        body: 'Inter',
        script: 'Caveat',
      },
      cardRadius: 'sharp',
      displayWeight: 600,
      heroScale: 1.12,
      eyebrowSpacing: '0.22em',
      cardShadow: '0 1px 0 rgba(31,58,77,0.06)',
    },
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
