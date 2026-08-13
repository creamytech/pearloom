// ─────────────────────────────────────────────────────────────
// Pearloom / scripts/extract-assets.ts
//
// Extracts individual assets from a sheet of multiple transparent-
// background objects. Walks the alpha channel, runs 8-connectivity
// flood-fill to find connected components, merges components within
// `mergeGap` pixels (so e.g. a flower and its stem stay together),
// crops each bbox with a small padding, trims again, and writes the
// results to `public/assets/v2/{sheet}/{prefix}-NN.png`.
//
// Drop your sheet files here:
//   public/assets/sheets/sheet-1-stills.png
//   public/assets/sheets/sheet-2-icons.png
//   public/assets/sheets/sheet-3-pears.png
//   public/assets/sheets/sheet-4-threads.png
//   public/assets/sheets/sheet-5-flowers.png
//
// Then run:  npm run assets:extract
// ─────────────────────────────────────────────────────────────

import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';

interface SheetSpec {
  file: string;
  dir: string;
  prefix: string;
  /** Min area (in px²) for a connected component to count. */
  minArea?: number;
  /** Max gap between components that still merges them. */
  mergeGap?: number;
  /**
   * Mode 'alpha' uses the alpha channel; 'white' treats near-white
   * RGB pixels as background. Defaults to 'white' which is what
   * most exported design-tool PNGs actually are (opaque with a
   * white background even if the preview shows a checkerboard).
   */
  mode?: 'alpha' | 'white';
  /** Alpha threshold (0-255) — pixels below this are treated as transparent (alpha mode). */
  alphaThreshold?: number;
  /**
   * White-mode: pixels where R, G, B are each >= this value are
   * treated as background. Default 245.
   */
  whiteThreshold?: number;
  /** Extra padding (px) around each final crop. */
  padding?: number;
}

// Composite UI reference sheets — mix of decorative PNGs + pre-
// rendered UI cards. The decorations we keep; the UI cards get
// rebuilt in React.
//
// Merge gaps are tight here (4–8px) because each sheet packs many
// distinct elements with narrow gutters. Anti-aliased edges plus the
// 20-px alpha threshold still let connected components catch their
// own soft shadows.
const SHEETS: SheetSpec[] = [
  { file: 'sheet-6-wizard.png', dir: 'wizard', prefix: 'wizard', minArea: 1500, mergeGap: 4, padding: 8, mode: 'white', whiteThreshold: 238 },
  { file: 'sheet-7-editor.png', dir: 'editor', prefix: 'editor', minArea: 1200, mergeGap: 6, padding: 8, mode: 'white', whiteThreshold: 240 },
  { file: 'sheet-8-timeline.png', dir: 'timeline', prefix: 'timeline', minArea: 1500, mergeGap: 4, padding: 8, mode: 'white', whiteThreshold: 238 },
  { file: 'sheet-9-remember.png', dir: 'remember', prefix: 'remember', minArea: 1500, mergeGap: 4, padding: 8, mode: 'white', whiteThreshold: 238 },
  { file: 'sheet-10-branding.png', dir: 'branding', prefix: 'branding', minArea: 1200, mergeGap: 3, padding: 8, mode: 'white', whiteThreshold: 235 },
];

const SHEETS_DIR = path.join(process.cwd(), 'public', 'assets', 'sheets');
const OUT_ROOT = path.join(process.cwd(), 'public', 'assets', 'v2');

interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  area: number;
}

function rectsOverlap(a: Box, b: Box, gap: number): boolean {
  return (
    a.maxX + gap >= b.minX &&
    b.maxX + gap >= a.minX &&
    a.maxY + gap >= b.minY &&
    b.maxY + gap >= a.minY
  );
}

function mergeBoxes(a: Box, b: Box): Box {
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
    area: a.area + b.area,
  };
}

