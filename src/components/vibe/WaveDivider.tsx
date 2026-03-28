'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/vibe/WaveDivider.tsx
// Organic SVG wave section dividers derived from vibe skin.
// Use between sections on the published site.
// ─────────────────────────────────────────────────────────────

import type { VibeSkin } from '@/lib/vibe-engine';

interface WaveDividerProps {
  fromColor: string;   // background color of the section above
  toColor: string;     // background color of the section below
  skin?: VibeSkin;
  height?: number;     // default 60, was 80
  flip?: boolean;
  opacity?: number;    // default 0.65
}

export function WaveDivider({
  fromColor,
  toColor,
  skin,
  height = 60,
  flip = false,
  opacity = 0.65,
}: WaveDividerProps) {
  // Use vibe skin wave path if available, otherwise fall back to a gentle default
  const basePath = skin
    ? (flip ? skin.wavePathInverted : skin.wavePath)
    : 'M0,40 C180,80 320,10 500,40 C680,70 820,10 1000,40 L1000,150 L0,150 Z';

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: `${height}px`,
      overflow: 'hidden',
      background: fromColor,
      marginTop: `-${Math.floor(height * 0.5)}px`,
      zIndex: 5,
      opacity,
    }}>
      <svg
        viewBox={`0 0 1000 ${height + 10}`}
        preserveAspectRatio="none"
        style={{ position: 'absolute', bottom: 0, width: '100%', height: '100%' }}
        aria-hidden="true"
      >
        <path d={basePath} fill={toColor} />
      </svg>
    </div>
  );
}

// ── Decorative section header with vibe icons ─────────────────
interface VibeSectionHeaderProps {
  skin: VibeSkin;
  label?: string;
  title: string;
  subtitle?: string;
  accentColor?: string;
}

export function VibeSectionHeader({
  skin,
  label,
  title,
  subtitle,
  accentColor = 'var(--eg-accent)',
}: VibeSectionHeaderProps) {
  const icon = skin.decorIcons[0] || '✦';
  const icon2 = skin.decorIcons[1] || '✦';

  return (
    <div style={{ textAlign: 'center', marginBottom: '4.5rem' }}>
      {/* Decorative row */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: '1.25rem', marginBottom: '2rem',
      }}>
        <span style={{ fontSize: '1rem', opacity: 0.35, color: accentColor }}>{icon2}</span>
        <div style={{ width: '60px', height: '1px', background: accentColor, opacity: 0.2 }} />
        <span style={{ fontSize: '1.25rem', color: accentColor }}>{icon}</span>
        <div style={{ width: '60px', height: '1px', background: accentColor, opacity: 0.2 }} />
        <span style={{ fontSize: '1rem', opacity: 0.35, color: accentColor }}>{icon2}</span>
      </div>

      {label && (
        <div style={{
          fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.22em',
          textTransform: 'uppercase', color: accentColor,
          marginBottom: '0.75rem', opacity: 0.8,
        }}>
          {label}
        </div>
      )}

      <h2 style={{
        fontFamily: 'var(--eg-font-heading)',
        fontSize: 'clamp(2.5rem, 5vw, 4rem)',
        fontWeight: 400, letterSpacing: '-0.025em',
        color: 'var(--eg-fg)', marginBottom: subtitle ? '1.25rem' : 0,
        lineHeight: 1.15,
      }}>
        {title}
      </h2>

      {subtitle && (
        <p style={{
          color: 'var(--eg-muted)', fontSize: '1.05rem',
          fontStyle: 'italic', maxWidth: '560px', margin: '0 auto',
          lineHeight: 1.65,
        }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

// ── Decorative floating accent shape ─────────────────────────
interface VibeAccentProps {
  skin: VibeSkin;
  color?: string;
  size?: number;
  style?: React.CSSProperties;
}

export function VibeAccent({ skin, color = 'var(--eg-accent)', size = 120, style }: VibeAccentProps) {
  const { accentShape } = skin;

  if (accentShape === 'ring') {
    return (
      <svg width={size} height={size} viewBox="0 0 120 120" style={{ opacity: 0.12, ...style }}>
        <circle cx="60" cy="60" r="50" fill="none" stroke={color} strokeWidth="2" />
        <circle cx="60" cy="60" r="38" fill="none" stroke={color} strokeWidth="1" strokeDasharray="4 4" />
      </svg>
    );
  }
  if (accentShape === 'arch') {
    return (
      <svg width={size} height={size * 0.6} viewBox="0 0 120 72" style={{ opacity: 0.12, ...style }}>
        <path d="M10,72 Q10,10 60,10 Q110,10 110,72" fill="none" stroke={color} strokeWidth="2" />
      </svg>
    );
  }
  if (accentShape === 'leaf') {
    return (
      <svg width={size * 0.7} height={size} viewBox="0 0 84 120" style={{ opacity: 0.12, ...style }}>
        <path d="M42,5 Q75,40 50,80 Q42,100 42,115 Q42,100 34,80 Q9,40 42,5Z" fill="none" stroke={color} strokeWidth="2" />
      </svg>
    );
  }
  if (accentShape === 'diamond') {
    return (
      <svg width={size * 0.7} height={size * 0.7} viewBox="0 0 84 84" style={{ opacity: 0.12, ...style }}>
        <polygon points="42,4 80,42 42,80 4,42" fill="none" stroke={color} strokeWidth="2" />
        <polygon points="42,14 70,42 42,70 14,42" fill="none" stroke={color} strokeWidth="1" strokeDasharray="3 3" />
      </svg>
    );
  }
  if (accentShape === 'infinity') {
    return (
      <svg width={size * 1.5} height={size * 0.7} viewBox="0 0 180 84" style={{ opacity: 0.12, ...style }}>
        <path d="M60,42 C60,20 80,8 100,8 C120,8 140,20 140,42 C140,64 120,76 100,76 C80,76 60,64 60,42 C60,20 40,8 20,8 C0,8 -20,20 -20,42 C-20,64 0,76 20,76 C40,76 60,64 60,42 Z"
          fill="none" stroke={color} strokeWidth="2" transform="translate(20,0)" />
      </svg>
    );
  }
  return null;
}
