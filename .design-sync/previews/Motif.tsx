import React from 'react';
import { Motif, MOTIF_NAMES } from 'pearloom';

const cell: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: 84 };
const cap: React.CSSProperties = {
  fontFamily: 'var(--pl-font-mono)', fontSize: 9, letterSpacing: '0.16em',
  textTransform: 'uppercase', color: 'var(--pl-muted)',
};

/** The full line-ornament set — one consistent single-stroke hand across every occasion. */
export function Set() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, maxWidth: 460 }}>
      {(MOTIF_NAMES as string[]).map((name) => (
        <div key={name} style={cell}>
          <Motif name={name} size={44} />
          <span style={cap}>{name}</span>
        </div>
      ))}
    </div>
  );
}

/** Recolored — olive with a gold accent, or a single quiet ink tone. */
export function Colors() {
  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
      <Motif name="bloom" size={64} />
      <Motif name="laurel" size={64} color="var(--pl-terra)" accent="var(--pl-gold)" />
      <Motif name="rings" size={64} color="var(--pl-ink)" accent="var(--pl-plum)" />
    </div>
  );
}
