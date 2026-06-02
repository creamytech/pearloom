// ──────────────────────────────────────────────────────────────
// Schedule-layout variants — registers the single current
// implementation (a vertical timeline rail with dot-per-event) as
// 'run-of-show' with the BlockStyle registry. Mirrors the
// story-variants.ts pattern.
//
// Phase 4 of the layout overhaul (workflow plan dated 2026-05-30).
// Registering even a single variant sets up the picker pattern so
// future variants (Card grid, Index, Live ribbon) can be added by
// dropping a sibling file + an entry here, without touching
// ThemedSiteRenderer's section dispatch.
//
// Renderer continues to read the current ScheduleSectionImpl in
// ThemedSiteRenderer until a future extraction lifts it into a
// dedicated component per variant. registerBlockStyle below just
// makes the variant id discoverable to the editor's picker —
// safe and additive.
// ──────────────────────────────────────────────────────────────

import { registerBlockStyle } from '@/lib/block-engine/block-styles';
import { createElement } from 'react';

function NoopScheduleComponent(): null {
  return null;
}

// Mini SVG preview — vertical dot column to suggest the run-of-show
// rail layout. Renders in the BlockStylePicker tile.
function RunOfShowPreview() {
  return createElement(
    'svg',
    { viewBox: '0 0 64 40', width: '100%', height: '100%' },
    [
      // Left rail line
      createElement('line', {
        key: 'rail',
        x1: 14,
        y1: 6,
        x2: 14,
        y2: 34,
        stroke: '#C49A6F',
        strokeWidth: 0.6,
        opacity: 0.45,
      }),
      // Three event dots + labels
      ...[10, 20, 30].map((y, i) => [
        createElement('circle', { key: `dot-${i}`, cx: 14, cy: y, r: 1.6, fill: '#C6703D' }),
        createElement('line', {
          key: `line-${i}`,
          x1: 22,
          y1: y,
          x2: 54,
          y2: y,
          stroke: '#6F6557',
          strokeWidth: 0.35,
          opacity: 0.65,
        }),
      ]).flat(),
    ],
  );
}

registerBlockStyle({
  blockType: 'schedule',
  id: 'run-of-show',
  label: 'Run of show',
  description: 'Vertical timeline rail with a dot per event — the classic flow.',
  preview: createElement(RunOfShowPreview),
  Component: NoopScheduleComponent,
});

// ── Prototype variants. Renderer status: registered (picker
// discoverable, fall back to run-of-show until each gets a
// dedicated renderer). Source: ClaudeDesign/shared/site-config.jsx
// LAYOUTS.schedule + the ScheduleBlock renderer in themed-site.jsx.

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
          createElement('text', {
            key: `t-${i}`,
            x: 8 + col * 27,
            y: 12 + row * 15,
            fontFamily: 'serif',
            fontSize: 3,
            fontStyle: 'italic',
            fill: '#C6703D',
          }, ['3:00pm', '4:30pm', '6:00pm', '9:00pm'][i]),
          createElement('rect', {
            key: `l-${i}`,
            x: 8 + col * 27,
            y: 14 + row * 15,
            width: 17,
            height: 1.3,
            fill: '#0E0D0B',
          }),
        ];
      }).flat(),
    ],
  );
}

function ListPreview() {
  return createElement(
    'svg',
    { viewBox: '0 0 64 40', width: '100%', height: '100%' },
    [
      ...[0, 1, 2, 3].map((row) => [
        createElement('text', {
          key: `t-${row}`,
          x: 6,
          y: 11 + row * 7,
          fontFamily: 'serif',
          fontSize: 3,
          fontStyle: 'italic',
          fill: '#C6703D',
        }, ['3pm', '4:30pm', '6pm', '9pm'][row]),
        createElement('rect', {
          key: `l-${row}`,
          x: 20,
          y: 9.5 + row * 7,
          width: 32,
          height: 1.3,
          fill: '#0E0D0B',
        }),
        createElement('line', {
          key: `hr-${row}`,
          x1: 5,
          y1: 14 + row * 7,
          x2: 59,
          y2: 14 + row * 7,
          stroke: '#D8CFB8',
          strokeWidth: 0.3,
        }),
      ]).flat(),
    ],
  );
}

