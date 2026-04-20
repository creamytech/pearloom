// ─────────────────────────────────────────────────────────────
// Pearloom / lib/block-catalogue.ts
// Single source of truth for the block library — the list of
// draggable section types the editor exposes. Kept as plain data
// (no JSX) so both CanvasEditor and BlockLibraryDrawer can pull
// from one place.
//
// Icons are NOT embedded here; each consumer resolves its own icon
// component from the type id so this module stays framework-free.
// ─────────────────────────────────────────────────────────────

import type { BlockType } from '@/types';
import type { SiteOccasion } from '@/lib/site-urls';
import {
  getAllowedBlocksFor,
  getHiddenBlocksFor,
} from '@/lib/event-os/event-types';

// OccasionTag kept as an alias for backwards compat. The registry
// in event-types.ts now owns which blocks apply to which occasions;
// the per-block `occasions: []` below is informational only and
// filtering goes through filterBlocksForOccasion() → registry.
export type OccasionTag = SiteOccasion;

export const ALL_OCCASIONS: OccasionTag[] = [
  'wedding',
  'anniversary',
  'engagement',
  'birthday',
  'story',
];

/**
 * Category a block belongs to in the drawer UI. Drives the left-hand
 * category tabs + grouping. Keep this list tight — each category
 * should hold a clear, non-overlapping set of blocks.
 */
export type BlockCategory =
  | 'story'       // narrative — hero, story, welcome, quote, vibe
  | 'logistics'   // events, travel, map, countdown, rsvp
  | 'gifts'       // registry, meals
  | 'guests'      // guestbook, photoWall, quiz, hashtag
  | 'media'       // photos, gallery, video, spotify, storymap
  | 'structure';  // divider, text, footer, anniversary, weddingParty

export interface BlockDef {
  type: BlockType;
  label: string;
  description: string;
  color: string;
  category: BlockCategory;
  occasions: OccasionTag[];
}

