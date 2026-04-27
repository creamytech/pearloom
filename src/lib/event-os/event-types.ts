// ─────────────────────────────────────────────────────────────
// Pearloom / lib/event-os/event-types.ts
//
// The single source of truth for every event type Pearloom
// supports. One registry drives:
//   • URL prefix (site-urls.ts → SiteOccasion)
//   • Proxy rewrite allowlist (proxy.ts)
//   • Wizard category → event picker (WizardV2)
//   • Default block set for a new site (SiteRenderer)
//   • RSVP field preset (rsvp-presets.ts)
//   • Pear AI drafting voice (memory-engine)
//   • Template gallery filter (TemplateGallery)
//
// To add a new event type: append an entry to EVENT_TYPES, add
// the id to SiteOccasion in site-urls.ts, and ship. Every other
// surface reads the registry.
//
// See CLAUDE-PRODUCT.md §3 for the strategic catalog and §7 for
// the ranked roadmap of which events to ship next.
// ─────────────────────────────────────────────────────────────

import type { BlockType } from '@/types';
import type { SiteOccasion } from '@/lib/site-urls';

// ── Enums ────────────────────────────────────────────────────

/** Grouping used by the wizard to reduce dropdown-fatigue. */
export type EventCategory =
  | 'wedding-arc'      // Events around one wedding
  | 'family'           // Partner + family milestones (anniversary, baby shower, etc.)
  | 'milestone'        // Birthdays, retirement, graduation
  | 'cultural'         // Religious / cultural ceremonies
  | 'commemoration';   // Memorials, reunions

/** Tone Pear adopts when drafting copy for this event. */
export type EventVoice =
  | 'celebratory'      // default: warm, upbeat
  | 'intimate'         // small / tender (bridal shower, sip-and-see)
  | 'ceremonial'       // formal, ritual-aware (weddings, bar/bat mitzvah)
  | 'playful'          // loud, fun, in-on-the-joke (bachelor/ette)
  | 'solemn';          // gentle, respectful (memorial, funeral)

/** RSVP field preset — determines which questions appear on the RSVP form. */
export type RsvpPreset =
  | 'wedding'
  | 'shower'
  | 'bachelor'
  | 'memorial'
  | 'reunion'
  | 'milestone'
  | 'cultural'
  | 'casual';

// ── Core interface ───────────────────────────────────────────

export interface EventType {
  /** URL-safe id — must be the same string used by SiteOccasion. */
  id: SiteOccasion;

  /** Human label for the wizard and UI. */
  label: string;

  /** One-line description the wizard shows under the label. */
  tagline: string;

  /** Which wizard category bucket this event belongs to. */
  category: EventCategory;

  /** Who typically hosts — informs wizard pronouns + Pear voice. */
  hostRole: string;

  /** Voice for Pear's AI drafting. */
  voice: EventVoice;

  /** RSVP field preset for this event. */
  rsvpPreset: RsvpPreset;

  /** Whether this event defaults to private (password/invite gate). */
  privateByDefault: boolean;

  /** Blocks that are on by default when the site is generated. */
  defaultBlocks: BlockType[];

  /** Blocks allowed but off by default — user can add from library. */
  optionalBlocks: BlockType[];

  /** Blocks hidden for this event — never shown in the block library. */
  hiddenBlocks: BlockType[];

  /** Suggested template ids from src/lib/templates/wedding-templates.ts. */
  templateIds: string[];

  /** Whether this event type is production-shipping or still in development. */
  status: 'shipping' | 'beta' | 'planned';
}

// ── Registry ─────────────────────────────────────────────────
//
// New event types go HERE. Every other surface reads this.
// Keep entries grouped by category so reviewers can see
// coverage at a glance.
//
// Block types referenced below must exist in src/types.ts BlockType.
// New blocks declared in CLAUDE-PRODUCT.md §4 (itinerary,
// costSplitter, tributeWall, etc.) are marked 'planned' below —
// referenced by string literal so the registry compiles before
// the block implementations land.

// Shared block set every event gets (a site without these
// isn't a site).
const UNIVERSAL: BlockType[] = ['hero', 'event', 'photos', 'footer'];

