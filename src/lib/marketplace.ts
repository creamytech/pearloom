// ─────────────────────────────────────────────────────────────
// Pearloom / lib/marketplace.ts
// Core marketplace logic: pricing, ownership checks,
// purchase tracking, and plan-based free access.
// ─────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';

// ─── Lazy Supabase client (server-side only) ─────────────────

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key);
}

// ─── Types ───────────────────────────────────────────────────

export type MarketplaceItemType =
  | 'template'
  | 'theme'
  | 'icon-pack'
  | 'background-pack'
  | 'accent-pack'
  | 'sticker-pack'
  | 'font-pairing';

export interface MarketplaceItem {
  id: string;
  type: MarketplaceItemType;
  name: string;
  description: string;
  previewImage?: string;
  price: number; // cents (0 = free)
  currency: 'usd';
  creatorId?: string; // for creator program
  creatorName?: string;
  creatorRevenue: number; // 0-1 (0.7 = 70% to creator)
  tags: string[];
  popularity: number;
  purchaseCount: number;
  createdAt: string;
  featured?: boolean;
}

export interface AssetPack {
  id: string;
  type: MarketplaceItemType;
  name: string;
  description: string;
  previewImages: string[]; // thumbnail previews
  price: number;
  items: AssetItem[];
  tags: string[];
}

export interface AssetItem {
  id: string;
  name: string;
  type: 'svg' | 'png' | 'pattern' | 'gradient';
  url: string; // CDN URL
  category: string;
}

// ─── Categories ──────────────────────────────────────────────

export const MARKETPLACE_CATEGORIES = [
  { id: 'wedding', label: 'Wedding' },
  { id: 'birthday', label: 'Birthday' },
  { id: 'engagement', label: 'Engagement' },
  { id: 'anniversary', label: 'Anniversary' },
  { id: 'romantic', label: 'Romantic' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'dark', label: 'Dark' },
  { id: 'bold', label: 'Bold' },
  { id: 'elegant', label: 'Elegant' },
  { id: 'playful', label: 'Playful' },
] as const;

// ─── Ownership ───────────────────────────────────────────────

/**
 * Check if a user owns a specific marketplace item.
 */
export async function checkOwnership(
  userId: string,
  itemId: string,
): Promise<boolean> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('marketplace_purchases')
    .select('id')
    .eq('user_email', userId)
    .eq('item_id', itemId)
    .maybeSingle();

  if (error) {
    console.error('[Marketplace] checkOwnership error:', error.message);
    return false;
  }
  return data !== null;
}

/**
 * Get all item IDs owned by a user.
 */
export async function getUserPurchases(userId: string): Promise<string[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('marketplace_purchases')
    .select('item_id')
    .eq('user_email', userId);

  if (error) {
    console.error('[Marketplace] getUserPurchases error:', error.message);
    return [];
  }
  return (data ?? []).map((row: { item_id: string }) => row.item_id);
}

/**
 * Record a purchase in the database.
 */
export async function recordPurchase(purchase: {
  userEmail: string;
  itemId: string;
  itemType: MarketplaceItemType;
  pricePaid: number;
  stripeSessionId: string;
}): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('marketplace_purchases').insert({
    user_email: purchase.userEmail,
    item_id: purchase.itemId,
    item_type: purchase.itemType,
    price_paid: purchase.pricePaid,
    stripe_session_id: purchase.stripeSessionId,
    purchased_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`recordPurchase failed: ${error.message}`);
  }
}

// ─── Plan-based free access ──────────────────────────────────

/**
 * Determine whether a marketplace item is free for a given user plan.
 *
 * Rules:
 * - Free items (price === 0): always free for everyone
 * - Pro plan (pro / atelier): all templates are free, asset packs still paid
 * - Premium plan (premium / legacy): everything is free
 */
export function isItemFree(item: MarketplaceItem, userPlan: string): boolean {
  // Always free if the item has no price
  if (item.price === 0) return true;

  const plan = userPlan.toLowerCase();

  // Premium / legacy users get everything for free
  if (plan === 'premium' || plan === 'legacy') return true;

  // Pro / atelier users get templates for free, but not asset packs
  if (plan === 'pro' || plan === 'atelier') {
    return item.type === 'template';
  }

  return false;
}

// ─── Price formatting ────────────────────────────────────────

/**
 * Format a price in cents as a display string.
 * Examples: 0 -> "Free", 399 -> "$3.99", 1200 -> "$12.00"
 */
export function formatPrice(cents: number): string {
  if (cents === 0) return 'Free';
  const dollars = (cents / 100).toFixed(2);
  return `$${dollars}`;
}
