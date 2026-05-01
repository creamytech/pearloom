// ─────────────────────────────────────────────────────────────
// Pearloom / lib/templates/color-themes.ts
// Color/design themes — visual palettes users can apply to
// any site. These are NOT page layouts — they're color schemes,
// font pairings, and visual identities.
//
// Based on 2025-2026 wedding/event trends:
// - Burgundy & Gold (classic fall/winter)
// - Sage & Ivory (botanical garden)
// - Navy & Blush (elegant nautical)
// - Terracotta Sunset (desert boho)
// - Dusty Blue & Lavender (soft romantic)
// - Black & White (editorial modern)
// - Emerald & Champagne (luxury)
// - Mauve & Greenery (organic romantic)
// Plus birthday & anniversary specific themes
// ─────────────────────────────────────────────────────────────

export interface ColorTheme {
  id: string;
  name: string;
  description: string;
  /** Occasion this theme works best for */
  occasions: string[];
  /** Tags for filtering */
  tags: string[];
  /** Season this theme works best for */
  season: 'spring' | 'summer' | 'fall' | 'winter' | 'all-season';
  /** Preview gradient for the gallery */
  previewGradient: string;
  /** The actual color palette */
  colors: {
    background: string;
    foreground: string;
    accent: string;
    accentLight: string;
    muted: string;
    cardBg: string;
  };
  /** Font pairing */
  fonts: {
    heading: string;
    body: string;
  };
  /** Border radius style */
  borderRadius: string;
  /** Card style */
  cardStyle: 'solid' | 'glass' | 'bordered' | 'shadow-heavy';
  /** Background pattern */
  backgroundPattern: 'none' | 'dots' | 'noise' | 'floral' | 'topography';
}

// ── Wedding Themes ───────────────────────────────────────────

