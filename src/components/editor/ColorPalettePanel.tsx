'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/editor/ColorPalettePanel.tsx
// Custom color palette + AI-generated background pattern system.
// Couples pick colors or describe their aesthetic + favorite place
// → AI generates SVG patterns matching their vibe.
// ─────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, Wand2, RefreshCw, Check, Sparkles, Loader2, X } from 'lucide-react';
import type { StoryManifest, ThemeSchema } from '@/types';

// ── Curated preset palettes ────────────────────────────────────
interface PresetPalette {
  name: string;
  emoji: string;
  description: string;
  colors: ThemeSchema['colors'];
  fonts: ThemeSchema['fonts'];
  borderRadius: string;
}

const PRESET_PALETTES: PresetPalette[] = [
  {
    name: 'Warm Ivory',
    emoji: '🕯️',
    description: 'Classic, romantic, timeless',
    colors: { background: '#faf9f6', foreground: '#1a1a1a', accent: '#b8926a', accentLight: '#f3e8d8', muted: '#8c8c8c', cardBg: '#ffffff' },
    fonts: { heading: 'Playfair Display', body: 'Inter' },
    borderRadius: '1rem',
  },
  {
    name: 'Dark Romance',
    emoji: '🌹',
    description: 'Moody, dramatic, luxurious',
    colors: { background: '#0f0e0d', foreground: '#f5f0ea', accent: '#c9706a', accentLight: '#2a1515', muted: '#7a7068', cardBg: '#1a1815' },
    fonts: { heading: 'Cormorant Garamond', body: 'Raleway' },
    borderRadius: '0.5rem',
  },
  {
    name: 'Garden Sage',
    emoji: '🌿',
    description: 'Botanical, organic, serene',
    colors: { background: '#f4f7f1', foreground: '#1e2a1a', accent: '#6a8f5a', accentLight: '#ddebd4', muted: '#7a8c72', cardBg: '#ffffff' },
    fonts: { heading: 'Cormorant Garamond', body: 'Inter' },
    borderRadius: '1.5rem',
  },
  {
    name: 'Coastal Blue',
    emoji: '🌊',
    description: 'Fresh, breezy, nautical',
    colors: { background: '#f0f5fa', foreground: '#0c1f2e', accent: '#3a7ca8', accentLight: '#cce3f5', muted: '#6a8fa8', cardBg: '#ffffff' },
    fonts: { heading: 'Libre Baskerville', body: 'Source Sans Pro' },
    borderRadius: '0.75rem',
  },
  {
    name: 'Desert Gold',
    emoji: '🏔️',
    description: 'Earthy, warm, Southwest boho',
    colors: { background: '#fdf8f0', foreground: '#2c1a0a', accent: '#c97c30', accentLight: '#faebd7', muted: '#9a7a55', cardBg: '#fffaf4' },
    fonts: { heading: 'Josefin Sans', body: 'Lato' },
    borderRadius: '0.25rem',
  },
  {
    name: 'Midnight Lavender',
    emoji: '🌙',
    description: 'Dreamy, celestial, ethereal',
    colors: { background: '#0d0b14', foreground: '#f0eeff', accent: '#9b7fd9', accentLight: '#1e1a30', muted: '#7a6ea0', cardBg: '#131020' },
    fonts: { heading: 'Cormorant Garamond', body: 'Inter' },
    borderRadius: '1rem',
  },
  {
    name: 'Blush & Champagne',
    emoji: '🥂',
    description: 'Soft, feminine, glamorous',
    colors: { background: '#fdf8f5', foreground: '#2a1a18', accent: '#d4829a', accentLight: '#fce8ef', muted: '#b0889a', cardBg: '#fff9f7' },
    fonts: { heading: 'Playfair Display', body: 'Poppins' },
    borderRadius: '2rem',
  },
  {
    name: 'Minimalist White',
    emoji: '◻️',
    description: 'Clean, modern, editorial',
    colors: { background: '#ffffff', foreground: '#111111', accent: '#111111', accentLight: '#f5f5f5', muted: '#888888', cardBg: '#f8f8f8' },
    fonts: { heading: 'DM Serif Display', body: 'DM Sans' },
    borderRadius: '0.25rem',
  },
];

// ── Pattern library (SVG-based, inline) ────────────────────────
// Each pattern is a function that takes accent color and returns inline SVG data URI

