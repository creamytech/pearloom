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

export const GALLERY_VARIANTS_REGISTERED = true;
