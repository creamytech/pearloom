'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / effects/TextureOverlay.tsx
// Tiling texture pattern layered over the page background.
// Uses SVG patterns and CSS background-image — no external assets.
// mix-blend-mode: multiply so the texture enriches without obscuring.
// ─────────────────────────────────────────────────────────────

type TextureType = 'none' | 'paper' | 'linen' | 'concrete' | 'velvet' | 'bokeh';

interface TextureOverlayProps {
  texture: TextureType;
  /** 0–100, how strongly the texture shows */
  intensity?: number;
}

function getTextureDataUri(texture: TextureType): string {
  switch (texture) {
    case 'paper':
      // Fine cross-hatch + noise combo
      return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3CfeBlend in='SourceGraphic' mode='multiply'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23p)' opacity='0.08'/%3E%3Cline x1='0' y1='8' x2='400' y2='8' stroke='%23000' stroke-width='0.4' opacity='0.04'/%3E%3Cline x1='0' y1='16' x2='400' y2='16' stroke='%23000' stroke-width='0.4' opacity='0.04'/%3E%3Cline x1='0' y1='24' x2='400' y2='24' stroke='%23000' stroke-width='0.4' opacity='0.04'/%3E%3C/svg%3E")`;
    case 'linen':
      // Woven thread pattern
      return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8'%3E%3Crect width='8' height='8' fill='none'/%3E%3Cpath d='M0 0h4v4H0zM4 4h4v4H4z' fill='%23000' opacity='0.025'/%3E%3C/svg%3E")`;
    case 'concrete':
      // Coarser noise with horizontal streaks
      return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='c'%3E%3CfeTurbulence type='turbulence' baseFrequency='0.5 0.1' numOctaves='5' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23c)' opacity='0.07'/%3E%3C/svg%3E")`;
    case 'velvet':
      // Soft diagonal brushstroke
      return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='6' height='6'%3E%3Cpath d='M0 6L6 0' stroke='%23fff' stroke-width='1' opacity='0.06'/%3E%3C/svg%3E")`;
    case 'bokeh':
      // Soft overlapping circles for a dreamy feel
      return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Ccircle cx='20' cy='20' r='12' fill='none' stroke='%23fff' stroke-width='0.5' opacity='0.08'/%3E%3Ccircle cx='60' cy='50' r='16' fill='none' stroke='%23fff' stroke-width='0.5' opacity='0.06'/%3E%3Ccircle cx='40' cy='70' r='8' fill='none' stroke='%23fff' stroke-width='0.5' opacity='0.07'/%3E%3C/svg%3E")`;
    default:
      return '';
  }
}

const TEXTURE_SIZES: Record<Exclude<TextureType, 'none'>, string> = {
  paper: '400px 400px',
  linen: '8px 8px',
  concrete: '300px 300px',
  velvet: '6px 6px',
  bokeh: '80px 80px',
};

export function TextureOverlay({ texture, intensity = 60 }: TextureOverlayProps) {
  if (texture === 'none' || intensity <= 0) return null;

  const dataUri = getTextureDataUri(texture);
  if (!dataUri) return null;

  const size = TEXTURE_SIZES[texture as Exclude<TextureType, 'none'>] ?? 'auto';
  const alpha = Math.min(intensity / 100, 1);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9988,
        pointerEvents: 'none',
        opacity: alpha,
        mixBlendMode: 'multiply',
        backgroundImage: dataUri,
        backgroundRepeat: 'repeat',
        backgroundSize: size,
      }}
    />
  );
}
