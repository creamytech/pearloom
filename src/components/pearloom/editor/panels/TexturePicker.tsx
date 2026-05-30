'use client';

// ─────────────────────────────────────────────────────────────
// TexturePicker — material identity for the site. Watercolor,
// linen, letterpress, vellum, newsprint, or smooth (modern
// default). Independent of Edition: any Edition can wear any
// texture.
//
// Sets manifest.texture; the renderer reads it as
// data-pl-texture on the .pl8-guest root and the scoped CSS
// in pearloom.css applies the material treatments
// (background, card edges, shadows, motion).
// ─────────────────────────────────────────────────────────────

import type { StoryManifest } from '@/types';
import { PanelSection } from '../atoms';
import { recommendTextureFor } from '@/lib/event-os/event-types';

type TextureId = NonNullable<StoryManifest['texture']>;

interface TextureSpec {
  id: TextureId;
  label: string;
  tagline: string;
  /** Inline SVG preview — 240×72 strip suggesting the texture. */
  Preview: () => React.ReactElement;
}

function SmoothPreview() {
  return (
    <svg viewBox="0 0 240 72" width="100%" height="100%" preserveAspectRatio="none">
      <rect width="240" height="72" fill="#FBF7EE" />
      <rect x="40" y="22" width="160" height="28" fill="#F5EFE2" stroke="#D8CFB8" strokeWidth="0.5" />
    </svg>
  );
}
function WatercolorPreview() {
  return (
    <svg viewBox="0 0 240 72" width="100%" height="100%" preserveAspectRatio="none">
      <defs>
        <filter id="wc-blur"><feGaussianBlur stdDeviation="2" /></filter>
      </defs>
      <rect width="240" height="72" fill="#FBF7EE" />
      <ellipse cx="80" cy="36" rx="50" ry="22" fill="#C49A6F" opacity="0.32" filter="url(#wc-blur)" />
      <ellipse cx="170" cy="40" rx="44" ry="20" fill="#8B6F8E" opacity="0.28" filter="url(#wc-blur)" />
      <ellipse cx="120" cy="48" rx="36" ry="14" fill="#5C6B3F" opacity="0.30" filter="url(#wc-blur)" />
    </svg>
  );
}
function LinenPreview() {
  return (
    <svg viewBox="0 0 240 72" width="100%" height="100%" preserveAspectRatio="none">
      <defs>
        <pattern id="linen-weave" width="6" height="6" patternUnits="userSpaceOnUse">
          <rect width="6" height="6" fill="#F5EFE2" />
          <line x1="0" y1="0" x2="6" y2="0" stroke="#6F6557" strokeWidth="0.4" opacity="0.18" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="#6F6557" strokeWidth="0.4" opacity="0.18" />
        </pattern>
      </defs>
      <rect width="240" height="72" fill="url(#linen-weave)" />
      <rect x="40" y="22" width="160" height="28" fill="#FBF7EE" stroke="#B89244" strokeWidth="0.6" />
    </svg>
  );
}
function LetterpressPreview() {
  return (
    <svg viewBox="0 0 240 72" width="100%" height="100%" preserveAspectRatio="none">
      <rect width="240" height="72" fill="#F5EFE2" />
      <text x="120" y="46" textAnchor="middle" fontFamily="serif" fontSize="28" fontStyle="italic" fill="#0E0D0B" filter="url(#lp-inset)">Anna</text>
      <defs>
        <filter id="lp-inset" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="0.4" />
        </filter>
      </defs>
    </svg>
  );
}
function VellumPreview() {
  return (
    <svg viewBox="0 0 240 72" width="100%" height="100%" preserveAspectRatio="none">
      <rect width="240" height="72" fill="#F7EFD8" />
      <rect x="40" y="14" width="160" height="44" fill="rgba(255,255,255,0.55)" stroke="rgba(184,146,68,0.35)" strokeWidth="0.5" />
      <rect x="0" y="0" width="240" height="72" fill="url(#vellum-grad)" opacity="0.4" />
      <defs>
        <linearGradient id="vellum-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FCE9B8" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#C49A6F" stopOpacity="0.12" />
        </linearGradient>
      </defs>
    </svg>
  );
}
function NewsprintPreview() {
  return (
    <svg viewBox="0 0 240 72" width="100%" height="100%" preserveAspectRatio="none">
      <defs>
        <pattern id="halftone" width="4" height="4" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="0.9" fill="#0E0D0B" opacity="0.45" />
        </pattern>
      </defs>
      <rect width="240" height="72" fill="#EBE3D2" />
      <rect width="240" height="72" fill="url(#halftone)" />
      <text x="20" y="30" fontFamily="serif" fontSize="14" fontWeight="700" fill="#0E0D0B">SOMETHING</text>
      <text x="20" y="50" fontFamily="serif" fontSize="9" fill="#0E0D0B" opacity="0.85">NEW IN TOWN · 2026</text>
    </svg>
  );
}

