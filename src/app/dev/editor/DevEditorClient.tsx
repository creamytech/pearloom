'use client';

// Client wrapper for /dev/editor — EditorRedesign is a client
// component tree (bridge hooks, window listeners), so the page's
// server gate stays in page.tsx and the mount lives here.

import EditorRedesign from '@/components/pearloom/redesign/EditorRedesign';
import { REFERENCE_MANIFEST } from '@/lib/theme-store/__fixtures__/reference-manifest';
import type { StoryManifest } from '@/types';

export default function DevEditorClient() {
  return (
    <EditorRedesign
      manifest={REFERENCE_MANIFEST as StoryManifest}
      siteSlug="dev-editor"
      names={['Alex', 'Jamie']}
    />
  );
}
