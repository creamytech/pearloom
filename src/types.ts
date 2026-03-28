// ─────────────────────────────────────────────────────────────
// everglow / types.ts — canonical type system
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
  // What type of life event is this site for?
  occasion?: 'wedding' | 'anniversary' | 'engagement' | 'birthday' | 'story';
  logistics?: {
    venue?: string;
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
  // Poetry pass — 4th AI generation pass: hero tagline, footer closing line, RSVP intro
  poetry?: {
    heroTagline: string;    // 5-8 word poetic subtitle for the hero section
    closingLine: string;    // 10-15 word closing line for the footer
    rsvpIntro: string;      // warm, personal 1-2 sentence intro for the RSVP section
  };
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
  layout?: 'editorial' | 'fullbleed' | 'split' | 'cinematic' | 'gallery' | 'mosaic'; // visual layout variant
  order: number;
  /** Object-position for the cover image (percentages 0–100). Default: { x: 50, y: 50 } */
  imagePosition?: { x: number; y: number };
}

export interface ChapterImage {
  id: string;
  url: string; // Supabase Storage or Google Photos CDN
  alt: string;
  width: number;
  height: number;
  blurDataUrl?: string; // base64 placeholder for Next/Image
}

export interface GeoLocation {
  lat: number;
  lng: number;
  label: string; // reverse-geocoded (e.g. "Central Park, NY")
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
}

/**
 * Coming Soon Config
 * Feature-flagged page state for future engagement reveals.
 */
export interface ComingSoonConfig {
  enabled: boolean;
  title: string;
  subtitle: string;
  revealDate?: string; // ISO 8601
  passwordProtected: boolean;
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
  | 'map';

export interface PageBlock {
  id: string;
  type: BlockType;
  order: number;
  visible: boolean;
  // Optional per-block config overrides
  config?: Record<string, unknown>;
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
