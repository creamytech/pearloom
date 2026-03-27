// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Pearloom / lib/vibe-engine.ts
// Gemini-first vibe â†’ visual skin system.
// AI designs the entire aesthetic + custom SVG art from scratch.
// The keyword system is a fast fallback only.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface VibeSkin {
  // â”€â”€ Structural choices (maps to pre-built SVG variants) â”€â”€
  curve: 'organic' | 'arch' | 'geometric' | 'wave' | 'petal';
  particle: 'petals' | 'stars' | 'bubbles' | 'leaves' | 'confetti' | 'snowflakes' | 'fireflies';
  accentShape: 'ring' | 'arch' | 'diamond' | 'leaf' | 'infinity';
  sectionEntrance: 'fade-up' | 'bloom' | 'drift' | 'float' | 'reveal';
  texture: 'none' | 'linen' | 'floral' | 'marble' | 'bokeh' | 'starfield';

  // â”€â”€ AI-generated open-ended fields â”€â”€
  decorIcons: string[];      // unicode chars â€” Gemini picks freely
  accentSymbol: string;      // primary motif character
  particleColor: string;     // CSS hex
  sectionLabels: {
    story: string;
    events: string;
    registry: string;
    travel: string;
    faqs: string;
    rsvp: string;
  };
  dividerQuote: string;
  cornerStyle: string;
  tone: 'dreamy' | 'playful' | 'luxurious' | 'wild' | 'intimate' | 'cosmic' | 'rustic';

  // â”€â”€ Computed wave SVG paths â”€â”€
  wavePath: string;
  wavePathInverted: string;

  // â”€â”€ Custom AI-generated SVG art (baked at generation time) â”€â”€
  // Small repeating hero background pattern (viewBox 200x200)
  heroPatternSvg?: string;
  // Horizontal decorative border strip between sections (viewBox 800x40)
  sectionBorderSvg?: string;
  // Corner bracket flourish for cards (viewBox 80x80)
  cornerFlourishSvg?: string;
  // Centered medallion/wreath ornament (viewBox 120x120)
  medallionSvg?: string;

  aiGenerated: boolean;
}

// â”€â”€ SVG Wave Paths Library â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
};

const CORNER_STYLES: Record<VibeSkin['curve'], string> = {
  organic: '2rem 4rem 2rem 4rem',
  arch: '50% 50% 1.5rem 1.5rem / 3rem 3rem 1.5rem 1.5rem',
  geometric: '0',
  wave: '1.5rem',
  petal: '40% 40% 2rem 2rem / 3rem 3rem 2rem 2rem',
};

