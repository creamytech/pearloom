import React from 'react';

export interface WeaveLoaderProps {
  /** xs:14 · sm:22 · md:36 · lg:56 · xl:80 (px). Default 'md'. */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Mono-uppercase caption under the loader (e.g. "Threading…"). */
  label?: string;
  /** First strand color. Defaults to olive. */
  color?: string;
  /** Second strand color. Defaults to gold. */
  color2?: string;
  /** Stroke weight in px; auto-scales with size if omitted. */
  weight?: number;
  /** Inline-block alignment for use inside text or buttons. */
  inline?: boolean;
  className?: string;
  style?: React.CSSProperties;
  /** Accessible label. Default 'Threading'. */
  ariaLabel?: string;
}

/**
 * The one Pearloom loader — two threads weaving on a loop. Use it in
 * place of any spinner. Honours prefers-reduced-motion.
 */
export function WeaveLoader(props: WeaveLoaderProps): JSX.Element;
export default WeaveLoader;
