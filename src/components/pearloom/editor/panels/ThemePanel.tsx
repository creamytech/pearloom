'use client';

import { useState } from 'react';
import type { StoryManifest } from '@/types';
import { Field, PanelSection, SegmentedToggle, SelectInput, TextInput } from '../atoms';
import { Blob, Pear, Sparkle, Squiggle } from '../../motifs';
import { DecorLibraryPanel } from './DecorLibraryPanel';
import { StickerTrayPanel } from './StickerTrayPanel';

interface ThemePreset {
  id: string;
  name: string;
  /** Swatch-display row (order: accent, secondary, tertiary, paper, deep, soft). */
  colors: string[];
  /** Canonical theme colors the renderer consumes. */
  theme: { background: string; foreground: string; accent: string; accentLight: string; muted: string; cardBg: string };
}

const PALETTES: ThemePreset[] = [
  {
    id: 'groovy-garden',
    name: 'Groovy Garden',
    colors: ['#3D4A1F', '#8B9C5A', '#C4B5D9', '#F3E9D4', '#2A3512', '#D7CCE5'],
    theme: { background: '#F3E9D4', foreground: '#2A3512', accent: '#3D4A1F', accentLight: '#D7CCE5', muted: '#6D7D3F', cardBg: '#FBF4E0' },
  },
  {
    id: 'dusk-meadow',
    name: 'Dusk Meadow',
    colors: ['#6B5A8C', '#B7A4D0', '#CBD29E', '#F3E9D4', '#4A3F6B', '#D7CCE5'],
    theme: { background: '#F3E9D4', foreground: '#4A3F6B', accent: '#6B5A8C', accentLight: '#D7CCE5', muted: '#8A7DAE', cardBg: '#FBF4E0' },
  },
  {
    id: 'warm-linen',
    name: 'Warm Linen',
    colors: ['#8B4720', '#EAB286', '#F7DDC2', '#F3E9D4', '#C6703D', '#FBE8D6'],
    theme: { background: '#F3E9D4', foreground: '#5B3520', accent: '#C6703D', accentLight: '#FBE8D6', muted: '#8B4720', cardBg: '#FBF4E0' },
  },
  {
    id: 'olive-gold',
    name: 'Olive & Gold',
    colors: ['#3D4A1F', '#6d7d3f', '#D4A95D', '#F3E9D4', '#B89244', '#CBD29E'],
    theme: { background: '#F3E9D4', foreground: '#2B341A', accent: '#D4A95D', accentLight: '#E9E0C6', muted: '#6D7D3F', cardBg: '#FBF4E0' },
  },
];

const MOTIFS = [
  { id: 'pear', name: 'Pear Stamps', icon: <Pear size={22} tone="sage" shadow={false} /> },
  { id: 'squiggle', name: 'Loop Lines', icon: <Squiggle variant={1} width={36} height={16} /> },
  { id: 'blob', name: 'Soft Shapes', icon: <Blob tone="lavender" size={28} /> },
];

const SPACING = ['Cozy', 'Comfortable', 'Spacious'] as const;

const HEADING_FONTS = [
  { value: 'Fraunces', label: 'Fraunces (default)' },
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'Georgia', label: 'Georgia' },
];
const BODY_FONTS = [
  { value: 'Inter', label: 'Inter (default)' },
  { value: 'Geist', label: 'Geist' },
  { value: 'Satoshi', label: 'Satoshi' },
];
const SCRIPT_FONTS = [
  { value: 'Caveat', label: 'Caveat (default)' },
  { value: 'Homemade Apple', label: 'Homemade Apple' },
  { value: 'Dancing Script', label: 'Dancing Script' },
];

function read<T>(manifest: StoryManifest, key: string, fallback: T): T {
  return ((manifest as unknown as Record<string, T>)[key] ?? fallback) as T;
}