export const COLOR_THEMES: ColorTheme[] = [

  // ── CLASSIC WEDDING ──

  {
    id: 'burgundy-gold',
    name: 'Burgundy & Gold',
    description: 'Rich wine tones with antique gold accents. Classic fall/winter elegance.',
    occasions: ['wedding', 'anniversary'],
    tags: ['classic', 'fall', 'winter', 'elegant', 'warm', 'romantic'],
    season: 'fall',
    previewGradient: 'linear-gradient(135deg, #4A0E0E 0%, #8B1A1A 40%, #C4A96A 100%)',
    colors: { background: '#FAF5F2', foreground: '#2A1010', accent: '#8B1A1A', accentLight: '#F5E6E6', muted: '#8A7A72', cardBg: '#FFFFFF' },
    fonts: { heading: 'Playfair Display', body: 'Lora' },
    borderRadius: '1rem', cardStyle: 'solid', backgroundPattern: 'noise',
  },
  {
    id: 'sage-ivory',
    name: 'Sage & Ivory',
    description: 'Soft botanical greens on warm cream. Garden ceremony perfection.',
    occasions: ['wedding', 'engagement'],
    tags: ['botanical', 'garden', 'organic', 'natural', 'spring', 'summer'],
    season: 'spring',
    previewGradient: 'linear-gradient(135deg, #F4F7F1 0%, #5C6B3F 50%, #6E8C5C 100%)',
    colors: { background: '#F4F7F1', foreground: '#1E2A1A', accent: '#6A8F5A', accentLight: '#DDEBD4', muted: '#7A8C72', cardBg: '#FFFFFF' },
    fonts: { heading: 'Cormorant Garamond', body: 'Inter' },
    borderRadius: '1.5rem', cardStyle: 'glass', backgroundPattern: 'floral',
  },
  {
    id: 'navy-blush',
    name: 'Navy & Blush',
    description: 'Deep navy blue with soft pink accents. Elegant and timeless.',
    occasions: ['wedding', 'engagement'],
    tags: ['elegant', 'classic', 'nautical', 'spring', 'summer', 'romantic'],
    season: 'all-season',
    previewGradient: 'linear-gradient(135deg, #F8F5F3 0%, #C4899A 50%, #1B2A4A 100%)',
    colors: { background: '#F8F5F3', foreground: '#1B2A4A', accent: '#1B2A4A', accentLight: '#E8D8DE', muted: '#8A8095', cardBg: '#FFFFFF' },
    fonts: { heading: 'Libre Baskerville', body: 'Source Sans 3' },
    borderRadius: '0.75rem', cardStyle: 'bordered', backgroundPattern: 'none',
  },
  {
    id: 'terracotta-sunset',
    name: 'Terracotta Sunset',
    description: 'Warm desert tones with burnt orange and sand. Boho desert vibes.',
    occasions: ['wedding', 'engagement'],
    tags: ['boho', 'desert', 'warm', 'earthy', 'fall', 'southwest'],
    season: 'fall',
    previewGradient: 'linear-gradient(135deg, #FDF5EF 0%, #C97C30 50%, #8B5E3C 100%)',
    colors: { background: '#FDF5EF', foreground: '#2C1A0A', accent: '#C97C30', accentLight: '#FAEBD7', muted: '#9A7A55', cardBg: '#FFFAF4' },
    fonts: { heading: 'Josefin Sans', body: 'Lato' },
    borderRadius: '0.5rem', cardStyle: 'solid', backgroundPattern: 'topography',
  },
  {
    id: 'dusty-blue-lavender',
    name: 'Dusty Blue & Lavender',
    description: 'Soft blues and muted purples. Dreamy and ethereal romance.',
    occasions: ['wedding', 'engagement', 'anniversary'],
    tags: ['romantic', 'soft', 'dreamy', 'spring', 'summer', 'pastel'],
    season: 'spring',
    previewGradient: 'linear-gradient(135deg, #F0F3FA 0%, #9BAFC4 50%, #8A7BA8 100%)',
    colors: { background: '#F0F3FA', foreground: '#1A1A2E', accent: '#7A8FA8', accentLight: '#DAE3ED', muted: '#8A8898', cardBg: '#FFFFFF' },
    fonts: { heading: 'Cormorant Garamond', body: 'Raleway' },
    borderRadius: '1rem', cardStyle: 'glass', backgroundPattern: 'dots',
  },
  {
    id: 'black-white-editorial',
    name: 'Black & White',
    description: 'Bold editorial contrast. Ultra-modern minimalism.',
    occasions: ['wedding', 'engagement', 'birthday'],
    tags: ['modern', 'minimal', 'editorial', 'bold', 'clean', 'urban'],
    season: 'all-season',
    previewGradient: 'linear-gradient(135deg, #FFFFFF 0%, #CCCCCC 50%, #111111 100%)',
    colors: { background: '#FFFFFF', foreground: '#111111', accent: '#111111', accentLight: '#F5F5F5', muted: '#888888', cardBg: '#F8F8F8' },
    fonts: { heading: 'DM Serif Display', body: 'DM Sans' },
    borderRadius: '0.25rem', cardStyle: 'bordered', backgroundPattern: 'none',
  },
  {
    id: 'emerald-champagne',
    name: 'Emerald & Champagne',
    description: 'Deep jewel green with champagne gold. Luxury celebration.',
    occasions: ['wedding', 'anniversary', 'engagement'],
    tags: ['luxury', 'jewel', 'rich', 'winter', 'elegant', 'glamorous'],
    season: 'winter',
    previewGradient: 'linear-gradient(135deg, #F5F2EC 0%, #2D5A3D 50%, #D4B896 100%)',
    colors: { background: '#F5F2EC', foreground: '#1A2E22', accent: '#2D5A3D', accentLight: '#D5E8DC', muted: '#6A7A6E', cardBg: '#FFFFFF' },
    fonts: { heading: 'Playfair Display', body: 'Inter' },
    borderRadius: '1rem', cardStyle: 'solid', backgroundPattern: 'noise',
  },
  {
    id: 'mauve-greenery',
    name: 'Mauve & Greenery',
    description: 'Dusty pink meets fresh greenery. Organic romantic.',
    occasions: ['wedding', 'engagement'],
    tags: ['organic', 'romantic', 'garden', 'spring', 'summer', 'soft'],
    season: 'spring',
    previewGradient: 'linear-gradient(135deg, #F7F2F4 0%, #B48A95 50%, #6A8F5A 100%)',
    colors: { background: '#F7F2F4', foreground: '#2A1A1E', accent: '#8A6070', accentLight: '#F0E0E5', muted: '#9A8890', cardBg: '#FFFFFF' },
    fonts: { heading: 'Cormorant Garamond', body: 'Poppins' },
    borderRadius: '1.5rem', cardStyle: 'glass', backgroundPattern: 'floral',
  },

  // ── DARK / MOODY ──

  {
    id: 'midnight-luxe',
    name: 'Midnight Luxe',
    description: 'Dark moody palette with gold accents. Evening glamour.',
    occasions: ['wedding', 'anniversary', 'birthday'],
    tags: ['dark', 'moody', 'gold', 'evening', 'glamorous', 'dramatic'],
    season: 'winter',
    previewGradient: 'linear-gradient(135deg, #0F0E0D 0%, #2D2618 50%, #C4A96A 100%)',
    colors: { background: '#0F0E0D', foreground: '#F5F0EA', accent: '#C4A96A', accentLight: '#2A2015', muted: '#7A7068', cardBg: '#1A1815' },
    fonts: { heading: 'Playfair Display', body: 'Inter' },
    borderRadius: '0.5rem', cardStyle: 'solid', backgroundPattern: 'noise',
  },
  {
    id: 'gothic-romance',
    name: 'Gothic Romance',
    description: 'Deep burgundy on black. Dark florals and candlelight mood.',
    occasions: ['wedding'],
    tags: ['gothic', 'dark', 'dramatic', 'fall', 'halloween', 'moody'],
    season: 'fall',
    previewGradient: 'linear-gradient(135deg, #0D0808 0%, #4A0E1E 50%, #8B1A3A 100%)',
    colors: { background: '#0D0808', foreground: '#F0E8E8', accent: '#8B1A3A', accentLight: '#2A1015', muted: '#7A6068', cardBg: '#1A1215' },
    fonts: { heading: 'Cormorant Garamond', body: 'Inter' },
    borderRadius: '0.25rem', cardStyle: 'bordered', backgroundPattern: 'none',
  },
  {
    id: 'celestial-night',
    name: 'Celestial Night',
    description: 'Deep indigo with silver and starlight. Under the stars.',
    occasions: ['wedding', 'engagement', 'anniversary'],
    tags: ['celestial', 'stars', 'night', 'dreamy', 'ethereal', 'winter'],
    season: 'winter',
    previewGradient: 'linear-gradient(135deg, #0D0B14 0%, #1E1A30 50%, #9B7FD9 100%)',
    colors: { background: '#0D0B14', foreground: '#F0EEFF', accent: '#9B7FD9', accentLight: '#1E1A30', muted: '#7A6EA0', cardBg: '#131020' },
    fonts: { heading: 'Cormorant Garamond', body: 'Inter' },
    borderRadius: '1rem', cardStyle: 'solid', backgroundPattern: 'dots',
  },

  // ── BIRTHDAY THEMES ──

  {
    id: 'confetti-pop',
    name: 'Confetti Pop',
    description: 'Bright and playful with confetti colors. Party vibes!',
    occasions: ['birthday'],
    tags: ['fun', 'colorful', 'party', 'playful', 'kids', 'celebration'],
    season: 'all-season',
    previewGradient: 'linear-gradient(135deg, #FFF8F0 0%, #FF6B8A 33%, #FFB347 66%, #4ECDC4 100%)',
    colors: { background: '#FFF8F0', foreground: '#2A1A1A', accent: '#FF6B8A', accentLight: '#FFE8EE', muted: '#8A7A7A', cardBg: '#FFFFFF' },
    fonts: { heading: 'Josefin Sans', body: 'Poppins' },
    borderRadius: '2rem', cardStyle: 'solid', backgroundPattern: 'dots',
  },
  {
    id: 'milestone-gold',
    name: 'Milestone Gold',
    description: 'Sophisticated gold for milestone birthdays (30th, 40th, 50th).',
    occasions: ['birthday', 'anniversary'],
    tags: ['milestone', 'gold', 'elegant', 'sophisticated', '30th', '40th', '50th'],
    season: 'all-season',
    previewGradient: 'linear-gradient(135deg, #1A1510 0%, #C4A96A 50%, #E8D5A8 100%)',
    colors: { background: '#1A1510', foreground: '#F5EAD6', accent: '#C4A96A', accentLight: '#2A2015', muted: '#8A7A60', cardBg: '#221E18' },
    fonts: { heading: 'Playfair Display', body: 'Raleway' },
    borderRadius: '0.5rem', cardStyle: 'shadow-heavy', backgroundPattern: 'noise',
  },
  {
    id: 'pastel-party',
    name: 'Pastel Party',
    description: 'Soft pastels for sweet celebrations. Sweet 16 to bridal showers.',
    occasions: ['birthday', 'engagement'],
    tags: ['pastel', 'sweet', 'soft', 'feminine', 'spring', 'party'],
    season: 'spring',
    previewGradient: 'linear-gradient(135deg, #FFF5F7 0%, #E8B4C0 50%, #B4D0E8 100%)',
    colors: { background: '#FFF5F7', foreground: '#2A1A20', accent: '#D4829A', accentLight: '#FCE8EF', muted: '#B0889A', cardBg: '#FFF9FA' },
    fonts: { heading: 'Playfair Display', body: 'Poppins' },
    borderRadius: '2rem', cardStyle: 'glass', backgroundPattern: 'floral',
  },

  // ── ANNIVERSARY ──

  {
    id: 'silver-anniversary',
    name: 'Silver Anniversary',
    description: 'Elegant silver and white for 25th anniversaries.',
    occasions: ['anniversary'],
    tags: ['silver', '25th', 'anniversary', 'elegant', 'milestone'],
    season: 'all-season',
    previewGradient: 'linear-gradient(135deg, #F5F5F5 0%, #C0C0C0 50%, #808080 100%)',
    colors: { background: '#F5F5F5', foreground: '#1A1A1A', accent: '#808080', accentLight: '#E8E8E8', muted: '#999999', cardBg: '#FFFFFF' },
    fonts: { heading: 'Libre Baskerville', body: 'Source Sans 3' },
    borderRadius: '0.75rem', cardStyle: 'bordered', backgroundPattern: 'none',
  },
  {
    id: 'golden-anniversary',
    name: 'Golden Anniversary',
    description: 'Rich gold for 50th anniversaries. A lifetime of love.',
    occasions: ['anniversary'],
    tags: ['gold', '50th', 'anniversary', 'elegant', 'milestone', 'luxury'],
    season: 'all-season',
    previewGradient: 'linear-gradient(135deg, #FAF5E8 0%, #C4A96A 50%, #8B7340 100%)',
    colors: { background: '#FAF5E8', foreground: '#2A2010', accent: '#8B7340', accentLight: '#F0E8D0', muted: '#8A7A60', cardBg: '#FFFFFF' },
    fonts: { heading: 'Playfair Display', body: 'Lora' },
    borderRadius: '1rem', cardStyle: 'solid', backgroundPattern: 'topography',
  },
];

