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
// ThemedSiteRenderer's StoryVariantSection reads
// `manifest.blockVariants.story.style` first (this file's
// registry IDs), falling back to the legacy `manifest.storyLayout`
// / `manifest.layoutFormat` fields. Existing sites stay
// rendering exactly the same.
// ──────────────────────────────────────────────────────────────

import { registerBlockStyle } from '@/lib/block-engine/block-styles';
import { LAYOUT_OPTIONS, MiniDiagram, type StoryLayoutType } from '@/components/blocks/StoryLayouts';
import { createElement } from 'react';

// The registry's Component is required, but story rendering happens
// upstream in ThemedSiteRenderer. The Component here is a no-op marker —
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

// ── Prototype variants — extend the 6 production layouts with the
// 6 the prototype's LAYOUTS.story declares. Source: themed-site.jsx
// StoryBlock + ClaudeDesign/shared/site-config.jsx.
//
// Renderer status: registered (picker discoverable). The current
// StoryLayouts dispatcher only handles parallax / filmstrip /
// magazine / timeline / kenburns / bento; picking sidebyside /
// stacked / quote / zigzag / letter falls back to the host's
// previously-set layout via the manifest.storyLayout / manifest.
// layoutFormat fields. Phase 4 adds dedicated renderers per the
// prototype's StoryBlock function.

function SideBySidePreview() {
  return createElement(
    'svg',
    { viewBox: '0 0 64 40', width: '100%', height: '100%' },
    [
      createElement('rect', { key: 'ph', x: 4, y: 6, width: 26, height: 28, rx: 0.5, fill: '#C49A6F', opacity: 0.6 }),
      createElement('rect', { key: 't1', x: 33, y: 10, width: 25, height: 1.4, fill: '#0E0D0B' }),
      createElement('rect', { key: 't2', x: 33, y: 14, width: 27, height: 0.8, fill: '#6F6557', opacity: 0.6 }),
      createElement('rect', { key: 't3', x: 33, y: 16.5, width: 24, height: 0.8, fill: '#6F6557', opacity: 0.6 }),
      createElement('rect', { key: 't4', x: 33, y: 19, width: 26, height: 0.8, fill: '#6F6557', opacity: 0.6 }),
      createElement('rect', { key: 'cp1', x: 33, y: 26, width: 8, height: 3, rx: 1.5, fill: '#E5DCEF', opacity: 0.7 }),
      createElement('rect', { key: 'cp2', x: 43, y: 26, width: 10, height: 3, rx: 1.5, fill: '#E5DCEF', opacity: 0.7 }),
    ],
  );
}

function StackedPreview() {
  return createElement(
    'svg',
    { viewBox: '0 0 64 40', width: '100%', height: '100%' },
    [
      createElement('rect', { key: 'ph', x: 16, y: 4, width: 32, height: 14, rx: 0.5, fill: '#C49A6F', opacity: 0.6 }),
      createElement('rect', { key: 't1', x: 20, y: 22, width: 24, height: 1.4, fill: '#0E0D0B' }),
      createElement('rect', { key: 't2', x: 16, y: 26, width: 32, height: 0.8, fill: '#6F6557', opacity: 0.6 }),
      createElement('rect', { key: 't3', x: 16, y: 28.5, width: 30, height: 0.8, fill: '#6F6557', opacity: 0.6 }),
      createElement('rect', { key: 'cp1', x: 22, y: 33, width: 8, height: 3, rx: 1.5, fill: '#E5DCEF', opacity: 0.7 }),
      createElement('rect', { key: 'cp2', x: 32, y: 33, width: 10, height: 3, rx: 1.5, fill: '#E5DCEF', opacity: 0.7 }),
    ],
  );
}

function QuotePreview() {
  return createElement(
    'svg',
    { viewBox: '0 0 64 40', width: '100%', height: '100%' },
    [
      createElement('text', {
        key: 'q1',
        x: 8,
        y: 12,
        fontFamily: 'serif',
        fontSize: 9,
        fill: '#C6703D',
        opacity: 0.5,
      }, '"'),
      createElement('rect', { key: 't1', x: 8, y: 14, width: 48, height: 1.4, fill: '#0E0D0B' }),
      createElement('rect', { key: 't2', x: 12, y: 17.5, width: 40, height: 1.4, fill: '#0E0D0B' }),
      createElement('rect', { key: 't3', x: 16, y: 21, width: 32, height: 1.4, fill: '#0E0D0B' }),
      createElement('line', { key: 'r', x1: 24, y1: 27, x2: 40, y2: 27, stroke: '#B8935A', strokeWidth: 0.4 }),
      createElement('text', {
        key: 'a',
        x: 32,
        y: 33,
        textAnchor: 'middle',
        fontFamily: 'serif',
        fontSize: 3,
        fontStyle: 'italic',
        fill: '#6F6557',
      }, '— anna, summer 2025'),
    ],
  );
}

