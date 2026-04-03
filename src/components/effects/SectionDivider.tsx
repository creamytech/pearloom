'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / effects/SectionDivider.tsx
// SVG shape divider rendered between page sections.
// Inject via <SectionDivider> between blocks, or use
// injectSectionDividerCSS() to auto-insert between .pl-section
// elements via a <style> tag in ThemeProvider.
// ─────────────────────────────────────────────────────────────

type DividerStyle = 'none' | 'wave' | 'wave2' | 'diagonal' | 'zigzag' | 'torn' | 'chevron' | 'arc';

interface SectionDividerProps {
  style: DividerStyle;
  color: string;    // fill color — should match the NEXT section's background
  bgColor?: string; // background behind the SVG — should match the PREVIOUS section's background
  height?: number;  // px, 30–200
  flip?: boolean;   // mirror horizontally
  flop?: boolean;   // mirror vertically
}

function getPath(style: DividerStyle, w = 1440, h = 80): string {
  switch (style) {
    case 'wave':
      return `M0,${h * 0.5} C${w * 0.25},0 ${w * 0.75},${h} ${w},${h * 0.5} L${w},${h} L0,${h} Z`;
    case 'wave2':
      return `M0,${h * 0.65} C${w * 0.15},${h * 0.2} ${w * 0.35},${h} ${w * 0.5},${h * 0.5} C${w * 0.65},0 ${w * 0.85},${h * 0.9} ${w},${h * 0.4} L${w},${h} L0,${h} Z`;
    case 'diagonal':
      return `M0,0 L${w},${h} L${w},${h} L0,${h} Z`;
    case 'zigzag': {
      const peaks = 8;
      const step = w / peaks;
      let d = `M0,${h} `;
      for (let i = 0; i < peaks; i++) {
        const mid = step * i + step / 2;
        const right = step * (i + 1);
        d += `L${mid},0 L${right},${h} `;
      }
      return d + 'Z';
    }
    case 'torn': {
      // Rough hand-torn edge
      const pts = 20;
      const step = w / pts;
      let d = `M0,${h} `;
      for (let i = 1; i <= pts; i++) {
        const x = step * i;
        const y = i % 3 === 0 ? h * 0.05 : i % 2 === 0 ? h * 0.35 : h * 0.18;
        d += `L${x},${y} `;
      }
      return d + `L${w},${h} Z`;
    }
    case 'chevron': {
      const mid = w / 2;
      return `M0,${h} L${mid},0 L${w},${h} Z`;
    }
    case 'arc':
      return `M0,${h} Q${w / 2},-${h * 0.5} ${w},${h} Z`;
    default:
      return '';
  }
}

export function SectionDivider({ style, color, bgColor, height = 80, flip = false, flop = false }: SectionDividerProps) {
  if (style === 'none') return null;

  const path = getPath(style, 1440, height);
  if (!path) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        width: '100%',
        overflow: 'hidden',
        lineHeight: 0,
        background: bgColor || 'transparent',
        transform: `${flip ? 'scaleX(-1)' : ''} ${flop ? 'scaleY(-1)' : ''}`.trim() || undefined,
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 1440 ${height}`}
        preserveAspectRatio="none"
        style={{ display: 'block', width: '100%', height }}
      >
        <path d={path} fill={color} />
      </svg>
    </div>
  );
}

// ── CSS injection for ThemeProvider ───────────────────────────
// Returns a <style> tag content that auto-inserts dividers between
// all elements with data-pl-section attribute.
export function buildSectionDividerCSS(
  style: DividerStyle,
  color: string,
  height: number,
): string {
  if (style === 'none') return '';

  // Encode the SVG path as a CSS background-image data URI
  const path = getPath(style, 1440, height);
  if (!path) return '';

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 ${height}' preserveAspectRatio='none'><path d='${path}' fill='${color}'/></svg>`;
  const encoded = encodeURIComponent(svg);

  return `
    [data-pl-section] + [data-pl-section]::before {
      content: '';
      display: block;
      width: 100%;
      height: ${height}px;
      background: url("data:image/svg+xml,${encoded}") no-repeat center/cover;
      margin-top: -${height}px;
      position: relative;
      z-index: 1;
    }
  `;
}
