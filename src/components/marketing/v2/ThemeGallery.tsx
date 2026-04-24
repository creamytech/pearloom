'use client';

// ─────────────────────────────────────────────────────────────
// Theme Gallery — the Theme-tab feature from mockup 1.
// Shows 3+ curated theme packs. Applying one writes palette +
// type + motifs to the manifest via onApply. Called from the
// editor as a modal sheet.
// ─────────────────────────────────────────────────────────────

import { useState, type ReactNode } from 'react';
import { PD, DISPLAY_STYLE, MONO_STYLE } from '../design/DesignAtoms';
import type { StoryManifest } from '@/types';

export interface ThemePack {
  id: string;
  name: string;
  tagline: string;
  palette: string[];
  displayFont: string;
  bodyFont: string;
  motifs: string;
  description: string;
  voice: string;
  // Heavy art treatment — applied to hero/chapter images.
  heroTreatment: 'botanical' | 'warm' | 'editorial' | 'blush';
  accent: string;
}

export const THEME_PACKS: ThemePack[] = [
  {
    id: 'garden-editorial',
    name: 'Garden Editorial',
    tagline: 'Soft botanicals, refined editorial',
    palette: ['#5C6B3F', '#C8B3D9', '#E8DFE9', '#F4ECD8', '#C19A4B'],
    displayFont: 'Playfair Display',
    bodyFont: 'Inter',
    motifs: 'Pressed flowers, dotted vines',
    description:
      'Lavender sprigs and olive dividers. Works for spring weddings, showers, garden parties.',
    voice: 'Warm editorial. Specific. Literary.',
    heroTreatment: 'botanical',
    accent: '#5C6B3F',
  },
  {
    id: 'sunwashed',
    name: 'Sunwashed Dinner Party',
    tagline: 'Warm, relaxed, sunlit celebration',
    palette: ['#E8C77A', '#D9A89E', '#C47A4A', '#F1E6C8', '#C19A4B'],
    displayFont: 'Cormorant',
    bodyFont: 'Inter',
    motifs: 'Citrus, linen, amber glass',
    description:
      'Golden hour dinner-party energy. Late summer, rehearsals, rehearsal dinners, birthdays.',
    voice: 'Playful, sun-warm, slightly casual.',
    heroTreatment: 'warm',
    accent: '#C47A4A',
  },
  {
    id: 'modern-keepsake',
    name: 'Modern Keepsake',
    tagline: 'Clean, minimal, timeless',
    palette: ['#1F2418', '#C8BFA5', '#F4ECD8', '#6B7A3A', '#C19A4B'],
    displayFont: 'Canela',
    bodyFont: 'Inter',
    motifs: 'Single sprig, thin rules',
    description:
      'Editorial-minimal. Works for anniversaries, memorials, corporate events, retirements.',
    voice: 'Quiet, precise, considered.',
    heroTreatment: 'editorial',
    accent: PD.ink,
  },
  {
    id: 'gentle-gathering',
    name: 'Gentle Gathering',
    tagline: 'Blush and sage, paper-thin',
    palette: ['#E3DCC0', '#D9A89E', '#6B7A3A', '#F7F0DC', '#C19A4B'],
    displayFont: 'Fraunces',
    bodyFont: 'Inter',
    motifs: 'Rose tendrils, sage dividers',
    description:
      'Intimate and soft. Bridal showers, baby showers, christenings, sip-and-see.',
    voice: 'Tender, close, gathered.',
    heroTreatment: 'blush',
    accent: '#D9A89E',
  },
];

// Apply a theme pack to a manifest. Returns a NEW manifest — parent
// calls onApply and threads the new manifest through the save path.
export function applyThemePack(manifest: StoryManifest, pack: ThemePack): StoryManifest {
  const current = manifest.theme;
  return {
    ...manifest,
    theme: {
      ...(current ?? {}),
      name: pack.name,
      fonts: {
        heading: pack.displayFont,
        body: pack.bodyFont,
      },
      colors: {
        background: pack.palette[3] ?? PD.paper,
        foreground: current?.colors?.foreground ?? PD.ink,
        accent: pack.palette[4] ?? pack.accent,
        accentLight: pack.palette[1] ?? pack.palette[2] ?? PD.paperCard,
        muted: current?.colors?.muted ?? PD.inkSoft,
        cardBg: pack.palette[2] ?? PD.paperCard,
      },
      borderRadius: current?.borderRadius ?? '0.75rem',
    },
  };
}

