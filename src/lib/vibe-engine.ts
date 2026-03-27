// ─────────────────────────────────────────────────────────────
// Pearloom / lib/vibe-engine.ts
// Gemini-first vibe → visual skin system.
// AI designs the entire aesthetic from scratch for any prompt.
// The keyword system is a fast fallback only.
// ─────────────────────────────────────────────────────────────

export interface VibeSkin {
  // ── Structural choices (maps to pre-built SVG variants) ──
  curve: 'organic' | 'arch' | 'geometric' | 'wave' | 'petal';
  particle: 'petals' | 'stars' | 'bubbles' | 'leaves' | 'confetti' | 'snowflakes' | 'fireflies';
  accentShape: 'ring' | 'arch' | 'diamond' | 'leaf' | 'infinity';
  sectionEntrance: 'fade-up' | 'bloom' | 'drift' | 'float' | 'reveal';
  texture: 'none' | 'linen' | 'floral' | 'marble' | 'bokeh' | 'starfield';

  // ── AI-generated open-ended fields ──
  // Any unicode chars — Gemini picks these freely
  decorIcons: string[];
  // Primary accent geometric/divider symbol
  accentSymbol: string;
  // Particle tint color (CSS hex) — Gemini chooses
  particleColor: string;
  // Section header micro-copy per block type
  sectionLabels: {
    story: string;       // e.g. "Our Journey Together"
    events: string;      // e.g. "A Day Full of Magic"
    registry: string;    // e.g. "The Things We Dream Of"
    travel: string;      // e.g. "Finding Your Way to Us"
    faqs: string;        // e.g. "Everything You Need to Know"
    rsvp: string;        // e.g. "We'd Love to See You There"
  };
  // Poetic tagline Gemini writes for the divider quotes
  dividerQuote: string;
  // CSS border-radius for cards
  cornerStyle: string;
  // Emotional tone word (used for motion easing selection)
  tone: 'dreamy' | 'playful' | 'luxurious' | 'wild' | 'intimate' | 'cosmic' | 'rustic';

  // Computed wave SVG paths (resolved server-side from curve choice)
  wavePath: string;
  wavePathInverted: string;

  // Was this skin AI-generated? (false = deterministic fallback)
  aiGenerated: boolean;
}

// ── SVG Wave Paths Library ────────────────────────────────────
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

// ── Deterministic fallback (keyword scoring) ──────────────────
// Only used when Gemini is unavailable or times out.

