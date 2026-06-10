// ─────────────────────────────────────────────────────────────
// Travel-layout variants — registers the 4 prototype variants
// (map, rows, table, carousel) with the BlockStyle registry.
// Source: ClaudeDesign/shared/site-config.jsx LAYOUTS.travel +
// the TravelBlock renderer in ClaudeDesign/pages/themed-site.jsx.
//
// Renderer status: ThemedSiteRenderer.ThemedTravel dispatches on
// `manifest.blockVariants.travel.style` and ships all 4 variants
// (rows / map / table / carousel). The registry entries below
// drive the picker — each Component is a Noop because the actual
// renderers live inside ThemedTravel (they need access to many
// shared helpers — kitCardStyle, EditableText, makePatchHotel,
// ThemedSectionHead — that aren't worth lifting into separate
// files). The picker only reads `.preview`; it doesn't render
// `.Component`.
//
// The rich hotel data shape (stars, reviews, price, distance,
// amenities, blurb, room-block code) is captured below in
// HotelEnriched — consumers can extend manifest.travelInfo.hotels
// entries with these optional fields without breaking the
// existing TravelInfo type.
// ─────────────────────────────────────────────────────────────

import { registerBlockStyle } from '@/lib/block-engine/block-styles';
import { createElement } from 'react';
import { LAYOUTS } from '@/lib/site-layouts/registry';

function NoopTravelComponent(): null {
  return null;
}

/** Rich hotel-card fields the prototype's TravelBlock renders.
 *  Extends the existing TravelInfo.hotels entry shape with
 *  optional fields so the cards can show stars / reviews / price
 *  band / amenities / blurb / room-block code. Renderers read
 *  these via `(h as unknown as Partial<HotelEnriched>)` until
 *  the StoryManifest type catches up. */
export interface HotelEnriched {
  /** Star rating 0-5 (decimal allowed; rendered as nearest int gold stars). */
  rating?: number;
  /** Review count. Displayed next to the rating in parentheses. */
  reviews?: number;
  /** Price band — '$', '$$', '$$$', '$$$$'. */
  price?: '$' | '$$' | '$$$' | '$$$$';
  /** Walking / driving distance string. Eg "8-min walk", "12 km". */
  distance?: string;
  /** 3-5 amenity chips. Eg ['Caldera view', 'Pool', 'Breakfast']. */
  amenities?: string[];
  /** 1-2 sentence editorial blurb. */
  blurb?: string;
  /** Reservation code for the wedding room block. */
  roomBlockCode?: string;
  /** Hero photo URL — when missing, renderer falls back to tone block. */
  photoUrl?: string;
  /** Photo tone hint when no photoUrl — used for the wash fallback. */
  tone?: 'warm' | 'sage' | 'dusk' | 'peach' | 'lavender' | 'cream';
}

// ── Mini SVG previews. ──

function MapPreview() {
  return createElement(
    'svg',
    { viewBox: '0 0 64 40', width: '100%', height: '100%' },
    [
      // Map strip (top half)
      createElement('rect', { key: 'm', x: 4, y: 4, width: 56, height: 14, rx: 1, fill: '#E5DCEF', opacity: 0.7 }),
      createElement('line', { key: 'r1', x1: 8, y1: 9, x2: 34, y2: 11, stroke: '#C49A6F', strokeWidth: 0.6, opacity: 0.7 }),
      createElement('line', { key: 'r2', x1: 26, y1: 14, x2: 56, y2: 12, stroke: '#C49A6F', strokeWidth: 0.6, opacity: 0.7 }),
      createElement('circle', { key: 'p1', cx: 16, cy: 10, r: 1.3, fill: '#C6703D' }),
      createElement('circle', { key: 'p2', cx: 36, cy: 12, r: 1.3, fill: '#C6703D' }),
      createElement('circle', { key: 'p3', cx: 50, cy: 11, r: 1.3, fill: '#C6703D' }),
      // Two hotel cards below
      createElement('rect', { key: 'c1', x: 4, y: 22, width: 27, height: 14, rx: 1.5, fill: '#FBF7EE', stroke: '#D8CFB8', strokeWidth: 0.4 }),
      createElement('rect', { key: 'c2', x: 33, y: 22, width: 27, height: 14, rx: 1.5, fill: '#FBF7EE', stroke: '#D8CFB8', strokeWidth: 0.4 }),
    ],
  );
}