// ── Gallery Sheet ────────────────────────────────────────────
export function ThemeGallerySheet({
  manifest,
  onApply,
  onClose,
}: {
  manifest: StoryManifest;
  onApply: (m: StoryManifest) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string>(THEME_PACKS[0].id);
  const pack = THEME_PACKS.find((p) => p.id === selected) ?? THEME_PACKS[0];

  const apply = () => {
    onApply(applyThemePack(manifest, pack));
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-label="Theme gallery"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 600,
        background: 'rgba(31,36,24,0.48)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: PD.paper,
          width: '100%',
          maxWidth: 1280,
          margin: 'auto',
          maxHeight: '92vh',
          borderRadius: 22,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'var(--pl-font-body)',
          boxShadow: '0 40px 100px rgba(31,36,24,0.4)',
          animation: 'pl-enter-up 320ms cubic-bezier(.22,1,.36,1)',
        }}
      >
        <Header onClose={onClose} />
        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: '1fr 320px',
            gap: 0,
            minHeight: 0,
          }}
          className="pl-theme-gallery-grid"
        >
          {/* Main — 3 theme pack cards */}
          <div
            style={{
              padding: 'clamp(20px, 3vw, 32px)',
              overflowY: 'auto',
              background: PD.paper,
            }}
          >
            <SectionHeader kicker="THEME GENERATION">
              Generated from your story, setting, and tone.
            </SectionHeader>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: 16,
                marginBottom: 24,
              }}
              className="pl-theme-packs"
            >
              {THEME_PACKS.slice(0, 3).map((p) => (
                <PackCard
                  key={p.id}
                  pack={p}
                  selected={p.id === selected}
                  onSelect={() => setSelected(p.id)}
                />
              ))}
            </div>

            <AppliedPreview pack={pack} />
            <SystemIncludes />
          </div>

          {/* Right inspector */}
          <Inspector pack={pack} onApply={apply} onShuffle={() => {
            const next = THEME_PACKS[(THEME_PACKS.findIndex((p) => p.id === selected) + 1) % THEME_PACKS.length];
            setSelected(next.id);
          }} />
        </div>

        <style jsx>{`
          @media (max-width: 960px) {
            :global(.pl-theme-gallery-grid) {
              grid-template-columns: 1fr !important;
            }
          }
          @media (max-width: 700px) {
            :global(.pl-theme-packs) {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
}

function Header({ onClose }: { onClose: () => void }) {
  return (
    <div
      style={{
        padding: '16px clamp(20px, 3vw, 32px)',
        borderBottom: '1px solid rgba(31,36,24,0.06)',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        background: '#FFFEF7',
      }}
    >
      <div
        style={{
          ...DISPLAY_STYLE,
          fontSize: 20,
          fontWeight: 400,
          letterSpacing: '-0.015em',
          flex: 1,
        }}
      >
        Theme gallery
      </div>
      <button
        onClick={onClose}
        aria-label="Close"
        style={{
          width: 36,
          height: 36,
          borderRadius: 999,
          background: PD.paperCard,
          border: '1px solid rgba(31,36,24,0.08)',
          cursor: 'pointer',
          fontSize: 16,
          color: PD.ink,
          fontFamily: 'inherit',
        }}
      >
        ×
      </button>
    </div>
  );
}

function SectionHeader({ kicker, children }: { kicker: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
      <span style={{ fontSize: 16, color: PD.gold }}>✦</span>
      <div>
        <div
          style={{
            ...MONO_STYLE,
            fontSize: 10.5,
            color: PD.inkSoft,
            letterSpacing: '0.22em',
            marginBottom: 4,
          }}
        >
          {kicker}
        </div>
        <div style={{ fontSize: 13, color: PD.inkSoft, lineHeight: 1.55 }}>{children}</div>
      </div>
    </div>
  );
}

function PackCard({
  pack,
  selected,
  onSelect,
}: {
  pack: ThemePack;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      style={{
        background: '#FFFEF7',
        borderRadius: 16,
        padding: 14,
        border: selected ? `2px solid #6E5BA8` : '1px solid rgba(31,36,24,0.08)',
        cursor: 'pointer',
        fontFamily: 'inherit',
        textAlign: 'left',
        color: PD.ink,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        position: 'relative',
        transition: 'transform 180ms, border-color 180ms',
      }}
    >
      {selected && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            width: 22,
            height: 22,
            borderRadius: 999,
            background: '#6E5BA8',
            color: '#FFFEF7',
            fontSize: 11,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ✓
        </span>
      )}
      <div style={{ fontFamily: '"Fraunces", Georgia, serif', fontSize: 14, fontWeight: 500 }}>
        {pack.name}
      </div>
      <div style={{ fontSize: 11, color: PD.inkSoft, marginTop: -6 }}>{pack.tagline}</div>
      <div
        style={{
          aspectRatio: '4 / 3',
          borderRadius: 10,
          background: `linear-gradient(135deg, ${pack.palette[3] ?? PD.paperCard}, ${pack.palette[1] ?? PD.paperDeep})`,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            background: '#FFFEF7',
            borderRadius: 6,
            padding: '16px 20px',
            fontFamily: '"Fraunces", Georgia, serif',
            fontStyle: 'italic',
            fontSize: 14,
            color: pack.accent,
            boxShadow: '0 6px 18px rgba(31,36,24,0.12)',
          }}
        >
          A &amp; J
        </div>
      </div>
      <div style={{ display: 'flex', gap: 3, height: 16 }}>
        {pack.palette.map((c, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              background: c,
              borderRadius: i === 0 ? '4px 0 0 4px' : i === pack.palette.length - 1 ? '0 4px 4px 0' : 0,
            }}
          />
        ))}
      </div>
      <div style={{ borderTop: '1px solid rgba(31,36,24,0.06)', paddingTop: 8 }}>
        <div style={{ fontFamily: '"Fraunces", Georgia, serif', fontSize: 16, marginBottom: 2 }}>
          Aa{' '}
          <span style={{ fontSize: 11, color: PD.inkSoft, marginLeft: 8 }}>{pack.displayFont}</span>
        </div>
        <div style={{ fontSize: 11, color: PD.inkSoft }}>{pack.bodyFont}</div>
      </div>
    </button>
  );
}

