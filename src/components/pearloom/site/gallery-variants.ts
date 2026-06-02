// ──────────────────────────────────────────────────────────────
// Gallery-layout variants — registers strip / wall / mosaic with
// the BlockStyle registry. Mirrors the story-variants.ts +
// schedule-variants.ts pattern.
//
// Phase 4 of the layout overhaul (workflow plan dated 2026-05-30).
// Future variants per the plan: LightboxGrid (3×3 numbered),
// Polaroid scatter (overlapping rotated polaroids).
//
// Renderer continues to read GallerySectionImpl in ThemedSiteRenderer;
// the section reads manifest.blockVariants?.gallery?.style and
// branches between mosaic (default), strip, and wall layouts.
// Each tile gets an edition-aware frame (Cinema sharp 2px,
// Linen Folder gold hairline, Postcard Box pillow + lift,
// Almanac soft frame, Quiet bare, Coastal cyan-tint).
// ──────────────────────────────────────────────────────────────

import { registerBlockStyle } from '@/lib/block-engine/block-styles';
import { createElement } from 'react';

function NoopGalleryComponent(): null {
  return null;
}

// Mini SVG preview — a 4-tile bento grid suggesting mixed sizes.
function MosaicPreview() {
  return createElement(
    'svg',
    { viewBox: '0 0 64 40', width: '100%', height: '100%' },
    [
      createElement('rect', { key: '1', x: 4, y: 4, width: 28, height: 20, fill: '#C49A6F', opacity: 0.55, rx: 1 }),
      createElement('rect', { key: '2', x: 34, y: 4, width: 12, height: 12, fill: '#8B6F8E', opacity: 0.55, rx: 1 }),
      createElement('rect', { key: '3', x: 48, y: 4, width: 12, height: 12, fill: '#5C6B3F', opacity: 0.55, rx: 1 }),
      createElement('rect', { key: '4', x: 34, y: 18, width: 26, height: 18, fill: '#C6703D', opacity: 0.55, rx: 1 }),
      createElement('rect', { key: '5', x: 4, y: 26, width: 14, height: 10, fill: '#A8BA72', opacity: 0.55, rx: 1 }),
      createElement('rect', { key: '6', x: 20, y: 26, width: 12, height: 10, fill: '#B7A4D0', opacity: 0.55, rx: 1 }),
    ],
  );
}

// Mini SVG preview — horizontal row of equal tiles suggesting
// filmstrip / snap-scroll layout.
function StripPreview() {
  return createElement(
    'svg',
    { viewBox: '0 0 64 40', width: '100%', height: '100%' },
    [
      createElement('rect', { key: '1', x: 4, y: 12, width: 14, height: 18, fill: '#C49A6F', opacity: 0.55, rx: 1 }),
      createElement('rect', { key: '2', x: 20, y: 12, width: 14, height: 18, fill: '#8B6F8E', opacity: 0.55, rx: 1 }),
      createElement('rect', { key: '3', x: 36, y: 12, width: 14, height: 18, fill: '#5C6B3F', opacity: 0.55, rx: 1 }),
      createElement('rect', { key: '4', x: 52, y: 12, width: 14, height: 18, fill: '#C6703D', opacity: 0.55, rx: 1 }),
      // Indicator arrow (right edge)
      createElement('path', {
        key: 'arrow',
        d: 'M58 6 L62 8 L58 10 Z',
        fill: '#6F6557',
        opacity: 0.6,
      }),
    ],
  );
}

// Mini SVG preview — uniform 4×2 grid suggesting wall layout.
function WallPreview() {
  return createElement(
    'svg',
    { viewBox: '0 0 64 40', width: '100%', height: '100%' },
    [
      ...[0, 1, 2, 3].flatMap((col) =>
        [0, 1].map((row) =>
          createElement('rect', {
            key: `t-${col}-${row}`,
            x: 4 + col * 15,
            y: 6 + row * 15,
            width: 13,
            height: 13,
            fill: ['#C49A6F', '#8B6F8E', '#5C6B3F', '#C6703D'][col],
            opacity: 0.55,
            rx: 1,
          }),
        ),
      ),
    ],
  );
}

registerBlockStyle({
  blockType: 'gallery',
  id: 'mosaic',
  label: 'Bento mosaic',
  description: 'Mixed-size grid — photos of different scales arranged like a bento box.',
  preview: createElement(MosaicPreview),
  Component: NoopGalleryComponent,
});

registerBlockStyle({
  blockType: 'gallery',
  id: 'strip',
  label: 'Filmstrip',
  description: 'Horizontal snap-scroll row — photos run sideways at a fixed height with scroll affordances.',
  preview: createElement(StripPreview),
  Component: NoopGalleryComponent,
});

registerBlockStyle({
  blockType: 'gallery',
  id: 'wall',
  label: 'Photo wall',
  description: 'Uniform grid — every tile the same aspect ratio. 4-up desktop, 2-up mobile.',
  preview: createElement(WallPreview),
  Component: NoopGalleryComponent,
});

