// ─────────────────────────────────────────────────────────────
// Details-layout variants — registers the 5 prototype variants
// (tiles, iconrow, list, accordion, bento) with the BlockStyle
// registry. Mirrors story-variants.ts + gallery-variants.ts +
// schedule-variants.ts pattern.
//
// Source: ClaudeDesign/shared/site-config.jsx LAYOUTS.details +
// the DetailsBlock renderer in ClaudeDesign/pages/themed-site.jsx.
//
// Renderer status: the current ThemedSiteRenderer.ThemedDetails
// dispatches on kit (classic/ticket/plate/scrapbook/index/minimal)
// rather than these layout variants. Registering them here makes
// the picker discoverable so the editor's Layout tab can preview
// them; the section renderer falls back to the kit-based layout
// when a variant isn't explicitly wired.
// ─────────────────────────────────────────────────────────────

import { registerBlockStyle } from '@/lib/block-engine/block-styles';
import { createElement } from 'react';
import { LAYOUTS } from '@/lib/site-layouts/registry';

function NoopDetailsComponent(): null {
  return null;
}

// ── Mini SVG previews — 64×40 sketches of each layout. ──
// Each reads at a glance even at thumbnail size.

function TilesPreview() {
  return createElement(
    'svg',
    { viewBox: '0 0 64 40', width: '100%', height: '100%' },
    [
      ...[0, 1, 2, 3].map((i) =>
        createElement('rect', {
          key: `tile-${i}`,
          x: 4 + (i % 4) * 15,
          y: 12,
          width: 13,
          height: 16,
          rx: 1.5,
          fill: ['#C49A6F', '#8B6F8E', '#5C6B3F', '#C6703D'][i],
          opacity: 0.55,
        }),
      ),
    ],
  );
}

function IconRowPreview() {
  return createElement(
    'svg',
    { viewBox: '0 0 64 40', width: '100%', height: '100%' },
    [
      ...[0, 1, 2, 3].map((i) => [
        createElement('circle', {
          key: `c-${i}`,
          cx: 10 + i * 15,
          cy: 16,
          r: 4,
          fill: '#C49A6F',
          opacity: 0.55,
        }),
        createElement('rect', {
          key: `l-${i}`,
          x: 6 + i * 15,
          y: 23,
          width: 8,
          height: 1.2,
          fill: '#6F6557',
          opacity: 0.5,
        }),
        createElement('rect', {
          key: `v-${i}`,
          x: 5 + i * 15,
          y: 27,
          width: 10,
          height: 2,
          fill: '#0E0D0B',
          opacity: 0.7,
        }),
      ]).flat(),
    ],
  );
}

function LeaderListPreview() {
  return createElement(
    'svg',
    { viewBox: '0 0 64 40', width: '100%', height: '100%' },
    [
      ...[0, 1, 2, 3].map((row) => [
        createElement('text', {
          key: `k-${row}`,
          x: 6,
          y: 12 + row * 7,
          fontFamily: 'sans-serif',
          fontSize: 3,
          fill: '#6F6557',
        }, ['DATE', 'VENUE', 'DRESS', 'PARKING'][row]),
        createElement('line', {
          key: `dl-${row}`,
          x1: 22,
          y1: 11 + row * 7,
          x2: 50,
          y2: 11 + row * 7,
          stroke: '#6F6557',
          strokeWidth: 0.3,
          strokeDasharray: '0.6 1',
        }),
        createElement('text', {
          key: `v-${row}`,
          x: 58,
          y: 12 + row * 7,
          fontFamily: 'serif',
          fontSize: 3,
          fill: '#0E0D0B',
          textAnchor: 'end',
        }, ['Apr 26', 'Casa', 'Resort', 'On-site'][row]),
      ]).flat(),
    ],
  );
}

function AccordionPreview() {
  return createElement(
    'svg',
    { viewBox: '0 0 64 40', width: '100%', height: '100%' },
    [
      ...[0, 1, 2].map((row) => [
        createElement('rect', {
          key: `r-${row}`,
          x: 6,
          y: 8 + row * 9,
          width: 52,
          height: 7,
          rx: 1.5,
          fill: '#FBF7EE',
          stroke: '#D8CFB8',
          strokeWidth: 0.4,
        }),
        createElement('circle', {
          key: `i-${row}`,
          cx: 10,
          cy: 11.5 + row * 9,
          r: 1.5,
          fill: '#C6703D',
          opacity: 0.6,
        }),
        createElement('rect', {
          key: `l-${row}`,
          x: 14,
          y: 11 + row * 9,
          width: 20,
          height: 1.2,
          fill: '#0E0D0B',
        }),
        createElement('path', {
          key: `ch-${row}`,
          d: `M52 ${10 + row * 9} l2 1.5 -2 1.5`,
          fill: 'none',
          stroke: '#6F6557',
          strokeWidth: 0.5,
        }),
      ]).flat(),
    ],
  );
}

function BentoPreview() {
  return createElement(
    'svg',
    { viewBox: '0 0 64 40', width: '100%', height: '100%' },
    [
      createElement('rect', { key: '1', x: 4, y: 6, width: 56, height: 12, rx: 1.5, fill: '#E5DCEF', opacity: 0.8 }),
      createElement('rect', { key: '2', x: 4, y: 20, width: 27, height: 14, rx: 1.5, fill: '#FBF7EE', stroke: '#D8CFB8', strokeWidth: 0.4 }),
      createElement('rect', { key: '3', x: 33, y: 20, width: 27, height: 14, rx: 1.5, fill: '#FBF7EE', stroke: '#D8CFB8', strokeWidth: 0.4 }),
    ],
  );
}

const PREVIEW_BY_ID: Record<string, () => ReturnType<typeof createElement>> = {
  tiles: TilesPreview,
  iconrow: IconRowPreview,
  list: LeaderListPreview,
  accordion: AccordionPreview,
  bento: BentoPreview,
};

for (const variant of LAYOUTS.details) {
  const previewFn = PREVIEW_BY_ID[variant.id];
  registerBlockStyle({
    blockType: 'details',
    id: variant.id,
    label: variant.label,
    description: variant.oneLiner,
    preview: previewFn ? createElement(previewFn) : null,
    Component: NoopDetailsComponent,
  });
}

export const DETAILS_VARIANTS_REGISTERED = true;
