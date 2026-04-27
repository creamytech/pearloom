// ──────────────────────────────────────────────────────────────
// Pearloom asset library — nav icons.
//
// HOW TO ADD A NEW ICON:
//   1. Drop your .tsx file in this directory. Each file should
//      export a default React component that renders an inline
//      <svg> at the size given by the `size` prop. The SVG should
//      use `currentColor` for any strokes/fills you want themed
//      (so the same glyph reads correctly on light + dark sites).
//      Sample shape:
//
//        export default function MyIcon({ size = 28 }: { size?: number }) {
//          return (
//            <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
//              <path d="..." stroke="currentColor" strokeWidth="1.5" />
//            </svg>
//          );
//        }
//
//   2. Add an entry to NAV_ICON_LIBRARY below — { id, label, Component }.
//      The id is what gets stored in manifest.nav.icon.assetId.
//
//   3. The NavIconPicker auto-discovers everything in NAV_ICON_LIBRARY,
//      no editor changes needed.
// ──────────────────────────────────────────────────────────────

import type { ComponentType } from 'react';
import { Pear } from '../../motifs';
import HeartIcon from './heart';
import RingIcon from './ring';
import LeafIcon from './leaf';
import StarIcon from './star';
import KeyIcon from './key';
import CompassIcon from './compass';

export interface NavIconAsset {
  id: string;
  label: string;
  /** One-line description shown on the picker hover. */
  description?: string;
  /** Renderer — receives a numeric size. */
  Component: ComponentType<{ size?: number }>;
}

// Default Pear glyph wrapper so it fits the same { size } prop.
function PearGlyph({ size = 28 }: { size?: number }) {
  return <Pear size={size} tone="sage" shadow={false} />;
}

export const NAV_ICON_LIBRARY: NavIconAsset[] = [
  { id: 'pear', label: 'Pear', description: 'The Pearloom default mark.', Component: PearGlyph },
  { id: 'heart', label: 'Heart', description: 'A small heart outline.', Component: HeartIcon },
  { id: 'ring', label: 'Ring', description: 'Two interlocking rings.', Component: RingIcon },
  { id: 'leaf', label: 'Leaf', description: 'A single olive leaf.', Component: LeafIcon },
  { id: 'star', label: 'Star', description: 'A six-pointed editorial star.', Component: StarIcon },
  { id: 'key', label: 'Key', description: 'A small ornate key.', Component: KeyIcon },
  { id: 'compass', label: 'Compass', description: 'A north-pointing compass.', Component: CompassIcon },
];

export function getNavIcon(id: string): NavIconAsset | undefined {
  return NAV_ICON_LIBRARY.find((i) => i.id === id);
}
