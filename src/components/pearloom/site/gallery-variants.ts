// ──────────────────────────────────────────────────────────────
// Gallery-layout variants — registers the single current bento
// mosaic implementation as 'mosaic' with the BlockStyle registry.
// Mirrors the story-variants.ts + schedule-variants.ts pattern.
//
// Phase 4 of the layout overhaul (workflow plan dated 2026-05-30).
// Future variants per the plan: Wall (uniform square grid),
// Filmstrip (horizontal scroll), LightboxGrid (3×3 numbered),
// Polaroid scatter (overlapping rotated polaroids).
//
// Renderer continues to read GallerySectionImpl in SiteV8Renderer;
// registerBlockStyle just makes the variant id discoverable so the
// picker can grow with new variants by adding sibling files +
// entries here.
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

registerBlockStyle({
  blockType: 'gallery',
  id: 'mosaic',
  label: 'Bento mosaic',
  description: 'Mixed-size grid — photos of different scales arranged like a bento box.',
  preview: createElement(MosaicPreview),
  Component: NoopGalleryComponent,
});

export const GALLERY_VARIANTS_REGISTERED = true;
