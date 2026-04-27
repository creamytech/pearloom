'use client';

import { useMemo, useState } from 'react';
import type { StoryManifest } from '@/types';
import { Field, PanelSection, SegmentedToggle, SelectInput, TextInput } from '../atoms';
import { Blob, Pear, Sparkle, Squiggle, Icon } from '../../motifs';
import { DecorLibraryPanel } from './DecorLibraryPanel';
import { StickerTrayPanel } from './StickerTrayPanel';
import { AtmospherePanel } from './AtmospherePanel';
import { FontPicker } from './FontPicker';
import { ColorTokenInspector } from './ColorTokenInspector';
import { SpacingPanel } from './SpacingPanel';
import { SnapshotsPanel } from './SnapshotsPanel';
import {
  DecorPromptComposer,
  DecorAlternatesStrip,
  pushDraft,
  buildAutoSummary,
} from './decor-shared';
import type { DecorDraft } from '@/types';

interface ThemePreset {
  id: string;
  name: string;
  /** Swatch-display row (order: accent, secondary, tertiary, paper, deep, soft). */
  colors: string[];
  /** Canonical theme colors the renderer consumes. */
  theme: { background: string; foreground: string; accent: string; accentLight: string; muted: string; cardBg: string };
}

/* ────────────────────────────────────────────────────────────────────
   Curated palette library — 16 editorial presets spanning every event
   tone. Order matters: the first entry is the wedding default, and
   palettes within a category are roughly progressive (light → moody).
   ──────────────────────────────────────────────────────────────────── */
