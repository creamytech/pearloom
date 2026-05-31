'use client';

// ─────────────────────────────────────────────────────────────
// LookEnginePanel — Fine-tune dials for the site look. Ports
// the prototype's right-rail "Fine-tune · {theme}" block
// (shared/themes.jsx ThemePicker, ~line 665):
//   • Voice segmented (Classic / Playful / Poetic) with a
//     "Match event" option that clears manifest.voiceOverride.
//   • Spacing segmented (Cozy / Comfy / Airy) bound to
//     manifest.density.
//   • Texture intensity slider 0–1.5 with labels Off / Faint /
//     Natural / Rich / Bold. Only shown when the active texture
//     isn't 'smooth' (matches prototype's `active.texture !== 'none'`).
//   • Legibility note — WCAG contrast ratio of the active
//     palette's ink-on-paper, plus a "Soften" button when
//     intensity > 1.1 (port of LegibilityNote from themes.jsx).
//   • Saved looks — 6-slot localStorage of edition+texture+density
//     +intensity+voice combos. Click a chip to re-apply, × to
//     remove. Port of SavedLooks from themes.jsx.
//   • Matching Save-the-Date CTA — dark ink card linking to
//     Pearloom Studio (the stationery editor at /dashboard/invite
//     per CLAUDE.md).
//
// Reads/writes:
//   manifest.density           ('cozy' | 'comfortable' | 'spacious')
//   manifest.textureIntensity  (0–1.5, default 1)
//   manifest.voiceOverride     ('classic' | 'playful' | 'poetic' | undefined)
//   manifest.edition           (read — for the Saved Looks swatch identity)
//   manifest.texture           (read — for the Saved Looks swatch identity)
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import type { StoryManifest } from '@/types';
import { PanelSection } from '../atoms';
import { paletteFromFile, type ExtractedPalette } from '@/lib/look-engine/palette-from-photo';

type Density = NonNullable<StoryManifest['density']>;
type VoiceOverride = NonNullable<StoryManifest['voiceOverride']>;
type EditionId = NonNullable<StoryManifest['edition']>;
type TextureId = NonNullable<StoryManifest['texture']>;

/* A saved look — what gets stashed in localStorage. Same shape as
   the prototype's SavedLooks current arg but using Pearloom's
   axis names (edition/texture not theme/kit). */
interface SavedLook {
  edition?: EditionId;
  texture?: TextureId;
  density: Density;
  textureIntensity: number;
  voiceOverride?: VoiceOverride;
}

/* localStorage key — prototype uses 'pl-looks'; keep it so any
   hosts who saved looks in the prototype get them surfaced here. */
const LOOKS_KEY = 'pl-looks';
const MAX_LOOKS = 6;

/* Swatch background mix — picks a representative color pair for
   the look chip. Edition drives one half, texture the other so
   each saved look reads visually distinct. Falls back to cream
   when fields are unset. */
const EDITION_TINT: Record<EditionId, string> = {
  almanac: '#5C6B3F',
  cinema: '#0E0D0B',
  'postcard-box': '#C49A6F',
  'linen-folder': '#B8935A',
  quiet: '#F5EFE2',
};
const TEXTURE_TINT: Record<TextureId, string> = {
  smooth: '#FBF7EE',
  watercolor: '#E8C8B4',
  linen: '#D8CFB8',
  letterpress: '#F2EAD6',
  vellum: '#F4E9C8',
  newsprint: '#E5DBC2',
};

interface Props {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}

/* WCAG luminance + contrast helpers — port of _lum / contrastRatio
   in shared/themes.jsx. Accepts #rgb or #rrggbb. */
