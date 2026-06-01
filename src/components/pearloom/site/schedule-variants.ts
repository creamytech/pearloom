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

export const SCHEDULE_VARIANTS_REGISTERED = true;
