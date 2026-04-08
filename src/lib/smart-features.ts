// ─────────────────────────────────────────────────────────────
// Pearloom / lib/smart-features.ts
// Automatic intelligence utilities:
//   • Smart font scaling for long names
//   • Photo brightness → text color
//   • Section ordering by date awareness
//   • Typography pairing validation
//   • Content completeness scoring
// ─────────────────────────────────────────────────────────────

import { hexToHsl, hexToRgb, contrastRatio } from './color-utils';

// ── 1. Smart Font Size Scaling ───────────────────────────────

/**
 * Returns a CSS clamp() font-size that scales down for long names
 * and scales up for short, dramatic names.
 *
 * @param name   — the display name (e.g. "Alexandria")
 * @param minRem — minimum font size in rem (default 2.5)
 * @param maxRem — maximum font size in rem (default 10)
 */
export function smartNameFontSize(
  name: string,
  minRem = 2.5,
  maxRem = 10,
): string {
  const len = name.trim().length;

  // Short names (≤5 chars): go big and dramatic
  // Medium names (6-10): standard cinematic sizing
  // Long names (11-15): scale down gracefully
  // Very long (16+): compact but still elegant
  let scale: number;
  if (len <= 5)       scale = 1.0;
  else if (len <= 8)  scale = 0.9;
  else if (len <= 10) scale = 0.8;
  else if (len <= 13) scale = 0.65;
  else if (len <= 16) scale = 0.55;
  else                scale = 0.45;

  const scaledMax = maxRem * scale;
  const vw = Math.round(12 * scale);
  const effectiveMin = Math.max(minRem, scaledMax * 0.4);

  return `clamp(${effectiveMin}rem, ${vw}vw, ${scaledMax}rem)`;
}

// ── 2. Photo Brightness Detection ────────────────────────────

/**
 * Analyze a loaded image element's average brightness (0-255).
 * Uses a small canvas sample for performance.
 * Returns null if image can't be analyzed (CORS, not loaded, etc.)
 */
export function getImageBrightness(img: HTMLImageElement): number | null {
  try {
    const canvas = document.createElement('canvas');
    // Sample at low resolution for speed
    const sampleSize = 64;
    canvas.width = sampleSize;
    canvas.height = sampleSize;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
    const data = ctx.getImageData(0, 0, sampleSize, sampleSize).data;

    let totalBrightness = 0;
    const pixelCount = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      // Perceived brightness formula (ITU-R BT.709)
      totalBrightness += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    }

    return totalBrightness / pixelCount;
  } catch {
    return null;
  }
}

/**
 * Returns 'light' or 'dark' text recommendation based on background brightness.
 * - Dark background (< 128) → 'light' text (white)
 * - Light background (≥ 128) → 'dark' text (dark ink)
 */
export function textColorForBrightness(brightness: number): 'light' | 'dark' {
  return brightness < 128 ? 'light' : 'dark';
}

/**
 * Given a background hex color, returns the optimal hero text colors.
 * Works for solid-color backgrounds (gradient/photo needs getImageBrightness).
 */
export function heroTextColors(bgHex: string): {
  primary: string;
  secondary: string;
  muted: string;
} {
  const rgb = hexToRgb(bgHex);
  if (!rgb) return { primary: '#1C1C1C', secondary: '#4A4A4A', muted: '#9A9488' };

  const brightness = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  if (brightness < 128) {
    return {
      primary: '#FFFFFF',
      secondary: 'rgba(255,255,255,0.75)',
      muted: 'rgba(255,255,255,0.5)',
    };
  }
  return {
    primary: '#1C1C1C',
    secondary: '#4A4A4A',
    muted: '#9A9488',
  };
}

// ── 3. Smart Section Ordering ────────────────────────────────

export interface SmartOrderResult {
  type: string;
  reason?: string;
}

/**
 * Given the current blocks and date context, returns a recommended
 * reordering with reasons. Does NOT mutate the input.
 *
 * Rules:
 * - Hero always first
 * - If RSVP deadline is within 14 days, promote RSVP after events
 * - If wedding date has passed, demote countdown and RSVP
 * - Footer always last
 */
