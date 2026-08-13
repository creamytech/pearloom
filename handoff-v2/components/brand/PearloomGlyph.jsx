import React, { useId } from 'react';

// The final, signed-off pear silhouette (vectorized). Body + leaf as
// two solid paths; the spiral is negative space carved by the leaf
// being separate and the body path's interior curve. viewBox 0 0 115.4 186.
const PEAR_BODY = 'm90 92c-4.4-9-5.7-15.4-7.1-25.2-1.6-10.9-8-19.3-15.9-23-2.5-1.3-6.7-1.2-8.6-1.4 0.2-6.7-0.4-12.5-2.2-20.4-1.1-3-2.9-2-4.3-1.1s-2.9 2.2-1.5 4.8 4.2 4.4 5 17c0.1 0.3-1.1-0.1-1.8 0-10.6 1.4-19.4 10.1-21.2 22.7-1.7 11.4-2.5 17.7-8.7 28.6-4.9 8.9-6.9 10.4-10.1 18-2.2 4.8-5.1 12.6-4.6 24.1 0.4 9.1 3.7 22.5 12.3 31.2 7.9 8.2 18.6 14.5 35.1 15.1 26.6 0 45.6-14.1 49.5-35.6 4.2-18.4-1.2-33.1-10.2-47.8l-5.7-7zm-31.4 77.5c-18.6 0-31.7-13.2-31.8-33.5-0.1-17.1 9-26.8 13.8-34.7 5.2-8.6 12.2-28.2 14.4-50.2h0.4c0.7 9.2-0.1 25.3-2.1 34.4-3.9 18.3-11.4 26.3-14.5 38.5-5.9 22.5 8.1 32.7 20.6 32.9 14.1 0.1 18.2-9.6 18.5-17 0.2-6.5-6-13.8-12.9-14.1-5.2-0.1-9.7 3.1-9.8 8.7-0.3 7 7.5 9.9 11.3 5.8-0.1 2.5-2.9 5.2-7.5 4.9-4-0.2-9.1-4-9.1-11.3 0.1-5.8 5.1-16.3 17.3-16.3 12.9-0.3 20.7 9.8 21.1 21 0.3 13.8-9.6 30.9-29.7 30.9zm6.3-137.2c0.5-8.1 5.7-25.3 24.5-25.7 11.5-0.5 15.5 1.3 16.3 1.8 0.5 0.2 1.6 0.6-0.6 3.4-3.4 4.8-8.8 22.1-27.5 23.3-7.9 0.3-9.7-2-13 1.5s-5.2 7.2 0.3-4.3zm0.5 1.6c3.2-4.3 13.3-16.5 25.1-17.9 9.7-1.2-12 1-23.6 17.9h-1.5z';
const PEAR_LEAF = 'm64.9 32.3c-0.1-4.7 3.1-24.3 22.4-25.5 9.7-0.9 14.7-0.2 18 1l0.2 0.1c0.7 0.2 1.3 0.6 0.6 1.5-5.1 7.7-9.4 22.2-25.6 25.4-9.1 1.3-12.3-2.7-15.6 1.2v-3.7z';

/**
 * PearloomGlyph — the brand mark: the solid pear with a carved spiral
 * core, stem and leaf. The final signed-off vectorized silhouette,
 * recolored to brand olive. One `color` paints the whole mark (the
 * spiral is true negative space), so it reverses cleanly to a cream
 * knockout on olive/ink and reads from 16px to hero. `gold`/`paper`
 * are accepted for API compatibility but unused by this mark.
 */
export function PearloomGlyph({
  size = 32,
  color = 'var(--pl-olive)',
  gold,
  paper,
  className,
  style,
}) {
  return (
    <svg
      viewBox="0 0 115.4 186"
      height={size}
      width={size * (115.4 / 186)}
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path d={PEAR_BODY} fill={color}></path>
      <path d={PEAR_LEAF} fill={color}></path>
    </svg>
  );
}