const PALETTES: ThemePreset[] = [
  // ── Editorial naturals (weddings, anniversaries, vow renewals) ──
  {
    id: 'olive-gold',
    name: 'Olive & Gold',
    colors: ['#3D4A1F', '#6d7d3f', '#D4A95D', '#F3E9D4', '#B89244', '#CBD29E'],
    theme: { background: '#F3E9D4', foreground: '#2B341A', accent: '#D4A95D', accentLight: '#E9E0C6', muted: '#6D7D3F', cardBg: '#FBF4E0' },
  },
  {
    id: 'groovy-garden',
    name: 'Groovy Garden',
    colors: ['#3D4A1F', '#8B9C5A', '#C4B5D9', '#F3E9D4', '#2A3512', '#D7CCE5'],
    theme: { background: '#F3E9D4', foreground: '#2A3512', accent: '#3D4A1F', accentLight: '#D7CCE5', muted: '#6D7D3F', cardBg: '#FBF4E0' },
  },
  {
    id: 'warm-linen',
    name: 'Warm Linen',
    colors: ['#8B4720', '#EAB286', '#F7DDC2', '#F3E9D4', '#C6703D', '#FBE8D6'],
    theme: { background: '#F3E9D4', foreground: '#5B3520', accent: '#C6703D', accentLight: '#FBE8D6', muted: '#8B4720', cardBg: '#FBF4E0' },
  },
  {
    id: 'tuscan-villa',
    name: 'Tuscan Villa',
    colors: ['#A04D2A', '#E8B07F', '#F4DCC4', '#FBF4E0', '#7C3A1A', '#F0C9A8'],
    theme: { background: '#FBF4E0', foreground: '#3F2615', accent: '#A04D2A', accentLight: '#F4DCC4', muted: '#8B4720', cardBg: '#FFFEF7' },
  },
  {
    id: 'cyprus-coast',
    name: 'Cyprus Coast',
    colors: ['#2B4D5E', '#7BA9B9', '#E0D9C5', '#F5EFE2', '#1A3140', '#CBDDE3'],
    theme: { background: '#F5EFE2', foreground: '#1A3140', accent: '#2B4D5E', accentLight: '#CBDDE3', muted: '#5C7E8C', cardBg: '#FBF7EE' },
  },

  // ── Soft & cinematic (engagements, baby showers) ──
  {
    id: 'dusk-meadow',
    name: 'Dusk Meadow',
    colors: ['#6B5A8C', '#B7A4D0', '#CBD29E', '#F3E9D4', '#4A3F6B', '#D7CCE5'],
    theme: { background: '#F3E9D4', foreground: '#4A3F6B', accent: '#6B5A8C', accentLight: '#D7CCE5', muted: '#8A7DAE', cardBg: '#FBF4E0' },
  },
  {
    id: 'gentle-bloom',
    name: 'Gentle Bloom',
    colors: ['#8E5A6D', '#E5BFC9', '#F5DCD7', '#FBF4E0', '#6B3F4F', '#F0CFD3'],
    theme: { background: '#FBF4E0', foreground: '#3F2530', accent: '#8E5A6D', accentLight: '#F5DCD7', muted: '#A87E8C', cardBg: '#FFFEF7' },
  },
  {
    id: 'morning-honey',
    name: 'Morning Honey',
    colors: ['#B8923F', '#E8C97E', '#F8E9C5', '#FBF7E8', '#8C6B22', '#F2DCA0'],
    theme: { background: '#FBF7E8', foreground: '#3D2C0E', accent: '#B8923F', accentLight: '#F8E9C5', muted: '#7C5E1F', cardBg: '#FFFEF7' },
  },

  // ── Bold & celebratory (bachelor/ette, milestone birthdays) ──
  {
    id: 'amalfi-spritz',
    name: 'Amalfi Spritz',
    colors: ['#D85A2C', '#FCB97D', '#FFE5BD', '#FFF4DD', '#A03414', '#F2D4A8'],
    theme: { background: '#FFF4DD', foreground: '#3D1908', accent: '#D85A2C', accentLight: '#FFE5BD', muted: '#A03414', cardBg: '#FFFEF7' },
  },
  {
    id: 'midnight-velvet',
    name: 'Midnight Velvet',
    colors: ['#D4A95D', '#7B5C9E', '#1A1A2E', '#0E0D1B', '#9A7A30', '#3F2F66'],
    theme: { background: '#0E0D1B', foreground: '#F1EBDC', accent: '#D4A95D', accentLight: '#3F2F66', muted: '#9A8FB3', cardBg: '#1A1A2E' },
  },
  {
    id: 'disco-club',
    name: 'Disco Club',
    colors: ['#E84A8C', '#F4D04A', '#3FA4D6', '#FBF4E0', '#A03665', '#FCEAA8'],
    theme: { background: '#FBF4E0', foreground: '#1A1A2E', accent: '#E84A8C', accentLight: '#FCEAA8', muted: '#A03665', cardBg: '#FFFEF7' },
  },

  // ── Cultural & ceremonial ──
  {
    id: 'monastery-stone',
    name: 'Monastery Stone',
    colors: ['#5C5042', '#A89878', '#E5DCC4', '#F5EFE2', '#3D2F1F', '#D5C7AA'],
    theme: { background: '#F5EFE2', foreground: '#3D2F1F', accent: '#5C5042', accentLight: '#E5DCC4', muted: '#7A6A52', cardBg: '#FBF7EE' },
  },
  {
    id: 'paper-crane',
    name: 'Paper Crane',
    colors: ['#9C2B2B', '#E0B69A', '#F4E5D5', '#F8F1E4', '#6B1818', '#F0D7C2'],
    theme: { background: '#F8F1E4', foreground: '#2A1414', accent: '#9C2B2B', accentLight: '#F4E5D5', muted: '#A85040', cardBg: '#FBF7EE' },
  },

  // ── Quiet & reverent (memorials, funerals, anniversaries) ──
  {
    id: 'ash-and-vellum',
    name: 'Ash & Vellum',
    colors: ['#3F4147', '#7C7E84', '#D6D0C2', '#F5EFE2', '#1F2127', '#BFB7A6'],
    theme: { background: '#F5EFE2', foreground: '#1F2127', accent: '#3F4147', accentLight: '#D6D0C2', muted: '#666870', cardBg: '#FBF7EE' },
  },
  {
    id: 'evening-vesper',
    name: 'Evening Vesper',
    colors: ['#1F2940', '#3D4F75', '#B0AFC6', '#EBE6DA', '#0E1424', '#7E84A8'],
    theme: { background: '#EBE6DA', foreground: '#0E1424', accent: '#1F2940', accentLight: '#B0AFC6', muted: '#3D4F75', cardBg: '#F5EFE2' },
  },

  // ── Modern & airy ──
  {
    id: 'bone-and-cobalt',
    name: 'Bone & Cobalt',
    colors: ['#1F3D6B', '#5A7CB0', '#E8E2D0', '#F5EFE2', '#152848', '#D2C9B5'],
    theme: { background: '#F5EFE2', foreground: '#152848', accent: '#1F3D6B', accentLight: '#E8E2D0', muted: '#5A7CB0', cardBg: '#FBF7EE' },
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
      <div data-pl-design-anchor="theme">
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
      </div>

      <div data-pl-design-anchor="palette">
        <PaletteSection manifest={manifest} active={active} palette={palette} applyPalette={applyPalette} onChange={onChange} />
        <CustomPaletteEditor manifest={manifest} onChange={onChange} applyPalette={applyPalette} />
      </div>

      <div data-pl-design-anchor="motif">
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
      </div>

      <div data-pl-design-anchor="fonts">
        <FontPicker manifest={manifest} onChange={onChange} />
      </div>

      <div data-pl-design-anchor="colors">
        <ColorTokenInspector manifest={manifest} onChange={onChange} />
      </div>

      <div data-pl-design-anchor="spacing">
        <SpacingPanel manifest={manifest} onChange={onChange} />
      </div>

      <SnapshotsPanel manifest={manifest} onChange={onChange} />

      <div data-pl-design-anchor="hero-decor">
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
      </div>

      <div data-pl-design-anchor="ai-accent">
        <AiAccentSection manifest={manifest} onChange={onChange} />
      </div>

      <div data-pl-design-anchor="atmosphere">
        <AtmospherePanel manifest={manifest} onChange={onChange} />
      </div>

      <div data-pl-design-anchor="decor">
        <DecorLibraryPanel manifest={manifest} onChange={onChange} />
      </div>

      <div data-pl-design-anchor="stickers">
        <StickerTrayPanel manifest={manifest} onChange={onChange} />
      </div>
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
  const [customPrompt, setCustomPrompt] = useState('');
  const existing = (manifest as unknown as { aiAccentUrl?: string }).aiAccentUrl;
  const occasion = (manifest as unknown as { occasion?: string }).occasion ?? 'wedding';
  const venue = manifest.logistics?.venue ?? '';
  const theme = (manifest as unknown as { theme?: { colors?: Record<string, string> } }).theme?.colors;
  const paletteHex = theme
    ? [theme.background, theme.accent, theme.accentLight, theme.foreground, theme.muted].filter(Boolean) as string[]
    : undefined;
  const siteId = (manifest as unknown as { subdomain?: string }).subdomain ?? 'preview';
  const vibe = (manifest as unknown as { vibeString?: string }).vibeString ?? '';
  const drafts: DecorDraft[] = manifest.decorDrafts?.accent ?? [];

  async function generate() {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch('/api/decor/ai-accent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId, occasion, venue, paletteHex, vibe,
          customPrompt: customPrompt.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `Accent failed (${res.status})`);
      }
      const data = (await res.json()) as {
        url?: string; prompt?: string; customPrompt?: string | null; isolated?: boolean; warning?: string;
      };
      if (!data.url) throw new Error('No accent URL returned');
      const draft: DecorDraft = {
        id: `accent-${Date.now()}`,
        url: data.url,
        prompt: data.prompt ?? '',
        customPrompt: data.customPrompt ?? undefined,
        createdAt: new Date().toISOString(),
        isolated: data.isolated,
      };
      onChange({
        ...manifest,
        aiAccentUrl: data.url,
        decorDrafts: { ...(manifest.decorDrafts ?? {}), accent: pushDraft(drafts, draft) },
      } as unknown as StoryManifest);
      if (data.warning) setError(data.warning);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Accent generation failed');
    } finally {
      setRunning(false);
    }
  }

  function clear() {
    onChange({ ...manifest, aiAccentUrl: undefined } as unknown as StoryManifest);
  }

  function pickDraft(d: DecorDraft) {
    onChange({ ...manifest, aiAccentUrl: d.url } as unknown as StoryManifest);
    setCustomPrompt(d.customPrompt ?? '');
  }

  function deleteDraft(d: DecorDraft) {
    const next = drafts.filter((x) => x.id !== d.id);
    const isActive = manifest.aiAccentUrl === d.url;
    onChange({
      ...manifest,
      aiAccentUrl: isActive ? next[0]?.url : manifest.aiAccentUrl,
      decorDrafts: { ...(manifest.decorDrafts ?? {}), accent: next },
    } as unknown as StoryManifest);
  }

  return (
    <PanelSection
      label="AI hero accent"
      hint="Have Pear draft a hand-drawn flourish behind your hero. Pure transparent PNG — composites cleanly on any palette."
    >
      {existing && (
        <div
          style={{
            position: 'relative', aspectRatio: '3/2',
            borderRadius: 10, overflow: 'hidden', marginBottom: 10,
            backgroundImage: `url(${existing})`,
            backgroundSize: 'contain', backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            background: `url(${existing}) center/contain no-repeat var(--cream-2)`,
            border: '1px solid var(--line-soft)',
          }}
        />
      )}
      <DecorPromptComposer
        value={customPrompt}
        onChange={setCustomPrompt}
        autoSummary={buildAutoSummary({ occasion, venue, vibe })}
        disabled={running}
      />
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
      <DecorAlternatesStrip
        drafts={drafts}
        activeUrl={existing}
        onSelect={pickDraft}
        onDelete={deleteDraft}
        onAlternate={generate}
        busy={running}
        aspect="3/2"
      />
    </PanelSection>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Palette section — three sources in one tabbed picker:
     • Curated  : the editorial library above
     • AI       : 3 bespoke palettes from /api/wizard/smart-palette
     • Custom   : palettes the host has saved in this site
   The picker wires every palette through the same applyPalette()
   helper so picking a curated, AI, or custom entry feels identical.
   ──────────────────────────────────────────────────────────────────── */
function PaletteSection({
  manifest,
  active,
  palette,
  applyPalette,
  onChange,
}: {
  manifest: StoryManifest;
  active: ThemePreset;
  palette: string;
  applyPalette: (p: ThemePreset) => void;
  onChange: (m: StoryManifest) => void;
}) {
  const [tab, setTab] = useState<'curated' | 'ai' | 'custom'>('curated');
  const [aiRunning, setAiRunning] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiPalettes, setAiPalettes] = useState<ThemePresetWithExtras[]>([]);

  const customPalettes = useMemo<ThemePresetWithExtras[]>(() => {
    const stored = (manifest as unknown as { customPalettes?: ThemePresetWithExtras[] }).customPalettes ?? [];
    return stored.map((p) => ({ ...p }));
  }, [manifest]);
  void active;

  async function generateAi() {
    setAiRunning(true);
    setAiError(null);
    try {
      const occasion = (manifest as unknown as { occasion?: string }).occasion ?? 'wedding';
      const names = (manifest as unknown as { names?: [string, string] }).names ?? ['', ''];
      const venue = manifest.logistics?.venue ?? '';
      const vibes = ((manifest as unknown as { vibeString?: string }).vibeString ?? '').split(',').map((s) => s.trim()).filter(Boolean);
      const res = await fetch('/api/wizard/smart-palette', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ occasion, names, venue, vibes }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `AI palette failed (${res.status})`);
      }
      const data = (await res.json()) as { palettes?: Array<{ id: string; name: string; rationale?: string; colors: string[] }> };
      const presets: ThemePreset[] = (data.palettes ?? []).map((p) => smartPaletteToPreset(p));
      setAiPalettes(presets);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI palette failed');
    } finally {
      setAiRunning(false);
    }
  }

  function saveToCustom(preset: ThemePreset, source: 'ai' | 'custom') {
    const stored = (manifest as unknown as { customPalettes?: ThemePreset[] }).customPalettes ?? [];
    // Avoid duplicates by id.
    if (stored.some((p) => p.id === preset.id)) return;
    onChange({
      ...manifest,
      customPalettes: [...stored, { ...preset, source, createdAt: new Date().toISOString() }],
    } as unknown as StoryManifest);
  }

  function deleteCustom(id: string) {
    const stored = (manifest as unknown as { customPalettes?: ThemePreset[] }).customPalettes ?? [];
    onChange({
      ...manifest,
      customPalettes: stored.filter((p) => p.id !== id),
    } as unknown as StoryManifest);
  }

  return (
    <PanelSection label="Palette" hint="16 curated, AI-tuned to your event, or one you build yourself.">
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {(['curated', 'ai', 'custom'] as const).map((t) => {
          const on = tab === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                padding: '6px 10px',
                borderRadius: 8,
                background: on ? 'var(--ink)' : 'var(--card)',
                color: on ? 'var(--cream)' : 'var(--ink-soft)',
                border: `1px solid ${on ? 'var(--ink)' : 'var(--line)'}`,
                fontSize: 12,
                fontWeight: on ? 700 : 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
                textTransform: 'capitalize',
              }}
            >
              {t === 'curated' ? `Curated (${PALETTES.length})` : t === 'ai' ? 'AI' : `Custom (${customPalettes.length})`}
            </button>
          );
        })}
      </div>

      {tab === 'curated' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {PALETTES.map((p) => (
            <PaletteTile key={p.id} preset={p} active={palette === p.id} onPick={() => applyPalette(p)} />
          ))}
        </div>
      )}

      {tab === 'ai' && (
        <>
          <button
            type="button"
            onClick={generateAi}
            disabled={aiRunning}
            className="btn btn-primary btn-sm"
            style={{ width: '100%', justifyContent: 'center', marginBottom: 12 }}
          >
            <Icon name="sparkles" size={13} />
            {aiRunning ? 'Asking Pear…' : aiPalettes.length ? 'Generate fresh palettes' : 'Suggest palettes from your event'}
          </button>
          {aiError && (
            <div role="alert" style={{ marginBottom: 10, fontSize: 12, color: '#7A2D2D', lineHeight: 1.45 }}>
              {aiError}
            </div>
          )}
          {aiPalettes.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {aiPalettes.map((p) => (
                <PaletteTile
                  key={p.id}
                  preset={p}
                  active={palette === p.id}
                  badge="AI"
                  rationale={p.rationale}
                  onPick={() => applyPalette(p)}
                  onSave={() => saveToCustom(p, 'ai')}
                />
              ))}
            </div>
          )}
          {aiPalettes.length === 0 && !aiRunning && (
            <div style={{ fontSize: 12, color: 'var(--ink-muted)', textAlign: 'center', padding: 14, lineHeight: 1.5 }}>
              We'll read your event's occasion, venue, and vibe and suggest 3 bespoke palettes — like sage&nbsp;+ ochre for a Tuscan villa, or slate&nbsp;+ rust for autumn Central Park.
            </div>
          )}
        </>
      )}

      {tab === 'custom' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {customPalettes.map((p) => (
            <PaletteTile
              key={p.id}
              preset={p}
              active={palette === p.id}
              badge={p.source === 'ai' ? 'AI' : 'You'}
              rationale={p.rationale}
              onPick={() => applyPalette(p)}
              onDelete={() => deleteCustom(p.id)}
            />
          ))}
          {customPalettes.length === 0 && (
            <div style={{ gridColumn: '1 / -1', fontSize: 12, color: 'var(--ink-muted)', textAlign: 'center', padding: 14, lineHeight: 1.5 }}>
              Saved AI palettes and palettes you build below will appear here.
            </div>
          )}
        </div>
      )}
    </PanelSection>
  );
}

