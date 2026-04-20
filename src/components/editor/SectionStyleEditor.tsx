'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/editor/SectionStyleEditor.tsx
// Per-section style overrides panel
// ─────────────────────────────────────────────────────────────

import type { VibeSkin } from '@/lib/vibe-engine';
import { ColorPicker } from '@/components/ui/color-picker';

export interface SectionStyleOverrides {
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  padding?: 'compact' | 'normal' | 'spacious';
  dividerBefore?: boolean;
  dividerAfter?: boolean;
  fullWidth?: boolean;
}

export interface SectionStyleEditorProps {
  sectionId: string;
  sectionType: 'chapter' | 'event' | 'registry' | 'guestbook' | 'rsvp' | 'travel';
  currentOverrides?: SectionStyleOverrides;
  vibeSkin: VibeSkin;
  onChange: (overrides: SectionStyleOverrides) => void;
}

const lbl: React.CSSProperties = {
  display: 'block', fontSize: '0.6rem', fontWeight: 600,
  letterSpacing: '0.04em', textTransform: 'uppercase',
  color: '#A1A1AA', marginBottom: '4px',
};

const PADDING_OPTS: Array<{ value: SectionStyleOverrides['padding']; label: string }> = [
  { value: 'compact', label: 'Compact' },
  { value: 'normal', label: 'Normal' },
  { value: 'spacious', label: 'Spacious' },
];

export function SectionStyleEditor({
  currentOverrides = {},
  vibeSkin,
  onChange,
}: SectionStyleEditorProps) {
  const upd = (patch: Partial<SectionStyleOverrides>) => onChange({ ...currentOverrides, ...patch });

  // 5 preset swatches from the current theme
  const swatches: string[] = [
    vibeSkin.palette.background,
    vibeSkin.palette.card,
    vibeSkin.palette.subtle,
    vibeSkin.palette.accent2,
    vibeSkin.palette.ink,
  ];

  const currentBg = currentOverrides.backgroundColor ?? vibeSkin.palette.background;
  const currentText = currentOverrides.textColor ?? (vibeSkin.palette.foreground);
  const isDark = currentText === vibeSkin.palette.ink || currentText === '#000000' || currentText === '#0A0A0A';
  const padding = currentOverrides.padding ?? 'normal';

  return (
    <div style={{
      border: '1px solid #E4E4E7',
      display: 'flex', flexDirection: 'column', gap: '12px',
    }}>
      {/* Background Color */}
      <div>
        <label style={lbl}>Background</label>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          {swatches.map((color) => (
            <button
              key={color}
              onClick={() => upd({ backgroundColor: color })}
              title={color}
              style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: color,
                border: currentBg === color
                  ? '2px solid #18181B'
                  : '1px solid rgba(0,0,0,0.08)',
                cursor: 'pointer', flexShrink: 0,
                boxShadow: currentBg === color ? '0 0 0 2px #E4E4E7' : 'none',
                transition: 'all var(--pl-dur-instant)',
              }}
            />
          ))}
          {/* Custom color picker */}
          <ColorPicker
            value={currentBg}
            onChange={(color) => upd({ backgroundColor: color })}
          />
        </div>
      </div>

      {/* Text color toggle */}
      <div>
        <label style={lbl}>Text Color</label>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => upd({ textColor: vibeSkin.palette.ink })}
            style={{
              flex: 1, padding: '6px 10px', borderRadius: '6px', border: 'none',
              cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700,
              background: isDark ? '#71717A' : 'rgba(0,0,0,0.05)',
              color: isDark ? '#fff' : '#3F3F46',
              transition: 'all var(--pl-dur-instant)',
              minHeight: '36px',
            }}
          >
            Dark
          </button>
          <button
            onClick={() => upd({ textColor: vibeSkin.palette.card })}
            style={{
              flex: 1, padding: '6px 10px', borderRadius: '6px', border: 'none',
              cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700,
              background: !isDark ? '#71717A' : 'rgba(0,0,0,0.05)',
              color: !isDark ? '#fff' : '#3F3F46',
              transition: 'all var(--pl-dur-instant)',
              minHeight: '36px',
            }}
          >
            Light
          </button>
        </div>
      </div>

      {/* Padding pills */}
      <div>
        <label style={lbl}>Padding</label>
        <div style={{ display: 'flex', gap: '4px' }}>
          {PADDING_OPTS.map(opt => (
            <button
              key={opt.value}
              onClick={() => upd({ padding: opt.value })}
              style={{
                flex: 1, padding: '7px 6px', borderRadius: '6px', border: 'none',
                cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700,
                background: padding === opt.value ? '#71717A' : 'rgba(0,0,0,0.05)',
                color: padding === opt.value ? '#fff' : '#3F3F46',
                transition: 'all var(--pl-dur-instant)',
                minHeight: '36px',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Toggles row */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Full bleed */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '36px' }}>
          <span style={{ fontSize: '0.8rem', color: '#18181B', fontWeight: 600 }}>Full bleed</span>
          <button
            onClick={() => upd({ fullWidth: !currentOverrides.fullWidth })}
            style={{
              width: '36px', height: '20px', borderRadius: '8px', flexShrink: 0,
              background: currentOverrides.fullWidth ? '#18181B' : 'rgba(0,0,0,0.07)',
              border: 'none', cursor: 'pointer', position: 'relative', transition: 'background var(--pl-dur-fast)',
            }}
          >
            <span style={{
              position: 'absolute', top: '2px',
              left: currentOverrides.fullWidth ? '18px' : '2px',
              width: '16px', height: '16px', borderRadius: '50%', background: '#fff',
              transition: 'left var(--pl-dur-fast)', display: 'block',
            }} />
          </button>
        </div>
        {/* Divider before */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '36px' }}>
          <span style={{ fontSize: '0.8rem', color: '#18181B', fontWeight: 600 }}>Divider before</span>
          <button
            onClick={() => upd({ dividerBefore: !currentOverrides.dividerBefore })}
            style={{
              width: '36px', height: '20px', borderRadius: '8px', flexShrink: 0,
              background: currentOverrides.dividerBefore ? '#18181B' : 'rgba(0,0,0,0.07)',
              border: 'none', cursor: 'pointer', position: 'relative', transition: 'background var(--pl-dur-fast)',
            }}
          >
            <span style={{
              position: 'absolute', top: '2px',
              left: currentOverrides.dividerBefore ? '18px' : '2px',
              width: '16px', height: '16px', borderRadius: '50%', background: '#fff',
              transition: 'left var(--pl-dur-fast)', display: 'block',
            }} />
          </button>
        </div>
        {/* Divider after */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '36px' }}>
          <span style={{ fontSize: '0.8rem', color: '#18181B', fontWeight: 600 }}>Divider after</span>
          <button
            onClick={() => upd({ dividerAfter: !currentOverrides.dividerAfter })}
            style={{
              width: '36px', height: '20px', borderRadius: '8px', flexShrink: 0,
              background: currentOverrides.dividerAfter ? '#18181B' : 'rgba(0,0,0,0.07)',
              border: 'none', cursor: 'pointer', position: 'relative', transition: 'background var(--pl-dur-fast)',
            }}
          >
            <span style={{
              position: 'absolute', top: '2px',
              left: currentOverrides.dividerAfter ? '18px' : '2px',
              width: '16px', height: '16px', borderRadius: '50%', background: '#fff',
              transition: 'left var(--pl-dur-fast)', display: 'block',
            }} />
          </button>
        </div>
      </div>
    </div>
  );
}
