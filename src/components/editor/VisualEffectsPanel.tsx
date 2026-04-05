'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/VisualEffectsPanel.tsx
// Editor UI for all visual atmosphere effects.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import type { ThemeSchema } from '@/types';
import {
  IconFilmGrain, IconVignette, IconColorTemp, IconMesh,
  IconCursor, IconDivider, IconReveal, IconTexture,
  IconCursorNone, IconCursorPearl, IconCursorHeart,
  IconCursorRing, IconCursorPetal, IconCursorStar,
  IconRevealNone, IconRevealFade, IconRevealSlideUp,
  IconRevealSlideLeft, IconRevealZoom, IconRevealBlur,
  IconTexturePaper, IconTextureLinen, IconTextureConcrete,
  IconTextureVelvet, IconTextureBokeh, IconChevronDown, IconChevronUp,
} from './EditorIcons';

// ── Types ──────────────────────────────────────────────────────
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
        <span style={{ fontSize: '0.8rem', color: 'var(--pl-ink)', fontWeight: 600 }}>{label}</span>
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
        style={{ width: '100%', accentColor: 'var(--pl-olive, #A3B18A)', cursor: 'pointer', height: '6px', WebkitAppearance: 'none', appearance: 'none' } as React.CSSProperties}
      />
      {hint && <div style={{ fontSize: '0.65rem', color: 'var(--pl-muted)', marginTop: '3px' }}>{hint}</div>}
    </div>
  );
}

