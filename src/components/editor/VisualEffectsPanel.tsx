'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/VisualEffectsPanel.tsx
// Editor UI for all visual atmosphere effects:
//   • Film grain
//   • Vignette
//   • Color temperature
//   • Animated gradient mesh
//   • Custom cursor
//   • Section dividers
//   • Scroll reveal animations
//   • Texture overlay
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import type { ThemeSchema } from '@/types';

// ── Types (mirrors ThemeSchema effects) ───────────────────────
type Effects = NonNullable<ThemeSchema['effects']>;
type MeshPreset = NonNullable<NonNullable<Effects['gradientMesh']>['preset']>;
type MeshSpeed  = NonNullable<NonNullable<Effects['gradientMesh']>['speed']>;
type CursorShape = NonNullable<Effects['customCursor']>;
type DividerStyle = NonNullable<NonNullable<Effects['sectionDivider']>['style']>;
type RevealAnim = NonNullable<Effects['scrollReveal']>;
type TextureType = NonNullable<Effects['textureOverlay']>;

interface VisualEffectsPanelProps {
  effects: Effects;
  accentColor?: string;
  onChange: (effects: Effects) => void;
}

// ── Sub-components ─────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.12em',
      textTransform: 'uppercase', color: 'rgba(214,198,168,0.45)',
      marginBottom: '8px', marginTop: '4px',
    }}>
      {children}
    </div>
  );
}

function SliderRow({
  label, value, min, max, unit = '', onChange, hint,
}: {
  label: string; value: number; min: number; max: number;
  unit?: string; onChange: (v: number) => void; hint?: string;
}) {
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
        <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: '0.75rem', color: 'rgba(214,198,168,0.7)', fontWeight: 700, minWidth: '38px', textAlign: 'right' }}>
          {value > 0 && unit === 'temp' ? `+${value}` : value}{unit !== 'temp' ? unit : ''}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--eg-accent, #A3B18A)', cursor: 'pointer' }}
      />
      {hint && <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', marginTop: '3px' }}>{hint}</div>}
    </div>
  );
}

function ToggleChip({
  active, label, emoji, onClick, color,
}: {
  active: boolean; label: string; emoji?: string; onClick: () => void; color?: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 10px', borderRadius: '8px', border: `1px solid ${active ? (color ?? 'rgba(163,177,138,0.6)') : 'rgba(255,255,255,0.1)'}`,
        background: active ? `${color ?? 'rgba(163,177,138,1)'}22` : 'rgba(255,255,255,0.04)',
        color: active ? (color ?? 'rgba(163,177,138,1)') : 'rgba(255,255,255,0.55)',
        cursor: 'pointer', fontSize: '0.75rem', fontWeight: active ? 700 : 500,
        display: 'flex', alignItems: 'center', gap: '4px',
        transition: 'all 0.15s',
      }}
    >
      {emoji && <span style={{ fontSize: '0.85rem' }}>{emoji}</span>}
      {label}
    </button>
  );
}

// ── Gradient mesh preset picker ────────────────────────────────
const MESH_PRESETS: Array<{ id: MeshPreset; label: string; colors: [string, string, string] }> = [
  { id: 'none',      label: 'Off',       colors: ['#333', '#333', '#333'] },
  { id: 'aurora',    label: 'Aurora',    colors: ['#00C6FF', '#7B2FF7', '#00FFA3'] },
  { id: 'sunset',    label: 'Sunset',    colors: ['#FF6B6B', '#FFA500', '#FF1493'] },
  { id: 'ocean',     label: 'Ocean',     colors: ['#006994', '#00B4D8', '#90E0EF'] },
  { id: 'forest',    label: 'Forest',    colors: ['#2D6A4F', '#52B788', '#B7E4C7'] },
  { id: 'rose',      label: 'Rose',      colors: ['#FFAFCC', '#FFC8DD', '#CDB4DB'] },
  { id: 'champagne', label: 'Champagne', colors: ['#C9A87C', '#F5E6D0', '#E8C99A'] },
  { id: 'twilight',  label: 'Twilight',  colors: ['#2C1654', '#6B2FA0', '#C850C0'] },
  { id: 'custom',    label: 'Accent',    colors: ['#A3B18A', '#A3B18A', '#A3B18A'] },
];

