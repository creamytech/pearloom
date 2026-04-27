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
import { inkFamilyForBackground } from '@/lib/color-utils';

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

// Spacing presets — additive vertical padding applied on top of
// the section's own padding. "comfortable" = no change; cozy
// pulls in, spacious + lush push out. Maps to px.
const SPACING_DELTA: Record<string, number> = {
  cozy: -32,
  comfortable: 0,
  spacious: 32,
  lush: 64,
};

// Card radius presets — applied via a CSS var that v8 card classes
// pick up. Inline-styled cards override this since inline always
// wins over class rules; sections that opt into the var (or use
// `border-radius: var(--pl-block-card-radius, …)`) will follow it.
const CARD_RADIUS_PX: Record<string, number> = {
  sharp: 0,
  soft: 6,
  rounded: 16,
  pillow: 28,
};

export function BlockStyleWrapper({ manifest, blockId, children, as: Tag = 'div', style }: Props) {
  const override = readOverride(manifest, blockId);
  if (!override) {
    return <Tag style={style}>{children}</Tag>;
  }
  if (override.hidden) {
    return null;
  }
  // Smart contrast: when the user picks a section background but
  // doesn't explicitly set textColor, derive an ink family from the
  // background luminance so primary text and secondary text both
  // flip together. This also exposes CSS vars children can read for
  // `var(--ink-soft)` style fallbacks if they want.
  const hasCustomBg = !!override.background
    && override.background !== 'paper'
    && override.background !== 'wash'
    && override.background !== 'mesh';
  const ink = hasCustomBg ? inkFamilyForBackground(override.background) : null;

  // Build CSS vars — ink family for background + card radius for
  // any descendant that opts into the variable.
  const cssVars: Record<string, string> = {};
  if (ink) {
    cssVars['--pl-block-ink'] = ink.ink;
    cssVars['--pl-block-ink-soft'] = ink.inkSoft;
    cssVars['--pl-block-ink-muted'] = ink.inkMuted;
    cssVars['--pl-block-divider'] = ink.divider;
  }
  if (override.cardRadius && CARD_RADIUS_PX[override.cardRadius] != null) {
    cssVars['--pl-block-card-radius'] = `${CARD_RADIUS_PX[override.cardRadius]}px`;
  }

  // Spacing: additive padding on top of any explicit paddingY
  // override. The total stacks: paddingY (raw) + spacing delta.
  const spacingDelta = override.spacing && SPACING_DELTA[override.spacing] != null
    ? SPACING_DELTA[override.spacing]
    : 0;
  const totalPad = (override.paddingY ?? 0) + spacingDelta;

  const merged: CSSProperties = {
    ...(cssVars as CSSProperties),
    ...style,
    ...(hasCustomBg ? { background: override.background } : {}),
    ...(override.maxWidth ? { maxWidth: override.maxWidth, marginLeft: 'auto', marginRight: 'auto' } : {}),
    ...(override.textAlign ? { textAlign: override.textAlign } : {}),
    ...(override.textColor
      ? { color: override.textColor }
      : ink
        ? { color: ink.ink }
        : {}),
    ...(totalPad !== 0 ? { paddingTop: `${totalPad}px`, paddingBottom: `${totalPad}px` } : {}),
  };
  return <Tag style={merged} data-pl-block-styled>{children}</Tag>;
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