function StepperPreview() {
  return createElement(
    'svg',
    { viewBox: '0 0 64 40', width: '100%', height: '100%' },
    [
      ...[0, 1, 2, 3].map((i) => [
        createElement('circle', {
          key: `d-${i}`,
          cx: 10 + i * 14,
          cy: 14,
          r: 3.2,
          fill: '#FBF7EE',
          stroke: '#5C6B3F',
          strokeWidth: 0.8,
        }),
        createElement('text', {
          key: `n-${i}`,
          x: 10 + i * 14,
          y: 15.5,
          textAnchor: 'middle',
          fontFamily: 'serif',
          fontSize: 3,
          fill: '#5C6B3F',
        }, `${i + 1}`),
        createElement('rect', {
          key: `lbl-${i}`,
          x: 5 + i * 14,
          y: 21,
          width: 10,
          height: 1,
          fill: '#0E0D0B',
        }),
      ]).flat(),
      ...[0, 1, 2].map((i) =>
        createElement('line', {
          key: `lk-${i}`,
          x1: 13 + i * 14,
          y1: 14,
          x2: 21 + i * 14,
          y2: 14,
          stroke: '#D8CFB8',
          strokeWidth: 0.6,
        }),
      ),
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
          x: 6,
          y: 12 + row * 7,
          fontFamily: 'serif',
          fontSize: 6,
          fill: '#6F6557',
          opacity: 0.55,
        }, `0${row + 1}`),
        createElement('rect', { key: `l-${row}`, x: 18, y: 10 + row * 7, width: 24, height: 1.3, fill: '#0E0D0B' }),
        createElement('text', {
          key: `t-${row}`,
          x: 58,
          y: 12 + row * 7,
          textAnchor: 'end',
          fontFamily: 'serif',
          fontSize: 3,
          fontStyle: 'italic',
          fill: '#C6703D',
        }, ['3pm', '4:30pm', '6pm', '9pm'][row]),
        createElement('line', {
          key: `hr-${row}`,
          x1: 5,
          y1: 14 + row * 7,
          x2: 59,
          y2: 14 + row * 7,
          stroke: '#D8CFB8',
          strokeWidth: 0.3,
        }),
      ]).flat(),
    ],
  );
}

function TimelinePreview() {
  return createElement(
    'svg',
    { viewBox: '0 0 64 40', width: '100%', height: '100%' },
    [
      createElement('line', {
        key: 'rail',
        x1: 14,
        y1: 6,
        x2: 14,
        y2: 34,
        stroke: '#C49A6F',
        strokeWidth: 0.6,
        opacity: 0.5,
      }),
      ...[10, 20, 30].map((y, i) => [
        createElement('circle', { key: `dot-${i}`, cx: 14, cy: y, r: 1.7, fill: '#C6703D' }),
        createElement('rect', { key: `l-${i}`, x: 22, y: y - 0.7, width: 26, height: 1.3, fill: '#0E0D0B' }),
        createElement('rect', { key: `s-${i}`, x: 22, y: y + 2, width: 32, height: 0.8, fill: '#6F6557', opacity: 0.6 }),
      ]).flat(),
    ],
  );
}

const PROTOTYPE_SCHEDULE_VARIANTS: Array<{
  id: string;
  label: string;
  description: string;
  preview: () => ReturnType<typeof createElement>;
}> = [
  { id: 'cards',    label: 'Cards',    description: 'Grid of event cards — time, title, blurb per tile.', preview: CardsPreview },
  { id: 'list',     label: 'List',     description: 'Rows of time / title / detail with a hairline between each.', preview: ListPreview },
  { id: 'timeline', label: 'Timeline', description: 'Vertical rail with a dot per event.', preview: TimelinePreview },
  { id: 'stepper',  label: 'Stepper',  description: 'Horizontal numbered dots — like a recipe or progress bar.', preview: StepperPreview },
  { id: 'numbered', label: 'Numbered', description: 'Oversized 01, 02, 03 down the left column.', preview: NumberedPreview },
];

for (const v of PROTOTYPE_SCHEDULE_VARIANTS) {
  registerBlockStyle({
    blockType: 'schedule',
    id: v.id,
    label: v.label,
    description: v.description,
    preview: createElement(v.preview),
    Component: NoopScheduleComponent,
  });
}

export const SCHEDULE_VARIANTS_REGISTERED = true;
