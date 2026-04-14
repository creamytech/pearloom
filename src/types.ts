// ─────────────────────────────────────────────────────────────
// Pearloom / types.ts — canonical type system
// ─────────────────────────────────────────────────────────────

import type { VibeSkin } from '@/lib/vibe-engine';

/**
 * Story Manifest
 * The structured output returned by the Gemini "Memory Engine."
 * Each Google Photos session is distilled into a Chapter.
 */
export interface StoryManifest {
  coupleId: string;
  generatedAt: string; // ISO 8601
  vibeString: string; // user-provided emotional prompt
  theme: ThemeSchema;
  chapters: Chapter[];
  comingSoon: ComingSoonConfig;
  // User-uploaded hero cover photo (overrides AI-generated art)
  coverPhoto?: string;
  // Hero slideshow: multiple photos that auto-rotate in the hero section
  heroSlideshow?: string[];
  // What type of life event is this site for?
  occasion?: 'wedding' | 'anniversary' | 'engagement' | 'birthday' | 'story';
  // Timeline macro layout format chosen by user
  layoutFormat?: 'cascade' | 'filmstrip' | 'scrapbook' | 'magazine' | 'chapters' | 'starmap';
  // Story chapter layout — controls how individual chapters render in the story section.
  // Defaults to 'parallax' (premium cinematic) when unset. See src/components/blocks/StoryLayouts.tsx.
  storyLayout?: 'parallax' | 'filmstrip' | 'magazine' | 'timeline' | 'kenburns' | 'bento';
  // User-configurable date format for chapter headers. Presets are defined
  // in CHAPTER_DATE_FORMATS in src/components/blocks/StoryLayouts.tsx.
  // Omitted = "long" default (January 15, 2024).
  dateFormat?: 'long' | 'short' | 'numeric' | 'iso' | 'month-year';
  logistics?: {
    venue?: string;
    venueAddress?: string;
    venuePlaceId?: string;
    date?: string;
    time?: string;
    rsvpDeadline?: string;
    dresscode?: string;
    notes?: string;
  };
  registry?: {
    enabled: boolean;
    cashFundUrl?: string;
    cashFundMessage?: string;
    message?: string;
    // Multi-registry support
    entries?: Array<{ name: string; url: string; note?: string }>;
  };
  // AI-generated visual skin — cached on publish so it's not re-generated on every load
  vibeSkin?: VibeSkin;
  // Multiple wedding events (ceremony, reception, rehearsal dinner, etc.)
  events?: WeddingEvent[];
  // FAQs from the couple
  faqs?: FaqItem[];
  // Travel & lodging info
  travelInfo?: TravelInfo;
  // Real text samples from the couple — used to train the Ask the Couple AI chatbot
  voiceSamples?: string[];
  // Free-canvas block order and visibility
  blocks?: PageBlock[];
  // Custom SVG background pattern CSS (e.g. url("data:image/svg+xml,..."))
  backgroundPatternCss?: string;
  // User-created custom pages (photo gallery, our venue, etc.)
  customPages?: CustomPage[];
  // Last asset selected from the asset library (for canvas insertion)
  lastAsset?: { id: string; type: 'dividers' | 'illustrations' | 'accents'; name: string };
  // Poetry pass — 4th AI generation pass: hero tagline, footer closing line, RSVP intro, welcome statement
  poetry?: {
    heroTagline: string;         // 5-8 word poetic subtitle for the hero section
    closingLine: string;         // 10-15 word closing line for the footer
    rsvpIntro: string;           // warm, personal 1-2 sentence intro for the RSVP section
    welcomeStatement?: string;   // 3-5 sentence personal intro in the couple's own voice
    milestones?: Array<{         // year-by-year milestones (anniversaries & birthdays)
      year: number;
      label: string;
      emoji?: string;
    }>;
  };
  // AI-generated wedding hashtag suggestions
  hashtags?: string[];
  // Spotify playlist or track URL for "Our Soundtrack" section
  spotifyUrl?: string;
  spotifyPlaylistName?: string;
  // Vibe discovery tags — shown in public vibe gallery
  vibeTags?: string[];
  // Preview share token (unpublished preview link)
  previewToken?: string;
  // Anniversary mode — transforms site after wedding date passes
  anniversaryMode?: boolean;
  anniversaryPhotos?: ChapterImage[];
  // Multi-language: translated content keyed by locale
  translations?: Record<string, { chapters?: Array<{ title: string; subtitle: string; description: string }> }>;
  activeLocale?: string;
  // Real-time collab: current editor session info
  collaborators?: Array<{ userId: string; name: string; color: string; cursor?: string }>;
  // Site analytics — lightweight view counter
  analytics?: { views: number; lastViewed?: string };
  // RSVP responses collected for this site
  rsvps?: RsvpResponse[];
  // Published site subdomain (e.g. "jess-and-tom")
  subdomain?: string;
  // ISO 8601 timestamp of when the site was first published
  publishedAt?: string;
  // Custom logo icon for the site navbar (chosen based on occasion + mood in wizard)
  logoIcon?: LogoIconId;
  // AI-generated custom SVG logo icon (overrides logoIcon when present)
  logoSvg?: string;
  // Navigation bar style variant
  navStyle?: 'glass' | 'minimal' | 'solid' | 'editorial' | 'floating' | 'centered' | 'sidebar' | 'command';
  // Mobile-specific nav style (independent from desktop)
  mobileNavStyle?: 'classic' | 'compact-glass' | 'floating-pill' | 'bottom-tabs' | 'hidden' | 'floating-island';
  // Custom page label overrides (page id → display text in nav)
  pageLabels?: Record<string, string>;
  // Nav bar customization — opacity (0-100) and custom background color
  navOpacity?: number;
  navBackground?: string;
  // Site layout mode: multi-page (each section = separate page) or single-scroll (one long page)
  pageMode?: 'multi-page' | 'single-scroll';
  // SEO
  seoTitle?: string;
  seoDescription?: string;
  ogImage?: string;
  // Site protection
  sitePassword?: string;
  // Page ids to hide from nav
  hiddenPages?: string[];
  // Feature flags for optional site sections
  features?: {
    guestbook?: boolean;
    liveUpdates?: boolean;
    photoWall?: boolean;
    postWedding?: boolean;
  };
  // Decorative SVG stickers placed on the site
  stickers?: StickerItem[];
  // Wedding party members
  weddingParty?: WeddingPartyMember[];
  // Meal options for RSVP
  mealOptions?: MealOption[];
  // Guest broadcast messages
  broadcasts?: GuestBroadcast[];
  // Post-event mode settings
  postEventMode?: 'active' | 'thank-you' | 'archive';
  // Parchment tint filter applied to site photos
  parchmentTint?: 'none' | 'ivory' | 'linen' | 'parchment' | 'sepia';
  // Show "Hand-curated with Pearloom" watermark on published site
  watermark?: boolean;
  // Private gallery — hide photo gallery from public visitors
  privateGallery?: boolean;
  // Typography pair preset for the site
  typographyPair?: 'serif-sans' | 'mono-serif' | 'display-body' | 'editorial';
  // Hero badge style (pill = default pill, outlined = border-only, card = card-style, minimal = text-only dots)
  heroBadgeStyle?: 'pill' | 'outlined' | 'card' | 'minimal';
  // Hero countdown widget style
  heroCountdownStyle?: 'cards' | 'minimal' | 'large';
  // Hero text color override (overrides automatic dark/light based on photo presence)
  heroTextColorOverride?: string;
  /** Site customization options (borders, frames, transitions, etc.) */
  customization?: import("./types").SiteCustomization;
  /** Saved reusable components (symbols) */
  savedComponents?: SavedComponent[];
}