function ToggleChip({
  active, label, icon, onClick, color,
}: {
  active: boolean; label: string; icon?: React.ReactNode; onClick: () => void; color?: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 10px', borderRadius: '8px', border: `1px solid ${active ? (color ?? 'rgba(163,177,138,0.6)') : 'rgba(0,0,0,0.06)'}`,
        background: active ? `${color ?? 'rgba(163,177,138,1)'}22` : 'rgba(163,177,138,0.05)',
        color: active ? (color ?? 'rgba(163,177,138,1)') : 'var(--pl-ink-soft)',
        cursor: 'pointer', fontSize: '0.75rem', fontWeight: active ? 700 : 500,
        display: 'flex', alignItems: 'center', gap: '5px',
        transition: 'all 0.15s',
      }}
    >
      {icon && <span style={{ display: 'flex', alignItems: 'center', opacity: active ? 1 : 0.6 }}>{icon}</span>}
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
              background: active ? 'rgba(163,177,138,0.12)' : 'rgba(163,177,138,0.05)',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <div style={{
              width: '36px', height: '24px', borderRadius: '6px', overflow: 'hidden',
              background: p.id === 'none'
                ? 'rgba(0,0,0,0.06)'
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
const CURSOR_SHAPES: Array<{ id: CursorShape; icon: React.ReactNode; label: string }> = [
  { id: 'none',  icon: <IconCursorNone size={13} />,  label: 'Default' },
  { id: 'pearl', icon: <IconCursorPearl size={13} />, label: 'Pearl' },
  { id: 'heart', icon: <IconCursorHeart size={13} />, label: 'Heart' },
  { id: 'ring',  icon: <IconCursorRing size={13} />,  label: 'Ring' },
  { id: 'petal', icon: <IconCursorPetal size={13} />, label: 'Petal' },
  { id: 'star',  icon: <IconCursorStar size={13} />,  label: 'Star' },
];

// ── Section divider style picker ───────────────────────────────
const DIVIDER_STYLES: Array<{ id: DividerStyle; label: string; preview: string }> = [
  { id: 'none',     label: 'None',     preview: '─────' },
  { id: 'wave',     label: 'Wave',     preview: '∿∿∿∿∿' },
  { id: 'wave2',    label: 'Wave 2',   preview: '∿∿∿∿∿' },
  { id: 'diagonal', label: 'Diagonal', preview: '╱╱╱╱╱' },
  { id: 'zigzag',   label: 'Zigzag',   preview: '/\\/\\/' },
  { id: 'torn',     label: 'Torn',     preview: 'ᵥᵥᵥᵥᵥ' },
  { id: 'chevron',  label: 'Chevron',  preview: '∧∧∧∧∧' },
  { id: 'arc',      label: 'Arc',      preview: '⌢⌢⌢⌢⌢' },
];

// ── Scroll reveal picker ───────────────────────────────────────
const REVEAL_ANIMS: Array<{ id: RevealAnim; label: string; icon: React.ReactNode }> = [
  { id: 'none',       label: 'None',     icon: <IconRevealNone size={13} /> },
  { id: 'fade',       label: 'Fade',     icon: <IconRevealFade size={13} /> },
  { id: 'slide-up',   label: 'Slide Up', icon: <IconRevealSlideUp size={13} /> },
  { id: 'slide-left', label: 'Slide In', icon: <IconRevealSlideLeft size={13} /> },
  { id: 'zoom',       label: 'Zoom',     icon: <IconRevealZoom size={13} /> },
  { id: 'blur-in',    label: 'Blur In',  icon: <IconRevealBlur size={13} /> },
];

// ── Texture overlay picker ─────────────────────────────────────
const TEXTURES: Array<{ id: TextureType; label: string; icon: React.ReactNode }> = [
  { id: 'none',     label: 'None',     icon: <IconRevealNone size={13} /> },
  { id: 'paper',    label: 'Paper',    icon: <IconTexturePaper size={13} /> },
  { id: 'linen',    label: 'Linen',    icon: <IconTextureLinen size={13} /> },
  { id: 'concrete', label: 'Concrete', icon: <IconTextureConcrete size={13} /> },
  { id: 'velvet',   label: 'Velvet',   icon: <IconTextureVelvet size={13} /> },
  { id: 'bokeh',    label: 'Bokeh',    icon: <IconTextureBokeh size={13} /> },
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
      <EffectBlock title="Film Grain" icon={<IconFilmGrain />} active={(effects.grain ?? 0) > 0}>
        <SliderRow
          label="Intensity"
          value={effects.grain ?? 0}
          min={0} max={100} unit="%"
          onChange={v => set('grain', v)}
          hint="Subtle film texture over the whole page"
        />
      </EffectBlock>

      {/* ── Vignette ── */}
      <EffectBlock title="Vignette" icon={<IconVignette />} active={(effects.vignette ?? 0) > 0}>
        <SliderRow
          label="Darkness"
          value={effects.vignette ?? 0}
          min={0} max={100} unit="%"
          onChange={v => set('vignette', v)}
          hint="Darkens page edges for a cinematic feel"
        />
      </EffectBlock>

      {/* ── Color Temperature ── */}
      <EffectBlock title="Color Temperature" icon={<IconColorTemp />} active={(effects.colorTemp ?? 0) !== 0}>
        <SliderRow
          label="Warm / Cool"
          value={effects.colorTemp ?? 0}
          min={-50} max={50} unit="temp"
          onChange={v => set('colorTemp', v)}
          hint="− cool blue  ·  0 neutral  ·  + warm amber"
        />
      </EffectBlock>

      {/* ── Gradient Mesh ── */}
      <EffectBlock
        title="Gradient Mesh"
        icon={<IconMesh />}
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
      <EffectBlock title="Custom Cursor" icon={<IconCursor />} active={(effects.customCursor ?? 'none') !== 'none'}>
        <SectionLabel>Shape</SectionLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {CURSOR_SHAPES.map(c => (
            <ToggleChip
              key={c.id}
              active={effects.customCursor === c.id}
              icon={c.icon}
              label={c.label}
              onClick={() => set('customCursor', c.id)}
            />
          ))}
        </div>
        {(effects.customCursor ?? 'none') !== 'none' && (
          <div style={{ marginTop: '10px' }}>
            <SectionLabel>Color</SectionLabel>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ position: 'relative', width: '28px', height: '28px', borderRadius: '50%', border: '2px solid rgba(0,0,0,0.08)', cursor: 'pointer', overflow: 'hidden', background: effects.cursorColor || accentColor || '#A3B18A' }}>
                <input type="color" value={effects.cursorColor || accentColor || '#A3B18A'} onChange={e => set('cursorColor', e.target.value)} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
              </label>
              <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace' }}>{effects.cursorColor || accentColor || '#A3B18A'}</span>
              {effects.cursorColor && (
                <button onClick={() => set('cursorColor', undefined)} style={{ background: 'none', border: 'none', color: 'var(--pl-muted)', cursor: 'pointer', fontSize: '0.65rem', textDecoration: 'underline' }}>Reset</button>
              )}
            </div>
          </div>
        )}
        <div style={{ marginTop: '8px', fontSize: '0.65rem', color: 'var(--pl-muted)' }}>
          Only visible on desktop (mouse) devices
        </div>
      </EffectBlock>

      {/* ── Section Dividers ── */}
      <EffectBlock
        title="Section Dividers"
        icon={<IconDivider />}
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
                border: `1px solid ${divider.style === d.id ? 'rgba(163,177,138,0.6)' : 'rgba(0,0,0,0.06)'}`,
                background: divider.style === d.id ? 'rgba(163,177,138,0.12)' : 'rgba(163,177,138,0.05)',
                color: divider.style === d.id ? 'rgba(163,177,138,1)' : 'var(--pl-ink-soft)',
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
                onClick={() => set('sectionDivider', { ...divider, flip: !divider.flip })}
              />
            </div>
          </div>
        )}
      </EffectBlock>

      {/* ── Scroll Reveal ── */}
      <EffectBlock title="Scroll Reveal" icon={<IconReveal />} active={(effects.scrollReveal ?? 'none') !== 'none'}>
        <SectionLabel>Animation style</SectionLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {REVEAL_ANIMS.map(a => (
            <ToggleChip
              key={a.id}
              active={effects.scrollReveal === a.id}
              icon={a.icon}
              label={a.label}
              onClick={() => set('scrollReveal', a.id)}
            />
          ))}
        </div>
        <div style={{ marginTop: '8px', fontSize: '0.65rem', color: 'var(--pl-muted)' }}>
          Content sections animate in as visitors scroll down
        </div>
      </EffectBlock>

      {/* ── Texture Overlay ── */}
      <EffectBlock title="Surface Texture" icon={<IconTexture />} active={(effects.textureOverlay ?? 'none') !== 'none'}>
        <SectionLabel>Material</SectionLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {TEXTURES.map(t => (
            <ToggleChip
              key={t.id}
              active={effects.textureOverlay === t.id}
              icon={t.icon}
              label={t.label}
              onClick={() => set('textureOverlay', t.id)}
            />
          ))}
        </div>
        <div style={{ marginTop: '8px', fontSize: '0.65rem', color: 'var(--pl-muted)' }}>
          Subtle material feel layered over the background
        </div>
      </EffectBlock>
    </div>
  );
}

// ── Collapsible effect block ───────────────────────────────────
function EffectBlock({
  title, icon, active, children, onToggleExpand, expanded,
}: {
  title: string; icon: React.ReactNode; active: boolean; children: React.ReactNode;
  onToggleExpand?: () => void; expanded?: boolean;
}) {
  const [open, setOpen] = useState(active);

  const isOpen = onToggleExpand ? expanded : open;
  const toggle = onToggleExpand ?? (() => setOpen(v => !v));

  return (
    <div style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
      <button
        onClick={toggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
          padding: '11px 0', background: 'none', border: 'none',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{
          display: 'flex', alignItems: 'center',
          color: active ? 'rgba(214,198,168,0.9)' : 'var(--pl-ink-soft)',
        }}>
          {icon}
        </span>
        <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 700, color: active ? 'rgba(214,198,168,0.95)' : 'var(--pl-ink-soft)' }}>
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
        <span style={{ display: 'flex', alignItems: 'center', color: 'var(--pl-muted)', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          <IconChevronDown size={14} />
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