export const BLOCK_CATALOGUE: BlockDef[] = [
  // story
  { type: 'hero',      label: 'Hero',              description: 'Full-screen hero with names & cover photo',  color: '#18181B', category: 'story',     occasions: ALL_OCCASIONS },
  { type: 'story',     label: 'Our Story',         description: 'Chapter timeline & photo narrative',          color: '#7c5cbf', category: 'story',     occasions: ALL_OCCASIONS },
  { type: 'welcome',   label: 'Welcome',           description: 'Personal welcome statement from the couple',  color: '#c47a7a', category: 'story',     occasions: ALL_OCCASIONS },
  { type: 'quote',     label: 'Quote',             description: 'Romantic quote or vow snippet',               color: '#8b4a6a', category: 'story',     occasions: ALL_OCCASIONS },
  { type: 'vibeQuote', label: 'Vibe Quote',        description: 'Atmospheric quote with decorative symbol',    color: '#9b6a8b', category: 'story',     occasions: ALL_OCCASIONS },

  // logistics
  { type: 'event',     label: 'Event Cards',       description: 'Ceremony, reception & event details',         color: '#e8927a', category: 'logistics', occasions: ['wedding', 'engagement'] },
  { type: 'countdown', label: 'Countdown',         description: 'Live countdown to your big day',              color: '#4a9b8a', category: 'logistics', occasions: ['wedding', 'engagement', 'birthday'] },
  { type: 'rsvp',      label: 'RSVP',              description: 'Guest RSVP form with meal preferences',       color: '#e87ab8', category: 'logistics', occasions: ['wedding', 'engagement', 'birthday'] },
  { type: 'travel',    label: 'Travel & Hotels',   description: 'Hotels, airports & directions',               color: '#4a7a9b', category: 'logistics', occasions: ['wedding', 'engagement'] },
  { type: 'map',       label: 'Map',               description: 'Embedded venue map',                          color: '#4a6a8b', category: 'logistics', occasions: ['wedding', 'engagement', 'anniversary'] },
  { type: 'faq',       label: 'FAQ',               description: 'Common guest questions & answers',            color: '#8b7a4a', category: 'logistics', occasions: ['wedding', 'engagement'] },

  // gifts
  { type: 'registry',  label: 'Registry',          description: 'Registry links & honeymoon fund',             color: '#c4774a', category: 'gifts',     occasions: ['wedding', 'engagement', 'birthday'] },

  // guests
  { type: 'guestbook', label: 'Guestbook',         description: 'Public guest wishes & AI highlights',         color: '#7a4a8b', category: 'guests',    occasions: ALL_OCCASIONS },
  { type: 'photoWall', label: 'Guest Photo Wall',  description: 'Live wall where guests upload photos',        color: '#7a6a4a', category: 'guests',    occasions: ALL_OCCASIONS },
  { type: 'quiz',      label: 'Couple Quiz',       description: 'Fun quiz about the couple for guests',        color: '#b88a4a', category: 'guests',    occasions: ['wedding', 'engagement', 'birthday'] },
  { type: 'hashtag',   label: 'Hashtag',           description: 'Social media hashtag for your event',         color: '#4a7a9b', category: 'guests',    occasions: ['wedding', 'engagement', 'birthday'] },

  // media
  { type: 'photos',    label: 'Photo Gallery',     description: 'Grid of your curated uploaded photos',        color: '#4a8b6a', category: 'media',     occasions: ALL_OCCASIONS },
  { type: 'gallery',   label: 'Photo Collage',     description: 'Artistic collage layout for curated photos',  color: '#4a8b6a', category: 'media',     occasions: ALL_OCCASIONS },
  { type: 'video',     label: 'Video',             description: 'YouTube or Vimeo embed',                      color: '#4a4a8b', category: 'media',     occasions: ALL_OCCASIONS },
  { type: 'spotify',   label: 'Spotify Playlist',  description: 'Embedded Spotify playlist for your guests',   color: '#1DB954', category: 'media',     occasions: ALL_OCCASIONS },
  { type: 'storymap',  label: 'Story Map',         description: 'Interactive map of your journey together',    color: '#4a6a8b', category: 'media',     occasions: ALL_OCCASIONS },

  // structure
  { type: 'text',      label: 'Text Section',      description: 'Custom text section',                         color: '#6a8b4a', category: 'structure', occasions: ALL_OCCASIONS },
  { type: 'divider',   label: 'Divider',           description: 'Visual section separator',                    color: '#8b8b4a', category: 'structure', occasions: ALL_OCCASIONS },
  { type: 'weddingParty', label: 'Wedding Party',  description: 'Bridal party, groomsmen & roles',             color: '#7c5cbf', category: 'structure', occasions: ['wedding', 'engagement'] },
  { type: 'anniversary', label: 'Anniversary',     description: 'Anniversary milestones & memories',           color: '#c4774a', category: 'structure', occasions: ['anniversary'] },
  { type: 'footer',    label: 'Footer',            description: 'Site footer with credits and links',          color: '#7a7a7a', category: 'structure', occasions: ALL_OCCASIONS },
];

export const BLOCK_CATEGORIES: Array<{ id: BlockCategory; label: string }> = [
  { id: 'story',     label: 'Story'     },
  { id: 'logistics', label: 'Logistics' },
  { id: 'gifts',     label: 'Gifts'     },
  { id: 'guests',    label: 'Guests'    },
  { id: 'media',     label: 'Media'     },
  { id: 'structure', label: 'Structure' },
];

export function getBlockDef(type: BlockType): BlockDef | undefined {
  return BLOCK_CATALOGUE.find((b) => b.type === type);
}

/**
 * Filter the block catalogue to blocks available for a given occasion.
 *
 * Delegates to the EVENT_TYPES registry: if an event type declares a
 * block in defaultBlocks or optionalBlocks, it shows; if it's in
 * hiddenBlocks, it's hidden. Unknown / legacy occasions fall back to
 * the per-block `occasions: []` hint for backwards compatibility.
 */
export function filterBlocksForOccasion(occasion: OccasionTag): BlockDef[] {
  const allowed = new Set<BlockType>(getAllowedBlocksFor(occasion));
  const hidden = new Set<BlockType>(getHiddenBlocksFor(occasion));
  if (allowed.size === 0 && hidden.size === 0) {
    // Occasion not in the registry yet — fall back to legacy per-block tags.
    return BLOCK_CATALOGUE.filter((b) => b.occasions.includes(occasion));
  }
  return BLOCK_CATALOGUE.filter((b) => allowed.has(b.type) && !hidden.has(b.type));
}
