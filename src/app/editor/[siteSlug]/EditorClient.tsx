'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / app/editor/[siteSlug]/EditorClient.tsx
//
// Editor mode router. Two modes:
//   1. ?view=studio   → BuilderV8 (the 3-pane design studio — shell
//                        only, reads theme/palette/motif). Good for
//                        quick re-skinning.
//   2. (default)      → EditorV8 — the v8 block editor: left outline,
//                        live preview in the middle, per-block field
//                        panel on the right.
//
// The legacy `?view=legacy` FullscreenEditor mode was sunset
// 2026-04-26 along with its supporting v2 components.
// ─────────────────────────────────────────────────────────────

import { useSearchParams } from 'next/navigation';
import { EditorV8 } from '@/components/pearloom/editor/EditorV8';
import { BuilderV8 } from '@/components/pearloom/pages/BuilderV8';
import type { StoryManifest } from '@/types';

interface EditorClientProps {
  manifest: StoryManifest;
  siteSlug: string;
  names: [string, string];
}

export default function EditorClient({ manifest, siteSlug, names }: EditorClientProps) {
  const searchParams = useSearchParams();
  const view = searchParams.get('view');

  if (view === 'studio') {
    return <BuilderV8 manifest={manifest} siteSlug={siteSlug} names={names} />;
  }

  return <EditorV8 manifest={manifest} siteSlug={siteSlug} names={names} />;
}
