// ─────────────────────────────────────────────────────────────
// Pearloom / lib/patterns.ts
// Maps Gemini's pattern choices to dynamic SVG URLs 
// using the theme's colors for seamless blending.
// ─────────────────────────────────────────────────────────────

export function getPatternStyle(pattern: string | undefined): React.CSSProperties {
  const defaultNoise = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`;

  if (!pattern || pattern === 'none') {
    return { backgroundImage: 'none' };
  }

  // All SVGs should inherit the current text color (`currentColor` which we will set to `var(--pl-olive)`)
  // with a very low opacity.
  const svgMap: Record<string, string> = {
    noise: defaultNoise,
    dots: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='2' cy='2' r='1.5' fill='currentColor'/%3E%3C/svg%3E")`,
    grid: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M40 40V0H0v40h40ZM39 39H1V1h38v38Z' fill='currentColor' fill-rule='evenodd'/%3E%3C/svg%3E")`,
    waves: `url("data:image/svg+xml,%3Csvg width='100' height='20' viewBox='0 0 100 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 10 Q 25 20, 50 10 T 100 10' fill='none' stroke='currentColor' stroke-width='1'/%3E%3C/svg%3E")`,
    floral: `url("data:image/svg+xml,%3Csvg width='30' height='30' viewBox='0 0 30 30' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M15 0 C20 10 25 15 30 15 C25 20 20 25 15 30 C10 25 5 20 0 15 C5 10 10 5 15 0 Z' fill='none' stroke='currentColor' stroke-width='0.5'/%3E%3C/svg%3E")`,
    topography: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M10 10 Q 40 40, 90 10 M10 30 Q 50 60, 90 30 M10 60 Q 30 80, 90 50 M10 80 Q 60 90, 90 70' fill='none' stroke='currentColor' stroke-width='0.5'/%3E%3C/svg%3E")`,
  };

  const url = svgMap[pattern] || defaultNoise;

  return {
    backgroundImage: url,
    color: 'var(--pl-olive)', // Make currentColor map to the accent color
    opacity: pattern === 'noise' ? 0.15 : 0.05,
    mixBlendMode: pattern === 'noise' ? 'multiply' : 'normal',
    pointerEvents: 'none',
  };
}
