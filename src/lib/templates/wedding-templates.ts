// ─────────────────────────────────────────────────────────────
// Pearloom / lib/templates/wedding-templates.ts
// Beautiful pre-built wedding templates with real content.
// Users can apply these from the dashboard Quick Start to
// get a fully populated site in one click.
//
// These are NOT empty block shells — they include real copy,
// styling, and block configurations that look great immediately.
// ─────────────────────────────────────────────────────────────

import type { PageBlock, StoryManifest } from '@/types';

export interface SiteTemplate {
  id: string;
  name: string;
  tagline: string;
  description: string;
  /** Visual preview color (gradient for thumbnail) */
  previewGradient: string;
  /** Occasion types this template works for */
  occasions: string[];
  /** Tags for search */
  tags: string[];
  /** Popularity rank */
  popularity: number;
  /** The actual blocks and manifest overrides */
  blocks: PageBlock[];
  /** Theme overrides */
  theme: {
    colors: {
      background: string;
      foreground: string;
      accent: string;
      accentLight: string;
      muted: string;
      cardBg: string;
    };
    fonts: {
      heading: string;
      body: string;
    };
  };
  /** Default vibe string */
  vibeString: string;
  /** Layout format */
  layoutFormat: string;
  /** Poetry defaults */
  poetry: {
    heroTagline: string;
    closingLine: string;
    rsvpIntro: string;
    welcomeStatement: string;
  };
}

// ── Template Factory ─────────────────────────────────────────

function makeBlock(type: string, order: number, config?: Record<string, unknown>): PageBlock {
  return {
    id: `${type}-tmpl-${order}`,
    type: type as PageBlock['type'],
    order,
    visible: true,
    config,
  };
}

// ── Templates ────────────────────────────────────────────────

