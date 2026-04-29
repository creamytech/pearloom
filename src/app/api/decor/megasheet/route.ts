import { NextRequest, NextResponse } from 'next/server';
import { uploadToR2, getR2Url } from '@/lib/r2';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { openaiGenerateImage, getLastOpenAIError } from '@/lib/memory-engine/openai-image';
import { megaSheetPrompt, type DecorContext } from '@/lib/decor/prompts';
import { sliceSheet } from '@/lib/decor/sheet';

// ─────────────────────────────────────────────────────────────
// POST /api/decor/megasheet
//
// One painter call → twelve assets. The model paints a 4×3 sheet
// of editorial decor (8 section stamps · 1 divider · 1 footer
// flourish · 1 hero accent · 1 spare stamp), and the slicer
// crops each cell to its content bounding box.
//
// API cost: 1 generation instead of 4 single-shot calls.
// Quality: each cell gets the same flood-fill + content-trim
// treatment the existing per-slot routes use, so the output is
// identical in quality to the single-shot path. The catch is
// gpt-image-2 doesn't always honour the grid contract; cells that
// fail isolation (>92% removed) are returned with `ok: false`
// and `url: null`. The caller (atelier composer) decides whether
// to retry the whole sheet or accept partial.
// ─────────────────────────────────────────────────────────────

// Cell layout MUST match the row-major order in megaSheetPrompt.
const SHEET_KEYS = [
  'stamp:hero', 'stamp:story', 'stamp:details', 'stamp:schedule',
  'stamp:travel', 'stamp:registry', 'stamp:gallery', 'stamp:rsvp',
  'stamp:faq', 'divider', 'footerBouquet', 'accent',
] as const;

interface MegasheetRequest {
  siteId?: string;
  occasion?: string;
  venue?: string;
  paletteHex?: string[];
  vibe?: string;
  customPrompt?: string;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  // Tighter rate limit — each call is a heavy generation. 2 per
  // hour per IP keeps a malicious caller from emptying the OpenAI
  // wallet, and a normal host only needs one sheet per session.
  const rl = checkRateLimit(`decor-megasheet:${ip}`, { max: 2, windowMs: 60 * 60 * 1000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Megasheet generation is limited to 2 per hour. Try again later.' },
      { status: 429 },
    );
  }

  let body: MegasheetRequest = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const { siteId, occasion, venue, paletteHex, vibe, customPrompt } = body;
  if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI decor generation not configured on this server.' },
      { status: 500 },
    );
  }

  const ctx: DecorContext = {
    occasion: occasion ?? 'wedding',
    paletteHex: paletteHex ?? [],
    venue,
    vibe,
    customPrompt,
  };

  try {
    const prompt = megaSheetPrompt(ctx);
    const result = await openaiGenerateImage({
      apiKey,
      prompt,
      // 1536×1024 = the painter's widest. 4 cols × 3 rows → each
      // cell is 384×341. Plenty of room for a stamp + a margin.
      size: '1536x1024',
      quality: 'high',
      format: 'png',
      // We deliberately DO NOT request `background: 'transparent'`
      // here. gpt-image-2 rejects the flag for some sizes/accounts
      // ("Transparent background is not supported for this model"),
      // and we don't need it — the prompt mandates a flat #FFFFFF
      // backdrop and `sliceSheet()` runs `removeWhiteBackground()`
      // per cell, which converts the white to transparent.
    });
    if (!result?.base64) {
      return NextResponse.json(
        { error: `Painter returned nothing: ${getLastOpenAIError() ?? 'unknown'}` },
        { status: 502 },
      );
    }

    const sheet = Buffer.from(result.base64, 'base64');
    const cells = await sliceSheet(sheet, {
      cols: 4,
      rows: 3,
      keys: [...SHEET_KEYS],
      padding: 12,
      // Stamps are small motifs in a big cell — the inked-pixel
      // ratio runs low. 0.005 (0.5%) keeps the gate forgiving so
      // a single delicate quill isn't rejected.
      minContentRatio: 0.005,
    });

    // Upload every successful cell. Failed cells return null url
    // so the client can show "8 of 12 came out clean — retry?".
    const ts = Date.now();
    const assets: Record<string, { url: string | null; ok: boolean; contentRatio: number }> = {};
    await Promise.all(
      cells.map(async (cell) => {
        if (!cell.ok || cell.buffer.length === 0) {
          assets[cell.key] = { url: null, ok: false, contentRatio: cell.contentRatio };
          return;
        }
        const slot = cell.key.replace(':', '-');
        const r2Key = `decor/${siteId}/${ts}-megasheet-${slot}.png`;
        await uploadToR2(r2Key, cell.buffer, 'image/png');
        assets[cell.key] = {
          url: getR2Url(r2Key),
          ok: true,
          contentRatio: cell.contentRatio,
        };
      }),
    );

    const okCount = Object.values(assets).filter((a) => a.ok).length;
    const sheetKey = `decor/${siteId}/${ts}-megasheet-source.png`;
    // Save the source sheet too — useful if the host wants to
    // re-slice later, and it's the artefact the marketplace will
    // display as the "sheet preview" thumbnail.
    await uploadToR2(sheetKey, sheet, 'image/png');

    return NextResponse.json({
      ok: okCount >= 8,           // 8/12 = "good enough" threshold
      okCount,
      totalCells: cells.length,
      assets,
      sheetUrl: getR2Url(sheetKey),
      prompt,
    });
  } catch (err) {
    console.error('[decor/megasheet] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Megasheet failed' },
      { status: 500 },
    );
  }
}
