// ——————————————————————————————————————————————————————————————————————————————————————————————————
// Pearloom / lib/vibe-engine.ts
// Gemini-first vibe → visual skin system.
// AI designs the entire aesthetic + custom SVG art from scratch.
// The keyword system is a fast fallback only.
// ——————————————————————————————————————————————————————————————————————————————————————————————————

// ── Dev-only logging helpers ─────────────────────────────────────────────────
const isDev = process.env.NODE_ENV === 'development';
const log = isDev ? console.log.bind(console) : () => {};
const logWarn = isDev ? console.warn.bind(console) : () => {};

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
  // Small repeating hero background pattern (viewBox 200x200)
  heroPatternSvg?: string;
  // Horizontal decorative border strip between sections (viewBox 800x40)
  sectionBorderSvg?: string;
  // Corner bracket flourish for cards (viewBox 80x80)
  cornerFlourishSvg?: string;
  // Centered medallion/wreath ornament (viewBox 120x120)
  medallionSvg?: string;

  // — Large-format prominent art (noticeable, fills significant screen space) —
  // Large editorial illustration for hero section right side (viewBox "0 0 500 700")
  heroBlobSvg?: string;
  // Organic blob decoration for section backgrounds (viewBox "0 0 600 400")
  accentBlobSvg?: string;
  // SVG path only for organic full-width section shape (viewBox 0 0 1440 500)
  sectionBlobPath?: string;

  // — Couple-specific per-chapter illustration icons (one per chapter, viewBox "0 0 80 80") —
  chapterIcons?: string[];

  // — Per-chapter ambient color wash (one hex per chapter, used as subtle section tint) —
  chapterColors?: string[];

  // — AI raster art (Nano Banana image generation — baked at generation time) —
  // Full painted hero art panel: atmospheric illustration tuned to vibe + occasion (base64 data URL)
  heroArtDataUrl?: string;
  // Softer ambient version for page background texture (base64 data URL, very subtle)
  ambientArtDataUrl?: string;
  // Horizontal decorative botanical art strip for section dividers (base64 data URL)
  artStripDataUrl?: string;

  aiGenerated: boolean;
}

// — SVG Wave Paths Library ——————————————————————————————————————————————————————————————————————————
export const WAVE_PATHS: Record<VibeSkin['curve'], { d: string; di: string }> = {
  organic: {
    d: 'M0,60 C150,120 350,0 500,60 C650,120 850,0 1000,60 L1000,150 L0,150 Z',
    di: 'M0,90 C150,30 350,150 500,90 C650,30 850,150 1000,90 L1000,0 L0,0 Z',
  },
  arch: {
    d: 'M0,80 Q250,0 500,80 Q750,160 1000,80 L1000,150 L0,150 Z',
    di: 'M0,70 Q250,150 500,70 Q750,-10 1000,70 L1000,0 L0,0 Z',
  },
  wave: {
    d: 'M0,100 C100,20 200,120 300,100 C400,80 500,20 600,100 C700,180 800,80 900,100 L900,150 L0,150 Z',
    di: 'M0,50 C100,130 200,30 300,50 C400,70 500,130 600,50 C700,-30 800,70 900,50 L900,0 L0,0 Z',
  },
  petal: {
    d: 'M0,120 Q100,20 200,100 Q300,180 400,100 Q500,20 600,100 Q700,180 800,100 Q900,20 1000,80 L1000,150 L0,150 Z',
    di: 'M0,30 Q100,130 200,50 Q300,-30 400,50 Q500,130 600,50 Q700,-30 800,50 Q900,130 1000,70 L1000,0 L0,0 Z',
  },
  geometric: {
    d: 'M0,60 L200,120 L400,40 L600,120 L800,40 L1000,80 L1000,150 L0,150 Z',
    di: 'M0,90 L200,30 L400,110 L600,30 L800,110 L1000,70 L1000,0 L0,0 Z',
  },
  cascade: {
    d: 'M0,40 C100,80 150,10 250,60 C350,110 400,20 500,70 C600,120 650,30 750,80 C850,130 900,40 1000,90 L1000,150 L0,150 Z',
    di: 'M0,110 C100,70 150,140 250,90 C350,40 400,130 500,80 C600,30 650,120 750,70 C850,20 900,110 1000,60 L1000,0 L0,0 Z',
  },
  ribbon: {
    d: 'M0,75 C200,20 300,130 500,75 C700,20 800,130 1000,75 L1000,150 L0,150 Z',
    di: 'M0,75 C200,130 300,20 500,75 C700,130 800,20 1000,75 L1000,0 L0,0 Z',
  },
  mountain: {
    d: 'M0,130 L150,40 L300,100 L450,20 L600,80 L750,10 L900,70 L1000,50 L1000,150 L0,150 Z',
    di: 'M0,20 L150,110 L300,50 L450,130 L600,70 L750,140 L900,80 L1000,100 L1000,0 L0,0 Z',
  },
};

const CORNER_STYLES: Record<VibeSkin['curve'], string> = {
  organic: '2rem 4rem 2rem 4rem',
  arch: '50% 50% 1.5rem 1.5rem / 3rem 3rem 1.5rem 1.5rem',
  geometric: '0',
  wave: '1.5rem',
  petal: '40% 40% 2rem 2rem / 3rem 3rem 2rem 2rem',
  cascade: '1rem 3rem 1rem 3rem',
  ribbon: '3rem',
  mountain: '0.5rem',
};

