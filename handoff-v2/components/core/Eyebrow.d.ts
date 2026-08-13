import React from 'react';

export interface EyebrowProps {
  children?: React.ReactNode;
  /** Where the gold rule sits. Default 'leading'. */
  rule?: 'leading' | 'trailing' | 'both' | 'none';
  /** Text color. Defaults to muted. */
  color?: string;
  /** Rule color. Defaults to gold. */
  ruleColor?: string;
  className?: string;
  style?: React.CSSProperties;
}

/** The mono-uppercase section kicker with a 1px gold rule (BRAND §4). */
export function Eyebrow(props: EyebrowProps): JSX.Element;
