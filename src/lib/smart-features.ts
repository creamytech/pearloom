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