// â”€â”€ Deterministic fallback (keyword scoring) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const KEYWORD_MAP: Record<string, Partial<VibeSkin>> = {
  garden:     { curve: 'petal',     particle: 'petals',     decorIcons: ['âœ¿','â¦','âš˜','âœ¾','âš˜'], particleColor: '#f9c6c9', tone: 'dreamy'    },
  floral:     { curve: 'petal',     particle: 'petals',     decorIcons: ['âœ¿','â¦','âš˜','âš˜','â¦¿'], particleColor: '#f3d1d8', tone: 'dreamy'    },
  wildflower: { curve: 'organic',   particle: 'petals',     decorIcons: ['âœ¿','â¦','âš˜','ðŸŒ¾','âœ¦'], particleColor: '#e8b4bc', tone: 'wild'     },
  forest:     { curve: 'organic',   particle: 'leaves',     decorIcons: ['â§±','âš˜','âœ¦','ðŸŒ¿','â¦¿'], particleColor: '#a8d5a2', tone: 'rustic'   },
  beach:      { curve: 'wave',      particle: 'bubbles',    decorIcons: ['ðŸŒŠ','ðŸš','âš“','âœ¦','â—‹'], particleColor: '#b8e0ff', tone: 'playful'  },
  ocean:      { curve: 'wave',      particle: 'bubbles',    decorIcons: ['ðŸŒŠ','â—‹','â—¯','âœ¦','âš“'], particleColor: '#9dd0f5', tone: 'dreamy'   },
  celestial:  { curve: 'arch',      particle: 'stars',      decorIcons: ['âœ¦','âœ§','â˜½','â‹†','âœ©'], particleColor: '#ffe98a', tone: 'cosmic'   },
  starry:     { curve: 'arch',      particle: 'stars',      decorIcons: ['âœ¦','â‹†','âœ©','â˜½','âœ§'], particleColor: '#fff3b0', tone: 'cosmic'   },
  night:      { curve: 'arch',      particle: 'fireflies',  decorIcons: ['âœ¦','âœ§','â‹†','â—¦','â˜½'], particleColor: '#c8ff8a', tone: 'cosmic'   },
  golden:     { curve: 'organic',   particle: 'petals',     decorIcons: ['âœ¦','â—‡','â€¢','âœ§','â—¦'],  particleColor: '#ffd966', tone: 'luxurious'},
  romantic:   { curve: 'petal',     particle: 'petals',     decorIcons: ['â™¡','âœ¿','âœ¦','â€¢','â—¦'],  particleColor: '#f9c6c9', tone: 'intimate' },
  boho:       { curve: 'organic',   particle: 'leaves',     decorIcons: ['âœ¿','âœ¦','â€¢','â§±','âš˜'], particleColor: '#c5e5c0', tone: 'wild'     },
  elegant:    { curve: 'arch',      particle: 'stars',      decorIcons: ['â—ˆ','â—‡','âœ¦','â—‰','â—‹'],  particleColor: '#fff9e6', tone: 'luxurious'},
  luxury:     { curve: 'geometric', particle: 'stars',      decorIcons: ['â—ˆ','â—‡','â–£','âœ¦','â—¦'],  particleColor: '#ffe98a', tone: 'luxurious'},
  winter:     { curve: 'geometric', particle: 'snowflakes', decorIcons: ['â„','â…','â†','âœ»','âœ¼'],  particleColor: '#e0f0ff', tone: 'dreamy'   },
  tropical:   { curve: 'wave',      particle: 'confetti',   decorIcons: ['ðŸŒº','ðŸŒ¿','âœ¦','â¦','ðŸŒ´'], particleColor: '#c3f5a9', tone: 'playful'},
};

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
  const art = buildFallbackArt('#b8926a', curve);

  return {
    curve,
    particle: merged.particle || 'petals',
    accentShape: 'ring',
    sectionEntrance: 'fade-up',
    texture: 'none',
    decorIcons: merged.decorIcons || ['âœ¦', 'â€¢', 'â—¦', 'âœ§', 'Â·'],
    accentSymbol: merged.decorIcons?.[0] || 'âœ¦',
    particleColor: merged.particleColor || '#f9c6c9',
    sectionLabels: {
      story: 'Our Story',
      events: 'Our Celebration',
      registry: 'Our Registry',
      travel: 'Getting Here',
      faqs: 'Good to Know',
      rsvp: "We'd Love to See You",
    },
    dividerQuote: vibeString || 'A love story worth telling.',
    cornerStyle: CORNER_STYLES[curve],
    tone: merged.tone || 'dreamy',
    wavePath: waveDef.d,
    wavePathInverted: waveDef.di,
    ...art,
    aiGenerated: false,
  };
}

