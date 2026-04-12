'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/editor/ColorPalettePanel.tsx
// Custom color palette + AI-generated bespoke SVG background art.
// Every couple gets truly original artwork written by Gemini —
// botanical illustrations, cultural motifs, abstract art —
// tuned to their names, vibe, place, and colors.
// ─────────────────────────────────────────────────────────────

import { useState, useCallback, useRef } from 'react';
import { ColorPicker } from '@/components/ui/color-picker';
import { motion, AnimatePresence } from 'framer-motion';
import { panelText, panelWeight, panelTracking } from './panel';
import {
  RefreshCw, Check, Sparkles, Loader2, Wand2,
  Download, Copy, AlertTriangle, ChevronRight, Image,
} from 'lucide-react';
import type { StoryManifest, ThemeSchema } from '@/types';

// ── Curated preset palettes ────────────────────────────────────
interface PresetPalette {
  name: string;
  accent: string;
  description: string;
  colors: ThemeSchema['colors'];
  fonts: ThemeSchema['fonts'];
  borderRadius: string;
}

const PRESET_PALETTES: PresetPalette[] = [
  {
    name: 'Warm Ivory',
    accent: '#D4A574',
    description: 'Classic, romantic, timeless',
    colors: { background: '#faf9f6', foreground: '#1a1a1a', accent: '#18181B', accentLight: '#f3e8d8', muted: '#8c8c8c', cardBg: '#ffffff' },
    fonts: { heading: 'Playfair Display', body: 'Inter' },
    borderRadius: '1rem',
  },
  {
    name: 'Dark Romance',
    accent: '#c9706a',
    description: 'Moody, dramatic, luxurious',
    colors: { background: '#0f0e0d', foreground: '#f5f0ea', accent: '#c9706a', accentLight: '#2a1515', muted: '#7a7068', cardBg: '#1a1815' },
    fonts: { heading: 'Cormorant Garamond', body: 'Raleway' },
    borderRadius: '0.5rem',
  },
  {
    name: 'Garden Sage',
    accent: '#6a8f5a',
    description: 'Botanical, organic, serene',
    colors: { background: '#f4f7f1', foreground: '#1e2a1a', accent: '#6a8f5a', accentLight: '#ddebd4', muted: '#7a8c72', cardBg: '#ffffff' },
    fonts: { heading: 'Cormorant Garamond', body: 'Inter' },
    borderRadius: '1.5rem',
  },
  {
    name: 'Coastal Blue',
    accent: '#3a7ca8',
    description: 'Fresh, breezy, nautical',
    colors: { background: '#f0f5fa', foreground: '#0c1f2e', accent: '#3a7ca8', accentLight: '#cce3f5', muted: '#6a8fa8', cardBg: '#ffffff' },
    fonts: { heading: 'Libre Baskerville', body: 'Source Sans Pro' },
    borderRadius: '0.75rem',
  },
  {
    name: 'Desert Gold',
    accent: '#c97c30',
    description: 'Earthy, warm, Southwest boho',
    colors: { background: '#fdf8f0', foreground: '#2c1a0a', accent: '#c97c30', accentLight: '#faebd7', muted: '#9a7a55', cardBg: '#fffaf4' },
    fonts: { heading: 'Josefin Sans', body: 'Lato' },
    borderRadius: '0.25rem',
  },
  {
    name: 'Midnight Lavender',
    accent: '#9b7fd9',
    description: 'Dreamy, celestial, ethereal',
    colors: { background: '#0d0b14', foreground: '#f0eeff', accent: '#9b7fd9', accentLight: '#1e1a30', muted: '#7a6ea0', cardBg: '#131020' },
    fonts: { heading: 'Cormorant Garamond', body: 'Inter' },
    borderRadius: '1rem',
  },
  {
    name: 'Blush & Champagne',
    accent: '#d4829a',
    description: 'Soft, feminine, glamorous',
    colors: { background: '#fdf8f5', foreground: '#2a1a18', accent: '#d4829a', accentLight: '#fce8ef', muted: '#b0889a', cardBg: '#fff9f7' },
    fonts: { heading: 'Playfair Display', body: 'Poppins' },
    borderRadius: '2rem',
  },
  {
    name: 'Minimalist White',
    accent: '#111111',
    description: 'Clean, modern, editorial',
    colors: { background: '#ffffff', foreground: '#111111', accent: '#111111', accentLight: '#f5f5f5', muted: '#888888', cardBg: '#f8f8f8' },
    fonts: { heading: 'DM Serif Display', body: 'DM Sans' },
    borderRadius: '0.25rem',
  },
];