export const EVENT_TYPES: EventType[] = [
  // ═══════════════════════════════════════════════════════════
  // WEDDING ARC — the 8 events around one wedding
  // ═══════════════════════════════════════════════════════════
  {
    id: 'wedding',
    label: 'Wedding',
    tagline: 'The ceremony and everything around it',
    category: 'wedding-arc',
    hostRole: 'couple',
    voice: 'ceremonial',
    rsvpPreset: 'wedding',
    privateByDefault: false,
    defaultBlocks: [
      ...UNIVERSAL,
      'story', 'countdown', 'rsvp', 'registry', 'travel',
      'faq', 'guestbook', 'weddingParty', 'map',
    ],
    optionalBlocks: [
      'photoWall', 'gallery', 'video', 'quote', 'spotify',
      'quiz', 'storymap', 'hashtag', 'welcome', 'vibeQuote',
    ],
    hiddenBlocks: ['anniversary'],
    templateIds: [
      'ethereal-garden', 'art-deco-glamour', 'tuscan-villa',
      'classic-cathedral', 'midnight-celestial',
    ],
    status: 'shipping',
  },
  {
    id: 'engagement',
    label: 'Engagement party',
    tagline: 'They said yes — tell the story',
    category: 'wedding-arc',
    hostRole: 'couple or parents',
    voice: 'celebratory',
    rsvpPreset: 'wedding',
    privateByDefault: false,
    defaultBlocks: [
      ...UNIVERSAL,
      'story', 'countdown', 'rsvp', 'photos', 'map', 'faq',
    ],
    optionalBlocks: ['gallery', 'quote', 'spotify', 'hashtag', 'guestbook'],
    hiddenBlocks: ['weddingParty', 'registry', 'anniversary'],
    templateIds: ['ethereal-garden', 'midnight-celestial', 'chic-monochrome'],
    status: 'shipping',
  },
  {
    id: 'anniversary',
    label: 'Anniversary',
    tagline: 'Years together, still writing chapters',
    category: 'family',
    hostRole: 'couple',
    voice: 'intimate',
    rsvpPreset: 'casual',
    privateByDefault: false,
    defaultBlocks: [
      ...UNIVERSAL,
      'story', 'anniversary', 'gallery', 'quote', 'guestbook',
    ],
    optionalBlocks: ['countdown', 'rsvp', 'spotify', 'video', 'storymap', 'map'],
    hiddenBlocks: ['registry', 'weddingParty'],
    templateIds: ['golden-hour', 'rustic-romance', 'vintage-romance'],
    status: 'shipping',
  },
  {
    id: 'birthday',
    label: 'Birthday',
    tagline: 'Every year a new story',
    category: 'milestone',
    hostRole: 'birthday person or parent',
    voice: 'celebratory',
    rsvpPreset: 'casual',
    privateByDefault: false,
    defaultBlocks: [...UNIVERSAL, 'countdown', 'rsvp', 'gallery', 'map'],
    optionalBlocks: ['story', 'spotify', 'video', 'quote', 'guestbook', 'hashtag'],
    hiddenBlocks: ['weddingParty', 'registry', 'anniversary'],
    templateIds: ['martini-hour', 'confetti-party', 'neon-nights'],
    status: 'shipping',
  },
  {
    id: 'story',
    label: 'Story site',
    tagline: 'Anything that needs a home',
    category: 'family',
    hostRole: 'storyteller',
    voice: 'intimate',
    rsvpPreset: 'casual',
    privateByDefault: false,
    defaultBlocks: [...UNIVERSAL, 'story', 'gallery', 'quote', 'guestbook'],
    optionalBlocks: [
      'video', 'storymap', 'spotify', 'countdown', 'rsvp', 'map',
    ],
    hiddenBlocks: ['weddingParty', 'registry', 'anniversary'],
    templateIds: ['quiet-luxury', 'dark-academia'],
    status: 'shipping',
  },

  // ═══════════════════════════════════════════════════════════
  // WEDDING ARC — adjacent events (planned)
  // Each is typically hosted by someone OTHER than the couple
  // (MOH, best man, parents). Shipping these 10x's the funnel
  // because every wedding = 3–4 Pearloom sites.
  // ═══════════════════════════════════════════════════════════
  {
    id: 'bachelor-party',
    label: 'Bachelor party',
    tagline: 'Last weekend of the old life',
    category: 'wedding-arc',
    hostRole: 'best man',
    voice: 'playful',
    rsvpPreset: 'bachelor',
    privateByDefault: true, // Per CLAUDE-PRODUCT.md §8 Q2
    defaultBlocks: [
      ...UNIVERSAL,
      'countdown', 'rsvp', 'itinerary', 'costSplitter',
      'activityVote', 'packingList', 'rooms', 'faq', 'privacyGate',
    ],
    optionalBlocks: ['photoWall', 'spotify', 'groupChat', 'map', 'dressCode'],
    hiddenBlocks: ['weddingParty', 'registry', 'anniversary', 'obituary'],
    templateIds: ['last-weekend-in', 'neon-nights', 'desert-boho'],
    status: 'beta',
  },
  {
    id: 'bachelorette-party',
    label: 'Bachelorette party',
    tagline: 'The weekend she\u2019ll still talk about in ten years',
    category: 'wedding-arc',
    hostRole: 'maid of honor',
    voice: 'playful',
    rsvpPreset: 'bachelor',
    privateByDefault: true,
    defaultBlocks: [
      ...UNIVERSAL,
      'countdown', 'rsvp', 'itinerary', 'costSplitter',
      'activityVote', 'packingList', 'rooms', 'dressCode',
      'faq', 'privacyGate',
    ],
    optionalBlocks: ['photoWall', 'spotify', 'groupChat', 'map', 'hashtag'],
    hiddenBlocks: ['weddingParty', 'registry', 'anniversary', 'obituary'],
    templateIds: ['last-weekend-in', 'desert-boho', 'tropical-breeze'],
    status: 'beta',
  },
  {
    id: 'bridal-shower',
    label: 'Bridal shower',
    tagline: 'A gentle gathering, gifts and stories',
    category: 'wedding-arc',
    hostRole: 'maid of honor or mother',
    voice: 'intimate',
    rsvpPreset: 'shower',
    privateByDefault: false,
    defaultBlocks: [
      ...UNIVERSAL,
      'countdown', 'rsvp', 'registry', 'adviceWall',
      'dressCode', 'menu', 'map', 'faq',
    ],
    optionalBlocks: ['spotify', 'photoWall', 'activityVote', 'quote', 'hashtag'],
    hiddenBlocks: ['weddingParty', 'anniversary', 'obituary'],
    templateIds: ['gentle-gathering', 'southern-magnolia', 'vintage-romance'],
    status: 'beta',
  },
  {
    id: 'bridal-luncheon',
    label: 'Bridal luncheon',
    tagline: 'The bride and her closest circle',
    category: 'wedding-arc',
    hostRole: 'bride',
    voice: 'intimate',
    rsvpPreset: 'shower',
    privateByDefault: false,
    defaultBlocks: [...UNIVERSAL, 'rsvp', 'menu', 'map', 'dressCode'],
    optionalBlocks: ['story', 'quote', 'photoWall', 'adviceWall'],
    hiddenBlocks: ['weddingParty', 'registry', 'anniversary', 'obituary'],
    templateIds: ['a-quiet-table', 'vintage-romance', 'quiet-luxury'],
    status: 'beta',
  },
  {
    id: 'rehearsal-dinner',
    label: 'Rehearsal dinner',
    tagline: 'The night before the best day',
    category: 'wedding-arc',
    hostRole: 'groom\u2019s parents',
    voice: 'ceremonial',
    rsvpPreset: 'wedding',
    privateByDefault: false,
    defaultBlocks: [
      ...UNIVERSAL,
      'rsvp', 'toastSignup', 'menu', 'dressCode', 'map', 'faq',
    ],
    optionalBlocks: ['story', 'weddingParty', 'quote', 'spotify'],
    hiddenBlocks: ['registry', 'anniversary', 'obituary', 'countdown'],
    templateIds: ['the-night-before', 'quiet-luxury', 'vintage-romance'],
    status: 'beta',
  },
  {
    id: 'welcome-party',
    label: 'Welcome party',
    tagline: 'The opening night of a wedding weekend',
    category: 'wedding-arc',
    hostRole: 'couple',
    voice: 'celebratory',
    rsvpPreset: 'wedding',
    privateByDefault: false,
    defaultBlocks: [...UNIVERSAL, 'itinerary', 'rsvp', 'map', 'dressCode', 'faq'],
    optionalBlocks: ['menu', 'spotify', 'photoWall', 'welcome', 'hashtag'],
    hiddenBlocks: ['weddingParty', 'registry', 'anniversary', 'obituary'],
    templateIds: ['warm-threshold', 'tuscan-villa', 'desert-boho'],
    status: 'beta',
  },
  {
    id: 'brunch',
    label: 'Morning-after brunch',
    tagline: 'One more round of goodbyes',
    category: 'wedding-arc',
    hostRole: 'parents',
    voice: 'intimate',
    rsvpPreset: 'casual',
    privateByDefault: false,
    defaultBlocks: [...UNIVERSAL, 'menu', 'map', 'rsvp'],
    optionalBlocks: ['quote', 'photoWall', 'guestbook', 'faq'],
    hiddenBlocks: ['weddingParty', 'registry', 'anniversary', 'obituary', 'countdown'],
    templateIds: ['one-more-round', 'southern-magnolia', 'cottage-pastoral'],
    status: 'beta',
  },
  {
    id: 'vow-renewal',
    label: 'Vow renewal',
    tagline: 'Saying it again, on purpose',
    category: 'family',
    hostRole: 'couple',
    voice: 'ceremonial',
    rsvpPreset: 'wedding',
    privateByDefault: false,
    defaultBlocks: [
      ...UNIVERSAL,
      'story', 'countdown', 'rsvp', 'anniversary',
      'gallery', 'quote', 'guestbook', 'map',
    ],
    optionalBlocks: ['spotify', 'storymap', 'video', 'weddingParty', 'hashtag'],
    hiddenBlocks: ['registry', 'obituary'],
    templateIds: ['saying-it-again', 'rustic-romance', 'golden-hour'],
    status: 'beta',
  },

  // ═══════════════════════════════════════════════════════════
  // FAMILY — baby, home, new-life milestones
  // ═══════════════════════════════════════════════════════════
  {
    id: 'baby-shower',
    label: 'Baby shower',
    tagline: 'Gifts, advice, and a soft landing',
    category: 'family',
    hostRole: 'close friend or family member',
    voice: 'intimate',
    rsvpPreset: 'shower',
    privateByDefault: false,
    defaultBlocks: [
      ...UNIVERSAL,
      'countdown', 'rsvp', 'registry', 'adviceWall',
      'nameVote', 'menu', 'dressCode', 'map', 'faq',
    ],
    optionalBlocks: ['spotify', 'photoWall', 'activityVote', 'quote'],
    hiddenBlocks: ['weddingParty', 'anniversary', 'obituary'],
    templateIds: ['soft-landing', 'blush-romance', 'wildflower-meadow'],
    status: 'beta',
  },
  {
    id: 'gender-reveal',
    label: 'Gender reveal',
    tagline: 'Boy, girl, or surprise',
    category: 'family',
    hostRole: 'parents',
    voice: 'celebratory',
    rsvpPreset: 'casual',
    privateByDefault: false,
    defaultBlocks: [...UNIVERSAL, 'countdown', 'rsvp', 'map', 'nameVote'],
    optionalBlocks: ['photoWall', 'video', 'activityVote', 'quote'],
    hiddenBlocks: ['weddingParty', 'registry', 'anniversary', 'obituary'],
    templateIds: ['blue-pink-or-surprise', 'confetti-party', 'blush-romance'],
    status: 'beta',
  },
  {
    id: 'sip-and-see',
    label: 'Sip and see',
    tagline: 'Come meet the new baby',
    category: 'family',
    hostRole: 'parents',
    voice: 'intimate',
    rsvpPreset: 'casual',
    privateByDefault: false,
    defaultBlocks: [...UNIVERSAL, 'rsvp', 'menu', 'map', 'faq'],
    optionalBlocks: ['photoWall', 'quote', 'guestbook'],
    hiddenBlocks: ['weddingParty', 'registry', 'anniversary', 'obituary', 'countdown'],
    templateIds: ['come-meet-the-baby', 'cottage-pastoral', 'blush-romance'],
    status: 'beta',
  },
  {
    id: 'housewarming',
    label: 'Housewarming',
    tagline: 'Come over, see the place',
    category: 'family',
    hostRole: 'homeowner',
    voice: 'celebratory',
    rsvpPreset: 'casual',
    privateByDefault: false,
    defaultBlocks: [
      ...UNIVERSAL,
      'rsvp', 'registry', 'map', 'dressCode', 'menu', 'faq',
    ],
    optionalBlocks: ['gallery', 'story', 'quote', 'spotify'],
    hiddenBlocks: ['weddingParty', 'anniversary', 'obituary'],
    templateIds: ['come-see-the-place', 'industrial-loft', 'chic-monochrome'],
    status: 'beta',
  },

  // ═══════════════════════════════════════════════════════════
  // MILESTONE — birthdays, retirement, graduation
  // ═══════════════════════════════════════════════════════════
  {
    id: 'first-birthday',
    label: 'First birthday',
    tagline: 'One year in',
    category: 'milestone',
    hostRole: 'parents',
    voice: 'celebratory',
    rsvpPreset: 'casual',
    privateByDefault: false,
    defaultBlocks: [
      ...UNIVERSAL,
      'countdown', 'rsvp', 'gallery', 'adviceWall',
      'menu', 'map', 'faq',
    ],
    optionalBlocks: ['video', 'spotify', 'photoWall', 'quote'],
    hiddenBlocks: ['weddingParty', 'registry', 'anniversary', 'obituary'],
    templateIds: ['one-year-in', 'confetti-party', 'wildflower-meadow'],
    status: 'beta',
  },
  {
    id: 'sweet-sixteen',
    label: 'Sweet sixteen',
    tagline: 'The one where everything changes',
    category: 'milestone',
    hostRole: 'parent or teen',
    voice: 'playful',
    rsvpPreset: 'casual',
    privateByDefault: false,
    defaultBlocks: [
      ...UNIVERSAL,
      'countdown', 'rsvp', 'dressCode', 'spotify',
      'map', 'hashtag', 'faq',
    ],
    optionalBlocks: ['photoWall', 'video', 'quote', 'activityVote', 'menu'],
    hiddenBlocks: ['weddingParty', 'registry', 'anniversary', 'obituary'],
    templateIds: ['spotlight-sixteen', 'neon-nights', 'modern-glam'],
    status: 'beta',
  },
  {
    id: 'milestone-birthday',
    label: 'Milestone birthday',
    tagline: '30, 40, 50 — the years worth marking',
    category: 'milestone',
    hostRole: 'birthday person or partner',
    voice: 'celebratory',
    rsvpPreset: 'milestone',
    privateByDefault: false,
    defaultBlocks: [
      ...UNIVERSAL,
      'countdown', 'rsvp', 'story', 'gallery',
      'toastSignup', 'tributeWall', 'spotify', 'map', 'faq',
    ],
    optionalBlocks: [
      'thenAndNow', 'storymap', 'video', 'quote', 'menu', 'hashtag',
    ],
    hiddenBlocks: ['weddingParty', 'registry', 'anniversary', 'obituary'],
    templateIds: ['years-worth-marking', 'quiet-luxury', 'disco-groovy'],
    status: 'beta',
  },
  {
    id: 'retirement',
    label: 'Retirement party',
    tagline: 'A career, remembered',
    category: 'milestone',
    hostRole: 'colleague or partner',
    voice: 'celebratory',
    rsvpPreset: 'milestone',
    privateByDefault: false,
    defaultBlocks: [
      ...UNIVERSAL,
      'story', 'rsvp', 'toastSignup', 'tributeWall',
      'adviceWall', 'thenAndNow', 'map', 'faq',
    ],
    optionalBlocks: ['gallery', 'video', 'menu', 'quote', 'spotify'],
    hiddenBlocks: ['weddingParty', 'registry', 'anniversary', 'obituary'],
    templateIds: ['career-remembered', 'quiet-luxury', 'vintage-romance'],
    status: 'beta',
  },
  {
    id: 'graduation',
    label: 'Graduation',
    tagline: 'From one chapter to the next',
    category: 'milestone',
    hostRole: 'graduate or parent',
    voice: 'celebratory',
    rsvpPreset: 'casual',
    privateByDefault: false,
    defaultBlocks: [
      ...UNIVERSAL,
      'story', 'rsvp', 'tributeWall', 'thenAndNow',
      'map', 'faq',
    ],
    optionalBlocks: ['livestream', 'gallery', 'video', 'quote', 'hashtag', 'menu'],
    hiddenBlocks: ['weddingParty', 'registry', 'anniversary', 'obituary'],
    templateIds: ['from-one-chapter', 'dark-academia', 'chic-monochrome'],
    status: 'beta',
  },

  // ═══════════════════════════════════════════════════════════
  // CULTURAL — religious and tradition-specific ceremonies
  // ═══════════════════════════════════════════════════════════
  {
    id: 'bar-mitzvah',
    label: 'Bar Mitzvah',
    tagline: 'Becoming a son of the commandment',
    category: 'cultural',
    hostRole: 'parents',
    voice: 'ceremonial',
    rsvpPreset: 'cultural',
    privateByDefault: false,
    defaultBlocks: [
      ...UNIVERSAL,
      'story', 'countdown', 'rsvp', 'program',
      'whosWho', 'dressCode', 'menu', 'map', 'faq',
    ],
    optionalBlocks: ['livestream', 'spotify', 'photoWall', 'video', 'registry'],
    hiddenBlocks: ['weddingParty', 'anniversary', 'obituary'],
    templateIds: ['sons-of-the-commandment', 'classic-cathedral', 'quiet-luxury'],
    status: 'beta',
  },
  {
    id: 'bat-mitzvah',
    label: 'Bat Mitzvah',
    tagline: 'Becoming a daughter of the commandment',
    category: 'cultural',
    hostRole: 'parents',
    voice: 'ceremonial',
    rsvpPreset: 'cultural',
    privateByDefault: false,
    defaultBlocks: [
      ...UNIVERSAL,
      'story', 'countdown', 'rsvp', 'program',
      'whosWho', 'dressCode', 'menu', 'map', 'faq',
    ],
    optionalBlocks: ['livestream', 'spotify', 'photoWall', 'video', 'registry'],
    hiddenBlocks: ['weddingParty', 'anniversary', 'obituary'],
    templateIds: ['daughters-of-the-commandment', 'classic-cathedral', 'blush-romance'],
    status: 'beta',
  },
  {
    id: 'quinceanera',
    label: 'Quinceañera',
    tagline: 'Fifteen, and everything that comes with it',
    category: 'cultural',
    hostRole: 'parents and quinceañera',
    voice: 'ceremonial',
    rsvpPreset: 'cultural',
    privateByDefault: false,
    defaultBlocks: [
      ...UNIVERSAL,
      'story', 'countdown', 'rsvp', 'program',
      'whosWho', 'dressCode', 'menu', 'spotify', 'map', 'faq',
    ],
    optionalBlocks: ['livestream', 'photoWall', 'video', 'hashtag', 'gallery'],
    hiddenBlocks: ['weddingParty', 'registry', 'anniversary', 'obituary'],
    templateIds: ['fifteen-and', 'confetti-party', 'modern-glam'],
    status: 'beta',
  },
  {
    id: 'baptism',
    label: 'Baptism / Christening',
    tagline: 'A small soul, a shared promise',
    category: 'cultural',
    hostRole: 'parents',
    voice: 'ceremonial',
    rsvpPreset: 'cultural',
    privateByDefault: false,
    defaultBlocks: [
      ...UNIVERSAL,
      'rsvp', 'program', 'whosWho', 'dressCode',
      'menu', 'map', 'faq',
    ],
    optionalBlocks: ['livestream', 'story', 'quote', 'photoWall'],
    hiddenBlocks: ['weddingParty', 'registry', 'anniversary', 'obituary', 'countdown'],
    templateIds: ['small-soul-shared-promise', 'classic-cathedral', 'blush-romance'],
    status: 'beta',
  },
  {
    id: 'first-communion',
    label: 'First Communion',
    tagline: 'The first taste of the sacrament',
    category: 'cultural',
    hostRole: 'parents',
    voice: 'ceremonial',
    rsvpPreset: 'cultural',
    privateByDefault: false,
    defaultBlocks: [
      ...UNIVERSAL,
      'rsvp', 'program', 'dressCode', 'menu', 'map', 'faq',
    ],
    optionalBlocks: ['photoWall', 'story', 'quote'],
    hiddenBlocks: ['weddingParty', 'registry', 'anniversary', 'obituary', 'countdown'],
    templateIds: ['first-taste', 'classic-cathedral', 'blush-romance'],
    status: 'beta',
  },
  {
    id: 'confirmation',
    label: 'Confirmation',
    tagline: 'Choosing the faith',
    category: 'cultural',
    hostRole: 'parents',
    voice: 'ceremonial',
    rsvpPreset: 'cultural',
    privateByDefault: false,
    defaultBlocks: [
      ...UNIVERSAL,
      'rsvp', 'program', 'dressCode', 'menu', 'map', 'faq',
    ],
    optionalBlocks: ['story', 'quote', 'photoWall'],
    hiddenBlocks: ['weddingParty', 'registry', 'anniversary', 'obituary'],
    templateIds: ['choosing-the-faith', 'classic-cathedral', 'quiet-luxury'],
    status: 'beta',
  },

  // ═══════════════════════════════════════════════════════════
  // COMMEMORATION — gatherings that remember
  // ═══════════════════════════════════════════════════════════
  {
    id: 'memorial',
    label: 'Memorial / Celebration of life',
    tagline: 'A gathering to remember',
    category: 'commemoration',
    hostRole: 'family',
    voice: 'solemn',
    rsvpPreset: 'memorial',
    privateByDefault: false,
    defaultBlocks: [
      ...UNIVERSAL,
      'obituary', 'story', 'program', 'tributeWall',
      'gallery', 'map', 'livestream', 'faq',
    ],
    optionalBlocks: ['registry', 'spotify', 'video', 'rsvp', 'whosWho', 'menu'],
    hiddenBlocks: ['weddingParty', 'anniversary', 'countdown', 'hashtag'],
    templateIds: ['a-gathering-to-remember', 'quiet-luxury', 'classic-cathedral'],
    status: 'beta',
  },
  {
    id: 'funeral',
    label: 'Funeral',
    tagline: 'Gathering, briefly, before the rest',
    category: 'commemoration',
    hostRole: 'family',
    voice: 'solemn',
    rsvpPreset: 'memorial',
    privateByDefault: false,
    defaultBlocks: [
      ...UNIVERSAL,
      'obituary', 'program', 'gallery', 'map',
      'livestream', 'faq',
    ],
    optionalBlocks: ['story', 'tributeWall', 'quote', 'menu'],
    hiddenBlocks: [
      'weddingParty', 'registry', 'anniversary', 'countdown',
      'hashtag', 'spotify',
    ],
    templateIds: ['gathering-briefly', 'classic-cathedral', 'quiet-luxury'],
    status: 'beta',
  },
  {
    id: 'reunion',
    label: 'Reunion',
    tagline: 'The people you keep coming back to',
    category: 'commemoration',
    hostRole: 'organizer',
    voice: 'celebratory',
    rsvpPreset: 'reunion',
    privateByDefault: false,
    defaultBlocks: [
      ...UNIVERSAL,
      'itinerary', 'rsvp', 'rooms', 'whosWho',
      'thenAndNow', 'map', 'faq',
    ],
    optionalBlocks: [
      'costSplitter', 'activityVote', 'tributeWall', 'storymap',
      'photoWall', 'spotify', 'hashtag', 'groupChat',
    ],
    hiddenBlocks: ['weddingParty', 'registry', 'anniversary', 'obituary'],
    templateIds: ['the-people-you-keep', 'rustic-romance', 'tuscan-villa'],
    status: 'beta',
  },
];

