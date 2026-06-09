// ─────────────────────────────────────────────────────────────
// Pearloom / studio/studio-card-svg.ts
//
// Pure-SVG serialization of the Studio card front for Pearloom
// Print. The Studio canvas renders the card as DOM (StudioCard +
// StudioLayouts); the print pipeline (/api/print/checkout →
// lib/print-engine/render) rasterizes SVG via Sharp/librsvg,
// which does NOT support <foreignObject> HTML. So this module
// mirrors the five card layouts + motif overlay as honest SVG
// primitives (<text>, <rect>, <path>, <image>) built from the
// exact same StudioPalette / StudioFontPair / StudioContent
// state the canvas reads — one source of design truth, two
// render targets.
//
// Geometry: the DOM card is 420×588 (5×7"). The print pipeline
// expects a 1000×1400 viewBox (see render.ts), so every DOM px
// value here is scaled by S = 1000/420 to keep the proportions
// identical to what the host sees on the desk.
//
// Remote images (couple photo, AI motif) must be inlined as
// data: URIs before serialization — librsvg refuses external
// network fetches. inlineRemoteImage() below does that on the
// client; pass the result in as photoDataUrl / motifDataUrl.
// ─────────────────────────────────────────────────────────────

import type { StudioPalette, StudioFontPair, StudioContent, StationeryType } from './studio-constants';

/** DOM-px → print-px scale (420-wide card → 1000-wide artboard). */
const S = 1000 / 420;
const W = 1000;
const H = 1400;
/** Card padding — 36 DOM px. */
const PAD = Math.round(36 * S);

export interface StudioCardSvgArgs {
  type: StationeryType;
  layout: string;
  motif: string;
  palette: StudioPalette;
  font: StudioFontPair;
  content: StudioContent;
  nameA: string;
  nameB: string;
  monogram: string;
  /** Couple photo, already inlined as a data: URI (or null —
   *  the photo layout falls back to its tonal gradient, same
   *  as the canvas does without a photo). */
  photoDataUrl?: string | null;
  /** AI-generated motif, already inlined as a data: URI. */
  motifDataUrl?: string | null;
}

/** XML-escape text content + attribute values. */
export function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Greedy word-wrap for SVG <text> (no native wrapping). */
export function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const candidate = line ? `${line} ${w}` : w;
    if (candidate.length > maxChars && line) {
      lines.push(line);
      line = w;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines.length > 0 ? lines : [''];
}

interface TextOpts {
  x: number;
  y: number;
  size: number;
  family: string;
  fill: string;
  weight?: number | string;
  italic?: boolean;
  anchor?: 'start' | 'middle' | 'end';
  /** letter-spacing in em — converted to px against `size`. */
  lsEm?: number;
  uppercase?: boolean;
  opacity?: number;
}

function text(content: string, o: TextOpts): string {
  const t = o.uppercase ? content.toUpperCase() : content;
  const ls = o.lsEm ? ` letter-spacing="${(o.lsEm * o.size).toFixed(1)}"` : '';
  const style = o.italic ? ' font-style="italic"' : '';
  const weight = o.weight ? ` font-weight="${o.weight}"` : '';
  const anchor = o.anchor ? ` text-anchor="${o.anchor}"` : '';
  const opacity = o.opacity != null ? ` opacity="${o.opacity}"` : '';
  return `<text x="${o.x}" y="${o.y}" font-size="${o.size}" font-family="${escapeXml(o.family)}" fill="${escapeXml(o.fill)}"${weight}${style}${anchor}${ls}${opacity}>${escapeXml(t)}</text>`;
}

function rule(cx: number, y: number, width: number, color: string): string {
  return `<rect x="${cx - width / 2}" y="${y}" width="${width}" height="2.4" fill="${escapeXml(color)}" opacity="0.6" />`;
}

// ── Layouts ──────────────────────────────────────────────────

