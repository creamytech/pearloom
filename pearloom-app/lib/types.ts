export interface UserSite {
  id: string;
  domain: string;
  names: [string, string];
  manifest: any; // Full StoryManifest
  created_at: string;
  updated_at: string;
}

export interface SiteDetail extends UserSite {
  analytics?: Analytics;
  rsvpStats?: RsvpStats;
}

export interface Guest {
  id: string;
  name: string;
  email?: string;
  rsvp_status: 'attending' | 'declined' | 'pending';
  plus_ones: number;
  meal_preference?: string;
  dietary_notes?: string;
  table_assignment?: string;
  responded_at?: string;
}

export interface RsvpStats {
  attending: number;
  declined: number;
  pending: number;
  total: number;
}

export interface Analytics {
  total_views: number;
  unique_visitors: number;
  views_by_day: { date: string; count: number }[];
  top_pages: { path: string; count: number }[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
}

// ── Wizard types ────────────────────────────────────────────────────────

export interface WizardPhoto {
  uri: string;
  id: string;
}

export type VibeOption =
  | 'romantic'
  | 'modern'
  | 'rustic'
  | 'playful'
  | 'elegant'
  | 'boho'
  | 'celestial'
  | 'tropical'
  | 'vintage'
  | 'minimalist';

export interface WizardState {
  photos: WizardPhoto[];
  name1: string;
  name2: string;
  occasion: string;
  vibeText: string;
  selectedVibes: VibeOption[];
  eventDate: Date | null;
  venueName: string;
}

// ── Marketplace types ───────────────────────────────────────────────────

export interface MarketplaceTemplate {
  id: string;
  name: string;
  tagline?: string;
  description?: string;
  category: 'wedding' | 'birthday' | 'anniversary' | 'engagement' | 'general';
  colors: string[];
  headingFont?: string;
  bodyFont?: string;
  blockCount?: number;
  blocks?: string[];
  price?: number;
  owned?: boolean;
  popular?: boolean;
  previewUrl?: string;
}

export interface AssetPack {
  id: string;
  name: string;
  description?: string;
  itemCount: number;
  price: number;
  gradientColors: [string, string];
  items: AssetPackItem[];
  owned?: boolean;
}

export interface AssetPackItem {
  id: string;
  name: string;
  type: 'illustration' | 'icon' | 'pattern' | 'border' | 'divider';
  previewUrl?: string;
}