export function smartBlockOrder(
  blocks: Array<{ type: string; id: string }>,
  weddingDate?: string | null,
  rsvpDeadline?: string | null,
): { reordered: typeof blocks; changes: SmartOrderResult[] } {
  const now = new Date();
  const changes: SmartOrderResult[] = [];
  let ordered = [...blocks];

  const wDate = weddingDate ? new Date(weddingDate) : null;
  const rDate = rsvpDeadline ? new Date(rsvpDeadline) : null;
  const weddingPassed = wDate && wDate < now;
  const rsvpSoon = rDate && !weddingPassed && rDate.getTime() - now.getTime() < 14 * 86400000 && rDate > now;

  // Hero always first
  const heroIdx = ordered.findIndex(b => b.type === 'hero');
  if (heroIdx > 0) {
    const [hero] = ordered.splice(heroIdx, 1);
    ordered.unshift(hero);
    changes.push({ type: 'hero', reason: 'Hero pinned to top' });
  }

  // Footer always last
  const footerIdx = ordered.findIndex(b => b.type === 'footer');
  if (footerIdx >= 0 && footerIdx < ordered.length - 1) {
    const [footer] = ordered.splice(footerIdx, 1);
    ordered.push(footer);
    changes.push({ type: 'footer', reason: 'Footer pinned to bottom' });
  }

  // Wedding date passed → demote countdown and RSVP to near bottom
  if (weddingPassed) {
    const demoteTypes = ['countdown', 'rsvp'];
    for (const type of demoteTypes) {
      const idx = ordered.findIndex(b => b.type === type);
      if (idx >= 0) {
        const [block] = ordered.splice(idx, 1);
        // Insert before footer if present, else at end
        const footerPos = ordered.findIndex(b => b.type === 'footer');
        if (footerPos >= 0) {
          ordered.splice(footerPos, 0, block);
        } else {
          ordered.push(block);
        }
        changes.push({ type, reason: `${type} demoted — wedding date has passed` });
      }
    }
  }

  // RSVP deadline approaching → promote RSVP right after events
  if (rsvpSoon) {
    const rsvpIdx = ordered.findIndex(b => b.type === 'rsvp');
    if (rsvpIdx >= 0) {
      const eventIdx = ordered.findIndex(b => b.type === 'event');
      const targetIdx = eventIdx >= 0 ? eventIdx + 1 : 2; // after events, or position 2
      if (rsvpIdx > targetIdx) {
        const [rsvp] = ordered.splice(rsvpIdx, 1);
        ordered.splice(targetIdx, 0, rsvp);
        changes.push({ type: 'rsvp', reason: 'RSVP promoted — deadline approaching' });
      }
    }
  }

  return { reordered: ordered, changes };
}

// ── 4. Color Temperature from Hex ────────────────────────────

/**
 * Estimates the color temperature of a hex color.
 * Returns a value from -1 (very cool/blue) to +1 (very warm/amber).
 */
export function colorTemperature(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r, , b] = rgb;
  // Simple warm/cool: more red = warm, more blue = cool
  const warmth = (r - b) / 255;
  return Math.max(-1, Math.min(1, warmth));
}

/**
 * Given dominant colors from photos, returns a temperature-matched
 * palette suggestion: whether to nudge the palette warmer or cooler.
 */
export function temperatureAdvice(photoColors: string[]): {
  avgTemp: number;
  suggestion: 'warm' | 'cool' | 'neutral';
  description: string;
} {
  if (!photoColors.length) return { avgTemp: 0, suggestion: 'neutral', description: 'No photos to analyze' };

  const temps = photoColors.map(colorTemperature);
  const avg = temps.reduce((a, b) => a + b, 0) / temps.length;

  if (avg > 0.15) {
    return {
      avgTemp: avg,
      suggestion: 'warm',
      description: 'Your photos have warm tones — golden hour, candlelight, or amber hues. A warm palette will complement them beautifully.',
    };
  }
  if (avg < -0.15) {
    return {
      avgTemp: avg,
      suggestion: 'cool',
      description: 'Your photos lean cool — blue hour, ocean tones, or silver light. A cool-toned palette will feel cohesive.',
    };
  }
  return {
    avgTemp: avg,
    suggestion: 'neutral',
    description: 'Your photos have a balanced color temperature. Any palette tone will work well.',
  };
}

// ── 5. Typography Pairing Validation ─────────────────────────

export interface TypographyIssue {
  severity: 'error' | 'warn' | 'ok';
  title: string;
  detail: string;
  suggestion?: string;
}

// Known thin/display fonts that are hard to read at small sizes
const THIN_DISPLAY_FONTS = new Set([
  'Playfair Display', 'Cormorant Garamond', 'Cinzel', 'Forum',
  'Great Vibes', 'Sacramento', 'Dancing Script', 'Allura',
  'Pinyon Script', 'Alex Brush', 'Tangerine', 'Parisienne',
]);

