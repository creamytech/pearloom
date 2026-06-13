// ─────────────────────────────────────────────────────────────
// Pearloom / editor/panels/share-kit.ts
//
// SHARE KIT canvas renderer (docs/SUITE-STRATEGY.md §6, Phase 5).
//
// Draws the three pre-sized themed share images — Square
// (1080×1080), Story (1080×1920), Banner (1600×900) — entirely
// client-side on an offscreen-ish canvas. No server round-trip;
// everything derives from the SuiteTheme contract
// (suiteThemeFromManifest) so the images can't drift from the
// couple's site look.
//
// Design per size: suite paper ground, accent + gold hairline
// double frame, monogram initials as a typographic crest (gold
// ring + display-italic letters), occasion kicker in tracked mono
// caps, names in the display font, date · venue in the body font.
// Story additionally lays the cover photo cover-fit across the
// upper region with a paper band below; CORS-tainted or failed
// photos fall back to the typographic-only design silently.
//
// Fonts load via theme.fonts.googleHref (<link> injected once)
// + document.fonts.load/ready before drawing.
// ─────────────────────────────────────────────────────────────

import type { SuiteTheme } from '@/lib/suite/theme';

export interface ShareKitSize {
  id: 'square' | 'story' | 'banner';
  label: string;
  w: number;
  h: number;
}

export const SHARE_KIT_SIZES: ShareKitSize[] = [
  { id: 'square', label: 'Square', w: 1080, h: 1080 },
  { id: 'story',  label: 'Story',  w: 1080, h: 1920 },
  { id: 'banner', label: 'Banner', w: 1600, h: 900 },
];

/* ─── Font loading ──────────────────────────────────────────── */

/** Inject the suite's Google Fonts stylesheet (deduped by href)
 *  and wait until both families are usable on canvas. Resolves
 *  even on failure — the canvas falls back to system serif. */
export async function ensureSuiteFonts(theme: SuiteTheme): Promise<void> {
  if (typeof document === 'undefined') return;
  const href = theme.fonts.googleHref;
  const alreadyLinked = Array.from(
    document.querySelectorAll('link[data-pl-share-kit-font="1"]'),
  ).some((l) => l.getAttribute('href') === href);
  if (!alreadyLinked) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute('data-pl-share-kit-font', '1');
    document.head.appendChild(link);
  }
  try {
    await Promise.all([
      document.fonts.load(`500 64px "${theme.fonts.displayFamily}"`),
      document.fonts.load(`italic 500 64px "${theme.fonts.displayFamily}"`),
      document.fonts.load(`500 32px "${theme.fonts.bodyFamily}"`),
      document.fonts.load(`600 32px "${theme.fonts.bodyFamily}"`),
    ]);
    await document.fonts.ready;
  } catch {
    /* Font load failed — system fallbacks in the stacks still draw. */
  }
}

/* ─── Image loading (CORS-safe) ─────────────────────────────── */

/** Loads with crossOrigin=anonymous so a successful load can't
 *  taint the canvas. Any failure (404, CORS denial) resolves
 *  null — caller falls back to the typographic design. */
function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') { resolve(null); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/* ─── Text helpers ──────────────────────────────────────────── */

function displayStack(theme: SuiteTheme): string {
  return `"${theme.fonts.displayFamily}", Georgia, serif`;
}
function bodyStack(theme: SuiteTheme): string {
  return `"${theme.fonts.bodyFamily}", system-ui, sans-serif`;
}

/** Centered letter-tracked text — canvas has no reliable
 *  cross-browser letter-spacing, so we place glyphs manually. */
function drawTracked(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  tracking: number,
): void {
  const prevAlign = ctx.textAlign;
  ctx.textAlign = 'left';
  const chars = Array.from(text);
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + tracking * Math.max(0, chars.length - 1);
  let x = cx - total / 2;
  chars.forEach((c, i) => {
    ctx.fillText(c, x, y);
    x += widths[i] + tracking;
  });
  ctx.textAlign = prevAlign;
}

/** Shrink the font size until `text` fits `maxWidth`. Returns the
 *  px actually set on ctx.font. */
