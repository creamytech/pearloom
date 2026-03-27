// ─────────────────────────────────────────────────────────────
// Pearloom / lib/vibe-engine.ts
// Derives a complete visual "skin" from a couple's vibeString.
// Controls: shape system, wave dividers, ambient animations,
// decorative icons/patterns unique to every couple.
// ─────────────────────────────────────────────────────────────

export interface VibeSkin {
  // Shape language
  curve: 'organic' | 'arch' | 'geometric' | 'wave' | 'petal';
  // SVG wave paths for section dividers
  wavePath: string;
  wavePathInverted: string;
  // Ambient particle / decoration type
  particle: 'petals' | 'stars' | 'bubbles' | 'leaves' | 'confetti' | 'snowflakes' | 'fireflies';
  // Decorative icon set (unicode or SVG paths)
  decorIcons: string[];
  // CSS animation variant for sections
  sectionEntrance: 'fade-up' | 'bloom' | 'drift' | 'float' | 'reveal';
  // Texture overlay hint
  texture: 'none' | 'linen' | 'floral' | 'marble' | 'bokeh' | 'starfield';
  // Section corner style (applied as border-radius)
  cornerStyle: string;
  // Accent pattern for hero / fallback decorations
  accentShape: 'ring' | 'arch' | 'diamond' | 'leaf' | 'infinity';
}

const KEYWORD_TAGS: Record<string, string[]> = {
  // Nature / outdoor
  garden: ['floral', 'organic', 'petals'],
  floral: ['floral', 'petals', 'bloom'],
  wildflower: ['floral', 'organic', 'petals', 'leaves'],
  forest: ['leaves', 'organic', 'rustic'],
  beach: ['wave', 'bubbles', 'coastal'],
  ocean: ['wave', 'bubbles', 'coastal'],
  coastal: ['wave', 'bubbles', 'coastal'],
  botanical: ['floral', 'leaves', 'organic'],
  // Celestial / night
  celestial: ['stars', 'starfield', 'mystical'],
  starry: ['stars', 'starfield', 'mystical'],
  moon: ['stars', 'mystical', 'geometric'],
  night: ['stars', 'fireflies', 'mystical'],
  magic: ['stars', 'fireflies', 'mystical'],
  galaxy: ['stars', 'starfield', 'geometric'],
  // Warm / romantic
  golden: ['golden', 'petals', 'warm'],
  sunset: ['golden', 'warm', 'petals'],
  romantic: ['petals', 'warm', 'bloom'],
  intimate: ['warm', 'bloom', 'organic'],
  honeymoon: ['petals', 'warm', 'tropical'],
  tropical: ['leaves', 'tropical', 'confetti'],
  // Luxury / formal
  luxury: ['marble', 'geometric', 'arch'],
  elegant: ['arch', 'marble', 'geometric'],
  classic: ['arch', 'geometric', 'linen'],
  blacktie: ['marble', 'geometric', 'diamonds'],
  modern: ['geometric', 'arch', 'minimal'],
  minimal: ['geometric', 'minimal', 'arch'],
  // Whimsical / fun
  whimsical: ['confetti', 'petal', 'bloom'],
  playful: ['confetti', 'bubbles', 'drift'],
  bohemian: ['leaves', 'organic', 'petals'],
  boho: ['leaves', 'organic', 'petals'],
  // Winter / cozy
  winter: ['snowflakes', 'geometric', 'starfield'],
  snow: ['snowflakes', 'geometric'],
  cozy: ['linen', 'warm', 'leaves'],
};

function scoreVibe(vibe: string): Record<string, number> {
  const lower = vibe.toLowerCase();
  const scores: Record<string, number> = {};
  for (const [keyword, tags] of Object.entries(KEYWORD_TAGS)) {
    if (lower.includes(keyword)) {
      for (const tag of tags) {
        scores[tag] = (scores[tag] || 0) + 1;
      }
    }
  }
  return scores;
}

function top(scores: Record<string, number>, keys: string[], fallback: string) {
  let best = fallback;
  let bestScore = 0;
  for (const key of keys) {
    const score = scores[key] || 0;
    if (score > bestScore) { bestScore = score; best = key; }
  }
  return best;
}

// SVG wave paths — organic curves for section dividers
const WAVE_PATHS = {
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
};

