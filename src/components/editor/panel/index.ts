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

export { PanelSelect } from './PanelSelect';
export type { PanelSelectProps, PanelSelectOption } from './PanelSelect';

export { PanelColorPicker } from './PanelColorPicker';
export type { PanelColorPickerProps } from './PanelColorPicker';

export { PanelDatePicker } from './PanelDatePicker';
export type { PanelDatePickerProps, PanelDateVariant } from './PanelDatePicker';

export { PanelEmptyState } from './PanelEmptyState';
export type { PanelEmptyStateProps } from './PanelEmptyState';

export { SaveIndicator } from './SaveIndicator';
export type { SaveIndicatorProps, SaveState } from './SaveIndicator';

export {
  panelFont,
  panelText,
  panelLineHeight,
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
