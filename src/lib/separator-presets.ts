// ─────────────────────────────────────────────────────────────
// Pearloom / separator-presets.ts
//
// Hand-crafted SVG presets for the chapter separator slot
// (manifest.vibeSkin.sectionBorderSvg). Used by the inline art
// toolbar's "Style" row — lets users swap between archetypal looks
// (a plain rule, a centered diamond, scattered dots, etc.) without
// paying for an AI regeneration round-trip.
//
// Each preset renders inside a viewBox of 0 0 520 32 so they line
// up cleanly with the default 520×32 separator slot. All strokes
// use `currentColor` so the parent's `color: tint` still drives
// tinting through CSS.
// ─────────────────────────────────────────────────────────────

export interface SeparatorPreset {
  id: string;
  label: string;
  svg: string;
}

export const SEPARATOR_PRESETS: SeparatorPreset[] = [
  {
    id: 'line',
    label: 'Line',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 32" preserveAspectRatio="none" width="100%" height="100%"><line x1="0" y1="16" x2="520" y2="16" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/></svg>`,
  },
  {
    id: 'dots',
    label: 'Dots',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 32" width="100%" height="100%"><g fill="currentColor">${Array.from({ length: 11 }, (_, i) => `<circle cx="${60 + i * 40}" cy="16" r="${i === 5 ? 2.5 : 1.5}"/>`).join('')}</g></svg>`,
  },
  {
    id: 'diamond',
    label: 'Diamond',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 32" width="100%" height="100%"><g stroke="currentColor" fill="none" stroke-width="0.8" stroke-linecap="round"><line x1="40" y1="16" x2="240" y2="16"/><line x1="280" y1="16" x2="480" y2="16"/></g><g fill="currentColor"><polygon points="260,8 268,16 260,24 252,16"/></g></svg>`,
  },
  {
    id: 'wave',
    label: 'Wave',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 32" width="100%" height="100%"><path d="M 0 16 Q 32.5 6 65 16 T 130 16 T 195 16 T 260 16 T 325 16 T 390 16 T 455 16 T 520 16" fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/></svg>`,
  },
  {
    id: 'vine',
    label: 'Vine',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 32" width="100%" height="100%"><g stroke="currentColor" fill="none" stroke-width="0.8" stroke-linecap="round"><line x1="0" y1="16" x2="210" y2="16"/><line x1="310" y1="16" x2="520" y2="16"/><path d="M 240 16 Q 250 6 260 16 Q 270 26 280 16" fill="none"/><circle cx="232" cy="16" r="1.3" fill="currentColor"/><circle cx="288" cy="16" r="1.3" fill="currentColor"/></g></svg>`,
  },
  {
    id: 'ornate',
    label: 'Ornate',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 32" width="100%" height="100%"><g stroke="currentColor" fill="none" stroke-width="0.7" stroke-linecap="round"><line x1="20" y1="16" x2="200" y2="16"/><line x1="320" y1="16" x2="500" y2="16"/><path d="M 210 16 Q 222 10 234 16 Q 246 22 258 16 Q 270 10 282 16 Q 294 22 306 16 Q 310 16 310 16"/><circle cx="260" cy="16" r="2.2" fill="currentColor"/><circle cx="210" cy="16" r="1" fill="currentColor"/><circle cx="310" cy="16" r="1" fill="currentColor"/></g></svg>`,
  },
  {
    id: 'stars',
    label: 'Stars',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 32" width="100%" height="100%"><g stroke="currentColor" fill="none" stroke-width="0.7" stroke-linecap="round"><line x1="0" y1="16" x2="230" y2="16"/><line x1="290" y1="16" x2="520" y2="16"/></g><g fill="currentColor"><path d="M 260 8 L 261.5 14 L 268 16 L 261.5 18 L 260 24 L 258.5 18 L 252 16 L 258.5 14 Z"/><circle cx="240" cy="16" r="1"/><circle cx="280" cy="16" r="1"/></g></svg>`,
  },
];

export function getSeparatorPreset(id: string): SeparatorPreset | undefined {
  return SEPARATOR_PRESETS.find(p => p.id === id);
}
