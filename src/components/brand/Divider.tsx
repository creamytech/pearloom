import type { CSSProperties } from 'react';

// ─────────────────────────────────────────────────────────────
// Pearloom / brand/Divider.tsx
//
// Divider — ornamental section breaks beyond the woven Thread. A
// centered fleuron flanked by hairlines, in the brand's line hand.
// Use between site sections, above a date, under a chapter title,
// and as a selectable ornament in the editor's theme settings.
//
// Ornaments: fleuron · pearl · diamond · sprig · infinity · sun · cross.
// (`cross` is a soft botanical cross for memorial sites.)
// ─────────────────────────────────────────────────────────────

export type DividerOrnament =
  | 'fleuron' | 'pearl' | 'diamond' | 'sprig' | 'infinity' | 'sun' | 'cross';

export interface DividerProps {
  ornament?: DividerOrnament | string;
  width?: string | number;
  color?: string;
  accent?: string;
  ink?: string;
  weight?: number;
  className?: string;
  style?: CSSProperties;
}

export function Divider({
  ornament = 'fleuron',
  width = '100%',
  color = 'var(--pl-divider)',
  accent = 'var(--pl-gold)',
  ink = 'var(--pl-olive)',
  weight = 1,
  className,
  style,
}: DividerProps) {
  const P = { fill: 'none', stroke: ink, strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  const ornaments: Record<string, React.ReactNode> = {
    fleuron: (
      <g>
        <path d="M16 10 C 8 10, 4 16, 10 18 C 4 20, 8 26, 16 26 C 12 20, 12 16, 16 10 Z" {...P} transform="translate(-2 -8)" />
        <path d="M16 10 C 24 10, 28 16, 22 18 C 28 20, 24 26, 16 26 C 20 20, 20 16, 16 10 Z" {...P} transform="translate(2 -8)" />
        <circle cx="16" cy="10" r="2.6" fill={accent} />
      </g>
    ),
    pearl: (
      <g>
        <circle cx="16" cy="10" r="4" fill="none" stroke={ink} strokeWidth="1.5" />
        <circle cx="16" cy="10" r="2" fill={accent} />
      </g>
    ),
    diamond: (
      <g {...P}>
        <rect x="10" y="4" width="12" height="12" transform="rotate(45 16 10)" />
        <circle cx="16" cy="10" r="2" fill={accent} stroke="none" />
      </g>
    ),
    sprig: (
      <g {...P}>
        <path d="M16 2 L16 18" />
        <path d="M16 7 q -7 -1 -10 -6 M16 7 q 7 -1 10 -6" />
        <path d="M16 13 q -6 -1 -9 -5 M16 13 q 6 -1 9 -5" />
        <circle cx="16" cy="2" r="2" fill={accent} stroke="none" />
      </g>
    ),
    infinity: (
      <g {...P}>
        <path d="M16 10 C 13 4, 4 4, 4 10 C 4 16, 13 16, 16 10 C 19 4, 28 4, 28 10 C 28 16, 19 16, 16 10 Z" />
      </g>
    ),
    sun: (
      <g {...P}>
        <circle cx="16" cy="10" r="5" />
        {[0, 60, 120, 180, 240, 300].map((a) => <path key={a} d="M16 3 L16 0.5" transform={`rotate(${a} 16 10)`} />)}
        <circle cx="16" cy="10" r="2" fill={accent} stroke="none" />
      </g>
    ),
    cross: (
      <g {...P}>
        <path d="M16 1 L16 19 M9 10 L23 10" />
        <path d="M16 6 q -4 -1 -6 -4 M16 6 q 4 -1 6 -4" strokeWidth="1.1" />
        <circle cx="16" cy="10" r="1.8" fill={accent} stroke="none" />
      </g>
    ),
  };
  return (
    <div className={className} style={{ display: 'flex', alignItems: 'center', gap: 16, width, color, ...style }} aria-hidden="true">
      <span style={{ flex: 1, height: weight, background: `linear-gradient(90deg, transparent, ${color})` }} />
      <svg viewBox="0 0 32 20" width="38" height="24" style={{ flex: '0 0 auto', overflow: 'visible' }}>{ornaments[ornament] || ornaments.fleuron}</svg>
      <span style={{ flex: 1, height: weight, background: `linear-gradient(90deg, ${color}, transparent)` }} />
    </div>
  );
}

/** The catalogue of divider ornaments, for pickers. */
export const DIVIDER_ORNAMENTS: DividerOrnament[] = [
  'fleuron', 'pearl', 'diamond', 'sprig', 'infinity', 'sun', 'cross',
];
