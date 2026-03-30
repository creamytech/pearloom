// ——————————————————————————————————————————————————————————————————————————————————————————————————
// Pearloom / lib/vibe-engine/fallback.ts
// Keyword-based deterministic fallback skin derivation.
// ——————————————————————————————————————————————————————————————————————————————————————————————————

import type { VibeSkin } from './types';
import { WAVE_PATHS, CORNER_STYLES, buildFallbackArt } from './svg-library';

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

export function deriveFallback(vibeString: string): VibeSkin {
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