/**
 * Apply a color theme to a manifest (visual identity only, not layout).
 */
export function applyColorTheme(theme: ColorTheme, manifest: import('@/types').StoryManifest): import('@/types').StoryManifest {
  return {
    ...manifest,
    theme: {
      ...manifest.theme,
      name: theme.id,
      colors: theme.colors,
      fonts: theme.fonts,
      borderRadius: theme.borderRadius,
      cardStyle: theme.cardStyle,
      backgroundPattern: theme.backgroundPattern,
    } as import('@/types').StoryManifest['theme'],
  };
}

/**
 * Get themes for a specific occasion.
 */
export function getThemesForOccasion(occasion: string): ColorTheme[] {
  return COLOR_THEMES.filter(t => t.occasions.includes(occasion));
}

/**
 * Get themes for a specific season.
 */
export function getThemesForSeason(season: ColorTheme['season']): ColorTheme[] {
  return COLOR_THEMES.filter(t => t.season === season || t.season === 'all-season');
}

/**
 * Search themes by keyword.
 */
export function searchColorThemes(query: string): ColorTheme[] {
  const q = query.toLowerCase().trim();
  if (!q) return COLOR_THEMES;
  return COLOR_THEMES.filter(t =>
    t.name.toLowerCase().includes(q) ||
    t.description.toLowerCase().includes(q) ||
    t.tags.some(tag => tag.includes(q))
  );
}