export const SITE_TEMPLATES: SiteTemplate[] = [

  // ── 1. Ethereal Garden ──────────────────────────────────────
  {
    id: 'ethereal-garden',
    name: 'Ethereal Garden',
    tagline: 'Botanical romance with soft light',
    description: 'Lush greenery, soft sage accents, and warm natural light. Perfect for garden ceremonies and outdoor celebrations.',
    previewGradient: 'linear-gradient(135deg, #E8F0E0 0%, #D4DFC8 50%, #A3B18A 100%)',
    occasions: ['wedding', 'engagement'],
    tags: ['garden', 'botanical', 'outdoor', 'romantic', 'sage', 'green'],
    popularity: 95,
    blocks: [
      makeBlock('hero', 0, { subtitle: '{{ poetry.heroTagline }}', layout: 'editorial' }),
      makeBlock('vibeQuote', 1, { text: 'In the garden of our love, every season brings new beauty.', symbol: '✿' }),
      makeBlock('welcome', 2, { text: '{{ poetry.welcomeStatement }}' }),
      makeBlock('story', 3, { title: 'Our Story' }),
      makeBlock('divider', 4, { style: 'botanical', height: 50 }),
      makeBlock('countdown', 5, { label: 'Until we bloom together' }),
      makeBlock('event', 6, { title: 'The Garden Party' }),
      makeBlock('rsvp', 7, { title: 'Join Our Garden', introText: '{{ poetry.rsvpIntro }}' }),
      makeBlock('registry', 8, { title: 'Gifts & Wishes' }),
      makeBlock('travel', 9, { title: 'Finding the Garden' }),
      makeBlock('photos', 10, { title: 'Moments in Bloom', maxPhotos: 9 }),
      makeBlock('faq', 11, { title: 'Garden Notes' }),
      makeBlock('guestbook', 12, { title: 'Leave a Petal', prompt: 'Write your wishes for the couple...' }),
      makeBlock('footer', 13, { text: '{{ poetry.closingLine }}', subtitle: 'Made with Pearloom' }),
    ],
    theme: {
      colors: { background: '#F4F7F1', foreground: '#1E2A1A', accent: '#6A8F5A', accentLight: '#DDEBD4', muted: '#7A8C72', cardBg: '#FFFFFF' },
      fonts: { heading: 'Cormorant Garamond', body: 'Inter' },
    },
    vibeString: 'botanical organic garden romantic soft green sage',
    layoutFormat: 'cascade',
    poetry: {
      heroTagline: 'Where every petal tells our story',
      closingLine: 'Thank you for being part of our garden. With love always.',
      rsvpIntro: 'We would be honored to have you celebrate with us among the flowers.',
      welcomeStatement: 'Welcome to our corner of the garden. What started as a chance encounter has grown into the most beautiful love story we could have imagined. We can\'t wait to share this next chapter with you.',
    },
  },

  // ── 2. Midnight Luxe ────────────────────────────────────────
  {
    id: 'midnight-luxe',
    name: 'Midnight Luxe',
    tagline: 'Dark elegance with gold accents',
    description: 'Sophisticated dark palette with antique gold details. Ideal for evening galas, ballroom receptions, and glamorous celebrations.',
    previewGradient: 'linear-gradient(135deg, #1A1510 0%, #2D2618 50%, #C4A96A 100%)',
    occasions: ['wedding', 'anniversary', 'engagement'],
    tags: ['dark', 'gold', 'luxe', 'glamorous', 'evening', 'elegant', 'moody'],
    popularity: 88,
    blocks: [
      makeBlock('hero', 0, { subtitle: '{{ poetry.heroTagline }}', layout: 'cinematic' }),
      makeBlock('vibeQuote', 1, { text: 'Two souls intertwined in starlight and gold.', symbol: '✦' }),
      makeBlock('welcome', 2, { text: '{{ poetry.welcomeStatement }}' }),
      makeBlock('story', 3, { title: 'Our Love Story' }),
      makeBlock('countdown', 4, { label: 'Until the golden hour' }),
      makeBlock('event', 5, { title: 'The Grand Affair' }),
      makeBlock('rsvp', 6, { title: 'RSVP', introText: '{{ poetry.rsvpIntro }}' }),
      makeBlock('spotify', 7, { title: 'The Evening Playlist' }),
      makeBlock('registry', 8, { title: 'Registry' }),
      makeBlock('photos', 9, { title: 'Golden Moments', maxPhotos: 6 }),
      makeBlock('guestbook', 10, { title: 'Words of Gold', prompt: 'Leave a message for the couple...' }),
      makeBlock('footer', 11, { text: '{{ poetry.closingLine }}' }),
    ],
    theme: {
      colors: { background: '#0F0E0D', foreground: '#F5F0EA', accent: '#C4A96A', accentLight: '#2A2015', muted: '#7A7068', cardBg: '#1A1815' },
      fonts: { heading: 'Playfair Display', body: 'Inter' },
    },
    vibeString: 'luxurious dark gold dramatic evening elegant moody',
    layoutFormat: 'filmstrip',
    poetry: {
      heroTagline: 'An evening of starlight and promises',
      closingLine: 'Until we meet again under the stars.',
      rsvpIntro: 'Your presence would make our evening complete.',
      welcomeStatement: 'Welcome to our celebration. What began as a spark has become a flame that lights up our entire world. Tonight, we celebrate that light with all of you.',
    },
  },

  // ── 3. Coastal Breeze ───────────────────────────────────────
  {
    id: 'coastal-breeze',
    name: 'Coastal Breeze',
    tagline: 'Seaside serenity with ocean blues',
    description: 'Fresh ocean blues, driftwood textures, and salt-kissed air. Perfect for beach ceremonies and waterfront venues.',
    previewGradient: 'linear-gradient(135deg, #F0F5FA 0%, #7BA7BC 50%, #3D6E80 100%)',
    occasions: ['wedding', 'engagement', 'anniversary'],
    tags: ['beach', 'coastal', 'blue', 'ocean', 'nautical', 'breezy', 'fresh'],
    popularity: 82,
    blocks: [
      makeBlock('hero', 0, { subtitle: '{{ poetry.heroTagline }}', layout: 'fullbleed' }),
      makeBlock('vibeQuote', 1, { text: 'Like the tide, our love keeps coming back — stronger every time.', symbol: '~' }),
      makeBlock('welcome', 2, { text: '{{ poetry.welcomeStatement }}' }),
      makeBlock('story', 3, { title: 'Our Story' }),
      makeBlock('countdown', 4, { label: 'Until we set sail' }),
      makeBlock('event', 5, { title: 'The Celebration' }),
      makeBlock('map', 6, { title: 'Find Us by the Shore' }),
      makeBlock('rsvp', 7, { title: 'RSVP', introText: '{{ poetry.rsvpIntro }}' }),
      makeBlock('travel', 8, { title: 'Getting to the Coast' }),
      makeBlock('photos', 9, { title: 'Seaside Moments', maxPhotos: 9 }),
      makeBlock('faq', 10, { title: 'Beach Day FAQ' }),
      makeBlock('guestbook', 11, { title: 'Messages in a Bottle', prompt: 'Send your wishes across the waves...' }),
      makeBlock('footer', 12, { text: '{{ poetry.closingLine }}' }),
    ],
    theme: {
      colors: { background: '#F0F5FA', foreground: '#0C1F2E', accent: '#3A7CA8', accentLight: '#CCE3F5', muted: '#6A8FA8', cardBg: '#FFFFFF' },
      fonts: { heading: 'Libre Baskerville', body: 'Source Sans 3' },
    },
    vibeString: 'coastal breezy fresh ocean nautical relaxed blue',
    layoutFormat: 'cascade',
    poetry: {
      heroTagline: 'Where the ocean meets forever',
      closingLine: 'Riding the waves of love, together always.',
      rsvpIntro: 'Join us by the water for a celebration of love.',
      welcomeStatement: 'Welcome, friends and family. Our love story started by the coast, and we\'re so excited to share this beautiful day with you where it all began.',
    },
  },

  // ── 4. Rustic Romance ───────────────────────────────────────
  {
    id: 'rustic-romance',
    name: 'Rustic Romance',
    tagline: 'Barn wood and wildflowers',
    description: 'Warm earth tones, hand-lettered charm, and rustic textures. Ideal for barn weddings, farm celebrations, and countryside charm.',
    previewGradient: 'linear-gradient(135deg, #FDF8F0 0%, #8B7355 50%, #4A3828 100%)',
    occasions: ['wedding', 'engagement'],
    tags: ['rustic', 'barn', 'country', 'earth', 'warm', 'handcrafted', 'wildflower'],
    popularity: 85,
    blocks: [
      makeBlock('hero', 0, { subtitle: '{{ poetry.heroTagline }}', layout: 'editorial' }),
      makeBlock('vibeQuote', 1, { text: 'Some of the best love stories are written on dusty roads and open fields.', symbol: '✦' }),
      makeBlock('welcome', 2, { text: '{{ poetry.welcomeStatement }}' }),
      makeBlock('story', 3, { title: 'How We Met' }),
      makeBlock('countdown', 4, { label: 'Until the barn dance' }),
      makeBlock('event', 5, { title: 'The Celebration' }),
      makeBlock('rsvp', 6, { title: 'RSVP', introText: '{{ poetry.rsvpIntro }}' }),
      makeBlock('registry', 7, { title: 'Gifts' }),
      makeBlock('travel', 8, { title: 'Directions to the Farm' }),
      makeBlock('faq', 9, { title: 'Need to Know' }),
      makeBlock('photos', 10, { title: 'Captured Moments' }),
      makeBlock('guestbook', 11, { title: 'Sign the Guest Book' }),
      makeBlock('footer', 12, { text: '{{ poetry.closingLine }}' }),
    ],
    theme: {
      colors: { background: '#FDF8F0', foreground: '#2C1A0A', accent: '#C97C30', accentLight: '#FAEBD7', muted: '#9A7A55', cardBg: '#FFFAF4' },
      fonts: { heading: 'Josefin Sans', body: 'Lato' },
    },
    vibeString: 'rustic earthy warm handcrafted barn country wildflower',
    layoutFormat: 'scrapbook',
    poetry: {
      heroTagline: 'Love grows in the simplest places',
      closingLine: 'Here\'s to love, laughter, and happily ever after.',
      rsvpIntro: 'Pull up a chair and join us for the celebration of a lifetime.',
      welcomeStatement: 'Welcome to our little corner of the world. We\'ve been dreaming about this day for a long time, and there\'s no one we\'d rather share it with than you.',
    },
  },

  // ── 5. Blush & Bloom ────────────────────────────────────────
  {
    id: 'blush-bloom',
    name: 'Blush & Bloom',
    tagline: 'Soft pinks and delicate florals',
    description: 'Romantic blush palette with champagne accents and soft petal textures. Perfect for spring and summer celebrations.',
    previewGradient: 'linear-gradient(135deg, #FDF8F5 0%, #E8B4C0 50%, #C080A0 100%)',
    occasions: ['wedding', 'engagement', 'birthday'],
    tags: ['blush', 'pink', 'romantic', 'floral', 'feminine', 'spring', 'champagne'],
    popularity: 90,
    blocks: [
      makeBlock('hero', 0, { subtitle: '{{ poetry.heroTagline }}', layout: 'editorial' }),
      makeBlock('vibeQuote', 1, { text: 'Love is the flower you\'ve got to let grow.', symbol: '❀' }),
      makeBlock('welcome', 2, { text: '{{ poetry.welcomeStatement }}' }),
      makeBlock('story', 3, { title: 'Our Love Story' }),
      makeBlock('divider', 4, { style: 'botanical', height: 40 }),
      makeBlock('countdown', 5, { label: 'Until forever begins' }),
      makeBlock('event', 6, { title: 'The Details' }),
      makeBlock('rsvp', 7, { title: 'RSVP', introText: '{{ poetry.rsvpIntro }}' }),
      makeBlock('registry', 8, { title: 'Registry' }),
      makeBlock('photos', 9, { title: 'Love in Bloom', maxPhotos: 9 }),
      makeBlock('spotify', 10, { title: 'Our Love Songs' }),
      makeBlock('guestbook', 11, { title: 'Wishes & Love Notes' }),
      makeBlock('footer', 12, { text: '{{ poetry.closingLine }}' }),
    ],
    theme: {
      colors: { background: '#FDF8F5', foreground: '#2A1A18', accent: '#D4829A', accentLight: '#FCE8EF', muted: '#B0889A', cardBg: '#FFF9F7' },
      fonts: { heading: 'Playfair Display', body: 'Poppins' },
    },
    vibeString: 'romantic blush pink floral soft feminine champagne',
    layoutFormat: 'cascade',
    poetry: {
      heroTagline: 'Every love story is beautiful, but ours is our favorite',
      closingLine: 'With all our love and a thousand thank yous.',
      rsvpIntro: 'We would love nothing more than to celebrate this day with you.',
      welcomeStatement: 'Dear friends and family, from the moment we met, we knew something special was beginning. Today, we invite you to be part of the next chapter of our love story.',
    },
  },

  // ── 6. Minimalist White ─────────────────────────────────────
  {
    id: 'minimalist-white',
    name: 'Minimalist White',
    tagline: 'Clean lines, pure simplicity',
    description: 'Ultra-clean white space with sharp typography and no distractions. For couples who believe less is more.',
    previewGradient: 'linear-gradient(135deg, #FFFFFF 0%, #F5F5F5 50%, #111111 100%)',
    occasions: ['wedding', 'engagement', 'anniversary'],
    tags: ['minimal', 'clean', 'white', 'modern', 'editorial', 'simple', 'typography'],
    popularity: 78,
    blocks: [
      makeBlock('hero', 0, { subtitle: '{{ poetry.heroTagline }}', layout: 'editorial' }),
      makeBlock('story', 1, { title: 'Our Story' }),
      makeBlock('event', 2, { title: 'Details' }),
      makeBlock('rsvp', 3, { title: 'RSVP', introText: '{{ poetry.rsvpIntro }}' }),
      makeBlock('footer', 4, { text: '{{ poetry.closingLine }}' }),
    ],
    theme: {
      colors: { background: '#FFFFFF', foreground: '#111111', accent: '#111111', accentLight: '#F5F5F5', muted: '#888888', cardBg: '#F8F8F8' },
      fonts: { heading: 'DM Serif Display', body: 'DM Sans' },
    },
    vibeString: 'minimal clean modern editorial simple',
    layoutFormat: 'chapters',
    poetry: {
      heroTagline: 'Together',
      closingLine: 'With love.',
      rsvpIntro: 'Please let us know if you can make it.',
      welcomeStatement: 'We\'re getting married and we\'d love for you to be there.',
    },
  },

  // ── 7. Golden Hour ──────────────────────────────────────────
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    tagline: 'Warm light and analog nostalgia',
    description: 'Sun-drenched warmth with film grain textures and golden tones. Captures the magic of that perfect sunset moment.',
    previewGradient: 'linear-gradient(135deg, #FAF9F6 0%, #D4A574 50%, #8B5E3C 100%)',
    occasions: ['wedding', 'engagement', 'anniversary'],
    tags: ['golden', 'warm', 'sunset', 'analog', 'film', 'nostalgic', 'vintage'],
    popularity: 92,
    blocks: [
      makeBlock('hero', 0, { subtitle: '{{ poetry.heroTagline }}', layout: 'cinematic' }),
      makeBlock('vibeQuote', 1, { text: 'The best things in life are the people you love, the places you\'ve been, and the memories you\'ve made along the way.', symbol: '☀' }),
      makeBlock('welcome', 2, { text: '{{ poetry.welcomeStatement }}' }),
      makeBlock('story', 3, { title: 'Our Journey' }),
      makeBlock('countdown', 4, { label: 'Until sunset' }),
      makeBlock('event', 5, { title: 'The Golden Evening' }),
      makeBlock('rsvp', 6, { title: 'RSVP', introText: '{{ poetry.rsvpIntro }}' }),
      makeBlock('photos', 7, { title: 'Through the Lens', maxPhotos: 9 }),
      makeBlock('registry', 8, { title: 'Registry' }),
      makeBlock('travel', 9, { title: 'Getting There' }),
      makeBlock('faq', 10, { title: 'FAQ' }),
      makeBlock('hashtag', 11, { title: 'Share Your Shots' }),
      makeBlock('guestbook', 12, { title: 'Leave a Note', prompt: 'Share a memory or wish...' }),
      makeBlock('footer', 13, { text: '{{ poetry.closingLine }}' }),
    ],
    theme: {
      colors: { background: '#FAF9F6', foreground: '#1A1A1A', accent: '#C9A87C', accentLight: '#F5EAD6', muted: '#9A9488', cardBg: '#FFFFFF' },
      fonts: { heading: 'Playfair Display', body: 'Inter' },
    },
    vibeString: 'warm golden analog nostalgic film grain sunset',
    layoutFormat: 'filmstrip',
    poetry: {
      heroTagline: 'Chasing golden moments together',
      closingLine: 'Here\'s to a lifetime of golden hours.',
      rsvpIntro: 'Join us as we celebrate love in the golden light.',
      welcomeStatement: 'Welcome to our love story. It\'s been a beautiful journey of shared sunsets, quiet mornings, and a million little moments that brought us here. We\'re so grateful you\'re part of our story.',
    },
  },

  // ── 8. Lavender Dreams ──────────────────────────────────────
  {
    id: 'lavender-dreams',
    name: 'Lavender Dreams',
    tagline: 'Ethereal purple haze',
    description: 'Dreamy lavender palette with celestial accents. Ethereal and otherworldly, perfect for evening ceremonies under the stars.',
    previewGradient: 'linear-gradient(135deg, #F0EEFF 0%, #9B7FD9 50%, #4A3060 100%)',
    occasions: ['wedding', 'engagement', 'anniversary'],
    tags: ['lavender', 'purple', 'dreamy', 'celestial', 'ethereal', 'evening', 'stars'],
    popularity: 75,
    blocks: [
      makeBlock('hero', 0, { subtitle: '{{ poetry.heroTagline }}', layout: 'cinematic' }),
      makeBlock('vibeQuote', 1, { text: 'We are made of star stuff, and to the stars we shall return — together.', symbol: '✧' }),
      makeBlock('welcome', 2, { text: '{{ poetry.welcomeStatement }}' }),
      makeBlock('story', 3, { title: 'Written in the Stars' }),
      makeBlock('countdown', 4, { label: 'Until our forever begins' }),
      makeBlock('event', 5, { title: 'The Evening' }),
      makeBlock('rsvp', 6, { title: 'RSVP' }),
      makeBlock('photos', 7, { title: 'Dreamy Moments' }),
      makeBlock('spotify', 8, { title: 'Starlight Playlist' }),
      makeBlock('guestbook', 9, { title: 'Wishes Upon a Star' }),
      makeBlock('footer', 10, { text: '{{ poetry.closingLine }}' }),
    ],
    theme: {
      colors: { background: '#0D0B14', foreground: '#F0EEFF', accent: '#9B7FD9', accentLight: '#1E1A30', muted: '#7A6EA0', cardBg: '#131020' },
      fonts: { heading: 'Cormorant Garamond', body: 'Inter' },
    },
    vibeString: 'dreamy ethereal lavender celestial purple stars',
    layoutFormat: 'chapters',
    poetry: {
      heroTagline: 'Written in the stars',
      closingLine: 'To the moon, the stars, and back — always.',
      rsvpIntro: 'Come celebrate our love under the evening sky.',
      welcomeStatement: 'Welcome to our world. Some things are written in the stars, and we believe our love story is one of them. Thank you for being the constellations in our sky.',
    },
  },
];