// ── Art Style options for the prompt ──────────────────────────
const ART_STYLES = [
  { id: 'botanical',    label: 'Botanical',   hint: 'Botanical illustration, pressed flowers, vines' },
  { id: 'cultural',    label: 'Cultural',     hint: 'Cultural motifs from your favorite place' },
  { id: 'celestial',   label: 'Celestial',   hint: 'Stars, constellations, moons, night sky' },
  { id: 'abstract',    label: 'Abstract',    hint: 'Flowing curves, organic shapes, abstract art' },
  { id: 'geometric',   label: 'Geometric',   hint: 'Precise geometry, art deco, tessellation' },
  { id: 'landscape',   label: 'Landscape',   hint: 'Horizon lines, mountains, water, countryside' },
  { id: 'typographic', label: 'Typographic', hint: 'Elegant script flourishes, monograms, letters' },
  { id: 'romantic',    label: 'Romantic',    hint: 'Roses, ribbons, swirls, romantic motifs' },
];

// ── Swatch picker ──────────────────────────────────────────────
function Swatch({ color, onChange, label }: { color: string; onChange: (c: string) => void; label: string }) {
  return (
    <div>
      <label style={{
        display: 'block',
        fontSize: panelText.label,
        fontWeight: panelWeight.bold,
        letterSpacing: panelTracking.wider,
        textTransform: 'uppercase',
        color: '#71717A',
        marginBottom: '6px',
      }}>{label}</label>
      <ColorPicker value={color} onChange={onChange} />
    </div>
  );
}

