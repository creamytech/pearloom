import React from 'react';

export interface MonogramProps {
  /** First initial. Default 'M'. */
  left?: string;
  /** Second initial. Default 'J'. Ignored when single. */
  right?: string;
  /** Render a single initial (one host) instead of a couple. */
  single?: boolean;
  /** Frame treatment. Default 'ring'. */
  frame?: 'plain' | 'ring' | 'crest' | 'wreath' | 'diamond' | 'interlock';
  /** Pixel size (square). Default 120. */
  size?: number;
  /** Letter color. Defaults to ink. */
  ink?: string;
  /** Frame + ampersand + pearl color. Defaults to gold. */
  accent?: string;
  /** Pearl ring color, matched to the surface. Default cream. */
  paper?: string;
  /** Show the italic ampersand between two initials. Default true. */
  showAmp?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * The couple / host monogram — two initials in Fraunces with an
 * editorial frame. The wedding keystone: save-the-dates, wax-seal
 * favicons, footer sign-offs.
 * @startingPoint section="Brand" subtitle="Couple monogram — six editorial frames" viewport="320x320"
 */
export function Monogram(props: MonogramProps): JSX.Element;
