'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { StoryManifest } from '@/types';
import { DEFAULT_HOME_BLOCKS, type SiteMode } from '@/lib/site-mode';
import { Field, PanelGroup, PanelSection, SegmentedToggle, SelectInput, TextInput } from '../atoms';
import { Blob, Pear, Sparkle, Squiggle, Icon } from '../../motifs';
import { PACKS, type Pack } from '@/lib/theme-store/packs';
import { applyPackToManifest } from '@/lib/theme-store/apply';
import { PackPreview } from '../../store/PackPreview';
import { startDecorJob, completeDecorJob } from '@/lib/decor-bus';
import { StickerTrayPanel } from './StickerTrayPanel';
import { AtmospherePanel } from './AtmospherePanel';
import { FontPicker } from './FontPicker';
import { ColorTokenInspector } from './ColorTokenInspector';
import { V8ColorPicker } from '../v8-color-picker';
import { SpacingPanel } from './SpacingPanel';
import { SnapshotsPanel } from './SnapshotsPanel';
import { EditionPicker } from './EditionPicker';
import { SiteLayoutPicker } from './SiteLayoutPicker';
import { KitPicker } from './KitPicker';
import { PearThinking } from '../../pear-thinking';
import { EDITIONS } from '@/lib/site-editions/editions';
import { resolveEdition } from '@/lib/site-editions/resolve';
import { getEventType } from '@/lib/event-os/event-types';
import {
  SiteLookHeader,
  EventTypeSection,
  GenerateFromStoryCard,
  FineTuneSection,
  MatchMyPhotosSection,
  SavedLooksSection,
  MatchingSaveTheDateCTA,
} from './theme-panel-sections';
import {
  DecorPromptComposer,
  DecorAlternatesStrip,
  pushDraft,
  buildAutoSummary,
} from './decor-shared';
import type { DecorDraft } from '@/types';
import {
  reportContrast,
  suggestTweak,
  formatRatio,
  ratingLabel,
  type ContrastRating,
  type ContrastTweak,
} from '@/lib/wcag-contrast';

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
  // Audited 2026-04-30: legacy top-level reads (palette, spacing,
  // headingFont, bodyFont, scriptFont, themeName) are gone. Theme
  // colors live on manifest.theme.colors; fonts on theme.fonts.*.
  // The palette swatches still match against manifest.theme.colors
  // by accent so the active highlight survives.
  const themeColors = (manifest as unknown as { theme?: { colors?: { accent?: string } } }).theme?.colors;
  const active = PALETTES.find((p) => p.theme.accent === themeColors?.accent) ?? PALETTES[0];

  // Active motif read from canonical manifest.motifs (the renderer
  // actually consumes this — the legacy singular `motif` field is
  // a no-op orphan). Picker is mutually exclusive: pear → stamp,
  // squiggle → squiggle, blob → blob; each pick clears the others.
  const motifs = (manifest as unknown as {
    motifs?: { blob?: string; stamp?: unknown; squiggle?: number };
  }).motifs;
  const motif: 'pear' | 'squiggle' | 'blob' =
    motifs?.stamp ? 'pear'
    : motifs?.squiggle ? 'squiggle'
    : motifs?.blob && motifs.blob !== 'none' ? 'blob'
    : 'pear';

  function update(patch: Record<string, unknown>) {
    onChange({ ...manifest, ...patch } as unknown as StoryManifest);
  }

  /** Mutually-exclusive motif pick. Writes to manifest.motifs so
   *  the renderer (which consumes blob / stamp / squiggle) actually
   *  reflects the choice. */
  function applyMotif(id: 'pear' | 'squiggle' | 'blob') {
    const existingMotifs = (manifest as unknown as { motifs?: Record<string, unknown> }).motifs ?? {};
    const next: Record<string, unknown> = {
      ...existingMotifs,
      // Clear the other two slots so the visual picker stays
      // single-select.
      stamp: undefined,
      squiggle: undefined,
      blob: undefined,
    };
    if (id === 'pear') next.stamp = { text: '✦', tone: 'sage' };
    else if (id === 'squiggle') next.squiggle = 1;
    else next.blob = 'sage';
    onChange({ ...manifest, motifs: next } as unknown as StoryManifest);
  }

  /** Writes the preset's full theme to manifest.theme.colors so
   *  ThemedSiteRenderer's themeStyle CSS-var overrides see the change
   *  the moment the user picks a swatch.
   *
   *  Audited 2026-04-29: dropped legacy `palette` / `themeName`
   *  duplicate writes — no consumer ever read those fields, so
   *  every flip was silently bloating the manifest. theme.colors
   *  is the single source of truth. */
  function applyPalette(preset: ThemePreset) {
    const existingTheme = (manifest as unknown as { theme?: Record<string, unknown> }).theme ?? {};
    onChange({
      ...manifest,
      theme: {
        ...existingTheme,
        colors: preset.theme,
      },
    } as unknown as StoryManifest);
  }

  /** Patches manifest.theme.fonts.{heading|body} so typography
   *  changes from this panel flow through to ThemedSiteRenderer.
   *
   *  Audited 2026-04-29: dropped duplicate top-level `headingFont`
   *  / `bodyFont` writes — the renderer only reads theme.fonts.*. */
  function applyFont(slot: 'heading' | 'body', value: string) {
    const existingTheme = ((manifest as unknown as { theme?: { fonts?: Record<string, string> } }).theme ?? {}) as Record<string, unknown>;
    const existingFonts = ((existingTheme.fonts as Record<string, string> | undefined) ?? {}) as Record<string, string>;
    onChange({
      ...manifest,
      theme: {
        ...existingTheme,
        fonts: { ...existingFonts, [slot]: value },
      },
    } as unknown as StoryManifest);
  }

  /* Active Edition resolution — used for the "Fine-tune ·
     {THEME NAME}" header and the texture slider label. Falls
     back to the recommendation when the host hasn't picked. */
  const activeEditionId = manifest.edition ?? resolveEdition({
    edition: undefined,
    occasion: manifest.occasion ?? 'wedding',
    voice: getEventType(manifest.occasion)?.voice ?? 'celebratory',
  }).id;
  const activeEdition = EDITIONS.find((e) => e.id === activeEditionId) ?? EDITIONS[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <SiteLookHeader manifest={manifest} onChange={onChange} />
      <EventTypeSection manifest={manifest} onChange={onChange} />
      <GenerateFromStoryCard manifest={manifest} onChange={onChange} />

      {/* "Your packs" — owned Theme-Store packs surfaced above the
          Editions grid. Hidden when the host owns nothing beyond
          the free tier defaults and hasn't visited the store. */}
      <div data-pl-design-anchor="owned-packs">
        <OwnedPacksSection manifest={manifest} onChange={onChange} />
      </div>

      {/* Edition / Layout / Kit — the three high-altitude picks
          that drive the whole-site look. EditionPicker stamps the
          theme palette + fonts + naturalTexture; LayoutPicker
          frames the page; KitPicker restyles repeating rows. */}
      <div data-pl-design-anchor="edition">
        <EditionPicker manifest={manifest} onChange={onChange} />
      </div>
      {/* Site Layout — prototype-native stacked/boxed/split dial.
          Mounted in place of the legacy LayoutPicker so new picks
          go through the prototype-native manifest.siteLayout
          field. The legacy LayoutPicker is kept exported for any
          code path that still imports it during the transition,
          but ThemePanel now ships the new picker. */}
      <div data-pl-design-anchor="layout">
        <SiteLayoutPicker manifest={manifest} onChange={onChange} />
      </div>
      <div data-pl-design-anchor="kit">
        <KitPicker manifest={manifest} onChange={onChange} />
      </div>

      {/* Fine-tune · {ACTIVE THEME NAME} — voice, spacing,
          theme-bound texture slider, motifs toggle, photos toggle,
          AA contrast indicator. Port of the prototype's right-
          rail Fine-tune block. */}
      <FineTuneSection
        manifest={manifest}
        onChange={onChange}
        activeEdition={activeEdition}
      />

      <MatchMyPhotosSection manifest={manifest} onChange={onChange} />
      <SavedLooksSection manifest={manifest} onChange={onChange} />
      <MatchingSaveTheDateCTA />

      {/* All other tools live behind one Advanced disclosure so
          the main scroll stays focused on the prototype's exact
          surface. Power features stay accessible without bloating
          the default view. */}
      <details
        style={{
          marginTop: 14,
          padding: '4px 0',
          borderTop: '1px solid var(--line-soft, rgba(14,13,11,0.08))',
        }}
      >
        <summary
          style={{
            cursor: 'pointer',
            padding: '12px 14px',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--ink-muted, #6F6557)',
            userSelect: 'none',
          }}
        >
          ⌄ Advanced
        </summary>
        <PanelGroup>
          <div data-pl-design-anchor="palette">
            <PaletteSection manifest={manifest} active={active} palette={active.id} applyPalette={applyPalette} onChange={onChange} />
          </div>
          <div data-pl-design-anchor="motif">
            <PanelSection label="Motif shape" hint="The specific motif used when Motifs is on.">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {MOTIFS.map((m) => {
                  const on = motif === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => applyMotif(m.id as 'pear' | 'squiggle' | 'blob')}
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
          <div data-pl-design-anchor="spacing">
            <SpacingPanel manifest={manifest} onChange={onChange} />
          </div>
          <div data-pl-design-anchor="layout-mode">
            <SiteModeSection manifest={manifest} onChange={onChange} />
          </div>
          <div data-pl-design-anchor="footer">
            <FooterCustomizationSection manifest={manifest} onChange={onChange} />
          </div>
          <details>
            <summary
              style={{
                cursor: 'pointer',
                padding: '10px 14px',
                borderRadius: 10,
                background: 'var(--cream-2)',
                border: '1px dashed var(--line)',
                fontSize: 12.5,
                fontWeight: 700,
                letterSpacing: '0.04em',
                color: 'var(--ink-soft)',
                userSelect: 'none',
                margin: '6px 0',
              }}
            >
              ↺ Version history (snapshots)
            </summary>
            <div style={{ paddingTop: 6 }}>
              <SnapshotsPanel manifest={manifest} onChange={onChange} />
            </div>
          </details>
          <div data-pl-design-anchor="decor" className="pl8">
            {/* Decor Library CTA — literal port of themes.jsx L896-912.
                Gradient lavender-bg→peach-bg with a cream icon plate.
                Prominent: this is the primary entry point to motifs,
                dividers, patterns, and the monogram generator. */}
            <button
              type="button"
              className="lift"
              onClick={() => {
                if (typeof window === 'undefined') return;
                window.dispatchEvent(new CustomEvent('pearloom:open-decor-library'));
              }}
              style={{
                width: '100%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 11,
                padding: '13px 15px',
                borderRadius: 13,
                background: 'linear-gradient(120deg, var(--lavender-bg), var(--peach-bg))',
                border: '1px solid var(--line-soft)',
                textAlign: 'left',
                margin: '6px 0',
              }}
            >
              <span style={{
                width: 38, height: 38, borderRadius: 10,
                background: 'var(--card)',
                display: 'grid', placeItems: 'center', flexShrink: 0,
                boxShadow: '0 2px 6px rgba(61,74,31,0.08)',
              }}>
                <Icon name="sparkles" size={18} color="var(--lavender-ink)" />
              </span>
              <span style={{ flex: 1 }}>
                <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>
                  Decor Library
                </span>
                <span style={{ display: 'block', fontSize: 11, color: 'var(--ink-soft)' }}>
                  Motifs, dividers, patterns &amp; monograms
                </span>
              </span>
              <Icon name="arrow-right" size={15} color="var(--ink-soft)" />
            </button>
            <details>
              <summary
                style={{
                  cursor: 'pointer',
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: 'var(--cream-2)',
                  border: '1px dashed var(--line)',
                  fontSize: 12.5,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  color: 'var(--ink-soft)',
                  userSelect: 'none',
                  margin: '6px 0',
                }}
              >
                ✦ Stickers
              </summary>
              <div style={{ paddingTop: 6 }}>
                <div data-pl-design-anchor="stickers">
                  <StickerTrayPanel manifest={manifest} onChange={onChange} />
                </div>
              </div>
            </details>
          </div>
        </PanelGroup>
      </details>
    </div>
  );
}

/* ── ThemeCategory ──────────────────────────────────────────────
   Editorial divider between groups of related PanelSections.
   Renders as a tiny uppercase label + thread (matches BRAND.md
   §8 — Thread is the visual atom of the brand). Mounted between
   PanelGroup wrappers so hosts can scan the Theme panel as four
   named clusters (Look / Atmosphere / Layout / Extras) instead
   of one long undifferentiated scroll of 10+ sections. */
function ThemeCategory({ label, hint }: { label: string; hint?: string }) {
  return (
    <div
      style={{
        // Sits between two PanelSection borderBottoms — extra top
        // margin so the divider reads as a fresh chapter, not as
        // part of the previous section's tail.
        marginTop: 28,
        marginBottom: 8,
        paddingBottom: 12,
        borderBottom: '1px solid var(--line)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 800,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--gold, #B8935A)',
            fontFamily: 'var(--font-ui)',
          }}
        >
          {label}
        </span>
        <span
          aria-hidden
          style={{
            flex: 1,
            height: 1,
            background: 'linear-gradient(to right, var(--gold, #B8935A), transparent 75%)',
            opacity: 0.45,
          }}
        />
      </div>
      {hint && (
        <div
          style={{
            fontSize: 12,
            color: 'var(--ink-muted)',
            marginTop: 6,
            lineHeight: 1.5,
            fontFamily: 'var(--font-ui)',
          }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────────────────────────────────────
   OwnedPacksSection — surfaces every Theme-Store pack the host
   owns at the top of the Theme panel, above Editions / palette
   grid. Click any tile to apply that pack's theme + kit + texture
   + pattern to the open site (via applyPackToManifest()).

   Ownership comes from GET /api/store/entitlements. Free-tier
   packs are always implicitly owned, so the row always has
   something to show even before the host has bought anything;
   we hide the section entirely only if the API errors AND the
   catalog ships zero free packs (effectively never).

   Apply path
   ──────────
   Pure in-editor — onChange(applyPackToManifest(pack, manifest))
   so the canvas reflects the new theme without a redirect.
   ─────────────────────────────────────────────────────────── */
function OwnedPacksSection({
  manifest,
  onChange,
}: {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}) {
  const [ownedIds, setOwnedIds] = useState<readonly string[] | null>(null);
  const [appliedId, setAppliedId] = useState<string | null>(null);

  // Fetch entitlements once on mount. Mirrors useEntitlements()
  // from the store surface but we don't reuse that hook because
  // it folds in cart context that doesn't make sense in-editor.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/store/entitlements', {
          method: 'GET',
          credentials: 'same-origin',
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) {
          if (!cancelled) setOwnedIds([]);
          return;
        }
        const json = (await res.json()) as {
          ok?: boolean;
          packIds?: string[];
          freePackIds?: string[];
        };
        if (cancelled) return;
        // Fold free-tier packs into the owned set the same way
        // useEntitlements() does on the storefront. The route
        // returns free ids in its response, but we backstop with
        // the catalog so a degraded response still shows the free
        // shelf.
        const set = new Set<string>();
        if (Array.isArray(json.packIds)) {
          for (const id of json.packIds) if (typeof id === 'string') set.add(id);
        }
        if (Array.isArray(json.freePackIds)) {
          for (const id of json.freePackIds) if (typeof id === 'string') set.add(id);
        }
        setOwnedIds(Array.from(set));
      } catch {
        if (!cancelled) setOwnedIds([]);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Resolve ids → Pack records in catalog order so the row reads
  // as a curated shelf, not a hash-order shuffle.
  const ownedPacks = useMemo<readonly Pack[]>(() => {
    if (!ownedIds || ownedIds.length === 0) return [];
    const set = new Set(ownedIds);
    return PACKS.filter((p) => set.has(p.id));
  }, [ownedIds]);

  function apply(p: Pack) {
    onChange(applyPackToManifest(p, manifest));
    setAppliedId(p.id);
    // Clear the "Applied" pill after a beat so the host can apply
    // another pack without the previous indicator clinging.
    window.setTimeout(() => {
      setAppliedId((cur) => (cur === p.id ? null : cur));
    }, 1800);
  }

  // While hydrating, render a small placeholder so the panel
  // doesn't flicker the Editions row up and back down once the
  // fetch resolves.
  if (ownedIds === null) {
    return (
      <PanelSection label="Your packs" hint="Theme-Store packs you own.">
        <div
          style={{
            padding: '14px 4px',
            fontSize: 12,
            color: 'var(--ink-muted, #6F6557)',
          }}
        >
          Looking up your packs…
        </div>
      </PanelSection>
    );
  }

  // Empty state — keep the section visible with a CTA into
  // the in-editor Theme Shop bottom sheet (preferred over a
  // new-tab redirect to /store, since the sheet re-skins the
  // canvas live as the host previews packs).
  function openThemeShop() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pearloom:open-theme-shop'));
    }
  }
  if (ownedPacks.length === 0) {
    return (
      <PanelSection label="Your packs" hint="Theme-Store packs you own.">
        {/* Theme Shop CTA — literal port of themes.jsx L886-894.
            Ink-on-cream dark pill with gold sparkle icon. The primary
            "discover new looks" affordance. */}
        <button
          type="button"
          className="lift pl8"
          onClick={openThemeShop}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 11,
            padding: '13px 15px',
            borderRadius: 13,
            width: '100%',
            cursor: 'pointer',
            background: 'var(--ink)',
            color: 'var(--cream)',
            border: 'none',
            textAlign: 'left',
          }}
        >
          <span style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(255,255,255,0.12)',
            display: 'grid', placeItems: 'center', flexShrink: 0,
          }}>
            <Icon name="sparkles" size={17} color="var(--gold)" />
          </span>
          <span style={{ flex: 1 }}>
            <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700 }}>Theme Shop</span>
            <span style={{ display: 'block', fontSize: 11, opacity: 0.7 }}>
              60+ premium packs · try live
            </span>
          </span>
          <Icon name="arrow-up" size={15} color="var(--cream)" />
        </button>
      </PanelSection>
    );
  }

  return (
    <PanelSection
      label="Your packs"
      hint="Tap any pack you own to apply its theme to this site."
      action={
        <button
          type="button"
          onClick={openThemeShop}
          title="Open the Theme Shop"
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--ink-muted, #6F6557)',
            letterSpacing: '0.04em',
            background: 'transparent',
            border: 0,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          Shop →
        </button>
      }
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 10,
        }}
      >
        {ownedPacks.map((p) => (
          <OwnedPackTile
            key={p.id}
            pack={p}
            applied={appliedId === p.id}
            onApply={() => apply(p)}
          />
        ))}
      </div>
    </PanelSection>
  );
}