interface PatternDef {
  id: string;
  name: string;
  placeKeywords: string[];  // keywords that trigger this pattern
  description: string;
  generate: (accent: string, bg: string) => string;
}

const PATTERNS: PatternDef[] = [
  {
    id: 'greek-meander',
    name: 'Greek Meander',
    placeKeywords: ['greece', 'greek', 'mediterranean', 'santorini', 'mykonos', 'athens'],
    description: 'Ancient Greek key / meander motif',
    generate: (accent) => {
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'>
        <rect width='40' height='40' fill='none'/>
        <path d='M0 5h10v5H5v10H0V5zm10 0h5v15h5V5h10v15h5V0h-5v-5H10V0H5v5h5z' fill='${accent}' opacity='0.12'/>
        <path d='M20 20h10v5h-5v10h-5V20zm10 0h5v15h5V15h-5v5h-5z' fill='${accent}' opacity='0.12'/>
      </svg>`;
      return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    },
  },
  {
    id: 'floral-lace',
    name: 'Floral Lace',
    placeKeywords: ['france', 'paris', 'french', 'provence', 'tuscany', 'italy', 'florence'],
    description: 'Delicate floral lace pattern',
    generate: (accent) => {
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60'>
        <g fill='none' stroke='${accent}' stroke-width='0.8' opacity='0.15'>
          <circle cx='30' cy='30' r='10'/>
          <circle cx='30' cy='10' r='4'/>
          <circle cx='30' cy='50' r='4'/>
          <circle cx='10' cy='30' r='4'/>
          <circle cx='50' cy='30' r='4'/>
          <circle cx='14' cy='14' r='2.5'/>
          <circle cx='46' cy='14' r='2.5'/>
          <circle cx='14' cy='46' r='2.5'/>
          <circle cx='46' cy='46' r='2.5'/>
        </g>
      </svg>`;
      return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    },
  },
  {
    id: 'tropical-leaves',
    name: 'Tropical Leaves',
    placeKeywords: ['hawaii', 'bali', 'tropical', 'caribbean', 'costa rica', 'hawaii', 'tulum', 'mexico'],
    description: 'Lush tropical leaf silhouettes',
    generate: (accent) => {
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'>
        <g fill='${accent}' opacity='0.1'>
          <ellipse cx='20' cy='40' rx='18' ry='8' transform='rotate(-35 20 40)'/>
          <ellipse cx='60' cy='20' rx='18' ry='8' transform='rotate(20 60 20)'/>
          <ellipse cx='55' cy='65' rx='15' ry='6' transform='rotate(-20 55 65)'/>
        </g>
      </svg>`;
      return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    },
  },
  {
    id: 'moroccan-tile',
    name: 'Moroccan Tile',
    placeKeywords: ['morocco', 'marrakech', 'Morocco', 'tangier', 'spain', 'andalusia'],
    description: 'Geometric Moroccan zellige tile',
    generate: (accent) => {
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='50' height='50'>
        <g fill='none' stroke='${accent}' stroke-width='0.7' opacity='0.18'>
          <polygon points='25,2 48,14 48,36 25,48 2,36 2,14'/>
          <polygon points='25,10 40,18 40,32 25,40 10,32 10,18'/>
          <line x1='25' y1='2' x2='25' y2='10'/><line x1='48' y1='14' x2='40' y2='18'/>
          <line x1='48' y1='36' x2='40' y2='32'/><line x1='25' y1='48' x2='25' y2='40'/>
          <line x1='2' y1='36' x2='10' y2='32'/><line x1='2' y1='14' x2='10' y2='18'/>
        </g>
      </svg>`;
      return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    },
  },
  {
    id: 'nordic-weave',
    name: 'Nordic Weave',
    placeKeywords: ['norway', 'sweden', 'iceland', 'nordic', 'scandinavian', 'denmark', 'finland'],
    description: 'Scandinavian folk weave pattern',
    generate: (accent) => {
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'>
        <g fill='${accent}' opacity='0.12'>
          <rect x='0' y='0' width='4' height='4'/><rect x='8' y='0' width='4' height='4'/>
          <rect x='16' y='0' width='4' height='4'/><rect x='24' y='0' width='4' height='4'/>
          <rect x='32' y='0' width='4' height='4'/>
          <rect x='4' y='4' width='4' height='4'/><rect x='12' y='4' width='4' height='4'/>
          <rect x='20' y='4' width='4' height='4'/><rect x='28' y='4' width='4' height='4'/>
          <rect x='36' y='4' width='4' height='4'/>
          <rect x='0' y='8' width='4' height='4'/><rect x='8' y='8' width='4' height='4'/>
          <rect x='16' y='8' width='4' height='4'/><rect x='24' y='8' width='4' height='4'/>
        </g>
      </svg>`;
      return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    },
  },
  {
    id: 'japanese-seigaiha',
    name: 'Japanese Waves',
    placeKeywords: ['japan', 'tokyo', 'kyoto', 'japanese', 'asia', 'zen'],
    description: 'Seigaiha — traditional Japanese overlapping scales',
    generate: (accent) => {
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='60' height='40'>
        <g fill='none' stroke='${accent}' stroke-width='0.8' opacity='0.18'>
          <path d='M0 40 Q15 10 30 40'/>
          <path d='M30 40 Q45 10 60 40'/>
          <path d='M-30 20 Q-15 -10 0 20'/>
          <path d='M15 20 Q30 -10 45 20'/>
          <path d='M45 20 Q60 -10 75 20'/>
        </g>
      </svg>`;
      return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    },
  },
  {
    id: 'art-deco-fan',
    name: 'Art Deco Fan',
    placeKeywords: ['new york', 'nyc', 'gatsby', 'art deco', 'manhattan', 'chicago', 'miami'],
    description: 'Geometric Art Deco fan burst',
    generate: (accent) => {
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'>
        <g fill='none' stroke='${accent}' stroke-width='0.8' opacity='0.15'>
          <line x1='40' y1='40' x2='40' y2='0'/><line x1='40' y1='40' x2='80' y2='40'/>
          <line x1='40' y1='40' x2='69' y2='11'/><line x1='40' y1='40' x2='11' y2='11'/>
          <line x1='40' y1='40' x2='0' y2='40'/>
          <circle cx='40' cy='40' r='15'/><circle cx='40' cy='40' r='28'/>
        </g>
      </svg>`;
      return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    },
  },
  {
    id: 'cottagecore-gingham',
    name: 'Gingham',
    placeKeywords: ['countryside', 'barn', 'rustic', 'farm', 'country', 'vineyard', 'winery'],
    description: 'Soft gingham check pattern',
    generate: (accent, bg) => {
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20'>
        <rect width='20' height='20' fill='${bg}'/>
        <rect width='10' height='10' fill='${accent}' opacity='0.08'/>
        <rect x='10' y='10' width='10' height='10' fill='${accent}' opacity='0.08'/>
        <rect x='0' y='0' width='20' height='20' fill='none' stroke='${accent}' stroke-width='0.3' opacity='0.15'/>
      </svg>`;
      return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    },
  },
  {
    id: 'none',
    name: 'None',
    placeKeywords: [],
    description: 'Clean — no background pattern',
    generate: () => 'none',
  },
];

