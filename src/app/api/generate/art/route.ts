// ─────────────────────────────────────────────────────────────
// Pearloom / api/generate/art/route.ts
// Async raster art generation — called by the client AFTER the
// main /api/generate response is received. Runs Pass 2.5
// (Nano Banana image generation) without blocking site creation.
// ─────────────────────────────────────────────────────────────

// Image generation needs up to 2 minutes (3 images × 25s timeout + overhead)
export const maxDuration = 120;

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { extractCoupleProfile, generateSiteArt } from '@/lib/vibe-engine';
import type { VibeSkin } from '@/lib/vibe-engine';
import { encryptBuffer, isEncryptionEnabled } from '@/lib/crypto';

function getR2Client() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) return null;
  return {
    client: new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    }),
    bucket: process.env.R2_BUCKET_NAME || 'pearloom-photos',
  };
}

async function uploadBase64Art(dataUrl: string, label: string): Promise<string> {
  const r2 = getR2Client();
  if (!r2) return dataUrl;

  try {
    const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) return dataUrl;

    const contentType = match[1];
    const plaintext = Buffer.from(match[2], 'base64');
    const ext = contentType.includes('png') ? 'png' : 'jpg';
    const key = `art/${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const body = isEncryptionEnabled() ? encryptBuffer(plaintext) : plaintext;

    await r2.client.send(new PutObjectCommand({
      Bucket: r2.bucket,
      Key: key,
      Body: body,
      ContentType: 'application/octet-stream',
      CacheControl: 'public, max-age=31536000, immutable',
    }));

    return `/api/img/${key}`;
  } catch (err) {
    console.warn(`[Art Upload] Failed to upload ${label}:`, err instanceof Error ? err.message : err);
    return dataUrl;
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const {
      vibeString,
      palette,
      occasion,
      coupleNames,
      chapters,
      clusterNotes,
    }: {
      vibeString: string;
      palette: VibeSkin['palette'];
      occasion?: string;
      coupleNames: [string, string];
      chapters: Array<{ title: string; description?: string | null; mood?: string | null }>;
      clusterNotes?: Array<{ chapterIndex: number; note: string; location: string | null }>;
    } = body;

    if (!vibeString || !palette || !coupleNames) {
      return NextResponse.json({ error: 'vibeString, palette, and coupleNames are required' }, { status: 400 });
    }

    // Re-extract couple profile (fast, Lite model ~5s) — needed to drive
    // profile-aware art generation (pets, motifs, interests → illustration prompt)
    const coupleProfile = await extractCoupleProfile(
      vibeString,
      (chapters ?? []).map(c => ({ title: c.title, description: c.description ?? '', mood: c.mood ?? '' })),
      apiKey,
      occasion,
      clusterNotes,
    ).catch(() => undefined);

    // Generate raster art (45-75s — the reason this runs async)
    const siteArt = await generateSiteArt(
      vibeString,
      palette,
      apiKey,
      occasion,
      coupleNames,
      coupleProfile,
    );

    // Upload data URLs to R2 for permanent storage (data URLs are too large for DB)
    const [heroArtUrl, ambientArtUrl, artStripUrl] = await Promise.all([
      siteArt.heroArtDataUrl?.startsWith('data:')
        ? uploadBase64Art(siteArt.heroArtDataUrl, 'hero')
        : Promise.resolve(siteArt.heroArtDataUrl),
      siteArt.ambientArtDataUrl?.startsWith('data:')
        ? uploadBase64Art(siteArt.ambientArtDataUrl, 'ambient')
        : Promise.resolve(siteArt.ambientArtDataUrl),
      siteArt.artStripDataUrl?.startsWith('data:')
        ? uploadBase64Art(siteArt.artStripDataUrl, 'strip')
        : Promise.resolve(siteArt.artStripDataUrl),
    ]);

    return NextResponse.json({
      heroArtUrl: heroArtUrl || null,
      ambientArtUrl: ambientArtUrl || null,
      artStripUrl: artStripUrl || null,
    });
  } catch (err) {
    console.error('[generate/art] Error:', err);
    return NextResponse.json({ error: 'Art generation failed' }, { status: 500 });
  }
}