// ── SVG Preview Canvas ─────────────────────────────────────────
function SvgPreview({ svg, bg, label }: { svg: string; bg: string; label?: string }) {
  const dataUri = `data:image/svg+xml,${encodeURIComponent(svg)}`;

  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        width: '100%', height: '140px', borderRadius: '10px',
        background: bg,
        backgroundImage: `url("${dataUri}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        border: '1px solid rgba(0,0,0,0.06)',
        overflow: 'hidden',
      }}>
        {/* Overlay gradient for readability */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, rgba(0,0,0,0.08) 0%, transparent 100%)',
        }} />
      </div>
      {label && (
        <div style={{
          position: 'absolute', bottom: '8px', left: '8px',
          fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: '#3F3F46',
          padding: '2px 6px', borderRadius: '4px',
        }}>{label}</div>
      )}
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────────
interface ColorPalettePanelProps {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
  names?: [string, string]; // passed from FullscreenEditor
}

export function ColorPalettePanel({ manifest, onChange, names }: ColorPalettePanelProps) {
  const theme = manifest.theme || PRESET_PALETTES[0];
  const [colors, setColors] = useState<ThemeSchema['colors']>(theme.colors || PRESET_PALETTES[0].colors);
  const [activeTab, setActiveTab] = useState<'custom' | 'ai-art'>('custom');

  // AI Art state — initialize from manifest if background art was previously generated
  const [place, setPlace] = useState('');
  const [artStyle, setArtStyle] = useState('botanical');
  const [extraPrompt, setExtraPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedSvg, setGeneratedSvg] = useState<string | null>(() => {
    // Recover SVG from manifest.backgroundPatternCss data URI
    const css = manifest.backgroundPatternCss;
    if (!css) return null;
    const match = css.match(/^url\("data:image\/svg\+xml,(.+)"\)$/);
    if (match) {
      try { return decodeURIComponent(match[1]); } catch { return null; }
    }
    return null;
  });
  const [prevSvgs, setPrevSvgs] = useState<string[]>([]);
  const [genError, setGenError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);

  const accent = colors.accent || '#18181B';
  const bg = colors.background || '#faf9f6';

  // Apply colors + optional SVG background to manifest
  const commit = useCallback((newColors: ThemeSchema['colors'], svgArt?: string | null) => {
    let backgroundPatternCss: string | undefined = manifest.backgroundPatternCss;

    if (svgArt !== undefined) {
      backgroundPatternCss = svgArt
        ? `url("data:image/svg+xml,${encodeURIComponent(svgArt)}")`
        : undefined;
    }

    const updated: StoryManifest = {
      ...manifest,
      theme: {
        ...(manifest.theme || PRESET_PALETTES[0]),
        colors: newColors,
      },
      backgroundPatternCss,
    };
    onChange(updated);
  }, [manifest, onChange]);

  const applyPreset = (preset: PresetPalette) => {
    setColors(preset.colors);
    commit(preset.colors);
  };

  const updateColor = (key: keyof ThemeSchema['colors'], value: string) => {
    const updated = { ...colors, [key]: value };
    setColors(updated);
    commit(updated);
  };

  // ── Generate AI Art ──────────────────────────────────────────
  const generateArt = async () => {
    setGenerating(true);
    setGenError(null);
    setIsFallback(false);

    // Save previous for history strip
    if (generatedSvg) {
      setPrevSvgs(prev => [generatedSvg, ...prev].slice(0, 4));
    }

    try {
      const coupleNames = names ?? [manifest.coupleId || 'the couple', ''];
      const vibeString = [
        manifest.vibeString || '',
        extraPrompt,
      ].filter(Boolean).join('. ');

      const res = await fetch('/api/generate-pattern', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          names: coupleNames,
          vibeString,
          place,
          accent,
          bg,
          style: ART_STYLES.find(s => s.id === artStyle)?.hint || artStyle,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Generation failed');

      setGeneratedSvg(data.svg);
      setIsFallback(!!data.fallback);
      // Auto-apply
      commit(colors, data.svg);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const applyHistorySvg = (svg: string) => {
    setGeneratedSvg(svg);
    commit(colors, svg);
  };

  const removeBackground = () => {
    setGeneratedSvg(null);
    commit(colors, null);
  };

  const tabs = [
    { id: 'custom',   label: 'Custom Colors' },
    { id: 'ai-art',   label: 'AI Background' },
  ] as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Tab strip */}
      <div style={{
        display: 'flex', gap: '2px',
        background: 'rgba(24,24,27,0.04)', padding: '3px', borderRadius: '8px',
      }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              flex: 1, padding: '5px 0', borderRadius: '6px', border: 'none',
              background: activeTab === t.id ? 'rgba(24,24,27,0.1)' : 'transparent',
              color: activeTab === t.id ? '#18181B' : '#71717A',
              cursor: 'pointer', fontSize: '0.65rem', fontWeight: 700,
              transition: 'all 0.15s', whiteSpace: 'nowrap',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Custom tab ── */}
      {activeTab === 'custom' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <Swatch label="Background" color={colors.background} onChange={v => updateColor('background', v)} />
            <Swatch label="Text"       color={colors.foreground} onChange={v => updateColor('foreground', v)} />
            <Swatch label="Accent"     color={colors.accent}     onChange={v => updateColor('accent', v)} />
            <Swatch label="Accent Light" color={colors.accentLight} onChange={v => updateColor('accentLight', v)} />
            <Swatch label="Muted"      color={colors.muted}      onChange={v => updateColor('muted', v)} />
            <Swatch label="Card BG"    color={colors.cardBg}     onChange={v => updateColor('cardBg', v)} />
          </div>
          <button
            onClick={() => applyPreset(PRESET_PALETTES[0])}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '6px 10px', borderRadius: '6px',
              border: '1px solid rgba(0,0,0,0.06)', background: 'transparent',
              color: '#71717A', cursor: 'pointer', fontSize: '0.65rem',
            }}
          >
            <RefreshCw size={10} /> Reset to default
          </button>
        </div>
      )}

      {/* ── AI Art tab ── */}
      {activeTab === 'ai-art' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

          {/* Explainer */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(155,127,217,0.1), rgba(24,24,27,0.04))',
            border: '1px solid rgba(24,24,27,0.1)',
            borderRadius: '10px', padding: '10px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <Sparkles size={12} color="#18181B" />
              <span style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#18181B' }}>
                Bespoke AI Background Art
              </span>
            </div>
            <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.55, margin: 0 }}>
              Gemini writes a unique SVG illustration just for your couple — botanical, cultural, celestial — no two are alike.
            </p>
          </div>

          {/* Inputs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Place / inspiration */}
            <div>
              <label style={{
                display: 'block', fontSize: '0.62rem', fontWeight: 800,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                color: '#71717A', marginBottom: '6px',
              }}>
                Place or inspiration
              </label>
              <input
                value={place}
                onChange={e => setPlace(e.target.value)}
                placeholder="Santorini, Japanese garden, Tuscany vineyard, the Alps…"
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: '7px',
                  border: '1px solid rgba(0,0,0,0.06)', background: '#F4F4F5',
                  color: '#18181B', fontSize: '0.78rem', outline: 'none', fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = '#A1A1AA'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.06)'; }}
              />
            </div>

            {/* Art style grid */}
            <div>
              <label style={{
                display: 'block', fontSize: '0.62rem', fontWeight: 800,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                color: '#71717A', marginBottom: '6px',
              }}>
                Art style
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(65px, 1fr))', gap: '4px' }}>
                {ART_STYLES.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setArtStyle(s.id)}
                    title={s.hint}
                    style={{
                      padding: '5px 4px', borderRadius: '6px',
                      border: `1px solid ${artStyle === s.id ? '#18181B' : 'rgba(0,0,0,0.05)'}`,
                      background: artStyle === s.id ? 'rgba(24,24,27,0.08)' : 'transparent',
                      color: artStyle === s.id ? '#18181B' : '#3F3F46',
                      cursor: 'pointer', fontSize: '0.6rem', fontWeight: 700,
                      textAlign: 'center', transition: 'all 0.15s', lineHeight: 1.3,
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Extra prompt */}
            <div>
              <label style={{
                display: 'block', fontSize: '0.62rem', fontWeight: 800,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                color: '#71717A', marginBottom: '6px',
              }}>
                Extra details (optional)
              </label>
              <textarea
                value={extraPrompt}
                onChange={e => setExtraPrompt(e.target.value)}
                rows={2}
                placeholder="We met hiking in the mountains, we love jazz, our dog is a golden retriever…"
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: '7px',
                  border: '1px solid rgba(0,0,0,0.06)', background: '#F4F4F5',
                  color: '#18181B', fontSize: '0.75rem', outline: 'none', fontFamily: 'inherit',
                  boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.5,
                }}
                onFocus={e => { e.currentTarget.style.borderColor = '#A1A1AA'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.06)'; }}
              />
            </div>
          </div>

          {/* Generate button */}
          <motion.button
            onClick={generateArt}
            disabled={generating}
            whileHover={{ scale: generating ? 1 : 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '12px', borderRadius: '8px', border: 'none',
              background: generating
                ? 'rgba(0,0,0,0.04)'
                : 'linear-gradient(135deg, #9b7fd9, #18181B)',
              color: generating ? '#3F3F46' : '#fff',
              fontSize: '0.82rem', fontWeight: 800, cursor: generating ? 'not-allowed' : 'pointer',
              letterSpacing: '0.05em', boxShadow: generating ? 'none' : '0 4px 20px rgba(155,127,217,0.3)',
              transition: 'all 0.2s',
            }}
          >
            {generating ? (
              <>
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                <span>
                  Crafting
                  <motion.span
                    animate={{ opacity: [0, 1, 1, 0] }}
                    transition={{ duration: 1.4, repeat: Infinity, times: [0, 0.2, 0.8, 1] }}
                  >&thinsp;.</motion.span>
                  <motion.span
                    animate={{ opacity: [0, 1, 1, 0] }}
                    transition={{ duration: 1.4, repeat: Infinity, times: [0, 0.2, 0.8, 1], delay: 0.2 }}
                  >.</motion.span>
                  <motion.span
                    animate={{ opacity: [0, 1, 1, 0] }}
                    transition={{ duration: 1.4, repeat: Infinity, times: [0, 0.2, 0.8, 1], delay: 0.4 }}
                  >.</motion.span>
                </span>
              </>
            ) : (
              <>
                <Wand2 size={14} />
                Generate Bespoke Art
              </>
            )}
          </motion.button>

          {/* Error */}
          {genError && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 10px',
              borderRadius: '7px', background: 'rgba(24,24,27,0.06)',
              border: '1px solid rgba(24,24,27,0.1)', fontSize: '0.72rem', color: '#71717A',
            }}>
              <AlertTriangle size={12} /> {genError}
            </div>
          )}

          {/* Preview of generated art */}
          <AnimatePresence>
            {generatedSvg && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
              >
                {isFallback && (
                  <div style={{
                    fontSize: '0.62rem', color: '#71717A',
                    display: 'flex', alignItems: 'center', gap: '4px',
                  }}>
                    <AlertTriangle size={9} /> Using generative fallback — try again for a Gemini-crafted design
                  </div>
                )}

                <SvgPreview svg={generatedSvg} bg={bg} label="Your artwork" />

                {/* Actions */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={generateArt}
                    disabled={generating}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      gap: '4px', padding: '7px', borderRadius: '6px',
                      border: '1px solid #E4E4E7', background: 'rgba(24,24,27,0.04)',
                      color: '#18181B', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700,
                    }}
                  >
                    <RefreshCw size={11} /> Regenerate
                  </button>
                  <button
                    onClick={removeBackground}
                    style={{
                      padding: '7px 12px', borderRadius: '6px',
                      border: '1px solid rgba(0,0,0,0.06)', background: 'transparent',
                      color: '#71717A', cursor: 'pointer', fontSize: '0.7rem',
                    }}
                  >
                    Remove
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* History strip */}
          {prevSvgs.length > 0 && (
            <div>
              <div style={{
                fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.12em',
                textTransform: 'uppercase', color: '#71717A', marginBottom: '6px',
              }}>
                Previous generations
              </div>
              <div style={{ display: 'flex', gap: '5px' }}>
                {prevSvgs.map((svg, i) => (
                  <button
                    key={i}
                    onClick={() => applyHistorySvg(svg)}
                    title={`Apply generation ${i + 1}`}
                    style={{
                      flex: 1, height: '48px', borderRadius: '6px',
                      background: bg,
                      backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
                      backgroundSize: 'cover',
                      border: '1px solid rgba(0,0,0,0.06)',
                      cursor: 'pointer', transition: 'border-color 0.15s',
                    }}
                    onMouseOver={e => { e.currentTarget.style.borderColor = '#18181B'; }}
                    onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.06)'; }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Tip */}
          <p style={{
            fontSize: '0.62rem', color: '#71717A', lineHeight: 1.5, margin: 0,
            borderTop: '1px solid #F4F4F5', paddingTop: '8px',
          }}>
            The more specific you are — place, story details, style — the more unique and tailored the artwork becomes. Hit Regenerate for a fresh interpretation.
          </p>
        </div>
      )}
    </div>
  );
}