async function extract(sheet: SheetSpec): Promise<number> {
  const inputPath = path.join(SHEETS_DIR, sheet.file);
  if (!fs.existsSync(inputPath)) {
    console.log(`[skip] ${sheet.file} not found at ${inputPath}`);
    return 0;
  }
  const outDir = path.join(OUT_ROOT, sheet.dir);
  fs.mkdirSync(outDir, { recursive: true });
  // Clean the output dir so stale files don't accumulate
  for (const f of fs.readdirSync(outDir)) {
    if (f.endsWith('.png')) fs.unlinkSync(path.join(outDir, f));
  }

  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const alphaIdx = channels - 1;
  const mode = sheet.mode ?? 'white';
  const alphaT = sheet.alphaThreshold ?? 20;
  const whiteT = sheet.whiteThreshold ?? 245;

  // Foreground mask (1 = element pixel, 0 = background).
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const base = i * channels;
    const a = data[base + alphaIdx];
    if (mode === 'alpha') {
      mask[i] = a > alphaT ? 1 : 0;
    } else {
      // White-background mode: opaque pixel counts as element
      // unless all channels are above whiteT (then it's paper/white).
      const r = data[base];
      const g = data[base + 1];
      const b = data[base + 2];
      const isBackground = a < alphaT || (r >= whiteT && g >= whiteT && b >= whiteT);
      mask[i] = isBackground ? 0 : 1;
    }
  }

  // 8-connectivity flood-fill → components
  const visited = new Uint8Array(width * height);
  const boxes: Box[] = [];
  const minArea = sheet.minArea ?? 1000;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (!mask[idx] || visited[idx]) continue;
      const stack: [number, number][] = [[x, y]];
      visited[idx] = 1;
      let box: Box = { minX: x, minY: y, maxX: x, maxY: y, area: 0 };
      while (stack.length) {
        const [cx, cy] = stack.pop()!;
        box.area++;
        if (cx < box.minX) box.minX = cx;
        if (cx > box.maxX) box.maxX = cx;
        if (cy < box.minY) box.minY = cy;
        if (cy > box.maxY) box.maxY = cy;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            const nidx = ny * width + nx;
            if (visited[nidx] || !mask[nidx]) continue;
            visited[nidx] = 1;
            stack.push([nx, ny]);
          }
        }
      }
      if (box.area >= minArea) boxes.push(box);
    }
  }

  // Merge nearby boxes (petals that detach from stems, sparkles, etc.)
  const gap = sheet.mergeGap ?? 20;
  let merged = true;
  while (merged) {
    merged = false;
    outer: for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        if (rectsOverlap(boxes[i], boxes[j], gap)) {
          boxes[i] = mergeBoxes(boxes[i], boxes[j]);
          boxes.splice(j, 1);
          merged = true;
          break outer;
        }
      }
    }
  }

  // Sort rows top-to-bottom, then left-to-right within a row
  boxes.sort((a, b) => {
    if (Math.abs(a.minY - b.minY) > 40) return a.minY - b.minY;
    return a.minX - b.minX;
  });

  const padding = sheet.padding ?? 8;

  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    const left = Math.max(0, b.minX - padding);
    const top = Math.max(0, b.minY - padding);
    const right = Math.min(width, b.maxX + padding + 1);
    const bottom = Math.min(height, b.maxY + padding + 1);
    const w = right - left;
    const h = bottom - top;

    const name = `${sheet.prefix}-${String(i + 1).padStart(2, '0')}.png`;
    await sharp(inputPath)
      .extract({ left, top, width: w, height: h })
      .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 4 })
      .png({ compressionLevel: 9 })
      .toFile(path.join(outDir, name));
  }

  console.log(`[${sheet.prefix}] extracted ${boxes.length} assets → public/assets/v2/${sheet.dir}/`);
  return boxes.length;
}

async function main() {
  if (!fs.existsSync(SHEETS_DIR)) {
    console.error(`Sheets directory not found: ${SHEETS_DIR}`);
    console.error('Create public/assets/sheets/ and drop your PNG sheets there.');
    process.exit(1);
  }
  let total = 0;
  for (const s of SHEETS) {
    total += await extract(s);
  }
  console.log(`\n✓ Total: ${total} assets extracted`);
  console.log(`  Next: inventory the output and rename semantically in public/assets/v2/*/.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
