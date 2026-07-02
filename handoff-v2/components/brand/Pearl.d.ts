import React from 'react';

export interface PearlProps {
  /** Diameter in px. Default 10. */
  size?: number;
  /** Use the animated iridescent shimmer dot instead of the flat bead. */
  iridescent?: boolean;
  style?: React.CSSProperties;
}

/** The gold pearl bead — inline punctuation and the brand's status/list marker. */
export function Pearl(props: PearlProps): JSX.Element;
