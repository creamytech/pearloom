'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/editor/ThemeSwitcher.tsx
// One-click preset theme switching with live preview
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import type { VibeSkin } from '@/lib/vibe-engine';
import { WAVE_PATHS } from '@/lib/vibe-engine';
import type { StoryManifest } from '@/types';

export interface ThemeSwitcherProps {
  currentVibeSkin: VibeSkin;
  manifest: StoryManifest;
  onApply: (newSkin: VibeSkin) => void;
}

// ── Shared section labels default ─────────────────────────────
const DEFAULT_LABELS: VibeSkin['sectionLabels'] = {
  story: 'Our Story',
  events: 'Our Celebration',
  registry: 'Our Registry',
  travel: 'Getting Here',
  faqs: 'Good to Know',
  rsvp: "We'd Love to See You",
  photos: 'Our Photos',
};

// ── 12 Hand-crafted preset themes ─────────────────────────────
const PRESET_THEMES: Array<VibeSkin & { name: string }> = [
  // 1. Ivory Garden
  {
    name: 'Ivory Garden',
    curve: 'petal',
    particle: 'petals',
    accentShape: 'leaf',
    sectionEntrance: 'bloom',
    texture: 'floral',
    decorIcons: ['✿', '❦', '✾', '◦', '•'],
    accentSymbol: '✿',
    particleColor: '#a3b18a',
    sectionLabels: DEFAULT_LABELS,
    dividerQuote: 'Where every petal tells a story.',
    cornerStyle: '40% 40% 2rem 2rem / 3rem 3rem 2rem 2rem',
    tone: 'dreamy',
    headingStyle: 'italic-serif',
    cardStyle: 'elevated',
    sectionGradient: 'linear-gradient(135deg, #f9f6ef 0%, #f0eddf 100%)',
    palette: {
      background: '#F7F3E9',
      foreground: '#2C2A1E',
      accent: '#6B8F55',
      accent2: '#A3B18A',
      card: '#FDFAF2',
      muted: '#8A8570',
      highlight: '#4E7440',
      subtle: '#F3F0E5',
      ink: '#1A1810',
    },
    fonts: { heading: 'Playfair Display', body: 'Inter' },
    wavePath: WAVE_PATHS['petal'].d,
    wavePathInverted: WAVE_PATHS['petal'].di,
    aiGenerated: false,
  },
  // 2. Midnight Luxe
  {
    name: 'Midnight Luxe',
    curve: 'arch',
    particle: 'stars',
    accentShape: 'diamond',
    sectionEntrance: 'fade-up',
    texture: 'starfield',
    decorIcons: ['✦', '◈', '◇', '✧', '⋆'],
    accentSymbol: '◈',
    particleColor: '#d4af37',
    sectionLabels: DEFAULT_LABELS,
    dividerQuote: 'A love written in the stars.',
    cornerStyle: '50% 50% 1.5rem 1.5rem / 3rem 3rem 1.5rem 1.5rem',
    tone: 'luxurious',
    headingStyle: 'thin-elegant',
    cardStyle: 'glass',
    sectionGradient: 'linear-gradient(135deg, #1C1A26 0%, #22202E 100%)',
    palette: {
      background: '#1A1822',
      foreground: '#F5F0E8',
      accent: '#D4AF37',
      accent2: '#8B7240',
      card: '#201E2C',
      muted: '#7A748A',
      highlight: '#F0D060',
      subtle: '#1E1C28',
      ink: '#FDFAF2',
    },
    fonts: { heading: 'Cormorant Garamond', body: 'Raleway' },
    wavePath: WAVE_PATHS['arch'].d,
    wavePathInverted: WAVE_PATHS['arch'].di,
    aiGenerated: false,
  },
  // 3. Coastal Breeze
  {
    name: 'Coastal Breeze',
    curve: 'wave',
    particle: 'bubbles',
    accentShape: 'ring',
    sectionEntrance: 'drift',
    texture: 'bokeh',
    decorIcons: ['○', '◯', '◦', '✦', '•'],
    accentSymbol: '○',
    particleColor: '#b8e0ff',
    sectionLabels: DEFAULT_LABELS,
    dividerQuote: 'Where the sea meets forever.',
    cornerStyle: '1.5rem',
    tone: 'dreamy',
    headingStyle: 'italic-serif',
    cardStyle: 'outlined',
    sectionGradient: 'linear-gradient(135deg, #EBF4FC 0%, #D8EEF9 100%)',
    palette: {
      background: '#EBF4FC',
      foreground: '#1A3040',
      accent: '#C8A96E',
      accent2: '#8DBDD4',
      card: '#F5F9FD',
      muted: '#7A94A4',
      highlight: '#3D7EA8',
      subtle: '#F0F7FB',
      ink: '#0D1E2A',
    },
    fonts: { heading: 'DM Serif Display', body: 'DM Sans' },
    wavePath: WAVE_PATHS['wave'].d,
    wavePathInverted: WAVE_PATHS['wave'].di,
    aiGenerated: false,
  },
  // 4. Forest Romance
  {
    name: 'Forest Romance',
    curve: 'organic',
    particle: 'leaves',
    accentShape: 'leaf',
    sectionEntrance: 'bloom',
    texture: 'linen',
    decorIcons: ['⧱', '◦', '✦', '⦿', '•'],
    accentSymbol: '⧱',
    particleColor: '#a8d5a2',
    sectionLabels: DEFAULT_LABELS,
    dividerQuote: 'Love rooted deep as ancient oaks.',
    cornerStyle: '2rem 4rem 2rem 4rem',
    tone: 'rustic',
    headingStyle: 'italic-serif',
    cardStyle: 'solid',
    sectionGradient: 'linear-gradient(135deg, #1E2B18 0%, #243220 100%)',
    palette: {
      background: '#1E2B18',
      foreground: '#F0EDD8',
      accent: '#C8B87A',
      accent2: '#6B8A5A',
      card: '#243220',
      muted: '#7A8E70',
      highlight: '#E0D090',
      subtle: '#223019',
      ink: '#F5F2E0',
    },
    fonts: { heading: 'Libre Baskerville', body: 'Lato' },
    wavePath: WAVE_PATHS['organic'].d,
    wavePathInverted: WAVE_PATHS['organic'].di,
    aiGenerated: false,
  },
  // 5. Blush Editorial
  {
    name: 'Blush Editorial',
    curve: 'geometric',
    particle: 'sakura',
    accentShape: 'arch',
    sectionEntrance: 'reveal',
    texture: 'paper',
    decorIcons: ['◈', '◇', '✦', '◉', '○'],
    accentSymbol: '◈',
    particleColor: '#f3d1d8',
    sectionLabels: DEFAULT_LABELS,
    dividerQuote: 'Love in the bloom of everything.',
    cornerStyle: '0',
    tone: 'intimate',
    headingStyle: 'bold-editorial',
    cardStyle: 'minimal',
    sectionGradient: 'linear-gradient(135deg, #FBF0F2 0%, #F5E4E8 100%)',
    palette: {
      background: '#FBF0F2',
      foreground: '#2E1018',
      accent: '#7A1E3A',
      accent2: '#D4A0AE',
      card: '#FDF7F8',
      muted: '#9E7880',
      highlight: '#5E1228',
      subtle: '#F8ECF0',
      ink: '#1A0810',
    },
    fonts: { heading: 'Bodoni Moda', body: 'Montserrat' },
    wavePath: WAVE_PATHS['geometric'].d,
    wavePathInverted: WAVE_PATHS['geometric'].di,
    aiGenerated: false,
  },
  // 6. Minimalist Modern
  {
    name: 'Minimalist Modern',
    curve: 'geometric',
    particle: 'petals',
    accentShape: 'ring',
    sectionEntrance: 'fade-up',
    texture: 'none',
    decorIcons: ['·', '—', '·', '—', '·'],
    accentSymbol: '—',
    particleColor: '#000000',
    sectionLabels: DEFAULT_LABELS,
    dividerQuote: 'Less is more. Love is everything.',
    cornerStyle: '0',
    tone: 'intimate',
    headingStyle: 'uppercase-tracked',
    cardStyle: 'minimal',
    sectionGradient: 'linear-gradient(135deg, #FFFFFF 0%, #F8F8F8 100%)',
    palette: {
      background: '#FFFFFF',
      foreground: '#0A0A0A',
      accent: '#0A0A0A',
      accent2: '#555555',
      card: '#F8F8F8',
      muted: '#888888',
      highlight: '#333333',
      subtle: '#F5F5F5',
      ink: '#000000',
    },
    fonts: { heading: 'Space Grotesk', body: 'Inter' },
    wavePath: WAVE_PATHS['geometric'].d,
    wavePathInverted: WAVE_PATHS['geometric'].di,
    aiGenerated: false,
  },
  // 7. Rustic Harvest
  {
    name: 'Rustic Harvest',
    curve: 'organic',
    particle: 'leaves',
    accentShape: 'leaf',
    sectionEntrance: 'drift',
    texture: 'linen',
    decorIcons: ['✿', '✦', '•', '⧱', '◦'],
    accentSymbol: '✦',
    particleColor: '#c5734a',
    sectionLabels: DEFAULT_LABELS,
    dividerQuote: 'Harvest moon, harvest love.',
    cornerStyle: '2rem 4rem 2rem 4rem',
    tone: 'rustic',
    headingStyle: 'bold-editorial',
    cardStyle: 'solid',
    sectionGradient: 'linear-gradient(135deg, #F5EAD8 0%, #EDDCC8 100%)',
    palette: {
      background: '#F0E2C8',
      foreground: '#2C1808',
      accent: '#C0562A',
      accent2: '#E8A87C',
      card: '#F7EDD8',
      muted: '#9E7858',
      highlight: '#8C3A18',
      subtle: '#F5EAD8',
      ink: '#1A0E04',
    },
    fonts: { heading: 'Abril Fatface', body: 'Lora' },
    wavePath: WAVE_PATHS['organic'].d,
    wavePathInverted: WAVE_PATHS['organic'].di,
    aiGenerated: false,
  },
  // 8. Celestial Night
  {
    name: 'Celestial Night',
    curve: 'arch',
    particle: 'stars',
    accentShape: 'infinity',
    sectionEntrance: 'float',
    texture: 'starfield',
    decorIcons: ['✦', '✧', '☽', '⋆', '✩'],
    accentSymbol: '☽',
    particleColor: '#c8d8f0',
    sectionLabels: DEFAULT_LABELS,
    dividerQuote: 'Written in moonlight, sealed with stars.',
    cornerStyle: '50% 50% 1.5rem 1.5rem / 3rem 3rem 1.5rem 1.5rem',
    tone: 'cosmic',
    headingStyle: 'uppercase-tracked',
    cardStyle: 'glass',
    sectionGradient: 'linear-gradient(135deg, #0D1428 0%, #111C38 100%)',
    palette: {
      background: '#0D1428',
      foreground: '#E8EEF8',
      accent: '#9AB0D8',
      accent2: '#5070A8',
      card: '#111C38',
      muted: '#5A6890',
      highlight: '#C0D0F0',
      subtle: '#0F1830',
      ink: '#F0F4FC',
    },
    fonts: { heading: 'Cinzel', body: 'Raleway' },
    wavePath: WAVE_PATHS['arch'].d,
    wavePathInverted: WAVE_PATHS['arch'].di,
    aiGenerated: false,
  },
  // 9. Garden Party
  {
    name: 'Garden Party',
    curve: 'petal',
    particle: 'petals',
    accentShape: 'leaf',
    sectionEntrance: 'bloom',
    texture: 'floral',
    decorIcons: ['✿', '❦', '✾', '⦿', '◦'],
    accentSymbol: '❦',
    particleColor: '#f9c6c9',
    sectionLabels: DEFAULT_LABELS,
    dividerQuote: 'Love is always in bloom.',
    cornerStyle: '40% 40% 2rem 2rem / 3rem 3rem 2rem 2rem',
    tone: 'playful',
    headingStyle: 'script-like',
    cardStyle: 'elevated',
    sectionGradient: 'linear-gradient(135deg, #EEF7EE 0%, #E0F0E0 100%)',
    palette: {
      background: '#EEF7EE',
      foreground: '#1C2C1C',
      accent: '#E0705A',
      accent2: '#A8C8A8',
      card: '#F5FBF5',
      muted: '#7A9A7A',
      highlight: '#C05040',
      subtle: '#EDF6ED',
      ink: '#0E1A0E',
    },
    fonts: { heading: 'Dancing Script', body: 'Nunito' },
    wavePath: WAVE_PATHS['petal'].d,
    wavePathInverted: WAVE_PATHS['petal'].di,
    aiGenerated: false,
  },
  // 10. Golden Hour
  {
    name: 'Golden Hour',
    curve: 'organic',
    particle: 'fireflies',
    accentShape: 'ring',
    sectionEntrance: 'fade-up',
    texture: 'bokeh',
    decorIcons: ['✦', '◇', '•', '✧', '◦'],
    accentSymbol: '✦',
    particleColor: '#ffd966',
    sectionLabels: DEFAULT_LABELS,
    dividerQuote: 'Golden light, golden love.',
    cornerStyle: '2rem 4rem 2rem 4rem',
    tone: 'luxurious',
    headingStyle: 'italic-serif',
    cardStyle: 'elevated',
    sectionGradient: 'linear-gradient(135deg, #FBF0DC 0%, #F5E4C4 100%)',
    palette: {
      background: '#FBF0DC',
      foreground: '#2A1A08',
      accent: '#C87820',
      accent2: '#E8C070',
      card: '#FDF6E8',
      muted: '#9A8060',
      highlight: '#A05C10',
      subtle: '#F8ECD4',
      ink: '#180E04',
    },
    fonts: { heading: 'EB Garamond', body: 'Source Sans 3' },
    wavePath: WAVE_PATHS['organic'].d,
    wavePathInverted: WAVE_PATHS['organic'].di,
    aiGenerated: false,
  },
  // 11. Arctic Winter
  {
    name: 'Arctic Winter',
    curve: 'geometric',
    particle: 'snowflakes',
    accentShape: 'diamond',
    sectionEntrance: 'float',
    texture: 'none',
    decorIcons: ['❄', '✻', '✼', '✦', '◦'],
    accentSymbol: '❄',
    particleColor: '#a8c8e8',
    sectionLabels: DEFAULT_LABELS,
    dividerQuote: 'Pure as the first snowfall.',
    cornerStyle: '0',
    tone: 'dreamy',
    headingStyle: 'thin-elegant',
    cardStyle: 'outlined',
    sectionGradient: 'linear-gradient(135deg, #F0F6FC 0%, #E4EEF8 100%)',
    palette: {
      background: '#F0F6FC',
      foreground: '#1A2840',
      accent: '#4878A8',
      accent2: '#90B4D0',
      card: '#F8FBFE',
      muted: '#7090A8',
      highlight: '#2A5888',
      subtle: '#EAF2F8',
      ink: '#0E1820',
    },
    fonts: { heading: 'Syne', body: 'Nunito Sans' },
    wavePath: WAVE_PATHS['geometric'].d,
    wavePathInverted: WAVE_PATHS['geometric'].di,
    aiGenerated: false,
  },
  // 12. Tropical Bloom
  {
    name: 'Tropical Bloom',
    curve: 'wave',
    particle: 'confetti',
    accentShape: 'arch',
    sectionEntrance: 'bloom',
    texture: 'bokeh',
    decorIcons: ['✿', '◦', '✦', '❦', '•'],
    accentSymbol: '✿',
    particleColor: '#c3f5a9',
    sectionLabels: DEFAULT_LABELS,
    dividerQuote: 'Love bright as a tropical sunrise.',
    cornerStyle: '1.5rem',
    tone: 'playful',
    headingStyle: 'script-like',
    cardStyle: 'elevated',
    sectionGradient: 'linear-gradient(135deg, #FBF7F0 0%, #F5EEE4 100%)',
    palette: {
      background: '#FBF7F0',
      foreground: '#1C2010',
      accent: '#E05830',
      accent2: '#48A060',
      card: '#FDF9F4',
      muted: '#8A9070',
      highlight: '#C04020',
      subtle: '#F8F4EC',
      ink: '#0E1008',
    },
    fonts: { heading: 'Pacifico', body: 'Quicksand' },
    wavePath: WAVE_PATHS['wave'].d,
    wavePathInverted: WAVE_PATHS['wave'].di,
    aiGenerated: false,
  },
];

