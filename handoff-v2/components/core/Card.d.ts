import React from 'react';

export interface CardProps {
  children?: React.ReactNode;
  /** Adds a hover lift + shadow bloom. Default false. */
  interactive?: boolean;
  /** Inner padding in px (or any CSS length string). Default 24. */
  padding?: number | string;
  /** Element tag to render. Default 'div'. */
  as?: keyof JSX.IntrinsicElements;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * The paper surface — warm cream, hairline border, restrained radius,
 * soft warm shadow. Cards are paper, never glass.
 * @startingPoint section="Components" subtitle="Warm paper surface" viewport="360x220"
 */
export function Card(props: CardProps): JSX.Element;
