// ─────────────────────────────────────────────────────────────
// Pearloom / lib/block-engine/templates.ts
// Block template marketplace — pre-made block configurations
// that users can browse and apply to their sites.
// ─────────────────────────────────────────────────────────────

import type { PageBlock } from '@/types';

/**
 * A block template — pre-configured block with rich config.
 */
export interface BlockTemplate {
  id: string;
  name: string;
  description: string;
  category: 'hero' | 'content' | 'media' | 'interaction' | 'layout';
  preview?: string; // thumbnail URL
  blocks: Array<{
    type: string;
    config: Record<string, unknown>;
  }>;
  tags: string[];
}

/**
 * Built-in block templates.
 */
export const BLOCK_TEMPLATES: BlockTemplate[] = [
  // ── Hero templates ──
  {
    id: 'hero-editorial',
    name: 'Editorial Hero',
    description: 'Clean editorial layout with large serif names and minimal tagline',
    category: 'hero',
    blocks: [
      { type: 'hero', config: { subtitle: '{{ poetry.heroTagline }}', layout: 'editorial' } },
    ],
    tags: ['minimal', 'clean', 'serif'],
  },
  {
    id: 'hero-cinematic',
    name: 'Cinematic Hero',
    description: 'Full-bleed photo with cinematic overlay and dramatic typography',
    category: 'hero',
    blocks: [
      { type: 'hero', config: { subtitle: '{{ poetry.heroTagline }}', layout: 'cinematic' } },
    ],
    tags: ['dramatic', 'photo', 'dark'],
  },

  // ── Content templates ──
  {
    id: 'story-welcome',
    name: 'Welcome + Story',
    description: 'Personal welcome statement followed by the story timeline',
    category: 'content',
    blocks: [
      { type: 'welcome', config: { text: '{{ poetry.welcomeStatement }}' } },
      { type: 'divider', config: { style: 'botanical', height: 40 } },
      { type: 'story', config: { title: 'Our Story' } },
    ],
    tags: ['narrative', 'personal', 'warm'],
  },
  {
    id: 'vibe-and-quote',
    name: 'Vibe Quote + Gallery',
    description: 'Atmospheric quote followed by a photo gallery',
    category: 'content',
    blocks: [
      { type: 'vibeQuote', config: { text: '{{ vibeString }}', symbol: '\u2726' } },
      { type: 'photos', config: { title: 'Moments', maxPhotos: 6 } },
    ],
    tags: ['aesthetic', 'photos', 'gallery'],
  },

  // ── Interaction templates ──
  {
    id: 'full-rsvp',
    name: 'Full RSVP Experience',
    description: 'Countdown + Events + RSVP form in sequence',
    category: 'interaction',
    blocks: [
      { type: 'countdown', config: { label: '{{ couple.name }} — Save the Date' } },
      { type: 'event', config: { title: 'The Celebration' } },
      { type: 'rsvp', config: { title: 'RSVP', introText: '{{ poetry.rsvpIntro }}' } },
    ],
    tags: ['events', 'rsvp', 'countdown'],
  },
  {
    id: 'social-hub',
    name: 'Social Hub',
    description: 'Guest photo wall + Guestbook + Hashtags + Music',
    category: 'interaction',
    blocks: [
      { type: 'photoWall', config: { title: 'Share Your Moments' } },
      { type: 'guestbook', config: { title: 'Leave a Message', prompt: 'Share your wishes...' } },
      { type: 'hashtag', config: { title: 'Tag Your Photos' } },
      { type: 'spotify', config: { title: 'Our Soundtrack' } },
    ],
    tags: ['social', 'interactive', 'guests'],
  },

  // ── Layout templates ──
  {
    id: 'complete-site',
    name: 'Complete Wedding Site',
    description: 'Full site with all essential sections in optimal order',
    category: 'layout',
    blocks: [
      { type: 'hero', config: { subtitle: '{{ poetry.heroTagline }}' } },
      { type: 'vibeQuote', config: { text: '{{ vibeString }}' } },
      { type: 'welcome', config: { text: '{{ poetry.welcomeStatement }}' } },
      { type: 'story', config: { title: 'Our Story' } },
      { type: 'countdown', config: {} },
      { type: 'event', config: { title: 'The Celebration' } },
      { type: 'rsvp', config: { title: 'RSVP' } },
      { type: 'registry', config: { title: 'Registry' } },
      { type: 'travel', config: { title: 'Getting There' } },
      { type: 'photos', config: { title: 'Our Photos' } },
      { type: 'faq', config: { title: 'FAQ' } },
      { type: 'guestbook', config: { title: 'Guestbook' } },
      { type: 'footer', config: { text: '{{ poetry.closingLine }}' } },
    ],
    tags: ['complete', 'wedding', 'full'],
  },
  {
    id: 'minimal-site',
    name: 'Minimal Site',
    description: 'Clean minimal site with only the essentials',
    category: 'layout',
    blocks: [
      { type: 'hero', config: { subtitle: '{{ poetry.heroTagline }}', layout: 'editorial' } },
      { type: 'story', config: { title: 'Our Story' } },
      { type: 'event', config: { title: 'Details' } },
      { type: 'rsvp', config: { title: 'RSVP' } },
      { type: 'footer', config: { text: '{{ poetry.closingLine }}' } },
    ],
    tags: ['minimal', 'clean', 'simple'],
  },
];

/**
 * Convert a template into actual PageBlocks ready to insert.
 */
export function instantiateTemplate(template: BlockTemplate): PageBlock[] {
  return template.blocks.map((b, i) => ({
    id: `${b.type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: b.type as PageBlock['type'],
    order: i,
    visible: true,
    config: { ...b.config },
  }));
}

/**
 * Search templates by keyword.
 */
export function searchTemplates(query: string): BlockTemplate[] {
  const q = query.toLowerCase().trim();
  if (!q) return BLOCK_TEMPLATES;
  return BLOCK_TEMPLATES.filter(t =>
    t.name.toLowerCase().includes(q) ||
    t.description.toLowerCase().includes(q) ||
    t.tags.some(tag => tag.includes(q))
  );
}