function classicLayout(a: StudioCardSvgArgs): string {
  const { palette: p, font: f, content: c, nameA, nameB, type } = a;
  const cx = W / 2;
  const parts: string[] = [];
  // Top: rule · eyebrow · rule
  parts.push(rule(cx, PAD + 16, 48 * S, p.accent));
  parts.push(text(c.eyebrow, { x: cx, y: PAD + 52, size: 9 * S, family: f.ui, fill: p.ink, weight: 600, anchor: 'middle', lsEm: 0.32, uppercase: true, opacity: 0.7 }));
  parts.push(rule(cx, PAD + 72, 48 * S, p.accent));
  // Middle: names + amp
  const nameSize = 56 * S;
  let y = H / 2 - 130;
  parts.push(text(nameA, { x: cx, y, size: nameSize, family: f.display, fill: p.ink, weight: f.weight, italic: f.italic, anchor: 'middle', lsEm: -0.02 }));
  y += 36 * S + 16;
  parts.push(text('and', { x: cx, y, size: 36 * S, family: f.display, fill: p.accent, weight: 400, italic: true, anchor: 'middle', lsEm: 0.04 }));
  y += nameSize * 0.95 + 8;
  parts.push(text(nameB, { x: cx, y, size: nameSize, family: f.display, fill: p.ink, weight: f.weight, italic: f.italic, anchor: 'middle', lsEm: -0.02 }));
  y += 64;
  parts.push(text(c.line2, { x: cx, y, size: 13 * S, family: f.ui, fill: p.ink, opacity: 0.85, anchor: 'middle', italic: type === 'thanks' }));
  y += 40;
  parts.push(rule(cx, y, 120 * S, p.accent));
  y += 56;
  parts.push(text(c.line3, { x: cx, y, size: 16 * S, family: f.display, fill: p.ink, weight: 500, anchor: 'middle', lsEm: 0.02 }));
  y += 44;
  parts.push(text(c.line4, { x: cx, y, size: 11.5 * S, family: f.ui, fill: p.ink, weight: 600, anchor: 'middle', lsEm: 0.18, uppercase: true, opacity: 0.7 }));
  // Bottom: cta
  parts.push(text(c.cta, { x: cx, y: H - PAD, size: 10 * S, family: f.ui, fill: p.ink, weight: 600, anchor: 'middle', lsEm: 0.22, uppercase: true, opacity: 0.55 }));
  return parts.join('\n');
}

function asymLayout(a: StudioCardSvgArgs): string {
  const { palette: p, font: f, content: c, nameA, nameB } = a;
  const parts: string[] = [];
  parts.push(text(c.eyebrow, { x: PAD, y: PAD + 20, size: 9 * S, family: f.ui, fill: p.ink, weight: 600, lsEm: 0.26, uppercase: true, opacity: 0.7 }));
  parts.push(text('no. 01', { x: W - PAD, y: PAD + 22, size: 10 * S, family: f.display, fill: p.ink, italic: true, anchor: 'end', opacity: 0.6 }));
  // Names anchored at ~32% height, left-aligned, stacked.
  const nameSize = 70 * S;
  let y = H * 0.32 - nameSize * 0.6;
  parts.push(text(nameA, { x: PAD, y, size: nameSize, family: f.display, fill: p.ink, weight: f.weight, italic: f.italic, lsEm: -0.03 }));
  y += nameSize * 0.92;
  parts.push(text('and', { x: PAD, y, size: 56 * S, family: f.display, fill: p.accent, weight: 400, italic: true }));
  y += nameSize * 0.92;
  parts.push(text(nameB, { x: PAD, y, size: nameSize, family: f.display, fill: p.ink, weight: f.weight, italic: f.italic, lsEm: -0.03 }));
  // Bottom strip: rule + The day / The place columns
  const ruleY = H - PAD - 130;
  parts.push(`<rect x="${PAD}" y="${ruleY}" width="${W - PAD * 2}" height="2.4" fill="${escapeXml(p.accent)}" opacity="0.6" />`);
  parts.push(text('The day', { x: PAD, y: ruleY + 48, size: 9 * S, family: f.ui, fill: p.ink, weight: 600, lsEm: 0.2, uppercase: true, opacity: 0.55 }));
  parts.push(text(c.line3, { x: PAD, y: ruleY + 96, size: 16 * S, family: f.display, fill: p.ink, weight: 500 }));
  parts.push(text('The place', { x: W - PAD, y: ruleY + 48, size: 9 * S, family: f.ui, fill: p.ink, weight: 600, anchor: 'end', lsEm: 0.2, uppercase: true, opacity: 0.55 }));
  parts.push(text(c.line4, { x: W - PAD, y: ruleY + 96, size: 16 * S, family: f.display, fill: p.ink, weight: 500, anchor: 'end' }));
  return parts.join('\n');
}