function RowsPreview() {
  return createElement(
    'svg',
    { viewBox: '0 0 64 40', width: '100%', height: '100%' },
    [
      ...[0, 1].map((row) => [
        createElement('rect', {
          key: `r-${row}`,
          x: 4,
          y: 8 + row * 13,
          width: 56,
          height: 11,
          rx: 1.5,
          fill: '#FBF7EE',
          stroke: '#D8CFB8',
          strokeWidth: 0.4,
        }),
        createElement('rect', {
          key: `t-${row}`,
          x: 7,
          y: 10 + row * 13,
          width: 8,
          height: 7,
          rx: 1,
          fill: '#C49A6F',
          opacity: 0.6,
        }),
        createElement('rect', {
          key: `l1-${row}`,
          x: 18,
          y: 11 + row * 13,
          width: 22,
          height: 1.4,
          fill: '#0E0D0B',
        }),
        createElement('rect', {
          key: `l2-${row}`,
          x: 18,
          y: 14 + row * 13,
          width: 32,
          height: 0.9,
          fill: '#6F6557',
          opacity: 0.6,
        }),
      ]).flat(),
    ],
  );
}

function TablePreview() {
  return createElement(
    'svg',
    { viewBox: '0 0 64 40', width: '100%', height: '100%' },
    [
      ...[0, 1, 2].map((row) => [
        createElement('rect', {
          key: `n-${row}`,
          x: 6,
          y: 10 + row * 8,
          width: 18,
          height: 1.4,
          fill: '#0E0D0B',
        }),
        createElement('text', {
          key: `s-${row}`,
          x: 30,
          y: 12 + row * 8,
          fontFamily: 'sans-serif',
          fontSize: 2.5,
          fill: '#C19A4B',
        }, '★ 4.8'),
        createElement('text', {
          key: `p-${row}`,
          x: 42,
          y: 12 + row * 8,
          fontFamily: 'sans-serif',
          fontSize: 2.5,
          fill: '#6F6557',
        }, '$$$'),
        createElement('text', {
          key: `d-${row}`,
          x: 52,
          y: 12 + row * 8,
          fontFamily: 'sans-serif',
          fontSize: 2.5,
          fill: '#C6703D',
        }, '8min'),
        createElement('line', {
          key: `hr-${row}`,
          x1: 6,
          y1: 15 + row * 8,
          x2: 58,
          y2: 15 + row * 8,
          stroke: '#D8CFB8',
          strokeWidth: 0.3,
        }),
      ]).flat(),
    ],
  );
}

function CarouselPreview() {
  return createElement(
    'svg',
    { viewBox: '0 0 64 40', width: '100%', height: '100%' },
    [
      ...[0, 1, 2, 3].map((i) =>
        createElement('rect', {
          key: `c-${i}`,
          x: 4 + i * 14,
          y: 8,
          width: 12,
          height: 24,
          rx: 1.5,
          fill: ['#C49A6F', '#8B6F8E', '#5C6B3F', '#C6703D'][i],
          opacity: 0.55,
        }),
      ),
      createElement('path', {
        key: 'arrow',
        d: 'M58 18 L62 20 L58 22 Z',
        fill: '#6F6557',
        opacity: 0.6,
      }),
    ],
  );
}

const PREVIEW_BY_ID: Record<string, () => ReturnType<typeof createElement>> = {
  map: MapPreview,
  rows: RowsPreview,
  table: TablePreview,
  carousel: CarouselPreview,
};

for (const variant of LAYOUTS.travel) {
  const previewFn = PREVIEW_BY_ID[variant.id];
  registerBlockStyle({
    blockType: 'travel',
    id: variant.id,
    label: variant.label,
    description: variant.oneLiner,
    preview: previewFn ? createElement(previewFn) : null,
    Component: NoopTravelComponent,
  });
}

export const TRAVEL_VARIANTS_REGISTERED = true;
