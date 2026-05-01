// ─────────────────────────────────────────────────────────────
// Pearloom / lib/intelligence/dynamic-design.ts
// Dynamic layout generation + vibe-matched font catalog.
// AI picks the best layout per chapter and font per vibe.
// User can swap ANY decision.
//
// This is what makes every site look DIFFERENT, not just
// different colors on the same template.
// ─────────────────────────────────────────────────────────────

import type { Chapter } from '@/types';

// ── Dynamic Layout Selection ─────────────────────────────────

export interface LayoutDecision {
  chapterId: string;
  /** The AI-selected layout */
  selectedLayout: string;
  /** Why this layout was chosen */
  reason: string;
  /** Alternative layouts the user can swap to */
  alternatives: Array<{ layout: string; reason: string }>;
}

/**
 * Select the best layout for each chapter based on its content.
 * This is what makes every site structurally unique.
 */
export function selectChapterLayouts(chapters: Chapter[]): LayoutDecision[] {
  return chapters.map((chapter, i) => {
    const photoCount = chapter.images?.length || 0;
    const descLength = (chapter.description || '').split(' ').length;
    const intensity = chapter.emotionalIntensity || 5;
    const isFirst = i === 0;
    const isLast = i === chapters.length - 1;
    const isPeak = chapter.isEmotionalPeak;

    // Decision logic based on content analysis
    let selected: string;
    let reason: string;

    if (isPeak || intensity >= 8) {
      selected = 'cinematic';
      reason = 'High emotional intensity — cinematic full-bleed creates impact';
    } else if (photoCount >= 4) {
      selected = 'gallery';
      reason = `${photoCount} photos — gallery grid showcases them all`;
    } else if (photoCount >= 3) {
      selected = 'mosaic';
      reason = 'Multiple photos — mosaic creates visual interest';
    } else if (photoCount === 1 && descLength > 40) {
      selected = 'split';
      reason = 'One strong photo + long text — split layout balances both';
    } else if (photoCount === 1 && descLength <= 20) {
      selected = 'fullbleed';
      reason = 'One photo, short text — let the photo speak';
    } else if (isFirst) {
      selected = 'editorial';
      reason = 'Opening chapter — editorial sets the tone';
    } else if (isLast) {
      selected = 'cinematic';
      reason = 'Closing chapter — cinematic creates a memorable ending';
    } else if (descLength > 60) {
      selected = 'editorial';
      reason = 'Rich narrative — editorial format for readability';
    } else {
      selected = i % 2 === 0 ? 'editorial' : 'split';
      reason = 'Alternating layout for visual rhythm';
    }

    // Generate alternatives
    const allLayouts = ['editorial', 'fullbleed', 'split', 'cinematic', 'gallery', 'mosaic'];
    const alternatives = allLayouts
      .filter(l => l !== selected)
      .map(layout => ({
        layout,
        reason: getLayoutDescription(layout),
      }));

    return {
      chapterId: chapter.id,
      selectedLayout: selected,
      reason,
      alternatives,
    };
  });
}

function getLayoutDescription(layout: string): string {
  const descriptions: Record<string, string> = {
    editorial: 'Clean text-focused layout with sidebar photo',
    fullbleed: 'Photo fills the entire width, text overlaid',
    split: 'Half photo, half text side by side',
    cinematic: 'Dramatic full-width with parallax effect',
    gallery: 'Multi-photo grid with captions',
    mosaic: 'Asymmetric photo collage',
  };
  return descriptions[layout] || layout;
}

// ── Expanded Font Catalog ────────────────────────────────────

export interface FontPairing {
  id: string;
  heading: string;
  body: string;
  /** Vibe words this pairing matches */
  vibeMatch: string[];
  /** Occasions this works for */
  occasions: string[];
  /** Category for browsing */
  category: 'serif-classic' | 'serif-modern' | 'sans-clean' | 'sans-editorial' | 'display' | 'handwritten' | 'mixed';
  /** Mood tag */
  mood: string;
  /** Preview text */
  previewText: string;
  /** Quality score from usage data */
  score: number;
}