/**
 * One owned-pack tile. Live themed preview on top, name + kit
 * label + swatches below, "Apply" CTA pinned bottom-right.
 *
 * Whole tile is clickable. The visible CTA is purely affordance
 * — clicking either the tile body or the pill triggers onApply.
 * We use a single button wrapping the preview + body so keyboard
 * focus + screen readers see one named action per pack.
 */
function OwnedPackTile({
  pack,
  applied,
  onApply,
}: {
  pack: Pack;
  applied: boolean;
  onApply: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onApply}
      aria-label={`Apply ${pack.name} to this site`}
      style={{
        all: 'unset',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 12,
        background: 'var(--card, #FBF7EE)',
        border: applied
          ? '1.5px solid var(--sage-deep, #6d7d3f)'
          : '1px solid var(--line, rgba(14,13,11,0.16))',
        overflow: 'hidden',
        fontFamily: 'var(--font-ui)',
        transition:
          'transform var(--pl-dur-fast) var(--pl-ease-out), border-color var(--pl-dur-fast) var(--pl-ease-out)',
      }}
    >
      <div style={{ position: 'relative' }}>
        <PackPreview pack={pack} height={92} />
        {applied && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              padding: '2px 7px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.92)',
              color: 'var(--sage-deep, #6d7d3f)',
              fontSize: 9.5,
              fontWeight: 800,
              letterSpacing: '0.04em',
            }}
          >
            ✓ Applied
          </span>
        )}
      </div>
      <div
        style={{
          padding: '8px 10px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: 5,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-display, "Fraunces"), Georgia, serif',
            fontSize: 13.5,
            fontWeight: 600,
            color: 'var(--ink, #0E0D0B)',
            lineHeight: 1.15,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {pack.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {pack.swatches.slice(0, 4).map((c, i) => (
            <span
              key={i}
              aria-hidden="true"
              style={{
                width: 11,
                height: 11,
                borderRadius: '50%',
                background: c,
                boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.12)',
              }}
            />
          ))}
          <span
            style={{
              marginLeft: 'auto',
              fontSize: 10.5,
              color: 'var(--ink-muted, #6F6557)',
              textTransform: 'capitalize',
              letterSpacing: '0.04em',
            }}
          >
            {pack.kit}
          </span>
        </div>
      </div>
    </button>
  );
}