// — Deterministic fallback (keyword scoring) ——————————————————————————————————————————————————————
const KEYWORD_MAP: Record<string, Partial<VibeSkin>> = {
  garden:     { curve: 'petal',     particle: 'petals',     decorIcons: ['✿','❦','✾','◦','•'],   particleColor: '#c8d8a8', tone: 'dreamy',
    palette: { background: '#EEF2E8', foreground: '#2A2E20', accent: '#6B8F5A', accent2: '#B4CCA0', card: '#F4F8EF', muted: '#7A8C70', highlight: '#4E7240', subtle: '#F1F6EC', ink: '#181E10' } as VibeSkin['palette'] },
  floral:     { curve: 'petal',     particle: 'petals',     decorIcons: ['✿','❦','✾','⦿','◦'],   particleColor: '#f3d1d8', tone: 'dreamy'    },
  wildflower: { curve: 'organic',   particle: 'petals',     decorIcons: ['✿','❦','✦','◦','•'],   particleColor: '#e8b4bc', tone: 'wild'      },
  forest:     { curve: 'organic',   particle: 'leaves',     decorIcons: ['⧱','◦','✦','⦿','•'],   particleColor: '#a8d5a2', tone: 'rustic'   },
  beach:      { curve: 'ribbon',    particle: 'bubbles',    decorIcons: ['◯','○','◦','✦','•'],    particleColor: '#b8d8f8', tone: 'playful',
    palette: { background: '#EBF3F5', foreground: '#1A2C38', accent: '#2E7A9E', accent2: '#9ECDE8', card: '#F2F8FA', muted: '#6A8898', highlight: '#1A5A7A', subtle: '#EDF5F8', ink: '#0D1C28' } as VibeSkin['palette'] },
  ocean:      { curve: 'wave',      particle: 'bubbles',    decorIcons: ['○','◯','◦','✦','•'],    particleColor: '#9dd0f5', tone: 'dreamy'   },
  celestial:  { curve: 'arch',      particle: 'stars',      decorIcons: ['✦','✧','☽','⋆','✩'],   particleColor: '#ffe98a', tone: 'cosmic'   },
  starry:     { curve: 'arch',      particle: 'stars',      decorIcons: ['✦','⋆','✩','☽','✧'],   particleColor: '#fff3b0', tone: 'cosmic'   },
  night:      { curve: 'arch',      particle: 'fireflies',  decorIcons: ['✦','✧','⋆','◦','☽'],   particleColor: '#c8ff8a', tone: 'cosmic'   },
  golden:     { curve: 'organic',   particle: 'petals',     decorIcons: ['✦','◇','•','✧','◦'],    particleColor: '#ffd966', tone: 'luxurious'},
  romantic:   { curve: 'petal',     particle: 'petals',     decorIcons: ['♡','✿','✦','•','◦'],    particleColor: '#f9c6c9', tone: 'intimate' },
  boho:       { curve: 'organic',   particle: 'leaves',     decorIcons: ['✿','✦','•','⧱','◦'],    particleColor: '#c5e5c0', tone: 'wild'     },
  bohemian:   { curve: 'cascade',   particle: 'leaves',     decorIcons: ['✿','⧱','✦','◦','❦'],   particleColor: '#d4a08a', tone: 'wild',
    palette: { background: '#F2E8E0', foreground: '#2A1810', accent: '#A84A30', accent2: '#C89070', card: '#FAF0E8', muted: '#8A6858', highlight: '#7A2E18', subtle: '#F6EEE6', ink: '#180C04' } as VibeSkin['palette'] },
  elegant:    { curve: 'arch',      particle: 'stars',      decorIcons: ['◈','◇','✦','◉','○'],    particleColor: '#fff9e6', tone: 'luxurious'},
  luxury:     { curve: 'geometric', particle: 'stars',      decorIcons: ['◈','◇','▣','✦','◦'],    particleColor: '#ffe98a', tone: 'luxurious'},
  modern:     { curve: 'geometric', particle: 'stars',      decorIcons: ['◈','◆','▪','◦','✦'],    particleColor: '#d4c070', tone: 'luxurious',
    palette: { background: '#F5F2ED', foreground: '#1A1A1A', accent: '#B8962A', accent2: '#DFC870', card: '#FDFBF6', muted: '#8A8478', highlight: '#8A6E10', subtle: '#F9F7F2', ink: '#0A0A0A' } as VibeSkin['palette'] },
  winter:     { curve: 'geometric', particle: 'snowflakes', decorIcons: ['❄','✻','✼','✦','◦'],    particleColor: '#c8dff0', tone: 'dreamy',
    palette: { background: '#EDF2F8', foreground: '#0E1830', accent: '#3058A8', accent2: '#90B0D8', card: '#F4F8FC', muted: '#6878A0', highlight: '#1A3878', subtle: '#F0F4FA', ink: '#060C1E' } as VibeSkin['palette'] },
  tropical:   { curve: 'wave',      particle: 'confetti',   decorIcons: ['✿','◦','✦','❦','•'],    particleColor: '#c3f5a9', tone: 'playful'  },
  rustic:     { curve: 'mountain',  particle: 'leaves',     decorIcons: ['⧱','◦','✦','•','❦'],   particleColor: '#c4a882', tone: 'rustic'   },
  minimalist: { curve: 'ribbon',    particle: 'stars',      decorIcons: ['◦','•','◈','◇','✦'],    particleColor: '#d0ccc4', tone: 'luxurious'},
  vintage:    { curve: 'cascade',   particle: 'petals',     decorIcons: ['◈','✿','◇','✦','•'],    particleColor: '#d4b896', tone: 'rustic'   },
  sakura:     { curve: 'petal',     particle: 'sakura',     decorIcons: ['✿','❀','◦','✦','•'],    particleColor: '#ffb7c5', tone: 'dreamy'   },
  festival:   { curve: 'cascade',   particle: 'confetti',   decorIcons: ['✦','◆','✿','★','◉'],    particleColor: '#F8C000', tone: 'playful',
    palette: { background: '#FFF5F8', foreground: '#1A0A30', accent: '#E84393', accent2: '#F8C000', card: '#FFFAFC', muted: '#9A6080', highlight: '#F5841F', subtle: '#FFF0F5', ink: '#2A2690' } as VibeSkin['palette'] },
  fiesta:     { curve: 'cascade',   particle: 'confetti',   decorIcons: ['✦','★','◆','✿','◉'],    particleColor: '#F5A800', tone: 'playful',
    palette: { background: '#FFF8F0', foreground: '#1A0A00', accent: '#C45C1A', accent2: '#F5A800', card: '#FFF5EC', muted: '#9A6040', highlight: '#D4225A', subtle: '#FFF2E8', ink: '#1A3A8F' } as VibeSkin['palette'] },
  vibrant:    { curve: 'wave',      particle: 'confetti',   decorIcons: ['✦','★','◆','✿','◉'],    particleColor: '#F8C000', tone: 'playful',
    palette: { background: '#FFF5F8', foreground: '#1A0A30', accent: '#E84393', accent2: '#F5841F', card: '#FFFAFC', muted: '#9A6080', highlight: '#F8C000', subtle: '#FFF0F5', ink: '#2A2690' } as VibeSkin['palette'] },
  colorful:   { curve: 'wave',      particle: 'confetti',   decorIcons: ['✦','★','◆','✿','●'],    particleColor: '#F8C000', tone: 'playful',
    palette: { background: '#FFF5F8', foreground: '#1A0A30', accent: '#E84393', accent2: '#F8C000', card: '#FFFAFC', muted: '#9A6080', highlight: '#F5841F', subtle: '#FFF0F5', ink: '#2A2690' } as VibeSkin['palette'] },
  coco:       { curve: 'cascade',   particle: 'confetti',   decorIcons: ['✦','★','✿','◆','●'],    particleColor: '#F8C000', tone: 'playful',
    palette: { background: '#FFF5F8', foreground: '#1A0A30', accent: '#E84393', accent2: '#F8C000', card: '#FFFAFC', muted: '#9A6080', highlight: '#F5841F', subtle: '#FFF0F5', ink: '#2A2690' } as VibeSkin['palette'] },
  'dia de los muertos': { curve: 'cascade', particle: 'confetti', decorIcons: ['✦','★','✿','◆','●'], particleColor: '#F8C000', tone: 'playful',
    palette: { background: '#FFF5F8', foreground: '#1A0A30', accent: '#E84393', accent2: '#F8C000', card: '#FFFAFC', muted: '#9A6080', highlight: '#F5841F', subtle: '#FFF0F5', ink: '#2A2690' } as VibeSkin['palette'] },
  'día de los muertos': { curve: 'cascade', particle: 'confetti', decorIcons: ['✦','★','✿','◆','●'], particleColor: '#F8C000', tone: 'playful',
    palette: { background: '#FFF5F8', foreground: '#1A0A30', accent: '#E84393', accent2: '#F8C000', card: '#FFFAFC', muted: '#9A6080', highlight: '#F5841F', subtle: '#FFF0F5', ink: '#2A2690' } as VibeSkin['palette'] },
  marigold:   { curve: 'cascade',   particle: 'confetti',   decorIcons: ['✦','★','✿','◆','●'],    particleColor: '#F8C000', tone: 'playful',
    palette: { background: '#FFF8F0', foreground: '#1A0A00', accent: '#F5A623', accent2: '#E84393', card: '#FFF5EC', muted: '#9A6040', highlight: '#F8C000', subtle: '#FFF2E8', ink: '#1A3A8F' } as VibeSkin['palette'] },

  // Anniversary keywords
  'anniversary':      { curve: 'organic', particle: 'fireflies', decorIcons: ['∞','◎','✦','◦','•'], particleColor: '#D2691E', tone: 'intimate',
    palette: { background: '#F4EEE8', foreground: '#2C1810', accent: '#D2691E', accent2: '#DEB887', card: '#FAF4EE', muted: '#9E7858', highlight: '#8B4513', subtle: '#F8F2EC', ink: '#1C0C04' } as VibeSkin['palette'] },
  'silver anniversary': { curve: 'arch', particle: 'stars', decorIcons: ['◈','◇','✦','◦','○'], particleColor: '#C0C0C0', tone: 'luxurious',
    palette: { background: '#F2F2F4', foreground: '#1C1C1C', accent: '#A8A9AD', accent2: '#708090', card: '#F8F8FA', muted: '#888890', highlight: '#2F4F4F', subtle: '#F5F5F7', ink: '#0A0A0A' } as VibeSkin['palette'] },
  'golden anniversary': { curve: 'arch', particle: 'stars', decorIcons: ['✦','◇','◈','○','•'], particleColor: '#FFD700', tone: 'luxurious',
    palette: { background: '#FBF5E6', foreground: '#2C1810', accent: '#DAA520', accent2: '#FFD700', card: '#FEF9EC', muted: '#9A8050', highlight: '#B8860B', subtle: '#FDF8F0', ink: '#1A0C00' } as VibeSkin['palette'] },
  'vow renewal':      { curve: 'petal', particle: 'petals', decorIcons: ['∞','♡','✿','◦','✦'], particleColor: '#C4956A', tone: 'intimate',
    palette: { background: '#F5EDE4', foreground: '#2C1810', accent: '#C4956A', accent2: '#E8D5C4', card: '#FAF4EE', muted: '#9E8068', highlight: '#8B6355', subtle: '#F8F2EC', ink: '#180C04' } as VibeSkin['palette'] },

  // Birthday keywords
  'milestone birthday': { curve: 'cascade', particle: 'confetti', decorIcons: ['✦','★','◆','✿','◉'], particleColor: '#FFD700', tone: 'playful',
    palette: { background: '#FFF8F0', foreground: '#1A0A00', accent: '#FFD700', accent2: '#FF6B6B', card: '#FFF5EC', muted: '#9A7040', highlight: '#F5841F', subtle: '#FFF2E8', ink: '#1A0A00' } as VibeSkin['palette'] },
  '30th birthday':    { curve: 'geometric', particle: 'confetti', decorIcons: ['◈','★','◆','✦','30'], particleColor: '#E74C3C', tone: 'luxurious',
    palette: { background: '#ECF0F1', foreground: '#2C3E50', accent: '#E74C3C', accent2: '#3498DB', card: '#F5F8FA', muted: '#7F8C8D', highlight: '#C0392B', subtle: '#EEF2F5', ink: '#1A2530' } as VibeSkin['palette'] },
  '50th birthday':    { curve: 'arch', particle: 'stars', decorIcons: ['✦','◈','★','◇','50'], particleColor: '#FFD700', tone: 'warm' as VibeSkin['tone'],
    palette: { background: '#FBF5E6', foreground: '#2C1810', accent: '#FFD700', accent2: '#C0392B', card: '#FEF9EC', muted: '#9A8050', highlight: '#27AE60', subtle: '#FDF8F0', ink: '#1A0C00' } as VibeSkin['palette'] },
  'surprise party':   { curve: 'cascade', particle: 'confetti', decorIcons: ['★','✦','◆','✿','◉'], particleColor: '#6BCF7F', tone: 'playful',
    palette: { background: '#FFF5F8', foreground: '#1A0A30', accent: '#FF6B6B', accent2: '#FFD93D', card: '#FFFAFC', muted: '#9A6080', highlight: '#4D96FF', subtle: '#FFF0F5', ink: '#1A0A30' } as VibeSkin['palette'] },

  // Engagement keywords
  'engagement':       { curve: 'petal', particle: 'stars', decorIcons: ['◎','✦','♡','◦','•'], particleColor: '#B76E79', tone: 'romantic' as VibeSkin['tone'],
    palette: { background: '#F8F0EC', foreground: '#2C1820', accent: '#B76E79', accent2: '#E8D5C4', card: '#FEF6F2', muted: '#9E7870', highlight: '#8B4A55', subtle: '#FBF4F0', ink: '#1C0C10' } as VibeSkin['palette'] },
  'just engaged':     { curve: 'petal', particle: 'stars', decorIcons: ['◎','♡','✦','✿','◦'], particleColor: '#FF69B4', tone: 'dreamy',
    palette: { background: '#FFF0F5', foreground: '#2C1020', accent: '#DB7093', accent2: '#FFB6C1', card: '#FFF8FA', muted: '#9E7080', highlight: '#FF69B4', subtle: '#FFF5F8', ink: '#1A0810' } as VibeSkin['palette'] },
  'engaged':          { curve: 'petal', particle: 'stars', decorIcons: ['◎','✦','♡','◦','•'], particleColor: '#B76E79', tone: 'romantic' as VibeSkin['tone'],
    palette: { background: '#F8F0EC', foreground: '#2C1820', accent: '#B76E79', accent2: '#E8D5C4', card: '#FEF6F2', muted: '#9E7870', highlight: '#8B4A55', subtle: '#FBF4F0', ink: '#1C0C10' } as VibeSkin['palette'] },
};

// — Seed-based deterministic number in [0,1) from a string ——————————————————————————————————————————
function seededRandom(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return (Math.abs(hash) % 1000) / 1000;
}