function AppliedPreview({ pack }: { pack: ThemePack }) {
  return (
    <div
      style={{
        background: pack.palette[3] ?? PD.paperCard,
        borderRadius: 16,
        border: '1px solid rgba(31,36,24,0.06)',
        padding: 'clamp(24px, 4vw, 40px)',
        marginBottom: 20,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 11,
          marginBottom: 18,
        }}
      >
        <span style={{ ...MONO_STYLE, color: PD.inkSoft, letterSpacing: '0.2em' }}>
          APPLIED PREVIEW
        </span>
        <span
          style={{
            background: '#FFFEF7',
            padding: '3px 10px',
            borderRadius: 999,
            fontWeight: 500,
            fontSize: 10.5,
          }}
        >
          {pack.name}
        </span>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 0.8fr)',
          gap: 28,
          alignItems: 'center',
        }}
      >
        <div>
          <h3
            style={{
              fontFamily: '"Fraunces", Georgia, serif',
              fontSize: 'clamp(26px, 3vw, 36px)',
              fontStyle: 'italic',
              fontWeight: 400,
              margin: 0,
              color: pack.accent,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
            }}
          >
            Kindly join us
            <br />
            to celebrate
          </h3>
          <p style={{ fontSize: 13, color: PD.inkSoft, marginTop: 14, lineHeight: 1.55 }}>
            We can&rsquo;t wait to celebrate with you. Please let us know by May 1st.
          </p>
          <button
            style={{
              marginTop: 14,
              background: pack.accent,
              color: '#FFFEF7',
              border: 'none',
              padding: '9px 16px',
              borderRadius: 999,
              fontSize: 12.5,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            RSVP now
          </button>
        </div>
        <div
          style={{
            aspectRatio: '1 / 1',
            background: `radial-gradient(circle at 30% 30%, ${pack.palette[1]}, ${pack.palette[4] ?? pack.palette[0]})`,
            borderRadius: '52% 48% 42% 58% / 48% 52% 48% 52%',
          }}
        />
      </div>
    </div>
  );
}