export function ThemePanel({
  manifest,
  onChange,
}: {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}) {
  const palette = read<string>(manifest, 'palette', PALETTES[0].id);
  const motif = read<string>(manifest, 'motif', 'pear');
  const spacing = read<string>(manifest, 'spacing', 'Comfortable');
  const headingFont = read<string>(manifest, 'headingFont', 'Fraunces');
  const bodyFont = read<string>(manifest, 'bodyFont', 'Inter');
  const scriptFont = read<string>(manifest, 'scriptFont', 'Caveat');
  const themeName = read<string>(manifest, 'themeName', 'Groovy Ceremony');
  const active = PALETTES.find((p) => p.id === palette) ?? PALETTES[0];

  function update(patch: Record<string, unknown>) {
    onChange({ ...manifest, ...patch } as unknown as StoryManifest);
  }

  /** Writes the preset's full theme to manifest.theme.colors so
   *  SiteV8Renderer's themeStyle CSS-var overrides see the change
   *  the moment the user picks a swatch. Also keeps the legacy
   *  `palette` / `themeName` fields in sync for older consumers. */
  function applyPalette(preset: ThemePreset) {
    const existingTheme = (manifest as unknown as { theme?: Record<string, unknown> }).theme ?? {};
    onChange({
      ...manifest,
      palette: preset.id,
      themeName: preset.name,
      theme: {
        ...existingTheme,
        colors: preset.theme,
      },
    } as unknown as StoryManifest);
  }

  /** Patches manifest.theme.fonts.{heading|body} so typography
   *  changes from this panel flow through to SiteV8Renderer. */
  function applyFont(slot: 'heading' | 'body', value: string) {
    const existingTheme = ((manifest as unknown as { theme?: { fonts?: Record<string, string> } }).theme ?? {}) as Record<string, unknown>;
    const existingFonts = ((existingTheme.fonts as Record<string, string> | undefined) ?? {}) as Record<string, string>;
    onChange({
      ...manifest,
      [slot === 'heading' ? 'headingFont' : 'bodyFont']: value,
      theme: {
        ...existingTheme,
        fonts: { ...existingFonts, [slot]: value },
      },
    } as unknown as StoryManifest);
  }

  return (
    <div>
      <PanelSection label="Active theme" hint="Pearloom themes bundle palette, motif, and typography into a named look.">
        <div
          style={{
            display: 'flex',
            gap: 14,
            alignItems: 'center',
            padding: 14,
            background: 'var(--card)',
            border: '1px solid var(--card-ring)',
            borderRadius: 14,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: `linear-gradient(135deg, ${active.colors[0]}, ${active.colors[1]}, ${active.colors[2]})`,
            }}
          />
          <div style={{ flex: 1 }}>
            <Field label="Theme name">
              <TextInput
                value={themeName}
                onChange={(e) => update({ themeName: e.target.value })}
                placeholder="Our theme"
              />
            </Field>
          </div>
        </div>
      </PanelSection>

      <PanelSection label="Palette" hint="Every color on your site flows from this choice.">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {PALETTES.map((p) => {
            const on = palette === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPalette(p)}
                style={{
                  padding: 14,
                  borderRadius: 14,
                  background: on ? 'var(--cream-2)' : 'var(--card)',
                  border: on ? '2px solid var(--ink)' : '1.5px solid var(--line)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  fontFamily: 'var(--font-ui)',
                }}
              >
                <div style={{ display: 'flex', gap: 4 }}>
                  {p.colors.map((c, i) => (
                    <div
                      key={i}
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        background: c,
                        border: '2px solid rgba(255,255,255,0.6)',
                      }}
                    />
                  ))}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{p.name}</div>
              </button>
            );
          })}
        </div>
      </PanelSection>

      <PanelSection label="Motif" hint="Decorative shapes that punctuate the design.">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {MOTIFS.map((m) => {
            const on = motif === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => update({ motif: m.id })}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  background: on ? 'var(--sage-tint)' : 'var(--card)',
                  border: on ? '1.5px solid var(--sage-deep)' : '1.5px solid var(--line)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  fontFamily: 'var(--font-ui)',
                }}
              >
                <div style={{ height: 30, display: 'grid', placeItems: 'center' }}>{m.icon}</div>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink)' }}>{m.name}</div>
              </button>
            );
          })}
        </div>
      </PanelSection>

      <PanelSection label="Section spacing" hint="How much air between each section.">
        <SegmentedToggle<string>
          value={spacing}
          onChange={(v) => update({ spacing: v })}
          options={SPACING.map((s) => ({ value: s, label: s }))}
        />
      </PanelSection>

      <PanelSection label="Typography" hint="Headlines, body, and handwriting touch.">
        <Field label="Headings">
          <SelectInput value={headingFont} onChange={(v) => applyFont('heading', v)} options={HEADING_FONTS} />
        </Field>
        <Field label="Body">
          <SelectInput value={bodyFont} onChange={(v) => applyFont('body', v)} options={BODY_FONTS} />
        </Field>
        <Field label="Script">
          <SelectInput value={scriptFont} onChange={(v) => update({ scriptFont: v })} options={SCRIPT_FONTS} />
        </Field>
      </PanelSection>

      <PanelSection
        label="Hero decoration"
        hint="Occasion-aware shapes match your event; classic keeps the v8 cream blobs; off is clean."
      >
        <SegmentedToggle<string>
          value={read<string>(manifest, 'decorStyle', 'occasion')}
          onChange={(v) => update({ decorStyle: v })}
          options={[
            { value: 'occasion', label: 'By occasion' },
            { value: 'classic', label: 'Classic' },
            { value: 'off', label: 'Off' },
          ]}
        />
      </PanelSection>

      <AiAccentSection manifest={manifest} onChange={onChange} />

      <DecorLibraryPanel manifest={manifest} onChange={onChange} />

      <StickerTrayPanel manifest={manifest} onChange={onChange} />
    </div>
  );
}