// ── SiteModeSection ────────────────────────────────────────
// Toggles between scroll mode (every section on the home page,
// the default) and multi-page mode (home page renders only
// homePageBlocks plus details; every other section gets its own
// route at /{occasion}/{slug}/{block}).
//
// In multi-page mode, the host picks which sections live on the
// home page from a checklist. Hero is always on home; details is
// always implicitly on home. Everything else is opt-in.
const HOME_BLOCK_OPTIONS: Array<{ key: string; label: string; hint: string }> = [
  { key: 'story', label: 'Story', hint: 'How you got here' },
  { key: 'schedule', label: 'Schedule', hint: 'The flow of the day' },
  { key: 'travel', label: 'Travel', hint: 'Map + hotels' },
  { key: 'registry', label: 'Registry', hint: 'Gift links' },
  { key: 'gallery', label: 'Gallery', hint: 'Bento mosaic' },
  { key: 'faq', label: 'FAQ', hint: 'Q&A' },
  { key: 'rsvp', label: 'RSVP', hint: 'Reply form' },
];

export function SiteModeSection({
  manifest,
  onChange,
}: {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}) {
  const m = manifest as unknown as {
    siteMode?: SiteMode;
    homePageBlocks?: string[];
  };
  const mode: SiteMode = m.siteMode === 'multi-page' ? 'multi-page' : 'scroll';
  const homeBlocks: string[] = Array.isArray(m.homePageBlocks) && m.homePageBlocks.length
    ? m.homePageBlocks
    : DEFAULT_HOME_BLOCKS;

  function setMode(next: SiteMode) {
    onChange({ ...manifest, siteMode: next } as unknown as StoryManifest);
  }
  function toggleHomeBlock(key: string) {
    const set = new Set(homeBlocks);
    if (set.has(key)) {
      set.delete(key);
    } else {
      set.add(key);
    }
    const next = HOME_BLOCK_OPTIONS.map((o) => o.key).filter((k) => set.has(k));
    onChange({ ...manifest, homePageBlocks: next } as unknown as StoryManifest);
  }

  return (
    <PanelSection
      label="Layout mode"
      hint="Single scroll keeps every section on the home page. Magazine mode promotes each section to its own page."
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label="Mode">
          <SegmentedToggle<string>
            value={mode}
            onChange={(v) => setMode(v === 'multi-page' ? 'multi-page' : 'scroll')}
            options={[
              { value: 'scroll', label: 'Single scroll' },
              { value: 'multi-page', label: 'Magazine' },
            ]}
          />
        </Field>
        <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', lineHeight: 1.5 }}>
          {mode === 'scroll' ? (
            <>Every block lives on one long, scrollable home page. Nav links scroll to anchors.</>
          ) : (
            <>Home page renders only the selected blocks below. Every other section becomes its own route — guests click <em>Travel</em> in the nav and land on a focused page.</>
          )}
        </div>

        {mode === 'multi-page' && (
          <Field label="Keep on home">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
              {HOME_BLOCK_OPTIONS.map((o) => {
                const on = homeBlocks.includes(o.key);
                return (
                  <button
                    key={o.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleHomeBlock(o.key)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: on ? '1.5px solid var(--ink)' : '1.5px solid var(--line)',
                      background: on ? 'var(--cream-2)' : 'var(--card)',
                      color: 'var(--ink)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'var(--font-ui)',
                      transition: 'background var(--pl-dur-fast) var(--pl-ease-out), border-color var(--pl-dur-fast) var(--pl-ease-out)',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        aria-hidden
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 999,
                          background: on ? 'var(--peach-ink, #C6703D)' : 'transparent',
                          border: on ? 'none' : '1.5px solid var(--line)',
                        }}
                      />
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>{o.label}</span>
                    </span>
                    <div style={{ fontSize: 10.5, color: 'var(--ink-muted)', marginTop: 2, marginLeft: 18 }}>
                      {o.hint}
                    </div>
                  </button>
                );
              })}
            </div>
          </Field>
        )}
        {mode === 'multi-page' && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              background: 'var(--cream-2)',
              border: '1px dashed var(--line)',
              fontSize: 11,
              color: 'var(--ink-muted)',
              lineHeight: 1.5,
            }}
          >
            Tip — leave Story or Gallery on home so the page still feels editorial. <em>Details</em> is always on home (it&rsquo;s a thin summary strip, not a destination).
          </div>
        )}
      </div>
    </PanelSection>
  );
}