// — Fallback palette variants keyed by vibe seed ——————————————————————————————————————————————————
const FALLBACK_PALETTE_VARIANTS = [
  // Pearloom Olive / Cream (default)
  { background: '#F5F1E8', foreground: '#2B2B2B', accent: '#A3B18A', accent2: '#D6C6A8', card: '#FDFAF4', muted: '#9A9488', highlight: '#7D9B6A', subtle: '#F9F6EF', ink: '#1C1C1C' },
  // Dusty Rose / Blush
  { background: '#F7EEE8', foreground: '#2E2020', accent: '#C4837A', accent2: '#E8BDB8', card: '#FDF5F3', muted: '#9E8580', highlight: '#A8594F', subtle: '#FBF1EF', ink: '#1A1010' },
  // Deep Navy / Ivory
  { background: '#F0EDE6', foreground: '#1A2340', accent: '#3D5A80', accent2: '#8EA8C3', card: '#F8F5EE', muted: '#7A8A9E', highlight: '#2A4060', subtle: '#F4F1EA', ink: '#0D1620' },
  // Sage / Warm White
  { background: '#EEF2EB', foreground: '#252820', accent: '#6B8F71', accent2: '#A8C5AD', card: '#F5F8F3', muted: '#7A8C7D', highlight: '#4E7455', subtle: '#F1F5EF', ink: '#151A12' },
  // Terracotta / Sand
  { background: '#F4EDE6', foreground: '#2C1E14', accent: '#B5633A', accent2: '#D4A086', card: '#FAF4EE', muted: '#9E7D68', highlight: '#8F4620', subtle: '#F8F2EC', ink: '#1E1008' },
  // Lavender / Cream
  { background: '#EFECF5', foreground: '#201A2C', accent: '#7B68AE', accent2: '#B8AED4', card: '#F7F5FB', muted: '#8A82A0', highlight: '#5C4E8C', subtle: '#F3F0F9', ink: '#150E20' },
  // Warm Charcoal / Gold (modern luxe)
  { background: '#F5F2ED', foreground: '#1A1A1A', accent: '#B8962A', accent2: '#DFC870', card: '#FDFBF6', muted: '#8A8478', highlight: '#8A6E10', subtle: '#F9F7F2', ink: '#0A0A0A' },
  // Icy Platinum / Deep Navy (winter)
  { background: '#EDF2F8', foreground: '#0E1830', accent: '#3058A8', accent2: '#90B0D8', card: '#F4F8FC', muted: '#6878A0', highlight: '#1A3878', subtle: '#F0F4FA', ink: '#060C1E' },
  // Burgundy / Warm Sand (bohemian)
  { background: '#F2E8E0', foreground: '#2A1810', accent: '#A84A30', accent2: '#C89070', card: '#FAF0E8', muted: '#8A6858', highlight: '#7A2E18', subtle: '#F6EEE6', ink: '#180C04' },
  // Warm Sage / Organic (garden)
  { background: '#EEF2E8', foreground: '#2A2E20', accent: '#6B8F5A', accent2: '#B4CCA0', card: '#F4F8EF', muted: '#7A8C70', highlight: '#4E7240', subtle: '#F1F6EC', ink: '#181E10' },
  // Sea Glass / Sand (beach/coastal)
  { background: '#EBF3F5', foreground: '#1A2C38', accent: '#2E7A9E', accent2: '#9ECDE8', card: '#F2F8FA', muted: '#6A8898', highlight: '#1A5A7A', subtle: '#EDF5F8', ink: '#0D1C28' },
  // Warm Blush / Antique Gold
  { background: '#F8F0EC', foreground: '#2C1820', accent: '#C87060', accent2: '#E4B090', card: '#FEF6F2', muted: '#9E7870', highlight: '#A84840', subtle: '#FBF4F0', ink: '#1C0C10' },
];

function deriveFallback(vibeString: string): VibeSkin {
  const lower = vibeString.toLowerCase();
  const merged: Partial<VibeSkin> = {};

  for (const [keyword, vals] of Object.entries(KEYWORD_MAP)) {
    if (lower.includes(keyword)) {
      Object.assign(merged, vals);
    }
  }

  const curve = merged.curve || 'organic';
  const waveDef = WAVE_PATHS[curve];

  // If a keyword match provided a full palette override, use it; otherwise seed-pick from variants
  const seed = seededRandom(vibeString);
  const paletteIdx = Math.floor(seed * FALLBACK_PALETTE_VARIANTS.length);
  const palettePick = (merged as Partial<VibeSkin>).palette || FALLBACK_PALETTE_VARIANTS[paletteIdx];
  const art = buildFallbackArt(palettePick.accent, curve);

  // Seed-based heading/body font variation — 40+ curated Google Fonts pairings
  const FALLBACK_FONT_PAIRS: Array<{ heading: string; body: string }> = [
    // Romantic
    { heading: 'Playfair Display',    body: 'Inter' },
    { heading: 'Cormorant Garamond',  body: 'Jost' },
    { heading: 'Cormorant Garamond',  body: 'Raleway' },
    { heading: 'Great Vibes',         body: 'Montserrat' },
    { heading: 'Libre Baskerville',   body: 'Lato' },
    { heading: 'EB Garamond',         body: 'Source Sans 3' },
    { heading: 'Mrs Saint Delafield', body: 'Josefin Sans' },
    { heading: 'Tangerine',           body: 'Open Sans' },
    { heading: 'Cinzel Decorative',   body: 'Cinzel' },
    { heading: 'Alex Brush',          body: 'Nunito' },
    // Modern
    { heading: 'DM Serif Display',    body: 'DM Sans' },
    { heading: 'Bodoni Moda',         body: 'Inter' },
    { heading: 'Bebas Neue',          body: 'Roboto' },
    { heading: 'Fraunces',            body: 'Figtree' },
    { heading: 'Syne',                body: 'Nunito Sans' },
    { heading: 'Outfit',              body: 'Plus Jakarta Sans' },
    { heading: 'Tenor Sans',          body: 'Source Sans 3' },
    // Classic
    { heading: 'Crimson Text',        body: 'Merriweather' },
    { heading: 'Libre Baskerville',   body: 'EB Garamond' },
    { heading: 'Cardo',               body: 'Cabin' },
    { heading: 'Spectral',            body: 'Karla' },
    { heading: 'Lora',                body: 'Open Sans' },
    { heading: 'Rokkitt',             body: 'Source Sans 3' },
    { heading: 'GFS Didot',           body: 'Lato' },
    { heading: 'Old Standard TT',     body: 'Merriweather' },
    // Playful
    { heading: 'Pacifico',            body: 'Quicksand' },
    { heading: 'Dancing Script',      body: 'Nunito' },
    { heading: 'Sacramento',          body: 'Raleway' },
    { heading: 'Kaushan Script',      body: 'Poppins' },
    { heading: 'Satisfy',             body: 'Open Sans' },
    { heading: 'Parisienne',          body: 'Josefin Sans' },
    // Editorial
    { heading: 'Josefin Sans',        body: 'Josefin Slab' },
    { heading: 'Unbounded',           body: 'Outfit' },
    { heading: 'Space Grotesk',       body: 'Space Mono' },
    { heading: 'Epilogue',            body: 'Work Sans' },
    { heading: 'Instrument Serif',    body: 'Instrument Sans' },
    { heading: 'Syne',                body: 'DM Sans' },
    // Rustic
    { heading: 'Abril Fatface',       body: 'Lora' },
    { heading: 'Rozha One',           body: 'Poppins' },
    { heading: 'Zilla Slab',          body: 'Mulish' },
    { heading: 'Aleo',                body: 'Lato' },
    // Luxe
    { heading: 'Cormorant',           body: 'Cormorant Infant' },
    { heading: 'Marcellus SC',        body: 'Marcellus' },
    { heading: 'Poiret One',          body: 'Montserrat' },
    { heading: 'Julius Sans One',     body: 'Raleway' },
    { heading: 'Bodoni Moda',         body: 'Cormorant Garamond' },
    { heading: 'Cinzel',              body: 'Lato' },
  ];
  const fontIdx = Math.floor(seededRandom(vibeString + '_font') * FALLBACK_FONT_PAIRS.length);
  const fontPick = FALLBACK_FONT_PAIRS[fontIdx];

  return {
    curve,
    particle: merged.particle || 'petals',
    accentShape: 'ring',
    sectionEntrance: 'fade-up',
    texture: 'none',
    decorIcons: merged.decorIcons || ['✦', '•', '◦', '✧', '·'],
    accentSymbol: merged.decorIcons?.[0] || '✦',
    particleColor: merged.particleColor || palettePick.accent2,
    sectionLabels: {
      story: 'Our Story',
      events: 'Our Celebration',
      registry: 'Our Registry',
      travel: 'Getting Here',
      faqs: 'Good to Know',
      rsvp: "We'd Love to See You",
      photos: 'Our Photos',
    },
    dividerQuote: vibeString || 'A love story worth telling.',
    cornerStyle: CORNER_STYLES[curve],
    tone: merged.tone || 'dreamy',
    headingStyle: 'italic-serif',
    cardStyle: 'elevated',
    sectionGradient: `linear-gradient(135deg, ${palettePick.subtle} 0%, ${palettePick.card} 100%)`,
    palette: palettePick,
    fonts: fontPick,
    wavePath: waveDef.d,
    wavePathInverted: waveDef.di,
    ...art,
    aiGenerated: false,
  };
}

// — SVG art helpers —————————————————————————————————————————————————————————————————————————————————
function extractSvgFromField(raw: string): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const match = raw.match(/<svg[\s\S]*?<\/svg>/i);
  return match ? match[0] : null;
}

function isValidSvg(svg: string): boolean {
  return svg.includes('<svg') && svg.includes('</svg>') && svg.length > 80;
}

