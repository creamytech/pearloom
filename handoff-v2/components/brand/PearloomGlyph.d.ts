import React from 'react';

export interface PearloomGlyphProps {
  /** Pixel height; width scales to the 96:112 mark ratio. Default 32. */
  size?: number;
  /** Thread color (the pear + stem + leaf). Defaults to brand olive. */
  color?: string;
  /** Weft + pearl color. Defaults to brand gold. */
  gold?: string;
  /** Pearl ring color, matched to the surface paper. Default cream. */
  paper?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * The Pearloom brand mark — the solid pear with a carved spiral core,
 * stem and leaf (final signed-off silhouette). One `color` paints the
 * whole mark; reverses cleanly to a cream knockout.
 * @startingPoint section="Brand" subtitle="The Pearloom pear mark" viewport="240x300"
 */
export function PearloomGlyph(props: PearloomGlyphProps): JSX.Element;

export interface PearloomWordmarkProps {
  /** Cap height in px. Default 24. */
  size?: number;
  /** Glyph fill. Defaults to ink. */
  color?: string;
  style?: React.CSSProperties;
}

/** The final vectorized "pearloom" lettering, recolored to brand olive. */
export function PearloomWordmark(props: PearloomWordmarkProps): JSX.Element;

export interface PearloomLogoProps {
  size?: number;
  color?: string;
}

/** Glyph + wordmark lockup. */
export function PearloomLogo(props: PearloomLogoProps): JSX.Element;
