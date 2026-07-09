import React from 'react';

export interface ThreadProps {
  /** weave (default) · straight · single · bullet */
  variant?: 'weave' | 'straight' | 'single' | 'bullet';
  /** Any CSS length. Default '100%'. */
  width?: string;
  /** Total height in px — visual weight. Default 14. */
  height?: number;
  /** First strand color. Defaults to olive. */
  color?: string;
  /** Second strand color. Defaults to gold. */
  color2?: string;
  /** Stroke thickness in px. Default 1. */
  weight?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * The Pearloom Thread — the brand's visual atom. Use it for every
 * divider, rule, and editorial flourish instead of <hr>.
 * @startingPoint section="Brand" subtitle="Olive + gold woven divider" viewport="600x60"
 */
export function Thread(props: ThreadProps): JSX.Element;
