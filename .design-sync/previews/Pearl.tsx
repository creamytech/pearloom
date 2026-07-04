import React from 'react';
import { Pearl } from 'pearloom';

const row: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16 };

/** The flat gold bead — crisp, themeable, the same pearl knotted into the logo. */
export function Bead() {
  return (
    <div style={row}>
      <Pearl size={8} />
      <Pearl size={12} />
      <Pearl size={18} />
      <Pearl size={28} />
    </div>
  );
}

/** The iridescent shimmer dot — for a single living accent. */
export function Iridescent() {
  return (
    <div style={row}>
      <Pearl size={18} iridescent />
      <Pearl size={28} iridescent />
    </div>
  );
}

/** As inline punctuation beside a Fraunces headline. */
export function AsPunctuation() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontFamily: 'var(--pl-font-display)', fontStyle: 'italic', fontSize: 30, color: 'var(--pl-ink)' }}>
      Woven by hand <Pearl size={12} />
    </span>
  );
}