interface ThemePresetWithExtras extends ThemePreset {
  source?: 'ai' | 'custom';
  rationale?: string;
}

function PaletteTile({
  preset,
  active,
  badge,
  rationale,
  onPick,
  onSave,
  onDelete,
}: {
  preset: ThemePresetWithExtras;
  active: boolean;
  badge?: string;
  rationale?: string;
  onPick: () => void;
  onSave?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div
      style={{
        position: 'relative',
        padding: 14,
        borderRadius: 14,
        background: active ? 'var(--cream-2)' : 'var(--card)',
        border: active ? '2px solid var(--ink)' : '1.5px solid var(--line)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <button
        type="button"
        onClick={onPick}
        style={{
          all: 'unset',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          fontFamily: 'var(--font-ui)',
        }}
      >
        <div style={{ display: 'flex', gap: 4 }}>
          {preset.colors.map((c, i) => (
            <div
              key={i}
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: c,
                border: '2px solid rgba(255,255,255,0.6)',
              }}
            />
          ))}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{preset.name}</div>
        {rationale && (
          <div style={{ fontSize: 11, color: 'var(--ink-muted)', lineHeight: 1.4 }}>{rationale}</div>
        )}
      </button>
      {badge && (
        <span
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: '0.1em',
            padding: '2px 6px',
            background: badge === 'AI' ? 'var(--peach-bg)' : 'var(--cream-2)',
            color: badge === 'AI' ? 'var(--peach-ink)' : 'var(--ink-muted)',
            borderRadius: 999,
          }}
        >
          {badge}
        </span>
      )}
      {(onSave || onDelete) && (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
          {onSave && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onSave(); }}
              style={{
                padding: '3px 8px',
                fontSize: 10.5,
                background: 'transparent',
                border: '1px solid var(--line)',
                borderRadius: 6,
                cursor: 'pointer',
                color: 'var(--ink-soft)',
                fontFamily: 'inherit',
              }}
            >
              Save
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              style={{
                padding: '3px 8px',
                fontSize: 10.5,
                background: 'transparent',
                border: '1px solid var(--line)',
                borderRadius: 6,
                cursor: 'pointer',
                color: '#7A2D2D',
                fontFamily: 'inherit',
              }}
            >
              Remove
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   CustomPaletteEditor — five color pickers (background, foreground,
   accent, accentLight, muted) + a name field. "Apply" sets the
   palette live; "Save" stores it as a custom palette.
   ──────────────────────────────────────────────────────────────────── */
function CustomPaletteEditor({
  manifest,
  onChange,
  applyPalette,
}: {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
  applyPalette: (p: ThemePreset) => void;
}) {
  const [open, setOpen] = useState(false);
  const seed = (manifest as unknown as { theme?: { colors?: ThemePreset['theme'] } }).theme?.colors;
  const [name, setName] = useState('My palette');
  const [bg, setBg] = useState(seed?.background ?? '#F3E9D4');
  const [fg, setFg] = useState(seed?.foreground ?? '#2A3512');
  const [accent, setAccent] = useState(seed?.accent ?? '#3D4A1F');
  const [accentLight, setAccentLight] = useState(seed?.accentLight ?? '#D7CCE5');
  const [muted, setMuted] = useState(seed?.muted ?? '#6D7D3F');

  const preset: ThemePreset = useMemo(() => {
    const id = `custom-${Date.now()}`;
    return {
      id,
      name: name.trim() || 'My palette',
      colors: [accent, muted, accentLight, bg, fg, accentLight],
      theme: {
        background: bg,
        foreground: fg,
        accent,
        accentLight,
        muted,
        cardBg: lighten(bg, 0.08),
      },
    };
  }, [name, bg, fg, accent, accentLight, muted]);

  function apply() {
    applyPalette(preset);
  }
  function save() {
    const stored = (manifest as unknown as { customPalettes?: ThemePreset[] }).customPalettes ?? [];
    onChange({
      ...manifest,
      customPalettes: [...stored, { ...preset, source: 'custom' as const, createdAt: new Date().toISOString() }],
    } as unknown as StoryManifest);
  }

  if (!open) {
    return (
      <PanelSection>
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: 12,
            background: 'transparent',
            border: '1px dashed var(--line)',
            color: 'var(--ink-soft)',
            fontSize: 13,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            fontFamily: 'inherit',
          }}
        >
          <Icon name="brush" size={13} /> Build your own palette
        </button>
      </PanelSection>
    );
  }

  return (
    <PanelSection
      label="Custom palette"
      hint="Pick five colours. Apply previews on the canvas; Save adds it to your custom library above."
      action={
        <button
          type="button"
          onClick={() => setOpen(false)}
          style={{ background: 'transparent', border: 'none', color: 'var(--ink-muted)', fontSize: 11, cursor: 'pointer' }}
        >
          Close
        </button>
      }
    >
      <Field label="Name">
        <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="My palette" />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginTop: 8 }}>
        {[
          { label: 'Paper',  value: bg,          set: setBg },
          { label: 'Ink',    value: fg,          set: setFg },
          { label: 'Accent', value: accent,      set: setAccent },
          { label: 'Soft',   value: accentLight, set: setAccentLight },
          { label: 'Muted',  value: muted,       set: setMuted },
        ].map((row) => (
          <label key={row.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <input
              type="color"
              value={row.value}
              onChange={(e) => row.set(e.target.value)}
              style={{
                width: '100%',
                height: 38,
                border: '1px solid var(--line)',
                borderRadius: 8,
                padding: 2,
                background: 'var(--card)',
                cursor: 'pointer',
              }}
            />
            <span style={{ fontSize: 10.5, color: 'var(--ink-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {row.label}
            </span>
          </label>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button type="button" onClick={apply} className="btn btn-outline btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
          Apply
        </button>
        <button type="button" onClick={save} className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
          Save to library
        </button>
      </div>
    </PanelSection>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Helpers — convert smart-palette response into a ThemePreset, and a
   small lighten() for deriving a card background from the paper hex.
   ──────────────────────────────────────────────────────────────────── */
function smartPaletteToPreset(p: { id: string; name: string; rationale?: string; colors: string[] }): ThemePresetWithExtras {
  // smart-palette returns [background, primary, accent, contrast]
  const [bg, primary, accent, contrast] = p.colors;
  return {
    id: p.id,
    name: p.name,
    colors: [accent ?? '#3D4A1F', primary ?? '#8B9C5A', bg ?? '#F3E9D4', bg ?? '#F3E9D4', contrast ?? '#2A3512', primary ?? '#8B9C5A'],
    theme: {
      background: bg ?? '#F3E9D4',
      foreground: contrast ?? '#2A3512',
      accent: accent ?? '#3D4A1F',
      accentLight: lighten(bg ?? '#F3E9D4', -0.04),
      muted: primary ?? '#6D7D3F',
      cardBg: lighten(bg ?? '#F3E9D4', 0.06),
    },
    source: 'ai',
    rationale: p.rationale,
  };
}

function lighten(hex: string, amount: number): string {
  if (!hex.startsWith('#') || (hex.length !== 7 && hex.length !== 4)) return hex;
  const full = hex.length === 4 ? '#' + hex.slice(1).split('').map((c) => c + c).join('') : hex;
  const r = parseInt(full.slice(1, 3), 16);
  const g = parseInt(full.slice(3, 5), 16);
  const b = parseInt(full.slice(5, 7), 16);
  const adjust = (v: number) => Math.max(0, Math.min(255, Math.round(v + 255 * amount)));
  const toHex = (v: number) => v.toString(16).padStart(2, '0');
  return `#${toHex(adjust(r))}${toHex(adjust(g))}${toHex(adjust(b))}`;
}