function MeshPresetPicker({ value, onChange }: { value: MeshPreset; onChange: (v: MeshPreset) => void }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
      {MESH_PRESETS.map(p => {
        const active = value === p.id;
        return (
          <button
            key={p.id}
            onClick={() => onChange(p.id)}
            title={p.label}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
              padding: '6px 8px', borderRadius: '10px', border: `2px solid ${active ? 'rgba(163,177,138,0.8)' : 'transparent'}`,
              background: active ? 'rgba(163,177,138,0.12)' : 'rgba(255,255,255,0.04)',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <div style={{
              width: '36px', height: '24px', borderRadius: '6px', overflow: 'hidden',
              background: p.id === 'none'
                ? 'rgba(255,255,255,0.1)'
                : `linear-gradient(135deg, ${p.colors[0]}, ${p.colors[1]}, ${p.colors[2]})`,
              opacity: p.id === 'none' ? 0.4 : 1,
            }} />
            <span style={{ fontSize: '0.6rem', color: active ? 'rgba(163,177,138,1)' : 'rgba(255,255,255,0.45)', fontWeight: active ? 700 : 400 }}>
              {p.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Cursor shape picker ────────────────────────────────────────
const CURSOR_SHAPES: Array<{ id: CursorShape; emoji: string; label: string }> = [
  { id: 'none',  emoji: '🚫', label: 'Default' },
  { id: 'pearl', emoji: '⚪', label: 'Pearl' },
  { id: 'heart', emoji: '❤️', label: 'Heart' },
  { id: 'ring',  emoji: '💍', label: 'Ring' },
  { id: 'petal', emoji: '🌸', label: 'Petal' },
  { id: 'star',  emoji: '⭐', label: 'Star' },
];

// ── Section divider style picker ───────────────────────────────
const DIVIDER_STYLES: Array<{ id: DividerStyle; label: string; preview: string }> = [
  { id: 'none',     label: 'None',     preview: '─────' },
  { id: 'wave',     label: 'Wave',     preview: '∿∿∿∿∿' },
  { id: 'wave2',    label: 'Wave 2',   preview: '〜〜〜' },
  { id: 'diagonal', label: 'Diagonal', preview: '╱╱╱╱╱' },
  { id: 'zigzag',   label: 'Zigzag',   preview: '/\\/\\/\\' },
  { id: 'torn',     label: 'Torn',     preview: 'ᵥᵥᵥᵥᵥ' },
  { id: 'chevron',  label: 'Chevron',  preview: '⌃⌃⌃⌃⌃' },
  { id: 'arc',      label: 'Arc',      preview: '⌢⌢⌢⌢⌢' },
];

// ── Scroll reveal picker ───────────────────────────────────────
const REVEAL_ANIMS: Array<{ id: RevealAnim; label: string; emoji: string }> = [
  { id: 'none',      label: 'None',     emoji: '⛔' },
  { id: 'fade',      label: 'Fade',     emoji: '🌫️' },
  { id: 'slide-up',  label: 'Slide Up', emoji: '⬆️' },
  { id: 'slide-left',label: 'Slide In', emoji: '➡️' },
  { id: 'zoom',      label: 'Zoom',     emoji: '🔍' },
  { id: 'blur-in',   label: 'Blur In',  emoji: '✨' },
];

// ── Texture overlay picker ─────────────────────────────────────
const TEXTURES: Array<{ id: TextureType; label: string; emoji: string }> = [
  { id: 'none',     label: 'None',     emoji: '⛔' },
  { id: 'paper',    label: 'Paper',    emoji: '📄' },
  { id: 'linen',    label: 'Linen',    emoji: '🧵' },
  { id: 'concrete', label: 'Concrete', emoji: '🧱' },
  { id: 'velvet',   label: 'Velvet',   emoji: '🎭' },
  { id: 'bokeh',    label: 'Bokeh',    emoji: '🌟' },
];

// ── Main panel ────────────────────────────────────────────────
export function VisualEffectsPanel({ effects, accentColor, onChange }: VisualEffectsPanelProps) {
  const set = <K extends keyof Effects>(key: K, val: Effects[K]) =>
    onChange({ ...effects, [key]: val });

  const mesh = effects.gradientMesh ?? { preset: 'none', speed: 'slow', opacity: 50 };
  const divider = effects.sectionDivider ?? { style: 'none', height: 80, flip: true };

  const [meshOpen, setMeshOpen] = useState(false);
  const [dividerOpen, setDividerOpen] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>

      {/* ── Film Grain ── */}
      <EffectBlock title="Film Grain" emoji="📽️" active={(effects.grain ?? 0) > 0}>
        <SliderRow
          label="Intensity"
          value={effects.grain ?? 0}
          min={0} max={100} unit="%"
          onChange={v => set('grain', v)}
          hint="Subtle film texture over the whole page"
        />
      </EffectBlock>

      {/* ── Vignette ── */}
      <EffectBlock title="Vignette" emoji="🎬" active={(effects.vignette ?? 0) > 0}>
        <SliderRow
          label="Darkness"
          value={effects.vignette ?? 0}
          min={0} max={100} unit="%"
          onChange={v => set('vignette', v)}
          hint="Darkens page edges for a cinematic feel"
        />
      </EffectBlock>

      {/* ── Color Temperature ── */}
      <EffectBlock title="Color Temperature" emoji="🌡️" active={(effects.colorTemp ?? 0) !== 0}>
        <SliderRow
          label="Warm ↔ Cool"
          value={effects.colorTemp ?? 0}
          min={-50} max={50} unit="temp"
          onChange={v => set('colorTemp', v)}
          hint="− cool blue  ·  0 neutral  ·  + warm amber"
        />
      </EffectBlock>

      {/* ── Gradient Mesh ── */}
      <EffectBlock
        title="Gradient Mesh"
        emoji="🎨"
        active={mesh.preset !== 'none'}
        onToggleExpand={() => setMeshOpen(v => !v)}
        expanded={meshOpen}
      >
        <SectionLabel>Preset</SectionLabel>
        <MeshPresetPicker
          value={mesh.preset}
          onChange={preset => set('gradientMesh', { ...mesh, preset })}
        />

        {mesh.preset !== 'none' && (
          <>
            <div style={{ marginTop: '12px' }}>
              <SectionLabel>Speed</SectionLabel>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {(['still', 'slow', 'medium', 'fast'] as MeshSpeed[]).map(s => (
                  <ToggleChip key={s} active={mesh.speed === s} label={s.charAt(0).toUpperCase() + s.slice(1)}
                    onClick={() => set('gradientMesh', { ...mesh, speed: s })} />
                ))}
              </div>
            </div>
            <div style={{ marginTop: '12px' }}>
              <SliderRow
                label="Opacity"
                value={mesh.opacity}
                min={5} max={100} unit="%"
                onChange={v => set('gradientMesh', { ...mesh, opacity: v })}
              />
            </div>
          </>
        )}
      </EffectBlock>

      {/* ── Custom Cursor ── */}
      <EffectBlock title="Custom Cursor" emoji="🖱️" active={(effects.customCursor ?? 'none') !== 'none'}>
        <SectionLabel>Shape</SectionLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {CURSOR_SHAPES.map(c => (
            <ToggleChip
              key={c.id}
              active={effects.customCursor === c.id}
              emoji={c.emoji}
              label={c.label}
              onClick={() => set('customCursor', c.id)}
            />
          ))}
        </div>
        <div style={{ marginTop: '8px', fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)' }}>
          Only visible on desktop (mouse) devices
        </div>
      </EffectBlock>

      {/* ── Section Dividers ── */}
      <EffectBlock
        title="Section Dividers"
        emoji="〰️"
        active={divider.style !== 'none'}
        onToggleExpand={() => setDividerOpen(v => !v)}
        expanded={dividerOpen}
      >
        <SectionLabel>Shape</SectionLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {DIVIDER_STYLES.map(d => (
            <button
              key={d.id}
              onClick={() => set('sectionDivider', { ...divider, style: d.id })}
              style={{
                padding: '6px 10px', borderRadius: '8px',
                border: `1px solid ${divider.style === d.id ? 'rgba(163,177,138,0.6)' : 'rgba(255,255,255,0.1)'}`,
                background: divider.style === d.id ? 'rgba(163,177,138,0.12)' : 'rgba(255,255,255,0.04)',
                color: divider.style === d.id ? 'rgba(163,177,138,1)' : 'rgba(255,255,255,0.55)',
                cursor: 'pointer', fontSize: '0.72rem', fontWeight: divider.style === d.id ? 700 : 400,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: '0.65rem', fontFamily: 'monospace', letterSpacing: '-0.03em', opacity: 0.7 }}>{d.preview}</span>
              <span>{d.label}</span>
            </button>
          ))}
        </div>

        {divider.style !== 'none' && (
          <div style={{ marginTop: '12px' }}>
            <SliderRow
              label="Height"
              value={divider.height}
              min={30} max={200} unit="px"
              onChange={v => set('sectionDivider', { ...divider, height: v })}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <ToggleChip
                active={divider.flip}
                label="Alternate flip"
                emoji={divider.flip ? '🔄' : '➡️'}
                onClick={() => set('sectionDivider', { ...divider, flip: !divider.flip })}
              />
            </div>
          </div>
        )}
      </EffectBlock>

      {/* ── Scroll Reveal ── */}
      <EffectBlock title="Scroll Reveal" emoji="✨" active={(effects.scrollReveal ?? 'none') !== 'none'}>
        <SectionLabel>Animation style</SectionLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {REVEAL_ANIMS.map(a => (
            <ToggleChip
              key={a.id}
              active={effects.scrollReveal === a.id}
              emoji={a.emoji}
              label={a.label}
              onClick={() => set('scrollReveal', a.id)}
            />
          ))}
        </div>
        <div style={{ marginTop: '8px', fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)' }}>
          Content sections animate in as visitors scroll down
        </div>
      </EffectBlock>

      {/* ── Texture Overlay ── */}
      <EffectBlock title="Surface Texture" emoji="🧱" active={(effects.textureOverlay ?? 'none') !== 'none'}>
        <SectionLabel>Material</SectionLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {TEXTURES.map(t => (
            <ToggleChip
              key={t.id}
              active={effects.textureOverlay === t.id}
              emoji={t.emoji}
              label={t.label}
              onClick={() => set('textureOverlay', t.id)}
            />
          ))}
        </div>
        <div style={{ marginTop: '8px', fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)' }}>
          Subtle material feel layered over the background
        </div>
      </EffectBlock>
    </div>
  );
}

// ── Collapsible effect block ───────────────────────────────────
function EffectBlock({
  title, emoji, active, children, onToggleExpand, expanded,
}: {
  title: string; emoji: string; active: boolean; children: React.ReactNode;
  onToggleExpand?: () => void; expanded?: boolean;
}) {
  const [open, setOpen] = useState(active);

  const isOpen = onToggleExpand ? expanded : open;
  const toggle = onToggleExpand ?? (() => setOpen(v => !v));

  return (
    <div style={{
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      <button
        onClick={toggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
          padding: '11px 0', background: 'none', border: 'none',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{ fontSize: '1rem' }}>{emoji}</span>
        <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 700, color: active ? 'rgba(214,198,168,0.95)' : 'rgba(255,255,255,0.65)' }}>
          {title}
        </span>
        {active && (
          <span style={{
            fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
            color: 'rgba(163,177,138,0.9)', background: 'rgba(163,177,138,0.12)',
            padding: '2px 7px', borderRadius: '100px', border: '1px solid rgba(163,177,138,0.25)',
          }}>
            ON
          </span>
        )}
        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
          ▾
        </span>
      </button>

      {isOpen && (
        <div style={{ paddingBottom: '14px' }}>
          {children}
        </div>
      )}
    </div>
  );
}