// The final, signed-off "pearloom" lettering (vectorized), viewBox
// 157 44.6 289 81 → normalized width:height ≈ 3.57:1.
const WORDMARK_PATHS = [
  'm176.3 72c-8.8 0-16.8 7.2-16.8 17.3v30.7c0 1.1 0.6 1.9 1.7 1.9s1.8-0.8 1.8-1.9v-19.8l0.2 0.2c3.2 3.6 6.9 6.4 13.1 6.4 9.3 0 16.8-6.9 16.8-16.8 0-10-7.3-18-16.8-18zm0 31.5c-7.3 0-13-5.7-13-13.5 0-7.3 5.8-14 13-14 7.3 0 13 5.2 13 13.3 0 7.3-5.7 14.2-13 14.2z',
  'm216.8 72c-8.8 0-16.4 7-16.4 17.2 0.2 9 6.7 16.9 16.2 17.1 5.3 0 10.4-1.7 14-6.4 0.4-0.6 0.9-1.3 0.1-2.4-0.9-1.1-2.3-1-3 0-3 3.6-6.3 5.3-11.1 5.6-6.2 0-11.7-4.9-12.7-12.1h2.7c1.2-0.2 3.2-0.3 4.7-0.3h19.8c1.8 0 2.4-0.2 2.2-2.1-0.6-8.6-6.3-16.6-16.5-16.6zm-13.1 15c0.9-6 5.9-11.1 12.8-11.1 6.5 0 12.2 4.4 13 11l-25.8 0.1z',
  'm276.5 103c-2.6 0.3-3.4-1.5-3.4-4.5v-9.2c0-9.3-7.2-17.2-16.6-17.2-9.3 0-16.9 7.3-16.9 17.2 0.4 12 9.2 17 17.2 17 4.5 0 9.8-1.8 12.4-6.2h0.2l0.2 0.7c0.8 3.4 2.7 5.5 6.5 5.4 1.8 0.1 2.5-0.7 2.5-1.9 0.1-1.1-1-1.7-2.1-1.3zm-19.9 0c-7.5 0-13.1-5.7-13.1-13.6 0-6.6 5.8-13.5 13.1-13.5s12.7 5.4 12.7 13.4c0 7.3-5 13.7-12.7 13.7z',
  'm299.3 72.3c-1.5-0.2-4-0.3-5.7-0.1-5.7 0.4-11.6 5.1-11.6 13.5v18.4c0 1.5 3.6 1.9 3.6-0.5v-17.9c0-5.1 3.4-9.8 9.9-9.7 1.6 0 1.9 0.1 3.5 0.3 0.9 0.1 1.9-0.9 2-1.8 0-1-0.9-2.1-1.7-2.2z',
  'm323.3 102.5c-1.2 0.5-2.9 0.7-4.3 0.6-4.1 0-8-2.4-9.7-7.9 9.8-5.6 14.7-19.9 14.6-34.4-0.1-5.7-2-13.4-9.9-13.4-4.5 0-9.4 3.1-9.5 12.2l-0.1 30c0 6.7 5.6 16.4 16.9 16.5 1.1-0.1 2.4-0.3 3.1-0.5 1.2-0.4 1.9-1.5 1.1-2.8-0.3-0.4-0.8-0.7-2.2-0.3zm-15.1-41.5c0-5.2 1.7-9.6 6-9.5 4.2 0 5.8 3.4 5.8 9.1 0 12.9-4.4 25-11.6 30.6-0.1-0.7-0.2-1.2-0.1-2.2v-28h-0.1z',
  'm343.3 72c-8.9 0-16.4 7.2-16.7 16.8 0 10 7 17.4 16.3 17.4s16.4-7 16.6-16.6c0.5-9.2-7.4-17.6-16.2-17.6zm-0.3 31c-7.2 0-12.7-6.3-12.8-13.7 0-6.5 5.1-13.4 12.7-13.4 8.4 0 13.2 6.6 13.2 13.4 0 7.2-5.7 13.7-13.1 13.7z',
  'm378.4 72c-9.2 0-16.7 6.8-17.1 16.8 0.2 9.4 6.2 17.5 16.5 17.4 9.1 0 16.3-6.2 16.7-16.6 0-8.9-7.1-17.6-16.1-17.6zm-0.5 31c-7.9 0-12.9-6.4-13.1-13.6 0-6.6 5.4-13.5 13.1-13.5 7.1 0 13.1 5.9 13.1 13.4 0 7.3-5.7 13.7-13.1 13.7z',
  'm432.2 72c-3.7 0-7.6 1.5-9.7 5.3-2.2-3.5-6.1-5.3-9.5-5.3-6.6 0-11 4.5-11.3 11.5l0.1 20.9c0 2.1 3.3 2.4 3.6 0.1l-0.1-20.2c0-4.9 3.4-8.4 7.7-8.4 4.5 0 8 3.2 8 8.4l0.1 20.2c0 2.1 3.3 2.4 3.3 0v-20.2c0-4.8 3.5-8.4 7.7-8.4 4.5 0 7.8 3.2 7.8 8.1v20.4c0 2.1 3.1 2.3 3.1 0v-20.3c0.4-7.4-5.1-12.1-10.8-12.1z',
];

/**
 * PearloomWordmark — the final signed-off "pearloom" lettering
 * (vectorized), recolored to brand olive. `color` fills the glyphs;
 * `size` is the cap height in px. Pure vector — crisp at any scale.
 */
export function PearloomWordmark({ size = 24, color = 'var(--pl-ink)', style }) {
  return (
    <svg
      viewBox="157 44.6 289 81"
      height={size}
      width={size * (289 / 81)}
      style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
      role="img"
      aria-label="Pearloom"
    >
      {WORDMARK_PATHS.map((d, i) => <path key={i} d={d} fill={color}></path>)}
    </svg>
  );
}

/**
 * PearloomLogo — glyph + wordmark lockup.
 */
export function PearloomLogo({ size = 28, color = 'var(--pl-ink)' }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: Math.max(6, Math.round(size * 0.36)) }}>
      <PearloomGlyph size={size + 12} color={color}></PearloomGlyph>
      <PearloomWordmark size={size * 0.82} color={color}></PearloomWordmark>
    </span>
  );
}
