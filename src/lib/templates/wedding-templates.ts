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
  /** Price in cents (0 = free, undefined = free) */
  price?: number;
  /** Featured in marketplace */
  featured?: boolean;
  /** Hero cover photo URL */
  coverPhoto?: string;
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
    price: 0,
    featured: true,
    description: 'Lush greenery, soft sage accents, and warm natural light. Perfect for garden ceremonies and outdoor celebrations.',
    previewGradient: 'linear-gradient(135deg, #E8F0E0 0%, #D4DFC8 50%, #A3B18A 100%)',
    occasions: ['wedding', 'engagement'],
    tags: ['garden', 'botanical', 'outdoor', 'romantic', 'sage', 'green'],
    popularity: 95,
    coverPhoto: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?q=80&w=2000&auto=format&fit=crop',
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
    price: 0,
    description: 'Sophisticated dark palette with antique gold details. Ideal for evening galas, ballroom receptions, and glamorous celebrations.',
    previewGradient: 'linear-gradient(135deg, #1A1510 0%, #2D2618 50%, #C4A96A 100%)',
    coverPhoto: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?q=80&w=2000&auto=format&fit=crop',
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
    coverPhoto: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2000&auto=format&fit=crop',
    name: 'Coastal Breeze',
    tagline: 'Seaside serenity with ocean blues',
    price: 0,
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
    coverPhoto: 'https://images.unsplash.com/photo-1510076857177-7470076d4098?q=80&w=2000&auto=format&fit=crop',
    name: 'Rustic Romance',
    tagline: 'Barn wood and wildflowers',
    price: 0,
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
    coverPhoto: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?q=80&w=2000&auto=format&fit=crop',
    name: 'Blush & Bloom',
    tagline: 'Soft pinks and delicate florals',
    price: 0,
    featured: true,
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
    coverPhoto: 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?q=80&w=2000&auto=format&fit=crop',
    name: 'Minimalist White',
    tagline: 'Clean lines, pure simplicity',
    price: 0,
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
    coverPhoto: 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=2000&auto=format&fit=crop',
    name: 'Golden Hour',
    tagline: 'Warm light and analog nostalgia',
    price: 0,
    featured: true,
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
    coverPhoto: 'https://images.unsplash.com/photo-1503516459261-40c66117780a?q=80&w=2000&auto=format&fit=crop',
    name: 'Lavender Dreams',
    tagline: 'Ethereal purple haze',
    price: 0,
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

  // ── 9. Y2K Reloaded (Birthday) ─────────────────────────────
  {
    id: 'y2k-reloaded',
    name: 'Y2K Reloaded',
    tagline: 'Early 2000s nostalgia, rebooted',
    price: 399,
    description: 'Hot pink meets electric blue in a throwback to the early 2000s. Bubble fonts, bold color clashes, and unapologetic fun for birthday parties that refuse to grow up.',
    previewGradient: 'linear-gradient(135deg, #FFF0F5 0%, #FF69B4 50%, #00BFFF 100%)',
    occasions: ['birthday'],
    tags: ['y2k', 'retro', 'pink', 'blue', 'playful', 'nostalgic', 'fun', '2000s'],
    popularity: 85,
    coverPhoto: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?q=80&w=2000&auto=format&fit=crop',
    blocks: [
      makeBlock('hero', 0, { subtitle: '{{ poetry.heroTagline }}', layout: 'editorial' }),
      makeBlock('vibeQuote', 1, { text: 'Another year of being absolutely iconic.', symbol: '✦' }),
      makeBlock('welcome', 2, { text: '{{ poetry.welcomeStatement }}' }),
      makeBlock('story', 3, { title: 'The Story So Far' }),
      makeBlock('divider', 4, { style: 'symbol', symbol: '✦', height: 40 }),
      makeBlock('countdown', 5, { label: 'Until the party' }),
      makeBlock('event', 6, { title: 'The Vibe' }),
      makeBlock('rsvp', 7, { title: 'RSVP', introText: '{{ poetry.rsvpIntro }}' }),
      makeBlock('photos', 8, { title: 'Memory Lane', maxPhotos: 9 }),
      makeBlock('faq', 9, { title: 'Party FAQ' }),
      makeBlock('guestbook', 10, { title: 'Drop a Message', prompt: 'Leave a birthday wish...' }),
      makeBlock('footer', 11, { text: '{{ poetry.closingLine }}', subtitle: 'Made with Pearloom' }),
    ],
    theme: {
      colors: { background: '#FFF0F5', foreground: '#1A0020', accent: '#FF69B4', accentLight: '#E0F0FF', muted: '#9A7AAA', cardBg: '#FFFFFF' },
      fonts: { heading: 'Rubik', body: 'Space Grotesk' },
    },
    vibeString: 'y2k retro playful pink blue nostalgic fun bubbly',
    layoutFormat: 'cascade',
    poetry: {
      heroTagline: 'the party starts now',
      closingLine: 'Here\'s to the next chapter — louder, bolder, more you.',
      rsvpIntro: 'Drop a yes and pull up',
      welcomeStatement: 'Welcome to a celebration of another year of being iconic. We\'re turning up, looking back, and partying like it\'s 2003. Get ready.',
    },
  },

  // ── 10. Aged to Perfection (Birthday) ──────────────────────
  {
    id: 'aged-to-perfection',
    name: 'Aged to Perfection',
    tagline: 'Sophisticated wine and charcuterie vibes',
    price: 499,
    featured: true,
    description: 'Burgundy, cream, and gold set the tone for a birthday celebration that\'s refined, warm, and effortlessly elegant. Think wine tastings, cheese boards, and candlelit toasts.',
    previewGradient: 'linear-gradient(135deg, #FAF5F0 0%, #722F37 50%, #C4A96A 100%)',
    occasions: ['birthday', 'story'],
    tags: ['wine', 'sophisticated', 'elegant', 'burgundy', 'gold', 'charcuterie', 'refined'],
    popularity: 82,
    coverPhoto: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?q=80&w=2000&auto=format&fit=crop',
    blocks: [
      makeBlock('hero', 0, { subtitle: '{{ poetry.heroTagline }}', layout: 'cinematic' }),
      makeBlock('vibeQuote', 1, { text: 'Like fine wine — only getting better with time.', symbol: '◆' }),
      makeBlock('welcome', 2, { text: '{{ poetry.welcomeStatement }}' }),
      makeBlock('story', 3, { title: 'The Vintage Years' }),
      makeBlock('divider', 4, { style: 'symbol', symbol: '◆', height: 40 }),
      makeBlock('countdown', 5, { label: 'Until we uncork' }),
      makeBlock('event', 6, { title: 'The Tasting' }),
      makeBlock('rsvp', 7, { title: 'RSVP', introText: '{{ poetry.rsvpIntro }}' }),
      makeBlock('photos', 8, { title: 'A Fine Collection', maxPhotos: 9 }),
      makeBlock('faq', 9, { title: 'Details & Dress Code' }),
      makeBlock('guestbook', 10, { title: 'Leave a Toast', prompt: 'Raise a glass with a few words...' }),
      makeBlock('footer', 11, { text: '{{ poetry.closingLine }}', subtitle: 'Made with Pearloom' }),
    ],
    theme: {
      colors: { background: '#FAF5F0', foreground: '#2A1810', accent: '#722F37', accentLight: '#F0E0D0', muted: '#8A7068', cardBg: '#FFFAF5' },
      fonts: { heading: 'Cormorant Garamond', body: 'Lora' },
    },
    vibeString: 'sophisticated wine burgundy gold elegant refined warm',
    layoutFormat: 'chapters',
    poetry: {
      heroTagline: 'aged to perfection, still improving',
      closingLine: 'Like fine wine — only getting better with time.',
      rsvpIntro: 'Join us for an evening of good taste',
      welcomeStatement: 'Welcome to a celebration of the finer things. Another year, another reason to gather the people who matter most and raise a glass to the good life.',
    },
  },

  // ── 11. Future Noir (Birthday) ─────────────────────────────
  {
    id: 'future-noir',
    name: 'Future Noir',
    tagline: 'Cyberpunk dark theme for the digital age',
    price: 399,
    description: 'Neon cyan and electric purple cut through deep black in a birthday theme built for the future. Sharp, dark, and unforgettable — for those who celebrate at the edge of tomorrow.',
    previewGradient: 'linear-gradient(135deg, #0A0A12 0%, #00D4FF 50%, #7B2FBE 100%)',
    occasions: ['birthday'],
    tags: ['cyberpunk', 'dark', 'neon', 'futuristic', 'tech', 'purple', 'cyan', 'noir'],
    popularity: 78,
    coverPhoto: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2000&auto=format&fit=crop',
    blocks: [
      makeBlock('hero', 0, { subtitle: '{{ poetry.heroTagline }}', layout: 'cinematic' }),
      makeBlock('vibeQuote', 1, { text: 'The future is now — and it looks like you.', symbol: '▮' }),
      makeBlock('welcome', 2, { text: '{{ poetry.welcomeStatement }}' }),
      makeBlock('story', 3, { title: 'Origin Story' }),
      makeBlock('divider', 4, { style: 'symbol', symbol: '▮', height: 40 }),
      makeBlock('countdown', 5, { label: 'T-minus' }),
      makeBlock('event', 6, { title: 'The Upload' }),
      makeBlock('rsvp', 7, { title: 'RSVP', introText: '{{ poetry.rsvpIntro }}' }),
      makeBlock('photos', 8, { title: 'Data Archive', maxPhotos: 9 }),
      makeBlock('faq', 9, { title: 'System FAQ' }),
      makeBlock('guestbook', 10, { title: 'Leave a Transmission', prompt: 'Transmit your birthday message...' }),
      makeBlock('footer', 11, { text: '{{ poetry.closingLine }}', subtitle: 'Made with Pearloom' }),
    ],
    theme: {
      colors: { background: '#0A0A12', foreground: '#E0E8F0', accent: '#00D4FF', accentLight: '#1A1A2E', muted: '#6A7A8A', cardBg: '#12121E' },
      fonts: { heading: 'Orbitron', body: 'Inter' },
    },
    vibeString: 'cyberpunk dark neon futuristic tech noir electric',
    layoutFormat: 'filmstrip',
    poetry: {
      heroTagline: 'system online. party loaded.',
      closingLine: 'The future is now — and it looks like you.',
      rsvpIntro: 'Transmit your RSVP',
      welcomeStatement: 'Welcome to the mainframe. Tonight we celebrate. Another cycle complete, another level unlocked. Jack in and join us.',
    },
  },

  // ── 12. Martini Hour (Birthday) ────────────────────────────
  {
    id: 'martini-hour',
    name: 'Martini Hour',
    tagline: 'Chic cocktail elegance',
    price: 499,
    description: 'Yellow gold on crisp white with black accents — a birthday celebration dripping in cocktail-hour sophistication. Shaken, never boring.',
    previewGradient: 'linear-gradient(135deg, #FFFDE8 0%, #D4A800 50%, #1A1A0A 100%)',
    occasions: ['birthday', 'story'],
    tags: ['cocktail', 'chic', 'gold', 'yellow', 'elegant', 'party', 'sophisticated', 'martini'],
    popularity: 88,
    coverPhoto: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=2000&auto=format&fit=crop',
    blocks: [
      makeBlock('hero', 0, { subtitle: '{{ poetry.heroTagline }}', layout: 'editorial' }),
      makeBlock('vibeQuote', 1, { text: 'A drop older, a lot more fun.', symbol: '◇' }),
      makeBlock('welcome', 2, { text: '{{ poetry.welcomeStatement }}' }),
      makeBlock('story', 3, { title: 'The Highlights Reel' }),
      makeBlock('divider', 4, { style: 'symbol', symbol: '◇', height: 40 }),
      makeBlock('countdown', 5, { label: 'Until last call' }),
      makeBlock('event', 6, { title: 'The Soirée' }),
      makeBlock('rsvp', 7, { title: 'RSVP', introText: '{{ poetry.rsvpIntro }}' }),
      makeBlock('photos', 8, { title: 'The Gallery', maxPhotos: 9 }),
      makeBlock('faq', 9, { title: 'Party Details' }),
      makeBlock('guestbook', 10, { title: 'Sign the Guest List', prompt: 'Leave your best birthday wishes...' }),
      makeBlock('footer', 11, { text: '{{ poetry.closingLine }}', subtitle: 'Made with Pearloom' }),
    ],
    theme: {
      colors: { background: '#FFFDE8', foreground: '#1A1A0A', accent: '#D4A800', accentLight: '#FFF8CC', muted: '#9A9470', cardBg: '#FFFFFF' },
      fonts: { heading: 'Playfair Display', body: 'DM Sans' },
    },
    vibeString: 'cocktail chic gold elegant sophisticated party martini',
    layoutFormat: 'cascade',
    poetry: {
      heroTagline: 'shaken, not stirred',
      closingLine: 'A drop older, a lot more fun.',
      rsvpIntro: 'Raise your glass and let us know you\'re coming',
      welcomeStatement: 'Welcome to the most elegant party of the year. We\'re mixing up something special, and the only missing ingredient is you.',
    },
  },

  // ── 13. Gothic Masquerade (Birthday) ───────────────────────
  {
    id: 'gothic-masquerade',
    name: 'Gothic Masquerade',
    tagline: 'Dark dramatic elegance',
    price: 399,
    description: 'Deep purple, black, gold, and crimson collide in a birthday theme steeped in mystery and grandeur. Masks optional, drama required.',
    previewGradient: 'linear-gradient(135deg, #0D0A10 0%, #8B0000 50%, #C4A96A 100%)',
    occasions: ['birthday'],
    tags: ['gothic', 'dark', 'masquerade', 'dramatic', 'purple', 'crimson', 'elegant', 'mysterious'],
    popularity: 76,
    coverPhoto: 'https://images.unsplash.com/photo-1518998053901-5348d3961a04?q=80&w=2000&auto=format&fit=crop',
    blocks: [
      makeBlock('hero', 0, { subtitle: '{{ poetry.heroTagline }}', layout: 'cinematic' }),
      makeBlock('vibeQuote', 1, { text: 'The night is ours — mysterious, magnificent, unforgettable.', symbol: '❖' }),
      makeBlock('welcome', 2, { text: '{{ poetry.welcomeStatement }}' }),
      makeBlock('story', 3, { title: 'The Legend' }),
      makeBlock('divider', 4, { style: 'symbol', symbol: '❖', height: 40 }),
      makeBlock('countdown', 5, { label: 'The masquerade begins in' }),
      makeBlock('event', 6, { title: 'The Grand Affair' }),
      makeBlock('rsvp', 7, { title: 'RSVP', introText: '{{ poetry.rsvpIntro }}' }),
      makeBlock('photos', 8, { title: 'Behind the Mask', maxPhotos: 9 }),
      makeBlock('faq', 9, { title: 'Masquerade Guide' }),
      makeBlock('guestbook', 10, { title: 'Whisper Your Wishes', prompt: 'Leave a mysterious birthday message...' }),
      makeBlock('footer', 11, { text: '{{ poetry.closingLine }}', subtitle: 'Made with Pearloom' }),
    ],
    theme: {
      colors: { background: '#0D0A10', foreground: '#E8E0F0', accent: '#8B0000', accentLight: '#1A1520', muted: '#7A6888', cardBg: '#151218' },
      fonts: { heading: 'Cinzel', body: 'Raleway' },
    },
    vibeString: 'gothic dark masquerade dramatic mysterious elegant crimson',
    layoutFormat: 'chapters',
    poetry: {
      heroTagline: 'behind the mask, a legend',
      closingLine: 'The night is ours — mysterious, magnificent, unforgettable.',
      rsvpIntro: 'Accept your invitation to the masquerade',
      welcomeStatement: 'Welcome, darling. Tonight we dance in shadows. Another year older, another year more enigmatic. Put on your mask and join the celebration.',
    },
  },

  // ── 14. Maximalist Fun House (Birthday) ────────────────────
  {
    id: 'maximalist-fun-house',
    name: 'Maximalist Fun House',
    tagline: 'Bold circus-chic energy',
    price: 499,
    description: 'Primary colors, bold patterns, and maximum playful energy. A birthday theme for those who believe more is more and subtlety is overrated.',
    previewGradient: 'linear-gradient(135deg, #FFF5F0 0%, #FF4444 50%, #FFD700 100%)',
    occasions: ['birthday'],
    tags: ['bold', 'colorful', 'circus', 'playful', 'fun', 'maximalist', 'party', 'primary'],
    popularity: 80,
    coverPhoto: 'https://images.unsplash.com/photo-1496024840928-4c417adf211d?q=80&w=2000&auto=format&fit=crop',
    blocks: [
      makeBlock('hero', 0, { subtitle: '{{ poetry.heroTagline }}', layout: 'fullbleed' }),
      makeBlock('vibeQuote', 1, { text: 'Life\'s a circus — might as well be the ringleader.', symbol: '★' }),
      makeBlock('welcome', 2, { text: '{{ poetry.welcomeStatement }}' }),
      makeBlock('story', 3, { title: 'The Main Act' }),
      makeBlock('divider', 4, { style: 'symbol', symbol: '★', height: 40 }),
      makeBlock('countdown', 5, { label: 'Showtime in' }),
      makeBlock('event', 6, { title: 'Under the Big Top' }),
      makeBlock('rsvp', 7, { title: 'RSVP', introText: '{{ poetry.rsvpIntro }}' }),
      makeBlock('photos', 8, { title: 'The Spectacle', maxPhotos: 9 }),
      makeBlock('faq', 9, { title: 'Show Notes' }),
      makeBlock('guestbook', 10, { title: 'Sign the Playbill', prompt: 'Leave a spectacular birthday wish...' }),
      makeBlock('footer', 11, { text: '{{ poetry.closingLine }}', subtitle: 'Made with Pearloom' }),
    ],
    theme: {
      colors: { background: '#FFF5F0', foreground: '#1A0A20', accent: '#FF4444', accentLight: '#FFE8CC', muted: '#9A7A6A', cardBg: '#FFFFFF' },
      fonts: { heading: 'Syne', body: 'Quicksand' },
    },
    vibeString: 'bold colorful circus playful fun maximalist party energetic',
    layoutFormat: 'scrapbook',
    poetry: {
      heroTagline: 'the greatest show on earth (it\'s you)',
      closingLine: 'Life\'s a circus — might as well be the ringleader.',
      rsvpIntro: 'Step right up and let us know you\'ll be there',
      welcomeStatement: 'Welcome to the most spectacular birthday on record. No half measures, no quiet corners — just pure, unapologetic celebration. The show is about to begin.',
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
    coverPhoto: template.coverPhoto || manifest.coverPhoto,
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