// â”€â”€ SVG art helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
} {
  const a = accent || '#b8926a';

  const heroPatternSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <g fill="none" stroke="${a}" stroke-width="0.6" opacity="0.12">
    <circle cx="100" cy="100" r="70"/>
    <circle cx="100" cy="100" r="45"/>
    <circle cx="40" cy="40" r="20"/>
    <circle cx="160" cy="160" r="20"/>
    <circle cx="160" cy="40" r="15"/>
    <circle cx="40" cy="160" r="15"/>
    <line x1="30" y1="100" x2="170" y2="100"/>
    <line x1="100" y1="30" x2="100" y2="170"/>
  </g>
  <g fill="${a}" opacity="0.08">
    <circle cx="100" cy="100" r="3"/>
    <circle cx="55" cy="55" r="2"/>
    <circle cx="145" cy="55" r="2"/>
    <circle cx="55" cy="145" r="2"/>
    <circle cx="145" cy="145" r="2"/>
  </g>
</svg>`;

  const curvePaths: Record<VibeSkin['curve'], string> = {
    organic:   'M0,20 C50,5 100,35 150,20 C200,5 250,35 300,20 C350,5 400,35 450,20 C500,5 550,35 600,20 C650,5 700,35 750,20 C800,5 800,20 800,20',
    arch:      'M0,20 Q100,5 200,20 Q300,35 400,20 Q500,5 600,20 Q700,35 800,20',
    wave:      'M0,20 C80,5 120,35 200,20 C280,5 320,35 400,20 C480,5 520,35 600,20 C680,5 720,35 800,20',
    petal:     'M0,20 Q50,0 100,20 Q150,40 200,20 Q250,0 300,20 Q350,40 400,20 Q450,0 500,20 Q550,40 600,20 Q650,0 700,20 Q750,40 800,20',
    geometric: 'M0,20 L100,8 L200,32 L300,8 L400,32 L500,8 L600,32 L700,8 L800,20',
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

  return { heroPatternSvg, sectionBorderSvg, cornerFlourishSvg, medallionSvg };
}

// â”€â”€ Gemini-powered skin generation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Called once per site generation, cached in manifest.vibeSkin.
// Returns a full VibeSkin including custom AI SVG art.

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';

export async function generateVibeSkin(
  vibeString: string,
  coupleNames?: [string, string],
  apiKey?: string
): Promise<VibeSkin> {
  if (!apiKey) return deriveFallback(vibeString);

  const namesContext = coupleNames
    ? `The couple is ${coupleNames[0]} & ${coupleNames[1]}.`
    : '';

  const prompt = `You are a world-class wedding visual designer AND SVG artist for Pearloom, a premium wedding website platform.
${namesContext}
The couple's vibe is: "${vibeString}"

Your job is to design the complete visual skin AND create bespoke SVG art for their wedding site.
Everything must feel completely unique to this specific couple â€” not generic.

Return ONLY this JSON (no backticks, no markdown, no extra text). All SVG strings must be valid JSON-escaped strings:
{
  "curve": "<one of: organic | arch | geometric | wave | petal>",
  "particle": "<one of: petals | stars | bubbles | leaves | confetti | snowflakes | fireflies>",
  "accentShape": "<one of: ring | arch | diamond | leaf | infinity>",
  "sectionEntrance": "<one of: fade-up | bloom | drift | float | reveal>",
  "texture": "<one of: none | linen | floral | marble | bokeh | starfield>",
  "decorIcons": ["<5 creative unicode chars specific to this couple's world>"],
  "accentSymbol": "<single elegant unicode symbol â€” their primary visual motif>",
  "particleColor": "<hex color for ambient particles â€” emotionally evocative of their vibe>",
  "sectionLabels": {
    "story": "<poetic title for love story section â€” as if you know them personally>",
    "events": "<poetic title for ceremony/reception section>",
    "registry": "<poetic title for registry section>",
    "travel": "<poetic title for travel/hotel section>",
    "faqs": "<poetic title for FAQ section>",
    "rsvp": "<warm, personal invitation phrase for RSVP>"
  },
  "dividerQuote": "<original quote about love specific to their vibe. Max 12 words. NOT a cliche.>",
  "tone": "<one of: dreamy | playful | luxurious | wild | intimate | cosmic | rustic>",
  "heroPatternSvg": "<FULL SVG: subtle repeating background pattern for hero section. viewBox='0 0 200 200'. Must include 8-12 thematic elements (botanical stems, constellations, topographic lines, geometric lattice, etc.) inspired by their vibe. All fills/strokes at opacity 0.06-0.15. Accent color: an elegant hex matching the vibe. Complete <svg>...</svg> on one line with no line breaks.>",
  "sectionBorderSvg": "<FULL SVG: horizontal ornamental border strip. viewBox='0 0 800 40'. An elegant single wavy or foliate line with tiny motifs (dots, leaves, stars, etc.) specific to their vibe. NOT just a straight line. Complete <svg>...</svg> on one line.>",
  "cornerFlourishSvg": "<FULL SVG: Art Nouveau corner bracket ornament. viewBox='0 0 80 80'. Elegant scroll/flourish in top-left corner style. Complete <svg>...</svg> on one line.>",
  "medallionSvg": "<FULL SVG: centered circular ornament for section headers. viewBox='0 0 120 120'. Circular wreath, compass rose, or mandala-style ornament thematically matched to their vibe. Complete <svg>...</svg> on one line.>"
}

SVG RULES (critical for valid JSON):
1. Each SVG field must be a single string with no actual line breaks â€” use spaces between tags
2. Use only straight double quotes escaped as \\" inside the SVG attributes
3. All opacities: 0.06-0.20 only â€” ultra subtle, never solid shapes
4. The accent color for SVGs: pick one elegant complementary hex that fits the vibe
5. heroPatternSvg: think pressed botanical illustration, constellation map, flowing abstract lines
6. sectionBorderSvg: NOT a straight line â€” should have a wavy/foliate element and tiny motif dots
7. cornerFlourishSvg: think luxury stationery / bookplate corner decoration
8. medallionSvg: should feel like an antique emblem or pressed botanical circle

Non-SVG guidelines:
- decorIcons: thematically specific â€” botanical, celestial, nautical, architectural â€” NOT generic hearts or stars
- dividerQuote: write something original, intimate, and specific to their vibe. Avoid "forever", "always", "hearts"
- tone: choose the single energia word that most captures them`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 1.0,
          maxOutputTokens: 6000,
          responseMimeType: 'application/json',
        },
      }),
    });

    const data = await res.json();
    const raw = (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim()
      .replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsed = JSON.parse(raw) as any;

    const VALID_CURVES: VibeSkin['curve'][] = ['organic', 'arch', 'geometric', 'wave', 'petal'];
    const VALID_PARTICLES: VibeSkin['particle'][] = ['petals', 'stars', 'bubbles', 'leaves', 'confetti', 'snowflakes', 'fireflies'];
    const VALID_SHAPES: VibeSkin['accentShape'][] = ['ring', 'arch', 'diamond', 'leaf', 'infinity'];
    const VALID_ENTRANCES: VibeSkin['sectionEntrance'][] = ['fade-up', 'bloom', 'drift', 'float', 'reveal'];
    const VALID_TEXTURES: VibeSkin['texture'][] = ['none', 'linen', 'floral', 'marble', 'bokeh', 'starfield'];
    const VALID_TONES: VibeSkin['tone'][] = ['dreamy', 'playful', 'luxurious', 'wild', 'intimate', 'cosmic', 'rustic'];

    const curve: VibeSkin['curve'] = VALID_CURVES.includes(parsed.curve) ? parsed.curve : 'organic';
    const waveDef = WAVE_PATHS[curve];
    const accentForFallback = typeof parsed.particleColor === 'string' && parsed.particleColor.startsWith('#')
      ? parsed.particleColor : '#b8926a';
    const fallbackArt = buildFallbackArt(accentForFallback, curve);

    // Extract and validate SVG fields â€” fall back to deterministic art if invalid
    const resolvesvg = (field: string): string => {
      const raw = typeof parsed[field] === 'string' ? parsed[field] : null;
      if (raw) {
        const svg = extractSvgFromField(raw);
        if (svg && isValidSvg(svg)) return svg;
      }
      return fallbackArt[field as keyof typeof fallbackArt] as string;
    };

    return {
      curve,
      particle: VALID_PARTICLES.includes(parsed.particle) ? parsed.particle : 'petals',
      accentShape: VALID_SHAPES.includes(parsed.accentShape) ? parsed.accentShape : 'ring',
      sectionEntrance: VALID_ENTRANCES.includes(parsed.sectionEntrance) ? parsed.sectionEntrance : 'fade-up',
      texture: VALID_TEXTURES.includes(parsed.texture) ? parsed.texture : 'none',
      decorIcons: Array.isArray(parsed.decorIcons) && parsed.decorIcons.length > 0
        ? parsed.decorIcons.slice(0, 5)
        : ['âœ¦', 'â€¢', 'â—¦', 'âœ§', 'Â·'],
      accentSymbol: typeof parsed.accentSymbol === 'string' ? parsed.accentSymbol : 'âœ¦',
      particleColor: typeof parsed.particleColor === 'string' && parsed.particleColor.startsWith('#')
        ? parsed.particleColor : '#f9c6c9',
      sectionLabels: {
        story: parsed.sectionLabels?.story || 'Our Story',
        events: parsed.sectionLabels?.events || 'Our Celebration',
        registry: parsed.sectionLabels?.registry || 'Our Registry',
        travel: parsed.sectionLabels?.travel || 'Getting Here',
        faqs: parsed.sectionLabels?.faqs || 'Good to Know',
        rsvp: parsed.sectionLabels?.rsvp || "We'd Love to See You",
      },
      dividerQuote: typeof parsed.dividerQuote === 'string' ? parsed.dividerQuote : vibeString,
      cornerStyle: CORNER_STYLES[curve],
      tone: VALID_TONES.includes(parsed.tone) ? parsed.tone : 'dreamy',
      wavePath: waveDef.d,
      wavePathInverted: waveDef.di,
      heroPatternSvg: resolvesvg('heroPatternSvg'),
      sectionBorderSvg: resolvesvg('sectionBorderSvg'),
      cornerFlourishSvg: resolvesvg('cornerFlourishSvg'),
      medallionSvg: resolvesvg('medallionSvg'),
      aiGenerated: true,
    };
  } catch (err) {
    console.warn('[VibeEngine] Gemini skin generation failed, using fallback:', err);
    return deriveFallback(vibeString);
  }
}

// â”€â”€ Synchronous fallback for SSR/Server Components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function deriveVibeSkin(vibeString: string): VibeSkin {
  return deriveFallback(vibeString);
}

// â”€â”€ React hook for client components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import { useMemo } from 'react';

export function useVibeSkin(vibeString: string | undefined, cached?: VibeSkin): VibeSkin {
  return useMemo(
    () => cached || deriveFallback(vibeString || ''),
    [vibeString, cached]
  );
}
