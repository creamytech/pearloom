'use client';

// Client wrapper for /dev/editor — EditorRedesign is a client
// component tree (bridge hooks, window listeners), so the page's
// server gate stays in page.tsx and the mount lives here.
//
// QA hook: `?occasion=<id>` (e.g. /dev/editor?occasion=memorial)
// overrides the reference manifest's occasion before mounting, so
// occasion-aware editor behavior (rail chip, core-section gating,
// Event-OS block applicability) is verifiable without a DB.
//
// QA hook: `?blank=1` strips every host-authored content field
// (chapters, events, faqs, photos, details, hotels, stores…) so the
// editor's empty-section placeholders are verifiable without a DB —
// the state a brand-new wizard-less site mounts in.

import { Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import EditorRedesign from '@/components/pearloom/redesign/EditorRedesign';
import { REFERENCE_MANIFEST } from '@/lib/theme-store/__fixtures__/reference-manifest';
import type { StoryManifest } from '@/types';

/* Content fields a real host authors — `?blank=1` deletes all of
   them so every section renders its no-content editor state. */
const BLANK_STRIPPED_FIELDS = [
  'chapters', 'storySection', 'events', 'faqs', 'detailsCards',
  'galleryImages', 'galleryCaptions', 'galleryTones', 'coverPhoto',
  'travelInfo', 'registryStores', 'registryIntro', 'registryFunds',
  'poetry', 'tagline', 'copy', 'music', 'rsvpDeadline',
] as const;

function DevEditorInner() {
  const params = useSearchParams();
  const occasion = params.get('occasion');
  const blank = params.get('blank') === '1';
  // QA hook: `?theme=<id>` (midnight / editorial / …) overrides the
  // reference manifest's site theme so the empty-section placeholders
  // are verifiable on a DARK site theme without a DB. Clears the
  // pack-set themeVars so themeId is the sole resolution axis.
  const theme = params.get('theme');
  // QA hook: `?blocks=countdown,map,music` appends opt-in core /
  // Event-OS sections to blockOrder so their empty editor states are
  // verifiable (they render only when added via the Add-Section
  // picker in normal use).
  const blocks = params.get('blocks');
  // QA hook: `?layouts=music:jukebox,rsvp:split` overrides per-section
  // variants so empty/full layouts are verifiable in the editor
  // canvas (mirrors /dev/site's knob).
  const layoutsParam = params.get('layouts');
  // QA hook: `?cover=/assets/….png` seeds a cover photo (local
  // public asset — the sandbox blocks external images) so photo
  // slots + the Reframe drag are verifiable without an upload.
  const cover = params.get('cover');
  const manifest = useMemo<StoryManifest>(() => {
    const base = REFERENCE_MANIFEST as StoryManifest;
    if (!occasion && !blank && !theme && !blocks && !layoutsParam && !cover) return base;
    const next: Record<string, unknown> = {
      ...(base as unknown as Record<string, unknown>),
      ...(occasion ? { occasion } : {}),
      ...(theme ? { themeId: theme } : {}),
      ...(cover ? { coverPhoto: cover } : {}),
    };
    if (theme) delete next.themeVars;
    if (blocks) {
      const existing = Array.isArray(next.blockOrder) ? (next.blockOrder as string[]) : [];
      const added = blocks.split(',').map((s) => s.trim()).filter(Boolean);
      next.blockOrder = [...existing, ...added.filter((b) => !existing.includes(b))];
    }
    if (layoutsParam) {
      const overrides: Record<string, string> = {};
      for (const pair of layoutsParam.split(',')) {
        const [sec, variant] = pair.split(':').map((s) => s.trim());
        if (sec && variant) overrides[sec] = variant;
      }
      next.layouts = { ...(next.layouts as Record<string, string> | undefined), ...overrides };
    }
    if (blank) for (const f of BLANK_STRIPPED_FIELDS) delete next[f];
    return next as unknown as StoryManifest;
  }, [occasion, blank, theme, blocks, layoutsParam, cover]);

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
