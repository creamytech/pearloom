// ─────────────────────────────────────────────────────────────
// FAQ-layout variants — registers the 4 prototype variants
// (accordion, twocol, numbered, cards) with the BlockStyle registry.
// Source: ClaudeDesign/shared/site-config.jsx LAYOUTS.faq +
// the FaqBlock renderer in ClaudeDesign/pages/themed-site.jsx.
//
// Renderer status: the current ThemedSiteRenderer.ThemedFaq
// implements the 'accordion' layout. Other variants live in the
// registry for picker discovery; the section renderer falls back
// to accordion when an unsupported id is picked.
// ─────────────────────────────────────────────────────────────

import { registerBlockStyle } from '@/lib/block-engine/block-styles';
import { createElement } from 'react';
import { LAYOUTS } from '@/lib/site-layouts/registry';

function NoopFaqComponent(): null {
  return null;
}

// ── Mini SVG previews. ──

function AccordionPreview() {
  return createElement(
    'svg',
    { viewBox: '0 0 64 40', width: '100%', height: '100%' },
    [
      ...[0, 1, 2, 3].map((row) => [
        createElement('rect', {
          key: `r-${row}`,
          x: 8,
          y: 6 + row * 7,
          width: 48,
          height: 5,
          rx: 0.5,
          fill: '#FBF7EE',
          stroke: '#D8CFB8',
          strokeWidth: 0.4,
        }),
        createElement('rect', { key: `q-${row}`, x: 11, y: 8 + row * 7, width: 32, height: 1.2, fill: '#0E0D0B' }),
        createElement('path', {
          key: `ch-${row}`,
          d: `M50 ${8 + row * 7} l1.5 1.5 -1.5 1.5`,
          fill: 'none',
          stroke: '#6F6557',
          strokeWidth: 0.5,
        }),
      ]).flat(),
    ],
  );
}

function TwoColPreview() {
  return createElement(
    'svg',
    { viewBox: '0 0 64 40', width: '100%', height: '100%' },
    [
      ...[0, 1, 2, 3].map((i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        return [
          createElement('rect', {
            key: `q-${i}`,
            x: 5 + col * 27,
            y: 8 + row * 14,
            width: 21,
            height: 1.4,
            fill: '#5C6B3F',
          }),
          createElement('rect', {
            key: `a-${i}`,
            x: 5 + col * 27,
            y: 11.5 + row * 14,
            width: 23,
            height: 0.8,
            fill: '#6F6557',
            opacity: 0.6,
          }),
          createElement('rect', {
            key: `a2-${i}`,
            x: 5 + col * 27,
            y: 13 + row * 14,
            width: 18,
            height: 0.8,
            fill: '#6F6557',
            opacity: 0.6,
          }),
        ];
      }).flat(),
    ],
  );
}

function NumberedPreview() {
  return createElement(
    'svg',
    { viewBox: '0 0 64 40', width: '100%', height: '100%' },
    [
      ...[0, 1, 2, 3].map((row) => [
        createElement('text', {
          key: `n-${row}`,
          x: 8,
          y: 12 + row * 7,
          fontFamily: 'serif',
          fontSize: 5,
          fill: '#6F6557',
          opacity: 0.7,
        }, `0${row + 1}`),
        createElement('rect', {
          key: `q-${row}`,
          x: 18,
          y: 10 + row * 7,
          width: 30,
          height: 1.3,
          fill: '#0E0D0B',
        }),
        createElement('line', {
          key: `hr-${row}`,
          x1: 4,
          y1: 14 + row * 7,
          x2: 60,
          y2: 14 + row * 7,
          stroke: '#D8CFB8',
          strokeWidth: 0.3,
        }),
      ]).flat(),
    ],
  );
}

function CardsPreview() {
  return createElement(
    'svg',
    { viewBox: '0 0 64 40', width: '100%', height: '100%' },
    [
      ...[0, 1, 2, 3].map((i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        return [
          createElement('rect', {
            key: `c-${i}`,
            x: 5 + col * 27,
            y: 6 + row * 15,
            width: 24,
            height: 13,
            rx: 1.5,
            fill: '#FBF7EE',
            stroke: '#D8CFB8',
            strokeWidth: 0.4,
          }),
          createElement('rect', {
            key: `q-${i}`,
            x: 8 + col * 27,
            y: 10 + row * 15,
            width: 18,
            height: 1.3,
            fill: '#0E0D0B',
          }),
          createElement('rect', {
            key: `a-${i}`,
            x: 8 + col * 27,
            y: 13 + row * 15,
            width: 17,
            height: 0.8,
            fill: '#6F6557',
            opacity: 0.6,
          }),
        ];
      }).flat(),
    ],
  );
}

const PREVIEW_BY_ID: Record<string, () => ReturnType<typeof createElement>> = {
  accordion: AccordionPreview,
  twocol: TwoColPreview,
  numbered: NumberedPreview,
  cards: CardsPreview,
};

for (const variant of LAYOUTS.faq) {
  const previewFn = PREVIEW_BY_ID[variant.id];
  registerBlockStyle({
    blockType: 'faq',
    id: variant.id,
    label: variant.label,
    description: variant.oneLiner,
    preview: previewFn ? createElement(previewFn) : null,
    Component: NoopFaqComponent,
  });
}

export const FAQ_VARIANTS_REGISTERED = true;