export const FONT_CATALOG: FontPairing[] = [
  // ── Serif Classic ──
  { id: 'playfair-lora', heading: 'Playfair Display', body: 'Lora', vibeMatch: ['romantic', 'classic', 'elegant', 'warm'], occasions: ['wedding', 'anniversary'], category: 'serif-classic', mood: 'Timeless Romance', previewText: 'A Love Story', score: 9.2 },
  { id: 'cormorant-inter', heading: 'Cormorant Garamond', body: 'Inter', vibeMatch: ['botanical', 'organic', 'garden', 'soft'], occasions: ['wedding', 'engagement'], category: 'serif-classic', mood: 'Botanical Elegance', previewText: 'Garden Dreams', score: 8.8 },
  { id: 'libre-source', heading: 'Libre Baskerville', body: 'Source Sans 3', vibeMatch: ['classic', 'nautical', 'traditional'], occasions: ['wedding', 'anniversary'], category: 'serif-classic', mood: 'Maritime Classic', previewText: 'Anchored in Love', score: 8.1 },
  { id: 'eb-garamond-source', heading: 'EB Garamond', body: 'Source Sans 3', vibeMatch: ['literary', 'intimate', 'poetic'], occasions: ['wedding', 'story'], category: 'serif-classic', mood: 'Literary & Intimate', previewText: 'Written in the Stars', score: 8.5 },
  { id: 'crimson-work', heading: 'Crimson Pro', body: 'Work Sans', vibeMatch: ['refined', 'understated', 'warm'], occasions: ['wedding', 'anniversary'], category: 'serif-classic', mood: 'Quiet Refinement', previewText: 'Simply Us', score: 7.9 },

  // ── Serif Modern ──
  { id: 'dm-serif-dm-sans', heading: 'DM Serif Display', body: 'DM Sans', vibeMatch: ['modern', 'minimal', 'clean', 'editorial'], occasions: ['wedding', 'birthday', 'engagement'], category: 'serif-modern', mood: 'Modern Editorial', previewText: 'New Chapter', score: 8.6 },
  { id: 'fraunces-inter', heading: 'Fraunces', body: 'Inter', vibeMatch: ['modern', 'bold', 'playful', 'warm'], occasions: ['birthday', 'wedding'], category: 'serif-modern', mood: 'Bold & Warm', previewText: 'Let\'s Celebrate', score: 8.0 },
  { id: 'newsreader-inter', heading: 'Newsreader', body: 'Inter', vibeMatch: ['editorial', 'sophisticated', 'magazine'], occasions: ['wedding', 'engagement'], category: 'serif-modern', mood: 'Magazine Editorial', previewText: 'Cover Story', score: 7.8 },

  // ── Sans Clean ──
  { id: 'inter-inter', heading: 'Inter', body: 'Inter', vibeMatch: ['minimal', 'clean', 'modern', 'tech'], occasions: ['birthday', 'engagement', 'story'], category: 'sans-clean', mood: 'Ultra Clean', previewText: 'Pure & Simple', score: 7.5 },
  { id: 'outfit-inter', heading: 'Outfit', body: 'Inter', vibeMatch: ['modern', 'geometric', 'fresh'], occasions: ['birthday', 'engagement'], category: 'sans-clean', mood: 'Fresh & Geometric', previewText: 'New Beginnings', score: 7.3 },
  { id: 'plus-jakarta-inter', heading: 'Plus Jakarta Sans', body: 'Inter', vibeMatch: ['modern', 'clean', 'friendly'], occasions: ['birthday', 'engagement', 'story'], category: 'sans-clean', mood: 'Friendly Modern', previewText: 'Together', score: 7.4 },

  // ── Sans Editorial ──
  { id: 'josefin-lato', heading: 'Josefin Sans', body: 'Lato', vibeMatch: ['rustic', 'earthy', 'boho', 'handcrafted'], occasions: ['wedding', 'engagement'], category: 'sans-editorial', mood: 'Rustic Charm', previewText: 'Down the Aisle', score: 8.3 },
  { id: 'montserrat-open', heading: 'Montserrat', body: 'Open Sans', vibeMatch: ['modern', 'bold', 'urban'], occasions: ['birthday', 'engagement'], category: 'sans-editorial', mood: 'Urban Bold', previewText: 'City Love', score: 7.6 },
  { id: 'raleway-lora', heading: 'Raleway', body: 'Lora', vibeMatch: ['elegant', 'airy', 'delicate'], occasions: ['wedding', 'engagement'], category: 'sans-editorial', mood: 'Airy Elegance', previewText: 'Floating Away', score: 8.0 },

  // ── Display ──
  { id: 'bodoni-work', heading: 'Bodoni Moda', body: 'Work Sans', vibeMatch: ['glamorous', 'luxury', 'fashion', 'bold'], occasions: ['wedding', 'anniversary'], category: 'display', mood: 'High Fashion', previewText: 'Vogue Moment', score: 7.8 },
  { id: 'yeseva-poppins', heading: 'Yeseva One', body: 'Poppins', vibeMatch: ['elegant', 'decorative', 'vintage'], occasions: ['wedding'], category: 'display', mood: 'Ornate Vintage', previewText: 'Gilded Age', score: 7.2 },

  // ── Handwritten ──
  { id: 'great-vibes-mont', heading: 'Great Vibes', body: 'Montserrat', vibeMatch: ['romantic', 'flowing', 'whimsical'], occasions: ['wedding', 'engagement'], category: 'handwritten', mood: 'Flowing Script', previewText: 'With All My Love', score: 7.6 },
  { id: 'mrs-saint-josefin', heading: 'Mrs Saint Delafield', body: 'Josefin Sans', vibeMatch: ['romantic', 'script', 'formal'], occasions: ['wedding'], category: 'handwritten', mood: 'Formal Script', previewText: 'Save the Date', score: 7.0 },
  { id: 'tangerine-open', heading: 'Tangerine', body: 'Open Sans', vibeMatch: ['romantic', 'airy', 'light'], occasions: ['wedding', 'engagement'], category: 'handwritten', mood: 'Airy & Romantic', previewText: 'Forever Yours', score: 7.3 },
  { id: 'dancing-lato', heading: 'Dancing Script', body: 'Lato', vibeMatch: ['casual', 'fun', 'playful'], occasions: ['birthday', 'engagement'], category: 'handwritten', mood: 'Playful Casual', previewText: 'Party Time', score: 6.8 },
  { id: 'sacramento-work', heading: 'Sacramento', body: 'Work Sans', vibeMatch: ['elegant', 'flowing', 'graceful'], occasions: ['wedding', 'anniversary'], category: 'handwritten', mood: 'Graceful Flow', previewText: 'Our Day', score: 7.4 },

  // ── Mixed ──
  { id: 'playfair-poppins', heading: 'Playfair Display', body: 'Poppins', vibeMatch: ['romantic', 'modern', 'contrast'], occasions: ['wedding', 'birthday'], category: 'mixed', mood: 'Classic Meets Modern', previewText: 'Best of Both', score: 8.4 },
  { id: 'cormorant-poppins', heading: 'Cormorant Garamond', body: 'Poppins', vibeMatch: ['organic', 'romantic', 'soft'], occasions: ['wedding', 'engagement'], category: 'mixed', mood: 'Organic Romance', previewText: 'Soft & Strong', score: 8.2 },
  { id: 'playfair-raleway', heading: 'Playfair Display', body: 'Raleway', vibeMatch: ['timeless', 'elegant', 'romantic'], occasions: ['wedding', 'anniversary'], category: 'mixed', mood: 'Timeless Elegance', previewText: 'Two Hearts', score: 8.9 },
  { id: 'cormorant-raleway', heading: 'Cormorant Garamond', body: 'Raleway', vibeMatch: ['dreamy', 'soft', 'romantic'], occasions: ['wedding', 'engagement'], category: 'mixed', mood: 'Dreamy & Soft', previewText: 'Misty Morning', score: 8.1 },
];

