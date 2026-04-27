// ——————————————————————————————————————————————————————————————————————————————————————————————————
// Pearloom / lib/vibe-engine/types.ts
// Shared TypeScript interfaces/types for the vibe engine.
// ——————————————————————————————————————————————————————————————————————————————————————————————————

export interface VibeSkin {
  // — Structural choices (maps to pre-built SVG variants) —
  curve: 'organic' | 'arch' | 'geometric' | 'wave' | 'petal' | 'cascade' | 'ribbon' | 'mountain';
  particle: 'petals' | 'stars' | 'bubbles' | 'leaves' | 'confetti' | 'snowflakes' | 'fireflies' | 'sakura';
  accentShape: 'ring' | 'arch' | 'diamond' | 'leaf' | 'infinity';
  sectionEntrance: 'fade-up' | 'bloom' | 'drift' | 'float' | 'reveal';
  texture: 'none' | 'linen' | 'floral' | 'marble' | 'bokeh' | 'starfield' | 'paper';

  // — AI-generated open-ended fields —
  decorIcons: string[];      // unicode chars — Gemini picks freely
  accentSymbol: string;      // primary motif character
  particleColor: string;     // CSS hex
  sectionLabels: {
    story: string;
    events: string;
    registry: string;
    travel: string;
    faqs: string;
    rsvp: string;
    photos: string;
  };
  dividerQuote: string;
  cornerStyle: string;
  tone: 'dreamy' | 'playful' | 'luxurious' | 'wild' | 'intimate' | 'cosmic' | 'rustic';

  // — Style descriptors —
  headingStyle: 'italic-serif' | 'uppercase-tracked' | 'thin-elegant' | 'bold-editorial' | 'script-like';
  cardStyle: 'glass' | 'solid' | 'outlined' | 'minimal' | 'elevated';

  // — Section gradient (CSS linear-gradient string) —
  sectionGradient: string;

  // — Full 9-color AI palette —
  palette: {
    background: string;   // primary page background (e.g. moody dark or warm ivory)
    foreground: string;   // primary text color
    accent: string;       // primary accent (buttons, links, highlights)
    accent2: string;      // secondary accent (softer, complementary)
    card: string;         // card/section background
    muted: string;        // muted text, captions, timestamps
    highlight: string;    // hover/selected states — contrasting emotional color
    subtle: string;       // very light tint for section alternation
    ink: string;          // darkest color, for headings and high-contrast text
  };

  // — Font pairing (Google Fonts) —
  fonts: {
    heading: string;      // display/heading font (e.g. "Playfair Display")
    body: string;         // body text font (e.g. "Inter")
  };

  // — Computed wave SVG paths —
  wavePath: string;
  wavePathInverted: string;

  // — Custom AI-generated SVG art (baked at generation time) —
  heroPatternSvg?: string;
  sectionBorderSvg?: string;
  cornerFlourishSvg?: string;
  medallionSvg?: string;

  // — Large-format prominent art —
  heroBlobSvg?: string;
  accentBlobSvg?: string;
  sectionBlobPath?: string;

  // — Couple-specific per-chapter illustration icons —
  chapterIcons?: string[];

  // — Per-chapter ambient color wash —
  chapterColors?: string[];

  // — AI raster art (Nano Banana image generation) —
  heroArtDataUrl?: string;
  ambientArtDataUrl?: string;
  artStripDataUrl?: string;

  aiGenerated: boolean;
}

export interface CoupleProfile {
  pets: string[];
  interests: string[];
  locations: string[];
  motifs: string[];
  heritage: string[];
  illustrationPrompt: string;
}

export interface VibeSkinContext {
  chapters?: Array<{
    title: string;
    subtitle: string;
    mood: string;
    location?: { label: string } | null;
    description: string;
  }>;
  inspirationUrls?: string[];
  photoUrls?: string[];
  coupleProfile?: CoupleProfile;
  /**
   * User-chosen hex colors from the wizard (typically 3–4 colors:
   * [accent, accent2, background, foreground]). When provided, the
   * final palette MUST use these colors — generateVibeSkin applies
   * a hard override after the AI response to enforce this.
   */
  preferredPalette?: string[];
}

export interface SiteArtResult {
  heroArtDataUrl?: string;
  ambientArtDataUrl?: string;
  artStripDataUrl?: string;
}