export type ComponentCategory = 'layout' | 'content' | 'media' | 'interactive';

export interface SavedComponent {
  id: string;
  name: string;
  type: BlockType;
  category: ComponentCategory;
  config?: Record<string, unknown>;
  blockEffects?: PageBlock['blockEffects'];
  createdAt: string;
  builtIn?: boolean;
}

export interface Chapter {
  id: string;
  date: string; // ISO 8601 date
  title: string;
  subtitle: string;
  description: string;
  images: ChapterImage[];
  location: GeoLocation | null;
  mood: string; // AI-generated mood tag (e.g. "golden hour", "cozy winter")
  layout?: 'editorial' | 'fullbleed' | 'split' | 'cinematic' | 'gallery' | 'mosaic' | 'bento'; // visual layout variant
  order: number;
  /** Object-position for the cover image (percentages 0–100). Default: { x: 50, y: 50 } */
  imagePosition?: { x: number; y: number };
  /** Emotional intensity score 1–10. High (8–10) = cinematic/fullbleed; Low (1–3) = editorial */
  emotionalIntensity?: number;
  /** Ambient background tint color for this chapter's section (very subtle, ~4% opacity) */
  ambientColor?: string;
  /** Index into chapter.images[] of the hero/cover photo (AI picks the most visually striking one) */
  heroPhotoIndex?: number;
  /** True when emotionalIntensity >= 8 — this chapter is the emotional climax of the story */
  isEmotionalPeak?: boolean;
  /** Optional video URL (YouTube, Vimeo, or direct mp4) to show instead of/alongside photos */
  videoUrl?: string;
  /** AI-generated quiz question derived from this chapter's content */
  quizQuestion?: { question: string; options: string[]; correctIndex: number };
  /** Completion tracking */
  hasCustomTitle?: boolean;
  hasCustomDescription?: boolean;
  styleOverrides?: {
    backgroundColor?: string;
    textColor?: string;
    padding?: 'compact' | 'normal' | 'spacious';
  };
}

