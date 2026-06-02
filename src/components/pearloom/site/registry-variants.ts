// ─────────────────────────────────────────────────────────────
// Registry-layout variants — registers the 4 prototype variants
// (cards, chips, progress, logowall) with the BlockStyle registry.
// Source: ClaudeDesign/shared/site-config.jsx LAYOUTS.registry +
// the RegistryBlock renderer in ClaudeDesign/pages/themed-site.jsx.
//
// Renderer status: the current ThemedSiteRenderer.ThemedRegistry
// renders the 'cards' variant. Other variants live in the registry
// for picker discovery; renderer falls back to cards when an
// unsupported id is picked.
//
// Phase 2+ will extend ThemedRegistry to dispatch on variant id +
// add the chip / progress hero / logo-wall renderers. The
// honeymoon-fund progress bar shape is captured below in
// RegistryEntryEnriched — consumers can extend manifest.registry
// entries with these optional fields without breaking the
// existing shape.
// ─────────────────────────────────────────────────────────────

import { registerBlockStyle } from '@/lib/block-engine/block-styles';
import { createElement } from 'react';
import { LAYOUTS } from '@/lib/site-layouts/registry';

function NoopRegistryComponent(): null {
  return null;
}

/** Rich registry entry fields the prototype's progress variant
 *  renders. Captures the per-store status + cash-fund percentage.
 *  Renderers read these via
 *  `(entry as unknown as Partial<RegistryEntryEnriched>)` until
 *  StoryManifest catches up. */
export interface RegistryEntryEnriched {
  /** Icon glyph name — 'heart-icon', 'gift', etc. Picker shows
   *  these from the existing icon library. */
  icon?: string;
  /** Sub-label shown under the store name. Eg "62% funded ·
   *  €3,100 of €5,000" or "14 of 32 gifts remaining". */
  status?: string;
  /** Funding percent 0-100. When set, the card / hero renders a
   *  progress bar; CTA reads "Contribute" not "View". */
  fundingPct?: number;
  /** Cash-fund flag. When true, the 'progress' variant promotes
   *  this entry to the hero card. */
  isCashFund?: boolean;
}

// ── Mini SVG previews. ──

function CardsPreview() {
  return createElement(
    'svg',
    { viewBox: '0 0 64 40', width: '100%', height: '100%' },
    [
      ...[0, 1, 2].map((i) => [
        createElement('rect', {
          key: `c-${i}`,
          x: 4 + i * 19,
          y: 8,
          width: 17,
          height: 24,
          rx: 1.5,
          fill: '#FBF7EE',
          stroke: '#D8CFB8',
          strokeWidth: 0.4,
        }),
        createElement('rect', {
          key: `i-${i}`,
          x: 7 + i * 19,
          y: 11,
          width: 6,
          height: 6,
          rx: 1.5,
          fill: '#C6703D',
          opacity: 0.5,
        }),
        createElement('rect', {
          key: `l-${i}`,
          x: 7 + i * 19,
          y: 19,
          width: 11,
          height: 1.4,
          fill: '#0E0D0B',
        }),
        createElement('rect', {
          key: `s-${i}`,
          x: 7 + i * 19,
          y: 22,
          width: 9,
          height: 0.8,
          fill: '#6F6557',
          opacity: 0.6,
        }),
      ]).flat(),
    ],
  );
}

function ChipsPreview() {
  return createElement(
    'svg',
    { viewBox: '0 0 64 40', width: '100%', height: '100%' },
    [
      ...[0, 1, 2].map((i) =>
        createElement('rect', {
          key: `p-${i}`,
          x: 8 + i * 16,
          y: 17,
          width: 14,
          height: 6,
          rx: 3,
          fill: '#FBF7EE',
          stroke: '#D8CFB8',
          strokeWidth: 0.5,
        }),
      ),
      ...[0, 1, 2].map((i) =>
        createElement('rect', {
          key: `t-${i}`,
          x: 10 + i * 16,
          y: 19.5,
          width: 8,
          height: 1.2,
          fill: '#0E0D0B',
        }),
      ),
    ],
  );
}

function ProgressPreview() {
  return createElement(
    'svg',
    { viewBox: '0 0 64 40', width: '100%', height: '100%' },
    [
      // Hero card
      createElement('rect', { key: 'h', x: 8, y: 6, width: 48, height: 18, rx: 2, fill: '#FBF7EE', stroke: '#D8CFB8', strokeWidth: 0.5 }),
      createElement('rect', { key: 't', x: 12, y: 9, width: 26, height: 1.7, fill: '#0E0D0B' }),
      // Progress bar empty + filled portion
      createElement('rect', { key: 'p1', x: 12, y: 16, width: 40, height: 2, rx: 1, fill: '#E5DCEF', opacity: 0.8 }),
      createElement('rect', { key: 'p2', x: 12, y: 16, width: 26, height: 2, rx: 1, fill: '#5C6B3F' }),
      // Sub-chips below
      createElement('rect', { key: 'c1', x: 14, y: 28, width: 14, height: 5, rx: 2.5, fill: '#FBF7EE', stroke: '#D8CFB8', strokeWidth: 0.4 }),
      createElement('rect', { key: 'c2', x: 32, y: 28, width: 14, height: 5, rx: 2.5, fill: '#FBF7EE', stroke: '#D8CFB8', strokeWidth: 0.4 }),
    ],
  );
}

function LogoWallPreview() {
  return createElement(
    'svg',
    { viewBox: '0 0 64 40', width: '100%', height: '100%' },
    [
      ...[0, 1, 2, 3].map((i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        return [
          createElement('rect', {
            key: `t-${i}`,
            x: 6 + col * 27,
            y: 6 + row * 15,
            width: 24,
            height: 13,
            rx: 1.5,
            fill: '#FBF7EE',
            stroke: '#D8CFB8',
            strokeWidth: 0.4,
          }),
          createElement('circle', {
            key: `g-${i}`,
            cx: 12 + col * 27,
            cy: 12 + row * 15,
            r: 2,
            fill: '#C6703D',
            opacity: 0.55,
          }),
          createElement('rect', {
            key: `n-${i}`,
            x: 17 + col * 27,
            y: 11 + row * 15,
            width: 11,
            height: 1.4,
            fill: '#0E0D0B',
          }),
        ];
      }).flat(),
    ],
  );
}

const PREVIEW_BY_ID: Record<string, () => ReturnType<typeof createElement>> = {
  cards: CardsPreview,
  chips: ChipsPreview,
  progress: ProgressPreview,
  logowall: LogoWallPreview,
};

for (const variant of LAYOUTS.registry) {
  const previewFn = PREVIEW_BY_ID[variant.id];
  registerBlockStyle({
    blockType: 'registry',
    id: variant.id,
    label: variant.label,
    description: variant.oneLiner,
    preview: previewFn ? createElement(previewFn) : null,
    Component: NoopRegistryComponent,
  });
}

export const REGISTRY_VARIANTS_REGISTERED = true;