/* ========================================================================
   AI accent section — asks GPT Image 2 to draft a hero-edge flourish
   using the site's occasion + venue + palette. Sets manifest.aiAccentUrl
   on success; the renderer composites the PNG over the hero at 38%
   opacity with multiply blend so it reads as an integrated flourish.
   ======================================================================== */
function AiAccentSection({
  manifest,
  onChange,
}: {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const existing = (manifest as unknown as { aiAccentUrl?: string }).aiAccentUrl;
  const occasion = (manifest as unknown as { occasion?: string }).occasion ?? 'wedding';
  const venue = manifest.logistics?.venue ?? '';
  const theme = (manifest as unknown as { theme?: { colors?: Record<string, string> } }).theme?.colors;
  const paletteHex = theme
    ? [theme.background, theme.accent, theme.accentLight, theme.foreground, theme.muted].filter(Boolean) as string[]
    : undefined;
  const siteId = (manifest as unknown as { subdomain?: string }).subdomain ?? 'preview';

  async function generate() {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch('/api/decor/ai-accent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId,
          occasion,
          venue,
          paletteHex,
          vibe: (manifest as unknown as { vibeString?: string }).vibeString ?? '',
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `Accent failed (${res.status})`);
      }
      const data = (await res.json()) as { url?: string };
      if (!data.url) throw new Error('No accent URL returned');
      onChange({ ...manifest, aiAccentUrl: data.url } as unknown as StoryManifest);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Accent generation failed');
    } finally {
      setRunning(false);
    }
  }

  function clear() {
    onChange({ ...manifest, aiAccentUrl: undefined } as unknown as StoryManifest);
  }

  return (
    <PanelSection
      label="AI hero accent"
      hint="Have Pear draft a hand-drawn flourish that matches your venue, palette, and occasion. Uses GPT Image 2."
    >
      {existing && (
        <div
          style={{
            position: 'relative',
            aspectRatio: '3/2',
            borderRadius: 10,
            overflow: 'hidden',
            marginBottom: 10,
            backgroundImage: `url(${existing})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            border: '1px solid var(--line-soft)',
          }}
        />
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          id="pl-ai-accent-btn"
          type="button"
          onClick={generate}
          disabled={running}
          className="btn btn-outline btn-sm"
        >
          {running ? 'Drafting…' : existing ? 'Draft a new one' : 'Draft an accent'}
        </button>
        {existing && (
          <button type="button" onClick={clear} className="btn btn-ghost btn-sm" disabled={running}>
            Remove
          </button>
        )}
      </div>
      {error && (
        <div role="alert" style={{ marginTop: 10, fontSize: 12, color: '#7A2D2D', lineHeight: 1.45 }}>
          {error}
        </div>
      )}
    </PanelSection>
  );
}