/**
 * Select the best font pairing for a vibe and occasion.
 * AI picks the top match, user sees ranked alternatives.
 */
export function selectFontPairing(
  vibeWords: string[],
  occasion: string,
): { selected: FontPairing; alternatives: FontPairing[] } {
  const scored = FONT_CATALOG.map(font => {
    let matchScore = font.score;

    // Vibe word overlap
    const vibeOverlap = font.vibeMatch.filter(v =>
      vibeWords.some(w => w.includes(v) || v.includes(w))
    ).length;
    matchScore += vibeOverlap * 5;

    // Occasion match
    if (font.occasions.includes(occasion)) matchScore += 3;

    return { font, matchScore };
  });

  scored.sort((a, b) => b.matchScore - a.matchScore);

  return {
    selected: scored[0].font,
    alternatives: scored.slice(1, 8).map(s => s.font),
  };
}

/**
 * Get all fonts in a category for browsing.
 */
export function getFontsByCategory(category: FontPairing['category']): FontPairing[] {
  return FONT_CATALOG.filter(f => f.category === category).sort((a, b) => b.score - a.score);
}

/**
 * Search fonts by keyword.
 */
export function searchFonts(query: string): FontPairing[] {
  const q = query.toLowerCase();
  return FONT_CATALOG.filter(f =>
    f.heading.toLowerCase().includes(q) ||
    f.body.toLowerCase().includes(q) ||
    f.mood.toLowerCase().includes(q) ||
    f.vibeMatch.some(v => v.includes(q))
  ).sort((a, b) => b.score - a.score);
}

