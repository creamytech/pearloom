// ─────────────────────────────────────────────────────────────
// Pearloom / app/sites/[domain]/manifest.webmanifest/route.ts
//
// Per-site PWA manifest. Returns a JSON manifest specific to the
// guest's site so "Add to Home Screen" installs Alex & Jamie's
// wedding (not Pearloom).
//
// Reads the published manifest's name, theme.colors.background,
// and coverPhoto for the icon. Falls back to Pearloom defaults if
// any field is missing.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getSiteConfig } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  const config = await getSiteConfig(domain);
  if (!config?.manifest) {
    return NextResponse.json({ name: 'Pearloom site' }, { status: 404 });
  }
  const m = config.manifest;
  const names = Array.isArray(config.names) ? config.names.filter(Boolean).join(' & ') : '';
  const occasion = (m as unknown as { occasion?: string }).occasion ?? 'celebration';
  const themeBg = (m as unknown as { theme?: { colors?: { background?: string; accent?: string } } }).theme?.colors;
  const cover = (m as unknown as { coverPhoto?: string }).coverPhoto;

  const manifest = {
    name: names ? `${names} · Pearloom` : 'Pearloom',
    short_name: names || 'Pearloom',
    description: `${names ? names + "'s " : ''}${occasion} site`,
    start_url: `/sites/${domain}`,
    scope: `/sites/${domain}`,
    display: 'standalone',
    orientation: 'portrait',
    theme_color: themeBg?.accent ?? '#5C6B3F',
    background_color: themeBg?.background ?? '#F5EFE2',
    icons: [
      {
        src: cover ?? '/icon-512.png',
        sizes: '512x512',
        type: cover?.endsWith('.png') ? 'image/png' : 'image/jpeg',
        purpose: 'any',
      },
    ],
  };

  return new NextResponse(JSON.stringify(manifest), {
    status: 200,
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