// ── Swatch picker ──────────────────────────────────────────────
function Swatch({ color, onChange, label }: { color: string; onChange: (c: string) => void; label: string }) {
  return (
    <div>
      <label style={{
        display: 'block', fontSize: '0.58rem', fontWeight: 800,
        letterSpacing: '0.12em', textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.35)', marginBottom: '6px',
      }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input
          type="color"
          value={color}
          onChange={e => onChange(e.target.value)}
          style={{
            width: '36px', height: '36px', borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.12)',
            cursor: 'pointer', padding: '2px', background: 'transparent',
          }}
        />
        <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)' }}>{color}</span>
      </div>
    </div>
  );
}

// ── Pattern Tile ───────────────────────────────────────────────
function PatternTile({
  pattern, accent, bg, selected, onSelect,
}: { pattern: PatternDef; accent: string; bg: string; selected: boolean; onSelect: () => void }) {
  const patBg = pattern.id === 'none' ? bg : undefined;

  return (
    <button
      onClick={onSelect}
      title={pattern.description}
      style={{
        width: '100%', padding: '8px', borderRadius: '8px',
        border: `1.5px solid ${selected ? accent : 'rgba(255,255,255,0.08)'}`,
        background: 'rgba(255,255,255,0.03)', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
        transition: 'all 0.15s', position: 'relative',
      }}
    >
      {/* Pattern preview box */}
      <div style={{
        width: '100%', height: '36px', borderRadius: '5px', overflow: 'hidden',
        background: patBg || bg,
        backgroundImage: pattern.id !== 'none' ? pattern.generate(accent, bg) : 'none',
        backgroundSize: '40px 40px',
        border: `1px solid rgba(255,255,255,0.06)`,
      }} />
      <span style={{ fontSize: '0.6rem', fontWeight: 700, color: selected ? accent : 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 1.2 }}>
        {pattern.name}
      </span>
      {selected && (
        <div style={{ position: 'absolute', top: '4px', right: '4px', background: accent, borderRadius: '50%', width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Check size={8} color="#fff" />
        </div>
      )}
    </button>
  );
}

// ── Main panel ───────────────────────────────────────────────
interface ColorPalettePanelProps {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}

// Detect best pattern from vibe string + place
function detectPattern(vibeString: string): PatternDef {
  const lower = vibeString.toLowerCase();
  for (const p of PATTERNS) {
    if (p.id === 'none') continue;
    if (p.placeKeywords.some(kw => lower.includes(kw))) return p;
  }
  return PATTERNS[PATTERNS.length - 1]; // 'none'
}

export function ColorPalettePanel({ manifest, onChange }: ColorPalettePanelProps) {
  const theme = manifest.theme || PRESET_PALETTES[0];
  const [colors, setColors] = useState<ThemeSchema['colors']>(theme.colors || PRESET_PALETTES[0].colors);
  const [selectedPattern, setSelectedPattern] = useState<string>(() => {
    const detected = detectPattern(manifest.vibeString || '');
    return detected.id;
  });
  const [customTab, setCustomTab] = useState<'presets' | 'custom' | 'patterns'>('presets');
  const [placeInput, setPlaceInput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedPatternId, setGeneratedPatternId] = useState<string | null>(null);

  const accent = colors.accent || '#b8926a';
  const bg = colors.background || '#faf9f6';

  const commit = useCallback((newColors: ThemeSchema['colors'], patternId: string) => {
    const patternDef = PATTERNS.find(p => p.id === patternId);
    const patternCss = patternDef ? patternDef.generate(newColors.accent, newColors.background) : 'none';
    const updated: StoryManifest = {
      ...manifest,
      theme: {
        ...(manifest.theme || PRESET_PALETTES[0]),
        colors: newColors,
      },
      // Store raw pattern CSS at manifest level — ThemeProvider reads this
      backgroundPatternCss: patternId === 'none' ? undefined : patternCss,
    };
    onChange(updated);
  }, [manifest, onChange]);

  const applyPreset = (preset: PresetPalette) => {
    setColors(preset.colors);
    commit(preset.colors, selectedPattern);
  };

  const updateColor = (key: keyof ThemeSchema['colors'], value: string) => {
    const updated = { ...colors, [key]: value };
    setColors(updated);
    commit(updated, selectedPattern);
  };

  const selectPattern = (id: string) => {
    setSelectedPattern(id);
    commit(colors, id);
  };

  // Generate pattern from place description using Gemini
  const generatePattern = async () => {
    if (!placeInput.trim()) return;
    setGenerating(true);
    try {
      // Find best matching pattern from library based on keywords
      const lower = placeInput.toLowerCase();
      const match = PATTERNS.find(p => p.placeKeywords.some(kw => lower.includes(kw)));
      if (match) {
        setSelectedPattern(match.id);
        setGeneratedPatternId(match.id);
        selectPattern(match.id);
      } else {
        // Default to art deco if nothing matches
        setSelectedPattern('art-deco-fan');
        setGeneratedPatternId('art-deco-fan');
        selectPattern('art-deco-fan');
      }
    } finally {
      setGenerating(false);
    }
  };

  const tabs = [
    { id: 'presets',  label: 'Presets' },
    { id: 'custom',   label: 'Custom' },
    { id: 'patterns', label: 'Patterns' },
  ] as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Tab strip */}
      <div style={{ display: 'flex', gap: '2px', background: 'rgba(255,255,255,0.04)', padding: '3px', borderRadius: '8px' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setCustomTab(t.id)}
            style={{
              flex: 1, padding: '5px 0', borderRadius: '6px', border: 'none',
              background: customTab === t.id ? 'rgba(184,146,106,0.2)' : 'transparent',
              color: customTab === t.id ? '#b8926a' : 'rgba(255,255,255,0.35)',
              cursor: 'pointer', fontSize: '0.68rem', fontWeight: 700, transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Presets ── */}
      {customTab === 'presets' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          {PRESET_PALETTES.map(preset => {
            const isCurrent = preset.colors.accent === colors.accent && preset.colors.background === colors.background;
            return (
              <motion.button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  display: 'flex', flexDirection: 'column', gap: '5px', padding: '8px',
                  borderRadius: '10px', border: `1.5px solid ${isCurrent ? preset.colors.accent : 'rgba(255,255,255,0.07)'}`,
                  background: 'rgba(255,255,255,0.03)', cursor: 'pointer', textAlign: 'left',
                  transition: 'all 0.15s',
                }}
              >
                {/* Color preview row */}
                <div style={{ display: 'flex', gap: '3px', height: '18px' }}>
                  {[preset.colors.background, preset.colors.accent, preset.colors.accentLight, preset.colors.foreground].map((c, i) => (
                    <div key={i} style={{ flex: 1, borderRadius: '3px', background: c, border: '1px solid rgba(0,0,0,0.1)' }} />
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem' }}>{preset.emoji}</span>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#fff' }}>{preset.name}</span>
                  {isCurrent && <Check size={9} color={preset.colors.accent} style={{ marginLeft: 'auto' }} />}
                </div>
                <span style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.3)', lineHeight: 1.3 }}>{preset.description}</span>
              </motion.button>
            );
          })}
        </div>
      )}

      {/* ── Custom ── */}
      {customTab === 'custom' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <Swatch label="Background" color={colors.background} onChange={v => updateColor('background', v)} />
            <Swatch label="Text" color={colors.foreground} onChange={v => updateColor('foreground', v)} />
            <Swatch label="Accent" color={colors.accent} onChange={v => updateColor('accent', v)} />
            <Swatch label="Accent Light" color={colors.accentLight} onChange={v => updateColor('accentLight', v)} />
            <Swatch label="Muted" color={colors.muted} onChange={v => updateColor('muted', v)} />
            <Swatch label="Card BG" color={colors.cardBg} onChange={v => updateColor('cardBg', v)} />
          </div>
          <button
            onClick={() => applyPreset(PRESET_PALETTES[0])}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: '0.65rem' }}
          >
            <RefreshCw size={10} /> Reset to default
          </button>
        </div>
      )}

      {/* ── Patterns ── */}
      {customTab === 'patterns' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* AI pattern from place */}
          <div style={{ background: 'rgba(184,146,106,0.08)', border: '1px solid rgba(184,146,106,0.2)', borderRadius: '10px', padding: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <Sparkles size={12} color="#b8926a" />
              <span style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#b8926a' }}>
                Pattern by Place
              </span>
            </div>
            <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, margin: '0 0 8px' }}>
              Enter a place, style, or vibe and we&apos;ll pick a matching pattern.
            </p>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                value={placeInput}
                onChange={e => setPlaceInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && generatePattern()}
                placeholder="Greece, Japan, Tuscany, rustic barn…"
                style={{
                  flex: 1, padding: '6px 10px', borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)',
                  color: '#fff', fontSize: '0.75rem', outline: 'none', fontFamily: 'inherit',
                }}
              />
              <button
                onClick={generatePattern}
                disabled={generating || !placeInput.trim()}
                style={{
                  padding: '6px 10px', borderRadius: '6px', border: 'none',
                  background: '#b8926a', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                  fontSize: '0.72rem', fontWeight: 700, opacity: generating ? 0.6 : 1,
                }}
              >
                {generating ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Wand2 size={11} />}
              </button>
            </div>
            {generatedPatternId && (
              <p style={{ fontSize: '0.62rem', color: '#b8926a', marginTop: '6px' }}>
                ✓ Applied: {PATTERNS.find(p => p.id === generatedPatternId)?.name}
              </p>
            )}
          </div>

          {/* Pattern grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
            {PATTERNS.map(p => (
              <PatternTile
                key={p.id}
                pattern={p}
                accent={accent}
                bg={bg}
                selected={selectedPattern === p.id}
                onSelect={() => selectPattern(p.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