const KEYWORD_MAP: Record<string, Partial<VibeSkin>> = {
  garden:     { curve: 'petal',     particle: 'petals',     decorIcons: ['✿','❀','❁','✾','⚘'], particleColor: '#f9c6c9', tone: 'dreamy'    },
  floral:     { curve: 'petal',     particle: 'petals',     decorIcons: ['✿','❀','❁','⚘','❦'], particleColor: '#f3d1d8', tone: 'dreamy'    },
  wildflower: { curve: 'organic',   particle: 'petals',     decorIcons: ['✿','❀','⚘','🌾','✦'], particleColor: '#e8b4bc', tone: 'wild'     },
  forest:     { curve: 'organic',   particle: 'leaves',     decorIcons: ['❧','⚘','✦','🌿','❦'], particleColor: '#a8d5a2', tone: 'rustic'   },
  beach:      { curve: 'wave',      particle: 'bubbles',    decorIcons: ['🌊','🐚','⚓','✦','○'], particleColor: '#b8e0ff', tone: 'playful'  },
  ocean:      { curve: 'wave',      particle: 'bubbles',    decorIcons: ['🌊','○','◯','✦','⚓'], particleColor: '#9dd0f5', tone: 'dreamy'   },
  celestial:  { curve: 'arch',      particle: 'stars',      decorIcons: ['✦','✧','☽','⋆','✩'], particleColor: '#ffe98a', tone: 'cosmic'   },
  starry:     { curve: 'arch',      particle: 'stars',      decorIcons: ['✦','⋆','✩','☽','✧'], particleColor: '#fff3b0', tone: 'cosmic'   },
  night:      { curve: 'arch',      particle: 'fireflies',  decorIcons: ['✦','✧','⋆','◦','☽'], particleColor: '#c8ff8a', tone: 'cosmic'   },
  golden:     { curve: 'organic',   particle: 'petals',     decorIcons: ['✦','◇','•','✧','◦'], particleColor: '#ffd966', tone: 'luxurious'},
  romantic:   { curve: 'petal',     particle: 'petals',     decorIcons: ['♡','✿','✦','•','◦'], particleColor: '#f9c6c9', tone: 'intimate' },
  boho:       { curve: 'organic',   particle: 'leaves',     decorIcons: ['✿','✦','•','❧','⚘'], particleColor: '#c5e5c0', tone: 'wild'     },
  elegant:    { curve: 'arch',      particle: 'stars',      decorIcons: ['◈','◇','✦','●','○'], particleColor: '#fff9e6', tone: 'luxurious'},
  luxury:     { curve: 'geometric', particle: 'stars',      decorIcons: ['◈','◇','▣','✦','◦'], particleColor: '#ffe98a', tone: 'luxurious'},
  winter:     { curve: 'geometric', particle: 'snowflakes', decorIcons: ['❄','❅','❆','✻','✼'], particleColor: '#e0f0ff', tone: 'dreamy'   },
  tropical:   { curve: 'wave',      particle: 'confetti',   decorIcons: ['🌺','🌿','✦','❀','🌴'], particleColor: '#c3f5a9', tone: 'playful'},
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

  return {
    curve,
    particle: merged.particle || 'petals',
    accentShape: 'ring',
    sectionEntrance: 'fade-up',
    texture: 'none',
    decorIcons: merged.decorIcons || ['✦', '•', '◦', '✧', '·'],
    accentSymbol: merged.decorIcons?.[0] || '✦',
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
    aiGenerated: false,
  };
}