function photoLayout(a: StudioCardSvgArgs): string {
  const { palette: p, font: f, content: c, nameA, nameB, photoDataUrl } = a;
  const cx = W / 2;
  const parts: string[] = [];
  const photoH = Math.round(H * 0.62);
  if (photoDataUrl) {
    parts.push(`<image href="${escapeXml(photoDataUrl)}" x="0" y="0" width="${W}" height="${photoH}" preserveAspectRatio="xMidYMid slice" />`);
  } else {
    parts.push(`<defs><linearGradient id="pl-photo-fallback" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${escapeXml(p.accent)}" /><stop offset="100%" stop-color="${escapeXml(p.accent2)}" /></linearGradient></defs>`);
    parts.push(`<rect x="0" y="0" width="${W}" height="${photoH}" fill="url(#pl-photo-fallback)" />`);
  }
  let y = photoH + 80;
  parts.push(text(c.eyebrow, { x: cx, y, size: 9 * S, family: f.ui, fill: p.ink, weight: 600, anchor: 'middle', lsEm: 0.3, uppercase: true, opacity: 0.65 }));
  y += 100;
  parts.push(text(`${nameA} and ${nameB}`, { x: cx, y, size: 40 * S, family: f.display, fill: p.ink, weight: f.weight, italic: f.italic, anchor: 'middle', lsEm: -0.02 }));
  y += 86;
  parts.push(text(c.line3, { x: cx, y, size: 13 * S, family: f.display, fill: p.ink, weight: 500, anchor: 'middle' }));
  y += 56;
  parts.push(text(c.line4, { x: cx, y, size: 10 * S, family: f.ui, fill: p.ink, weight: 600, anchor: 'middle', lsEm: 0.18, uppercase: true, opacity: 0.6 }));
  return parts.join('\n');
}

function scriptLayout(a: StudioCardSvgArgs): string {
  const { palette: p, content: c, nameA, nameB, type } = a;
  const script = "'Caveat', cursive";
  const body = type === 'thanks'
    ? "We can't believe it really happened, and we can't believe you were there. Thank you, with all our love, for celebrating with us."
    : "Save the date — we're getting married, and we'd love nothing more than to have you there.";
  const parts: string[] = [];
  let y = H * 0.3;
  parts.push(text('Dearest friend,', { x: PAD, y, size: 32 * S, family: script, fill: p.ink }));
  y += 96;
  for (const line of wrapText(body, 34)) {
    parts.push(text(line, { x: PAD, y, size: 24 * S, family: script, fill: p.ink, opacity: 0.85 }));
    y += 24 * S * 1.3;
  }
  y += 56;
  parts.push(text(`— ${nameA} & ${nameB}`, { x: PAD, y, size: 28 * S, family: script, fill: p.accent }));
  parts.push(text(c.line3, { x: PAD, y: H - PAD, size: 10 * S, family: "'Inter', system-ui, sans-serif", fill: p.ink, weight: 600, lsEm: 0.2, uppercase: true, opacity: 0.55 }));
  return parts.join('\n');
}

