import React from 'react';

export interface ButtonProps {
  children?: React.ReactNode;
  /** ink (default) · olive · paper · terra · ghost · pearl (primary CTA). */
  variant?: 'ink' | 'olive' | 'paper' | 'terra' | 'ghost' | 'pearl';
  /** sm · md (default) · lg. */
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  style?: React.CSSProperties;
}

/**
 * The Pearloom button — pill-shaped, verb-first labels. Use `pearl`
 * for the one primary CTA on a surface; `ink`/`olive` for solid
 * actions, `ghost` for secondary, `terra` for warm emphasis.
 * @startingPoint section="Components" subtitle="Pill buttons — pearl, ink, ghost & more" viewport="520x220"
 */
export function Button(props: ButtonProps): JSX.Element;
