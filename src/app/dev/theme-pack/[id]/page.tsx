// ─────────────────────────────────────────────────────────────
// /dev/theme-pack/[id] — visual-regression test harness.
//
// Renders a single Theme-Store pack against a frozen reference
// manifest so the Playwright suite at tests/e2e/theme-packs.spec.ts
// can screenshot every pack and diff against a baseline.
//
// This route is dev-only — `notFound()` in production so nothing
// leaks into the public surface. It lives under src/app/dev/
// alongside the other dev-only surfaces. (It previously sat at
// src/app/_test/, but underscore-prefixed folders are PRIVATE in
// the App Router, so that route never resolved — every request
// 404'd.)
//
// The page mounts the same PublishedSiteShell guests see, with
// `applyPackToManifest(pack, REFERENCE_MANIFEST)` so the entire
// theme/kit/motif/divider/foil pipeline exercises end-to-end —
// not just CSS-var inspection.
// ─────────────────────────────────────────────────────────────

import { notFound } from 'next/navigation';
import { PublishedSiteShell } from '@/components/pearloom/site/PublishedSiteShell';
import { getPackById } from '@/lib/theme-store/packs';
import { applyPackToManifest } from '@/lib/theme-store/apply';
import { REFERENCE_MANIFEST, REFERENCE_NAMES } from '@/lib/theme-store/__fixtures__/reference-manifest';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ThemePackTestPage({ params }: Props) {
  // Hard gate — never serve in production. The folder name (`dev`)
  // wouldn't keep it out of a deployed bundle on its own.
  if (process.env.NODE_ENV === 'production') notFound();

  const { id } = await params;
  const pack = getPackById(id);
  if (!pack) notFound();

  const themed = applyPackToManifest(pack, REFERENCE_MANIFEST);

  return (
    <PublishedSiteShell
      manifest={themed}
      names={REFERENCE_NAMES}
      siteSlug={`__test_${pack.id}`}
      prettyUrl={`pearloom.com/dev/theme-pack/${pack.id}`}
    />
  );
}