// ── AI Custom CSS Generation ─────────────────────────────────

export interface SiteStyleSheet {
  /** Unique CSS custom properties */
  customProperties: Record<string, string>;
  /** Custom spacing rhythm */
  spacing: {
    sectionPaddingY: string;
    sectionPaddingX: string;
    cardPadding: string;
    elementGap: string;
  };
  /** Custom animation timings */
  animations: {
    entranceDuration: string;
    entranceEase: string;
    hoverScale: string;
    scrollRevealDistance: string;
  };
  /** Custom decorative elements */
  decorative: {
    /** SVG divider between sections */
    sectionDividerSvg: string;
    /** Corner ornament SVG for cards */
    cornerOrnamentSvg: string;
    /** Accent symbol used throughout */
    accentSymbol: string;
    /** Background pattern CSS */
    backgroundPatternCss: string;
  };
}

/**
 * Generate a unique stylesheet for a site based on its vibe.
 * This is what makes every Pearloom site look structurally different.
 */
export function generateUniqueStyleSheet(
  vibeWords: string[],
  occasion: string,
  palette: { accent: string; background: string },
): SiteStyleSheet {
  // Determine vibe character
  const isMinimal = vibeWords.some(w => ['minimal', 'clean', 'modern', 'simple'].includes(w));
  const isOrganic = vibeWords.some(w => ['organic', 'botanical', 'natural', 'garden'].includes(w));
  const isDramatic = vibeWords.some(w => ['dramatic', 'moody', 'dark', 'bold'].includes(w));
  const isPlayful = vibeWords.some(w => ['playful', 'fun', 'colorful', 'party'].includes(w));
  const isElegant = vibeWords.some(w => ['elegant', 'luxury', 'glamorous', 'refined'].includes(w));

  // Spacing rhythm — varies by vibe
  const spacing = {
    sectionPaddingY: isMinimal ? 'clamp(2rem,4vw,4rem)' : isDramatic ? 'clamp(4rem,8vw,8rem)' : 'clamp(3rem,6vw,6rem)',
    sectionPaddingX: isMinimal ? '2rem' : 'clamp(1.5rem,4vw,3rem)',
    cardPadding: isMinimal ? '1rem' : isElegant ? '2rem' : '1.5rem',
    elementGap: isMinimal ? '0.5rem' : isOrganic ? '1.5rem' : '1rem',
  };

  // Animation timings — varies by vibe
  const animations = {
    entranceDuration: isMinimal ? '0.3s' : isDramatic ? '0.8s' : '0.5s',
    entranceEase: isDramatic ? 'cubic-bezier(0.22, 1, 0.36, 1)' : 'ease',
    hoverScale: isMinimal ? '1.01' : isPlayful ? '1.04' : '1.02',
    scrollRevealDistance: isMinimal ? '12px' : isDramatic ? '40px' : '24px',
  };

  // Decorative elements — unique per vibe
  const accentSymbol = isOrganic ? '❀' : isDramatic ? '✦' : isPlayful ? '✿' : isElegant ? '◆' : '·';

  // Background pattern — unique per vibe
  let backgroundPatternCss = '';
  if (isOrganic) {
    backgroundPatternCss = `radial-gradient(ellipse at 20% 50%, ${palette.accent}08 0%, transparent 50%), radial-gradient(ellipse at 80% 30%, ${palette.accent}05 0%, transparent 40%)`;
  } else if (isDramatic) {
    backgroundPatternCss = `radial-gradient(circle at 50% 0%, ${palette.accent}06 0%, transparent 50%)`;
  } else if (isMinimal) {
    backgroundPatternCss = '';
  } else if (isPlayful) {
    backgroundPatternCss = `radial-gradient(circle, ${palette.accent}06 1px, transparent 1px)`;
  }

  return {
    customProperties: {
      '--site-entrance-duration': animations.entranceDuration,
      '--site-entrance-ease': animations.entranceEase,
      '--site-hover-scale': animations.hoverScale,
      '--site-section-py': spacing.sectionPaddingY,
      '--site-section-px': spacing.sectionPaddingX,
      '--site-card-padding': spacing.cardPadding,
      '--site-gap': spacing.elementGap,
      '--site-accent-symbol': `"${accentSymbol}"`,
    },
    spacing,
    animations,
    decorative: {
      sectionDividerSvg: generateDividerForVibe(vibeWords),
      cornerOrnamentSvg: isElegant ? generateCornerOrnament(palette.accent) : '',
      accentSymbol,
      backgroundPatternCss,
    },
  };
}

