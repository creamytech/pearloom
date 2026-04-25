'use client';

/* ========================================================================
   BlockStyleWrapper — applies per-section style overrides from
   manifest.blockStyles[blockId] without each section having to
   know they exist. Wraps the section contents in a div that:

     • applies a CSS variable for textAlign (so h1/h2/p inside can
       inherit via `text-align: var(--pl-block-text-align, inherit)`)
     • applies extra paddingY (top + bottom)
     • caps maxWidth on the inner container
     • forces text colour
     • hides the whole section when hidden = true

   Drop around the contents inside each section component. The
   underlying <section id="…"> stays the same so anchors + scroll-spy
   continue to work.
   ======================================================================== */

import type { StoryManifest, BlockStyleOverride } from '@/types';
import type { CSSProperties, ElementType, ReactNode } from 'react';

interface Props {
  manifest?: StoryManifest;
  blockId: string;
  children: ReactNode;
  /** Wrapper renders nothing more than its children when no override
   *  applies. Pass `as` to swap the wrapper element if you want a
   *  different tag (defaults to <div>). */
  as?: ElementType;
  /** Inline style merged INTO the wrapper's style. */
  style?: CSSProperties;
}

export function BlockStyleWrapper({ manifest, blockId, children, as: Tag = 'div', style }: Props) {
  const override = readOverride(manifest, blockId);
  if (!override) {
    return <Tag style={style}>{children}</Tag>;
  }
  if (override.hidden) {
    return null;
  }
  const merged: CSSProperties = {
    ...style,
    ...(override.maxWidth ? { maxWidth: override.maxWidth, marginLeft: 'auto', marginRight: 'auto' } : {}),
    ...(override.textAlign ? { textAlign: override.textAlign } : {}),
    ...(override.textColor ? { color: override.textColor } : {}),
    ...(override.paddingY != null ? { paddingTop: `calc(${override.paddingY}px + 0px)`, paddingBottom: `calc(${override.paddingY}px + 0px)` } : {}),
  };
  return <Tag style={merged}>{children}</Tag>;
}

/** Returns true if the section is hidden. Use to short-circuit
 *  render at the section's top level when nothing else should mount. */
export function isBlockHidden(manifest: StoryManifest | undefined, blockId: string): boolean {
  return readOverride(manifest, blockId)?.hidden === true;
}

function readOverride(manifest: StoryManifest | undefined, blockId: string): BlockStyleOverride | null {
  if (!manifest) return null;
  const styles = (manifest as unknown as { blockStyles?: Record<string, BlockStyleOverride> }).blockStyles;
  return styles?.[blockId] ?? null;
}