/**
 * Apply a template to a manifest.
 * Merges template content with existing manifest data.
 */
export function applyTemplate(
  template: SiteTemplate,
  manifest: StoryManifest,
  names: [string, string],
): StoryManifest {
  return {
    ...manifest,
    blocks: template.blocks.map((b, i) => ({
      ...b,
      id: `${b.type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      order: i,
    })),
    theme: {
      ...manifest.theme,
      name: template.id,
      colors: template.theme.colors,
      fonts: template.theme.fonts,
    } as StoryManifest['theme'],
    vibeString: template.vibeString,
    layoutFormat: template.layoutFormat as StoryManifest['layoutFormat'],
    poetry: {
      ...manifest.poetry,
      ...template.poetry,
    },
  };
}

/**
 * Get templates sorted by popularity.
 */
export function getPopularTemplates(): SiteTemplate[] {
  return [...SITE_TEMPLATES].sort((a, b) => b.popularity - a.popularity);
}

/**
 * Search templates by keyword.
 */
export function searchTemplates(query: string): SiteTemplate[] {
  const q = query.toLowerCase().trim();
  if (!q) return SITE_TEMPLATES;
  return SITE_TEMPLATES.filter(t =>
    t.name.toLowerCase().includes(q) ||
    t.tagline.toLowerCase().includes(q) ||
    t.tags.some(tag => tag.includes(q)) ||
    t.occasions.some(occ => occ.includes(q))
  );
}

/**
 * Get templates for a specific occasion.
 */
export function getTemplatesForOccasion(occasion: string): SiteTemplate[] {
  return SITE_TEMPLATES.filter(t => t.occasions.includes(occasion));
}
