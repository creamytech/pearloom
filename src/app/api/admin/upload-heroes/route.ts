// POST /api/admin/upload-heroes — Generate and upload all 49 hero SVGs to R2
// Hit this endpoint once after deploy to populate R2 with hero art.
// Protected by CRON_SECRET (same as email cron).

import { NextRequest, NextResponse } from 'next/server';
import { SITE_TEMPLATES } from '@/lib/templates/wedding-templates';
import { generateHeroIllustration } from '@/lib/hero-illustrations';
import { uploadSvg, getR2Url } from '@/lib/r2';
import { getThemeArt } from '@/lib/theme-art';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  // Auth check — use CRON_SECRET
  const auth = req.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: Record<string, { status: string; url?: string; error?: string }> = {};
  let uploaded = 0;
  let failed = 0;

  for (const template of SITE_TEMPLATES) {
    const id = template.id;

    try {
      // Generate hero illustration
      const heroSvg = generateHeroIllustration(id, {
        background: template.theme.colors.background,
        accent: template.theme.colors.accent,
        accent2: template.theme.colors.accentLight,
        foreground: template.theme.colors.foreground,
      });
      const heroUrl = await uploadSvg(`heroes/${id}.svg`, heroSvg);
      results[id] = { status: 'ok', url: heroUrl };

      // Also upload theme art SVGs
      const art = getThemeArt(id);
      if (art.cornerSvg) {
        await uploadSvg(`theme-art/${id}/corner.svg`, art.cornerSvg);
      }
      if (art.heroPatternSvg) {
        await uploadSvg(`theme-art/${id}/pattern.svg`, art.heroPatternSvg);
      }
      if (art.accentSvg) {
        await uploadSvg(`theme-art/${id}/accent.svg`, art.accentSvg);
      }
      if (art.blockArt?.headingDecor) {
        await uploadSvg(`theme-art/${id}/heading-decor.svg`, art.blockArt.headingDecor);
      }

      uploaded++;
    } catch (err) {
      results[id] = { status: 'error', error: String(err) };
      failed++;
    }
  }

  return NextResponse.json({
    total: SITE_TEMPLATES.length,
    uploaded,
    failed,
    results,
  });
}