export interface ChapterImage {
  id: string;
  url: string; // Supabase Storage or Google Photos CDN
  alt: string;
  width: number;
  height: number;
  blurDataUrl?: string; // base64 placeholder for Next/Image
  caption?: string; // AI-generated poetic caption (4-8 words)
}

export interface GeoLocation {
  lat: number;
  lng: number;
  label: string; // reverse-geocoded (e.g. "Central Park, NY")
  needsReverseGeocode?: boolean;
}

/**
 * Theme Schema
 * Returned by the AI alongside the Story Manifest.
 * Injected as CSS variables via the ThemeProvider.
 */
export interface ThemeSchema {
  name: string;
  fonts: {
    heading: string; // Google Font name (e.g. "Playfair Display")
    body: string; // Google Font name (e.g. "Inter")
  };
  colors: {
    background: string; // hex
    foreground: string; // hex
    accent: string; // hex
    accentLight: string; // hex
    muted: string; // hex
    cardBg: string; // hex
  };
  borderRadius: string; // e.g. "0.5rem"
  // Dynamic UI Generation properties
  elementShape?: 'square' | 'rounded' | 'arch' | 'pill';
  cardStyle?: 'solid' | 'glass' | 'bordered' | 'shadow-heavy';
  backgroundPattern?: 'none' | 'noise' | 'dots' | 'grid' | 'waves' | 'floral' | 'topography';

  /** Visual atmosphere effects — all optional, default to off */
  effects?: {
    /** Film grain overlay intensity 0–100 */
    grain?: number;
    /** Edge vignette darkness 0–100 */
    vignette?: number;
    /** Color temperature shift −50 (cool/blue) → +50 (warm/amber) */
    colorTemp?: number;
    /** Animated gradient mesh behind all content */
    gradientMesh?: {
      preset: 'none' | 'aurora' | 'sunset' | 'ocean' | 'forest' | 'rose' | 'champagne' | 'twilight' | 'custom';
      speed: 'still' | 'slow' | 'medium' | 'fast';
      opacity: number; // 0–100
    };
    /** Custom cursor shape */
    customCursor?: 'none' | 'pearl' | 'heart' | 'ring' | 'petal' | 'star';
    /** Custom cursor color override — defaults to theme accent */
    cursorColor?: string;
    /** SVG dividers between page sections */
    sectionDivider?: {
      style:
        // Classic shape dividers
        | 'none' | 'wave' | 'wave2' | 'diagonal' | 'zigzag' | 'torn' | 'chevron' | 'arc'
        // Decorative animated dividers
        | 'botanical' | 'petals' | 'ink' | 'flourish' | 'sparkle' | 'ribbon' | 'confetti' | 'constellation';
      height: number; // px 30–200
      flip: boolean; // alternate direction every other section
      /** Enables the built-in motion for whichever style is picked.
       *  Always respects prefers-reduced-motion regardless of this flag.
       *  Defaults to true when omitted. */
      animated?: boolean;
    };
    /** Scroll-triggered entrance animations for content blocks */
    scrollReveal?: 'none' | 'fade' | 'slide-up' | 'slide-left' | 'zoom' | 'blur-in';
    /** Tiling texture layered over background */
    textureOverlay?: 'none' | 'paper' | 'linen' | 'concrete' | 'velvet' | 'bokeh';
  };

