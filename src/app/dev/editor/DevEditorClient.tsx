'use client';

// Client wrapper for /dev/editor — EditorRedesign is a client
// component tree (bridge hooks, window listeners), so the page's
// server gate stays in page.tsx and the mount lives here.
//
// QA hook: `?occasion=<id>` (e.g. /dev/editor?occasion=memorial)
// overrides the reference manifest's occasion before mounting, so
// occasion-aware editor behavior (rail chip, core-section gating,
// Event-OS block applicability) is verifiable without a DB.

import { Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import EditorRedesign from '@/components/pearloom/redesign/EditorRedesign';
import { REFERENCE_MANIFEST } from '@/lib/theme-store/__fixtures__/reference-manifest';
import type { StoryManifest } from '@/types';

function DevEditorInner() {
  const params = useSearchParams();
  const occasion = params.get('occasion');
  const manifest = useMemo<StoryManifest>(() => {
    const base = REFERENCE_MANIFEST as StoryManifest;
    if (!occasion) return base;
    return {
      ...(base as unknown as Record<string, unknown>),
      occasion,
    } as unknown as StoryManifest;
  }, [occasion]);

  return (
    <EditorRedesign
      manifest={manifest}
      siteSlug="dev-editor"
      names={['Alex', 'Jamie']}
    />
  );
}

export default function DevEditorClient() {
  return (
    // useSearchParams needs a Suspense boundary above it; the page
    // is force-dynamic, but the boundary keeps the build happy.
    <Suspense fallback={null}>
      <DevEditorInner />
    </Suspense>
  );
}
