// ─────────────────────────────────────────────────────────────
// Pearloom / editor/panel/index.ts
// Barrel module for editor panel primitives. Every editor panel
// should import from this path — never from the individual files —
// so future refactors don't thrash every import site.
// ─────────────────────────────────────────────────────────────

export { PanelSection, PanelRoot } from './PanelSection';
export type { PanelSectionProps } from './PanelSection';

export { PanelChip, PanelChipGroup } from './PanelChip';
export type { PanelChipProps } from './PanelChip';

export { PanelField, PanelInput, PanelTextarea, panelInputStyle } from './PanelField';
export type { PanelFieldProps } from './PanelField';

export {
  panelText,
  panelWeight,
  panelTracking,
  panelSection,
  panelChip,
  panelDivider,
  eventTypeColors,
  getEventTypeColor,
  colors,
  radius,
  shadow,
  ease,
} from './panel-tokens';