function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  family: string,
  weight: number,
  italic: boolean,
  startPx: number,
  maxWidth: number,
): number {
  let px = startPx;
  for (;;) {
    ctx.font = `${italic ? 'italic ' : ''}${weight} ${px}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth || px <= 14) return px;
    px -= 2;
  }
}

/* ─── The painter ───────────────────────────────────────────── */

function occasionLabel(theme: SuiteTheme): string {
  return theme.occasion.replace(/-/g, ' ').toUpperCase();
}

function headlineFor(theme: SuiteTheme): string {
  return theme.names.filter(Boolean).join(' & ') || 'Our celebration';
}

function crestText(theme: SuiteTheme): string {
  const { initA, initB } = theme.monogram;
  if (initA && initB) return `${initA} · ${initB}`;
  return initA || initB || '';
}

/** Cover-fit drawImage into a clipped rect. */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number, y: number, w: number, h: number,
): void {
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  ctx.restore();
}

/** Accent + gold hairline double frame, drawn over everything. */
function drawFrame(ctx: CanvasRenderingContext2D, theme: SuiteTheme, w: number, h: number, S: number): void {
  ctx.strokeStyle = theme.palette.accent;
  ctx.lineWidth = 2.5 * S;
  const a = 30 * S;
  ctx.strokeRect(a, a, w - a * 2, h - a * 2);
  ctx.strokeStyle = theme.palette.gold;
  ctx.lineWidth = 1.5 * S;
  const g = 44 * S;
  ctx.strokeRect(g, g, w - g * 2, h - g * 2);
}

/** The typographic stack: crest ring + monogram, kicker, names,
 *  gold rule, date · venue. Centered horizontally at cx, the whole
 *  stack centered vertically on cy. */
function drawStack(
  ctx: CanvasRenderingContext2D,
  theme: SuiteTheme,
  cx: number,
  cy: number,
  maxTextW: number,
  S: number,
): void {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  /* Crest — gold ring + display-italic initials in accent. */
  const crest = crestText(theme);
  if (crest) {
    const ringY = cy - 226 * S;
    const ringR = 76 * S;
    ctx.strokeStyle = theme.palette.gold;
    ctx.lineWidth = 1.5 * S;
    ctx.beginPath();
    ctx.arc(cx, ringY, ringR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = theme.palette.accent;
    fitFont(ctx, crest, displayStack(theme), 500, true, 52 * S, ringR * 1.6);
    ctx.fillText(crest, cx, ringY + 2 * S);
  }

  /* Kicker — occasion in tracked mono-style caps, gold. */
  ctx.fillStyle = theme.palette.gold;
  ctx.font = `600 ${23 * S}px ${bodyStack(theme)}`;
  drawTracked(ctx, occasionLabel(theme), cx, cy - 96 * S, 8 * S);

  /* Names — display face, ink, fit-to-width. */
  ctx.fillStyle = theme.palette.ink;
  fitFont(ctx, headlineFor(theme), displayStack(theme), 500, false, 92 * S, maxTextW);
  ctx.fillText(headlineFor(theme), cx, cy + 8 * S);

  /* Gold rule. */
  ctx.fillStyle = theme.palette.gold;
  ctx.fillRect(cx - 55 * S, cy + 84 * S, 110 * S, 2 * S);

  /* Date · venue — body face, soft ink, tracked caps. */
  const detail = [theme.eventDate, theme.venue].filter(Boolean).join('  ·  ').toUpperCase();
  if (detail) {
    ctx.fillStyle = theme.palette.inkSoft;
    fitFont(ctx, detail, bodyStack(theme), 500, false, 26 * S, maxTextW * 1.1);
    drawTracked(ctx, detail, cx, cy + 142 * S, 4 * S);
  }
}

function paint(
  ctx: CanvasRenderingContext2D,
  theme: SuiteTheme,
  size: ShareKitSize,
  photo: HTMLImageElement | null,
): void {
  const { w, h } = size;
  const S = Math.min(w, h) / 1080;

  /* 1 · Paper. */
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = theme.palette.paper;
  ctx.fillRect(0, 0, w, h);

  /* 2 · Story-only cover photo as the upper region. */
  let stackCy = h / 2;
  if (photo && size.id === 'story') {
    const photoH = h * 0.58;
    drawCover(ctx, photo, 0, 0, w, photoH);
    /* Gold seam where photo meets the paper band. */
    ctx.fillStyle = theme.palette.gold;
    ctx.fillRect(0, photoH - 1 * S, w, 2 * S);
    stackCy = photoH + (h - photoH) / 2;
  }

  /* 3 · Type stack on the paper region. */
  drawStack(ctx, theme, w / 2, stackCy, w - 220 * S, S);

  /* 4 · Frame over everything (hairline-framed photos, BRAND §10). */
  drawFrame(ctx, theme, w, h, S);
}

/** Draw one share-kit design onto `canvas` (resizes it to the
 *  exact export pixels). Story loads the cover photo first; a
 *  failed or canvas-tainting photo silently falls back to the
 *  typographic-only layout. */
export async function drawShareKitCanvas(
  canvas: HTMLCanvasElement,
  theme: SuiteTheme,
  size: ShareKitSize,
): Promise<void> {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  canvas.width = size.w;
  canvas.height = size.h;

  const photo = size.id === 'story' && theme.photos.cover
    ? await loadImage(theme.photos.cover)
    : null;

  paint(ctx, theme, size, photo);

  /* Belt-and-braces taint check: crossOrigin=anonymous should make
     taint impossible, but if the canvas got poisoned anyway (e.g.
     odd proxy / redirect behaviour) we redraw typographic-only so
     toBlob keeps working. */
  if (photo) {
    try {
      ctx.getImageData(0, 0, 1, 1);
    } catch {
      paint(ctx, theme, size, null);
    }
  }
}

/* ─── Download ──────────────────────────────────────────────── */

export function downloadCanvasPng(canvas: HTMLCanvasElement, filename: string): void {
  try {
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5_000);
    }, 'image/png');
  } catch {
    /* Tainted or detached canvas — nothing sensible to do. */
  }
}