function generateDividerForVibe(vibeWords: string[]): string {
  if (vibeWords.some(w => ['organic', 'botanical'].includes(w))) {
    return '<svg viewBox="0 0 1200 60"><path d="M0,30 Q300,0 600,30 Q900,60 1200,30 L1200,0 L0,0 Z" fill="currentColor" opacity="0.04"/></svg>';
  }
  if (vibeWords.some(w => ['dramatic', 'moody'].includes(w))) {
    return '<svg viewBox="0 0 1200 60"><path d="M0,60 L1200,0 L1200,0 L0,0 Z" fill="currentColor" opacity="0.03"/></svg>';
  }
  if (vibeWords.some(w => ['minimal', 'clean'].includes(w))) {
    return '<svg viewBox="0 0 1200 2"><line x1="400" y1="1" x2="800" y2="1" stroke="currentColor" stroke-width="0.5" opacity="0.15"/></svg>';
  }
  return '<svg viewBox="0 0 1200 40"><path d="M0,20 C200,40 400,0 600,20 C800,40 1000,0 1200,20 L1200,0 L0,0 Z" fill="currentColor" opacity="0.03"/></svg>';
}

function generateCornerOrnament(accentColor: string): string {
  return `<svg viewBox="0 0 40 40"><path d="M0,0 L40,0 L40,2 L2,2 L2,40 L0,40 Z" fill="${accentColor}" opacity="0.3"/></svg>`;
}
