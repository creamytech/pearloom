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

  // ══════════════════════════════════════════════════════════════
  // PREMIUM WEDDING THEMES (12 trend-based designs)
  // ══════════════════════════════════════════════════════════════

  {
    id: 'art-deco-glamour', name: 'Art Deco Glamour', tagline: '1920s geometric gold on midnight black',
    description: 'Great Gatsby-era opulence with geometric patterns, champagne gold, and dramatic black. Perfect for evening galas and ballroom receptions.',
    previewGradient: 'linear-gradient(135deg, #0D0D0D 0%, #1A1510 50%, #C9A84C 100%)',
    occasions: ['wedding', 'engagement'], tags: ['art deco', 'gatsby', 'gold', 'glamour', 'geometric', '1920s', 'evening'],
    popularity: 88, price: 499, featured: true,
    coverPhoto: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?q=80&w=2000&auto=format&fit=crop',
    blocks: [
      makeBlock('hero', 0), makeBlock('vibeQuote', 1, { text: 'The world is full of obvious things which nobody by any chance ever observes.', symbol: '◆' }),
      makeBlock('welcome', 2), makeBlock('story', 3), makeBlock('divider', 4, { symbol: '◇' }),
      makeBlock('countdown', 5, { label: 'The grand affair begins in' }), makeBlock('event', 6, { title: 'The Soirée' }),
      makeBlock('rsvp', 7), makeBlock('registry', 8), makeBlock('travel', 9),
      makeBlock('photos', 10), makeBlock('faq', 11), makeBlock('guestbook', 12, { title: 'The Guest Ledger' }), makeBlock('footer', 13),
    ],
    theme: { colors: { background: '#0D0D0D', foreground: '#F0E8D4', accent: '#C9A84C', accentLight: '#1A1510', muted: '#8A7A60', cardBg: '#1A1815' }, fonts: { heading: 'Cinzel', body: 'Raleway' } },
    vibeString: 'art deco gatsby geometric gold black glamorous evening luxurious', layoutFormat: 'filmstrip',
    poetry: { heroTagline: 'an evening of gold and grandeur', closingLine: 'Here\'s to the roaring start of forever.', rsvpIntro: 'You are cordially invited to the affair of the season.', welcomeStatement: 'Welcome to our golden evening. In the spirit of the great gatsby era, we invite you to celebrate with us in style, splendor, and unforgettable elegance.' },
  },
  {
    id: 'tuscan-villa', name: 'Tuscan Villa', tagline: 'Italian countryside warmth and terracotta charm',
    description: 'Sun-drenched Tuscany with warm terracotta, olive green, and golden stone. Ideal for vineyard weddings and Mediterranean celebrations.',
    previewGradient: 'linear-gradient(135deg, #F5EDE0 0%, #D4A87A 50%, #8B6B3D 100%)',
    occasions: ['wedding', 'anniversary', 'engagement'], tags: ['tuscan', 'italian', 'vineyard', 'mediterranean', 'terracotta', 'warm'],
    popularity: 86, price: 499,
    coverPhoto: 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?q=80&w=2000&auto=format&fit=crop',
    blocks: [
      makeBlock('hero', 0), makeBlock('vibeQuote', 1, { text: 'La dolce vita — the sweet life begins here.', symbol: '✦' }),
      makeBlock('welcome', 2), makeBlock('story', 3), makeBlock('divider', 4, { symbol: '◎' }),
      makeBlock('countdown', 5, { label: 'Until la festa' }), makeBlock('event', 6, { title: 'La Celebrazione' }),
      makeBlock('rsvp', 7), makeBlock('registry', 8), makeBlock('travel', 9),
      makeBlock('photos', 10), makeBlock('faq', 11), makeBlock('guestbook', 12, { title: 'Il Libro degli Ospiti' }), makeBlock('footer', 13),
    ],
    theme: { colors: { background: '#F5EDE0', foreground: '#2A1F14', accent: '#B8693D', accentLight: '#F0DCC8', muted: '#8A7060', cardBg: '#FFFAF5' }, fonts: { heading: 'Cormorant Garamond', body: 'Lora' } },
    vibeString: 'tuscan italian vineyard mediterranean terracotta warm olive romantic', layoutFormat: 'cascade',
    poetry: { heroTagline: 'under the Tuscan sun, forever', closingLine: 'Alla nostra storia d\'amore — to our love story.', rsvpIntro: 'Join us for an evening of Italian warmth and celebration.', welcomeStatement: 'Welcome to our Tuscan dream. Among the rolling hills and golden light, we celebrate a love as warm and enduring as the Italian sun.' },
  },
  {
    id: 'french-chateau', name: 'French Chateau', tagline: 'Parisian elegance with dusty blue and cream',
    description: 'Refined French romanticism with dusty blue, soft cream, and gold details. Perfect for château weddings and elegant indoor celebrations.',
    previewGradient: 'linear-gradient(135deg, #F8F4EE 0%, #B8C8D8 50%, #6B8CAE 100%)',
    occasions: ['wedding', 'engagement'], tags: ['french', 'chateau', 'parisian', 'elegant', 'blue', 'classic'],
    popularity: 84, price: 499,
    coverPhoto: 'https://images.unsplash.com/photo-1550005809-91ad75fb315f?q=80&w=2000&auto=format&fit=crop',
    blocks: [
      makeBlock('hero', 0), makeBlock('vibeQuote', 1, { text: 'L\'amour est la poésie des sens.', symbol: '❋' }),
      makeBlock('welcome', 2), makeBlock('story', 3), makeBlock('divider', 4, { symbol: '✧' }),
      makeBlock('countdown', 5, { label: 'Days until we say oui' }), makeBlock('event', 6, { title: 'La Fête' }),
      makeBlock('rsvp', 7), makeBlock('registry', 8), makeBlock('travel', 9),
      makeBlock('photos', 10), makeBlock('faq', 11), makeBlock('guestbook', 12, { title: 'Livre d\'Or' }), makeBlock('footer', 13),
    ],
    theme: { colors: { background: '#F8F4EE', foreground: '#1A2744', accent: '#6B8CAE', accentLight: '#D8E4F0', muted: '#7A8898', cardBg: '#FFFFFF' }, fonts: { heading: 'Libre Baskerville', body: 'Source Sans 3' } },
    vibeString: 'french parisian chateau elegant dusty blue cream refined classic', layoutFormat: 'cascade',
    poetry: { heroTagline: 'a love letter written in Paris', closingLine: 'Avec tout notre amour — with all our love.', rsvpIntro: 'We would be honored by your presence at our celebration.', welcomeStatement: 'Welcome to our French romance. With the elegance of a Parisian evening and the warmth of lifelong love, we invite you to share in our joy.' },
  },
  {
    id: 'enchanted-forest', name: 'Enchanted Forest', tagline: 'Deep woods, emerald glow, and golden fireflies',
    description: 'Mystical woodland magic with deep emerald, moss, and amber. Ideal for forest clearings, garden venues, and evening celebrations.',
    previewGradient: 'linear-gradient(135deg, #0C1A0F 0%, #1A3A20 50%, #2E7D52 100%)',
    occasions: ['wedding', 'engagement'], tags: ['forest', 'enchanted', 'woodland', 'emerald', 'nature', 'mystical', 'dark'],
    popularity: 82, price: 399,
    coverPhoto: 'https://images.unsplash.com/photo-1510076857177-7470076d4098?q=80&w=2000&auto=format&fit=crop',
    blocks: [
      makeBlock('hero', 0), makeBlock('vibeQuote', 1, { text: 'In the forest of our love, every path leads home.', symbol: '🌿' }),
      makeBlock('welcome', 2), makeBlock('story', 3), makeBlock('divider', 4, { symbol: '❋' }),
      makeBlock('countdown', 5, { label: 'The enchantment begins in' }), makeBlock('event', 6, { title: 'The Gathering' }),
      makeBlock('rsvp', 7), makeBlock('registry', 8), makeBlock('travel', 9),
      makeBlock('photos', 10), makeBlock('faq', 11), makeBlock('guestbook', 12, { title: 'Forest Whispers' }), makeBlock('footer', 13),
    ],
    theme: { colors: { background: '#0C1A0F', foreground: '#D4E8D0', accent: '#2E7D52', accentLight: '#1A3A20', muted: '#6A8A70', cardBg: '#121E14' }, fonts: { heading: 'EB Garamond', body: 'Nunito' } },
    vibeString: 'enchanted forest woodland mystical emerald moss dark nature evening', layoutFormat: 'cascade',
    poetry: { heroTagline: 'where the forest meets forever', closingLine: 'May our roots grow deep and our branches reach the stars.', rsvpIntro: 'You are invited to step into our enchanted world.', welcomeStatement: 'Welcome to our woodland sanctuary. Among ancient trees and firefly light, we celebrate a love that grows wild and free.' },
  },
  {
    id: 'desert-boho', name: 'Desert Boho', tagline: 'Southwest terracotta and free-spirited warmth',
    description: 'Free-spirited desert romance with terracotta, sand, and burnt orange. Perfect for ranch weddings, desert venues, and bohemian celebrations.',
    previewGradient: 'linear-gradient(135deg, #F5E6D3 0%, #D4956A 50%, #C4622D 100%)',
    occasions: ['wedding', 'engagement'], tags: ['desert', 'boho', 'bohemian', 'southwest', 'terracotta', 'rustic', 'outdoor'],
    popularity: 80, price: 399,
    coverPhoto: 'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?q=80&w=2000&auto=format&fit=crop',
    blocks: [
      makeBlock('hero', 0), makeBlock('vibeQuote', 1, { text: 'Wild hearts, warm sands, endless sky.', symbol: '☀' }),
      makeBlock('welcome', 2), makeBlock('story', 3), makeBlock('divider', 4, { symbol: '▲' }),
      makeBlock('countdown', 5, { label: 'Until we ride into the sunset' }), makeBlock('event', 6, { title: 'The Desert Gathering' }),
      makeBlock('rsvp', 7), makeBlock('registry', 8), makeBlock('travel', 9),
      makeBlock('photos', 10), makeBlock('faq', 11), makeBlock('guestbook', 12, { title: 'Desert Wishes' }), makeBlock('footer', 13),
    ],
    theme: { colors: { background: '#F5E6D3', foreground: '#2D1E0E', accent: '#C4622D', accentLight: '#F0D0B0', muted: '#9A7A58', cardBg: '#FFF8F0' }, fonts: { heading: 'Josefin Sans', body: 'Quicksand' } },
    vibeString: 'desert boho bohemian southwest terracotta sand free-spirited warm', layoutFormat: 'scrapbook',
    poetry: { heroTagline: 'wild hearts under open skies', closingLine: 'Here\'s to love as vast as the desert sky.', rsvpIntro: 'Come as you are — boots, sandals, and open hearts welcome.', welcomeStatement: 'Welcome to our desert love story. Under an endless sky and surrounded by the raw beauty of the southwest, we celebrate a love that runs free.' },
  },
  {
    id: 'modern-glam', name: 'Modern Glam', tagline: 'Contemporary luxury with bold pink accents',
    description: 'High-fashion contemporary with stark black, white, and a bold pink accent. Ideal for gallery weddings, rooftop events, and modern venues.',
    previewGradient: 'linear-gradient(135deg, #FAFAFA 0%, #E0E0E0 50%, #E84393 100%)',
    occasions: ['wedding', 'engagement', 'birthday'], tags: ['modern', 'glam', 'contemporary', 'pink', 'black', 'white', 'fashion'],
    popularity: 85, price: 499, featured: true,
    coverPhoto: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=2000&auto=format&fit=crop',
    blocks: [
      makeBlock('hero', 0), makeBlock('vibeQuote', 1, { text: 'Love looks not with the eyes, but with the mind.', symbol: '◆' }),
      makeBlock('welcome', 2), makeBlock('story', 3), makeBlock('divider', 4, { symbol: '✧' }),
      makeBlock('countdown', 5, { label: 'The countdown is on' }), makeBlock('event', 6, { title: 'The Event' }),
      makeBlock('rsvp', 7), makeBlock('registry', 8), makeBlock('travel', 9),
      makeBlock('photos', 10), makeBlock('faq', 11), makeBlock('guestbook', 12, { title: 'Leave Your Mark' }), makeBlock('footer', 13),
    ],
    theme: { colors: { background: '#FAFAFA', foreground: '#111111', accent: '#E84393', accentLight: '#FCE4F0', muted: '#888888', cardBg: '#FFFFFF' }, fonts: { heading: 'Outfit', body: 'Inter' } },
    vibeString: 'modern contemporary glam fashion bold pink black white clean', layoutFormat: 'magazine',
    poetry: { heroTagline: 'bold love, zero apologies', closingLine: 'This is just the beginning of our most glamorous chapter.', rsvpIntro: 'Mark your calendar. This is the one you don\'t want to miss.', welcomeStatement: 'Welcome to our celebration. No traditions we didn\'t choose, no rules we didn\'t rewrite. Just us, our people, and an unforgettable night.' },
  },
  {
    id: 'vintage-romance', name: 'Vintage Romance', tagline: 'Old-world charm with dusty rose and ivory',
    description: 'Timeless nostalgic elegance with dusty rose, antique cream, and soft sage. Perfect for historic venues, estate weddings, and classic celebrations.',
    previewGradient: 'linear-gradient(135deg, #FAF5EE 0%, #E0C0C0 50%, #C48B8B 100%)',
    occasions: ['wedding', 'anniversary', 'engagement'], tags: ['vintage', 'romantic', 'classic', 'dusty rose', 'antique', 'elegant'],
    popularity: 87, price: 399,
    coverPhoto: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?q=80&w=2000&auto=format&fit=crop',
    blocks: [
      makeBlock('hero', 0), makeBlock('vibeQuote', 1, { text: 'Some love stories are timeless — ours is one of them.', symbol: '❀' }),
      makeBlock('welcome', 2), makeBlock('story', 3), makeBlock('divider', 4, { symbol: '✿' }),
      makeBlock('countdown', 5, { label: 'Until our vintage day' }), makeBlock('event', 6, { title: 'The Celebration' }),
      makeBlock('rsvp', 7), makeBlock('registry', 8), makeBlock('travel', 9),
      makeBlock('photos', 10), makeBlock('faq', 11), makeBlock('guestbook', 12, { title: 'Pages of Wishes' }), makeBlock('footer', 13),
    ],
    theme: { colors: { background: '#FAF5EE', foreground: '#3D2E22', accent: '#C48B8B', accentLight: '#F5E0E0', muted: '#9A8478', cardBg: '#FFF9F7' }, fonts: { heading: 'Crimson Text', body: 'Lato' } },
    vibeString: 'vintage romantic classic antique dusty rose ivory elegant timeless', layoutFormat: 'cascade',
    poetry: { heroTagline: 'a timeless love, beautifully told', closingLine: 'Some stories are worth telling forever — ours is one.', rsvpIntro: 'We would be delighted to have you join our celebration.', welcomeStatement: 'Welcome to our love story, told in the language of another era. With the grace of vintage elegance, we invite you to celebrate this timeless moment.' },
  },
  {
    id: 'tropical-paradise', name: 'Tropical Paradise', tagline: 'Lush coral and teal island vibes',
    description: 'Vibrant tropical energy with coral, teal, and palm green. Ideal for destination weddings, beach celebrations, and summer parties.',
    previewGradient: 'linear-gradient(135deg, #FFFAF0 0%, #80D0C0 50%, #E87461 100%)',
    occasions: ['wedding', 'engagement', 'birthday'], tags: ['tropical', 'beach', 'island', 'coral', 'teal', 'destination', 'summer'],
    popularity: 83, price: 399,
    coverPhoto: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2000&auto=format&fit=crop',
    blocks: [
      makeBlock('hero', 0), makeBlock('vibeQuote', 1, { text: 'Salt in the air, love in our hearts.', symbol: '🌺' }),
      makeBlock('welcome', 2), makeBlock('story', 3), makeBlock('divider', 4, { symbol: '☀' }),
      makeBlock('countdown', 5, { label: 'Paradise awaits in' }), makeBlock('event', 6, { title: 'Island Celebration' }),
      makeBlock('rsvp', 7), makeBlock('registry', 8), makeBlock('travel', 9),
      makeBlock('photos', 10), makeBlock('faq', 11), makeBlock('guestbook', 12, { title: 'Beach Notes' }), makeBlock('footer', 13),
    ],
    theme: { colors: { background: '#FFFAF0', foreground: '#0A2E2E', accent: '#E87461', accentLight: '#FFE0D0', muted: '#6A8A8A', cardBg: '#FFFFFF' }, fonts: { heading: 'Playfair Display', body: 'Poppins' } },
    vibeString: 'tropical beach island coral teal destination summer vibrant warm', layoutFormat: 'filmstrip',
    poetry: { heroTagline: 'where the ocean meets forever', closingLine: 'Love as deep as the ocean, as warm as the island sun.', rsvpIntro: 'Pack your bags and join us in paradise.', welcomeStatement: 'Welcome to our island celebration. With sand between our toes and the ocean as our witness, we celebrate a love as warm and boundless as the tropics.' },
  },
  {
    id: 'winter-wonderland', name: 'Winter Wonderland', tagline: 'Snowy elegance with ice blue and silver',
    description: 'Crystalline winter magic with ice blue, silver, and fresh white. Perfect for holiday weddings, ski resort venues, and winter celebrations.',
    previewGradient: 'linear-gradient(135deg, #F0F4F8 0%, #A0C0D0 50%, #6BA3BE 100%)',
    occasions: ['wedding', 'engagement'], tags: ['winter', 'snow', 'ice', 'blue', 'silver', 'holiday', 'elegant'],
    popularity: 79, price: 399,
    coverPhoto: 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?q=80&w=2000&auto=format&fit=crop',
    blocks: [
      makeBlock('hero', 0), makeBlock('vibeQuote', 1, { text: 'In the quiet of winter, love speaks loudest.', symbol: '❄' }),
      makeBlock('welcome', 2), makeBlock('story', 3), makeBlock('divider', 4, { symbol: '✧' }),
      makeBlock('countdown', 5, { label: 'Until our winter day' }), makeBlock('event', 6, { title: 'The Winter Gathering' }),
      makeBlock('rsvp', 7), makeBlock('registry', 8), makeBlock('travel', 9),
      makeBlock('photos', 10), makeBlock('faq', 11), makeBlock('guestbook', 12, { title: 'Snowflake Wishes' }), makeBlock('footer', 13),
    ],
    theme: { colors: { background: '#F0F4F8', foreground: '#1C2938', accent: '#6BA3BE', accentLight: '#D8EAF0', muted: '#7A8A98', cardBg: '#FFFFFF' }, fonts: { heading: 'Cormorant Garamond', body: 'Raleway' } },
    vibeString: 'winter snow ice blue silver elegant crystalline cold dreamy', layoutFormat: 'cascade',
    poetry: { heroTagline: 'a love as pure as fresh snowfall', closingLine: 'May our love keep us warm through every winter ahead.', rsvpIntro: 'Bundle up and join us for a magical winter celebration.', welcomeStatement: 'Welcome to our winter wonderland. In the hush of falling snow and the sparkle of ice crystals, we celebrate a love that warms even the coldest day.' },
  },
  {
    id: 'celestial-night', name: 'Celestial Night', tagline: 'Starry cosmos with navy, gold, and deep purple',
    description: 'Cosmic mystique with deep navy, shimmering gold, and purple nebula. Ideal for evening celebrations, rooftop weddings, and stargazing venues.',
    previewGradient: 'linear-gradient(135deg, #0A0E1A 0%, #1A2040 50%, #C8A84A 100%)',
    occasions: ['wedding', 'engagement'], tags: ['celestial', 'night', 'stars', 'cosmic', 'navy', 'gold', 'evening'],
    popularity: 81, price: 399,
    coverPhoto: 'https://images.unsplash.com/photo-1503516459261-40c66117780a?q=80&w=2000&auto=format&fit=crop',
    blocks: [
      makeBlock('hero', 0), makeBlock('vibeQuote', 1, { text: 'We are all made of star-stuff.', symbol: '✧' }),
      makeBlock('welcome', 2), makeBlock('story', 3), makeBlock('divider', 4, { symbol: '⟡' }),
      makeBlock('countdown', 5, { label: 'The stars align in' }), makeBlock('event', 6, { title: 'Under the Stars' }),
      makeBlock('rsvp', 7), makeBlock('registry', 8), makeBlock('travel', 9),
      makeBlock('photos', 10), makeBlock('faq', 11), makeBlock('guestbook', 12, { title: 'Starlight Messages' }), makeBlock('footer', 13),
    ],
    theme: { colors: { background: '#0A0E1A', foreground: '#F0EBE0', accent: '#C8A84A', accentLight: '#1A1830', muted: '#7A7898', cardBg: '#121628' }, fonts: { heading: 'Cinzel', body: 'Source Sans 3' } },
    vibeString: 'celestial cosmic night stars navy gold purple mystical evening', layoutFormat: 'filmstrip',
    poetry: { heroTagline: 'written in the stars, sealed in love', closingLine: 'Two stars that found each other across the infinite sky.', rsvpIntro: 'The stars have aligned — will you be there?', welcomeStatement: 'Welcome to our celestial celebration. Under a canopy of stars, we celebrate a love that transcends time and space.' },
  },
  {
    id: 'southern-charm', name: 'Southern Charm', tagline: 'Magnolia peach and warm cream elegance',
    description: 'Gracious Southern hospitality with warm peach, cream, and soft green. Perfect for plantation venues, garden weddings, and elegant receptions.',
    previewGradient: 'linear-gradient(135deg, #FFF8F0 0%, #F0C8A0 50%, #E8A87C 100%)',
    occasions: ['wedding', 'engagement'], tags: ['southern', 'magnolia', 'peach', 'charm', 'hospitality', 'garden', 'elegant'],
    popularity: 78, price: 399,
    coverPhoto: 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=2000&auto=format&fit=crop',
    blocks: [
      makeBlock('hero', 0), makeBlock('vibeQuote', 1, { text: 'Sweet tea, warm hearts, and forever promises.', symbol: '✿' }),
      makeBlock('welcome', 2), makeBlock('story', 3), makeBlock('divider', 4, { symbol: '❀' }),
      makeBlock('countdown', 5, { label: 'Until our Southern day' }), makeBlock('event', 6, { title: 'The Southern Gathering' }),
      makeBlock('rsvp', 7), makeBlock('registry', 8), makeBlock('travel', 9),
      makeBlock('photos', 10), makeBlock('faq', 11), makeBlock('guestbook', 12, { title: 'Porch Swing Wishes' }), makeBlock('footer', 13),
    ],
    theme: { colors: { background: '#FFF8F0', foreground: '#2C1810', accent: '#E8A87C', accentLight: '#FFE8D0', muted: '#9A8070', cardBg: '#FFFCF8' }, fonts: { heading: 'Libre Baskerville', body: 'Lora' } },
    vibeString: 'southern charm magnolia peach cream elegant warm hospitality garden', layoutFormat: 'cascade',
    poetry: { heroTagline: 'a love as sweet as Southern sun', closingLine: 'Y\'all are the reason this day is so special.', rsvpIntro: 'We\'d be tickled pink if you could join us.', welcomeStatement: 'Welcome, y\'all. With Southern grace and heartfelt warmth, we invite you to celebrate the sweetest day of our lives.' },
  },
  {
    id: 'industrial-chic', name: 'Industrial Chic', tagline: 'Raw concrete, copper, and urban edge',
    description: 'Urban warehouse aesthetic with concrete gray, warm copper, and clean lines. Ideal for loft weddings, brewery venues, and converted industrial spaces.',
    previewGradient: 'linear-gradient(135deg, #E8E4E0 0%, #C0A080 50%, #B87333 100%)',
    occasions: ['wedding', 'engagement', 'birthday'], tags: ['industrial', 'urban', 'warehouse', 'copper', 'concrete', 'modern', 'loft'],
    popularity: 77, price: 399,
    coverPhoto: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?q=80&w=2000&auto=format&fit=crop',
    blocks: [
      makeBlock('hero', 0), makeBlock('vibeQuote', 1, { text: 'Built on a foundation of steel and soul.', symbol: '◆' }),
      makeBlock('welcome', 2), makeBlock('story', 3), makeBlock('divider', 4, { symbol: '▪' }),
      makeBlock('countdown', 5, { label: 'Construction complete in' }), makeBlock('event', 6, { title: 'The Warehouse Party' }),
      makeBlock('rsvp', 7), makeBlock('registry', 8), makeBlock('travel', 9),
      makeBlock('photos', 10), makeBlock('faq', 11), makeBlock('guestbook', 12, { title: 'The Guestbook' }), makeBlock('footer', 13),
    ],
    theme: { colors: { background: '#E8E4E0', foreground: '#1A1A1A', accent: '#B87333', accentLight: '#F0DCC8', muted: '#8A8480', cardBg: '#F0EDEA' }, fonts: { heading: 'Space Grotesk', body: 'Inter' } },
    vibeString: 'industrial urban warehouse loft copper concrete modern raw clean', layoutFormat: 'magazine',
    poetry: { heroTagline: 'raw love, refined celebration', closingLine: 'We built this love from the ground up — and it\'s solid.', rsvpIntro: 'Hard hats optional. Your presence is required.', welcomeStatement: 'Welcome to our urban celebration. In a space that blends raw beauty with refined design, we celebrate a love built to last.' },
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
