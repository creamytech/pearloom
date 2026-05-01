// ─────────────────────────────────────────────────────────────
// Pearloom / lib/marketplace/index.ts
// Community Marketplace — user-submitted templates, themes,
// block configurations with ratings, install counts, and
// revenue sharing.
//
// This creates switching costs: once users publish templates and
// build reputation, they're invested in the platform. Community
// content makes the product more valuable for everyone.
// ─────────────────────────────────────────────────────────────

import type { PageBlock, StoryManifest } from '@/types';
import type { VibeSkin } from '@/lib/vibe-engine';

// ── Types ────────────────────────────────────────────────────

export interface MarketplaceItem {
  id: string;
  /** Who created this */
  authorId: string;
  authorName: string;
  authorAvatar?: string;

  /** What kind of item */
  type: 'template' | 'theme' | 'block-preset' | 'section-pack';

  /** Display info */
  name: string;
  description: string;
  previewUrl?: string;
  thumbnails: string[];
  tags: string[];
  category: string;

  /** Pricing */
  pricing: 'free' | 'premium';
  price?: number; // in cents
  revenueShare?: number; // percentage for the creator (0-70)

  /** Stats */
  installs: number;
  rating: number; // 0-5
  ratingCount: number;
  favorites: number;

  /** The actual content */
  content: {
    blocks?: PageBlock[];
    theme?: Partial<StoryManifest['theme']>;
    vibeSkin?: Partial<VibeSkin>;
    manifest?: Partial<StoryManifest>;
  };

  /** Metadata */
  createdAt: number;
  updatedAt: number;
  publishedAt?: number;
  status: 'draft' | 'pending-review' | 'published' | 'rejected';
  occasion?: string[];
}

export interface MarketplaceReview {
  id: string;
  itemId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: number;
}

export interface CreatorProfile {
  userId: string;
  displayName: string;
  bio: string;
  avatar?: string;
  websiteUrl?: string;
  totalInstalls: number;
  totalEarnings: number; // in cents
  itemCount: number;
  averageRating: number;
  joinedAt: number;
  verified: boolean;
}

// ── API Functions ────────────────────────────────────────────

/**
 * Search the marketplace.
 */
export async function searchMarketplace(query: {
  search?: string;
  type?: MarketplaceItem['type'];
  category?: string;
  pricing?: 'free' | 'premium';
  occasion?: string;
  sortBy?: 'popular' | 'newest' | 'top-rated';
  limit?: number;
  offset?: number;
}): Promise<{ items: MarketplaceItem[]; total: number }> {
  try {
    const params = new URLSearchParams();
    if (query.search) params.set('q', query.search);
    if (query.type) params.set('type', query.type);
    if (query.category) params.set('category', query.category);
    if (query.pricing) params.set('pricing', query.pricing);
    if (query.occasion) params.set('occasion', query.occasion);
    if (query.sortBy) params.set('sort', query.sortBy);
    if (query.limit) params.set('limit', String(query.limit));
    if (query.offset) params.set('offset', String(query.offset));

    const res = await fetch(`/api/marketplace/search?${params}`);
    if (!res.ok) return { items: [], total: 0 };
    return res.json();
  } catch {
    return { items: [], total: 0 };
  }
}

/**
 * Install a marketplace item — applies it to the user's site.
 */
export async function installItem(
  itemId: string,
  manifest: StoryManifest,
): Promise<StoryManifest | null> {
  try {
    const res = await fetch('/api/marketplace/install', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId }),
    });

    if (!res.ok) return null;
    const { item } = await res.json() as { item: MarketplaceItem };

    // Apply the item's content to the manifest
    const updated = { ...manifest };

    if (item.content.blocks) {
      const newBlocks = item.content.blocks.map((b, i) => ({
        ...b,
        id: `${b.type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        order: (manifest.blocks?.length || 0) + i,
      }));
      updated.blocks = [...(manifest.blocks || []), ...newBlocks];
    }

    if (item.content.theme) {
      updated.theme = { ...manifest.theme, ...item.content.theme } as StoryManifest['theme'];
    }

    if (item.content.vibeSkin) {
      updated.vibeSkin = { ...manifest.vibeSkin, ...item.content.vibeSkin } as VibeSkin;
    }

    return updated;
  } catch {
    return null;
  }
}

/**
 * Submit a new item to the marketplace.
 */
export async function submitItem(item: Omit<MarketplaceItem, 'id' | 'installs' | 'rating' | 'ratingCount' | 'favorites' | 'createdAt' | 'updatedAt' | 'status'>): Promise<MarketplaceItem | null> {
  try {
    const res = await fetch('/api/marketplace/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });

    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/**
 * Rate a marketplace item.
 */
export async function rateItem(itemId: string, rating: number, comment: string): Promise<boolean> {
  try {
    const res = await fetch('/api/marketplace/rate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, rating, comment }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Built-in Categories ──────────────────────────────────────

export const MARKETPLACE_CATEGORIES = [
  { id: 'wedding-classic',  label: 'Classic Wedding',    icon: 'Heart' },
  { id: 'wedding-modern',   label: 'Modern Wedding',     icon: 'Sparkles' },
  { id: 'wedding-boho',     label: 'Bohemian Wedding',   icon: 'Leaf' },
  { id: 'birthday',         label: 'Birthday',           icon: 'Cake' },
  { id: 'anniversary',      label: 'Anniversary',        icon: 'Calendar' },
  { id: 'engagement',       label: 'Engagement',         icon: 'Ring' },
  { id: 'minimal',          label: 'Minimal',            icon: 'Minus' },
  { id: 'editorial',        label: 'Editorial',          icon: 'Type' },
  { id: 'cinematic',        label: 'Cinematic',          icon: 'Film' },
  { id: 'playful',          label: 'Playful',            icon: 'Smile' },
];
