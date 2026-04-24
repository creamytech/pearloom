'use client';

import type { StoryManifest } from '@/types';
import { Field, PanelSection, SegmentedToggle, SelectInput, TextInput } from '../atoms';
import { Blob, Pear, Sparkle, Squiggle } from '../../motifs';

const PALETTES = [
  { id: 'groovy-garden', name: 'Groovy Garden', colors: ['#3D4A1F', '#8B9C5A', '#C4B5D9', '#F3E9D4', '#2A3512', '#D7CCE5'] },
  { id: 'dusk-meadow', name: 'Dusk Meadow', colors: ['#6B5A8C', '#B7A4D0', '#CBD29E', '#F3E9D4', '#4A3F6B', '#D7CCE5'] },
  { id: 'warm-linen', name: 'Warm Linen', colors: ['#8B4720', '#EAB286', '#F7DDC2', '#F3E9D4', '#C6703D', '#FBE8D6'] },
  { id: 'olive-gold', name: 'Olive & Gold', colors: ['#3D4A1F', '#6d7d3f', '#D4A95D', '#F3E9D4', '#B89244', '#CBD29E'] },
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
                onClick={() => update({ palette: p.id, themeName: p.name })}
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
          <SelectInput value={headingFont} onChange={(v) => update({ headingFont: v })} options={HEADING_FONTS} />
        </Field>
        <Field label="Body">
          <SelectInput value={bodyFont} onChange={(v) => update({ bodyFont: v })} options={BODY_FONTS} />
        </Field>
        <Field label="Script">
          <SelectInput value={scriptFont} onChange={(v) => update({ scriptFont: v })} options={SCRIPT_FONTS} />
        </Field>
      </PanelSection>

      <div
        style={{
          padding: 16,
          background: 'var(--lavender-bg)',
          border: '1px solid rgba(107,90,140,0.18)',
          borderRadius: 14,
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start',
        }}
      >
        <Pear size={36} tone="sage" />
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--lavender-ink)', marginBottom: 2 }}>
            Try Pear Assistant <Sparkle size={10} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
            Want a new combination? Tell Pear the vibe and it'll suggest a palette + motif.
          </div>
        </div>
      </div>
    </div>
  );
}