function hexToRgb(hex: string): [number, number, number] {
  const m = (hex || '#000').replace('#', '');
  const n = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  return [
    parseInt(n.slice(0, 2), 16) || 0,
    parseInt(n.slice(2, 4), 16) || 0,
    parseInt(n.slice(4, 6), 16) || 0,
  ];
}
function luminance(hex: string): number {
  const c = hexToRgb(hex).map((v) => {
    const f = v / 255;
    return f <= 0.03928 ? f / 12.92 : Math.pow((f + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contrastRatio(a: string, b: string): number {
  const l1 = luminance(a);
  const l2 = luminance(b);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

/* Slider label: matches the prototype's
   Off / Faint / Natural / Rich / Bold breakpoints. */
function intensityLabel(v: number): string {
  if (v <= 0.01) return 'Off';
  if (v < 0.6) return 'Faint';
  if (v < 1.05) return 'Natural';
  if (v < 1.35) return 'Rich';
  return 'Bold';
}

/* Friendly texture name for the slider header — port of the
   prototype's `active.texture === 'linen' ? 'Linen weave' : …` */
function textureLabel(t: NonNullable<StoryManifest['texture']>): string {
  switch (t) {
    case 'linen':
      return 'Linen weave';
    case 'watercolor':
      return 'Watercolor washes';
    case 'letterpress':
      return 'Letterpress grain';
    case 'vellum':
      return 'Vellum mottle';
    case 'newsprint':
      return 'Halftone dots';
    default:
      return 'Texture';
  }
}

export function LookEnginePanel({ manifest, onChange }: Props) {
  const density: Density = manifest.density ?? 'comfortable';
  const intensity = manifest.textureIntensity ?? 1;
  const voiceOverride = manifest.voiceOverride; // undefined = "match event"
  const texture = manifest.texture ?? 'smooth';

  /* Saved looks — hydrated from localStorage on mount. SSR-safe:
     read inside an effect, never during render. Caps at 6 entries
     to match the prototype's slice(-6). */
  const [looks, setLooks] = useState<SavedLook[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOOKS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setLooks(parsed.slice(0, MAX_LOOKS));
      }
    } catch {
      /* localStorage disabled / corrupted JSON — start fresh, no
         user-facing failure mode. */
    }
  }, []);
  function persistLooks(next: SavedLook[]) {
    setLooks(next);
    try {
      localStorage.setItem(LOOKS_KEY, JSON.stringify(next));
    } catch {
      /* Quota / disabled — fail silent. */
    }
  }
  function saveCurrent() {
    const snapshot: SavedLook = {
      edition: manifest.edition,
      texture: manifest.texture,
      density,
      textureIntensity: intensity,
      voiceOverride: manifest.voiceOverride,
    };
    persistLooks([...looks, snapshot].slice(-MAX_LOOKS));
  }
  function applyLook(lk: SavedLook) {
    onChange({
      ...manifest,
      edition: lk.edition ?? manifest.edition,
      texture: lk.texture ?? manifest.texture,
      density: lk.density,
      textureIntensity: lk.textureIntensity,
      voiceOverride: lk.voiceOverride,
    });
  }
  function removeLook(idx: number) {
    persistLooks(looks.filter((_, i) => i !== idx));
  }

  /* Palette-from-photo state. extracted is the most-recent pull,
     surfaced as a 4-swatch strip below the file input + a Clear
     button to revert. busy gates the file picker while extraction
     runs. fileError surfaces "couldn't read that image" without
     a toast bomb. */
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [extracted, setExtracted] = useState<ExtractedPalette | null>(null);
  const [paletteBusy, setPaletteBusy] = useState(false);
  const [paletteError, setPaletteError] = useState<string | null>(null);
  async function onPhotoPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPaletteBusy(true);
    setPaletteError(null);
    try {
      const palette = await paletteFromFile(file);
      if (!palette) {
        setPaletteError('Couldn’t read that image. Try a JPG or PNG.');
        return;
      }
      setExtracted(palette);
      /* Write only accent + accentLight onto theme.colors so paper +
         ink + cardBg from the active Edition stay intact. The
         WCAG guard above will surface a Low-contrast warning if
         the new accent fights the paper. */
      const existingTheme =
        (manifest as unknown as { theme?: Record<string, unknown> }).theme ?? {};
      const existingColors =
        ((existingTheme as { colors?: Record<string, string> }).colors ?? {}) as Record<
          string,
          string
        >;
      onChange({
        ...manifest,
        theme: {
          ...existingTheme,
          colors: {
            ...existingColors,
            accent: palette.accent,
            accentLight: palette.accentLight,
          },
        },
      } as unknown as StoryManifest);
    } catch {
      setPaletteError('Couldn’t read that image. Try a JPG or PNG.');
    } finally {
      setPaletteBusy(false);
      /* Reset the input so the same file can re-trigger if the host
         changes the active Edition + wants to re-extract. */
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }
  function clearExtracted() {
    setExtracted(null);
    setPaletteError(null);
  }

  /* Active palette ink + paper for contrast check. Reads from
     manifest.theme.colors (the canonical location per
     CLAUDE-DESIGN §7) with sensible cream/ink fallbacks. */
  const themeColors =
    (manifest as unknown as { theme?: { colors?: { ink?: string; paper?: string } } }).theme?.colors;
  const ink = themeColors?.ink ?? '#0E0D0B';
  const paper = themeColors?.paper ?? '#F5EFE2';
  const ratio = contrastRatio(ink, paper);
  const wcagPass = ratio >= 4.5;
  const highTexture = intensity > 1.1;

  function setDensity(v: Density) {
    onChange({ ...manifest, density: v });
  }
  function setIntensity(v: number) {
    onChange({ ...manifest, textureIntensity: v });
  }
  function softenIntensity() {
    onChange({ ...manifest, textureIntensity: 0.7 });
  }
  function setVoice(v: VoiceOverride | undefined) {
    const next = { ...manifest } as StoryManifest;
    if (v == null) delete (next as { voiceOverride?: VoiceOverride }).voiceOverride;
    else next.voiceOverride = v;
    onChange(next);
  }

  const sectionLabelStyle = {
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--ink-soft, #3A332C)',
    marginBottom: 6,
    display: 'block',
  } as const;

  const segmentedStyle = {
    display: 'flex',
    gap: 3,
    padding: 3,
    background: 'var(--cream-2, #EBE3D2)',
    borderRadius: 8,
  } as const;

  const segButton = (on: boolean) =>
    ({
      flex: 1,
      padding: '6px 8px',
      borderRadius: 6,
      fontSize: 11,
      fontWeight: 600,
      background: on ? 'var(--ink, #0E0D0B)' : 'transparent',
      color: on ? 'var(--cream, #F5EFE2)' : 'var(--ink-soft, #3A332C)',
      border: 'none',
      cursor: 'pointer',
      transition: 'background 140ms ease',
    } as const);

  return (
    <PanelSection
      label="Fine-tune the look"
      hint="Spacing, voice, and how loud the texture sits under the type. Live preview."
      defaultOpen
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* VOICE — independent of event type, per brief §5. */}
        <div>
          <span style={sectionLabelStyle}>Voice</span>
          <div style={segmentedStyle}>
            {(
              [
                { id: undefined, label: 'Match event' },
                { id: 'classic', label: 'Classic' },
                { id: 'playful', label: 'Playful' },
                { id: 'poetic', label: 'Poetic' },
              ] as Array<{ id: VoiceOverride | undefined; label: string }>
            ).map((o) => {
              const on = voiceOverride === o.id;
              return (
                <button
                  key={o.label}
                  type="button"
                  onClick={() => setVoice(o.id)}
                  aria-pressed={on}
                  style={segButton(on)}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* SPACING / DENSITY — Cozy / Comfy / Airy. */}
        <div>
          <span style={sectionLabelStyle}>Spacing</span>
          <div style={segmentedStyle}>
            {(
              [
                { id: 'cozy', label: 'Cozy' },
                { id: 'comfortable', label: 'Comfy' },
                { id: 'spacious', label: 'Airy' },
              ] as Array<{ id: Density; label: string }>
            ).map((o) => {
              const on = density === o.id;
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setDensity(o.id)}
                  aria-pressed={on}
                  style={segButton(on)}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* TEXTURE INTENSITY — only meaningful when a material is on. */}
        {texture !== 'smooth' && (
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                marginBottom: 7,
              }}
            >
              <span style={sectionLabelStyle}>{textureLabel(texture)}</span>
              <span style={{ fontSize: 11, color: 'var(--ink-muted, #6F6557)', fontWeight: 600 }}>
                {intensityLabel(intensity)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1.5}
              step={0.05}
              value={intensity}
              onChange={(e) => setIntensity(parseFloat(e.target.value))}
              style={{
                width: '100%',
                height: 6,
                borderRadius: 999,
                appearance: 'none',
                WebkitAppearance: 'none',
                background: `linear-gradient(90deg, var(--ink, #0E0D0B) 0 ${
                  (intensity / 1.5) * 100
                }%, var(--cream-3, #D8CFB8) ${(intensity / 1.5) * 100}% 100%)`,
                cursor: 'pointer',
                outline: 'none',
              }}
            />
          </div>
        )}

        {/* LEGIBILITY NOTE — contrast ratio + auto-soften nudge. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              fontSize: 11.5,
              color: wcagPass ? 'var(--sage-deep, #3D4A1F)' : '#b4543a',
            }}
          >
            <span
              aria-hidden
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: wcagPass ? 'var(--sage, #5C6B3F)' : '#b4543a',
                flexShrink: 0,
              }}
            />
            {wcagPass
              ? `Text contrast AA · ${ratio.toFixed(1)}:1`
              : `Low contrast · ${ratio.toFixed(1)}:1 · increase paper/ink separation`}
          </div>
          {highTexture && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                padding: '7px 10px',
                borderRadius: 8,
                background: 'color-mix(in oklab, var(--gold, #B8935A) 16%, var(--cream, #F5EFE2))',
              }}
            >
              <span style={{ fontSize: 11, color: 'var(--ink-soft, #3A332C)' }}>
                High texture can reduce legibility
              </span>
              <button
                type="button"
                onClick={softenIntensity}
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--ink, #0E0D0B)',
                  padding: '3px 9px',
                  borderRadius: 999,
                  background: 'var(--card, #FBF7EE)',
                  border: '1px solid var(--line, rgba(14,13,11,0.14))',
                  cursor: 'pointer',
                }}
              >
                Soften
              </button>
            </div>
          )}
        </div>

        {/* MATCH MY PHOTOS — palette-from-photo extraction. Port of
            the prototype's PaletteFromPhotos (themes.jsx ~line 825).
            Pulls dominant colors → derives accent + accentLight via
            HSL math → writes to manifest.theme.colors so the renderer
            reflects the new palette live. Paper/ink/cardBg stay
            untouched so the Edition's ground holds. */}
        <div
          style={{
            borderTop: '1px solid var(--line-soft, rgba(14,13,11,0.08))',
            paddingTop: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 9,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--ink-muted, #6F6557)',
            }}
          >
            Match my photos
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-muted, #6F6557)', lineHeight: 1.4 }}>
            Pear pulls the palette from a photo and retints this theme&apos;s accent.
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={onPhotoPicked}
            style={{ display: 'none' }}
          />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={paletteBusy}
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--ink, #0E0D0B)',
                padding: '7px 12px',
                borderRadius: 8,
                background: 'var(--card, #FBF7EE)',
                border: '1px solid var(--line, rgba(14,13,11,0.14))',
                cursor: paletteBusy ? 'wait' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span aria-hidden style={{ fontSize: 13, lineHeight: 1 }}>🖼</span>
              {paletteBusy ? 'Reading…' : extracted ? 'Try another photo' : 'Upload a photo'}
            </button>
            {extracted && (
              <>
                <div style={{ display: 'flex', gap: 4 }} aria-label="Extracted palette swatches">
                  {extracted.swatches.map((c, i) => (
                    <span
                      key={i}
                      title={c}
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        background: c,
                        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)',
                      }}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={clearExtracted}
                  title="Clear extracted swatches (theme accent stays put — pick a palette in the grid to revert)"
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    display: 'grid',
                    placeItems: 'center',
                    background: 'var(--cream-2, #EBE3D2)',
                    border: 'none',
                    color: 'var(--ink-soft, #3A332C)',
                    fontSize: 14,
                    lineHeight: 1,
                    cursor: 'pointer',
                  }}
                >
                  ×
                </button>
              </>
            )}
          </div>
          {paletteError && (
            <div
              style={{
                fontSize: 11,
                color: '#b4543a',
                padding: '5px 9px',
                borderRadius: 6,
                background: 'rgba(180,84,58,0.08)',
              }}
            >
              {paletteError}
            </div>
          )}
        </div>

        {/* SAVED LOOKS — 6-slot localStorage. Same shape + cap as the
            prototype's SavedLooks (themes.jsx ~line 765). */}
        <div
          style={{
            borderTop: '1px solid var(--line-soft, rgba(14,13,11,0.08))',
            paddingTop: 14,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 9,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--ink-muted, #6F6557)',
              }}
            >
              Saved looks
            </span>
            <button
              type="button"
              onClick={saveCurrent}
              disabled={looks.length >= MAX_LOOKS}
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: looks.length >= MAX_LOOKS ? 'var(--ink-muted, #6F6557)' : 'var(--ink, #0E0D0B)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                background: 'transparent',
                border: 'none',
                cursor: looks.length >= MAX_LOOKS ? 'not-allowed' : 'pointer',
                padding: 0,
              }}
              title={
                looks.length >= MAX_LOOKS
                  ? `Max ${MAX_LOOKS} looks — remove one to save another`
                  : 'Save the current dial settings'
              }
            >
              + Save current
            </button>
          </div>
          {looks.length === 0 ? (
            <div style={{ fontSize: 11, color: 'var(--ink-muted, #6F6557)' }}>
              Save a combo you love to revisit it later.
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {looks.map((lk, i) => {
                const editionColor = lk.edition ? EDITION_TINT[lk.edition] : '#5C6B3F';
                const textureColor = lk.texture ? TEXTURE_TINT[lk.texture] : '#F5EFE2';
                const title = [
                  lk.edition ?? 'edition?',
                  lk.texture ?? 'smooth',
                  lk.density,
                  `${(lk.textureIntensity ?? 1).toFixed(2)}×`,
                  lk.voiceOverride ?? 'match-event',
                ].join(' · ');
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => applyLook(lk)}
                    title={title}
                    style={{
                      position: 'relative',
                      width: 40,
                      height: 40,
                      borderRadius: 9,
                      overflow: 'hidden',
                      border: '1px solid var(--line, rgba(14,13,11,0.14))',
                      background: textureColor,
                      cursor: 'pointer',
                      padding: 0,
                      transition: 'transform 140ms ease',
                    }}
                  >
                    {/* Diagonal split — texture color on top-right,
                        edition color on bottom-left. Makes each chip
                        visually distinct without needing thumbnails. */}
                    <span
                      aria-hidden
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: `linear-gradient(135deg, ${editionColor} 0 50%, ${textureColor} 50% 100%)`,
                      }}
                    />
                    <span
                      role="button"
                      aria-label="Remove this saved look"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeLook(i);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation();
                          removeLook(i);
                        }
                      }}
                      style={{
                        position: 'absolute',
                        top: -3,
                        right: -3,
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: 'var(--ink, #0E0D0B)',
                        color: 'var(--cream, #F5EFE2)',
                        fontSize: 10,
                        display: 'grid',
                        placeItems: 'center',
                        zIndex: 2,
                        cursor: 'pointer',
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* MATCHING STATIONERY CTA — links to Studio (/dashboard/invite). */}
        <a
          href="/dashboard/invite"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 14px',
            borderRadius: 12,
            background: 'var(--ink, #0E0D0B)',
            color: 'var(--cream, #F5EFE2)',
            textDecoration: 'none',
            transition: 'transform 140ms ease',
          }}
        >
          <span aria-hidden style={{ fontSize: 16, lineHeight: 1 }}>✉</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700 }}>Matching Save-the-Date</div>
            <div style={{ fontSize: 11, opacity: 0.75 }}>
              Same theme, print-ready card &amp; envelope
            </div>
          </div>
          <span aria-hidden style={{ fontSize: 12 }}>→</span>
        </a>
      </div>
    </PanelSection>
  );
}