function buildFallbackArt(accent: string, curve: VibeSkin['curve']): {
  heroPatternSvg: string; sectionBorderSvg: string; cornerFlourishSvg: string; medallionSvg: string;
  heroBlobSvg: string; accentBlobSvg: string; sectionBlobPath: string;
} {
  const a = accent || '#A3B18A';

  // Pattern varies by curve type for more visual variety across sites
  const HERO_PATTERNS: Record<VibeSkin['curve'], string> = {
    organic: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><g fill="none" stroke="${a}" stroke-width="0.6" opacity="0.11"><path d="M20,100 C60,40 140,40 180,100 C140,160 60,160 20,100 Z"/><circle cx="100" cy="100" r="45"/><circle cx="100" cy="100" r="22"/></g><g fill="${a}" opacity="0.08"><circle cx="100" cy="55" r="2.5"/><circle cx="100" cy="145" r="2.5"/><circle cx="55" cy="100" r="2"/><circle cx="145" cy="100" r="2"/><circle cx="100" cy="100" r="2"/></g></svg>`,
    arch: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><g fill="none" stroke="${a}" stroke-width="0.6" opacity="0.12"><path d="M30,130 Q100,20 170,130"/><path d="M50,150 Q100,60 150,150"/><line x1="100" y1="20" x2="100" y2="170"/></g><g fill="${a}" opacity="0.08"><circle cx="100" cy="20" r="3"/><circle cx="30" cy="130" r="2"/><circle cx="170" cy="130" r="2"/></g></svg>`,
    geometric: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><g fill="none" stroke="${a}" stroke-width="0.6" opacity="0.12"><rect x="40" y="40" width="120" height="120"/><rect x="70" y="70" width="60" height="60" transform="rotate(45 100 100)"/><line x1="40" y1="40" x2="160" y2="160"/><line x1="160" y1="40" x2="40" y2="160"/></g><g fill="${a}" opacity="0.08"><circle cx="100" cy="100" r="3"/><circle cx="40" cy="40" r="2"/><circle cx="160" cy="40" r="2"/><circle cx="40" cy="160" r="2"/><circle cx="160" cy="160" r="2"/></g></svg>`,
    wave: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><g fill="none" stroke="${a}" stroke-width="0.7" opacity="0.11"><path d="M0,60 C40,40 80,80 120,60 C160,40 180,70 200,55"/><path d="M0,100 C40,80 80,120 120,100 C160,80 180,110 200,95"/><path d="M0,140 C40,120 80,160 120,140 C160,120 180,150 200,135"/></g><g fill="${a}" opacity="0.07"><circle cx="40" cy="40" r="2"/><circle cx="120" cy="60" r="2"/><circle cx="40" cy="80" r="2"/><circle cx="120" cy="100" r="2"/></g></svg>`,
    petal: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><g fill="none" stroke="${a}" stroke-width="0.6" opacity="0.12"><path d="M100,100 Q100,50 130,70 Q110,100 100,100 Z"/><path d="M100,100 Q150,100 130,130 Q100,110 100,100 Z"/><path d="M100,100 Q100,150 70,130 Q90,100 100,100 Z"/><path d="M100,100 Q50,100 70,70 Q100,90 100,100 Z"/><circle cx="100" cy="100" r="15"/></g><circle cx="100" cy="100" r="3" fill="${a}" opacity="0.18"/></svg>`,
    cascade: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><g fill="none" stroke="${a}" stroke-width="0.6" opacity="0.11"><path d="M20,40 C50,20 80,60 110,40 C140,20 170,60 190,40"/><path d="M20,80 C50,60 80,100 110,80 C140,60 170,100 190,80"/><path d="M20,120 C50,100 80,140 110,120 C140,100 170,140 190,120"/><path d="M20,160 C50,140 80,180 110,160 C140,140 170,180 190,160"/></g><g fill="${a}" opacity="0.08"><circle cx="110" cy="40" r="2"/><circle cx="110" cy="80" r="2"/><circle cx="110" cy="120" r="2"/><circle cx="110" cy="160" r="2"/></g></svg>`,
    ribbon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><g fill="none" stroke="${a}" stroke-width="0.7" opacity="0.10"><path d="M0,100 C67,40 133,160 200,100"/><path d="M0,80 C67,20 133,140 200,80"/><path d="M0,120 C67,60 133,180 200,120"/></g><g fill="${a}" opacity="0.08"><circle cx="100" cy="100" r="2.5"/><circle cx="33" cy="70" r="1.5"/><circle cx="167" cy="130" r="1.5"/></g></svg>`,
    mountain: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><g fill="none" stroke="${a}" stroke-width="0.6" opacity="0.11"><path d="M0,160 L50,80 L80,120 L110,50 L140,100 L170,60 L200,90"/><path d="M0,180 L50,110 L80,145 L110,80 L140,125 L170,90 L200,115"/></g><g fill="${a}" opacity="0.08"><circle cx="50" cy="80" r="2.5"/><circle cx="110" cy="50" r="3"/><circle cx="170" cy="60" r="2.5"/></g></svg>`,
  };

  const heroPatternSvg = HERO_PATTERNS[curve] || HERO_PATTERNS.organic;

  const curvePaths: Record<VibeSkin['curve'], string> = {
    organic:   'M0,20 C50,5 100,35 150,20 C200,5 250,35 300,20 C350,5 400,35 450,20 C500,5 550,35 600,20 C650,5 700,35 750,20 C800,5 800,20 800,20',
    arch:      'M0,20 Q100,5 200,20 Q300,35 400,20 Q500,5 600,20 Q700,35 800,20',
    wave:      'M0,20 C80,5 120,35 200,20 C280,5 320,35 400,20 C480,5 520,35 600,20 C680,5 720,35 800,20',
    petal:     'M0,20 Q50,0 100,20 Q150,40 200,20 Q250,0 300,20 Q350,40 400,20 Q450,0 500,20 Q550,40 600,20 Q650,0 700,20 Q750,40 800,20',
    geometric: 'M0,20 L100,8 L200,32 L300,8 L400,32 L500,8 L600,32 L700,8 L800,20',
    cascade:   'M0,10 C60,25 100,5 160,18 C220,30 260,8 320,22 C380,35 420,10 480,24 C540,38 580,12 640,20 C700,28 740,8 800,18',
    ribbon:    'M0,20 C133,5 267,35 400,20 C533,5 667,35 800,20',
    mountain:  'M0,32 L100,12 L200,26 L300,6 L400,20 L500,4 L600,18 L700,8 L800,20',
  };
  const sectionBorderSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 40">
  <path d="${curvePaths[curve]}" fill="none" stroke="${a}" stroke-width="0.8" opacity="0.25"/>
  <path d="${curvePaths[curve]}" fill="none" stroke="${a}" stroke-width="0.4" stroke-dasharray="4,6" opacity="0.12" transform="translate(0,6)"/>
  <circle cx="400" cy="20" r="4" fill="${a}" opacity="0.3"/>
  <circle cx="400" cy="20" r="2" fill="${a}" opacity="0.5"/>
  <circle cx="200" cy="20" r="1.5" fill="${a}" opacity="0.2"/>
  <circle cx="600" cy="20" r="1.5" fill="${a}" opacity="0.2"/>
</svg>`;

  const cornerFlourishSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
  <g fill="none" stroke="${a}" stroke-width="0.8" opacity="0.35">
    <path d="M4,4 Q20,4 20,20"/>
    <path d="M4,4 Q4,20 20,20"/>
    <path d="M4,4 L12,4 M4,4 L4,12"/>
    <circle cx="20" cy="20" r="3"/>
    <path d="M28,4 Q36,12 28,20" opacity="0.5"/>
    <path d="M4,28 Q12,36 20,28" opacity="0.5"/>
  </g>
  <circle cx="4" cy="4" r="1.5" fill="${a}" opacity="0.4"/>
</svg>`;

  const pts = Array.from({ length: 8 }, (_, i) => {
    const angle = (i * 45 * Math.PI) / 180;
    const x1 = (60 + 42 * Math.cos(angle)).toFixed(1);
    const y1 = (60 + 42 * Math.sin(angle)).toFixed(1);
    const x2 = (60 + 50 * Math.cos(angle)).toFixed(1);
    const y2 = (60 + 50 * Math.sin(angle)).toFixed(1);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  }).join('');

  const medallionSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <g fill="none" stroke="${a}" stroke-width="0.7" opacity="0.3">
    <circle cx="60" cy="60" r="50"/>
    <circle cx="60" cy="60" r="42"/>
    <circle cx="60" cy="60" r="30"/>
    ${pts}
  </g>
  <circle cx="60" cy="60" r="4" fill="${a}" opacity="0.3"/>
  <circle cx="60" cy="60" r="1.5" fill="${a}" opacity="0.6"/>
</svg>`;

  // — Large-format prominent art ———————————————————————————
  const heroBlobSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 700">
  <g fill="none" stroke="${a}" stroke-linecap="round" stroke-linejoin="round">
    <path d="M250,680 C240,580 260,480 240,380 C220,280 230,180 250,80" stroke-width="2" opacity="0.20"/>
    <path d="M247,520 C200,480 158,468 118,448" stroke-width="1.4" opacity="0.17"/>
    <path d="M244,420 C190,388 148,368 98,338" stroke-width="1.3" opacity="0.15"/>
    <path d="M253,560 C300,518 342,508 382,488" stroke-width="1.4" opacity="0.17"/>
    <path d="M256,460 C308,428 350,408 400,378" stroke-width="1.3" opacity="0.15"/>
    <path d="M248,320 C210,288 178,268 148,238" stroke-width="1.1" opacity="0.13"/>
    <path d="M252,280 C290,248 322,228 362,198" stroke-width="1.1" opacity="0.13"/>
  </g>
  <g fill="${a}">
    <path d="M118,448 Q93,426 109,404 Q134,426 118,448 Z" opacity="0.18"/>
    <path d="M145,488 Q120,463 138,438 Q162,463 145,488 Z" opacity="0.16"/>
    <path d="M98,338 Q73,315 90,293 Q116,315 98,338 Z" opacity="0.16"/>
    <path d="M382,488 Q406,465 390,442 Q365,465 382,488 Z" opacity="0.18"/>
    <path d="M400,378 Q424,354 407,332 Q383,354 400,378 Z" opacity="0.16"/>
    <path d="M148,238 Q125,218 140,198 Q163,218 148,238 Z" opacity="0.14"/>
    <path d="M362,198 Q385,176 368,155 Q344,176 362,198 Z" opacity="0.14"/>
    <circle cx="250" cy="75" r="16" opacity="0.14"/>
    <circle cx="250" cy="75" r="8" opacity="0.22"/>
    <circle cx="180" cy="350" r="2.5" opacity="0.28"/>
    <circle cx="320" cy="430" r="2.5" opacity="0.28"/>
    <circle cx="148" cy="458" r="2" opacity="0.22"/>
    <circle cx="370" cy="378" r="2" opacity="0.22"/>
    <circle cx="200" cy="250" r="2" opacity="0.20"/>
    <circle cx="300" cy="220" r="2" opacity="0.20"/>
    <circle cx="168" cy="580" r="1.5" opacity="0.16"/>
    <circle cx="332" cy="548" r="1.5" opacity="0.16"/>
  </g>
</svg>`;

  const accentBlobSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400">
  <path d="M480,200 L448,312 L358,374 L248,362 L162,290 L148,180 L206,98 L308,72 L408,112 Z" fill="${a}" opacity="0.07"/>
  <g fill="none" stroke="${a}">
    <circle cx="300" cy="200" r="96" opacity="0.13"/>
    <circle cx="300" cy="200" r="64" opacity="0.10"/>
    <circle cx="300" cy="200" r="32" opacity="0.08"/>
  </g>
  <g fill="${a}" opacity="0.20">
    <circle cx="300" cy="104" r="4"/>
    <circle cx="393" cy="152" r="4"/>
    <circle cx="393" cy="248" r="4"/>
    <circle cx="300" cy="296" r="4"/>
    <circle cx="207" cy="248" r="4"/>
    <circle cx="207" cy="152" r="4"/>
  </g>
  <circle cx="300" cy="200" r="9" fill="${a}" opacity="0.22"/>
  <circle cx="300" cy="200" r="3" fill="${a}" opacity="0.45"/>
</svg>`;

  const SECTION_BLOB_PATHS: Record<VibeSkin['curve'], string> = {
    organic:   'M0,80 C360,20 720,120 1080,50 C1260,15 1380,55 1440,40 L1440,500 L0,500 Z',
    arch:      'M0,60 Q360,0 720,60 Q1080,120 1440,60 L1440,500 L0,500 Z',
    wave:      'M0,80 C180,40 240,100 360,70 C480,40 600,90 720,65 C840,40 960,95 1080,70 C1200,45 1380,75 1440,60 L1440,500 L0,500 Z',
    petal:     'M0,60 Q180,10 360,60 Q540,110 720,60 Q900,10 1080,60 Q1260,110 1440,60 L1440,500 L0,500 Z',
    geometric: 'M0,40 L240,85 L480,20 L720,85 L960,20 L1200,85 L1440,40 L1440,500 L0,500 Z',
    cascade:   'M0,30 C240,80 360,10 480,55 C600,100 720,20 840,65 C960,110 1200,30 1440,50 L1440,500 L0,500 Z',
    ribbon:    'M0,70 C360,10 720,130 1080,70 C1260,40 1380,90 1440,65 L1440,500 L0,500 Z',
    mountain:  'M0,100 L200,30 L360,80 L520,15 L720,60 L900,10 L1080,50 L1260,20 L1440,45 L1440,500 L0,500 Z',
  };
  const sectionBlobPath = SECTION_BLOB_PATHS[curve];

  return { heroPatternSvg, sectionBorderSvg, cornerFlourishSvg, medallionSvg, heroBlobSvg, accentBlobSvg, sectionBlobPath };
}

// — Gemini-powered skin generation ——————————————————————————————————————————————————————————————————
// Called once per site generation, cached in manifest.vibeSkin.
// Returns a full VibeSkin including custom AI SVG art.

// Pass 2 (VibeSkin + custom SVG art) uses Gemini 3.1 Pro — SVG precision + visual creativity
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent';
// Couple DNA extraction uses Flash-Lite — lightweight extraction task
const GEMINI_LITE_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent';

// Structured profile of the couple's personal world, extracted from their story
export interface CoupleProfile {
  pets: string[];         // e.g. ["2 cats named Luna and Mochi", "golden retriever named Bear"]
  interests: string[];    // e.g. ["hiking", "vinyl records", "Italian cooking"]
  locations: string[];    // e.g. ["Brooklyn", "Amalfi Coast", "coffee shop in Portland"]
  motifs: string[];       // recurring objects/symbols: ["sunsets", "coffee", "train rides"]
  heritage: string[];     // cultural background: ["Mexican", "Japanese"]
  illustrationPrompt: string; // 1–2 sentence description for generating the hero illustration
}

export interface VibeSkinContext {
  chapters?: Array<{
    title: string;
    subtitle: string;
    mood: string;
    location?: { label: string } | null;
    description: string;
  }>;
  inspirationUrls?: string[];  // Pinterest/inspiration image URLs
  photoUrls?: string[];        // Representative photo URLs from the couple's actual uploads
  coupleProfile?: CoupleProfile; // Extracted personal elements for bespoke illustration
}

// — Extract couple DNA from vibeString + chapters ——————————————————————————————————————————————————
export async function extractCoupleProfile(
  vibeString: string,
  chapters: Array<{ title: string; description: string; mood: string }>,
  apiKey: string,
  occasion?: string,
  clusterNotes?: Array<{ note: string; location: string | null }>
): Promise<CoupleProfile> {
  const storyText = chapters.map(c => `"${c.title}": ${c.description}`).join('\n');
  const notesText = clusterNotes && clusterNotes.length > 0
    ? '\n\nUSER PHOTO NOTES (personal details the user added — highest priority for extraction):\n' +
      clusterNotes.map((cn, i) => `- ${cn.location ? `[${cn.location}] ` : ''}${cn.note}`).join('\n')
    : '';

  const occasionDNAHints: Record<string, string> = {
    wedding: `Also extract: ceremony location, proposal location if mentioned, honeymoon destination if mentioned.`,
    anniversary: `Also extract: the number of years together, how long they've been married, any mentioned milestones, places they've lived or traveled together over the years.`,
    birthday: `Also extract: the birthday person's name, their age, their passions/hobbies, any mentioned life achievements or milestones.`,
    engagement: `Also extract: proposal location, how the proposal happened, ring description if mentioned, how long they dated before engagement.`,
    story: `Extract all personal places, interests, pets, and defining moments from their life together.`,
  };
  const dnaHint = occasionDNAHints[occasion || 'wedding'] || occasionDNAHints.wedding;

  const prompt = `Given this couple's vibe and story, extract their unique personal elements as JSON.

VIBE:
${vibeString}

STORY CHAPTERS:
${storyText}${notesText}

OCCASION-SPECIFIC EXTRACTION NOTES: ${dnaHint}

Return ONLY this JSON (no extra text, no markdown):
{
  "pets": [],
  "interests": [],
  "locations": [],
  "motifs": [],
  "heritage": [],
  "illustrationPrompt": "1-2 sentences describing what to draw to represent this couple's world. Be specific and visual. E.g.: 'Two cats (one orange tabby, one black) intertwined with vinyl records and coffee cups, surrounded by Brooklyn cityscape silhouettes.' or 'Hiking trails winding through mountain peaks with pine trees and star constellations above, a dog's paw print trail below.'"
}

Rules:
- pets: include animal type, quantity, and names if mentioned. Empty array if none.
- interests: max 5 most visually representable hobbies/interests
- locations: specific named places only (not generic "a coffee shop")
- motifs: recurring objects, themes, or symbols that could be illustrated
- heritage: cultural backgrounds if clearly mentioned, else empty
- illustrationPrompt: make it visually specific, richly detailed, and drawable as SVG lineart`;

  try {
    // Couple DNA extraction uses Flash-Lite — lightweight JSON extraction, no creativity needed
    const res = await fetch(
      `${GEMINI_LITE_URL}?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }),
      }
    );
    if (!res.ok) return { pets: [], interests: [], locations: [], motifs: [], heritage: [], illustrationPrompt: '' };
    const json = await res.json();
    const raw = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleaned) as CoupleProfile;
  } catch {
    return { pets: [], interests: [], locations: [], motifs: [], heritage: [], illustrationPrompt: '' };
  }
}

export async function generateVibeSkin(
  vibeString: string,
  apiKey?: string,
  coupleNames?: [string, string],
  context?: VibeSkinContext,
  occasion?: string
): Promise<VibeSkin> {
  if (!apiKey) return deriveFallback(vibeString);

  // Extract occasion-specific numeric details from the vibe string
  const anniversaryMatch = vibeString.match(/ANNIVERSARY:\s*(\d+)\s*years/i);
  const anniversaryYears = anniversaryMatch ? parseInt(anniversaryMatch[1], 10) : 0;
  const birthdayMatch = vibeString.match(/BIRTHDAY:.*?(\d+)(?:th|st|nd|rd)?\s*birthday/i);
  const birthdayAge = birthdayMatch ? birthdayMatch[1] : '';

  const occasionVisualGuidance: Record<string, string> = {
    wedding: `OCCASION: Wedding.
    SYMBOLIC MOTIFS to consider: rings, florals, vows, unity candles, champagne,
    doves, infinity symbols, intertwined initials, wedding arches, veils.
    PARTICLE suggestions: petals, confetti, bubbles, fireflies.
    COLOR DIRECTION: romantic, aspirational — pinks/creams/golds/whites for classic;
    deep jewel tones for dramatic; sage/terracotta for bohemian.
    TONE: Should feel timeless, romantic, celebratory but not garish.`,

    anniversary: `OCCASION: Anniversary celebration (${anniversaryYears ? `${anniversaryYears} years together` : 'milestone year'}).
    SYMBOLIC MOTIFS to consider: intertwined circles/rings, spirals (representing years),
    infinity symbols, the number of years (e.g. "${anniversaryYears || '?'}"), pressed flowers,
    a tree with deep roots, wine glasses, candle flames.
    ${anniversaryYears >= 25 ? 'MILESTONE: This is a major anniversary. Use richer, more luxurious visual language — gold, deep jewel tones, something that feels earned and magnificent.' : ''}
    PARTICLE suggestions: fireflies, sakura, stars (feel contemplative, warm).
    COLOR DIRECTION: warmer and richer than a first-wedding — deeper, more mature palette.
    More amber, cognac, deep rose, forest green. Less pastel.
    TONE: Nostalgic warmth, depth, the beauty of time passing.`,

    birthday: `OCCASION: Birthday celebration${birthdayAge ? ` — turning ${birthdayAge}` : ''}.
    SYMBOLIC MOTIFS to consider: stars, candles, balloons (tasteful), confetti,
    champagne, flowers, ribbon, the number ${birthdayAge || ''},
    gifts/bows (elegant version), sparklers, fireworks.
    ${birthdayAge && [30,40,50,60,70,80].includes(parseInt(birthdayAge)) ? `MILESTONE: This is a ${birthdayAge}th birthday! Make it feel BIG and celebratory. Bold, vibrant, joyful.` : ''}
    PARTICLE suggestions: confetti, stars, sparkles, bubbles.
    COLOR DIRECTION: Joyful and celebratory. Can be more vibrant than a wedding.
    Think champagne gold, coral, jewel tones, or the person's favourite colors from the vibe.
    TONE: Joyful, warm, celebratory, uplifting. This should make someone smile immediately.`,

    engagement: `OCCASION: Engagement announcement / celebration.
    SYMBOLIC MOTIFS to consider: rings (especially solitaire/oval/round shapes),
    diamonds, sparkle/light refractions, champagne, roses,
    "YES", hearts (tasteful), keys, locks, doors opening.
    PARTICLE suggestions: stars, sparkles, petals — feel electric and magical.
    COLOR DIRECTION: Fresh and bright with romantic undertones.
    Blush, rose gold, champagne, white, or electric jewel tones (sapphire, emerald).
    TONE: Electric excitement, romantic electricity, the thrill of "what's next".
    Should feel like the best news ever just happened.`,

    story: `OCCASION: Personal love story / memory site (no specific event).
    SYMBOLIC MOTIFS: Drawn entirely from the couple's story and photos.
    No event-specific symbols. Focus on personal motifs from their DNA (pets, places, interests).
    PARTICLE suggestions: leaves, petals, fireflies, stars — soft and personal.
    COLOR DIRECTION: Entirely emotion and photo-driven. Let the vibe string guide.
    TONE: Intimate, literary, personal. This is a private world.`,
  };

  const visualGuidance = occasionVisualGuidance[occasion || 'wedding'] || occasionVisualGuidance.wedding;

  const namesContext = coupleNames
    ? `The couple is ${coupleNames[0]} & ${coupleNames[1]}.`
    : '';

  const storyContext = context?.chapters?.length
    ? `
STORY CONTEXT (use this to deeply inform the visual identity):
The couple's story has these chapters:
${context.chapters.map(c => `- "${c.title}" — ${c.mood} mood, ${c.location?.label || 'no specific location'}: ${c.description}`).join('\n')}

Key moods detected: ${[...new Set(context.chapters.map(c => c.mood))].join(', ')}
Key locations: ${[...new Set(context.chapters.map(c => c.location?.label).filter(Boolean))].join(', ') || 'not specified'}
`
    : '';

  const profile = context?.coupleProfile;
  const coupleProfileContext = profile ? `
## COUPLE DNA — MANDATORY ILLUSTRATION BRIEF
${profile.pets.length ? `PETS: ${profile.pets.join(', ')}` : ''}
${profile.interests.length ? `INTERESTS: ${profile.interests.join(', ')}` : ''}
${profile.locations.length ? `KEY PLACES: ${profile.locations.join(', ')}` : ''}
${profile.motifs.length ? `VISUAL MOTIFS: ${profile.motifs.join(', ')}` : ''}
${profile.heritage.length ? `CULTURAL HERITAGE: ${profile.heritage.join(', ')}` : ''}
ILLUSTRATION PROMPT: ${profile.illustrationPrompt}

KEY MOTIFS: ${[...profile.pets, ...profile.interests, ...profile.motifs].filter(Boolean).join(', ') || 'see illustration prompt above'}
The hero illustration MUST reference these elements. If they have cats, draw cats. If Coco/marigold inspiration, draw marigolds and papel picado. If pets are mentioned, those animals must appear prominently.

SVG ART RULES — READ CAREFULLY:
- heroBlobSvg: Draw "${profile.illustrationPrompt}". Use this as the LITERAL subject matter. If they have cats, draw actual cat silhouettes in elegant poses. If they love hiking, draw mountain peaks and winding trails. If they mention vinyl records, draw record discs with musical notes. Fill 70%+ of the 500×700 canvas with THESE SPECIFIC ELEMENTS.
- heroPatternSvg: Use their world as the repeating element. Cats → small paw prints and whisker curves. Music → staff lines and notes. Hiking → tiny mountain peaks. Coffee → coffee cup outlines. Heritage-inspired → cultural patterns.
- chapterIcons: Generate one small SVG icon (80×80) per chapter that visually represents THAT CHAPTER's content. A chapter about "meeting at a coffee shop" gets a coffee cup. A chapter about "our first hike" gets a mountain peak. An anniversary chapter gets intertwined rings. Make each icon feel hand-crafted and specific.
` : '';

  const chapterIconsPrompt = context?.chapters?.length
    ? `  "chapterIcons": [${context.chapters.map(c =>
        `"<FULL SVG for chapter '${c.title}': Simple, elegant line-art icon 80×80 that represents '${c.description.slice(0, 80)}...'. 1-3 thematic elements. stroke only, no fill. Use accent color. viewBox='0 0 80 80'. Complete <svg>...</svg> on one line.>"`
      ).join(', ')}],`
    : '  "chapterIcons": [],';

  const inspirationDirective = context?.inspirationUrls?.length
    ? `🚨 CRITICAL VISUAL DIRECTIVE — READ THIS FIRST:
The couple has provided ${context.inspirationUrls.length} inspiration image(s). These images ARE THE DESIGN.
You MUST extract the EXACT colors from these images and use them as the palette.
DO NOT use generic wedding colors. DO NOT use ivory/beige/sage defaults.
Extract the 5-6 most dominant/vibrant colors from these images and use them directly.
If the images show: hot pink → palette.accent = that exact hot pink.
If the images show: marigold gold → palette.accent2 = that exact marigold.
If the images show: deep navy → palette.ink = that exact navy.
This is NON-NEGOTIABLE. The inspiration images override everything else.

`
    : '';

  const prompt = `${inspirationDirective}You are a world-class wedding visual designer AND SVG artist for Pearloom, a premium wedding website platform.
${namesContext}
The couple's vibe is: "${vibeString}"

## OCCASION VISUAL DIRECTION — READ BEFORE DESIGNING
${visualGuidance}

${storyContext}
${coupleProfileContext}
Your job: design a COMPLETELY UNIQUE visual identity for this specific couple. Every SVG illustration should reflect THEIR actual world — their pets, interests, places, and story. No two sites should ever look the same.

## MANDATORY COLOR RULE — READ FIRST
If the vibe string contains "Color inspiration:" with hex values (e.g. "#E84393, #F8C000"), those are the couple's CHOSEN colors. You MUST build the palette from those exact hex values. Do NOT substitute muted or desaturated alternatives. If the inspiration images show vibrant colors, use them vibrantly. The couple's explicit choice OVERRIDES everything below.

## COLOR RULES
- If inspiration images are provided, use THEIR exact colors — vibrant, saturated, bold if that's what they show.
- A Coco/Day of the Dead inspired site should use: hot pink #E84393, marigold #F8C000, deep navy #1A1A5E, warm gold #F5A623.
- A festival/fiesta inspired site should be COLORFUL not beige.
- Only default to muted/elegant if NO inspiration images are provided and the vibe string uses soft/minimal language.
- If vibeString has vibrant/festive/colorful/bold keywords OR bright hex colors: use FULL SATURATION. Embrace it.
- If vibeString has words like minimal/clean/subtle/soft (and no inspiration images): prefer desaturated tones.
- Analogous color schemes work well, but analogous doesn't mean dull.
- When in doubt: trust the hex colors and inspiration images over generic defaults.

## TONE-TO-PALETTE MAPPING
Read the actual emotional tone words in the vibe and derive the palette from them:
- "dreamy moonlight celestial" → cool silvers, deep navy (#0d1b2a), soft lavender (#c8c0d8), foreground: #e8e4f0
- "garden botanical greenery" → sage greens (#5a7a5a), warm cream (#f5f0e8), terracotta (#c4714a), bg: #eef2eb
- "rustic vineyard tuscany" → warm terracotta (#b5633a), dusty rose (#d4a086), aged gold (#c4a24a), bg: #f4ede6
- "beach coastal waves" → sea glass teal (#4a9b8e), sandy beige (#f0e8d8), driftwood gray (#8a8278), bg: #eef4f2
- "modern minimalist clean" → warm off-white (#f2ede6), charcoal (#1a1a1a), single accent (your choice), bg: #f5f0e8
- "whimsical fairytale enchanted" → dusty rose (#c48090), forest green (#4a6a4a), antique gold (#b89a4a), bg: #f5ece8
- "dark romantic gothic" → deep burgundy (#6a1a2a), black (#0d0d0d), silver (#b0b0b8), bg: #1a1014
- "art deco roaring twenties" → black (#0d0d0d), gold (#c4a438), cream (#f5f0e0), bg: #0d0d0d
- "wildflower meadow boho" → lavender (#9a84b4), sage (#7a9a6a), terracotta (#b4724a), cream (#f5f0e4), bg: #f0ece4
- "japanese zen cherry" → blush (#e8bcc0), white (#f5f2f0), charcoal (#2a2828), bamboo green (#6a8a68), bg: #f8f4f2
- "vibrant festival fiesta colorful bold celebration" → hot pink (#E84393), golden yellow (#F8C000), deep orange (#F5841F), deep navy (#2A2690), bg: #FFF5F8
- "tropical neon pop maximalist" → electric teal (#00C9B1), hot pink (#FF4D8D), deep violet (#3D0066), lime (#B8F400), bg: #0A0A1A
- "warm festive mexican boho colorful" → terracotta (#C45C1A), magenta (#D4225A), golden (#F5A800), cobalt (#1A3A8F), bg: #FFF8F0

## SECTION LABEL GUIDANCE
Avoid generic defaults. Use personality-driven labels:
- story: "How We Fell" / "The Chapter" / "Our Beginning" / "How It Started"
- events: "The Celebration" / "Join Us" / "The Day" / "Mark Your Calendar"
- registry: "Wish List" / "Gift Guide" / "The Registry" / "Help Us Celebrate"
- travel: "Finding Us" / "Getting There" / "The Journey Here" / "Plan Your Trip"
- faqs: "What to Know" / "Your Questions" / "Things We Get Asked" / "Need to Know"
- rsvp: "Will You Be There?" / "Save a Seat" / "Let Us Know" / "RSVP With Love"

## FONT PAIRINGS (choose one that matches the aesthetic)
- Classic romantic: Cormorant Garamond + Raleway
- Modern minimal: DM Serif Display + DM Sans
- Art Nouveau: Playfair Display + Josefin Sans
- Rustic: Abril Fatface + Nunito
- Japanese-inspired: Noto Serif JP + Noto Sans JP
- Coastal: Libre Baskerville + Karla
- Celestial: Cinzel + Lato
- Bohemian: Crimson Text + Cabin
- Vintage: Rokkitt + Source Sans Pro
- Modern luxury: Bodoni Moda + Inter
- Handcrafted: Satisfy + Open Sans
- Garden: Fraunces + Mulish
- Editorial: EB Garamond + Outfit
- Architectural: Tenor Sans + Source Sans 3

Return ONLY this JSON. All SVG strings must be valid JSON-escaped strings:
{
  "curve": "<one of: organic | arch | geometric | wave | petal | cascade | ribbon | mountain>",
  "particle": "<one of: petals | stars | bubbles | leaves | confetti | snowflakes | fireflies | sakura>",
  "accentShape": "<one of: ring | arch | diamond | leaf | infinity>",
  "sectionEntrance": "<one of: fade-up | bloom | drift | float | reveal>",
  "texture": "<one of: none | linen | floral | marble | bokeh | starfield | paper>",
  "headingStyle": "<one of: italic-serif | uppercase-tracked | thin-elegant | bold-editorial | script-like>",
  "cardStyle": "<one of: glass | solid | outlined | minimal | elevated>",
  "decorIcons": ["<5 creative unicode chars specific to this couple's world>"],
  "accentSymbol": "<single elegant unicode symbol — their primary visual motif>",
  "particleColor": "<hex color for ambient particles>",
  "sectionGradient": "<CSS linear-gradient using 2-3 palette colors — e.g. 'linear-gradient(135deg, #f5ede4 0%, #fdf9f5 60%, #ede8e0 100%)'>",
  "palette": {
    "background": "<primary page bg hex — NEVER plain white. Derive from tone mapping above>",
    "foreground": "<text color hex — must contrast strongly with background>",
    "accent": "<primary accent hex — bold, vibrant, emotionally tied to their vibe>",
    "accent2": "<secondary accent hex — softer complementary tone>",
    "card": "<card/section bg hex — slightly different from page bg for depth>",
    "muted": "<muted text hex for captions/timestamps>",
    "highlight": "<hover/selected states — a contrasting, emotionally charged color>",
    "subtle": "<very light tint, barely different from bg, for section alternation>",
    "ink": "<darkest possible tone for headings and max-contrast text — near-black>"
  },
  "fonts": {
    "heading": "<Google Fonts heading font name — use the FONT PAIRINGS list above to match the vibe>",
    "body": "<Google Fonts body font name — the matching pair>"
  },
  "sectionLabels": {
    "story": "<personality-driven label from SECTION LABEL GUIDANCE above>",
    "events": "<label>",
    "registry": "<label>",
    "travel": "<label>",
    "faqs": "<label>",
    "rsvp": "<warm personal RSVP invitation in the couple's voice>",
    "photos": "<label for the photos section, e.g. 'Our Moments' or 'Our Photos'>"
  },
  "dividerQuote": "<Write a single original poetic phrase (6-10 words MAXIMUM) that is short, lyrical, and emotionally specific to this couple. Evoke their vibe — a place, a feeling, a moment. Think of it as a whispered caption, not a full sentence. NOT a cliche. Examples of good length: 'Where the sea met us first', 'Fog-laced mornings and tangled roots', 'Every city led back to you'>",
  "tone": "<one of: dreamy | playful | luxurious | wild | intimate | cosmic | rustic>",
  "heroPatternSvg": "<FULL SVG: subtle repeating bg pattern. viewBox='0 0 200 200'. 8-12 thematic elements. All opacities 0.06-0.15. Use the accent color. Complete <svg>...</svg> on one line.>",
  "sectionBorderSvg": "<FULL SVG: ornamental border strip. viewBox='0 0 800 40'. Wavy or foliate line with motifs. Complete <svg>...</svg> on one line.>",
  "cornerFlourishSvg": "<FULL SVG: corner bracket ornament. viewBox='0 0 80 80'. Art Nouveau style. Complete <svg>...</svg> on one line.>",
  "medallionSvg": "<FULL SVG: circular ornament for section headers. viewBox='0 0 120 120'. Complete <svg>...</svg> on one line.>",
  "heroBlobSvg": "<FULL SVG: viewBox='0 0 500 700'. THIS MUST ILLUSTRATE THE COUPLE'S ACTUAL WORLD. If they have cats: draw 4-6 elegant cat silhouettes in different poses scattered throughout. If they love hiking: draw mountain peaks, trails, pine trees. If they mention vinyl: draw record discs, musical notes, a turntable. If they mention a city: draw that city's skyline. Use the illustrationPrompt above as your exact brief. 20-30 elements. Fill 70%+ of canvas. Use ONLY accent color. Opacity 0.12-0.25. Complete <svg>...</svg> on one line.>",
  "accentBlobSvg": "<FULL SVG: organic decorative shape for section backgrounds. viewBox='0 0 600 400'. One large irregular polygon blob fill (opacity 0.07) PLUS concentric rings (stroke, opacity 0.08-0.14) and 6 radial accent dots (opacity 0.20). Used layered behind section content. Complete <svg>...</svg> on one line.>",
  "sectionBlobPath": "<SVG path string ONLY — no svg tags. Organic full-width top edge for section containers. ViewBox coords 0 0 1440 500. Match the 'curve' choice: cascade=multi-cascade beziers, ribbon=wide sinusoid, mountain=sharp peaks, organic=flowing beziers, arch=smooth arcs, wave=rhythmic waves, petal=petal scallops, geometric=sharp zigzag.>",
  "chapterColors": ["<hex tint per chapter — e.g. beach chapter → '#E8F4F8', golden hour → '#FDF0E0', forest → '#EAF2E8', night → '#1A1A2E'. One entry per chapter. These are applied as very subtle (3-5% opacity) background washes on each story section.>"],
  ${chapterIconsPrompt}
}

CRITICAL DESIGN RULES:
1. palette.background: NEVER #ffffff or any pure white. Use the TONE-TO-PALETTE MAPPING above.
2. fonts: MUST use the FONT PAIRINGS list. Match the aesthetic boldly — Cinzel for celestial, Satisfy for handcrafted, Bodoni Moda for luxury.
3. SVGs: each must be a single line string. Use spaces between tags, escaped quotes.
4. SVG opacities: 0.06-0.20 only — ultra subtle, never solid.
5. decorIcons: thematically specific (botanical, celestial, nautical, architectural) — NOT generic hearts.
6. dividerQuote: MUST be 6-10 words maximum. Short, poetic, specific to this couple's vibe. Never a generic love quote.
7. All 9 palette colors must form a cohesive, premium visual system. Prefer analogous schemes with one contrasting accent.
8. heroBlobSvg: MUST illustrate the couple's actual world using the COUPLE DNA above. Not generic branches. Draw their pets, hobbies, locations. Fill 70%+ of the 500x700 canvas.
16. chapterIcons: Each icon must be specific to that chapter's content — not generic. A coffee chapter = coffee cup. A travel chapter = airplane or map. A proposal chapter = ring. Simple, elegant, 3-5 stroke elements max per icon.
9. accentBlobSvg: The blob polygon must be irregular and organic, filling ~60% of canvas.
10. sectionBlobPath: Match curve type exactly — cascade/ribbon/mountain have distinct geometries.
11. headingStyle: italic-serif for romantic, uppercase-tracked for minimal/luxury, script-like for handcrafted, bold-editorial for modern, thin-elegant for art deco.
12. cardStyle: glass for dreamy/cosmic, elevated for luxurious, outlined for minimal, solid for rustic, minimal for zen.
13. sectionGradient: use palette.subtle → palette.card → palette.background for a gentle wash.
14. curve / wavePath: The wave dividers between sections should be GENTLE and SUBTLE. Prefer: ribbon (wide sinusoid), arch (smooth arc), organic (soft flowing). Reserve mountain/geometric for bold/modern vibes. The rendered height is max 80px — the SVG path coords should reflect gentle height changes, NOT dramatic peaks.
15. RESPECT THE BRIEF: If the couple chose vibrant hex colors or submitted vibrant inspiration images, USE THOSE COLORS at full saturation. Do not desaturate or mute colors that the couple chose. A Coco / festival / fiesta vibe should look like hot pink, deep navy, and golden yellow — not dusty rose and cream. Serve the couple's actual vision.`;

  try {
    // Fetch inspiration images as base64 inline_data parts
    const imageParts = await Promise.all(
      (context?.inspirationUrls || []).slice(0, 4).map(async (url) => {
        try {
          const imgRes = await fetch(url);
          if (!imgRes.ok) return null;
          const buf = await imgRes.arrayBuffer();
          const b64 = Buffer.from(buf).toString('base64');
          const mime = imgRes.headers.get('content-type') || 'image/jpeg';
          return { inlineData: { mimeType: mime, data: b64 } };
        } catch { return null; }
      })
    ).then(parts => parts.filter((p): p is { inlineData: { mimeType: string; data: string } } => p !== null));

    // Build multimodal parts array — inspiration images come BEFORE the text prompt so the model sees them first
    const parts: Record<string, unknown>[] = [];

    if (imageParts.length > 0) {
      parts.push({ text: `INSPIRATION IMAGES (HIGHEST PRIORITY — ${imageParts.length} image(s) follow): Extract the EXACT dominant colors from these images. They ARE the palette. Do NOT soften or desaturate. These images OVERRIDE all tone mapping defaults.` });
      parts.push(...imageParts);
    }

    // Text prompt comes after inspiration images
    parts.push({ text: prompt });

    // Add representative photos from the couple's actual uploads
    if (context?.photoUrls?.length) {
      parts.push({ text: `\n\nCOUPLE'S ACTUAL PHOTOS: These images are from the couple's real photo collection. Extract the dominant color palette, lighting style (warm/cool/neutral), and overall aesthetic (film/digital, bright/moody, candid/posed). The visual identity MUST harmonize with these photos.\n` });

      for (const url of context.photoUrls.slice(0, 3)) {
        try {
          const resp = await fetch(url);
          if (resp.ok) {
            const arrayBuffer = await resp.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString('base64');
            const contentType = resp.headers.get('content-type') || 'image/jpeg';
            parts.push({ inlineData: { mimeType: contentType, data: base64 } });
          }
        } catch {
          // Skip failed image fetches silently
        }
      }
    }

    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 1.0,
          maxOutputTokens: 12000,
          responseMimeType: 'application/json',
        },
      }),
    });

    const data = await res.json();
    const raw = (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim()
      .replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsed = JSON.parse(raw) as any;

    const VALID_CURVES: VibeSkin['curve'][] = ['organic', 'arch', 'geometric', 'wave', 'petal', 'cascade', 'ribbon', 'mountain'];
    const VALID_PARTICLES: VibeSkin['particle'][] = ['petals', 'stars', 'bubbles', 'leaves', 'confetti', 'snowflakes', 'fireflies', 'sakura'];
    const VALID_SHAPES: VibeSkin['accentShape'][] = ['ring', 'arch', 'diamond', 'leaf', 'infinity'];
    const VALID_ENTRANCES: VibeSkin['sectionEntrance'][] = ['fade-up', 'bloom', 'drift', 'float', 'reveal'];
    const VALID_TEXTURES: VibeSkin['texture'][] = ['none', 'linen', 'floral', 'marble', 'bokeh', 'starfield', 'paper'];
    const VALID_TONES: VibeSkin['tone'][] = ['dreamy', 'playful', 'luxurious', 'wild', 'intimate', 'cosmic', 'rustic'];
    const VALID_HEADING_STYLES: VibeSkin['headingStyle'][] = ['italic-serif', 'uppercase-tracked', 'thin-elegant', 'bold-editorial', 'script-like'];
    const VALID_CARD_STYLES: VibeSkin['cardStyle'][] = ['glass', 'solid', 'outlined', 'minimal', 'elevated'];

    const curve: VibeSkin['curve'] = VALID_CURVES.includes(parsed.curve) ? parsed.curve : 'organic';
    const waveDef = WAVE_PATHS[curve];
    const accentForFallback = typeof parsed.palette?.accent === 'string' && parsed.palette.accent.startsWith('#')
      ? parsed.palette.accent : '#A3B18A';
    const fallbackArt = buildFallbackArt(accentForFallback, curve);

    // Extract and validate SVG fields — fall back to deterministic art if invalid
    const resolvesvg = (field: string): string => {
      const raw = typeof parsed[field] === 'string' ? parsed[field] : null;
      if (raw) {
        const svg = extractSvgFromField(raw);
        if (svg && isValidSvg(svg)) return svg;
      }
      return fallbackArt[field as keyof typeof fallbackArt] as string;
    };

    const hexOrDefault = (val: unknown, def: string): string =>
      typeof val === 'string' && val.startsWith('#') ? val : def;

    const bgColor = hexOrDefault(parsed.palette?.background, '#F5F1E8');
    const fgColor = hexOrDefault(parsed.palette?.foreground, '#2B2B2B');
    const accentColor = hexOrDefault(parsed.palette?.accent, '#A3B18A');
    const accent2Color = hexOrDefault(parsed.palette?.accent2, '#D6C6A8');
    const cardColor = (typeof parsed.palette?.card === 'string' &&
      (parsed.palette.card.startsWith('#') || parsed.palette.card.startsWith('rgba')))
      ? parsed.palette.card : '#FDFAF4';
    const mutedColor = hexOrDefault(parsed.palette?.muted, '#9A9488');
    const highlightColor = hexOrDefault(parsed.palette?.highlight, accentColor);
    const subtleColor = hexOrDefault(parsed.palette?.subtle, bgColor);
    const inkColor = hexOrDefault(parsed.palette?.ink, '#1C1C1C');

    return {
      curve,
      particle: VALID_PARTICLES.includes(parsed.particle) ? parsed.particle : 'petals',
      accentShape: VALID_SHAPES.includes(parsed.accentShape) ? parsed.accentShape : 'ring',
      sectionEntrance: VALID_ENTRANCES.includes(parsed.sectionEntrance) ? parsed.sectionEntrance : 'fade-up',
      texture: VALID_TEXTURES.includes(parsed.texture) ? parsed.texture : 'none',
      headingStyle: VALID_HEADING_STYLES.includes(parsed.headingStyle) ? parsed.headingStyle : 'italic-serif',
      cardStyle: VALID_CARD_STYLES.includes(parsed.cardStyle) ? parsed.cardStyle : 'elevated',
      sectionGradient: typeof parsed.sectionGradient === 'string' && parsed.sectionGradient.startsWith('linear-gradient')
        ? parsed.sectionGradient
        : `linear-gradient(135deg, ${subtleColor} 0%, ${cardColor} 100%)`,
      decorIcons: Array.isArray(parsed.decorIcons) && parsed.decorIcons.length > 0
        ? parsed.decorIcons.slice(0, 5)
        : ['✦', '•', '◦', '✧', '·'],
      accentSymbol: typeof parsed.accentSymbol === 'string' ? parsed.accentSymbol : '✦',
      particleColor: hexOrDefault(parsed.particleColor, accent2Color),
      sectionLabels: (() => {
        // Occasion-aware fallback labels — used when Gemini doesn't provide custom labels
        const occ = occasion || 'wedding';
        const occasionDefaults: Record<string, Partial<Record<string, string>>> = {
          birthday: { story: 'About Me', events: 'The Party', registry: 'Wish List', photos: 'Birthday Photos' },
          anniversary: { story: 'Our Journey', events: 'The Anniversary', registry: 'Wish List', photos: 'Through the Years', rsvp: 'Join Us' },
          engagement: { story: 'Our Beginning', events: 'The Engagement', photos: 'Our Photos' },
          story: { story: 'Our Story', events: 'Our Moments', photos: 'Our Photos' },
        };
        const d = occasionDefaults[occ] || {};
        return {
          story: parsed.sectionLabels?.story || d.story || 'How We Fell',
          events: parsed.sectionLabels?.events || d.events || 'The Celebration',
          registry: parsed.sectionLabels?.registry || d.registry || 'Gift Guide',
          travel: parsed.sectionLabels?.travel || 'Getting There',
          faqs: parsed.sectionLabels?.faqs || 'What to Know',
          rsvp: parsed.sectionLabels?.rsvp || d.rsvp || 'Will You Be There?',
          photos: parsed.sectionLabels?.photos || d.photos || 'Our Photos',
        };
      })(),
      dividerQuote: typeof parsed.dividerQuote === 'string' ? parsed.dividerQuote : vibeString,
      cornerStyle: CORNER_STYLES[curve],
      tone: VALID_TONES.includes(parsed.tone) ? parsed.tone : 'dreamy',
      palette: {
        background: bgColor,
        foreground: fgColor,
        accent: accentColor,
        accent2: accent2Color,
        card: cardColor,
        muted: mutedColor,
        highlight: highlightColor,
        subtle: subtleColor,
        ink: inkColor,
      },
      fonts: {
        heading: (typeof parsed.fonts?.heading === 'string' && parsed.fonts.heading.length > 0) ? parsed.fonts.heading : 'Playfair Display',
        body:    (typeof parsed.fonts?.body === 'string' && parsed.fonts.body.length > 0)       ? parsed.fonts.body    : 'Inter',
      },
      wavePath: waveDef.d,
      wavePathInverted: waveDef.di,
      heroPatternSvg: resolvesvg('heroPatternSvg'),
      sectionBorderSvg: resolvesvg('sectionBorderSvg'),
      cornerFlourishSvg: resolvesvg('cornerFlourishSvg'),
      medallionSvg: resolvesvg('medallionSvg'),
      heroBlobSvg: resolvesvg('heroBlobSvg'),
      accentBlobSvg: resolvesvg('accentBlobSvg'),
      sectionBlobPath: typeof parsed.sectionBlobPath === 'string' && parsed.sectionBlobPath.startsWith('M')
        ? parsed.sectionBlobPath
        : fallbackArt.sectionBlobPath,
      chapterIcons: Array.isArray(parsed.chapterIcons)
        ? parsed.chapterIcons.map((raw: unknown) => {
            if (typeof raw !== 'string') return null;
            const svg = extractSvgFromField(raw);
            return svg && isValidSvg(svg) ? svg : null;
          }).filter(Boolean) as string[]
        : [],
      chapterColors: Array.isArray(parsed.chapterColors)
        ? parsed.chapterColors.map((c: unknown) =>
            typeof c === 'string' && c.startsWith('#') ? c : null
          ).filter(Boolean) as string[]
        : [],
      aiGenerated: true,
    };
  } catch (err) {
    logWarn('[VibeEngine] Gemini skin generation failed, using fallback:', err);
    return deriveFallback(vibeString);
  }
}

// ── Pass 2.5: Raster Art Generation (Nano Banana Pro) ────────────────────────
// Generates a beautiful AI-painted hero art panel + ambient background art
// tuned to the couple's specific vibe, palette, and occasion.
// Uses gemini-3-pro-image-preview (Nano Banana Pro) — generated once at
// site creation time, stored as base64 data URLs in vibeSkin.

const NANO_BANANA_PRO = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent';
const NANO_BANANA_2   = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent';

export interface SiteArtResult {
  heroArtDataUrl?: string;    // Full painted hero art panel (Nano Banana Pro)
  ambientArtDataUrl?: string; // Softer ambient page background (Nano Banana 2)
  artStripDataUrl?: string;   // Horizontal decorative art strip for section dividers
}

export async function generateSiteArt(
  vibeString: string,
  palette: VibeSkin['palette'],
  apiKey: string,
  occasion?: string,
  coupleNames?: [string, string]
): Promise<SiteArtResult> {

  const occ = occasion || 'wedding';
  const names = coupleNames ? `${coupleNames[0]} & ${coupleNames[1]}` : 'this couple';

  // Occasion-specific art direction
  const occasionArtDirection: Record<string, string> = {
    wedding: `Soft botanical watercolor with delicate florals — roses, peonies, eucalyptus, trailing vines. Ethereal light rays filtering through. No people, no text. Romantic and timeless. Colors should feel warm, luminous, and aspirational.`,
    anniversary: `Rich oil-painting style scene with intertwined botanical elements — mature roses, deep amber tones, golden hour light. Impressionistic brush strokes. Nostalgic and warm. No people, no text. Evokes the depth and richness of time passing together.`,
    birthday: `Joyful celebratory art with confetti, ribbons, soft bokeh lights, and festive botanicals. Energetic yet elegant. No people, no text. Should feel like a beautiful party invitation illustration — festive but refined.`,
    engagement: `Dreamy romantic painting — soft florals, sparkle/light effects, champagne tones. Electric and hopeful. No people, no text. Should feel like the moment right after "yes" — full of joy and anticipation.`,
    story: `Intimate impressionistic scene — soft light, personal motifs from nature, abstract washes of color. No people, no text. Literary and introspective. Should feel like the cover of a beautiful memoir.`,
  };

  const artDirection = occasionArtDirection[occ] || occasionArtDirection.wedding;

  // Extract key color descriptions from the palette
  const colorDesc = [
    `background: ${palette.background}`,
    `primary accent: ${palette.accent}`,
    `secondary: ${palette.accent2}`,
    `tone: ${palette.highlight}`,
  ].join(', ');

  // IMPORTANT: Since Nano Banana does not support transparent backgrounds,
  // all prompts specify the EXACT background color. CSS mask-image + mix-blend-mode
  // handles edge-blending seamlessly on the rendered site.
  const bgHex = palette.background;
  const accentHex = palette.accent;

  const heroPrompt = `Create a stunning, editorial-quality painted illustration for a ${occ} website for ${names}.

BACKGROUND: Paint this on a SOLID ${bgHex} background — this is the exact page background color. The artwork should emerge from and fade back into this background color naturally at the edges, making it feel like part of the page.

ART DIRECTION: ${artDirection}

COLOR PALETTE (stay within these exact tones — no other colors):
${colorDesc}

VIBE/MOOD: "${vibeString.slice(0, 200)}"

COMPOSITION:
- Horizontal landscape orientation
- Rich botanical/atmospheric detail in center
- Soft, painterly fade toward all four edges (the edges must match ${bgHex})
- Depth: foreground elements slightly bolder, background washed/ethereal
- No text, no faces, no people, no logos, no watermarks, no borders
- Premium editorial quality — think Kinfolk magazine, Vogue editorial, Architectural Digest`;

  const ambientPrompt = `Create a very soft, abstract atmospheric art background for a ${occ} website.

BACKGROUND: Solid ${bgHex} — the art must be painted ON this color, not over it.

Style: Subtle impressionistic wash — like morning light filtering through curtains
Colors: Extremely soft — use ${bgHex} as the dominant tone with barely-there hints of ${accentHex}
Content: Loose abstract botanical shapes, botanical brushstrokes, barely suggested flora
Opacity feel: The art should feel like it's 15% visible — transparent-looking but without actual transparency
Edges: Must fade completely back into ${bgHex} at all edges — no hard borders
No text, no faces, no people, no logos, no watermarks`;

  const artStripPrompt = `Create a narrow horizontal decorative art strip for a ${occ} website divider.

BACKGROUND: Solid ${bgHex}
Style: Watercolor botanical strip — delicate florals, leaves, stems arranged in a horizontal band
Colors: ${accentHex} and soft variants, on ${bgHex} background
Composition: Wide and narrow (aspect ratio ~8:1) — decorative horizontal band
Left and right edges must fade completely into ${bgHex}
No text, no people, no faces, no logos`;

  async function fetchImage(prompt: string, model: string): Promise<string | undefined> {
    try {
      // 25s hard timeout per image — if the model hangs, skip gracefully
      const imgController = new AbortController();
      const imgTimeout = setTimeout(() => imgController.abort(), 25_000);
      let res: Response;
      try {
        res = await fetch(`${model}?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseModalities: ['image'],
            },
          }),
          signal: imgController.signal,
        });
      } finally {
        clearTimeout(imgTimeout);
      }
      if (!res.ok) {
        logWarn(`[Site Art] Image generation returned ${res.status}`);
        return undefined;
      }
      const data = await res.json();
      const part = data.candidates?.[0]?.content?.parts?.find(
        (p: Record<string, unknown>) => p.inlineData
      );
      if (!part?.inlineData?.data) return undefined;
      return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
    } catch (err) {
      logWarn('[Site Art] Image generation failed:', err);
      return undefined;
    }
  }

  // Generate all three art pieces in parallel:
  // - Hero art: Nano Banana Pro (max quality — the showpiece)
  // - Ambient + art strip: Nano Banana 2 (faster, good enough for subtle use)
  const [heroArtDataUrl, ambientArtDataUrl, artStripDataUrl] = await Promise.all([
    fetchImage(heroPrompt, NANO_BANANA_PRO),
    fetchImage(ambientPrompt, NANO_BANANA_2),
    fetchImage(artStripPrompt, NANO_BANANA_2),
  ]);

  log(
    '[Site Art] Pass 2.5 complete —',
    heroArtDataUrl ? 'hero art ✓' : 'hero art ✗',
    ambientArtDataUrl ? 'ambient ✓' : 'ambient ✗',
    artStripDataUrl ? 'art strip ✓' : 'art strip ✗'
  );

  return { heroArtDataUrl, ambientArtDataUrl, artStripDataUrl };
}

// -- Synchronous fallback for SSR/Server Components ----------------------------
export function deriveVibeSkin(vibeString: string): VibeSkin {
  return deriveFallback(vibeString);
}

// -- React hook for client components -----------------------------------------
import { useMemo } from 'react';

export function useVibeSkin(vibeString: string | undefined, cached?: VibeSkin): VibeSkin {
  return useMemo(
    () => cached || deriveFallback(vibeString || ''),
    [vibeString, cached]
  );
}
