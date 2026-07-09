import React from 'react';

export interface BadgeProps {
  children?: React.ReactNode;
  /** olive (default) · gold · plum · neutral · ink. */
  tone?: 'olive' | 'gold' | 'plum' | 'neutral' | 'ink';
  /** label (default — mono uppercase) · pill (soft rounded). */
  variant?: 'label' | 'pill';
  /** Show a leading status dot. */
  dot?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/** A small status / category marker — mono editorial label or soft pill. */
export function Badge(props: BadgeProps): JSX.Element;
