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
//   • Matching Save-the-Date CTA — dark ink card linking to
//     Pearloom Studio (the stationery editor at /dashboard/invite
//     per CLAUDE.md).
//
// Reads/writes:
//   manifest.density           ('cozy' | 'comfortable' | 'spacious')
//   manifest.textureIntensity  (0–1.5, default 1)
//   manifest.voiceOverride     ('classic' | 'playful' | 'poetic' | undefined)
// ─────────────────────────────────────────────────────────────

import type { StoryManifest } from '@/types';
import { PanelSection } from '../atoms';

type Density = NonNullable<StoryManifest['density']>;
type VoiceOverride = NonNullable<StoryManifest['voiceOverride']>;

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
