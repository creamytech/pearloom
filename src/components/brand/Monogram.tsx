import { useId, type CSSProperties } from 'react';

// ─────────────────────────────────────────────────────────────
// Pearloom / brand/Monogram.tsx
//
// Monogram — the couple / host monogram system. Two (or one)
// initials set in Fraunces, with a choice of editorial frames.
// The wedding keystone: a save-the-date, a wax-seal favicon, a
// footer sign-off, the wizard's live preview, and a selectable
// frame in the editor's theme settings.
//
// Frames: plain · ring · crest · wreath · diamond · interlock.
// Strokes follow the brand's 1.75px round-cap language; the bead
// at the join is the Pearloom pearl.
// ─────────────────────────────────────────────────────────────

export type MonogramFrame =
  | 'plain' | 'ring' | 'crest' | 'wreath' | 'diamond' | 'interlock';

export interface MonogramProps {
  left?: string;
  right?: string;
  single?: boolean;
  frame?: MonogramFrame | string;
  size?: number;
  ink?: string;
  accent?: string;
  paper?: string;
  showAmp?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function Monogram({
  left = 'M',
  right = 'J',
  single = false,
  frame = 'ring',
  size = 120,
  ink = 'var(--pl-ink)',
  accent = 'var(--pl-gold)',
  paper = 'var(--pl-cream)',
  showAmp = true,
  className,
  style,
}: MonogramProps) {
  const rawId = useId();
  void rawId; // reserved for future gradient/clip refs; keeps ids stable
  const S = 100; // viewBox unit
  const stroke = 2.2;

  // The lettering: one or two initials in Fraunces, with an optional
  // hairline ampersand between. Rendered as SVG text so it inherits
  // the real webfont and themes with `ink`.
  const letters = single ? (
    <text
      x={S / 2}
      y={S / 2 + 1}
      textAnchor="middle"
      dominantBaseline="central"
      fontFamily="var(--pl-font-display)"
      fontStyle="italic"
      fontWeight="500"
      fontSize={frame === 'plain' ? 62 : 46}
      fill={ink}
      style={{ fontVariationSettings: '"opsz" 144, "SOFT" 60, "WONK" 0' }}
    >
      {left}
    </text>
  ) : (
    <g>
      <text
        x={frame === 'interlock' ? S / 2 - 13 : S / 2 - 16}
        y={S / 2 + 1}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="var(--pl-font-display)"
        fontWeight="500"
        fontSize={frame === 'plain' ? 56 : 42}
        fill={ink}
        style={{ fontVariationSettings: '"opsz" 144, "SOFT" 50' }}
      >
        {left}
      </text>
      {showAmp && !single ? (
        <text
          x={S / 2}
          y={S / 2 + 1}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="var(--pl-font-display)"
          fontStyle="italic"
          fontWeight="400"
          fontSize={frame === 'plain' ? 30 : 22}
          fill={accent}
          style={{ fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1' }}
        >
          &amp;
        </text>
      ) : null}
      <text
        x={frame === 'interlock' ? S / 2 + 13 : S / 2 + 16}
        y={S / 2 + 1}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="var(--pl-font-display)"
        fontStyle="italic"
        fontWeight="500"
        fontSize={frame === 'plain' ? 56 : 42}
        fill={ink}
        style={{ fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1' }}
      >
        {right}
      </text>
    </g>
  );

  // The bead at each frame's join is the Pearloom pearl — inlined as
  // <circle> (not a nested component) to satisfy the React Compiler's
  // static-components rule.
  const pearl = (cx: number, cy: number, key?: string) => (
    <circle key={key} cx={cx} cy={cy} r={3} fill={accent} stroke={paper} strokeWidth="1.4" />
  );

  const frames: Record<string, React.ReactNode> = {
    plain: null,
    ring: (
      <g fill="none" stroke={accent} strokeWidth={stroke}>
        <circle cx={S / 2} cy={S / 2} r={44} />
        {pearl(S / 2, 6)}
      </g>
    ),
    diamond: (
      <g fill="none" stroke={accent} strokeWidth={stroke}>
        <rect x={S / 2 - 33} y={S / 2 - 33} width={66} height={66} transform={`rotate(45 ${S / 2} ${S / 2})`} rx={4} />
        {pearl(S / 2, 2, 'n')}{pearl(S / 2, 98, 's')}{pearl(2, S / 2, 'w')}{pearl(98, S / 2, 'e')}
      </g>
    ),
    crest: (
      <g fill="none" stroke={accent} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
        <path d={`M ${S / 2 - 38} 20 L ${S / 2 + 38} 20 L ${S / 2 + 38} 58 Q ${S / 2 + 38} 84 ${S / 2} 96 Q ${S / 2 - 38} 84 ${S / 2 - 38} 58 Z`} />
        <path d={`M ${S / 2 - 30} 30 L ${S / 2 + 30} 30`} strokeWidth={1.2} />
        {pearl(S / 2, 20)}
      </g>
    ),
    wreath: (
      <g fill="none" stroke={accent} strokeWidth={1.8} strokeLinecap="round">
        {[-1, 1].map((dir) => (
          <g key={dir}>
            <path d={`M ${S / 2 + dir * 4} 92 Q ${S / 2 + dir * 40} 70 ${S / 2 + dir * 30} 14`} />
            {[0.15, 0.3, 0.45, 0.6, 0.75].map((t, i) => {
              const ang = -1.4 + t * 1.2;
              const cx = S / 2 + dir * (8 + t * 30);
              const cy = 92 - t * 76;
              return <path key={i} d={`M ${cx} ${cy} q ${dir * 9 * Math.cos(ang)} ${-9 * Math.sin(ang) - 3} ${dir * 4} ${-11}`} strokeWidth={1.5} />;
            })}
          </g>
        ))}
        {pearl(S / 2, 92)}
      </g>
    ),
    interlock: (
      <g fill="none" stroke={accent} strokeWidth={stroke}>
        <circle cx={S / 2 - 12} cy={S / 2} r={30} opacity="0.85" />
        <circle cx={S / 2 + 12} cy={S / 2} r={30} opacity="0.85" />
        {pearl(S / 2, S / 2 - 30, 'top')}{pearl(S / 2, S / 2 + 30, 'bot')}
      </g>
    ),
  };

  return (
    <svg
      viewBox={`0 0 ${S} ${S}`}
      width={size}
      height={size}
      className={className}
      style={style}
      role="img"
      aria-label={single ? `Monogram ${left}` : `Monogram ${left} and ${right}`}
    >
      {frames[frame]}
      {letters}
    </svg>
  );
}

/** The catalogue of monogram frames, for pickers. */
export const MONOGRAM_FRAMES: MonogramFrame[] = [
  'plain', 'ring', 'crest', 'wreath', 'diamond', 'interlock',
];