// ── Gemini-powered skin generation ───────────────────────────
// Called once per site generation, cached in manifest.vibeSkin.
// Returns a full VibeSkin from any free-text vibe description.

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export async function generateVibeSkin(
  vibeString: string,
  coupleNames?: [string, string],
  apiKey?: string
): Promise<VibeSkin> {
  if (!apiKey) return deriveFallback(vibeString);

  const namesContext = coupleNames
    ? `The couple is ${coupleNames[0]} & ${coupleNames[1]}.`
    : '';

  const prompt = `You are a world-class wedding visual designer for Pearloom, a premium wedding website platform.
${namesContext}
The couple's vibe is: "${vibeString}"

Design a complete visual skin for their wedding site. Be creative, thoughtful, poetic, and unique — go far beyond generic keywords. Think about what symbols, shapes, motion, and colors would feel completely *theirs*.

Return ONLY this JSON (no backticks, no markdown):
{
  "curve": "<one of: organic | arch | geometric | wave | petal>",
  "particle": "<one of: petals | stars | bubbles | leaves | confetti | snowflakes | fireflies>",
  "accentShape": "<one of: ring | arch | diamond | leaf | infinity>",
  "sectionEntrance": "<one of: fade-up | bloom | drift | float | reveal>",
  "texture": "<one of: none | linen | floral | marble | bokeh | starfield>",
  "decorIcons": ["<5 creative unicode chars that feel like this couple's world>"],
  "accentSymbol": "<single elegant unicode symbol — the primary motif>",
  "particleColor": "<hex color for the ambient particles — evocative of their vibe>",
  "sectionLabels": {
    "story": "<poetic title for their love story section>",
    "events": "<poetic title for ceremony/reception section>",
    "registry": "<poetic title for registry section>",
    "travel": "<poetic title for travel/hotel section>",
    "faqs": "<poetic title for FAQ section>",
    "rsvp": "<warm invitation phrase for RSVP section>"
  },
  "dividerQuote": "<a short, beautiful, original quote about love that suits this couple's specific vibe. Max 12 words. NOT a cliche.>",
  "tone": "<one of: dreamy | playful | luxurious | wild | intimate | cosmic | rustic>"
}

Guidelines:
- decorIcons: pick unicode symbols that feel thematically right — botanical, celestial, nautical, architectural, etc. Be specific to their vibe.
- accentSymbol: the single char that will appear most prominently. Make it special.
- particleColor: pick a color that evokes their vibe emotionally. Not just pink or gold — think carefully.
- sectionLabels: write these as if you know this couple personally. Poetic and warm.
- dividerQuote: write something original and specific. Avoid "forever", "always", "one".
- tone: choose the single word that most captures their energy.`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 1.0,
          maxOutputTokens: 600,
        },
      }),
    });

    const data = await res.json();
    const raw = (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim()
      .replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();

    const parsed = JSON.parse(raw) as Partial<VibeSkin> & {
      curve?: VibeSkin['curve'];
      particle?: VibeSkin['particle'];
    };

    // Validate enum fields — fall back to defaults if Gemini hallucinates
    const VALID_CURVES: VibeSkin['curve'][] = ['organic', 'arch', 'geometric', 'wave', 'petal'];
    const VALID_PARTICLES: VibeSkin['particle'][] = ['petals', 'stars', 'bubbles', 'leaves', 'confetti', 'snowflakes', 'fireflies'];
    const VALID_SHAPES: VibeSkin['accentShape'][] = ['ring', 'arch', 'diamond', 'leaf', 'infinity'];
    const VALID_ENTRANCES: VibeSkin['sectionEntrance'][] = ['fade-up', 'bloom', 'drift', 'float', 'reveal'];
    const VALID_TEXTURES: VibeSkin['texture'][] = ['none', 'linen', 'floral', 'marble', 'bokeh', 'starfield'];
    const VALID_TONES: VibeSkin['tone'][] = ['dreamy', 'playful', 'luxurious', 'wild', 'intimate', 'cosmic', 'rustic'];

    const curve = VALID_CURVES.includes(parsed.curve!) ? parsed.curve! : 'organic';
    const waveDef = WAVE_PATHS[curve];

    return {
      curve,
      particle: VALID_PARTICLES.includes(parsed.particle!) ? parsed.particle! : 'petals',
      accentShape: VALID_SHAPES.includes(parsed.accentShape!) ? parsed.accentShape! : 'ring',
      sectionEntrance: VALID_ENTRANCES.includes(parsed.sectionEntrance!) ? parsed.sectionEntrance! : 'fade-up',
      texture: VALID_TEXTURES.includes(parsed.texture!) ? parsed.texture! : 'none',
      decorIcons: Array.isArray(parsed.decorIcons) && parsed.decorIcons.length > 0
        ? parsed.decorIcons.slice(0, 5)
        : ['✦', '•', '◦', '✧', '·'],
      accentSymbol: typeof parsed.accentSymbol === 'string' ? parsed.accentSymbol : '✦',
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
      tone: VALID_TONES.includes(parsed.tone!) ? parsed.tone! : 'dreamy',
      wavePath: waveDef.d,
      wavePathInverted: waveDef.di,
      aiGenerated: true,
    };
  } catch (err) {
    console.warn('[VibeEngine] Gemini skin generation failed, using fallback:', err);
    return deriveFallback(vibeString);
  }
}

// ── Synchronous fallback for SSR/Server Components ────────────
// Use when you have an already-generated skin cached in manifest.
export function deriveVibeSkin(vibeString: string): VibeSkin {
  return deriveFallback(vibeString);
}

// ── React hook for client components ─────────────────────────
import { useMemo } from 'react';

export function useVibeSkin(vibeString: string | undefined, cached?: VibeSkin): VibeSkin {
  return useMemo(
    () => cached || deriveFallback(vibeString || ''),
    [vibeString, cached]
  );
}