// ── Prototype variants — extend the existing trio (mosaic / strip
// / wall) with the four the prototype's LAYOUTS.gallery declares.
// Renderer status: registered (picker discoverable, fall back to
// the editor's existing gallery variant until each gets a
// dedicated renderer). Source: ClaudeDesign/shared/site-config.jsx
// LAYOUTS.gallery + the GalleryBlock renderer in themed-site.jsx.

function GridPreview() {
  return createElement(
    'svg',
    { viewBox: '0 0 64 40', width: '100%', height: '100%' },
    [
      ...[0, 1, 2, 3, 4, 5].flatMap((i) => {
        const col = i % 6;
        return [0, 1].map((row) =>
          createElement('rect', {
            key: `t-${i}-${row}`,
            x: 4 + col * 9.5,
            y: 6 + row * 14,
            width: 8,
            height: 12,
            rx: 0.5,
            fill: ['#C49A6F', '#8B6F8E', '#5C6B3F', '#C6703D', '#A8BA72', '#B7A4D0'][col],
            opacity: 0.55,
          }),
        );
      }),
    ],
  );
}

function MasonryPreview() {
  // Waterfall layout with varied heights
  const tiles = [
    { x: 4, y: 4, w: 13, h: 16, fill: '#C49A6F' },
    { x: 4, y: 22, w: 13, h: 10, fill: '#8B6F8E' },
    { x: 18, y: 4, w: 13, h: 11, fill: '#5C6B3F' },
    { x: 18, y: 17, w: 13, h: 15, fill: '#C6703D' },
    { x: 32, y: 4, w: 13, h: 13, fill: '#A8BA72' },
    { x: 32, y: 19, w: 13, h: 13, fill: '#B7A4D0' },
    { x: 46, y: 4, w: 13, h: 17, fill: '#C49A6F' },
    { x: 46, y: 23, w: 13, h: 9, fill: '#5C6B3F' },
  ];
  return createElement(
    'svg',
    { viewBox: '0 0 64 40', width: '100%', height: '100%' },
    tiles.map((t, i) =>
      createElement('rect', {
        key: `m-${i}`,
        x: t.x,
        y: t.y,
        width: t.w,
        height: t.h,
        rx: 0.5,
        fill: t.fill,
        opacity: 0.55,
      }),
    ),
  );
}

function SlideshowPreview() {
  return createElement(
    'svg',
    { viewBox: '0 0 64 40', width: '100%', height: '100%' },
    [
      // Hero photo on top
      createElement('rect', { key: 'h', x: 4, y: 4, width: 56, height: 22, rx: 1, fill: '#8B6F8E', opacity: 0.6 }),
      // Thumbnail strip
      ...[0, 1, 2, 3, 4, 5].map((i) =>
        createElement('rect', {
          key: `t-${i}`,
          x: 4 + i * 9.5,
          y: 28,
          width: 8,
          height: 8,
          rx: 0.5,
          fill: ['#C49A6F', '#8B6F8E', '#5C6B3F', '#C6703D', '#A8BA72', '#B7A4D0'][i],
          opacity: 0.55,
        }),
      ),
    ],
  );
}

function PolaroidPreview() {
  return createElement(
    'svg',
    { viewBox: '0 0 64 40', width: '100%', height: '100%' },
    [
      // Scattered tilted polaroids
      ...[
        { x: 6, y: 6, rot: -6, fill: '#C49A6F' },
        { x: 24, y: 4, rot: 3, fill: '#8B6F8E' },
        { x: 42, y: 8, rot: -3, fill: '#5C6B3F' },
        { x: 14, y: 22, rot: 4, fill: '#C6703D' },
        { x: 34, y: 22, rot: -5, fill: '#A8BA72' },
      ].map((p, i) =>
        createElement('g', { key: `g-${i}`, transform: `rotate(${p.rot} ${p.x + 6} ${p.y + 7})` }, [
          createElement('rect', { key: 'f', x: p.x, y: p.y, width: 12, height: 14, rx: 0.4, fill: '#FFFDF7' }),
          createElement('rect', { key: 'p', x: p.x + 1, y: p.y + 1, width: 10, height: 10, fill: p.fill, opacity: 0.65 }),
        ]),
      ),
    ],
  );
}

const PROTOTYPE_GALLERY_VARIANTS: Array<{
  id: string;
  label: string;
  description: string;
  preview: () => ReturnType<typeof createElement>;
}> = [
  { id: 'grid',      label: 'Grid',         description: '6-up uniform 1:1 tiles — the editorial default.',                    preview: GridPreview },
  { id: 'masonry',   label: 'Masonry',      description: '4-column waterfall — each tile takes its own aspect.',               preview: MasonryPreview },
  { id: 'slideshow', label: 'Slideshow',    description: 'Hero photo on top, thumbnail strip beneath.',                         preview: SlideshowPreview },
  { id: 'polaroid',  label: 'Polaroid wall', description: 'Scattered tilted polaroids — handwritten, casual.',                  preview: PolaroidPreview },
];

for (const v of PROTOTYPE_GALLERY_VARIANTS) {
  registerBlockStyle({
    blockType: 'gallery',
    id: v.id,
    label: v.label,
    description: v.description,
    preview: createElement(v.preview),
    Component: NoopGalleryComponent,
  });
}

export const GALLERY_VARIANTS_REGISTERED = true;
