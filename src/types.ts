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
  logistics?: {
    venue?: string;
    date?: string;
    time?: string;
    rsvpDeadline?: string;
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
  name: string;       // e.g. "ceremony", "reception", "rehearsal dinner"
  date: string;       // ISO 8601
  time: string;       // e.g. "4:00 PM"
  endTime?: string;
  venue: string;
  address: string;
  description?: string;
  dressCode?: string;
  mapUrl?: string;
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