// Known highly readable body fonts
const READABLE_BODY_FONTS = new Set([
  'Inter', 'Source Sans Pro', 'Lato', 'Open Sans', 'Roboto',
  'Nunito', 'Raleway', 'Work Sans', 'DM Sans', 'Outfit',
  'Poppins', 'Mulish', 'Figtree', 'Geist',
]);

/**
 * Validate a heading + body font pair for readability issues.
 */
export function validateTypography(
  headingFont: string,
  bodyFont: string,
): TypographyIssue[] {
  const issues: TypographyIssue[] = [];

  // Both fonts are thin/display — body text will be hard to read
  if (THIN_DISPLAY_FONTS.has(headingFont) && THIN_DISPLAY_FONTS.has(bodyFont)) {
    issues.push({
      severity: 'error',
      title: 'Both fonts are decorative',
      detail: `"${headingFont}" and "${bodyFont}" are both display/script fonts. Body text at small sizes will be hard to read on mobile.`,
      suggestion: 'Swap the body font for a clean sans-serif like Inter, Lato, or DM Sans.',
    });
  }

  // Body font is a script/display font (even if heading is fine)
  if (THIN_DISPLAY_FONTS.has(bodyFont) && !THIN_DISPLAY_FONTS.has(headingFont)) {
    issues.push({
      severity: 'warn',
      title: 'Script font for body text',
      detail: `"${bodyFont}" is a decorative font — paragraphs and captions may be hard to read at 14-16px.`,
      suggestion: `Keep "${headingFont}" for headings but pair it with a readable body font like Inter or Lato.`,
    });
  }

  // Same font for heading and body — lacks visual hierarchy
  if (headingFont === bodyFont) {
    issues.push({
      severity: 'warn',
      title: 'No typographic contrast',
      detail: `Using "${headingFont}" for both headings and body. The page may feel flat without font contrast.`,
      suggestion: 'Try pairing a serif heading with a sans-serif body, or vice versa.',
    });
  }

  if (!issues.length) {
    issues.push({
      severity: 'ok',
      title: 'Good font pairing',
      detail: `"${headingFont}" + "${bodyFont}" provides clear visual hierarchy and readability.`,
    });
  }

  return issues;
}

// ── 6. Content Completeness Nudges ───────────────────────────

export interface ContentNudge {
  id: string;
  section: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  aiPrompt?: string; // prompt hint for AI content generation
}

/**
 * Analyze a manifest and return contextual nudges for empty/incomplete sections.
 * Returns nudges sorted by priority (high → low).
 */
