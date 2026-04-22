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
  /** Alpha threshold (0-255) — pixels below this are treated as transparent. */
  alphaThreshold?: number;
  /** Extra padding (px) around each final crop. */
  padding?: number;
}

const SHEETS: SheetSpec[] = [
  // Editorial still-lifes — large-ish objects, few merges needed.
  { file: 'sheet-1-stills.png', dir: 'stills', prefix: 'still', minArea: 5000, mergeGap: 20, padding: 8 },
  // Line icons — small, many items, don't merge aggressively.
  { file: 'sheet-2-icons.png', dir: 'icons', prefix: 'icon', minArea: 800, mergeGap: 12, padding: 6 },
  // Pear logos — medium, some have detached sparkles.
  { file: 'sheet-3-pears.png', dir: 'pears', prefix: 'pear', minArea: 1500, mergeGap: 28, padding: 8 },
  // Threads — thin lines, large bboxes, need bigger merge gap.
  { file: 'sheet-4-threads.png', dir: 'threads', prefix: 'thread', minArea: 300, mergeGap: 40, padding: 6 },
  // Pressed flowers — delicate stems/petals easily disconnect.
  { file: 'sheet-5-flowers.png', dir: 'flowers', prefix: 'flower', minArea: 1200, mergeGap: 35, padding: 10 },
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
  const threshold = sheet.alphaThreshold ?? 20;

  // Alpha mask (0/1 byte per pixel)
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    mask[i] = data[i * channels + alphaIdx] > threshold ? 1 : 0;
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