  /** Typographic scale — mathematical ratio for font size hierarchy */
  typeScale?: 'minor-third' | 'major-third' | 'perfect-fourth' | 'golden-ratio';
  /** Computed font sizes from the type scale */
  typeSizes?: {
    hero: string; h1: string; h2: string; h3: string;
    body: string; caption: string; label: string;
  };
}

/**
 * Coming Soon Config
 * Feature-flagged page state for future engagement reveals.
 */
export interface ComingSoonConfig {
  enabled: boolean;
  title?: string;
  subtitle?: string;
  message?: string;
  revealDate?: string; // ISO 8601
  passwordProtected?: boolean;
  password?: string;
}

// ─────────────────────────────────────────────────────────────
// Google Photos Metadata Types
// ─────────────────────────────────────────────────────────────

export interface GooglePhotoMetadata {
  id: string;
  filename: string;
  mimeType: string;
  creationTime: string; // ISO 8601
  width: number;
  height: number;
  baseUrl: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  cameraMake?: string;
  cameraModel?: string;
  description?: string;
}

export interface PhotoCluster {
  startDate: string;
  endDate: string;
  location: GeoLocation | null;
  photos: GooglePhotoMetadata[];
  suggestedTitle?: string;
  note?: string;
}

// ─────────────────────────────────────────────────────────────
// Mascot / Asset Pipeline Types
// ─────────────────────────────────────────────────────────────

export type MascotPosition = 'hero' | 'timeline' | 'footer' | 'loading' | 'coming-soon';

export interface MascotAsset {
  id: string;
  name: string; // e.g. "peaches", "poppy"
  imageUrl: string; // Supabase Storage URL
  position: MascotPosition;
  animation?: 'float' | 'wave' | 'peek' | 'sleep';
}

// ─────────────────────────────────────────────────────────────
// User / Couple Profile
// ─────────────────────────────────────────────────────────────

export interface CoupleProfile {
  id: string;
  slug: string; // public URL slug
  names: [string, string];
  anniversaryDate: string; // ISO 8601
  vibeString: string;
  googlePhotosConnected: boolean;
  mascots: MascotAsset[];
  manifest: StoryManifest | null;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────
// Dashboard state
// ─────────────────────────────────────────────────────────────

export type DashboardStep = 'connect' | 'select-photos' | 'set-vibe' | 'preview' | 'publish';

export interface DashboardState {
  currentStep: DashboardStep;
  googleAccessToken: string | null;
  selectedPhotos: GooglePhotoMetadata[];
  vibeString: string;
  generatedManifest: StoryManifest | null;
  isGenerating: boolean;
}

// ─────────────────────────────────────────────────────────────
// RSVP & Guest List
// ─────────────────────────────────────────────────────────────

export type RsvpStatus = 'attending' | 'declined' | 'pending';

export interface RsvpResponse {
  id: string;
  guestName: string;
  email: string;
  status: RsvpStatus;
  plusOne: boolean;
  plusOneName?: string;
  mealPreference?: string;
  dietaryRestrictions?: string;
  songRequest?: string;
  message?: string;
  eventIds: string[];  // which events they're attending
  respondedAt: string; // ISO 8601
}

export interface WeddingEvent {
  id: string;
  name: string;       // e.g. "Ceremony", "Reception", "Rehearsal Dinner"
  type: 'ceremony' | 'reception' | 'rehearsal' | 'brunch' | 'welcome-party' | 'other';
  date: string;       // ISO 8601
  time: string;       // e.g. "4:00 PM"
  endTime?: string;
  venue: string;
  address: string;
  description?: string;
  dressCode?: string;
  mapUrl?: string;
  notes?: string;
  order?: number;