export function detectContentNudges(manifest: {
  chapters?: Array<{ title?: string; body?: string; images?: unknown[] }>;
  events?: Array<{ date?: string; time?: string; venue?: string }>;
  logistics?: { date?: string; rsvpDeadline?: string; venue?: string; venueAddress?: string };
  registry?: { entries?: unknown[]; cashFundUrl?: string };
  travelInfo?: { hotels?: unknown[]; airports?: unknown[] };
  faqs?: unknown[];
  weddingParty?: unknown[];
  occasion?: string;
}): ContentNudge[] {
  const nudges: ContentNudge[] = [];
  const occ = manifest.occasion || 'wedding';

  // No chapters or all chapters empty
  const chapters = manifest.chapters || [];
  if (chapters.length === 0) {
    nudges.push({
      id: 'no-chapters', section: 'story', priority: 'high',
      title: 'Your story is empty',
      description: 'Add chapters to tell your love story — guests want to know how you met!',
      aiPrompt: `Generate 3 romantic story chapters for a ${occ}`,
    });
  } else if (chapters.length < 3) {
    nudges.push({
      id: 'few-chapters', section: 'story', priority: 'medium',
      title: `Only ${chapters.length} chapter${chapters.length === 1 ? '' : 's'}`,
      description: 'Most couples share 3-5 chapters. Add more milestones to make your story shine.',
      aiPrompt: `Suggest ${3 - chapters.length} more chapter ideas for a ${occ} story`,
    });
  }

  // Chapters without photos
  const noPhotoChapters = chapters.filter(c => !c.images?.length);
  if (noPhotoChapters.length > 0 && chapters.length > 0) {
    nudges.push({
      id: 'chapters-no-photos', section: 'story', priority: 'medium',
      title: `${noPhotoChapters.length} chapter${noPhotoChapters.length === 1 ? '' : 's'} without photos`,
      description: 'Photos make your story come alive. Add images to make each chapter memorable.',
    });
  }

  // No events
  if (!manifest.events?.length) {
    nudges.push({
      id: 'no-events', section: 'events', priority: 'high',
      title: 'No event details',
      description: 'Guests need to know when and where! Add your ceremony and reception details.',
    });
  } else {
    // Events without times
    const noTime = manifest.events.filter(e => !e.time);
    if (noTime.length > 0) {
      nudges.push({
        id: 'events-no-time', section: 'events', priority: 'medium',
        title: `${noTime.length} event${noTime.length === 1 ? '' : 's'} missing time`,
        description: 'Add start times so guests can plan their day.',
      });
    }
    // Events without venue
    const noVenue = manifest.events.filter(e => !e.venue);
    if (noVenue.length > 0) {
      nudges.push({
        id: 'events-no-venue', section: 'events', priority: 'medium',
        title: `${noVenue.length} event${noVenue.length === 1 ? '' : 's'} missing venue`,
        description: 'Add venue names and addresses so guests know where to go.',
      });
    }
  }

  // No RSVP deadline
  if (!manifest.logistics?.rsvpDeadline && manifest.events?.length) {
    nudges.push({
      id: 'no-rsvp-deadline', section: 'details', priority: 'high',
      title: 'No RSVP deadline set',
      description: 'Set a deadline so you can finalize headcount with your vendors.',
    });
  }

  // No registry
  if (!manifest.registry?.entries?.length && !manifest.registry?.cashFundUrl) {
    nudges.push({
      id: 'no-registry', section: 'details', priority: 'low',
      title: 'No registry links',
      description: 'Add registry links or a honeymoon fund so guests know how to celebrate you.',
    });
  }

  // No travel info
  if (!manifest.travelInfo?.hotels?.length && !manifest.travelInfo?.airports?.length) {
    nudges.push({
      id: 'no-travel', section: 'details', priority: 'low',
      title: 'No travel info',
      description: 'Help out-of-town guests by adding hotel blocks and airport details.',
    });
  }

  // No FAQs
  if (!manifest.faqs?.length) {
    nudges.push({
      id: 'no-faqs', section: 'details', priority: 'low',
      title: 'No FAQ section',
      description: 'Common questions like dress code, parking, and kids policy save you from repetitive texts.',
      aiPrompt: `Generate 5 common FAQ items for a ${occ} at ${manifest.logistics?.venue || 'a venue'}`,
    });
  }

  // No wedding party (for weddings/engagements)
  if ((occ === 'wedding' || occ === 'engagement') && !manifest.weddingParty?.length) {
    nudges.push({
      id: 'no-wedding-party', section: 'story', priority: 'low',
      title: 'No wedding party listed',
      description: 'Introduce your bridesmaids, groomsmen, and special people to your guests.',
    });
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return nudges.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

// ══════════════════════════════════════════════════════════════
// DESIGN INTELLIGENCE FEATURES
// ══════════════════════════════════════════════════════════════

// ── 7. Smart Layout Suggestions ──────────────────────────────

type ChapterLayout = 'editorial' | 'fullbleed' | 'split' | 'cinematic' | 'gallery' | 'mosaic' | 'bento';

export interface LayoutSuggestion {
  chapterId: string;
  currentLayout?: string;
  suggestedLayout: ChapterLayout;
  reason: string;
}

/**
 * Suggest the best layout for each chapter based on photo count,
 * text length, and content characteristics.
 */
export function suggestChapterLayouts(chapters: Array<{
  id: string;
  layout?: string;
  images?: Array<{ url: string; width?: number; height?: number }>;
  description?: string;
  title?: string;
}>): LayoutSuggestion[] {
  const suggestions: LayoutSuggestion[] = [];
  for (const ch of chapters) {
    const photoCount = ch.images?.length || 0;
    const textLen = (ch.description || '').length;
    const hasLandscape = ch.images?.some(img => (img.width || 0) > (img.height || 0));
    const hasPortrait = ch.images?.some(img => (img.height || 0) > (img.width || 0));

    let suggested: ChapterLayout;
    let reason: string;

    if (photoCount === 0) {
      suggested = 'editorial';
      reason = 'No photos — editorial layout lets the text shine';
    } else if (photoCount === 1 && hasLandscape) {
      suggested = 'fullbleed';
      reason = 'Single landscape photo — fullbleed makes it cinematic';
    } else if (photoCount === 1 && hasPortrait) {
      suggested = 'split';
      reason = 'Single portrait photo — split layout balances text and image';
    } else if (photoCount === 1) {
      suggested = textLen > 200 ? 'split' : 'cinematic';
      reason = textLen > 200 ? 'Long text + one photo — split keeps both readable' : 'Short text + one photo — cinematic for impact';
    } else if (photoCount >= 2 && photoCount <= 3) {
      suggested = 'cinematic';
      reason = `${photoCount} photos — cinematic creates a film-strip feel`;
    } else if (photoCount >= 4 && photoCount <= 6) {
      suggested = 'gallery';
      reason = `${photoCount} photos — gallery grid shows them all beautifully`;
    } else {
      suggested = 'mosaic';
      reason = `${photoCount} photos — mosaic creates a dynamic collage`;
    }

    if (ch.layout !== suggested) {
      suggestions.push({ chapterId: ch.id, currentLayout: ch.layout, suggestedLayout: suggested, reason });
    }
  }
  return suggestions;
}

// ── 8. Section Spacing Intelligence ──────────────────────────

export interface SpacingSuggestion {
  blockId: string;
  blockType: string;
  currentPadding?: string;
  suggestedPadding: string;
  reason: string;
}

/**
 * Suggest optimal vertical padding per block based on content density.
 * Text-heavy blocks get compact spacing, photo blocks get spacious breathing room.
 */
export function suggestBlockSpacing(blocks: Array<{
  id: string;
  type: string;
  config?: Record<string, unknown>;
}>): SpacingSuggestion[] {
  const spacingMap: Record<string, { padding: string; reason: string }> = {
    hero:       { padding: '0',          reason: 'Hero is full-viewport — no extra padding needed' },
    story:      { padding: '3rem 2rem',  reason: 'Story chapters need moderate breathing room' },
    event:      { padding: '4rem 2rem',  reason: 'Event cards need space for scanning' },
    countdown:  { padding: '3rem 2rem',  reason: 'Countdown is compact — moderate padding' },
    rsvp:       { padding: '4rem 2rem',  reason: 'RSVP form needs comfortable spacing' },
    registry:   { padding: '4rem 2rem',  reason: 'Registry links need browse-friendly spacing' },
    travel:     { padding: '3rem 2rem',  reason: 'Travel info is reference content — moderate spacing' },
    faq:        { padding: '3rem 2rem',  reason: 'FAQ items are scannable — moderate spacing' },
    photos:     { padding: '5rem 2rem',  reason: 'Photo sections deserve spacious breathing room' },
    gallery:    { padding: '5rem 2rem',  reason: 'Gallery grids look best with generous spacing' },
    photoWall:  { padding: '5rem 2rem',  reason: 'Photo walls need space to breathe' },
    guestbook:  { padding: '4rem 2rem',  reason: 'Guestbook is interactive — comfortable spacing' },
    text:       { padding: '3rem 2rem',  reason: 'Text blocks are compact — tighter spacing' },
    quote:      { padding: '5rem 2rem',  reason: 'Quotes need whitespace for emphasis' },
    video:      { padding: '4rem 2rem',  reason: 'Video embeds need comfortable framing' },
    map:        { padding: '3rem 2rem',  reason: 'Maps are utility — moderate spacing' },
    divider:    { padding: '0',          reason: 'Dividers are self-spacing' },
    hashtag:    { padding: '3rem 2rem',  reason: 'Hashtags are quick-read — moderate spacing' },
    weddingParty: { padding: '4rem 2rem', reason: 'Party grid needs browse-friendly spacing' },
  };

  const results: SpacingSuggestion[] = [];
  for (const b of blocks) {
    const suggestion = spacingMap[b.type];
    if (!suggestion) continue;
    const current = b.config?.verticalPadding as string | undefined;
    if (current === suggestion.padding) continue;
    results.push({
      blockId: b.id, blockType: b.type,
      currentPadding: current,
      suggestedPadding: suggestion.padding,
      reason: suggestion.reason,
    });
  }
  return results;
}

// ── 9. Visual Rhythm Checker ─────────────────────────────────

export interface RhythmIssue {
  severity: 'warn' | 'tip';
  title: string;
  detail: string;
  suggestion?: string;
}

/** Content category for rhythm analysis */
function blockCategory(type: string): 'text' | 'visual' | 'interactive' | 'spacer' | 'other' {
  switch (type) {
    case 'text': case 'quote': case 'vibeQuote': case 'welcome': return 'text';
    case 'photos': case 'gallery': case 'photoWall': case 'video': case 'hero': return 'visual';
    case 'rsvp': case 'guestbook': case 'quiz': case 'map': return 'interactive';
    case 'divider': return 'spacer';
    default: return 'other';
  }
}

/**
 * Analyze the block sequence for visual rhythm issues:
 * monotony, missing breaks, jarring transitions.
 */
export function checkVisualRhythm(blocks: Array<{ type: string }>): RhythmIssue[] {
  const issues: RhythmIssue[] = [];
  if (blocks.length < 3) return issues;

  // Check for 3+ consecutive same-category blocks
  for (let i = 0; i < blocks.length - 2; i++) {
    const cat = blockCategory(blocks[i].type);
    if (cat === 'spacer' || cat === 'other') continue;
    if (blockCategory(blocks[i + 1].type) === cat && blockCategory(blocks[i + 2].type) === cat) {
      issues.push({
        severity: 'tip',
        title: `${cat === 'text' ? 'Text' : cat === 'visual' ? 'Photo' : 'Interactive'} section monotony`,
        detail: `3 ${cat} sections in a row (${blocks[i].type} → ${blocks[i+1].type} → ${blocks[i+2].type}). The page may feel repetitive.`,
        suggestion: `Insert a ${cat === 'text' ? 'photo or interactive' : 'text or quote'} section to break the rhythm.`,
      });
      break; // One warning is enough
    }
  }

  // Check for no dividers in a long page
  if (blocks.length > 6 && !blocks.some(b => b.type === 'divider')) {
    issues.push({
      severity: 'tip',
      title: 'No visual breaks',
      detail: `${blocks.length} sections with no dividers. The page may feel like an endless scroll.`,
      suggestion: 'Add wave dividers between major sections to create visual breathing room.',
    });
  }

  // Check for interactive sections buried at the bottom
  const interactiveIdx = blocks.findIndex(b => blockCategory(b.type) === 'interactive');
  if (interactiveIdx > blocks.length * 0.8 && blocks.length > 5) {
    issues.push({
      severity: 'tip',
      title: 'Interactive content buried',
      detail: `Your ${blocks[interactiveIdx].type} section is near the bottom. Many guests won't scroll that far.`,
      suggestion: 'Move interactive sections (RSVP, guestbook, quiz) to the middle third of the page.',
    });
  }

  return issues;
}

// ── 10. Smart Font Size Hierarchy ────────────────────────────

export type TypeScale = 'minor-third' | 'major-third' | 'perfect-fourth' | 'golden-ratio';

const SCALE_RATIOS: Record<TypeScale, number> = {
  'minor-third':    1.2,
  'major-third':    1.25,
  'perfect-fourth': 1.333,
  'golden-ratio':   1.618,
};

export interface TypeHierarchy {
  scale: TypeScale;
  ratio: number;
  sizes: {
    hero: string;      // Largest — hero names
    h1: string;        // Section headings
    h2: string;        // Sub-headings
    h3: string;        // Card titles
    body: string;      // Body text (base)
    caption: string;   // Captions, timestamps
    label: string;     // UI labels, badges
  };
}

/**
 * Generate a complete typographic size hierarchy from a base size
 * and a musical/mathematical scale.
 */
export function generateTypeHierarchy(
  baseSize = 16,
  scale: TypeScale = 'major-third',
): TypeHierarchy {
  const r = SCALE_RATIOS[scale];
  const px = (n: number) => `${(baseSize * n).toFixed(1)}px`;

  return {
    scale,
    ratio: r,
    sizes: {
      hero:    px(r * r * r * r),   // r^4
      h1:      px(r * r * r),       // r^3
      h2:      px(r * r),           // r^2
      h3:      px(r),               // r^1
      body:    px(1),               // base
      caption: px(1 / r),           // r^-1
      label:   px(1 / (r * r)),     // r^-2
    },
  };
}

// ── 11. Auto Dark Mode Preview ───────────────────────────────

/**
 * Invert a palette to create a dark mode version.
 * Swaps light/dark values while preserving accent hue.
 */
export function invertPalette(palette: {
  background: string; foreground: string; accent: string;
  accent2: string; card: string; muted: string;
  highlight: string; subtle: string; ink: string;
}): typeof palette {
  const darken = (hex: string, amount: number) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    return '#' + rgb.map(c => Math.max(0, Math.round(c * (1 - amount))).toString(16).padStart(2, '0')).join('');
  };
  const lighten = (hex: string, amount: number) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    return '#' + rgb.map(c => Math.min(255, Math.round(c + (255 - c) * amount)).toString(16).padStart(2, '0')).join('');
  };

  return {
    background: darken(palette.background, 0.85),
    foreground: lighten(palette.foreground, 0.8),
    accent: palette.accent, // Keep accent as-is
    accent2: darken(palette.accent2, 0.3),
    card: darken(palette.card, 0.8),
    muted: lighten(palette.muted, 0.4),
    highlight: palette.highlight,
    subtle: darken(palette.subtle, 0.82),
    ink: lighten(palette.ink, 0.85),
  };
}

