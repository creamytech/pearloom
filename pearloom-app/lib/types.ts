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