const TEXTURES: TextureSpec[] = [
  { id: 'smooth',      label: 'Smooth',      tagline: 'Modern default — clean paper, soft shadows.',         Preview: SmoothPreview },
  { id: 'watercolor',  label: 'Watercolor',  tagline: 'Soft color bleeds. Cards look painted, not printed.',  Preview: WatercolorPreview },
  { id: 'linen',       label: 'Linen',       tagline: 'Woven fabric grain underfoot. Quiet, formal.',         Preview: LinenPreview },
  { id: 'letterpress', label: 'Letterpress', tagline: 'Type pressed into paper. Editorial book feel.',        Preview: LetterpressPreview },
  { id: 'vellum',      label: 'Vellum',      tagline: 'Translucent waxy paper. Warm cast on everything.',     Preview: VellumPreview },
  { id: 'newsprint',   label: 'Newsprint',   tagline: 'Halftone dots + ink. Reads like a broadsheet.',        Preview: NewsprintPreview },
];

interface Props {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}

export function TexturePicker({ manifest, onChange }: Props) {
  const recommended = recommendTextureFor(manifest.occasion ?? 'wedding');
  // Align with renderer: when manifest.texture is unset, the site
  // renders with the recommended texture — so the picker should
  // reflect that as the active tile, not 'smooth' by default.
  const active = manifest.texture ?? recommended;

  function pick(id: TextureId) {
    if (id === active) return;
    onChange({ ...manifest, texture: id });
  }

  return (
    <PanelSection
      label="Texture"
      hint="The material your site is made from. Watercolor bleeds, linen weave, letterpress, newsprint — independent of Edition, mix and match."
      defaultOpen
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        {TEXTURES.map((t) => {
          const on = active === t.id;
          const isRecommended = recommended === t.id;
          const Preview = t.Preview;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => pick(t.id)}
              aria-pressed={on}
              title={isRecommended ? `${t.tagline} — Pear's pick for this event` : t.tagline}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                padding: 8,
                borderRadius: 12,
                background: on ? 'var(--sage-tint, #E3E6C8)' : 'var(--card, #FBF7EE)',
                border: on
                  ? '1.5px solid var(--sage-deep, #6d7d3f)'
                  : '1px solid var(--line, rgba(14,13,11,0.14))',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'var(--font-ui)',
                transition: 'background 160ms ease, border-color 160ms ease, transform 160ms ease',
              }}
              onMouseEnter={(e) => {
                if (on) return;
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = '';
              }}
            >
              <div
                style={{
                  width: '100%',
                  aspectRatio: '10 / 3',
                  borderRadius: 8,
                  overflow: 'hidden',
                  border: '1px solid var(--line-soft, rgba(14,13,11,0.06))',
                }}
              >
                <Preview />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span
                  style={{
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: on ? 'var(--sage-deep, #3D4A1F)' : 'var(--ink)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {t.label}
                  {isRecommended && !on && (
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 600,
                        letterSpacing: '0.10em',
                        textTransform: 'uppercase',
                        padding: '2px 6px',
                        borderRadius: 999,
                        background: 'rgba(184,146,68,0.18)',
                        color: '#876733',
                        border: '1px solid rgba(184,146,68,0.45)',
                      }}
                    >
                      Pear's pick
                    </span>
                  )}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--ink-muted, #6F6557)',
                    lineHeight: 1.4,
                  }}
                >
                  {t.tagline}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </PanelSection>
  );
}