  // ── Ceremony-specific ──────────────────────
  ceremony?: {
    officiant?: string;
    ceremonyLength?: string;        // e.g. "30 minutes"
    vowsType?: 'traditional' | 'personal' | 'mix';
    unityRitual?: string;           // e.g. "Unity candle", "Sand ceremony"
    processionalSong?: string;
    recessionalSong?: string;
    flowerGirl?: string;
    ringBearer?: string;
    seating?: 'open' | 'assigned';
  };

  // ── Reception-specific ─────────────────────
  reception?: {
    cocktailHour?: boolean;
    cocktailHourTime?: string;
    dinnerType?: 'plated' | 'buffet' | 'stations' | 'family-style';
    menuOptions?: string[];         // e.g. ["Chicken", "Fish", "Vegan"]
    openBar?: boolean;
    barClosesAt?: string;
    firstDanceSong?: string;
    parentDanceSong?: string;
    bouquetToss?: boolean;
    guestSongRequests?: boolean;
    cakeFlavorOptions?: string[];
    photoBooth?: boolean;
    photoBoothNote?: string;
    tableCount?: number;
  };

  // ── Rehearsal-specific ─────────────────────
  rehearsal?: {
    whoIsInvited?: string;          // e.g. "Wedding party + immediate family"
    dinnerFollows?: boolean;
    dinnerVenue?: string;
    dresscode?: string;
  };