function ZigzagPreview() {
  return createElement(
    'svg',
    { viewBox: '0 0 64 40', width: '100%', height: '100%' },
    [
      // Row 1: photo left, text right
      createElement('rect', { key: 'p1', x: 4, y: 4, width: 20, height: 14, rx: 0.5, fill: '#C49A6F', opacity: 0.6 }),
      createElement('rect', { key: 't1a', x: 28, y: 8, width: 30, height: 1.3, fill: '#0E0D0B' }),
      createElement('rect', { key: 't1b', x: 28, y: 11.5, width: 26, height: 0.8, fill: '#6F6557', opacity: 0.6 }),
      createElement('rect', { key: 't1c', x: 28, y: 14, width: 28, height: 0.8, fill: '#6F6557', opacity: 0.6 }),
      // Row 2: text left, photo right
      createElement('rect', { key: 'p2', x: 40, y: 22, width: 20, height: 14, rx: 0.5, fill: '#8B6F8E', opacity: 0.6 }),
      createElement('rect', { key: 't2a', x: 6, y: 26, width: 30, height: 1.3, fill: '#0E0D0B' }),
      createElement('rect', { key: 't2b', x: 6, y: 29.5, width: 26, height: 0.8, fill: '#6F6557', opacity: 0.6 }),
      createElement('rect', { key: 't2c', x: 6, y: 32, width: 28, height: 0.8, fill: '#6F6557', opacity: 0.6 }),
    ],
  );
}

function LetterPreview() {
  return createElement(
    'svg',
    { viewBox: '0 0 64 40', width: '100%', height: '100%' },
    [
      // Letter card
      createElement('rect', {
        key: 'l',
        x: 10,
        y: 4,
        width: 44,
        height: 32,
        rx: 1.5,
        fill: '#FBF7EE',
        stroke: '#D8CFB8',
        strokeWidth: 0.5,
      }),
      createElement('rect', { key: 't1', x: 14, y: 10, width: 36, height: 1, fill: '#0E0D0B' }),
      createElement('rect', { key: 't2', x: 14, y: 13, width: 32, height: 0.8, fill: '#0E0D0B' }),
      createElement('rect', { key: 't3', x: 14, y: 16, width: 34, height: 0.8, fill: '#0E0D0B' }),
      createElement('rect', { key: 't4', x: 14, y: 19, width: 30, height: 0.8, fill: '#0E0D0B' }),
      createElement('rect', { key: 't5', x: 14, y: 22, width: 33, height: 0.8, fill: '#0E0D0B' }),
      // Signature
      createElement('text', {
        key: 'sig',
        x: 48,
        y: 32,
        textAnchor: 'end',
        fontFamily: 'cursive',
        fontSize: 6,
        fontStyle: 'italic',
        fill: '#C6703D',
      }, 'anna & ben'),
    ],
  );
}

const PROTOTYPE_STORY_VARIANTS: Array<{
  id: string;
  label: string;
  description: string;
  preview: () => ReturnType<typeof createElement>;
}> = [
  { id: 'sidebyside', label: 'Side by side', description: 'Photo left, narrative right — the editorial default.',          preview: SideBySidePreview },
  { id: 'stacked',    label: 'Stacked',      description: 'Photo on top, narrative below, centered column.',                preview: StackedPreview },
  { id: 'quote',      label: 'Quote-led',    description: 'Pull-quote first, with the body as supporting text underneath.', preview: QuotePreview },
  { id: 'zigzag',     label: 'Zigzag',       description: 'Alternating left-right photo / text rows.',                      preview: ZigzagPreview },
  { id: 'letter',     label: 'Letter',       description: 'A handwritten note on cream paper, signed at the bottom.',       preview: LetterPreview },
];

for (const v of PROTOTYPE_STORY_VARIANTS) {
  registerBlockStyle({
    blockType: 'story',
    id: v.id,
    label: v.label,
    description: v.description,
    preview: createElement(v.preview),
    Component: NoopStoryComponent,
  });
}

export const STORY_VARIANTS_REGISTERED = true;