// ── 12. Responsive Preview Warnings ──────────────────────────

export interface ResponsiveWarning {
  severity: 'warn' | 'error';
  title: string;
  detail: string;
  blockId?: string;
}

/**
 * Analyze blocks for potential mobile responsiveness issues.
 * Runs on manifest data — no DOM needed.
 */
export function checkResponsiveIssues(
  blocks: Array<{ id: string; type: string; config?: Record<string, unknown> }>,
  chapters?: Array<{ id: string; title?: string; images?: Array<{ width?: number; height?: number }> }>,
): ResponsiveWarning[] {
  const warnings: ResponsiveWarning[] = [];

  for (const block of blocks) {
    const cfg = block.config || {};

    // Fixed widths that won't fit mobile
    if (cfg.maxWidth && typeof cfg.maxWidth === 'string') {
      const px = parseInt(cfg.maxWidth);
      if (px > 500 && !cfg.maxWidth.includes('%') && !cfg.maxWidth.includes('vw')) {
        warnings.push({
          severity: 'warn',
          title: `Fixed width on ${block.type}`,
          detail: `${cfg.maxWidth} max-width may overflow on mobile screens (< 390px).`,
          blockId: block.id,
        });
      }
    }

    // Video blocks without responsive wrapper
    if (block.type === 'video' && cfg.url && !(cfg.aspectRatio || cfg.responsive)) {
      warnings.push({
        severity: 'warn',
        title: 'Video may not resize on mobile',
        detail: 'Add an aspect ratio to ensure the video scales properly on small screens.',
        blockId: block.id,
      });
    }
  }

  // Chapters with very long titles
  if (chapters) {
    for (const ch of chapters) {
      if (ch.title && ch.title.length > 40) {
        warnings.push({
          severity: 'warn',
          title: `Long chapter title`,
          detail: `"${ch.title.slice(0, 30)}…" (${ch.title.length} chars) may wrap awkwardly on mobile.`,
        });
      }
    }
  }

  // Too many blocks = long scroll on mobile
  const visibleBlocks = blocks.filter(b => b.type !== 'divider');
  if (visibleBlocks.length > 12) {
    warnings.push({
      severity: 'warn',
      title: `${visibleBlocks.length} sections is a lot`,
      detail: 'Mobile users may lose interest scrolling through this many sections. Consider hiding less important ones.',
    });
  }

  return warnings;
}