function minimalLayout(a: StudioCardSvgArgs): string {
  const { palette: p, font: f, content: c, nameA, nameB } = a;
  const cx = W / 2;
  const parts: string[] = [];
  let y = H / 2 - 40;
  parts.push(text(`${nameA} & ${nameB}`, { x: cx, y, size: 48 * S, family: f.display, fill: p.ink, weight: f.weight, italic: f.italic, anchor: 'middle', lsEm: -0.02 }));
  y += 76;
  parts.push(rule(cx, y, 80 * S, p.accent));
  y += 76;
  parts.push(text(c.line3, { x: cx, y, size: 11.5 * S, family: f.ui, fill: p.ink, weight: 600, anchor: 'middle', lsEm: 0.3, uppercase: true, opacity: 0.7 }));
  return parts.join('\n');
}

// ── Motif overlay ────────────────────────────────────────────

function motifSvg(a: StudioCardSvgArgs): string {
  const { motif, palette: p, content: c, monogram, motifDataUrl } = a;
  if (motifDataUrl) {
    const size = 100 * S;
    return `<image href="${escapeXml(motifDataUrl)}" x="${W - 16 * S - size}" y="${16 * S}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet" />`;
  }
  if (motif === 'stamp') {
    // Postage circle: tone bg + dashed inner ring + arc text.
    const tones: Record<string, { bg: string; ink: string }> = {
      lavender: { bg: '#C4B5D9', ink: '#3D4A1F' },
      peach: { bg: '#F0C9A8', ink: '#3D4A1F' },
      sage: { bg: '#CBD29E', ink: '#3D4A1F' },
    };
    const t = tones[p.id] ?? tones.lavender;
    const size = 70 * S;
    const cx0 = W - 16 * S - size / 2;
    const cy0 = 16 * S + size / 2;
    const r = size / 2;
    return [
      `<g transform="rotate(8 ${cx0} ${cy0})">`,
      `<circle cx="${cx0}" cy="${cy0}" r="${r * 0.96}" fill="${t.bg}" />`,
      `<circle cx="${cx0}" cy="${cy0}" r="${r * 0.88}" fill="none" stroke="${t.ink}" stroke-width="1" stroke-dasharray="2 6" />`,
      `<defs><path id="pl-stamp-arc" d="M ${cx0},${cy0} m -${r * 0.68},0 a ${r * 0.68},${r * 0.68} 0 1,1 ${r * 1.36},0 a ${r * 0.68},${r * 0.68} 0 1,1 -${r * 1.36},0" /></defs>`,
      `<text font-size="${10 * S * 0.7}" font-family="'Inter', system-ui, sans-serif" font-weight="700" letter-spacing="2" fill="${t.ink}"><textPath href="#pl-stamp-arc">${escapeXml(c.stamp.toUpperCase())}</textPath></text>`,
      `<path transform="translate(${cx0 - 14} ${cy0 - 12}) scale(1.2)" d="M12 21s-7-4.6-9.5-9C.7 8.7 2.2 5 5.5 5c2 0 3.4 1.2 4.1 2.4h.8C11.1 6.2 12.5 5 14.5 5c3.3 0 4.8 3.7 3 7-2.5 4.4-9.5 9-9.5 9z" fill="${t.ink}" opacity="0.85" />`,
      `</g>`,
    ].join('\n');
  }
  if (motif === 'leaves') {
    // Vine sweep from the DOM MotifOverlay, scaled into the
    // bottom-left corner (140 DOM px ≈ 333 print px).
    const k = (140 * S) / 200;
    return [
      `<g transform="translate(${-10 * S} ${H - 130 * S}) scale(${k})" opacity="0.85">`,
      `<path d="M30 170 Q 60 100, 120 110 Q 170 120, 180 60" stroke="${escapeXml(p.accent)}" stroke-width="1.5" fill="none" />`,
      `<ellipse cx="55" cy="135" rx="14" ry="6" fill="${escapeXml(p.accent)}" transform="rotate(-30 55 135)" />`,
      `<ellipse cx="85" cy="115" rx="14" ry="6" fill="${escapeXml(p.accent)}" transform="rotate(15 85 115)" />`,
      `<ellipse cx="125" cy="105" rx="14" ry="6" fill="${escapeXml(p.accent)}" transform="rotate(-10 125 105)" />`,
      `<ellipse cx="160" cy="80" rx="12" ry="5" fill="${escapeXml(p.accent)}" transform="rotate(40 160 80)" />`,
      `</g>`,
    ].join('\n');
  }
  if (motif === 'tape') {
    const tw = 90 * S, th = 22 * S;
    return `<rect x="${W / 2 - tw / 2}" y="${-8 * S}" width="${tw}" height="${th}" fill="rgba(234,178,134,0.55)" transform="rotate(-4 ${W / 2} ${th / 2})" />`;
  }
  if (motif === 'monogram') {
    return text(monogram, { x: 24 * S, y: 24 * S + 28 * S, size: 28 * S, family: "'Fraunces', Georgia, serif", fill: p.accent, weight: 600, italic: true });
  }
  if (motif === 'wax') {
    const size = 60 * S;
    const cx0 = W - 24 * S - size / 2;
    const cy0 = H - 24 * S - size / 2;
    return [
      `<defs><radialGradient id="pl-wax" cx="35%" cy="35%"><stop offset="0%" stop-color="#fff" /><stop offset="100%" stop-color="#000" /></radialGradient></defs>`,
      `<circle cx="${cx0}" cy="${cy0}" r="${size * 0.37}" fill="#C97A6E" />`,
      `<circle cx="${cx0}" cy="${cy0}" r="${size * 0.37}" fill="url(#pl-wax)" opacity="0.45" />`,
      text(monogram, { x: cx0, y: cy0 + 14 * S * 0.35, size: 14 * S, family: "'Fraunces', Georgia, serif", fill: 'rgba(255,255,255,0.7)', weight: 700, italic: true, anchor: 'middle' }),
    ].join('\n');
  }
  if (motif === 'doodle') {
    // Loose squiggle in the bottom-left corner.
    const x0 = 24 * S, y0 = H - 42 * S;
    return `<path d="M ${x0} ${y0} q 25 -36 50 0 t 50 0 t 50 0 t 50 0" stroke="${escapeXml(p.accent)}" stroke-width="3.5" fill="none" stroke-linecap="round" opacity="0.7" />`;
  }
  return '';
}