const PARTICLE_MAP: Record<string, VibeSkin['particle']> = {
  petals: 'petals',
  stars: 'stars',
  bubbles: 'bubbles',
  leaves: 'leaves',
  confetti: 'confetti',
  snowflakes: 'snowflakes',
  fireflies: 'fireflies',
};

const DECOR_ICONS: Record<string, string[]> = {
  floral: ['✿', '❀', '❁', '✾', '⚘'],
  coastal: ['🌊', '🐚', '⚓', '🌴', '✦'],
  mystical: ['✦', '✧', '☽', '⋆', '✩'],
  golden: ['✦', '◇', '•', '✧', '◦'],
  warm: ['♡', '✿', '✦', '•', '◦'],
  geometric: ['◈', '◇', '▣', '✦', '◦'],
  tropical: ['🌺', '🌿', '✦', '❀', '🌴'],
  rustic: ['✿', '✦', '•', '❧', '⚘'],
  minimal: ['·', '—', '◦', '✦', '∙'],
  marble: ['◈', '◇', '✦', '●', '○'],
};

const CORNER_STYLES: Record<string, string> = {
  organic: '2rem 4rem 2rem 4rem',
  arch: '50% 50% 1.5rem 1.5rem / 3rem 3rem 1.5rem 1.5rem',
  geometric: '0',
  wave: '1.5rem',
  petal: '40% 40% 2rem 2rem / 3rem 3rem 2rem 2rem',
  minimal: '0.75rem',
};

export function deriveVibeSkin(vibeString: string): VibeSkin {
  const scores = scoreVibe(vibeString || 'romantic');

  // Determine curve
  const curveTag = top(scores, ['floral', 'wave', 'geometric', 'organic', 'tropical', 'mystical'], 'organic');
  const curve: VibeSkin['curve'] =
    curveTag === 'floral' ? 'petal' :
    curveTag === 'wave' ? 'wave' :
    curveTag === 'geometric' || curveTag === 'marble' ? 'geometric' :
    curveTag === 'mystical' ? 'arch' : 'organic';

  // Wave paths
  const waveDef = WAVE_PATHS[curve] || WAVE_PATHS.organic;

  // Particle
  const particleKey = top(scores,
    ['petals', 'stars', 'bubbles', 'leaves', 'confetti', 'snowflakes', 'fireflies'],
    'petals'
  );
  const particle = PARTICLE_MAP[particleKey] || 'petals';

  // Texture
  const textureTag = top(scores, ['linen', 'marble', 'floral', 'starfield', 'bokeh'], 'none');
  const texture: VibeSkin['texture'] =
    textureTag === 'linen' ? 'linen' :
    textureTag === 'marble' ? 'marble' :
    textureTag === 'floral' ? 'floral' :
    textureTag === 'starfield' ? 'starfield' : 'none';

  // Decor icons
  const iconKey = top(scores,
    ['floral', 'coastal', 'mystical', 'golden', 'warm', 'geometric', 'tropical', 'rustic', 'minimal', 'marble'],
    'warm'
  );
  const decorIcons = DECOR_ICONS[iconKey] || DECOR_ICONS.warm;

  // Entrance animation
  const entranceTag = top(scores, ['bloom', 'drift', 'float', 'reveal'], 'fade-up');
  const sectionEntrance: VibeSkin['sectionEntrance'] =
    ['bloom', 'drift', 'float', 'reveal'].includes(entranceTag)
      ? entranceTag as VibeSkin['sectionEntrance']
      : 'fade-up';

  // Accent shape
  const accentShapeTag = top(scores, ['floral', 'mystical', 'geometric', 'wave', 'tropical'], 'ring');
  const accentShape: VibeSkin['accentShape'] =
    accentShapeTag === 'floral' ? 'leaf' :
    accentShapeTag === 'mystical' ? 'infinity' :
    accentShapeTag === 'geometric' ? 'diamond' :
    accentShapeTag === 'wave' ? 'arch' : 'ring';

  return {
    curve,
    wavePath: waveDef.d,
    wavePathInverted: waveDef.di,
    particle,
    decorIcons,
    sectionEntrance,
    texture,
    cornerStyle: CORNER_STYLES[curve] || '1.5rem',
    accentShape,
  };
}

// ── React hook for convenient usage ──────────────────────────────
import { useMemo } from 'react';

export function useVibeSkin(vibeString: string | undefined): VibeSkin {
  return useMemo(() => deriveVibeSkin(vibeString || ''), [vibeString]);
}
