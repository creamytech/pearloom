import React from 'react';

export interface FolioProps {
  /** Eyebrow word (e.g. "Edition", "Stage", "Folio"). */
  kicker?: string;
  /** Index — auto-prefixed with "No." and zero-padded if numeric. */
  no?: number | string;
  /** Label that follows the number. */
  label?: React.ReactNode;
  /** Layout: row (default) or column for large headers. */
  direction?: 'row' | 'column';
  /** Rule + glyph color. Defaults to gold. */
  ruleColor?: string;
  /** Text color. Defaults to muted. */
  color?: string;
  /** Show the flanking rules. Default true. */
  rules?: boolean;
  /** Visual weight. Default 'sm'. */
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  style?: React.CSSProperties;
}

/** The editorial corner-mark — mono label + gold rule, "page number" feel. */
export function Folio(props: FolioProps): JSX.Element;
