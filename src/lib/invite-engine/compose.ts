// ─────────────────────────────────────────────────────────────
// Pearloom / lib/invite-engine/compose.ts
//
// Pure client-safe SVG renderer for a LayoutSpec. Runs in the
// InviteDesignerPanel to preview layouts without hitting the
// network. The same SVG string is PNG-exported via the existing
// SaveTheDate export path.
//
// Intentionally isomorphic: no React, no DOM — just a string.
// ─────────────────────────────────────────────────────────────

import type { LayoutSpec } from './layouts';

export interface ComposeContext {
  names: string;
  date: string;             // pre-formatted
  venue?: string;
  city?: string;
  eyebrow?: string;
  paletteFallback: { background: string; foreground: string; accent: string };
  /** Optional archetype render URL (already uploaded to R2). */
  archetypeImageUrl?: string;
  /** Optional photo URL for `photoTreatment`. */
  photoUrl?: string;
  width?: number;           // px
  height?: number;          // px
}

function aspectSize(aspect: LayoutSpec['aspect']): { w: number; h: number } {
  if (aspect === 'landscape') return { w: 1200, h: 800 };
  if (aspect === 'square') return { w: 1000, h: 1000 };
  return { w: 800, h: 1200 };
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function backgroundSvg(layout: LayoutSpec, ctx: ComposeContext, w: number, h: number): string {
  const bg = layout.background;
  if (bg.kind === 'archetype' && ctx.archetypeImageUrl) {
    return `<image href="${esc(ctx.archetypeImageUrl)}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" />`;
  }
  if (bg.kind === 'photo' && ctx.photoUrl) {
    const overlay = bg.overlay ?? 0;
    const overlayRect = overlay > 0
      ? `<rect x="0" y="0" width="${w}" height="${h}" fill="${ctx.paletteFallback.background}" opacity="${overlay}" />`
      : '';
    return `<image href="${esc(ctx.photoUrl)}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" />${overlayRect}`;
  }
  const color = (bg.kind === 'solid' && bg.color) || ctx.paletteFallback.background;
  return `<rect x="0" y="0" width="${w}" height="${h}" fill="${color}" />`;
}

function decorationSvg(
  layout: LayoutSpec,
  palette: { accent: string; foreground: string; muted?: string },
  w: number,
  h: number,
): string {
  return layout.decorations
    .map((d) => {
      const color = d.tone === 'accent'
        ? palette.accent
        : d.tone === 'muted'
          ? palette.muted ?? palette.foreground
          : palette.foreground;
      const strokeOpacity = d.tone === 'muted' ? 0.4 : 0.85;

      const coords = positionToXY(d.position, w, h);

      switch (d.kind) {
        case 'rule':
          return `<line x1="${coords.x - 120}" y1="${coords.y}" x2="${coords.x + 120}" y2="${coords.y}" stroke="${color}" stroke-width="1" stroke-opacity="${strokeOpacity}" />`;
        case 'thread':
          return `<path d="M ${coords.x - 180} ${coords.y} Q ${coords.x} ${coords.y - 8} ${coords.x + 180} ${coords.y}" stroke="${color}" stroke-width="1" fill="none" stroke-dasharray="3 2" stroke-opacity="${strokeOpacity}" />`;
        case 'sprig':
          return `<g transform="translate(${coords.x - 24}, ${coords.y - 20})" opacity="${strokeOpacity}"><path d="M24 40 C 24 20, 18 10, 12 2 M24 40 C 24 20, 30 10, 36 2 M14 18 C 10 14, 6 12, 2 12 M34 18 C 38 14, 42 12, 46 12" stroke="${color}" stroke-width="1.2" fill="none" /></g>`;
        case 'seal':
          return `<circle cx="${coords.x}" cy="${coords.y}" r="28" fill="${palette.accent}" opacity="0.85" /><circle cx="${coords.x}" cy="${coords.y}" r="22" fill="none" stroke="${palette.foreground}" stroke-width="0.6" />`;
        case 'stamp':
          return `<rect x="${coords.x - 28}" y="${coords.y - 36}" width="56" height="72" fill="${palette.foreground}" opacity="0.12" /><rect x="${coords.x - 24}" y="${coords.y - 32}" width="48" height="64" fill="none" stroke="${palette.accent}" stroke-width="0.8" />`;
        case 'postmark':
          return `<circle cx="${coords.x}" cy="${coords.y}" r="42" fill="none" stroke="${palette.foreground}" stroke-width="1.2" opacity="0.25" /><circle cx="${coords.x}" cy="${coords.y}" r="36" fill="none" stroke="${palette.foreground}" stroke-width="0.6" opacity="0.2" />`;
        case 'dropcap':
          return '';
        default:
          return '';
      }
    })
    .join('');
}

function positionToXY(position: string, w: number, h: number): { x: number; y: number } {
  const pad = 72;
  switch (position) {
    case 'top': return { x: w / 2, y: pad };
    case 'bottom': return { x: w / 2, y: h - pad };
    case 'left': return { x: pad, y: h / 2 };
    case 'right': return { x: w - pad, y: h / 2 };
    case 'corner-tl': return { x: pad, y: pad };
    case 'corner-tr': return { x: w - pad, y: pad };
    case 'corner-bl': return { x: pad, y: h - pad };
    case 'corner-br': return { x: w - pad, y: h - pad };
    case 'center':
    default:
      return { x: w / 2, y: h / 2 };
  }
}

function fontStyle(namesStyle: LayoutSpec['frame']['namesStyle']): string {
  switch (namesStyle) {
    case 'italic': return 'italic';
    case 'script': return 'italic';
    default: return 'normal';
  }
}

export function composeInviteSvg(layout: LayoutSpec, ctx: ComposeContext): string {
  const { w, h } = ctx.width && ctx.height
    ? { w: ctx.width, h: ctx.height }
    : aspectSize(layout.aspect);

  const palette = ctx.paletteFallback;
  const bg = backgroundSvg(layout, ctx, w, h);
  const decos = decorationSvg(layout, palette, w, h);

  const namesX = (layout.frame.namesX / 100) * w;
  const namesY = (layout.frame.namesY / 100) * h;
  const dateY = (layout.frame.dateY / 100) * h;
  const venueY = (layout.frame.venueY / 100) * h;

  // rem → px (base 16)
  const rem = (r: number) => r * 16;

  const display = esc(layout.typography.display);
  const body = esc(layout.typography.body);
  const namesFontStyle = fontStyle(layout.frame.namesStyle);

  const eyebrow = ctx.eyebrow
    ? `<text x="${w / 2}" y="${Math.max(48, namesY - rem(layout.frame.namesSize) - 24)}" text-anchor="middle" font-family="${body}, Geist, system-ui, sans-serif" font-size="11" letter-spacing="0.28em" fill="${palette.accent}" text-transform="uppercase">${esc(ctx.eyebrow.toUpperCase())}</text>`
    : '';

  const names = `<text x="${namesX}" y="${namesY}" text-anchor="middle" font-family="${display}, Fraunces, Playfair Display, serif" font-size="${rem(layout.frame.namesSize)}" font-style="${namesFontStyle}" fill="${palette.foreground}">${esc(ctx.names)}</text>`;

  const dateTxt = `<text x="${w / 2}" y="${dateY}" text-anchor="middle" font-family="${body}, Geist, sans-serif" font-size="${rem(layout.frame.dateSize)}" letter-spacing="0.08em" fill="${palette.foreground}">${esc(ctx.date)}</text>`;

  const venueLine = ctx.venue
    ? `<text x="${w / 2}" y="${venueY}" text-anchor="middle" font-family="${body}, Geist, sans-serif" font-size="${rem(layout.frame.venueSize)}" letter-spacing="0.12em" fill="${palette.foreground}" fill-opacity="0.82">${esc([ctx.venue, ctx.city].filter(Boolean).join(' · '))}</text>`
    : '';

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    bg +
    decos +
    eyebrow +
    names +
    dateTxt +
    venueLine +
    `</svg>`
  );
}