// ── Public API ───────────────────────────────────────────────

/**
 * Serialize the Studio card front to a print-ready SVG string
 * (1000×1400 viewBox, the shape lib/print-engine/render expects).
 */
export function studioCardToPrintSvg(args: StudioCardSvgArgs): string {
  const { palette: p, layout } = args;
  const isDark = p.id === 'twilight';

  let body: string;
  switch (layout) {
    case 'asym':    body = asymLayout(args); break;
    case 'photo':   body = photoLayout(args); break;
    case 'script':  body = scriptLayout(args); break;
    case 'minimal': body = minimalLayout(args); break;
    case 'classic':
    default:        body = classicLayout(args); break;
  }

  // Subtle paper-grain wash (mirrors PaperTexture; skipped on the
  // dark palette, same as the canvas).
  const texture = isDark ? '' : [
    `<filter id="pl-paper-noise"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" /><feColorMatrix values="0 0 0 0 0.95   0 0 0 0 0.92   0 0 0 0 0.85   0 0 0 0.06 0" /></filter>`,
    `<rect width="${W}" height="${H}" filter="url(#pl-paper-noise)" opacity="0.5" />`,
  ].join('\n');

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`,
    `<rect width="${W}" height="${H}" fill="${escapeXml(p.paper)}" />`,
    texture,
    body,
    motifSvg(args),
    `</svg>`,
  ].filter(Boolean).join('\n');
}

/**
 * Fetch a remote image and inline it as a data: URI so librsvg
 * can render it server-side (external fetches are disabled in
 * the print renderer). Returns null on any failure — callers
 * fall back to the same tonal placeholder the canvas shows.
 * Browser-only (uses FileReader).
 */
export async function inlineRemoteImage(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith('data:')) return url;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
