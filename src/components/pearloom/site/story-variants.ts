// ──────────────────────────────────────────────────────────────
// Story-layout variants — registers the 6 layouts that already
// exist in src/components/blocks/StoryLayouts.tsx with the
// BlockStyle registry, so the Inspector picker UI is shared
// with hero (and any future block type with multiple layouts).
//
// We don't refactor StoryLayouts itself — the existing
// `StoryLayout` dispatcher in that file already handles the
// per-type rendering. This file just declares the variant
// metadata (id, label, preview) so the BlockStylePicker can
// surface them.
//
// SiteV8Renderer's StoryVariantSection reads
// `manifest.blockVariants.story.style` first (this file's
// registry IDs), falling back to the legacy `manifest.storyLayout`
// / `manifest.layoutFormat` fields. Existing sites stay
// rendering exactly the same.
// ──────────────────────────────────────────────────────────────

import { registerBlockStyle } from '@/lib/block-engine/block-styles';
import { LAYOUT_OPTIONS, MiniDiagram, type StoryLayoutType } from '@/components/blocks/StoryLayouts';
import { createElement } from 'react';

// The registry's Component is required, but story rendering happens
// upstream in SiteV8Renderer. The Component here is a no-op marker —
// the picker only consumes preview + label + description.
function NoopStoryComponent(): null {
  return null;
}

const STORY_DESCRIPTIONS: Record<StoryLayoutType, string> = {
  parallax: 'Full-bleed photos with scroll depth — cinematic.',
  filmstrip: 'Cinematic horizontal-scroll photo strip per chapter.',
  magazine: 'Editorial photo + text pairing, like a spread.',
  timeline: 'Chronological vine — photos beaded down a centre line.',
  kenburns: 'Slow-zoom photo crops with text overlays.',
  bento: 'Mosaic grid of photos and text per chapter.',
};

for (const opt of LAYOUT_OPTIONS) {
  registerBlockStyle({
    blockType: 'story',
    id: opt.type,
    label: opt.label,
    description: STORY_DESCRIPTIONS[opt.type] ?? opt.desc,
    preview: createElement(MiniDiagram, { type: opt.type }),
    Component: NoopStoryComponent,
  });
}

export const STORY_VARIANTS_REGISTERED = true;
