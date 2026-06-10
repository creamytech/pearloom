// ─────────────────────────────────────────────────────────────
// RSVP-layout variants — registers the 4 prototype variants
// (centered, split, banner, minimal) with the BlockStyle registry.
// Source: ClaudeDesign/shared/site-config.jsx LAYOUTS.rsvp +
// the RsvpBlock renderer in ClaudeDesign/pages/themed-site.jsx.
//
// Renderer status: the current ThemedSiteRenderer.ThemedRsvp
// implements the 'centered' layout. Other variants live in the
// registry for picker discovery; the section renderer falls back
// to centered when an unsupported id is picked.
// ─────────────────────────────────────────────────────────────

import { registerBlockStyle } from '@/lib/block-engine/block-styles';
import { createElement } from 'react';
import { LAYOUTS } from '@/lib/site-layouts/registry';

function NoopRsvpComponent(): null {
  return null;
}

// ── Mini SVG previews. ──

function CenteredPreview() {
  return createElement(
    'svg',
    { viewBox: '0 0 64 40', width: '100%', height: '100%' },
    [
      // Dark ground
      createElement('rect', { key: 'bg', x: 4, y: 4, width: 56, height: 32, rx: 1.5, fill: '#1A1B2E' }),
      createElement('text', {
        key: 'e',
        x: 32,
        y: 14,
        textAnchor: 'middle',
        fontFamily: 'sans-serif',
        fontSize: 2.5,
        fill: '#C9A24B',
      }, 'KINDLY REPLY'),
      createElement('text', {
        key: 't',
        x: 32,
        y: 22,
        textAnchor: 'middle',
        fontFamily: 'serif',
        fontSize: 7,
        fontStyle: 'italic',
        fill: '#F1EBDD',
      }, 'Save your seat'),
      createElement('rect', { key: 'cta', x: 24, y: 26, width: 16, height: 5, rx: 2.5, fill: '#C9A24B' }),
    ],
  );
}

function SplitPreview() {
  return createElement(
    'svg',
    { viewBox: '0 0 64 40', width: '100%', height: '100%' },
    [
      // Photo left
      createElement('rect', { key: 'ph', x: 4, y: 4, width: 28, height: 32, rx: 1, fill: '#8B6F8E', opacity: 0.55 }),
      // Right panel
      createElement('text', { key: 'e', x: 35, y: 14, fontFamily: 'sans-serif', fontSize: 2.3, fill: '#C6703D' }, 'KINDLY REPLY'),
      createElement('text', { key: 't', x: 35, y: 21, fontFamily: 'serif', fontSize: 6, fontStyle: 'italic', fill: '#0E0D0B' }, 'Save your seat'),
      createElement('rect', { key: 'cta', x: 35, y: 26, width: 14, height: 5, rx: 2.5, fill: '#5C6B3F' }),
    ],
  );
}

function BannerPreview() {
  return createElement(
    'svg',
    { viewBox: '0 0 64 40', width: '100%', height: '100%' },
    [
      // Thin band horizontal
      createElement('rect', { key: 'b', x: 2, y: 14, width: 60, height: 12, rx: 1, fill: '#1A1B2E' }),
      createElement('text', { key: 'e', x: 5, y: 18, fontFamily: 'sans-serif', fontSize: 2, fill: '#C9A24B' }, 'RSVP BY APR 28'),
      createElement('text', { key: 't', x: 5, y: 23.5, fontFamily: 'serif', fontSize: 4.5, fontStyle: 'italic', fill: '#F1EBDD' }, 'Save your seat'),
      createElement('rect', { key: 'cta', x: 44, y: 17, width: 14, height: 5, rx: 2.5, fill: '#C9A24B' }),
    ],
  );
}

function MinimalPreview() {
  return createElement(
    'svg',
    { viewBox: '0 0 64 40', width: '100%', height: '100%' },
    [
      createElement('text', { key: 'e', x: 32, y: 14, textAnchor: 'middle', fontFamily: 'sans-serif', fontSize: 2.3, fill: '#6F6557' }, 'KINDLY REPLY'),
      createElement('text', { key: 't', x: 32, y: 22, textAnchor: 'middle', fontFamily: 'serif', fontSize: 6, fontStyle: 'italic', fill: '#0E0D0B' }, 'Save your seat'),
      createElement('line', { key: 'r1', x1: 22, y1: 26, x2: 42, y2: 26, stroke: '#C19A4B', strokeWidth: 0.4 }),
      createElement('text', { key: 'c', x: 32, y: 32, textAnchor: 'middle', fontFamily: 'sans-serif', fontSize: 2.5, fill: '#0E0D0B' }, 'RSVP →'),
    ],
  );
}

const PREVIEW_BY_ID: Record<string, () => ReturnType<typeof createElement>> = {
  centered: CenteredPreview,
  split: SplitPreview,
  banner: BannerPreview,
  minimal: MinimalPreview,
};

for (const variant of LAYOUTS.rsvp) {
  const previewFn = PREVIEW_BY_ID[variant.id];
  registerBlockStyle({
    blockType: 'rsvp',
    id: variant.id,
    label: variant.label,
    description: variant.oneLiner,
    preview: previewFn ? createElement(previewFn) : null,
    Component: NoopRsvpComponent,
  });
}

export const RSVP_VARIANTS_REGISTERED = true;
