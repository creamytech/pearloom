import React, { useId } from 'react';

const SIZES = {
  xs: { w: 14, stroke: 1.4, gap: 6 },
  sm: { w: 22, stroke: 1.6, gap: 8 },
  md: { w: 36, stroke: 1.8, gap: 12 },
  lg: { w: 56, stroke: 2.2, gap: 16 },
  xl: { w: 80, stroke: 2.6, gap: 20 },
};

/**
 * WeaveLoader — the single Pearloom loader. Two threads weave across
 * each other on a continuous loop (the brand metaphor in motion).
 * Replaces every spinner. Say "Threading…", never "Loading…".
 */
export function WeaveLoader({
  size = 'md',
  label,
  color = 'var(--pl-olive)',
  color2 = 'var(--pl-gold)',
  weight,
  inline = false,
  className,
  style,
  ariaLabel = 'Threading',
}) {
  const rawId = useId();
  const id = `pl-weave-${rawId.replace(/:/g, '')}`;
  const cfg = SIZES[size] || SIZES.md;
  const w = cfg.w;
  const h = Math.round(w * 0.55);
  const sw = weight != null ? weight : cfg.stroke;

  const path1 = `M 0 ${h - 1} C ${w * 0.25} ${h - 1}, ${w * 0.25} 1, ${w * 0.5} 1 S ${w * 0.75} ${h - 1}, ${w} ${h - 1}`;
  const path2 = `M 0 1 C ${w * 0.25} 1, ${w * 0.25} ${h - 1}, ${w * 0.5} ${h - 1} S ${w * 0.75} 1, ${w} 1`;

  const wrapperStyle = inline
    ? { display: 'inline-flex', alignItems: 'center', gap: cfg.gap, verticalAlign: 'middle' }
    : { display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: cfg.gap };

  return (
    <span role="status" aria-label={ariaLabel} aria-live="polite" className={className} style={{ ...wrapperStyle, ...style }}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', overflow: 'visible' }} aria-hidden="true">
        <defs>
          <linearGradient id={`${id}-a`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={color} stopOpacity="0.18"></stop>
            <stop offset="50%" stopColor={color} stopOpacity="1"></stop>
            <stop offset="100%" stopColor={color} stopOpacity="0.18"></stop>
          </linearGradient>
          <linearGradient id={`${id}-b`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={color2} stopOpacity="0.18"></stop>
            <stop offset="50%" stopColor={color2} stopOpacity="1"></stop>
            <stop offset="100%" stopColor={color2} stopOpacity="0.18"></stop>
          </linearGradient>
        </defs>
        <path d={path1} stroke={`url(#${id}-a)`} strokeOpacity="0.18" strokeWidth={sw} fill="none" strokeLinecap="round"></path>
        <path d={path2} stroke={`url(#${id}-b)`} strokeOpacity="0.18" strokeWidth={sw} fill="none" strokeLinecap="round"></path>
        <path d={path1} stroke={color} strokeWidth={sw} fill="none" strokeLinecap="round" pathLength="1"
          style={{ strokeDasharray: '0.32 1', animation: `${id}-a 1.6s cubic-bezier(0.4,0,0.6,1) infinite` }}></path>
        <path d={path2} stroke={color2} strokeWidth={sw} fill="none" strokeLinecap="round" pathLength="1"
          style={{ strokeDasharray: '0.32 1', animation: `${id}-b 1.6s cubic-bezier(0.4,0,0.6,1) infinite`, animationDelay: '0.4s' }}></path>
      </svg>
      {label ? (
        <span style={{ fontFamily: 'var(--pl-font-mono)', fontSize: size === 'xs' || size === 'sm' ? '0.6rem' : '0.66rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--pl-muted)' }}>{label}</span>
      ) : null}
      <style>{`
        @keyframes ${id}-a { 0% { stroke-dashoffset: 1; } 100% { stroke-dashoffset: -0.32; } }
        @keyframes ${id}-b { 0% { stroke-dashoffset: 1; } 100% { stroke-dashoffset: -0.32; } }
        @media (prefers-reduced-motion: reduce) {
          [aria-label="${ariaLabel}"] path[style] { animation: none !important; stroke-dasharray: none !important; }
        }
      `}</style>
    </span>
  );
}

export default WeaveLoader;
