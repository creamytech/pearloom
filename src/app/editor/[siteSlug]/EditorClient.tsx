'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / app/editor/[siteSlug]/EditorClient.tsx
//
// Editor mode router. Three modes are available, selected by query:
//   1. ?view=studio   → BuilderV8 (the 3-pane design studio — shell only,
//                        reads theme/palette/motif). Good for quick re-skinning.
//   2. ?view=legacy   → FullscreenEditor (the old deep block editor with
//                        every specialist panel — version history, AI tools,
//                        bulk invite, seating editor, collab presence, etc.)
//   3. (default)      → EditorV8 — the v8 block editor: left outline, live
//                        preview in the middle, per-block field panel on
//                        the right. Uses the new Pearloom design system.
// ─────────────────────────────────────────────────────────────

import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { EditorV8 } from '@/components/pearloom/editor/EditorV8';
import { BuilderV8 } from '@/components/pearloom/pages/BuilderV8';
import type { StoryManifest } from '@/types';

const LegacyFullEditor = dynamic(() => import('./LegacyFullEditor').then((m) => m.LegacyFullEditor), {
  ssr: false,
});

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

  if (view === 'legacy') {
    return <LegacyFullEditor manifest={manifest} siteSlug={siteSlug} names={names} />;
  }

  return <EditorV8 manifest={manifest} siteSlug={siteSlug} names={names} />;
}