// ── FooterCustomizationSection ─────────────────────────────
// Layout picker + brand mark + heading overrides + attribution
// toggle. Writes to manifest.footer; SiteFooter reads from it
// with defaults when fields are unset.
function FooterCustomizationSection({
  manifest,
  onChange,
}: {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}) {
  const cfg = ((manifest as unknown as { footer?: {
    layout?: 'anchor' | 'minimal' | 'stacked';
    brandMark?: 'pear' | 'heart' | 'sparkle' | 'leaf' | 'off';
    showAttribution?: boolean;
    headings?: { day?: string; about?: string };
  } }).footer) ?? {};

  function patch<K extends string>(key: K, value: unknown) {
    onChange({
      ...manifest,
      footer: { ...cfg, [key]: value },
    } as unknown as StoryManifest);
  }
  function patchHeading(slot: 'day' | 'about', value: string) {
    onChange({
      ...manifest,
      footer: {
        ...cfg,
        headings: { ...(cfg.headings ?? {}), [slot]: value },
      },
    } as unknown as StoryManifest);
  }

  const layout = cfg.layout ?? 'anchor';
  const brandMark = cfg.brandMark ?? 'pear';
  const showAttribution = cfg.showAttribution !== false;

  return (
    <PanelSection
      label="Footer"
      hint="Layout, brand mark, and column headers for the closing footer."
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <Field label="Layout">
            <SegmentedToggle<string>
              value={layout}
              onChange={(v) => patch('layout', v)}
              options={[
                { value: 'anchor', label: 'Anchor' },
                { value: 'stacked', label: 'Stacked' },
                { value: 'minimal', label: 'Minimal' },
              ]}
            />
          </Field>
          <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 6, lineHeight: 1.45 }}>
            Anchor — 4-column editorial spread (default). Stacked — names left, link columns right. Minimal — centered single column with closing line.
          </div>
        </div>

        <Field label="Brand mark">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
            {(
              [
                { v: 'pear', l: 'Pear' },
                { v: 'heart', l: 'Heart' },
                { v: 'sparkle', l: 'Spark' },
                { v: 'leaf', l: 'Leaf' },
                { v: 'off', l: 'Off' },
              ] as const
            ).map((o) => {
              const on = brandMark === o.v;
              return (
                <button
                  key={o.v}
                  type="button"
                  aria-pressed={on}
                  onClick={() => patch('brandMark', o.v)}
                  style={{
                    padding: '8px 4px',
                    borderRadius: 8,
                    border: on ? '1.5px solid var(--ink)' : '1.5px solid var(--line)',
                    background: on ? 'var(--cream-2)' : 'var(--card)',
                    color: 'var(--ink)',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-ui)',
                  }}
                >
                  {o.l}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Column headings">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <TextInput
              value={cfg.headings?.day ?? ''}
              onChange={(e) => patchHeading('day', e.target.value)}
              placeholder="The day"
            />
            <TextInput
              value={cfg.headings?.about ?? ''}
              onChange={(e) => patchHeading('about', e.target.value)}
              placeholder="About"
            />
          </div>
        </Field>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            background: 'var(--cream-2)',
            borderRadius: 10,
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={showAttribution}
            onChange={(e) => patch('showAttribution', e.target.checked)}
            style={{ accentColor: 'var(--peach-ink, #C6703D)' }}
          />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', display: 'block' }}>
              Show &ldquo;Made with Pearloom&rdquo;
            </span>
            <span style={{ fontSize: 11, color: 'var(--ink-muted)', lineHeight: 1.4 }}>
              Discreet attribution in the legal row + the &ldquo;Built on Pearloom&rdquo; link in the About column.
            </span>
          </span>
        </label>
      </div>
    </PanelSection>
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
    // Surface in the floating toast so the user can navigate away
    // while Pear paints (~10-20s).
    const jobId = startDecorJob('accent', 'Hero flourish');
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
      completeDecorJob(jobId, true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Accent generation failed';
      setError(msg);
      completeDecorJob(jobId, false, msg);
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
      label="Hero flourish"
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
          {running ? (
            <PearThinking active label="drafting" size="sm" hideAvatar />
          ) : existing ? (
            'Draft a new one'
          ) : (
            'Draft an accent'
          )}
        </button>
        {existing && (
          <button type="button" onClick={clear} className="btn btn-ghost btn-sm" disabled={running}>
            Remove
          </button>
        )}
      </div>
      {error && (
        <div role="alert" style={{ marginTop: 10, fontSize: 12, color: 'var(--plum-ink, #7A2D2D)', lineHeight: 1.45 }}>
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
        throw new Error((body as { error?: string }).error ?? `Pear couldn't mix that one (${res.status})`);
      }
      const data = (await res.json()) as { palettes?: Array<{ id: string; name: string; rationale?: string; colors: string[] }> };
      const presets: ThemePreset[] = (data.palettes ?? []).map((p) => smartPaletteToPreset(p));
      setAiPalettes(presets);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Pear couldn't mix that one");
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
      <div role="tablist" aria-label="Palette source" style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {(['curated', 'ai', 'custom'] as const).map((t, i, arr) => {
          const on = tab === t;
          return (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={on}
              tabIndex={on ? 0 : -1}
              onClick={() => setTab(t)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                  e.preventDefault();
                  const dir = e.key === 'ArrowRight' ? 1 : -1;
                  const next = (i + dir + arr.length) % arr.length;
                  setTab(arr[next]);
                  const list = e.currentTarget.parentElement;
                  list?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
                }
              }}
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
              {t === 'curated' ? `Curated (${PALETTES.length})` : t === 'ai' ? 'Pear' : `Custom (${customPalettes.length})`}
            </button>
          );
        })}
      </div>

      {tab === 'curated' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {PALETTES.map((p) => (
            <PaletteTile
              key={p.id}
              preset={p}
              active={palette === p.id}
              onPick={() => applyPalette(p)}
              onApplyTweak={(t) => applyPalette(applyTweakToPreset(p, t))}
            />
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
            {aiRunning ? 'Asking Pear…' : aiPalettes.length ? 'Mix fresh palettes' : 'Suggest palettes from your event'}
          </button>
          {aiError && (
            <div role="alert" style={{ marginBottom: 10, fontSize: 12, color: 'var(--plum-ink, #7A2D2D)', lineHeight: 1.45 }}>
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
                  onApplyTweak={(t) => applyPalette(applyTweakToPreset(p, t))}
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
              badge={p.source === 'ai' ? 'PEAR' : 'YOU'}
              rationale={p.rationale}
              onPick={() => applyPalette(p)}
              onDelete={() => deleteCustom(p.id)}
              onApplyTweak={(t) => applyPalette(applyTweakToPreset(p, t))}
            />
          ))}
          {customPalettes.length === 0 && (
            <div style={{ gridColumn: '1 / -1', fontSize: 12, color: 'var(--ink-muted)', textAlign: 'center', padding: 14, lineHeight: 1.5 }}>
              Saved palettes — Pear's drafts and the ones you mix below — will appear here.
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
  onApplyTweak,
}: {
  preset: ThemePresetWithExtras;
  active: boolean;
  badge?: string;
  rationale?: string;
  onPick: () => void;
  onSave?: () => void;
  onDelete?: () => void;
  /** Apply a one-click contrast fix. Called with the suggested
   *  shift (`foreground` or `background` + new hex); the caller
   *  patches the preset's theme.colors and writes it through
   *  `applyPalette`. */
  onApplyTweak?: (tweak: ContrastTweak) => void;
}) {
  // Body-text contrast on this palette: paper ↔ ink. This is the
  // ratio that actually matters for reading the site; the accent
  // contrast is incidental (the renderer's
  // `ensureContrast`/`enforcePaletteContrast` already keeps CTA
  // accents legible via auto-correction at render time).
  const contrast = reportContrast(preset.theme.background, preset.theme.foreground);
  const tweak =
    contrast.rating === 'fail' || contrast.rating === 'aa-large'
      ? suggestTweak(preset.theme.background, preset.theme.foreground)
      : null;

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
        aria-pressed={active}
        aria-label={`${preset.name} palette${active ? ', currently applied' : ''}`}
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
      <ContrastChip
        rating={contrast.rating}
        ratio={contrast.ratio}
      />
      {tweak && onApplyTweak && (
        <ContrastTweakPill
          tweak={tweak}
          onApply={() => onApplyTweak(tweak)}
        />
      )}
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
            background: badge === 'PEAR' ? 'var(--peach-bg)' : 'var(--cream-2)',
            color: badge === 'PEAR' ? 'var(--peach-ink)' : 'var(--ink-muted)',
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
                color: 'var(--plum-ink, #7A2D2D)',
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
// CustomPaletteEditor removed in the simplification audit pass —
// hosts who want raw colour tweaks use ColorTokenInspector (which
// edits the same theme.colors fields with the same V8ColorPicker
// + per-token labels). The mix-your-own affordance was a 130-line
// parallel form that wrote nothing the renderer didn't already
// read from theme.colors. Pear-suggested palettes still save into
// the Custom tab via the AI tab's onSave hook.

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

/* ────────────────────────────────────────────────────────────────────
   WCAG contrast indicator + one-click tweak.

   ContrastChip — small pill rendered under every palette tile that
   shows the paper↔ink (body-text) contrast bucketed against WCAG
   2.1 normal-text thresholds:
       AAA  (≥ 7.0:1)   sage-tint background, sage-deep ink
       AA   (≥ 4.5:1)   peach-bg background, peach-ink ink
       AA·L (≥ 3.0:1)   peach-bg background, peach-ink ink
                        — informational only, not body-safe
       FAIL (< 3.0:1)   plum-tinted background, plum ink

   Informational only — selecting a failing palette never blocks
   the host. We trust them to override if they have a strong
   reason; the chip + the suggestion pill below it are the polite
   nudge toward legibility.

   ContrastTweakPill — appears only when contrast falls short of
   AA (4.5:1). One click applies the suggested 12% shift through
   the existing applyPalette() pipe so the tweak flows into
   manifest.theme.colors exactly like any other palette pick
   (autosave + undo wired automatically).
   ──────────────────────────────────────────────────────────────────── */

function chipStyleFor(rating: ContrastRating): { bg: string; fg: string } {
  switch (rating) {
    case 'aaa':
      // Quiet sage so AAA reads as a calm green check, not a
      // shouty "win" — it's expected, not exceptional.
      return { bg: 'var(--sage-tint, #E3E6C8)', fg: 'var(--sage-deep, #6d7d3f)' };
    case 'aa':
      // AA gets the peach treatment: passes-but-watch-it. Same
      // warm palette we use for borderline indicators elsewhere.
      return { bg: 'var(--peach-bg, #FBE8D6)', fg: 'var(--peach-ink, #C6703D)' };
    case 'aa-large':
      // Same peach as AA but the label disambiguates that this
      // doesn't clear body text.
      return { bg: 'var(--peach-bg, #FBE8D6)', fg: 'var(--peach-ink, #C6703D)' };
    case 'fail':
      // Plum is the BRAND.md §5 destructive token — used here in
      // its mist form so it warns without screaming.
      return { bg: 'rgba(122,45,45,0.10)', fg: 'var(--plum-ink, #7A2D2D)' };
  }
}

function ContrastChip({
  rating,
  ratio,
}: {
  rating: ContrastRating;
  ratio: number | null;
}) {
  const style = chipStyleFor(rating);
  const label = ratingLabel(rating);
  const ratioText = ratio === null ? '—' : formatRatio(ratio);
  return (
    <div
      aria-label={`Text contrast ${label}, ${ratioText}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'flex-start',
        padding: '2px 8px',
        borderRadius: 999,
        background: style.bg,
        color: style.fg,
        fontFamily: 'var(--font-ui)',
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: '0.06em',
        lineHeight: 1.4,
      }}
    >
      <span aria-hidden style={{ fontWeight: 800 }}>{label}</span>
      <span aria-hidden style={{ opacity: 0.55, fontWeight: 600 }}>·</span>
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{ratioText}</span>
    </div>
  );
}

function ContrastTweakPill({
  tweak,
  onApply,
}: {
  tweak: ContrastTweak;
  onApply: () => void;
}) {
  // Single-line suggestion copy. The phrasing follows BRAND.md §7
  // microcopy rules: verb-first, lowercase, no exclamation, no
  // "AI". The pill itself is the affordance — the click applies
  // the tweak.
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onApply();
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 10px',
        borderRadius: 999,
        background: 'var(--peach-bg, #FBE8D6)',
        color: 'var(--peach-ink, #C6703D)',
        border: '1px solid color-mix(in srgb, var(--peach-ink, #C6703D) 30%, transparent)',
        cursor: 'pointer',
        fontFamily: 'var(--font-ui)',
        fontSize: 11,
        lineHeight: 1.4,
        textAlign: 'left',
      }}
    >
      <span aria-hidden style={{ fontWeight: 700 }}>↑</span>
      <span>
        Ink reads too faint on this paper — try{' '}
        <span style={{ fontWeight: 700 }}>{tweak.label}</span>
      </span>
    </button>
  );
}

/**
 * Returns a new `ThemePreset` with the suggested tweak baked in,
 * preserving every other colour. Used by the picker to feed the
 * tweak through the existing `applyPalette` → manifest.theme.colors
 * pipe so undo/autosave/theme-binding all kick in automatically.
 */
function applyTweakToPreset(preset: ThemePreset, tweak: ContrastTweak): ThemePreset {
  return {
    ...preset,
    theme: {
      ...preset.theme,
      [tweak.target]: tweak.hex,
    },
  };
}