// ── Label style ───────────────────────────────────────────────
const lbl: React.CSSProperties = {
  display: 'block', fontSize: '0.6rem', fontWeight: 800,
  letterSpacing: '0.16em', textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.35)', marginBottom: '0.45rem',
};

export function ThemeSwitcher({ currentVibeSkin, onApply }: ThemeSwitcherProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [hoveredName, setHoveredName] = useState<string | null>(null);

  // Determine which preset (if any) is currently active
  const activePresetName = PRESET_THEMES.find(
    t => t.fonts.heading === currentVibeSkin?.fonts?.heading &&
         t.fonts.body === currentVibeSkin?.fonts?.body &&
         t.palette.background === currentVibeSkin?.palette?.background
  )?.name ?? null;

  const pendingName = selected ?? activePresetName;

  const handleApply = () => {
    const theme = PRESET_THEMES.find(t => t.name === pendingName);
    if (theme) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { name: _name, ...skin } = theme;
      onApply(skin);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
        <span style={lbl}>Choose a Theme</span>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
      </div>

      {/* 3-column grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px',
      }}>
        {PRESET_THEMES.map((theme) => {
          const isActive = theme.name === (activePresetName);
          const isSelected = theme.name === pendingName;
          const isHovered = hoveredName === theme.name;

          return (
            <button
              key={theme.name}
              onClick={() => setSelected(theme.name)}
              onMouseEnter={() => setHoveredName(theme.name)}
              onMouseLeave={() => setHoveredName(null)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'stretch',
                padding: 0, borderRadius: '8px', border: 'none', cursor: 'pointer',
                background: 'rgba(255,255,255,0.04)',
                outline: isSelected
                  ? '2px solid #6b7c3f'
                  : isHovered ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.07)',
                overflow: 'hidden',
                transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                boxShadow: isHovered ? '0 4px 16px rgba(0,0,0,0.3)' : 'none',
                transition: 'all 0.15s ease',
                position: 'relative',
              }}
            >
              {/* Color swatch strip */}
              <div style={{
                display: 'flex', height: '28px',
              }}>
                <div style={{ flex: 3, background: theme.palette.background }} />
                <div style={{ flex: 1, background: theme.palette.accent }} />
                <div style={{ flex: 1, background: theme.palette.accent2 }} />
              </div>

              {/* Theme info */}
              <div style={{
                padding: '6px 7px', textAlign: 'left',
                background: isSelected ? 'rgba(107,124,63,0.15)' : 'transparent',
              }}>
                <div style={{
                  fontSize: '0.62rem', fontWeight: 700,
                  color: isSelected ? '#b4c87a' : 'rgba(255,255,255,0.75)',
                  lineHeight: 1.3, marginBottom: '1px',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {theme.name}
                </div>
                <div style={{
                  fontSize: '0.5rem', color: 'rgba(255,255,255,0.25)',
                  lineHeight: 1.3,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {theme.fonts.heading}
                </div>
              </div>

              {/* Active badge */}
              {isActive && (
                <div style={{
                  position: 'absolute', top: '4px', right: '4px',
                  fontSize: '0.42rem', fontWeight: 800, letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  background: '#6b7c3f', color: '#fff',
                  padding: '2px 5px', borderRadius: '3px',
                }}>
                  Active
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Apply button */}
      <button
        onClick={handleApply}
        disabled={!pendingName}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          padding: '9px 16px', borderRadius: '8px', border: 'none', cursor: pendingName ? 'pointer' : 'not-allowed',
          background: pendingName ? 'linear-gradient(135deg, #6b7c3f, #8a9e56)' : 'rgba(255,255,255,0.06)',
          color: pendingName ? '#fff' : 'rgba(255,255,255,0.3)',
          fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.04em',
          transition: 'all 0.15s',
          opacity: pendingName ? 1 : 0.6,
        }}
        onMouseOver={e => { if (pendingName) (e.currentTarget as HTMLElement).style.opacity = '0.85'; }}
        onMouseOut={e => { if (pendingName) (e.currentTarget as HTMLElement).style.opacity = '1'; }}
      >
        Apply Theme
      </button>

      {/* Customize link */}
      <div style={{ textAlign: 'center' }}>
        <button
          onClick={() => {
            const el = document.getElementById('design-customization');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '0.65rem', color: 'rgba(163,177,138,0.7)',
            textDecoration: 'underline', padding: '2px',
          }}
        >
          Customize colors &amp; fonts below
        </button>
      </div>
    </div>
  );
}