// ── 13. Design Style Presets ─────────────────────────────────

export interface DesignPreset {
  id: string;
  name: string;
  description: string;
  preview: { bg: string; fg: string; accent: string }; // For thumbnail
  palette: {
    background: string; foreground: string; accent: string;
    accent2: string; card: string; muted: string;
    highlight: string; subtle: string; ink: string;
  };
  fonts: { heading: string; body: string };
  cardStyle: string;
  texture: string;
  headingStyle: string;
  sectionEntrance: string;
  particle: string;
  tone: string;
}

export const DESIGN_PRESETS: DesignPreset[] = [
  {
    id: 'minimalist',
    name: 'Minimalist',
    description: 'Clean lines, lots of white space, understated elegance',
    preview: { bg: '#FFFFFF', fg: '#1A1A1A', accent: '#2A2A2A' },
    palette: {
      background: '#FAFAFA', foreground: '#1A1A1A', accent: '#2A2A2A',
      accent2: '#E0E0E0', card: '#FFFFFF', muted: '#888888',
      highlight: '#1A1A1A', subtle: '#F5F5F5', ink: '#000000',
    },
    fonts: { heading: 'Inter', body: 'Inter' },
    cardStyle: 'minimal', texture: 'none', headingStyle: 'uppercase-tracked',
    sectionEntrance: 'fade-up', particle: 'petals', tone: 'intimate',
  },
  {
    id: 'romantic-garden',
    name: 'Romantic Garden',
    description: 'Soft florals, warm ivory, classic serif typography',
    preview: { bg: '#FDF8F0', fg: '#2B2018', accent: '#A3B18A' },
    palette: {
      background: '#FDF8F0', foreground: '#2B2018', accent: '#A3B18A',
      accent2: '#D4C5A0', card: '#FFFBF5', muted: '#9A8E78',
      highlight: '#8A9E70', subtle: '#FAF5EC', ink: '#1A1208',
    },
    fonts: { heading: 'Playfair Display', body: 'Lora' },
    cardStyle: 'elevated', texture: 'linen', headingStyle: 'italic-serif',
    sectionEntrance: 'bloom', particle: 'petals', tone: 'dreamy',
  },
  {
    id: 'modern-editorial',
    name: 'Modern Editorial',
    description: 'Bold contrasts, magazine-quality, contemporary feel',
    preview: { bg: '#F5F1E8', fg: '#1C1C1C', accent: '#C45C1A' },
    palette: {
      background: '#F5F1E8', foreground: '#1C1C1C', accent: '#C45C1A',
      accent2: '#E8A060', card: '#FDFAF4', muted: '#7A7268',
      highlight: '#A04010', subtle: '#F2EEE5', ink: '#0A0A0A',
    },
    fonts: { heading: 'Cormorant Garamond', body: 'Source Sans Pro' },
    cardStyle: 'solid', texture: 'none', headingStyle: 'bold-editorial',
    sectionEntrance: 'reveal', particle: 'confetti', tone: 'luxurious',
  },
  {
    id: 'boho-rustic',
    name: 'Boho Rustic',
    description: 'Earthy tones, organic shapes, free-spirited warmth',
    preview: { bg: '#F2E8D8', fg: '#2A1E10', accent: '#8B6B3D' },
    palette: {
      background: '#F2E8D8', foreground: '#2A1E10', accent: '#8B6B3D',
      accent2: '#C4A870', card: '#FAF2E6', muted: '#8A7A60',
      highlight: '#6A4E28', subtle: '#F5EDE0', ink: '#1A1008',
    },
    fonts: { heading: 'Josefin Sans', body: 'Nunito' },
    cardStyle: 'outlined', texture: 'paper', headingStyle: 'thin-elegant',
    sectionEntrance: 'drift', particle: 'leaves', tone: 'rustic',
  },
  {
    id: 'midnight-luxe',
    name: 'Midnight Luxe',
    description: 'Dark sophistication, gold accents, evening glamour',
    preview: { bg: '#1A1520', fg: '#F0E8D8', accent: '#C8A84A' },
    palette: {
      background: '#1A1520', foreground: '#F0E8D8', accent: '#C8A84A',
      accent2: '#8A7030', card: '#252030', muted: '#9A9088',
      highlight: '#D4B850', subtle: '#201A28', ink: '#FAF2E4',
    },
    fonts: { heading: 'Cinzel', body: 'Raleway' },
    cardStyle: 'glass', texture: 'starfield', headingStyle: 'uppercase-tracked',
    sectionEntrance: 'float', particle: 'fireflies', tone: 'luxurious',
  },
  {
    id: 'coastal-breeze',
    name: 'Coastal Breeze',
    description: 'Ocean blues, sandy neutrals, breezy seaside vibes',
    preview: { bg: '#F0F5F8', fg: '#1A2C38', accent: '#2E7A9E' },
    palette: {
      background: '#F0F5F8', foreground: '#1A2C38', accent: '#2E7A9E',
      accent2: '#90C0D8', card: '#F8FBFD', muted: '#6A8898',
      highlight: '#1A5A7A', subtle: '#EDF3F7', ink: '#0D1C28',
    },
    fonts: { heading: 'Libre Baskerville', body: 'Open Sans' },
    cardStyle: 'glass', texture: 'none', headingStyle: 'italic-serif',
    sectionEntrance: 'drift', particle: 'bubbles', tone: 'playful',
  },
  {
    id: 'vibrant-celebration',
    name: 'Vibrant Celebration',
    description: 'Bold colors, playful energy, party atmosphere',
    preview: { bg: '#FFF5F8', fg: '#1A0A30', accent: '#E84393' },
    palette: {
      background: '#FFF5F8', foreground: '#1A0A30', accent: '#E84393',
      accent2: '#F8C000', card: '#FFFAFC', muted: '#9A6080',
      highlight: '#D42080', subtle: '#FFF0F5', ink: '#100020',
    },
    fonts: { heading: 'DM Serif Display', body: 'DM Sans' },
    cardStyle: 'elevated', texture: 'none', headingStyle: 'bold-editorial',
    sectionEntrance: 'bloom', particle: 'confetti', tone: 'playful',
  },
  {
    id: 'classic-elegance',
    name: 'Classic Elegance',
    description: 'Timeless refinement, serif typography, muted palette',
    preview: { bg: '#F8F4EE', fg: '#2C2420', accent: '#8A6E4E' },
    palette: {
      background: '#F8F4EE', foreground: '#2C2420', accent: '#8A6E4E',
      accent2: '#C4A880', card: '#FDFAF5', muted: '#8A8078',
      highlight: '#6A5038', subtle: '#F5F0EA', ink: '#1A1410',
    },
    fonts: { heading: 'EB Garamond', body: 'Lato' },
    cardStyle: 'elevated', texture: 'linen', headingStyle: 'italic-serif',
    sectionEntrance: 'fade-up', particle: 'petals', tone: 'intimate',
  },
];
