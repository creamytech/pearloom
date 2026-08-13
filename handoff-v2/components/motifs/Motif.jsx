import React from 'react';

/**
 * Motif — the Pearloom line-ornament set. Single-stroke editorial
 * glyphs (1.75px round caps, fill:none) that scatter through a site:
 * section openers, list bullets, empty-state centerpieces, sticker
 * decor. One consistent hand across every occasion.
 *
 * Names: sprig · laurel · bloom · rings · dove · candle · star ·
 * sun · wave · cake · vine · cresset · arch · feather.
 */
const P = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' };

export function Motif({ name = 'sprig', size = 48, color = 'var(--pl-olive)', accent = 'var(--pl-gold)', weight = 1.75, className, style }) {
  const common = { ...P, stroke: color, strokeWidth: weight };
  const paths = {
    sprig: (
      <g {...common}>
        <path d="M24 44 C 24 30, 24 16, 24 6" />
        {[0.25, 0.45, 0.65].map((t, i) => (
          <g key={i}>
            <path d={`M24 ${44 - t * 36} q -11 -3 -15 -12`} />
            <path d={`M24 ${44 - t * 36} q 11 -3 15 -12`} />
          </g>
        ))}
        <circle cx="24" cy="6" r="2.4" fill={accent} stroke="none" />
      </g>
    ),
    laurel: (
      <g {...common}>
        {[-1, 1].map((d) => (
          <g key={d}>
            <path d={`M24 42 C ${24 + d * 14} 34, ${24 + d * 17} 18, 24 6`} />
            {[0.2, 0.38, 0.56, 0.74].map((t, i) => {
              const x = 24 + d * (5 + Math.sin(t * 3) * 11), y = 42 - t * 34;
              return <path key={i} d={`M${x} ${y} q ${d * 8} -2 ${d * 3} -8`} />;
            })}
          </g>
        ))}
      </g>
    ),
    bloom: (
      <g {...common}>
        {[0, 60, 120, 180, 240, 300].map((a) => (
          <ellipse key={a} cx="24" cy="14" rx="5" ry="10" transform={`rotate(${a} 24 24)`} />
        ))}
        <circle cx="24" cy="24" r="4" fill={accent} stroke="none" />
      </g>
    ),
    rings: (
      <g {...common}>
        <circle cx="18" cy="26" r="13" />
        <circle cx="31" cy="26" r="13" />
        <path d="M24 11 l3 -5 l3 5" fill={accent} stroke={accent} />
      </g>
    ),
    dove: (
      <g {...common}>
        <path d="M8 30 C 18 30, 22 22, 24 14 C 28 24, 36 28, 42 26 C 36 32, 28 36, 20 34 C 16 38, 10 38, 6 36 C 8 34, 8 32, 8 30 Z" />
        <path d="M24 14 C 26 12, 30 10, 34 11" />
        <circle cx="11" cy="31" r="1.4" fill={color} stroke="none" />
      </g>
    ),
    candle: (
      <g {...common}>
        <rect x="18" y="20" width="12" height="22" rx="2" />
        <path d="M24 20 L24 14" />
        <path d="M24 14 C 20 11, 21 5, 24 2 C 27 5, 28 11, 24 14 Z" fill={accent} stroke={accent} />
      </g>
    ),
    star: (
      <g {...common}>
        <path d="M24 6 L24 42 M6 24 L42 24" />
        <path d="M12 12 L36 36 M36 12 L12 36" strokeWidth={weight * 0.7} opacity="0.7" />
        <circle cx="24" cy="24" r="3" fill={accent} stroke="none" />
      </g>
    ),
    sun: (
      <g {...common}>
        <circle cx="24" cy="24" r="9" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
          <path key={a} d="M24 11 L24 5" transform={`rotate(${a} 24 24)`} />
        ))}
      </g>
    ),
    wave: (
      <g {...common}>
        <path d="M4 20 q 6 -8 12 0 t 12 0 t 12 0" />
        <path d="M4 30 q 6 -8 12 0 t 12 0 t 12 0" opacity="0.8" />
        <path d="M8 38 q 8 6 16 0 t 16 0" stroke={accent} opacity="0.9" />
      </g>
    ),
    cake: (
      <g {...common}>
        <path d="M10 42 L10 28 L38 28 L38 42 Z" />
        <path d="M10 34 q 7 5 14 0 t 14 0" />
        <path d="M10 28 L10 22 L38 22 L38 28" />
        <path d="M24 22 L24 16" />
        <circle cx="24" cy="14" r="2.4" fill={accent} stroke={accent} />
      </g>
    ),
    vine: (
      <g {...common}>
        <path d="M6 38 C 16 34, 14 18, 24 14 C 34 10, 32 28, 42 24" />
        {[[16, 28], [24, 14], [33, 19]].map((p, i) => (
          <path key={i} d={`M${p[0]} ${p[1]} q -5 -4 -2 -9`} />
        ))}
        <circle cx="42" cy="24" r="2.2" fill={accent} stroke="none" />
      </g>
    ),
    cresset: (
      <g {...common}>
        <path d="M16 42 L32 42 M24 42 L24 30" />
        <path d="M14 30 L34 30 L30 22 L18 22 Z" />
        <path d="M24 22 C 19 17, 21 9, 24 5 C 27 9, 29 17, 24 22 Z" fill={accent} stroke={accent} />
      </g>
    ),
    arch: (
      <g {...common}>
        <path d="M10 42 L10 22 Q 10 8 24 8 Q 38 8 38 22 L38 42" />
        <path d="M16 42 L16 26 Q 16 16 24 16 Q 32 16 32 26 L32 42" strokeWidth={weight * 0.7} opacity="0.6" />
        <circle cx="24" cy="8" r="2.2" fill={accent} stroke="none" />
      </g>
    ),
    feather: (
      <g {...common}>
        <path d="M14 42 C 14 28, 22 12, 36 6 C 34 22, 28 36, 14 42 Z" />
        <path d="M14 42 C 18 32, 26 18, 34 9" />
        {[0.3, 0.5, 0.7].map((t, i) => (
          <path key={i} d={`M${14 + t * 16} ${42 - t * 30} l 7 -2`} strokeWidth={weight * 0.7} />
        ))}
      </g>
    ),
  };
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={className} style={style} role="img" aria-label={`${name} motif`}>
      {paths[name] || paths.sprig}
    </svg>
  );
}

/** The catalogue of available motif names, for pickers. */
export const MOTIF_NAMES = ['sprig', 'laurel', 'bloom', 'rings', 'dove', 'candle', 'star', 'sun', 'wave', 'cake', 'vine', 'cresset', 'arch', 'feather'];