// ── Helpers ──────────────────────────────────────────────────

/** Returns the EventType entry for a given occasion id, or null. */
export function getEventType(id: SiteOccasion | string | null | undefined): EventType | null {
  if (!id) return null;
  return EVENT_TYPES.find((e) => e.id === id) ?? null;
}

/** Returns every event type in a given category. */
export function getEventTypesByCategory(cat: EventCategory): EventType[] {
  return EVENT_TYPES.filter((e) => e.category === cat);
}

/** Returns every event type that's currently production-shipping. */
export function getShippingEventTypes(): EventType[] {
  return EVENT_TYPES.filter((e) => e.status === 'shipping');
}

/** Default block set for a new site of a given event type. */
export function getDefaultBlocksFor(id: SiteOccasion | string): readonly BlockType[] {
  return getEventType(id)?.defaultBlocks ?? [];
}

/**
 * Block allowlist for a given event — union of default + optional.
 * Used by the editor block library to filter what's available.
 */
export function getAllowedBlocksFor(id: SiteOccasion | string): readonly BlockType[] {
  const e = getEventType(id);
  if (!e) return [];
  return [...e.defaultBlocks, ...e.optionalBlocks];
}

/** Hidden blocks for a given event — never show in the library. */
export function getHiddenBlocksFor(id: SiteOccasion | string): readonly BlockType[] {
  return getEventType(id)?.hiddenBlocks ?? [];
}

/** Full set of occasion ids (for URL allowlist + wizard dropdowns). */
export function getAllOccasionIds(): readonly SiteOccasion[] {
  return EVENT_TYPES.map((e) => e.id);
}