function SystemIncludes() {
  const rows = [
    { k: 'colors', l: 'Colors', s: 'Thoughtful palette across every page' },
    { k: 'type', l: 'Typography', s: 'Beautiful text pairings' },
    { k: 'motifs', l: 'Motifs', s: 'Illustrations & decorative elements' },
    { k: 'icons', l: 'Icons', s: 'Consistent icon style' },
    { k: 'blocks', l: 'Blocks', s: 'Pre-styled sections and layouts' },
    { k: 'imagery', l: 'Imagery', s: 'Photo style and treatment' },
  ];
  return (
    <div>
      <div
        style={{
          ...MONO_STYLE,
          fontSize: 10,
          letterSpacing: '0.22em',
          color: PD.inkSoft,
          marginBottom: 12,
        }}
      >
        THEME SYSTEM INCLUDES
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 14,
        }}
      >
        {rows.map((r) => (
          <div
            key={r.k}
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
              fontSize: 12,
            }}
          >
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: PD.paperCard,
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
              }}
            >
              ✦
            </span>
            <div>
              <div style={{ fontWeight: 500, color: PD.ink }}>{r.l}</div>
              <div style={{ color: PD.inkSoft, lineHeight: 1.4 }}>{r.s}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Inspector({
  pack,
  onApply,
  onShuffle,
}: {
  pack: ThemePack;
  onApply: () => void;
  onShuffle: () => void;
}) {
  return (
    <aside
      style={{
        borderLeft: '1px solid rgba(31,36,24,0.06)',
        background: '#FFFEF7',
        padding: 'clamp(20px, 3vw, 28px)',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          ...MONO_STYLE,
          fontSize: 10,
          color: PD.inkSoft,
          letterSpacing: '0.22em',
          marginBottom: 8,
        }}
      >
        EDITING THEME PACK
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
        }}
      >
        <div
          style={{
            ...DISPLAY_STYLE,
            fontSize: 19,
            fontWeight: 400,
            letterSpacing: '-0.015em',
          }}
        >
          {pack.name}
        </div>
        <span style={{ fontSize: 11, color: PD.olive, fontWeight: 500 }}>
          ● Ready to apply
        </span>
      </div>

      <InspectorField label="Palette">
        <div style={{ display: 'flex', gap: 6 }}>
          {pack.palette.map((c, i) => (
            <div
              key={i}
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: c,
                border: '1px solid rgba(31,36,24,0.06)',
              }}
            />
          ))}
        </div>
      </InspectorField>

      <InspectorField label="Motifs">
        <div style={{ fontSize: 13, color: PD.ink, lineHeight: 1.5 }}>{pack.motifs}</div>
      </InspectorField>

      <InspectorField label="Type pairing">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            background: PD.paperCard,
            borderRadius: 10,
          }}
        >
          <div
            style={{
              fontFamily: '"Fraunces", Georgia, serif',
              fontSize: 22,
              fontStyle: 'italic',
              fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
            }}
          >
            Aa
          </div>
          <div style={{ fontSize: 11, color: PD.inkSoft, flex: 1 }}>
            <div style={{ color: PD.ink, fontWeight: 500 }}>{pack.displayFont}</div>
            <div>{pack.bodyFont}</div>
          </div>
          <span style={{ fontSize: 14, color: PD.inkSoft }}>⇄</span>
        </div>
      </InspectorField>

      <InspectorField label="Voice from Pear">
        <div style={{ fontSize: 12.5, color: PD.ink, lineHeight: 1.5 }}>{pack.voice}</div>
      </InspectorField>

      <InspectorField label="Who it suits">
        <div style={{ fontSize: 12.5, color: PD.inkSoft, lineHeight: 1.55 }}>
          {pack.description}
        </div>
      </InspectorField>

      <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
        <button
          onClick={onShuffle}
          style={{
            flex: 1,
            background: 'transparent',
            border: '1px solid rgba(31,36,24,0.15)',
            borderRadius: 999,
            padding: '10px 14px',
            fontSize: 12.5,
            cursor: 'pointer',
            color: PD.ink,
            fontFamily: 'inherit',
            display: 'inline-flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 6,
          }}
        >
          ⟳ Shuffle
        </button>
        <button
          onClick={onApply}
          style={{
            flex: 1.2,
            background: '#6E5BA8',
            color: '#FFFEF7',
            border: 'none',
            borderRadius: 999,
            padding: '10px 14px',
            fontSize: 12.5,
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'inherit',
            boxShadow: '0 8px 20px rgba(110,91,168,0.25)',
          }}
        >
          Apply globally
        </button>
      </div>

      <div
        style={{
          marginTop: 18,
          padding: 12,
          borderRadius: 12,
          background: PD.paperCard,
          fontSize: 12,
          color: PD.inkSoft,
          lineHeight: 1.5,
        }}
      >
        <div
          style={{
            ...MONO_STYLE,
            fontSize: 9,
            letterSpacing: '0.22em',
            color: '#6E5BA8',
            marginBottom: 4,
          }}
        >
          ✦ PEAR SUGGESTS
        </div>
        {pack.heroTreatment === 'botanical'
          ? 'Try a softer background for a more editorial feel.'
          : pack.heroTreatment === 'warm'
          ? 'Add a warm vignette to lean into golden-hour mood.'
          : pack.heroTreatment === 'editorial'
          ? 'Keep hero imagery to one hero photo per chapter.'
          : 'Pair with hand-written captions under each photo.'}
      </div>
    </aside>
  );
}

function InspectorField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          ...MONO_STYLE,
          fontSize: 9.5,
          color: PD.inkSoft,
          opacity: 0.75,
          letterSpacing: '0.22em',
          marginBottom: 8,
        }}
      >
        {label.toUpperCase()}
      </div>
      {children}
    </div>
  );
}
