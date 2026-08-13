import React, { useId } from 'react';

/**
 * Thread — the visual atom of Pearloom. Two strands (olive + gold)
 * acting as dividers, rules, and editorial flourishes. Replaces every
 * loose <hr> and one-off rule stroke.
 *   weave    — two strands cross at the middle (default)
 *   straight — two parallel hairlines
 *   single   — one gold hairline
 *   bullet   — short rule with a centered bead
 */
export function Thread({
  variant = 'weave',
  width = '100%',
  height = 14,
  color = 'var(--pl-olive)',
  color2 = 'var(--pl-gold)',
  weight = 1,
  className,
  style,
}) {
  const rawId = useId();
  const id = `pl-thread-${rawId.replace(/:/g, '')}`;

  if (variant === 'bullet') {
    return (
      <div
        aria-hidden="true"
        className={className}
        style={{ display: 'flex', alignItems: 'center', gap: 12, width, color, ...style }}
      >
        <span style={{ flex: 1, height: weight, background: `linear-gradient(90deg, transparent, ${color2} 60%, ${color2})` }}></span>
        <span style={{ width: Math.max(6, height * 0.5), height: Math.max(6, height * 0.5), borderRadius: '50%', background: color2, display: 'inline-block' }}></span>
        <span style={{ flex: 1, height: weight, background: `linear-gradient(90deg, ${color2}, ${color2} 40%, transparent)` }}></span>
      </div>
    );
  }

  if (variant === 'single') {
    return <span aria-hidden="true" className={className} style={{ display: 'block', width, height: weight, background: color2, ...style }}></span>;
  }

  if (variant === 'straight') {
    return (
      <div aria-hidden="true" className={className} style={{ width, display: 'flex', flexDirection: 'column', gap: Math.max(2, height / 4), ...style }}>
        <span style={{ display: 'block', height: weight, background: color }}></span>
        <span style={{ display: 'block', height: weight, background: color2 }}></span>
      </div>
    );
  }

  // weave — two cubic curves crossing the midline.
  const w = 200;
  const h = height;
  const path1 = `M 0 ${h - 1} C ${w * 0.25} ${h - 1}, ${w * 0.25} 1, ${w * 0.5} 1 S ${w * 0.75} ${h - 1}, ${w} ${h - 1}`;
  const path2 = `M 0 1 C ${w * 0.25} 1, ${w * 0.25} ${h - 1}, ${w * 0.5} ${h - 1} S ${w * 0.75} 1, ${w} 1`;

  return (
    <svg
      aria-hidden="true"
      className={className}
      width={width}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={{ display: 'block', overflow: 'visible', ...style }}
    >
      <defs>
        <linearGradient id={`${id}-a`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0.15"></stop>
          <stop offset="50%" stopColor={color} stopOpacity="1"></stop>
          <stop offset="100%" stopColor={color} stopOpacity="0.15"></stop>
        </linearGradient>
        <linearGradient id={`${id}-b`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color2} stopOpacity="0.15"></stop>
          <stop offset="50%" stopColor={color2} stopOpacity="1"></stop>
          <stop offset="100%" stopColor={color2} stopOpacity="0.15"></stop>
        </linearGradient>
      </defs>
      <path d={path1} stroke={`url(#${id}-a)`} strokeWidth={weight} strokeLinecap="round" fill="none"></path>
      <path d={path2} stroke={`url(#${id}-b)`} strokeWidth={weight} strokeLinecap="round" fill="none"></path>
    </svg>
  );
}