  // ── Welcome party / farewell brunch ────────
  social?: {
    activities?: string[];
    foodStyle?: string;             // e.g. "Casual cocktails and bites"
    kidsWelcome?: boolean;
  };
}

// ─────────────────────────────────────────────────────────────
// Page Block System — free-canvas drag-and-drop builder
// ─────────────────────────────────────────────────────────────

export type BlockType =
  | 'hero'
  | 'story'
  | 'countdown'
  | 'event'
  | 'rsvp'
  | 'registry'
  | 'travel'
  | 'faq'
  | 'photos'
  | 'guestbook'
  | 'text'
  | 'divider'
  | 'video'
  | 'quote'
  | 'map'
  | 'spotify'
  | 'quiz'
  | 'storymap'
  | 'hashtag'
  | 'photoWall'
  | 'gallery'
  | 'vibeQuote'
  | 'welcome'
  | 'footer'
  | 'anniversary'
  | 'weddingParty';

export interface PageBlock {
  id: string;
  type: BlockType;
  order: number;
  visible: boolean;
  /**
   * Per-block config — every block can override its title, subtitle,
   * and carry type-specific settings. This makes every section editable.
   *
   * Common fields:
   *   title    — custom section heading (overrides vibeSkin.sectionLabels)
   *   subtitle — custom subheading or intro text
   *   text     — main body content (for text/quote blocks)
   *   url      — media URL (for video/spotify/map blocks)
   *   symbol   — decorative symbol (for quote/divider blocks)
   *   label    — action label or countdown text
   */
  config?: Record<string, unknown>;
  /** Tablet-specific config overrides (layered on top of config) */
  tabletConfig?: Record<string, unknown>;
  /** Mobile-specific config overrides (layered on top of tabletConfig → config) */
  mobileConfig?: Record<string, unknown>;
  /** Per-block visual effects — override or supplement global theme effects */
  blockEffects?: {
    /** Entrance animation when this section scrolls into view */
    scrollReveal?: 'none' | 'fade' | 'slide-up' | 'slide-left' | 'zoom' | 'blur-in';
    /** Custom SVG divider above this block (replaces the auto WaveDivider) */
    dividerAbove?: {
      style: 'wave' | 'wave2' | 'diagonal' | 'zigzag' | 'torn' | 'chevron' | 'arc';
      height: number;
    } | null;
  };
}


// ─────────────────────────────────────────────────────────────
// Guest Photo Gallery
// ─────────────────────────────────────────────────────────────

export interface GalleryPhoto {
  id: string;
  url: string;
  thumbnailUrl: string;
  uploadedBy: string;
  caption?: string;
  width: number;
  height: number;
  uploadedAt: string; // ISO 8601
}

export interface GuestPhoto {
  id: string;
  siteId: string;
  uploaderName: string;
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────
// Site Configuration
// ─────────────────────────────────────────────────────────────

export interface SiteConfig {
  slug: string;
  names: [string, string];
  anniversaryDate: string;
  tagline: string;
  vibeString: string;
  theme: ThemeSchema;
  manifest: StoryManifest | null;
  events: WeddingEvent[];
  faqs: FaqItem[];
  pages: SitePage[];
  travelInfo: TravelInfo;
  passwordProtected: boolean;
  password?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SitePage {
  id: string;
  slug: string;     // "our-story", "rsvp", "photos", etc.
  label: string;    // nav label
  enabled: boolean;
  order: number;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  order: number;
}

export interface TravelInfo {
  airports: string[];
  hotels: HotelBlock[];
  parkingInfo?: string;
  directions?: string;
}

export interface HotelBlock {
  name: string;
  address: string;
  bookingUrl?: string;
  groupRate?: string;
  notes?: string;
}

// ─────────────────────────────────────────────────────────────
// Custom Pages — user-created pages with their own block lists
// ─────────────────────────────────────────────────────────────

export interface CustomPage {
  id: string;
  slug: string;       // URL slug (e.g. "our-engagement", "the-venue")
  title: string;      // Display title
  icon: string;       // Emoji icon for sidebar
  blocks: PageBlock[];
  visible: boolean;
  order: number;
}

// ─────────────────────────────────────────────────────────────
// Guest (canonical — used across seating, RSVP, constraints)
// ─────────────────────────────────────────────────────────────

export interface Guest {
  id: string;
  name: string;
  email?: string;
  status: 'attending' | 'declined' | 'pending';
  plusOne: boolean;
  plusOneName?: string;
  mealPreference?: string;
  dietaryRestrictions?: string;
  songRequest?: string;
  message?: string;
  respondedAt?: string;
}

// ─────────────────────────────────────────────────────────────
// Venues
// ─────────────────────────────────────────────────────────────

export interface Venue {
  id: string;
  userId: string;
  siteId?: string;
  name: string;
  formattedAddress?: string;
  placeId?: string;
  lat?: number;
  lng?: number;
  website?: string;
  phone?: string;
  capacityCeremony?: number;
  capacityReception?: number;
  indoorOutdoor?: 'indoor' | 'outdoor' | 'both';
  notes?: string;
  floorplanUrl?: string;
  createdAt: string;
}

export interface VenueSpace {
  id: string;
  venueId: string;
  name: string;
  capacity?: number;
  widthFt?: number;
  lengthFt?: number;
  shape?: string;
  notes?: string;
}

// ─────────────────────────────────────────────────────────────
// Seating
// ─────────────────────────────────────────────────────────────

export interface SeatingTable {
  id: string;
  spaceId: string;
  userId: string;
  label: string;
  shape: 'round' | 'rectangular' | 'banquet' | 'square';
  capacity: number;
  x: number;
  y: number;
  rotation: number;
  isReserved: boolean;
  notes?: string;
  seats?: Seat[];
}

export interface Seat {
  id: string;
  tableId: string;
  seatNumber: number;
  guestId?: string;
  mealPreference?: string;
  guest?: Guest; // populated via join
}

export type ConstraintType =
  | 'must_sit_together'
  | 'must_not_sit_together'
  | 'near_exit'
  | 'near_dance_floor'
  | 'avoid_table'
  | 'prefer_table'
  | 'custom';

export interface SeatingConstraint {
  id: string;
  userId: string;
  siteId?: string;
  type: ConstraintType;
  guestIds?: string[];
  tableId?: string;
  priority: 1 | 2;
  description?: string;
}

// ─────────────────────────────────────────────────────────────
// Registry
// ─────────────────────────────────────────────────────────────

export interface RegistrySource {
  id: string;
  userId: string;
  siteId?: string;
  storeName: string;
  registryUrl: string;
  category?: string;
  notes?: string;
  sortOrder: number;
  createdAt: string;
}

export interface RegistryItem {
  id: string;
  sourceId: string;
  name: string;
  price?: number;
  imageUrl?: string;
  itemUrl?: string;
  category?: string;
  priority: 'need' | 'want' | 'dream';
  purchased: boolean;
  notes?: string;
}

export interface AIProposal {
  id: string;
  userId: string;
  siteId?: string;
  type: 'seating' | 'registry' | 'vendor' | 'timeline';
  proposal: unknown;
  explanation?: string;
  applied: boolean;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────
// Google Places
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// Logo Icon System — occasion+mood-aware icons for site navbar
// ─────────────────────────────────────────────────────────────

export type LogoIconId =
  | 'wedding-rings'
  | 'heart'
  | 'champagne'
  | 'gift'
  | 'envelope'
  | 'bouquet'
  | 'mountain'
  | 'coffee'
  | 'music-note'
  | 'paw'
  | 'suitcase'
  | 'starburst'
  | 'pearl'
  | 'pear'; // fallback / default

export interface PlaceResult {
  placeId: string;
  name: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  website?: string;
  phone?: string;
  types?: string[];
}

export interface StickerItem {
  id: string;
  name: string;          // SVG component name e.g. 'RoseIllustration'
  type: 'illustrations' | 'accents' | 'dividers';
  x: number;             // left % (0-100)
  y: number;             // top % (0-100)
  size: number;          // px size
  rotation: number;      // degrees
  opacity: number;       // 0-1
  color?: string;
}

// ── Wedding Party ─────────────────────────────────────────────

export interface WeddingPartyMember {
  id: string;
  name: string;
  role: 'bride' | 'groom' | 'maid-of-honor' | 'best-man' | 'bridesmaid' | 'groomsman'
    | 'flower-girl' | 'ring-bearer' | 'officiant' | 'parent' | 'grandparent' | 'other';
  customRole?: string;
  bio?: string;
  photo?: string;
  relationship?: string; // "Bride's sister", "Groom's college roommate"
  order: number;
}

// ── Meal Options ──────────────────────────────────────────────

export interface MealOption {
  id: string;
  name: string; // "Herb-Crusted Chicken", "Pan-Seared Salmon", "Garden Risotto"
  description?: string;
  dietaryTags: Array<'vegetarian' | 'vegan' | 'gluten-free' | 'dairy-free' | 'nut-free' | 'halal' | 'kosher'>;
  /** Which event this meal belongs to (ceremony, reception, brunch) */
  eventId?: string;
}

// ── Guest Broadcasts ──────────────────────────────────────────

export interface GuestBroadcast {
  id: string;
  message: string;
  type: 'update' | 'thank-you' | 'reminder' | 'emergency';
  sentAt: number;
  /** Number of guests this was sent to */
  recipientCount: number;
  /** Delivery channel */
  channel: 'email' | 'sms' | 'site-banner';
}

// ── Customization Options ─────────────────────────────────────

export interface SiteCustomization {
  /** Card border style ID */
  cardBorder?: string;
  /** Section background ID per section (blockId → bgId) */
  sectionBackgrounds?: Record<string, string>;
  /** Photo frame style ID */
  photoFrame?: string;
  /** Monogram style + initials */
  monogram?: { style: string; initials: string; color: string };
  /** Section transition style ID */
  sectionTransition?: string;
  /** Custom RSVP questions */
  rsvpQuestions?: Array<{ id: string; question: string; type: 'text' | 'select' | 'radio'; options?: string[]; required: boolean }>;
  /** Custom guestbook prompts (IDs from GUESTBOOK_PROMPTS) */
  guestbookPrompts?: string[];
  /** Countdown style ID */
  countdownStyle?: string;
  /** Text animation effect ID */
  textEffect?: string;
  /** Background music config */
  backgroundMusic?: { url: string; autoPlay: boolean; volume: number; showControls: boolean; position: string; consentMessage: string };
}
