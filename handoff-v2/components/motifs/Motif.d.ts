import React from 'react';

export type MotifName =
  | 'sprig' | 'laurel' | 'bloom' | 'rings' | 'dove' | 'candle' | 'star'
  | 'sun' | 'wave' | 'cake' | 'vine' | 'cresset' | 'arch' | 'feather';

export interface MotifProps {
  /** Which ornament to draw. Default 'sprig'. */
  name?: MotifName;
  /** Pixel size (square). Default 48. */
  size?: number;
  /** Primary stroke color. Defaults to olive. */
  color?: string;
  /** Accent (bead / flame / tip) color. Defaults to gold. */
  accent?: string;
  /** Stroke weight. Default 1.75 — the house line. */
  weight?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * The Pearloom line-ornament set — single-hand editorial motifs for
 * section openers, bullets, empty states, and sticker decor.
 * @startingPoint section="Brand" subtitle="14 line motifs across every occasion" viewport="560x180"
 */
export function Motif(props: MotifProps): JSX.Element;

/** All motif names, for building pickers. */
export const MOTIF_NAMES: MotifName[];
