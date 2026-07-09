import React from 'react';

export interface DividerProps {
  /** Center ornament. Default 'fleuron'. */
  ornament?: 'fleuron' | 'pearl' | 'diamond' | 'sprig' | 'infinity' | 'sun' | 'cross';
  /** Any CSS length. Default '100%'. */
  width?: string;
  /** Hairline color. Defaults to the tan divider. */
  color?: string;
  /** Ornament bead color. Defaults to gold. */
  accent?: string;
  /** Ornament stroke color. Defaults to olive. */
  ink?: string;
  /** Hairline thickness in px. Default 1. */
  weight?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Ornamental section divider — a centered fleuron (or other ornament)
 * flanked by fading hairlines. The dressier cousin of the woven Thread.
 * @startingPoint section="Brand" subtitle="Fleuron & ornament section rules" viewport="600x80"
 */
export function Divider(props: DividerProps): JSX.Element;
